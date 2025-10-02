// server.js - Backend API com integração OpenRouter
import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs-extra";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.static("public"));

// Configurações
const SESSION_FILE = process.env.SESSION_FILE || "./session.json";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3.1:free";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Utilidades
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const humanDelay = async (factor = 1) => {
  const ms = randomBetween(800, Math.max(800, 800 * factor * 2));
  await wait(ms);
};

// Função para chamar OpenRouter API
async function callOpenRouter(messages, options = {}) {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: OPENROUTER_MODEL,
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Instagram Influencer Analyzer",
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("[OpenRouter Error]", error.response?.data || error.message);
    throw new Error("Erro ao chamar OpenRouter API");
  }
}

// Carregar/Salvar sessão
async function loadSession(page) {
  if (!(await fs.pathExists(SESSION_FILE))) return false;
  try {
    const session = JSON.parse(await fs.readFile(SESSION_FILE, "utf8"));
    if (session.cookies) await page.setCookie(...session.cookies);
    if (session.localStorage) {
      // Primeiro navegar para o Instagram para ter um contexto válido
      await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded" }).catch(() => {});
      // Agora podemos acessar localStorage com segurança
      await page.evaluate((ls) => {
        for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v);
      }, session.localStorage);
    }
    console.log("[Session] Restored");
    return true;
  } catch (err) {
    console.warn("[Session Error]", err.message);
    return false;
  }
}

async function saveSession(page) {
  try {
    const cookies = await page.cookies();
    const localStorage = await page.evaluate(() => {
      const out = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        out[k] = localStorage.getItem(k);
      }
      return out;
    });
    await fs.writeFile(SESSION_FILE, JSON.stringify({ cookies, localStorage }, null, 2));
    console.log("[Session] Saved");
  } catch (err) {
    console.warn("[Session Save Error]", err.message);
  }
}

// Função para converter imagem URL em base64
async function urlToBase64(page, url) {
  try {
    const base64 = await page.evaluate(async (imageUrl) => {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        return null;
      }
    }, url);
    return base64;
  } catch (error) {
    console.error("[Base64 Conversion Error]", error.message);
    return null;
  }
}

// Função para carregar apenas o perfil (sem posts)
async function loadProfileOnly(username, ws) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1200, height: 900 },
  });

  const page = await browser.newPage();
  await page.setUserAgent(USER_AGENT);
  await loadSession(page);

  try {
    ws.send(JSON.stringify({ type: "status", message: "Acessando perfil..." }));

    const profileUrl = `https://www.instagram.com/${username}/`;
    await page.goto(profileUrl, { waitUntil: "networkidle2" });
    await humanDelay(1.5);

    // Aceitar cookies se necessário
    try {
      const acceptBtns = await page.$x("//button[contains(., 'Only allow essential cookies') or contains(., 'Aceitar tudo') or contains(., 'Accept all')]");
      if (acceptBtns.length) {
        await acceptBtns[0].click();
        await page.waitForTimeout(800);
      }
    } catch (e) {}

    await page.waitForSelector("article", { timeout: 10000 });

    ws.send(JSON.stringify({ type: "status", message: "Coletando dados do perfil..." }));
    
    const profileData = await page.evaluate(() => {
      const getMetaContent = (property) => {
        const meta = document.querySelector(`meta[property="${property}"]`);
        return meta ? meta.content : null;
      };

      const username = location.pathname.split("/")[1];
      const fullName = getMetaContent("og:title") || "";
      const bioRaw = getMetaContent("og:description") || "";
      const profilePic = getMetaContent("og:image") || "";

      let posts = null, followers = null, following = null;
      
      // Tentar pegar dos elementos da página primeiro
      const stats = Array.from(document.querySelectorAll("header section ul li")).map(
        (li) => li.innerText.trim()
      );

      stats.forEach((stat) => {
        if (/post/i.test(stat)) posts = stat.split(" ")[0];
        if (/follower/i.test(stat) || /seguidore/i.test(stat)) followers = stat.split(" ")[0];
        if (/following/i.test(stat) || /seguindo/i.test(stat)) following = stat.split(" ")[0];
      });

      // Se não encontrou nos elementos, parsear da bio
      if (!posts || !followers || !following) {
        const followersMatch = bioRaw.match(/([\d,\.]+[KMB]?)\s*Followers?/i);
        const followingMatch = bioRaw.match(/([\d,\.]+[KMB]?)\s*Following/i);
        const postsMatch = bioRaw.match(/([\d,\.]+[KMB]?)\s*Posts?/i);
        
        if (followersMatch && !followers) followers = followersMatch[1];
        if (followingMatch && !following) following = followingMatch[1];
        if (postsMatch && !posts) posts = postsMatch[1];
      }

      // Limpar a bio (remover a parte de stats se existir)
      let bio = bioRaw;
      const bioSplit = bioRaw.split(" - ");
      if (bioSplit.length > 1) {
        bio = bioSplit.slice(1).join(" - ");
      }

      return { username, fullName, bio, bioRaw, profilePic, posts, followers, following };
    });

    ws.send(JSON.stringify({ type: "status", message: "Analisando perfil com IA..." }));
    
    const profileAnalysis = await callOpenRouter([
      {
        role: "system",
        content: "Você é um especialista em análise de perfis de redes sociais e identificação de nichos de mercado. Analise o perfil fornecido e identifique o nicho de atuação, tipo de conteúdo e potencial como influenciador.",
      },
      {
        role: "user",
        content: `Analise este perfil do Instagram:
Username: ${profileData.username}
Nome: ${profileData.fullName}
Bio: ${profileData.bio}
Seguidores: ${profileData.followers}
Posts: ${profileData.posts}

Forneça uma análise estruturada em JSON com os seguintes campos:
- nicho: nicho principal de atuação
- subNichos: array de sub-nichos identificados
- tipoInfluenciador: (nano/micro/macro/mega)
- temas: array de temas abordados
- publicoAlvo: descrição do público-alvo
- potencialComercial: (baixo/médio/alto/muito alto)
- resumo: resumo breve do perfil (max 200 caracteres)`,
      },
    ]);

    let parsedAnalysis;
    try {
      const jsonMatch = profileAnalysis.match(/\{[\s\S]*\}/);
      parsedAnalysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(profileAnalysis);
    } catch (e) {
      parsedAnalysis = {
        nicho: "Indefinido",
        subNichos: [],
        tipoInfluenciador: "indefinido",
        temas: [],
        publicoAlvo: "Não identificado",
        potencialComercial: "médio",
        resumo: profileAnalysis.substring(0, 200),
      };
    }

    profileData.analysis = parsedAnalysis;
    ws.send(JSON.stringify({ type: "profile", data: profileData }));
    
    await saveSession(page);
    await browser.close();
    
    ws.send(JSON.stringify({ type: "complete", message: "Perfil carregado!" }));

  } catch (error) {
    console.error("[Load Profile Error]", error);
    ws.send(JSON.stringify({ type: "error", message: error.message }));
    await browser.close();
  }
}

// Scraper completo de perfil com análise de posts
async function scrapeProfile(username, ws, options = {}) {
  const maxPosts = options.postsCount || 12;
  const analyzeImages = options.analyzeImages !== false;
  const extractMetrics = options.extractMetrics !== false;
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1200, height: 900 },
  });

  const page = await browser.newPage();
  await page.setUserAgent(USER_AGENT);
  await loadSession(page);

  try {
    ws.send(JSON.stringify({ type: "status", message: "Acessando perfil..." }));

    const profileUrl = `https://www.instagram.com/${username}/`;
    await page.goto(profileUrl, { waitUntil: "networkidle2" });
    await humanDelay(1.5);

    // Aceitar cookies se necessário
    try {
      const acceptBtns = await page.$x("//button[contains(., 'Only allow essential cookies') or contains(., 'Aceitar tudo') or contains(., 'Accept all')]");
      if (acceptBtns.length) {
        await acceptBtns[0].click();
        await page.waitForTimeout(800);
      }
    } catch (e) {}

    await page.waitForSelector("article", { timeout: 10000 });

    ws.send(JSON.stringify({ type: "status", message: "Coletando dados do perfil..." }));
    
    const profileData = await page.evaluate(() => {
      const getMetaContent = (property) => {
        const meta = document.querySelector(`meta[property="${property}"]`);
        return meta ? meta.content : null;
      };

      const username = location.pathname.split("/")[1];
      const fullName = getMetaContent("og:title") || "";
      const bio = getMetaContent("og:description") || "";
      const profilePic = getMetaContent("og:image") || "";

      const stats = Array.from(document.querySelectorAll("header section ul li")).map(
        (li) => li.innerText.trim()
      );

      let posts = null, followers = null, following = null;
      stats.forEach((stat) => {
        if (/post/i.test(stat)) posts = stat.split(" ")[0];
        if (/follower/i.test(stat) || /seguidore/i.test(stat)) followers = stat.split(" ")[0];
        if (/following/i.test(stat) || /seguindo/i.test(stat)) following = stat.split(" ")[0];
      });

      return { username, fullName, bio, profilePic, posts, followers, following };
    });

    ws.send(JSON.stringify({ type: "status", message: "Analisando perfil com IA..." }));
    
    const profileAnalysis = await callOpenRouter([
      {
        role: "system",
        content: "Você é um especialista em análise de perfis de redes sociais e identificação de nichos de mercado. Analise o perfil fornecido e identifique o nicho de atuação, tipo de conteúdo e potencial como influenciador.",
      },
      {
        role: "user",
        content: `Analise este perfil do Instagram:
Username: ${profileData.username}
Nome: ${profileData.fullName}
Bio: ${profileData.bio}
Seguidores: ${profileData.followers}
Posts: ${profileData.posts}

Forneça uma análise estruturada em JSON com os seguintes campos:
- nicho: nicho principal de atuação
- subNichos: array de sub-nichos identificados
- tipoInfluenciador: (nano/micro/macro/mega)
- temas: array de temas abordados
- publicoAlvo: descrição do público-alvo
- potencialComercial: (baixo/médio/alto/muito alto)
- resumo: resumo breve do perfil (max 200 caracteres)`,
      },
    ]);

    let parsedAnalysis;
    try {
      const jsonMatch = profileAnalysis.match(/\{[\s\S]*\}/);
      parsedAnalysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(profileAnalysis);
    } catch (e) {
      parsedAnalysis = {
        nicho: "Indefinido",
        subNichos: [],
        tipoInfluenciador: "indefinido",
        temas: [],
        publicoAlvo: "Não identificado",
        potencialComercial: "médio",
        resumo: profileAnalysis.substring(0, 200),
      };
    }

    profileData.analysis = parsedAnalysis;
    ws.send(JSON.stringify({ type: "profile", data: profileData }));

    // Coletar links dos posts
    ws.send(JSON.stringify({ type: "status", message: `Coletando posts (alvo: ${maxPosts})...` }));

    const postLinks = new Set();
    let attempts = 0;
    let lastHeight = 0;
    let consecutiveNoChange = 0;

    while (postLinks.size < maxPosts && attempts < 60) {
      // Coletar APENAS links de posts e reels, removendo query params
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("article a[href*='/p/'], article a[href*='/reel/']"))
          .map((a) => {
            // Remover query params para evitar duplicatas
            return a.href.split('?')[0];
          })
          .filter(Boolean);
      });

      const sizeBefore = postLinks.size;
      links.forEach((l) => postLinks.add(l));
      const sizeAfter = postLinks.size;
      
      const newPosts = sizeAfter - sizeBefore;
      console.log(`[Crawl] Tentativa ${attempts + 1}: ${sizeAfter}/${maxPosts} posts (+${newPosts} novos)`);
      
      // Atualizar progresso no WebSocket
      ws.send(JSON.stringify({ 
        type: "status", 
        message: `Coletando posts: ${sizeAfter}/${maxPosts}...` 
      }));

      // Se já temos posts suficientes, parar
      if (postLinks.size >= maxPosts) {
        console.log(`[Crawl] ✓ Meta atingida: ${postLinks.size} posts`);
        break;
      }

      // Scroll mais agressivo
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight * 1.5);
      });
      await humanDelay(1.5);

      const newHeight = await page.evaluate(() => document.body.scrollHeight);
      
      if (newHeight === lastHeight) {
        consecutiveNoChange++;
        
        // Tentar forçar carregamento de mais posts
        if (consecutiveNoChange === 3) {
          console.log(`[Crawl] Scroll extra para forçar lazy loading...`);
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await humanDelay(3);
        } else if (consecutiveNoChange === 6) {
          console.log(`[Crawl] Scroll agressivo...`);
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
            window.scrollBy(0, -100);
            window.scrollBy(0, 100);
          });
          await humanDelay(4);
        }
        
        // Se não mudou por muito tempo E não coletou novos posts, parar
        if (consecutiveNoChange >= 10 && newPosts === 0) {
          console.log(`[Crawl] ⚠ Sem mais posts disponíveis após ${attempts + 1} tentativas. Total: ${postLinks.size}`);
          break;
        }
      } else {
        consecutiveNoChange = 0;
      }
      
      lastHeight = newHeight;
      attempts++;
    }

    // Filtrar e validar links antes de processar
    const linkArray = Array.from(postLinks)
      .filter(link => link.includes('/p/') || link.includes('/reel/'))
      .slice(0, maxPosts);
    
    console.log(`\n========================================`);
    console.log(`[CRAWL SUMMARY]`);
    console.log(`  Solicitado: ${maxPosts} posts`);
    console.log(`  Coletados: ${linkArray.length} posts`);
    console.log(`  Tentativas: ${attempts}`);
    console.log(`  Status: ${linkArray.length >= maxPosts ? '✓ SUCESSO' : '⚠ PARCIAL'}`);
    console.log(`========================================\n`);
    
    if (linkArray.length < maxPosts) {
      console.warn(`[Crawl] ⚠ AVISO: Perfil tem menos posts disponíveis ou Instagram limitou o carregamento`);
      ws.send(JSON.stringify({ 
        type: "status", 
        message: `⚠ ${linkArray.length}/${maxPosts} posts coletados. Iniciando análise...` 
      }));
    } else {
      ws.send(JSON.stringify({ 
        type: "status", 
        message: `✓ ${linkArray.length} posts coletados! Iniciando análise...` 
      }));
    }

    // Array para armazenar posts analisados
    const scraped = [];

    // Processar cada post
    for (let i = 0; i < linkArray.length; i++) {
      const link = linkArray[i];
      try {
        ws.send(JSON.stringify({ 
          type: "status", 
          message: `Analisando post ${i + 1}/${linkArray.length}...` 
        }));

        await page.goto(link, { waitUntil: "networkidle2" });
        await humanDelay(1.5);

        // Extrair dados do post com múltiplas tentativas
        const postData = await page.evaluate((extractMetrics) => {
          const permalink = location.href;
          
          // Timestamp
          const timeEl = document.querySelector("time");
          const timestamp = timeEl ? timeEl.getAttribute("datetime") : null;

          // Caption - estratégia robusta
          let caption = null;
          try {
            // Estratégia 1: h1 (posts recentes)
            const h1 = document.querySelector("article h1");
            if (h1 && h1.innerText && h1.innerText.length > 5) {
              caption = h1.innerText;
            }
            
            // Estratégia 2: Procurar por span com texto longo dentro do article
            if (!caption) {
            const article = document.querySelector("article");
            if (article) {
                const allSpans = Array.from(article.querySelectorAll("span"))
                  .map(s => s.innerText.trim())
                  .filter(t => t.length > 20 && !t.includes("like") && !t.includes("comment"));
                
                if (allSpans.length > 0) {
                  // Pegar o texto mais longo que provavelmente é a legenda
                  caption = allSpans.reduce((a, b) => a.length > b.length ? a : b, "");
                }
              }
            }
            
            // Estratégia 3: Procurar por meta tag
            if (!caption) {
              const metaDesc = document.querySelector('meta[property="og:description"]');
              if (metaDesc) {
                caption = metaDesc.content;
              }
            }
          } catch (e) {
            console.error("Erro ao capturar caption:", e);
          }

          // Mídia - estratégia robusta para capturar TODAS as imagens
          let media = [];
          try {
            // Estratégia 1: Imagens do Instagram (scontent)
            const images = Array.from(document.querySelectorAll("article img"))
              .map(img => img.src)
              .filter(src => src && src.includes("scontent") && !src.includes("profile"));
            
            media = [...new Set(images)]; // Remover duplicatas
            
            // Estratégia 2: Vídeos
            const videos = Array.from(document.querySelectorAll("article video"))
              .map(v => v.src || v.querySelector("source")?.src)
              .filter(Boolean);
            
            media = [...media, ...videos];
            
            // Limitar a 10 mídias
            media = media.slice(0, 10);
          } catch (e) {
            console.error("Erro ao capturar mídia:", e);
          }

          // Métricas detalhadas
          let likes = null;
          let likesCount = 0;
          let comments = null;
          let commentsCount = 0;
          
          // ESTRATÉGIA 1: Parsear do caption (mais confiável)
          // Caption pode ter: "4M likes, 33K comments - cristiano on..."
          if (caption) {
            const likesFromCaption = caption.match(/([\d,\.]+[KMB]?)\s*likes?/i);
            const commentsFromCaption = caption.match(/([\d,\.]+[KMB]?)\s*comments?/i);
            
            if (likesFromCaption) {
              likes = likesFromCaption[1] + " likes";
              // Converter para número
              const likeStr = likesFromCaption[1];
              if (likeStr.includes('M')) {
                likesCount = parseFloat(likeStr.replace('M', '')) * 1000000;
              } else if (likeStr.includes('K')) {
                likesCount = parseFloat(likeStr.replace('K', '')) * 1000;
              } else if (likeStr.includes('B')) {
                likesCount = parseFloat(likeStr.replace('B', '')) * 1000000000;
              } else {
                likesCount = parseInt(likeStr.replace(/[,\.]/g, ''));
              }
            }
            
            if (commentsFromCaption) {
              comments = commentsFromCaption[1] + " comments";
              // Converter para número
              const commentStr = commentsFromCaption[1];
              if (commentStr.includes('M')) {
                commentsCount = parseFloat(commentStr.replace('M', '')) * 1000000;
              } else if (commentStr.includes('K')) {
                commentsCount = parseFloat(commentStr.replace('K', '')) * 1000;
              } else if (commentStr.includes('B')) {
                commentsCount = parseFloat(commentStr.replace('B', '')) * 1000000000;
              } else {
                commentsCount = parseInt(commentStr.replace(/[,\.]/g, ''));
              }
            }
          }
          
          // ESTRATÉGIA 2: Tentar pegar dos elementos (se não encontrou no caption)
          if (extractMetrics && (!likes || !comments)) {
            try {
              // Likes - estratégia robusta
              if (!likes) {
                const sections = document.querySelectorAll("article section");
                for (const section of sections) {
                  const text = section.innerText;
                  
                  // Procurar padrões como "1,234 likes" ou "1234 curtidas"
                  const likeMatch = text.match(/(\d[\d,\.]*)\s*(likes?|curtidas?)/i);
                  if (likeMatch) {
                    likes = likeMatch[0];
                    likesCount = parseInt(likeMatch[1].replace(/[,\.]/g, ""));
                    break;
                  }
                  
                  // Alternativa: procurar botão de likes
                  const likeBtn = section.querySelector('button svg[aria-label*="Like"], button svg[aria-label*="Curtir"]');
                  if (likeBtn) {
                    const nearbyText = likeBtn.closest("section")?.innerText;
                    const numMatch = nearbyText?.match(/(\d[\d,\.]*)/);
                    if (numMatch) {
                      likesCount = parseInt(numMatch[1].replace(/[,\.]/g, ""));
                      likes = numMatch[0];
                      break;
                    }
                  }
                }
              }
            } catch (e) {
              console.error("Erro ao extrair likes:", e);
            }

            try {
              // Comentários
              if (!comments) {
                // Contar elementos de comentário visíveis
                const commentElements = document.querySelectorAll('ul ul li');
                if (commentElements.length > 0) {
                  commentsCount = commentElements.length;
                }
                
                // Procurar por texto "View all X comments"
                const commentText = document.body.innerText;
                const commentMatch = commentText.match(/View all (\d+)|Ver todos os (\d+)|(\d+) comments|(\d+) comentários/i);
                if (commentMatch) {
                  const num = commentMatch.find(m => m && !isNaN(m));
                  if (num) {
                    commentsCount = parseInt(num);
                    comments = commentMatch[0];
                  }
                }
              }
            } catch (e) {
              console.error("Erro ao extrair comments:", e);
            }
          }

          // Tipo de post
          let postType = 'image';
          try {
            if (document.querySelector('article video')) {
              postType = 'video';
            } else if (document.querySelector('button[aria-label*="Next"], button[aria-label*="Próximo"]')) {
              postType = 'carousel';
            } else if (media.length > 1) {
              postType = 'carousel';
            }
          } catch (e) {
            postType = 'image';
          }

          return { 
            permalink, 
            timestamp, 
            caption: caption || null, 
            media: media || [], 
            likes: likes || null, 
            likesCount: likesCount || 0,
            comments: comments || null,
            commentsCount: commentsCount || 0,
            postType
          };
        }, extractMetrics);

        // Converter primeira imagem para base64
        let imageBase64 = null;
        if (analyzeImages && postData.media && postData.media.length > 0) {
          ws.send(JSON.stringify({ 
            type: "status", 
            message: `Convertendo imagem do post ${i + 1}...` 
          }));
          
          // Tentar converter a primeira imagem válida
          for (let mediaIdx = 0; mediaIdx < Math.min(3, postData.media.length); mediaIdx++) {
            try {
              imageBase64 = await urlToBase64(page, postData.media[mediaIdx]);
              if (imageBase64) break; // Sucesso, sair do loop
            } catch (err) {
              console.log(`Tentativa ${mediaIdx + 1} de conversão falhou, tentando próxima...`);
            }
          }
          
          if (!imageBase64) {
            console.warn(`Não foi possível converter nenhuma imagem do post ${i + 1}`);
          }
        }

        // Analisar post com LLM - sempre analisa, com ou sem imagem
        if (analyzeImages || postData.caption) {
          ws.send(JSON.stringify({ 
            type: "status", 
            message: `Analisando conteúdo do post ${i + 1} com IA...` 
          }));

          try {
            let messages = [
            {
              role: "system",
                content: "Você é um especialista em análise de conteúdo de redes sociais e marketing de influência. Analise o post de forma profunda e detalhada.",
              }
            ];

            // Preparar conteúdo da análise
            if (imageBase64) {
              // Com imagem
              messages.push({
              role: "user",
              content: [
                {
                  type: "text",
                    text: `Analise este post do Instagram de forma COMPLETA e DETALHADA:

📝 **Legenda**: ${postData.caption || "Sem legenda visível"}
📊 **Tipo**: ${postData.postType}
❤️ **Likes**: ${postData.likes || "N/A"} (${postData.likesCount || 0})
💬 **Comentários**: ${postData.comments || "N/A"} (${postData.commentsCount || 0})
📅 **Data**: ${postData.timestamp || "N/A"}

Forneça uma análise PROFUNDA em JSON com:
{
  "tema": "tema principal do post",
  "subtemas": ["subtema1", "subtema2"],
  "sentimento": "positivo/neutro/negativo/inspiracional/motivacional",
  "categoriasIdentificadas": ["categoria1", "categoria2", "categoria3"],
  "engajamentoPotencial": "baixo/médio/alto/muito-alto",
  "elementos": ["elemento visual 1", "elemento visual 2"],
  "coresPredomimantes": ["cor1", "cor2"],
  "estiloVisual": "descrição do estilo visual",
  "publicoAlvo": "descrição do público-alvo deste post",
  "objetivoPost": "qual o objetivo/propósito deste post",
  "qualidadeProducao": "baixa/média/alta/profissional",
  "pontosFortes": ["ponto1", "ponto2"],
  "sugestoesMelhoria": ["sugestão1", "sugestão2"],
  "resumo": "resumo detalhado do post (150-200 caracteres)"
}

Seja ESPECÍFICO e DETALHADO na análise!`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageBase64,
                  },
                },
              ],
              });
            } else {
              // Sem imagem - analisa apenas texto
              messages.push({
                role: "user",
                content: `Analise este post do Instagram (TEXTO APENAS):

📝 **Legenda**: ${postData.caption || "Sem legenda"}
📊 **Tipo**: ${postData.postType}
❤️ **Likes**: ${postData.likes || "N/A"}
💬 **Comentários**: ${postData.comments || "N/A"}

Forneça uma análise em JSON com:
{
  "tema": "tema principal",
  "subtemas": ["subtema1", "subtema2"],
  "sentimento": "positivo/neutro/negativo/inspiracional",
  "categoriasIdentificadas": ["categoria1", "categoria2"],
  "engajamentoPotencial": "baixo/médio/alto/muito-alto",
  "publicoAlvo": "público-alvo estimado",
  "objetivoPost": "objetivo do post",
  "pontosFortes": ["ponto1", "ponto2"],
  "resumo": "resumo do post (150 caracteres)"
}`,
              });
            }

            const postAnalysis = await callOpenRouter(messages, { maxTokens: 2000 });

          let parsedPostAnalysis;
          try {
            const jsonMatch = postAnalysis.match(/\{[\s\S]*\}/);
            parsedPostAnalysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(postAnalysis);
          } catch (e) {
              console.error("Erro ao parsear análise:", e);
            parsedPostAnalysis = {
                tema: postData.caption ? "Análise baseada em texto" : "Sem dados suficientes",
                subtemas: [],
              sentimento: "neutro",
              categoriasIdentificadas: [],
              engajamentoPotencial: "médio",
                elementos: imageBase64 ? ["Imagem analisada"] : [],
                publicoAlvo: "Não identificado",
                objetivoPost: "Não identificado",
                resumo: postData.caption ? postData.caption.substring(0, 150) : postAnalysis.substring(0, 150),
            };
          }

          postData.analysis = parsedPostAnalysis;
          } catch (err) {
            console.error("Erro na análise com LLM:", err);
            postData.analysis = {
              tema: "Erro na análise",
              error: err.message,
              sentimento: "neutro",
              categoriasIdentificadas: [],
              engajamentoPotencial: "médio",
              resumo: postData.caption ? postData.caption.substring(0, 150) : "Erro ao analisar",
            };
          }
        } else {
          postData.analysis = {
            tema: "Análise não solicitada",
            sentimento: "neutro",
            categoriasIdentificadas: [],
            engajamentoPotencial: "médio",
            resumo: postData.caption || "Post sem análise",
          };
        }

        // Não enviar base64 completo pelo WebSocket (muito grande)
        postData.hasImage = !!imageBase64;
        
        // Armazenar para salvar depois
        postData.imageBase64Full = imageBase64; // Para salvar no arquivo
        
        // Adicionar aos posts processados
        scraped.push(postData);
        
        // Enviar post analisado (sem base64 completo)
        const postDataToSend = { ...postData };
        delete postDataToSend.imageBase64Full; // Não enviar pelo WebSocket
        
        ws.send(JSON.stringify({ type: "post", data: postDataToSend, index: i + 1, total: linkArray.length }));

        await humanDelay(2);
      } catch (err) {
        console.error(`[Post ${i + 1} Error]`, err.message);
        
        // Criar post com dados mínimos em caso de erro
        const errorPost = {
          permalink: link,
          caption: null,
          media: [],
          likes: null,
          likesCount: 0,
          comments: null,
          commentsCount: 0,
          postType: 'unknown',
          hasImage: false,
          timestamp: null,
          analysis: {
            tema: 'Erro ao processar',
            sentimento: 'neutro',
            categoriasIdentificadas: [],
            engajamentoPotencial: 'médio',
            resumo: `Erro: ${err.message}`,
            error: true
          }
        };
        
        scraped.push(errorPost);
        
        ws.send(JSON.stringify({ 
          type: "post", 
          data: errorPost, 
          index: i + 1, 
          total: linkArray.length,
          hasError: true
        }));
        
        // Continuar com o próximo post
        await humanDelay(1);
      }
    }
    
    console.log(`[Scraping Complete] Processados ${scraped.length}/${linkArray.length} posts`);

    // Análise final do perfil baseada nos posts
    ws.send(JSON.stringify({ type: "status", message: "Gerando análise final..." }));

    const finalAnalysis = await callOpenRouter([
      {
        role: "system",
        content: "Você é um especialista em marketing de influência. Com base nos dados do perfil e posts analisados, forneça uma análise final completa sobre o influenciador e seu nicho de atuação.",
      },
      {
        role: "user",
        content: `Com base na análise do perfil e dos posts deste influenciador:

Perfil: ${profileData.fullName} (@${profileData.username})
Seguidores: ${profileData.followers}
Nicho identificado: ${parsedAnalysis.nicho}
Bio: ${profileData.bio}

Forneça uma análise final em JSON com:
- nichoFinal: nicho definitivo identificado
- subNichos: array de até 5 sub-nichos
- pontosFortes: array de pontos fortes do influenciador
- tipoConteudo: array de tipos de conteúdo predominantes
- recomendacoesMarcas: array de tipos de marcas que se beneficiariam
- scorePotencial: número de 1-10 indicando potencial comercial
- resumoExecutivo: resumo executivo completo (200-300 palavras)`,
      },
    ], { maxTokens: 3000 });

    let parsedFinalAnalysis;
    try {
      const jsonMatch = finalAnalysis.match(/\{[\s\S]*\}/);
      parsedFinalAnalysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(finalAnalysis);
    } catch (e) {
      parsedFinalAnalysis = {
        nichoFinal: parsedAnalysis.nicho,
        subNichos: parsedAnalysis.subNichos,
        pontosFortes: [],
        tipoConteudo: [],
        recomendacoesMarcas: [],
        scorePotencial: 5,
        resumoExecutivo: finalAnalysis,
      };
    }

    // Enviar análise final
    ws.send(JSON.stringify({ type: "final", data: parsedFinalAnalysis }));

    await saveSession(page);
    await browser.close();

    // Salvar resultados completos
    const results = {
      profile: profileData,
      posts: scraped,
      finalAnalysis: parsedFinalAnalysis,
      scrapedAt: new Date().toISOString(),
      stats: {
        totalPosts: scraped.length,
        postsWithImages: scraped.filter(p => p.hasImage).length,
        averageLikes: scraped.reduce((sum, p) => sum + (p.likesCount || 0), 0) / scraped.length || 0,
        averageComments: scraped.reduce((sum, p) => sum + (p.commentsCount || 0), 0) / scraped.length || 0,
      }
    };

    await fs.ensureDir("output");
    
    // Salvar JSON completo com todos os dados
    await fs.writeFile(
      `output/${username}_complete_analysis.json`,
      JSON.stringify(results, null, 2)
    );

    // Salvar versão sem base64 (mais leve)
    const resultsLight = JSON.parse(JSON.stringify(results));
    resultsLight.posts = resultsLight.posts.map(p => {
      const { imageBase64Full, ...rest } = p;
      return rest;
    });
    
    await fs.writeFile(
      `output/${username}_analysis_light.json`,
      JSON.stringify(resultsLight, null, 2)
    );
    
    console.log(`[Salvamento] Arquivos salvos: output/${username}_complete_analysis.json e ${username}_analysis_light.json`);

    ws.send(JSON.stringify({ type: "complete", message: "Análise concluída e salva!" }));

  } catch (error) {
    console.error("[Scraper Error]", error);
    ws.send(JSON.stringify({ type: "error", message: error.message }));
    await browser.close();
  }
}

// Servidor HTTP
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📊 Acesse o frontend em: http://localhost:${PORT}\n`);
});

// WebSocket Server
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("[WebSocket] Cliente conectado");

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === "loadProfile") {
        const { username } = data;
        console.log(`[Profile] Carregando perfil de @${username}`);
        await loadProfileOnly(username, ws);
      } else if (data.type === "fullAnalysis") {
        const { username, options } = data;
        console.log(`[Analysis] Iniciando análise completa de @${username} com ${options.postsCount} posts`);
        await scrapeProfile(username, ws, options);
      }
    } catch (error) {
      console.error("[WebSocket Error]", error);
      ws.send(JSON.stringify({ type: "error", message: error.message }));
    }
  });

  ws.on("close", () => {
    console.log("[WebSocket] Cliente desconectado");
  });
});

// Rota de health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});


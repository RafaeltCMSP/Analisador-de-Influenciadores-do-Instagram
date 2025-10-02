// scraper.js
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs-extra";
import path from "path";
import { createObjectCsvWriter } from "csv-writer";
import dotenv from "dotenv";

dotenv.config();
puppeteer.use(StealthPlugin());

// ---------- Config via ENV ----------
const PROFILE = process.env.IG_PROFILE || "instagram";
const MAX_POSTS = Number(process.env.MAX_POSTS || 12);
const HEADLESS = (process.env.HEADLESS ?? "true") === "true";
const PROXY = process.env.PROXY || null;
const IG_USERNAME = process.env.IG_USERNAME || null;
const IG_PASSWORD = process.env.IG_PASSWORD || null;
const DELAY_BASE_MS = Number(process.env.DELAY_BASE_MS || 800);
const OUTPUT_FILE_BASE = process.env.OUTPUT_FILE || `output/instagram_${PROFILE}`;
const SESSION_FILE = process.env.SESSION_FILE || "./session.json";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// helper random delay
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const humanDelay = async (factor = 1) => {
  // varia entre DELAY_BASE_MS..DELAY_BASE_MS*factor*2
  const ms = randomBetween(DELAY_BASE_MS, Math.max(DELAY_BASE_MS, DELAY_BASE_MS * factor * 2));
  await wait(ms);
};

// ---------- Utilities ----------
async function ensureOutputDir() {
  const dir = path.dirname(OUTPUT_FILE_BASE);
  await fs.ensureDir(dir);
}

async function saveJson(obj, filename) {
  await fs.writeFile(filename, JSON.stringify(obj, null, 2), "utf8");
}

async function saveCsv(records, filename) {
  if (!records || records.length === 0) return;
  const headers = Object.keys(records[0]).map((k) => ({ id: k, title: k }));
  const csvWriter = createObjectCsvWriter({
    path: filename,
    header: headers,
  });
  await csvWriter.writeRecords(records);
}

// ---------- Session persistence ----------
async function loadSession(page) {
  if (!(await fs.pathExists(SESSION_FILE))) return false;
  try {
    const raw = await fs.readFile(SESSION_FILE, "utf8");
    const session = JSON.parse(raw);

    if (session.cookies) {
      await page.setCookie(...session.cookies);
    }
    if (session.localStorage) {
      // Primeiro navegar para o Instagram para ter um contexto válido
      await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded" }).catch(() => {});
      // Agora podemos acessar localStorage com segurança
      await page.evaluate((ls) => {
        for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v);
      }, session.localStorage);
    }
    console.log("[session] restored from", SESSION_FILE);
    return true;
  } catch (err) {
    console.warn("[session] failed to load:", err.message);
    return false;
  }
}

async function saveSession(page) {
  try {
    const cookies = await page.cookies();
    // capture localStorage
    const localStorageObj = await page.evaluate(() => {
      const out = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        out[k] = localStorage.getItem(k);
      }
      return out;
    });

    await fs.writeFile(SESSION_FILE, JSON.stringify({ cookies, localStorage: localStorageObj }, null, 2), "utf8");
    console.log("[session] saved to", SESSION_FILE);
  } catch (err) {
    console.warn("[session] could not save:", err.message);
  }
}

// ---------- Login flow (basic) ----------
async function attemptLogin(page) {
  if (!IG_USERNAME || !IG_PASSWORD) {
    console.log("[login] credentials not provided; skipping login");
    return false;
  }

  console.log("[login] attempting login for", IG_USERNAME);
  await page.goto("https://www.instagram.com/accounts/login/", { waitUntil: "networkidle2" }).catch(() => {});
  await page.waitForTimeout(1500);

  // accept cookies dialog if present (attempt)
  try {
    const cookiesBtn = await page.$x("//button[contains(., 'Only allow essential cookies') or contains(., 'Aceitar tudo') or contains(., 'Accept all')]");
    if (cookiesBtn.length) {
      await cookiesBtn[0].click();
      await page.waitForTimeout(700);
    }
  } catch (e) {}

  // fill form
  try {
    await page.waitForSelector('input[name="username"]', { timeout: 8000 });
    await page.type('input[name="username"]', IG_USERNAME, { delay: randomBetween(60, 120) });
    await page.type('input[name="password"]', IG_PASSWORD, { delay: randomBetween(60, 120) });
    await humanDelay(2);
    await page.click('button[type="submit"]');
  } catch (err) {
    console.warn("[login] login form not found or error:", err.message);
    return false;
  }

  // wait for navigation or error
  try {
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 });
  } catch (err) {
    // may be 2FA / checkpoint; give some time and check
  }

  // check if logged in by presence of profile icon or direct URL
  const loggedIn = await page.evaluate(() => {
    return !!document.querySelector('nav a[href^="/accounts/activity/"], nav a[href^="/' + location.pathname.split('/')[1] + '"]') || !!document.querySelector('img[alt*="profile picture"]') || !!document.querySelector('svg[aria-label="Home"]');
  }).catch(() => false);

  // alternative check: /accounts/login/ still present
  const url = page.url();
  if (loggedIn || !/login/.test(url)) {
    console.log("[login] detected successful login (url:", url, ")");
    await saveSession(page);
    return true;
  } else {
    console.warn("[login] login might have failed or challenge required (url:", url, ")");
    return false;
  }
}

// ---------- Scrape a single post page ----------
async function scrapePostPage(page, postUrl) {
  // Visita o post e extrai dados
  await page.goto(postUrl, { waitUntil: "networkidle2" });
  await humanDelay(1.5);

  // Aguarda tempo/elementos relevantes
  await page.waitForTimeout(500);

  const data = await page.evaluate(() => {
    // Permalink já disponível
    const permalink = location.href;

    // timestamp
    const timeEl = document.querySelector("time");
    const timestamp = timeEl ? timeEl.getAttribute("datetime") : null;

    // caption (melhor esforço)
    let caption = null;
    try {
      // caption pode estar em article > div > div > ul li > div... muitas variações; tentamos pegar o primeiro bloco de texto após o header
      const article = document.querySelector("article");
      if (article) {
        // procura por elementos de legenda conhecidos
        const captionEl = article.querySelector("div[role='button']") || article.querySelector("div > div > ul > li span") || article.querySelector("article div > div > div > div > span");
        if (captionEl) caption = captionEl.innerText;
        else {
          // fallback: pega todos os spans dentro do artigo e junta o maior
          const spans = Array.from(article.querySelectorAll("span")).map(s => s.innerText.trim()).filter(Boolean);
          if (spans.length) caption = spans.reduce((a, b) => (a.length > b.length ? a : b), "");
        }
      }
    } catch (e) {
      caption = null;
    }

    // media: imagens e videos visíveis
    const mediaEls = Array.from(document.querySelectorAll("article img, article video"));
    const media = mediaEls.map(el => el.src).filter(Boolean);

    // likes (pode variar por layout)
    let likes = null;
    try {
      // procura por elemento que pareça conter likes
      const ariaLike = document.querySelector("section span[aria-label]");
      if (ariaLike) likes = ariaLike.innerText;
      // fallback: element with text "likes" or numeric in a specific section
      if (!likes) {
        const maybe = Array.from(document.querySelectorAll("section span")).map(s => s.innerText).filter(Boolean);
        // heurística: pegar o primeiro que tem "likes" ou que é um número grande
        const likesCandidate = maybe.find(t => /likes?/i.test(t)) || maybe.find(t => /\d{1,3}(,\d{3})*/.test(t));
        likes = likesCandidate || null;
      }
    } catch (e) {
      likes = null;
    }

    // comments: contar comentários visíveis (não total via api)
    let comments = null;
    try {
      const commentEls = document.querySelectorAll("ul li > div > div > div > span");
      comments = commentEls ? commentEls.length : null;
    } catch (e) {
      comments = null;
    }

    // owner username (se possível)
    let owner = null;
    try {
      const ownerEl = document.querySelector("header a[href^='https://www.instagram.com/']") || document.querySelector("header a");
      if (ownerEl) owner = ownerEl.getAttribute("href")?.split("/").filter(Boolean)[0] || ownerEl.innerText;
    } catch (e) {
      owner = null;
    }

    return { permalink, timestamp, caption, media, likes, comments, owner };
  });

  return data;
}

// ---------- Main scraping logic ----------
async function run() {
  await ensureOutputDir();

  // browser launch args
  const launchArgs = ["--no-sandbox", "--disable-setuid-sandbox"];
  if (PROXY) launchArgs.push(`--proxy-server=${PROXY}`);

  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: launchArgs,
    defaultViewport: { width: 1200, height: 900 },
  });

  const page = await browser.newPage();
  await page.setUserAgent(USER_AGENT);

  // restore session if available
  await loadSession(page);

  // if provided, attempt login only if session wasn't restored to a logged-in state
  // simple check: try navigate to instagram home and see if shows login page
  let isLogged = false;
  try {
    await page.goto("https://www.instagram.com/", { waitUntil: "networkidle2" });
    await page.waitForTimeout(1000);
    const url = page.url();
    if (!/login/.test(url)) {
      isLogged = true;
      console.log("[status] appears already logged in (", url, ")");
    } else {
      // attempt login
      isLogged = await attemptLogin(page);
    }
  } catch (err) {
    console.warn("[status] could not determine login state:", err.message);
  }

  // go to target profile
  const profileUrl = `https://www.instagram.com/${PROFILE}/`;
  console.log("[start] going to profile", profileUrl);
  await page.goto(profileUrl, { waitUntil: "networkidle2" });

  // close cookie modal if present (best-effort)
  try {
    const acceptBtns = await page.$x("//button[contains(., 'Only allow essential cookies') or contains(., 'Aceitar tudo') or contains(., 'Accept all')]");
    if (acceptBtns.length) {
      await acceptBtns[0].click();
      await page.waitForTimeout(800);
    }
  } catch (e) {}

  // wait for posts area
  try {
    await page.waitForSelector("article", { timeout: 10000 });
  } catch (err) {
    console.error("[error] profile article not found - maybe private or blocked", err.message);
    await browser.close();
    return;
  }

  // scroll & collect post links
  const postLinks = new Set();
  let lastHeight = 0;
  let attempts = 0;
  let consecutiveNoChange = 0;
  
  console.log(`[crawl] starting to scroll and collect post links (target: ${MAX_POSTS})`);
  
  while (postLinks.size < MAX_POSTS && attempts < 60) {
    // Coletar APENAS links de posts (contém /p/ e /reel/)
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("article a[href*='/p/'], article a[href*='/reel/']"))
        .map(a => {
          // Remover query params para evitar duplicatas
          return a.href.split('?')[0];
        })
        .filter(Boolean);
    });

    const sizeBefore = postLinks.size;
    links.forEach((l) => postLinks.add(l));
    const sizeAfter = postLinks.size;
    
    const newPosts = sizeAfter - sizeBefore;
    console.log(`[crawl] attempt ${attempts + 1}: ${sizeAfter}/${MAX_POSTS} posts collected (+${newPosts} new)`);

    // Se já temos posts suficientes, parar
    if (postLinks.size >= MAX_POSTS) {
      console.log(`[crawl] ✓ target reached: ${postLinks.size} posts`);
      break;
    }

    // Scroll mais agressivo
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 1.5);
    });
    await humanDelay(1.5);

    // Verificar mudança de altura
    const newHeight = await page.evaluate(() => document.body.scrollHeight);
    
    if (newHeight === lastHeight) {
      consecutiveNoChange++;
      
      // Se não mudou por algumas tentativas, fazer scroll extra e esperar mais
      if (consecutiveNoChange === 3) {
        console.log(`[crawl] trying extra scroll to trigger lazy loading...`);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await humanDelay(3);
      } else if (consecutiveNoChange === 6) {
        console.log(`[crawl] forcing aggressive scroll...`);
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
          window.scrollBy(0, -100);
          window.scrollBy(0, 100);
        });
        await humanDelay(4);
      }
      
      // Se não mudou por muito tempo E não coletou novos posts, parar
      if (consecutiveNoChange >= 10 && newPosts === 0) {
        console.log(`[crawl] ⚠ no more posts available after ${attempts + 1} attempts. Total: ${postLinks.size}`);
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
    .slice(0, MAX_POSTS);
  
  console.log(`\n========================================`);
  console.log(`[CRAWL SUMMARY]`);
  console.log(`  Requested: ${MAX_POSTS} posts`);
  console.log(`  Collected: ${linkArray.length} posts`);
  console.log(`  Attempts: ${attempts}`);
  console.log(`  Status: ${linkArray.length >= MAX_POSTS ? '✓ SUCCESS' : '⚠ PARTIAL'}`);
  
  if (linkArray.length < MAX_POSTS) {
    console.warn(`  ⚠ WARNING: Profile has fewer posts than requested or Instagram limited loading.`);
  }
  console.log(`========================================\n`);

  // Visit each post sequentially (safer). If quiser paralelizar, tenha proxies e sessões separadas.
  const scraped = [];
  for (let i = 0; i < linkArray.length; i++) {
    const link = linkArray[i];
    try {
      console.log(`[post ${i + 1}/${linkArray.length}] scraping ${link}`);
      const data = await scrapePostPage(page, link);

      // adicionar metadata
      data.scraped_at = new Date().toISOString();
      data.profile = PROFILE;

      scraped.push(data);
      // delay between posts (human-like)
      await humanDelay(2);
    } catch (err) {
      console.warn(`[post ${i + 1}] failed to scrape ${link}:`, err.message);
      // backoff on error
      await wait(1000 * Math.min(10, i + 1));
    }
  }

  // salvar session final
  await saveSession(page);

  // salvar arquivos de saída
  const jsonFile = `${OUTPUT_FILE_BASE}.json`;
  const csvFile = `${OUTPUT_FILE_BASE}.csv`;
  await saveJson({ profile: PROFILE, scraped_at: new Date().toISOString(), posts: scraped }, jsonFile);

  // normalizar para CSV (apenas colunas básicas)
  const csvRecords = scraped.map((p) => ({
    profile: p.profile,
    owner: p.owner || "",
    permalink: p.permalink,
    timestamp: p.timestamp || "",
    caption: (p.caption || "").replace(/\n/g, " "),
    media_count: (p.media && p.media.length) || 0,
    media_urls: (p.media || []).join(" | "),
    likes: p.likes || "",
    comments: p.comments || "",
    scraped_at: p.scraped_at,
  }));
  await saveCsv(csvRecords, csvFile);

  console.log("[done] saved:", jsonFile, csvFile);

  await browser.close();
}

// ---- run with error handling ----
run().catch(async (err) => {
  console.error("[fatal] uncaught error:", err);
  // try close browser if exists
  try {
    // nothing here to close gracefully in this snippet
  } catch (e) {}
  process.exit(1);
});

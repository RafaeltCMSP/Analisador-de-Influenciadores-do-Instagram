// app.js - Frontend Logic
let ws = null;
let currentAnalysis = {};
let currentUsername = '';

// Elementos DOM
const usernameInput = document.getElementById('usernameInput');
const loadProfileBtn = document.getElementById('loadProfileBtn');
const postsConfigSection = document.getElementById('postsConfigSection');
const startAnalysisBtn = document.getElementById('startAnalysisBtn');
const postsCountInput = document.getElementById('postsCountInput');
const statusSection = document.getElementById('statusSection');
const statusMessage = document.getElementById('statusMessage');
const progressFill = document.getElementById('progressFill');
const profileSection = document.getElementById('profileSection');
const postsSection = document.getElementById('postsSection');
const postsContainer = document.getElementById('postsContainer');
const finalSection = document.getElementById('finalSection');

// Event Listeners
loadProfileBtn.addEventListener('click', loadProfile);
startAnalysisBtn.addEventListener('click', startFullAnalysis);
usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') loadProfile();
});

document.getElementById('newAnalysisBtn')?.addEventListener('click', resetAnalysis);
document.getElementById('downloadBtn')?.addEventListener('click', downloadReport);

function loadProfile() {
  const username = usernameInput.value.trim().replace('@', '');
  
  if (!username) {
    alert('Por favor, digite um username válido!');
    return;
  }

  currentUsername = username;
  resetUI();
  connectWebSocket(username, 'profile');
}

function startFullAnalysis() {
  const postsCountInput = document.getElementById('postsCountInput');
  const postsCount = parseInt(postsCountInput?.value) || 12;
  const analyzeImages = document.getElementById('analyzeImages').checked;
  const extractMetrics = document.getElementById('extractMetrics').checked;
  
  if (!currentUsername) {
    alert('Erro: Username não definido!');
    return;
  }

  // Esconder configuração
  postsConfigSection.style.display = 'none';
  statusSection.style.display = 'block';
  
  // Iniciar análise completa
  connectWebSocket(currentUsername, 'full', {
    postsCount,
    analyzeImages,
    extractMetrics
  });
}

function resetUI() {
  currentAnalysis = {};
  
  // Mostrar seção de status
  statusSection.style.display = 'block';
  profileSection.style.display = 'none';
  postsSection.style.display = 'none';
  finalSection.style.display = 'none';
  
  // Limpar containers
  postsContainer.innerHTML = '';
  
  // Desabilitar botão
  loadProfileBtn.disabled = true;
  const btnText = loadProfileBtn.querySelector('.btn-text');
  const btnLoader = loadProfileBtn.querySelector('.btn-loader');
  if (btnText) btnText.style.display = 'none';
  if (btnLoader) btnLoader.style.display = 'flex';
  
  // Reset progresso
  progressFill.style.width = '0%';
}

function resetAnalysis() {
  location.reload();
}

function connectWebSocket(username, mode = 'profile', options = {}) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('[WebSocket] Conectado');
    updateStatus('Iniciando...', 10);
    
    if (mode === 'profile') {
      ws.send(JSON.stringify({ type: 'loadProfile', username }));
    } else if (mode === 'full') {
      ws.send(JSON.stringify({ 
        type: 'fullAnalysis', 
        username,
        options
      }));
    }
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleWebSocketMessage(data, mode);
  };

  ws.onerror = (error) => {
    console.error('[WebSocket Error]', error);
    updateStatus('Erro na conexão', 0);
    enableLoadButton();
  };

  ws.onclose = () => {
    console.log('[WebSocket] Desconectado');
    enableLoadButton();
  };
}

function handleWebSocketMessage(data, mode) {
  switch (data.type) {
    case 'status':
      updateStatus(data.message, calculateProgress(data.message));
      break;
      
    case 'profile':
      displayProfile(data.data);
      if (mode === 'profile') {
        updateStatus('Perfil carregado!', 100);
        setTimeout(() => {
          statusSection.style.display = 'none';
          postsConfigSection.style.display = 'block';
          postsConfigSection.scrollIntoView({ behavior: 'smooth' });
        }, 1000);
        enableLoadButton();
      } else {
        updateStatus('Perfil carregado! Analisando posts...', 35);
      }
      break;
      
    case 'post':
      displayPost(data.data, data.index, data.total);
      const postProgress = 35 + (data.index / data.total) * 50;
      updateStatus(
        data.hasError 
          ? `Post ${data.index}/${data.total} (com erro)` 
          : `Post ${data.index}/${data.total} analisado`, 
        postProgress
      );
      break;
      
    case 'final':
      displayFinalAnalysis(data.data);
      updateStatus('Análise concluída!', 100);
      break;
      
    case 'complete':
      updateStatus(data.message, 100);
      setTimeout(() => {
        statusSection.style.display = 'none';
      }, 2000);
      enableLoadButton();
      break;
      
    case 'error':
      updateStatus('Erro: ' + data.message, 0);
      alert('Erro: ' + data.message);
      enableLoadButton();
      break;
  }
}

function calculateProgress(message) {
  if (message.includes('Acessando')) return 10;
  if (message.includes('Coletando dados')) return 20;
  if (message.includes('Analisando perfil')) return 30;
  if (message.includes('Coletando posts')) return 35;
  if (message.includes('Encontrados')) return 40;
  if (message.includes('Gerando análise final')) return 90;
  return 15;
}

function updateStatus(message, progress) {
  statusMessage.textContent = message;
  progressFill.style.width = `${progress}%`;
}

function displayProfile(profile) {
  currentAnalysis.profile = profile;
  
  // Atualizar informações básicas
  document.getElementById('profilePic').src = profile.profilePic || 'https://via.placeholder.com/120';
  document.getElementById('profileName').textContent = profile.fullName || profile.username;
  document.getElementById('profileUsername').textContent = '@' + profile.username;
  
  // Bio limpa (sem stats)
  const bioText = profile.bio || profile.bioRaw || 'Sem biografia';
  document.getElementById('profileBio').textContent = bioText;
  
  // Atualizar estatísticas com formatação robusta
  let posts = profile.posts;
  let followers = profile.followers;
  let following = profile.following;
  
  // GARANTIR que sempre tenha dados - tentar parsear da bioRaw se necessário
  if ((!posts || posts === 'null') && profile.bioRaw) {
    const postsMatch = profile.bioRaw.match(/([\d,\.]+[KMB]?)\s*Posts?/i);
    if (postsMatch) {
      posts = postsMatch[1];
    }
  }
  if ((!followers || followers === 'null') && profile.bioRaw) {
    const followersMatch = profile.bioRaw.match(/([\d,\.]+[KMB]?)\s*Followers?/i);
    if (followersMatch) {
      followers = followersMatch[1];
    }
  }
  if ((!following || following === 'null') && profile.bioRaw) {
    const followingMatch = profile.bioRaw.match(/([\d,\.]+[KMB]?)\s*Following/i);
    if (followingMatch) {
      following = followingMatch[1];
    }
  }
  
  // Formatar os números
  const postsFormatted = formatNumber(posts || '0');
  const followersFormatted = formatNumber(followers || '0');
  const followingFormatted = formatNumber(following || '0');
  
  // Atualizar elementos
  const postsElement = document.getElementById('postsCount');
  const followersElement = document.getElementById('followersCount');
  const followingElement = document.getElementById('followingCount');
  
  if (postsElement) postsElement.textContent = postsFormatted;
  if (followersElement) followersElement.textContent = followersFormatted;
  if (followingElement) followingElement.textContent = followingFormatted;
  
  // Atualizar análise inicial
  if (profile.analysis) {
    const analysis = profile.analysis;
    
    const nichoTag = document.getElementById('nichoTag');
    const tipoTag = document.getElementById('tipoTag');
    const potencialTag = document.getElementById('potencialTag');
    
    if (nichoTag) {
      nichoTag.querySelector('span').textContent = analysis.nicho || 'Indefinido';
    }
    if (tipoTag) {
      tipoTag.querySelector('span').textContent = analysis.tipoInfluenciador || 'Indefinido';
    }
    if (potencialTag) {
      potencialTag.querySelector('span').textContent = 'Potencial: ' + (analysis.potencialComercial || 'Médio');
    }
    
    document.getElementById('resumoInicial').textContent = analysis.resumo || '';
  }
  
  // Mostrar seção do perfil
  profileSection.style.display = 'block';
  profileSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  // Mostrar seção de posts vazia (será preenchida progressivamente)
  postsSection.style.display = 'block';
  
  // Reinicializar ícones
  setTimeout(() => lucide.createIcons(), 100);
}

function displayPost(post, index, total) {
  if (!currentAnalysis.posts) {
    currentAnalysis.posts = [];
  }
  currentAnalysis.posts.push(post);
  
  const postCard = document.createElement('div');
  postCard.className = 'post-card';
  
  const analysis = post.analysis || {};
  
  // Determinar ícone do tipo de post
  const postTypeIcon = post.postType === 'video' ? 'video' : 'image';
  
  // Badge de sentimento com ícone
  const sentimentIcons = {
    'positivo': { icon: 'smile', class: 'badge-positive' },
    'negativo': { icon: 'frown', class: 'badge-negative' },
    'neutro': { icon: 'meh', class: 'badge-neutral' },
    'inspiracional': { icon: 'sparkles', class: 'badge-inspirational' },
    'motivacional': { icon: 'zap', class: 'badge-motivational' }
  };
  
  const sentiment = sentimentIcons[analysis.sentimento?.toLowerCase()];
  const sentimentBadge = sentiment 
    ? `<span class="badge ${sentiment.class}"><i data-lucide="${sentiment.icon}"></i><span>${analysis.sentimento}</span></span>`
    : '';
  
  // Preparar preview de mídia
  let mediaPreview = '';
  if (post.media && post.media.length > 0) {
    const firstMedia = post.media[0];
    if (firstMedia.includes('video') || post.postType === 'video') {
      mediaPreview = `
        <div class="post-media-preview">
          <div class="video-placeholder">
            <i data-lucide="video"></i>
            <span>Vídeo</span>
            ${post.media.length > 1 ? `<span class="media-count"><i data-lucide="layers"></i>+${post.media.length - 1}</span>` : ''}
          </div>
        </div>
      `;
    } else {
      mediaPreview = `
        <div class="post-media-preview">
          <img src="${firstMedia}" alt="Post" class="post-image" loading="lazy" onerror="this.style.display='none'">
          ${post.media.length > 1 ? `<span class="media-count"><i data-lucide="layers"></i>1/${post.media.length}</span>` : ''}
        </div>
      `;
    }
  }
  
  postCard.innerHTML = `
    <div class="post-header">
      <span class="post-number"><i data-lucide="${postTypeIcon}"></i>Post ${index}/${total}</span>
      ${post.hasImage 
        ? '<span class="post-badge"><i data-lucide="image"></i><span>Com Imagem</span></span>' 
        : '<span class="post-badge-text"><i data-lucide="file-text"></i><span>Texto</span></span>'
      }
    </div>
    
    <div class="post-content">
      ${mediaPreview}
      
      ${post.caption ? `
        <div class="post-caption-section">
          <strong><i data-lucide="align-left"></i>Legenda:</strong>
          <p class="post-caption">${truncate(post.caption, 200)}</p>
        </div>
      ` : '<p class="post-no-caption">Sem legenda</p>'}
      
      <div class="post-metrics">
        <div class="metric">
          <div class="metric-icon">
            <i data-lucide="heart"></i>
          </div>
          <span class="metric-value">${getMetricDisplay(post, 'likes')}</span>
          <span class="metric-label">Likes</span>
        </div>
        <div class="metric">
          <div class="metric-icon">
            <i data-lucide="message-circle"></i>
          </div>
          <span class="metric-value">${getMetricDisplay(post, 'comments')}</span>
          <span class="metric-label">Comentários</span>
        </div>
        <div class="metric">
          <div class="metric-icon">
            <i data-lucide="calendar"></i>
          </div>
          <span class="metric-value">${post.timestamp ? new Date(post.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'N/A'}</span>
          <span class="metric-label">Data</span>
        </div>
      </div>
      
      <div class="post-analysis">
        <h4><i data-lucide="cpu"></i>Análise Completa com IA</h4>
        
        <div class="analysis-row">
          <div class="analysis-field">
            <span class="field-label"><i data-lucide="tag"></i>Tema Principal:</span>
            <span class="field-value">${analysis.tema || 'N/A'}</span>
          </div>
          ${sentimentBadge ? `<div class="analysis-field">${sentimentBadge}</div>` : ''}
        </div>
        
        ${analysis.subtemas && analysis.subtemas.length > 0 ? `
          <div class="analysis-field">
            <span class="field-label"><i data-lucide="tags"></i>Sub-temas:</span>
            <div class="tags-small">
              ${analysis.subtemas.map(st => `<span class="tag-small">${st}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        
        ${analysis.categoriasIdentificadas && analysis.categoriasIdentificadas.length > 0 ? `
          <div class="analysis-field">
            <span class="field-label"><i data-lucide="layers"></i>Categorias:</span>
            <div class="tags-small">
              ${analysis.categoriasIdentificadas.map(cat => 
                `<span class="tag-small">${cat}</span>`
              ).join('')}
            </div>
          </div>
        ` : ''}
        
        ${analysis.elementos && analysis.elementos.length > 0 ? `
          <div class="analysis-field">
            <span class="field-label"><i data-lucide="palette"></i>Elementos Visuais:</span>
            <div class="tags-small">
              ${analysis.elementos.map(el => `<span class="tag-small">${el}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        
        ${analysis.estiloVisual ? `
          <div class="analysis-field">
            <span class="field-label"><i data-lucide="eye"></i>Estilo Visual:</span>
            <span class="field-value">${analysis.estiloVisual}</span>
          </div>
        ` : ''}
        
        ${analysis.publicoAlvo ? `
          <div class="analysis-field">
            <span class="field-label"><i data-lucide="users"></i>Público-Alvo:</span>
            <span class="field-value">${analysis.publicoAlvo}</span>
          </div>
        ` : ''}
        
        ${analysis.objetivoPost ? `
          <div class="analysis-field">
            <span class="field-label"><i data-lucide="target"></i>Objetivo:</span>
            <span class="field-value">${analysis.objetivoPost}</span>
          </div>
        ` : ''}
        
        <div class="analysis-row">
          ${analysis.engajamentoPotencial ? `
            <div class="engagement-badge ${analysis.engajamentoPotencial}">
              <i data-lucide="trending-up"></i>
              Engajamento: ${analysis.engajamentoPotencial}
            </div>
          ` : ''}
          
          ${analysis.qualidadeProducao ? `
            <div class="quality-badge ${analysis.qualidadeProducao}">
              <i data-lucide="star"></i>
              Qualidade: ${analysis.qualidadeProducao}
            </div>
          ` : ''}
        </div>
        
        ${analysis.resumo ? `
          <div class="post-summary">
            <strong><i data-lucide="lightbulb"></i>Resumo:</strong>
            <p>${analysis.resumo}</p>
          </div>
        ` : ''}
        
        ${post.permalink ? `
          <a href="${post.permalink}" target="_blank" class="post-link">
            <i data-lucide="external-link"></i>
            <span>Ver Post Original</span>
          </a>
        ` : ''}
      </div>
    </div>
  `;
  
  postsContainer.appendChild(postCard);
  
  // Inicializar ícones Lucide nos novos elementos
  lucide.createIcons();
  
  // Scroll suave para o último post
  setTimeout(() => {
    postCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
}

function displayFinalAnalysis(finalData) {
  currentAnalysis.final = finalData;
  
  // Nicho Final
  document.getElementById('nichoFinal').textContent = finalData.nichoFinal || 'Indefinido';
  
  // Score
  const score = finalData.scorePotencial || 0;
  document.getElementById('scorePotencial').textContent = score;
  
  // Aplicar cor ao score
  const scoreCircle = document.querySelector('.score-circle');
  if (score >= 8) {
    scoreCircle.style.background = 'linear-gradient(135deg, #10b981, #34d399)';
  } else if (score >= 6) {
    scoreCircle.style.background = 'linear-gradient(135deg, #6366f1, #818cf8)';
  } else if (score >= 4) {
    scoreCircle.style.background = 'linear-gradient(135deg, #f59e0b, #fbbf24)';
  } else {
    scoreCircle.style.background = 'linear-gradient(135deg, #ef4444, #f87171)';
  }
  
  // Sub-nichos
  const subNichosContainer = document.getElementById('subNichos');
  subNichosContainer.innerHTML = '';
  if (finalData.subNichos && finalData.subNichos.length > 0) {
    finalData.subNichos.forEach(nicho => {
      const tag = document.createElement('span');
      tag.className = 'tag tag-nicho';
      tag.innerHTML = `<i data-lucide="tag"></i><span>${nicho}</span>`;
      subNichosContainer.appendChild(tag);
    });
  } else {
    subNichosContainer.innerHTML = '<p class="resumo-text">Nenhum sub-nicho identificado</p>';
  }
  
  // Pontos Fortes
  const pontosContainer = document.getElementById('pontosFortes');
  pontosContainer.innerHTML = '';
  if (finalData.pontosFortes && finalData.pontosFortes.length > 0) {
    finalData.pontosFortes.forEach(ponto => {
      const li = document.createElement('li');
      li.textContent = ponto;
      pontosContainer.appendChild(li);
    });
  } else {
    pontosContainer.innerHTML = '<li>Nenhum ponto forte específico identificado</li>';
  }
  
  // Tipos de Conteúdo
  const tipoContainer = document.getElementById('tipoConteudo');
  tipoContainer.innerHTML = '';
  if (finalData.tipoConteudo && finalData.tipoConteudo.length > 0) {
    finalData.tipoConteudo.forEach(tipo => {
      const tag = document.createElement('span');
      tag.className = 'tag tag-tipo';
      tag.innerHTML = `<i data-lucide="file-text"></i><span>${tipo}</span>`;
      tipoContainer.appendChild(tag);
    });
  } else {
    tipoContainer.innerHTML = '<p class="resumo-text">Nenhum tipo específico identificado</p>';
  }
  
  // Recomendações de Marcas
  const marcasContainer = document.getElementById('recomendacoesMarcas');
  marcasContainer.innerHTML = '';
  if (finalData.recomendacoesMarcas && finalData.recomendacoesMarcas.length > 0) {
    finalData.recomendacoesMarcas.forEach(marca => {
      const li = document.createElement('li');
      li.textContent = marca;
      marcasContainer.appendChild(li);
    });
  } else {
    marcasContainer.innerHTML = '<li>Nenhuma recomendação específica</li>';
  }
  
  // Resumo Executivo
  document.getElementById('resumoExecutivo').textContent = 
    finalData.resumoExecutivo || 'Resumo não disponível';
  
  // Mostrar seção final
  finalSection.style.display = 'block';
  
  // Reinicializar ícones
  lucide.createIcons();
  
  setTimeout(() => {
    finalSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 300);
}

function downloadReport() {
  const report = {
    ...currentAnalysis,
    generatedAt: new Date().toISOString(),
  };
  
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analise_${currentAnalysis.profile?.username || 'perfil'}_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function enableLoadButton() {
  loadProfileBtn.disabled = false;
  const btnText = loadProfileBtn.querySelector('.btn-text');
  const btnLoader = loadProfileBtn.querySelector('.btn-loader');
  if (btnText) btnText.style.display = 'flex';
  if (btnLoader) btnLoader.style.display = 'none';
}

// Utility functions
function formatNumber(num) {
  if (!num || num === 'null' || num === 'undefined') return '0';
  
  // Se já é uma string formatada (ex: "1.2M", "500K")
  if (typeof num === 'string') {
    // Se já tem M, K ou B, retorna como está
    if (/[MKB]/i.test(num)) return num;
    
    // Remove pontos e vírgulas para converter
    const cleaned = num.replace(/[.,\s]/g, '');
    const parsed = parseInt(cleaned);
    
    if (isNaN(parsed)) {
      return num; // Retorna original se não for número
    }
    
    // Formata o número limpo
    if (parsed >= 1000000) {
      return (parsed / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    } else if (parsed >= 1000) {
      return (parsed / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    
    return parsed.toLocaleString('pt-BR');
  }
  
  // Se é um número
  const parsed = parseInt(num);
  if (isNaN(parsed)) {
    return '0';
  }
  
  if (parsed >= 1000000) {
    return (parsed / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  } else if (parsed >= 1000) {
    return (parsed / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  
  return parsed.toLocaleString('pt-BR');
}

function truncate(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Função auxiliar para exibir métricas corretamente
function getMetricDisplay(post, type) {
  if (type === 'likes') {
    if (post.likes && post.likes !== 'null') {
      return post.likes.replace(' likes', '');
    }
    if (post.likesCount && post.likesCount > 0) {
      return formatNumber(post.likesCount);
    }
    
    if (post.caption) {
      const match = post.caption.match(/([\d,\.]+[KMB]?)\s*likes?/i);
      if (match) return match[1];
    }
    
    return '0';
  }
  
  if (type === 'comments') {
    if (post.comments && post.comments !== 'null') {
      return post.comments.replace(' comments', '');
    }
    if (post.commentsCount && post.commentsCount > 0) {
      return formatNumber(post.commentsCount);
    }
    
    if (post.caption) {
      const match = post.caption.match(/([\d,\.]+[KMB]?)\s*comments?/i);
      if (match) return match[1];
    }
    
    return '0';
  }
  
  return '0';
}

// Mensagem de boas-vindas
console.log('%c🚀 Analisador de Influenciadores', 'font-size: 20px; font-weight: bold; color: #6366f1;');
console.log('%cPowered by OpenRouter AI', 'font-size: 12px; color: #10b981;');

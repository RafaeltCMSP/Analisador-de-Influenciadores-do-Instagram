# 📊 Analisador de Influenciadores do Instagram

> Sistema completo e robusto para análise de perfis do Instagram com integração de IA via OpenRouter.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-Educational-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Production-success.svg)](https://github.com)

---

## 📑 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#-tecnologias)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Como Usar](#-como-usar)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Funcionalidades Avançadas](#-funcionalidades-avançadas)
- [Exemplos de Uso](#-exemplos-de-uso)
- [Troubleshooting](#-troubleshooting)
- [Avisos Importantes](#-avisos-importantes)
- [Contribuindo](#-contribuindo)
- [Licença](#-licença)

---

## 🎯 Sobre o Projeto

O **Analisador de Influenciadores do Instagram** é uma ferramenta profissional que permite:

- 🔍 Analisar perfis do Instagram de forma automatizada
- 🤖 Utilizar Inteligência Artificial para classificar nichos e conteúdos
- 📈 Extrair métricas completas de engajamento
- 💾 Exportar relatórios detalhados em JSON
- 📊 Avaliar potencial comercial de influenciadores

**Ideal para:**
- Agências de Marketing Digital
- Marcas buscando parcerias com influenciadores
- Analistas de Mídias Sociais
- Pesquisadores de comportamento digital

---

## ✨ Funcionalidades

### 🔍 Análise de Perfil
- Carregamento de dados completos do perfil
- Identificação automática de nicho de atuação
- Classificação do tipo de influenciador (nano/micro/macro/mega)
- Análise de público-alvo
- Avaliação de potencial comercial

### 📸 Análise de Posts
- Configuração flexível (1-50 posts)
- Conversão de imagens para análise com IA
- Extração de legendas, mídias e hashtags
- Captura de métricas (likes, comentários, data)
- Identificação de sentimento e categorias
- Análise de elementos visuais e estilo

### 🤖 Análise com IA (OpenRouter)
- **Tema principal** e subtemas identificados
- **Sentimento** (positivo, neutro, negativo, inspiracional, motivacional)
- **Categorias** e nichos automaticamente detectados
- **Engajamento potencial** estimado
- **Elementos visuais** descritos
- **Cores predominantes** identificadas
- **Estilo visual** caracterizado
- **Público-alvo** específico
- **Qualidade de produção** avaliada
- **Sugestões de melhoria** personalizadas

### 📊 Relatório Final
- Nicho definitivo consolidado
- Score de potencial (1-10)
- Pontos fortes identificados
- Tipos de conteúdo predominantes
- Recomendações de marcas compatíveis
- Resumo executivo completo

### 💾 Exportação
- **Complete Analysis JSON**: Dados completos com imagens em base64
- **Light Analysis JSON**: Versão leve sem base64 para compartilhamento
- Estatísticas agregadas (médias de likes, comentários, etc)

### 📱 Interface Moderna
- Design responsivo e intuitivo
- Acompanhamento em tempo real via WebSocket
- Barra de progresso animada
- Cards visuais para cada post
- Preview de imagens e vídeos
- Badges coloridos de status

---

## 🔧 Tecnologias

### Backend
- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **WebSocket (ws)** - Comunicação em tempo real
- **Puppeteer + Stealth Plugin** - Web scraping avançado
- **Axios** - Cliente HTTP para APIs
- **dotenv** - Gerenciamento de variáveis de ambiente
- **fs-extra** - Operações de sistema de arquivos
- **Sharp** - Processamento de imagens

### Frontend
- **HTML5** - Estrutura semântica
- **CSS3** - Estilos modernos com gradientes e animações
- **JavaScript (Vanilla)** - Lógica e interatividade
- **WebSocket API** - Comunicação em tempo real

### IA e APIs
- **OpenRouter API** - Gateway para múltiplos modelos de IA
- **DeepSeek Chat v3.1** - Modelo de linguagem para análise

---

## 🚀 Instalação

### Pré-requisitos
- Node.js 18+ instalado
- npm ou yarn
- Chave de API do OpenRouter ([obtenha aqui](https://openrouter.ai/))

### Opção 1: GitHub Codespaces (Recomendado) ☁️

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new)

**Vantagens:**
- ✅ Ambiente pré-configurado automaticamente
- ✅ Dependências do Puppeteer já instaladas
- ✅ Funciona em qualquer dispositivo
- ✅ Não precisa instalar nada localmente

**Passos:**
1. Clique em **"Code"** → **"Codespaces"** → **"Create codespace on main"**
2. Aguarde a criação do ambiente (1-2 minutos)
3. As dependências serão instaladas automaticamente
4. Configure o arquivo `.env` (copie de `env.example.txt`)
5. Execute `npm run server`
6. Acesse a porta 3000 quando for exposta

> **Nota:** Se o Codespace já existir e você encontrar o erro do Puppeteer, execute:
> ```bash
> bash .devcontainer/setup.sh
> ```

### Opção 2: Instalação Local

```bash
# 1. Clone o repositório
git clone <seu-repositorio>
cd scraper

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp env.example.txt .env

# 4. Edite o arquivo .env com suas credenciais
# (veja seção de Configuração abaixo)

# 5. Inicie o servidor
npm run server
```

O servidor estará disponível em: **http://localhost:3000**

---

## ⚙️ Configuração

Crie um arquivo `.env` na raiz do projeto baseado no `env.example.txt`:

```env
# Instagram (opcional - apenas para perfis privados)
IG_USERNAME=seu_usuario
IG_PASSWORD=sua_senha

# OpenRouter API (obrigatório)
OPENROUTER_API_KEY=sua_chave_api
OPENROUTER_MODEL=deepseek/deepseek-chat-v3.1:free

# Servidor
PORT=3000

# Scraper
HEADLESS=true
MAX_POSTS=12
DELAY_BASE_MS=800
SESSION_FILE=./session.json
PROXY=
```

### Configurações Importantes

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `OPENROUTER_API_KEY` | Chave de API do OpenRouter (obrigatório) | - |
| `OPENROUTER_MODEL` | Modelo de IA a ser usado | `deepseek/deepseek-chat-v3.1:free` |
| `PORT` | Porta do servidor | `3000` |
| `HEADLESS` | Executar navegador em modo headless | `true` |
| `MAX_POSTS` | Número máximo de posts (padrão scraper.js) | `12` |
| `DELAY_BASE_MS` | Delay base entre ações (ms) | `800` |
| `IG_USERNAME` | Usuário Instagram (opcional) | - |
| `IG_PASSWORD` | Senha Instagram (opcional) | - |

---

## 📖 Como Usar

### Interface Web (Recomendado)

#### Passo 1: Iniciar o Servidor
```bash
npm run server
```

#### Passo 2: Acessar a Interface
Abra seu navegador em: **http://localhost:3000**

#### Passo 3: Carregar Perfil
1. Digite o username do Instagram (ex: `cristiano`, `natgeo`)
2. Clique em **"Carregar Perfil"**
3. Aguarde a análise inicial do perfil

#### Passo 4: Configurar Análise
1. Defina o número de posts (recomendado: 5-15)
2. Escolha as opções:
   - ✅ **Analisar imagens com IA**
   - ✅ **Extrair métricas completas**

#### Passo 5: Iniciar Análise Completa
1. Clique em **"Iniciar Análise Completa"**
2. Acompanhe o progresso em tempo real
3. Visualize os resultados progressivamente

#### Passo 6: Exportar Dados
- Clique em **"Baixar Relatório JSON"** para salvar os resultados

### Linha de Comando (Scraper Standalone)

```bash
# Edite as variáveis no .env:
# IG_PROFILE=cristiano
# MAX_POSTS=12

npm start
```

Os resultados serão salvos automaticamente em `output/`.

---

## 🗂️ Estrutura do Projeto

```
scraper/
├── 📁 public/                 # Frontend
│   ├── index.html             # Interface principal
│   ├── app.js                 # Lógica JavaScript
│   └── styles.css             # Estilos CSS
│
├── 📁 output/                 # Resultados das análises
│   ├── {username}_complete_analysis.json
│   └── {username}_analysis_light.json
│
├── 📄 server.js               # Servidor backend + WebSocket
├── 📄 scraper.js              # Script standalone (CLI)
├── 📄 package.json            # Dependências
├── 📄 .env                    # Configurações (não versionado)
├── 📄 env.example.txt         # Exemplo de configuração
├── 📄 session.json            # Sessão do Instagram (auto-gerado)
├── 📄 README.md               # Este arquivo
└── 📄 CHANGELOG.md            # Histórico de versões
```

---

## 🎨 Funcionalidades Avançadas

### Análise de Perfil Detalhada
```json
{
  "nicho": "Fotografia de Natureza",
  "subNichos": ["Vida Selvagem", "Paisagens", "Fotografia Documental"],
  "tipoInfluenciador": "mega",
  "temas": ["Natureza", "Conservação", "Educação"],
  "publicoAlvo": "Amantes da natureza, fotógrafos e entusiastas de viagens",
  "potencialComercial": "muito alto",
  "resumo": "Perfil profissional com foco em fotografia de natureza..."
}
```

### Análise de Post Completa
```json
{
  "tema": "Fotografia de Vida Selvagem",
  "subtemas": ["Leão", "Safari", "África"],
  "sentimento": "inspiracional",
  "categoriasIdentificadas": ["Fotografia", "Natureza", "Vida Selvagem"],
  "engajamentoPotencial": "muito-alto",
  "elementos": ["Leão majestoso", "Savana", "Luz natural"],
  "coresPredomimantes": ["Amarelo", "Marrom", "Verde"],
  "estiloVisual": "Fotografia profissional com composição impecável",
  "publicoAlvo": "Entusiastas de fotografia e natureza",
  "objetivoPost": "Educar e inspirar sobre a beleza da vida selvagem",
  "qualidadeProducao": "profissional",
  "pontosFortes": ["Composição", "Iluminação natural", "Momento único"],
  "sugestoesMelhoria": ["Adicionar contexto educacional", "Incluir call-to-action"],
  "resumo": "Post de qualidade excepcional capturando momento único..."
}
```

### Estatísticas Agregadas
```json
{
  "totalPosts": 12,
  "postsWithImages": 11,
  "averageLikes": 245000,
  "averageComments": 1200,
  "engagementRate": "0.12%"
}
```

---

## 💡 Exemplos de Uso

### Exemplo 1: Análise de Mega Influenciador

**Perfil:** `cristiano` (Cristiano Ronaldo)

```
Nicho: Esportes e Entretenimento
Tipo: Mega Influenciador
Seguidores: 665M
Score: 10/10

Pontos Fortes:
✓ Alcance global massivo
✓ Engajamento consistente
✓ Autenticidade e credibilidade
✓ Diversidade de conteúdo

Recomendações de Marcas:
• Artigos Esportivos (Nike, Adidas)
• Marcas de Luxo
• Suplementos e Nutrição
• Tecnologia e Gadgets
```

### Exemplo 2: Análise de Marca

**Perfil:** `natgeo` (National Geographic)

```
Nicho: Fotografia de Natureza
Tipo: Mega Influenciador
Seguidores: 280M
Score: 10/10

Pontos Fortes:
✓ Qualidade fotográfica excepcional
✓ Narrativa educacional forte
✓ Consistência visual
✓ Alcance global

Recomendações:
• Equipamentos Fotográficos
• Turismo de Aventura
• Organizações de Conservação
• Documentários e Streaming
```

### Exemplo 3: Micro-Influenciador

**Perfil:** `minimal.instagram` (Design Minimalista)

```
Nicho: Design e Lifestyle
Tipo: Micro Influenciador
Seguidores: 85K
Score: 8/10

Pontos Fortes:
✓ Público engajado e qualificado
✓ Estética consistente
✓ Nicho bem definido
✓ Taxa de engajamento alta

Recomendações:
• Marcas de Design
• Arquitetura e Interiores
• Produtos Minimalistas
• Tecnologia Premium
```

---

## 🔒 Privacidade e Segurança

### Proteções Implementadas
- ✅ Sessões persistentes (`session.json`) para evitar logins repetidos
- ✅ Delays humanizados para evitar detecção
- ✅ User-agent realista (Chrome)
- ✅ Puppeteer Stealth Plugin para evasão de detecção
- ✅ Rate limiting automático

### Recomendações
- Use com **moderação** para evitar bloqueios
- Para perfis privados, use credenciais próprias
- Delete `session.json` se houver problemas de autenticação
- Respeite os limites do Instagram (não abuse do sistema)

---

## ⚠️ Avisos Importantes

### 1. **Rate Limiting**
O Instagram tem limites de requisições. Recomendações:
- Evite analisar muitos perfis em sequência
- Use delays adequados (já configurados)
- Aguarde alguns minutos entre análises extensas

### 2. **Sessão de Login**
- A primeira execução pode solicitar login (se configurado)
- Sessão é salva em `session.json` automaticamente
- Sessão expira após alguns dias de inatividade

### 3. **Perfis Privados**
- Requer autenticação com credenciais válidas no `.env`
- Apenas perfis que você segue podem ser analisados
- Perfis públicos não requerem autenticação

### 4. **OpenRouter API**
- Requer chave de API válida
- Modelo gratuito (`deepseek/deepseek-chat-v3.1:free`) disponível
- Verifique créditos disponíveis em [openrouter.ai](https://openrouter.ai/)

### 5. **Uso Responsável**
- ⚠️ **Este projeto é apenas para fins educacionais**
- Respeite os Termos de Serviço do Instagram
- Não use para spam, scraping agressivo ou violação de privacidade
- Obtenha consentimento antes de analisar perfis de terceiros comercialmente

---

## 🐛 Troubleshooting

### Problema: Erro no GitHub Codespaces (Puppeteer)
**Sintomas:** `Failed to launch the browser process! libatk-1.0.so.0: cannot open shared object file`

**Causa:** Dependências do sistema Linux faltando

**Solução:**
```bash
# Execute o script de setup
bash .devcontainer/setup.sh

# Ou instale manualmente
sudo apt-get update && sudo apt-get install -y \
  ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 \
  libatk1.0-0 libcairo2 libcups2 libdbus-1-3 libgbm1 libgtk-3-0 \
  libnspr4 libnss3 libx11-6 libx11-xcb1 libxcomposite1 libxcursor1 \
  libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 \
  libxss1 libxtst6 xdg-utils wget

# Depois reinstale as dependências do projeto
npm install
```

**Dica:** Se você criar o Codespace pela primeira vez, ele instalará automaticamente as dependências através do `devcontainer.json`.

### Problema: Erro de Conexão WebSocket
**Sintomas:** Frontend não conecta ao backend

**Soluções:**
1. Verifique se o servidor está rodando
2. Confirme que a porta 3000 está livre
3. Limpe o cache do navegador (Ctrl + Shift + R)
4. Verifique o console do navegador (F12) para erros

### Problema: Perfil não Carrega
**Sintomas:** "Erro ao carregar perfil" ou timeout

**Soluções:**
1. Verifique se o username está correto
2. Teste com perfis públicos primeiro (ex: `instagram`, `cristiano`)
3. Para perfis privados, adicione credenciais no `.env`
4. Delete `session.json` e tente novamente
5. Aguarde alguns minutos (pode ter rate limiting)

### Problema: Erro da API OpenRouter
**Sintomas:** "Erro ao chamar OpenRouter API"

**Soluções:**
1. Verifique se `OPENROUTER_API_KEY` está correto no `.env`
2. Confirme se há créditos disponíveis na conta
3. Teste a chave em [openrouter.ai](https://openrouter.ai/)
4. Verifique se o modelo está disponível

### Problema: Posts sem Legenda ou Métricas
**Sintomas:** "Sem legenda" ou "0 likes"

**Possíveis Causas:**
- Post realmente não tem legenda
- Instagram mudou a estrutura HTML
- Rate limiting ativo
- Perfil privado sem autenticação

**Soluções:**
1. Teste com outros perfis
2. Verifique o console do servidor para erros
3. Aguarde alguns minutos e tente novamente

### Problema: Imagens não Aparecem
**Sintomas:** Cards de posts sem preview de imagem

**Soluções:**
1. Verifique o console do navegador (F12)
2. Confirme que `analyzeImages` está marcado
3. Algumas imagens podem ter proteção CORS (normal)
4. Imagens muito grandes podem falhar na conversão

### Problema: Servidor Trava ou Crasheia
**Sintomas:** Processo Node.js para de responder

**Soluções:**
1. Verifique logs no terminal
2. Reduza o número de posts analisados
3. Aumente `DELAY_BASE_MS` no `.env`
4. Verifique memória disponível
5. Reinicie o servidor

---

## 📊 Performance

### Tempo Médio de Execução

| Operação | Tempo |
|----------|-------|
| Carregar perfil | 5-10s |
| Análise de perfil com IA | 3-5s |
| Análise de 1 post (com imagem) | 8-15s |
| Análise de 10 posts completos | ~2-3 min |
| Análise de 50 posts completos | ~10-15 min |

### Consumo de Recursos

- **Memória:** ~200-500 MB
- **CPU:** Baixo a médio (picos durante scraping)
- **Rede:** Depende do número de posts e tamanho das imagens
- **Armazenamento:** ~1-5 MB por perfil analisado (com imagens base64)

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Diretrizes
- Mantenha o código limpo e comentado
- Siga o padrão de código existente
- Adicione documentação para novas features
- Teste extensivamente antes de submeter

---

## 📝 Licença

Este projeto é apenas para **fins educacionais**.

**Aviso Legal:**
- Não me responsabilizo pelo uso indevido desta ferramenta
- Respeite os Termos de Serviço do Instagram
- Não use para spam, scraping agressivo ou violação de privacidade
- Obtenha as permissões necessárias antes de usar comercialmente

---

## 🎓 Roadmap de Melhorias Futuras

- [ ] Análise de hashtags mais profunda
- [ ] Detecção de produtos/marcas nas imagens
- [ ] Análise de comentários dos posts
- [ ] Comparação entre múltiplos perfis
- [ ] Export para PDF e Excel
- [ ] Dashboard com gráficos interativos
- [ ] Análise de Stories (Instagram Stories API)
- [ ] Detecção de influenciadores similares
- [ ] API RESTful para integração
- [ ] Suporte para outros idiomas

---

## 🌟 Agradecimentos

- **OpenRouter** - Por fornecer acesso a modelos de IA
- **DeepSeek** - Pelo modelo de linguagem gratuito e poderoso
- **Puppeteer** - Pela excelente ferramenta de web scraping
- **Comunidade Open Source** - Por todas as bibliotecas utilizadas

---

## 📈 Estatísticas do Projeto

![GitHub stars](https://img.shields.io/github/stars/seu-usuario/seu-repo?style=social)
![GitHub forks](https://img.shields.io/github/forks/seu-usuario/seu-repo?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/seu-usuario/seu-repo?style=social)

---

<div align="center">

**Desenvolvido por RafaelCMSP**

[⬆️ Voltar ao topo](#-analisador-de-influenciadores-do-instagram)

</div>

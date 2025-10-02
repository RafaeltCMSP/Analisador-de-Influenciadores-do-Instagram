# 📋 Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [2.0.0] - 2025-10-02

### 🎉 Versão Completa e Robusta

#### ✨ Adicionado
- Sistema de análise completo com integração OpenRouter AI
- Interface web moderna com WebSocket em tempo real
- Análise profunda de posts com IA (DeepSeek Chat v3.1)
- Conversão de imagens para base64 para análise visual
- Extração robusta de métricas (likes, comentários, data)
- Múltiplas estratégias de captura de dados (caption, mídia, métricas)
- Sistema de fallback para garantir coleta de dados
- Preview de mídia nos cards de posts
- Badges coloridos de status e sentimento
- Análise final consolidada com score de potencial
- Export de relatórios em JSON (completo e light)
- Estatísticas agregadas (médias, totais)
- Logs detalhados para debugging
- Tratamento robusto de erros
- Documentação completa e organizada

#### 🔧 Corrigido
- Erro fatal `scraped is not defined` que travava o servidor
- Big numbers (M, K) não formatando corretamente
- Posts não carregando todos (apenas 3 de 12)
- Imagens dos posts não aparecendo nos cards
- Likes e comentários mostrando "0" incorretamente
- IDs duplicados no HTML (`postsCount`)
- Função `formatNumber()` não lidando com vírgulas
- Parsing de dados do perfil da bio (posts, seguidores, seguindo)
- Extração de métricas dos posts (múltiplas estratégias)
- Continuidade do loop mesmo com erros

#### 🎨 Melhorado
- Interface visual completamente redesenhada
- Cards de posts com layout moderno e informativo
- Sistema de cores consistente e intuitivo
- Animações suaves e transições
- Responsividade em todos os dispositivos
- Feedback visual em tempo real
- Barra de progresso animada
- Badges e tags estilizados
- Preview de mídia com contador (1/5)
- Links clicáveis para posts originais
- Organização hierárquica da informação

#### 📚 Documentação
- README.md abrangente e profissional
- CHANGELOG.md estruturado
- Guias de uso e exemplos
- Documentação de troubleshooting
- Arquivos históricos organizados em `docs/archive/`

---

## [1.5.0] - 2025-09-28

### 🔧 Correções Críticas de Números

#### 🐛 Corrigido
- Posts do perfil aparecendo como "0" em vez do valor correto
- Função `formatNumber()` reescrita completamente
- Fallback robusto para parsear dados da `bioRaw`
- Validação de elementos DOM antes de atualizar
- Logs de debug adicionados para rastreamento

#### 📝 Documentado
- `AJUSTES_NUMEROS.md` - Documentação das correções aplicadas
- `CORRECAO_POSTS_FRONTEND.md` - Correções específicas do frontend
- `DEBUG_POSTS.md` - Guia de debugging passo a passo
- `VALIDACAO_FINAL.md` - Checklist de validação completa

---

## [1.0.0] - 2025-09-15

### 🎬 Lançamento Inicial

#### ✨ Adicionado
- Script de scraping básico com Puppeteer
- Extração de dados de perfis do Instagram
- Coleta de posts com legendas e mídias
- Salvamento em JSON e CSV
- Sistema de sessão persistente
- Configuração via arquivo `.env`
- Delays humanizados para evitar detecção
- Puppeteer Stealth Plugin

#### 📦 Infraestrutura
- Estrutura básica do projeto
- Gerenciamento de dependências com npm
- Configurações de ambiente
- Diretório de output para resultados

---

## [0.1.0] - 2025-09-01

### 🌱 Versão Experimental

#### 🧪 Experimental
- Proof of concept do sistema de scraping
- Testes iniciais de extração de dados
- Validação de viabilidade técnica

---

## Legenda

- `✨ Adicionado` - Novas funcionalidades
- `🔧 Corrigido` - Correções de bugs
- `🎨 Melhorado` - Melhorias em funcionalidades existentes
- `🗑️ Removido` - Funcionalidades removidas
- `🔒 Segurança` - Correções de segurança
- `📚 Documentação` - Mudanças na documentação
- `⚡ Performance` - Melhorias de performance
- `♻️ Refatorado` - Refatoração de código

---

## Links Úteis

- [README Principal](README.md)
- [Guia Rápido](docs/GUIA_RAPIDO.md)
- [Exemplos de Uso](docs/EXEMPLO_USO.md)
- [Documentação Histórica](docs/archive/)

---

<div align="center">

**Mantido com ❤️ pela comunidade**

[⬆️ Voltar ao topo](#-changelog)

</div>

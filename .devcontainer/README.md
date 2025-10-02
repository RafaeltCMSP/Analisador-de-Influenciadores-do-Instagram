# 🐳 GitHub Codespaces / Dev Container

Esta pasta contém a configuração para executar o projeto em **GitHub Codespaces** ou qualquer editor compatível com **Dev Containers** (como VS Code).

## 📦 O que está incluído

### `devcontainer.json`
Configuração principal do container que:
- ✅ Usa imagem Node.js 18 oficial da Microsoft
- ✅ Instala automaticamente dependências do npm
- ✅ Instala todas as bibliotecas necessárias para o Puppeteer/Chrome
- ✅ Expõe a porta 3000 (servidor web)
- ✅ Configura extensões recomendadas do VS Code (ESLint, Prettier)
- ✅ Habilita formatação automática ao salvar

### `setup.sh`
Script de instalação manual das dependências do Puppeteer caso necessário.

## 🚀 Como Usar

### No GitHub Codespaces

1. No repositório, clique em **Code** → **Codespaces** → **Create codespace**
2. Aguarde a criação do ambiente (1-3 minutos na primeira vez)
3. As dependências serão instaladas automaticamente
4. Configure seu `.env`:
   ```bash
   cp env.example.txt .env
   # Edite o .env com suas credenciais
   ```
5. Execute o servidor:
   ```bash
   npm run server
   ```
6. Acesse a porta 3000 quando for exposta

### No VS Code Local (Dev Containers)

**Pré-requisitos:**
- Docker instalado
- Extensão "Dev Containers" do VS Code

**Passos:**
1. Abra o projeto no VS Code
2. Pressione `F1` → digite "Dev Containers: Reopen in Container"
3. Aguarde o container ser construído
4. Continue do passo 4 acima

## 🔧 Solução de Problemas

### Erro: Puppeteer não encontra bibliotecas

Se você já tinha um Codespace criado antes desta configuração, execute:

```bash
bash .devcontainer/setup.sh
npm install
```

### Erro: Porta 3000 não é exposta

1. Vá na aba **PORTS** no VS Code
2. Clique em **Forward a Port**
3. Digite `3000`
4. A porta será exposta e você poderá acessar

### Container não inicia corretamente

1. Delete o container/codespace
2. Crie um novo
3. Se o problema persistir, verifique os logs do container

## 📝 Dependências Instaladas

O script instala as seguintes bibliotecas necessárias para o Chrome/Puppeteer rodar no Linux:

- `ca-certificates` - Certificados SSL
- `fonts-liberation` - Fontes básicas
- `libasound2` - Sistema de áudio
- `libatk-bridge2.0-0`, `libatk1.0-0` - Acessibilidade
- `libcairo2` - Renderização gráfica
- `libcups2` - Sistema de impressão
- `libdbus-1-3` - Sistema de mensagens
- `libgbm1` - Gerenciador de buffer gráfico
- `libgtk-3-0` - Toolkit GTK
- `libnss3`, `libnspr4` - Segurança de rede
- `libx11-*` - Sistema X Window
- E muitas outras...

Todas essas dependências são necessárias porque o Chrome é um navegador completo que precisa de recursos gráficos, de áudio e de sistema mesmo rodando em modo headless.

## 🎯 Extensões Recomendadas

O `devcontainer.json` instala automaticamente:

- **ESLint** - Linter JavaScript
- **Prettier** - Formatador de código

Configurações aplicadas:
- Formatação automática ao salvar
- Prettier como formatador padrão

## 📊 Performance

**Tempo de criação do Codespace:**
- Primeira vez: ~2-3 minutos
- Subsequentes: ~30-60 segundos

**Consumo de recursos:**
- vCPUs: 2-4 cores
- RAM: 4-8 GB
- Disco: ~5-10 GB

## 🔒 Segurança

**Importante:** Nunca commite seu arquivo `.env` com credenciais reais!

O `.gitignore` já está configurado para ignorar:
- `.env`
- `session.json`
- `output/`
- `node_modules/`

## 💡 Dicas

1. **Codespaces é gratuito** para contas pessoais (60 horas/mês)
2. **Lembre de parar** o Codespace quando não estiver usando
3. **Delete Codespaces antigos** que não usa mais
4. Use `git stash` antes de deletar um Codespace para não perder trabalho

## 🆘 Suporte

Se tiver problemas:
1. Verifique a [documentação oficial do GitHub Codespaces](https://docs.github.com/codespaces)
2. Abra uma issue no repositório
3. Consulte o `README.md` principal na raiz do projeto


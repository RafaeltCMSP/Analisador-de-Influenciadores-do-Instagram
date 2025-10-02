#!/bin/bash

# Script para instalar dependências do Puppeteer no Linux/Codespaces
# Execute com: bash install-deps.sh

echo "================================================"
echo "🔧 Instalando dependências do Puppeteer..."
echo "================================================"
echo ""

# Verificar se está no Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "❌ Este script é apenas para Linux/Codespaces"
    echo "   Se estiver no Windows/Mac, as dependências não são necessárias"
    exit 1
fi

echo "📦 Atualizando lista de pacotes..."
sudo apt-get update -qq

echo ""
echo "🔨 Instalando bibliotecas necessárias..."
echo "   (Isso pode levar 1-2 minutos)"
echo ""

# Instalar dependências do Chrome
sudo apt-get install -y -qq \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Dependências instaladas com sucesso!"
    echo ""
    echo "================================================"
    echo "🚀 Próximos passos:"
    echo "================================================"
    echo ""
    echo "1. Configure o arquivo .env:"
    echo "   cp env.example.txt .env"
    echo "   # Edite .env com suas credenciais"
    echo ""
    echo "2. Inicie o servidor:"
    echo "   npm run server"
    echo ""
    echo "3. Acesse a aplicação na porta 3000"
    echo ""
else
    echo ""
    echo "❌ Erro ao instalar dependências"
    echo "   Tente executar manualmente:"
    echo "   sudo apt-get update"
    echo "   sudo apt-get install -y libatk-bridge2.0-0 libatk1.0-0 libgtk-3-0"
    exit 1
fi


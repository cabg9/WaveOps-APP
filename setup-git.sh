#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# SCRIPT DE CONFIGURACIÓN GIT - WAVEOPS
# ═══════════════════════════════════════════════════════════════════

echo "🐙 Configurando Git para WaveOps..."
echo ""

# Verificar si git está instalado
if ! command -v git &> /dev/null; then
    echo "❌ Git no está instalado."
    echo "   Descarga desde: https://git-scm.com/downloads"
    exit 1
fi

echo "✅ Git está instalado"
echo ""

# Configurar usuario (si no está configurado)
if [ -z "$(git config --global user.name)" ]; then
    echo "📝 Configurando tu nombre de usuario..."
    read -p "Ingresa tu nombre (ej: Juan Perez): " git_name
    git config --global user.name "$git_name"
fi

if [ -z "$(git config --global user.email)" ]; then
    echo ""
    echo "📝 Configurando tu email..."
    read -p "Ingresa tu email: " git_email
    git config --global user.email "$git_email"
fi

echo ""
echo "👤 Usuario Git configurado:"
echo "   Nombre: $(git config --global user.name)"
echo "   Email: $(git config --global user.email)"
echo ""

# Inicializar repositorio
echo "📁 Inicializando repositorio..."
git init

# Agregar archivos
echo "📦 Agregando archivos..."
git add .

# Commit inicial
echo "💾 Creando commit inicial..."
git commit -m "V1.0.0.0 - WaveOps - Initial Release"

# Renombrar rama
git branch -M main

echo ""
echo "✅ Repositorio local configurado!"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "📝 SIGUIENTES PASOS:"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "1. Crea una cuenta en GitHub:"
echo "   https://github.com/signup"
echo "   Elige el nombre de usuario: cabg9"
echo ""
echo "2. Crea un repositorio nuevo:"
echo "   Ve a: https://github.com/new"
echo "   - Repository name: waveops"
echo "   - Description: Sistema de Gestión Operativa"
echo "   - Selecciona: Private"
echo "   - NO marques 'Initialize with README'"
echo "   - Click: Create repository"
echo ""
echo "3. Conecta con GitHub (ejecuta este comando):"
echo "   git remote add origin https://github.com/cabg9/waveops.git"
echo ""
echo "4. Sube los cambios (ejecuta este comando):"
echo "   git push -u origin main"
echo ""
echo "5. Verifica en: https://github.com/cabg9/waveops"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📖 Lee GITHUB_SETUP.md para más detalles"

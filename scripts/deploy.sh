#!/bin/bash

# Script de deploy para MeDico1
# Prepara y despliega la aplicación

echo "🚀 Iniciando deploy de MeDico1..."

# Verificar que estamos en main o dev
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ] && [ "$BRANCH" != "dev" ]; then
    echo "⚠️  Advertencia: No estás en main o dev. Branch actual: $BRANCH"
    read -p "¿Continuar de todas formas? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Verificar cambios sin commitear
if [[ -n $(git status --porcelain) ]]; then
    echo "❌ Hay cambios sin commitear. Por favor commitea o stash tus cambios."
    exit 1
fi

echo "✅ Git status limpio"

# Pull latest changes
echo "📥 Obteniendo últimos cambios..."
git pull origin $BRANCH

if [ $? -ne 0 ]; then
    echo "❌ Error al hacer pull"
    exit 1
fi

# Instalar/actualizar dependencias
echo "📦 Actualizando dependencias..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error al instalar dependencias"
    exit 1
fi

# Ejecutar linter
echo "🔍 Ejecutando linter..."
npm run lint

if [ $? -ne 0 ]; then
    echo "⚠️  Advertencia: Hay errores de linting"
    read -p "¿Continuar con el deploy? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Build del proyecto
echo "🏗️  Building proyecto..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error al hacer build"
    exit 1
fi

echo "✅ Build completado"

# Deploy
echo "🚢 Desplegando..."

# Si usas Vercel
if command -v vercel &> /dev/null; then
    echo "📤 Desplegando con Vercel..."
    vercel --prod
    
    if [ $? -eq 0 ]; then
        echo "✅ Deploy exitoso con Vercel!"
    else
        echo "❌ Error al desplegar con Vercel"
        exit 1
    fi
else
    echo "⚠️  Vercel CLI no encontrado. Instala con: npm i -g vercel"
    echo "💡 Puedes desplegar manualmente subiendo la carpeta dist/"
fi

echo ""
echo "✨ Deploy completado!"
echo ""
echo "📊 Estadísticas del build:"
du -sh dist/
echo ""

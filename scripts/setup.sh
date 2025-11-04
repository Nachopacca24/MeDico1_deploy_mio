#!/bin/bash

# Script de setup para MeDico1
# Configura el entorno de desarrollo

echo "🚀 Configurando MeDico1..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor instala Node.js 18+ primero."
    exit 1
fi

echo "✅ Node.js $(node --version) detectado"

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm no está instalado."
    exit 1
fi

echo "✅ npm $(npm --version) detectado"

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error al instalar dependencias"
    exit 1
fi

echo "✅ Dependencias instaladas"

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    echo "📝 Creando archivo .env..."
    cp .env.example .env
    echo "✅ Archivo .env creado. Por favor configura tus credenciales."
else
    echo "⚠️  Archivo .env ya existe. Saltando..."
fi

# Verificar estructura de directorios
echo "📁 Verificando estructura de directorios..."

DIRS=(
    "src/features"
    "src/shared"
    "src/core"
    "backend/data"
    "backend/migrations"
    "docs"
    "scripts"
)

for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "  ✅ $dir"
    else
        echo "  ❌ $dir no encontrado"
    fi
done

echo ""
echo "✨ Setup completado!"
echo ""
echo "📚 Próximos pasos:"
echo "  1. Edita el archivo .env con tus credenciales de Fine"
echo "  2. Ejecuta 'npm run dev' para iniciar el servidor"
echo "  3. Visita http://localhost:5173"
echo ""
echo "📖 Documentación: ./docs/"
echo ""

# Script de setup para MeDico1 (Windows PowerShell)
# Configura el entorno de desarrollo

Write-Host "🚀 Configurando MeDico1..." -ForegroundColor Cyan

# Verificar Node.js
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js no está instalado. Por favor instala Node.js 18+ primero." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js $nodeVersion detectado" -ForegroundColor Green

# Verificar npm
$npmVersion = npm --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm no está instalado." -ForegroundColor Red
    exit 1
}

Write-Host "✅ npm $npmVersion detectado" -ForegroundColor Green

# Instalar dependencias
Write-Host "📦 Instalando dependencias..." -ForegroundColor Cyan
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al instalar dependencias" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencias instaladas" -ForegroundColor Green

# Crear archivo .env si no existe
if (-not (Test-Path .env)) {
    Write-Host "📝 Creando archivo .env..." -ForegroundColor Cyan
    Copy-Item .env.example .env
    Write-Host "✅ Archivo .env creado. Por favor configura tus credenciales." -ForegroundColor Green
} else {
    Write-Host "⚠️  Archivo .env ya existe. Saltando..." -ForegroundColor Yellow
}

# Verificar estructura de directorios
Write-Host "📁 Verificando estructura de directorios..." -ForegroundColor Cyan

$dirs = @(
    "src\features",
    "src\shared",
    "src\core",
    "backend\data",
    "backend\migrations",
    "docs",
    "scripts"
)

foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        Write-Host "  ✅ $dir" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $dir no encontrado" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✨ Setup completado!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Próximos pasos:" -ForegroundColor Cyan
Write-Host "  1. Edita el archivo .env con tus credenciales de Fine"
Write-Host "  2. Ejecuta 'npm run dev' para iniciar el servidor"
Write-Host "  3. Visita http://localhost:5173"
Write-Host ""
Write-Host "📖 Documentación: .\docs\" -ForegroundColor Cyan
Write-Host ""

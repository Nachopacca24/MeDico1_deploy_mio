# Script de verificacion de estructura - MeDico1# Script de verificación de estructura - MeDico1

# Verifica que todos los archivos y carpetas esten en su lugar# Verifica que todos los archivos y carpetas estén en su lugar



Write-Host "Verificando estructura de MeDico1..." -ForegroundColor CyanWrite-Host "🔍 Verificando estructura de MeDico1..." -ForegroundColor Cyan

Write-Host ""Write-Host ""



$allOk = $true$allOk = $true



# Funcion para verificar directorio# Función para verificar directorio

function Test-Directory {function Test-Directory {

    param($path, $name)    param($path, $name)

    if (Test-Path $path) {    if (Test-Path $path) {

        Write-Host "OK $name" -ForegroundColor Green        Write-Host "✅ $name" -ForegroundColor Green

        return $true        return $true

    } else {    } else {

        Write-Host "FALTA $name" -ForegroundColor Red        Write-Host "❌ $name - NO ENCONTRADO" -ForegroundColor Red

        return $false        return $false

    }    }

}}



# Funcion para verificar archivo# Función para verificar archivo

function Test-FileExists {function Test-FileExists {

    param($path, $name)    param($path, $name)

    if (Test-Path $path) {    if (Test-Path $path) {

        Write-Host "OK $name" -ForegroundColor Green        Write-Host "✅ $name" -ForegroundColor Green

        return $true        return $true

    } else {    } else {

        Write-Host "FALTA $name" -ForegroundColor Red        Write-Host "❌ $name - NO ENCONTRADO" -ForegroundColor Red

        return $false        return $false

    }    }

}}



Write-Host "Verificando estructura de carpetas..." -ForegroundColor YellowWrite-Host "📁 Verificando estructura de carpetas..." -ForegroundColor Yellow

Write-Host ""Write-Host ""



# Features# Features

Write-Host "Features:" -ForegroundColor CyanWrite-Host "Features:" -ForegroundColor Cyan

$allOk = $allOk -and (Test-Directory "src\features\auth" "  auth/")$allOk = $allOk -and (Test-Directory "src\features\auth" "  auth/")

$allOk = $allOk -and (Test-Directory "src\features\dashboard" "  dashboard/")$allOk = $allOk -and (Test-Directory "src\features\dashboard" "  dashboard/")

$allOk = $allOk -and (Test-Directory "src\features\calculator" "  calculator/")$allOk = $allOk -and (Test-Directory "src\features\calculator" "  calculator/")

$allOk = $allOk -and (Test-Directory "src\features\operations" "  operations/")$allOk = $allOk -and (Test-Directory "src\features\operations" "  operations/")

$allOk = $allOk -and (Test-Directory "src\features\favorites" "  favorites/")$allOk = $allOk -and (Test-Directory "src\features\favorites" "  favorites/")

$allOk = $allOk -and (Test-Directory "src\features\history" "  history/")$allOk = $allOk -and (Test-Directory "src\features\history" "  history/")

$allOk = $allOk -and (Test-Directory "src\features\settings" "  settings/")$allOk = $allOk -and (Test-Directory "src\features\settings" "  settings/")

Write-Host ""Write-Host ""



# Shared# Shared

Write-Host "Shared:" -ForegroundColor CyanWrite-Host "Shared:" -ForegroundColor Cyan

$allOk = $allOk -and (Test-Directory "src\shared\components\ui" "  components/ui/")$allOk = $allOk -and (Test-Directory "src\shared\components\ui" "  components/ui/")

$allOk = $allOk -and (Test-Directory "src\shared\components\layout" "  components/layout/")$allOk = $allOk -and (Test-Directory "src\shared\components\layout" "  components/layout/")

$allOk = $allOk -and (Test-Directory "src\shared\hooks" "  hooks/")$allOk = $allOk -and (Test-Directory "src\shared\hooks" "  hooks/")

$allOk = $allOk -and (Test-Directory "src\shared\lib" "  lib/")$allOk = $allOk -and (Test-Directory "src\shared\lib" "  lib/")

$allOk = $allOk -and (Test-Directory "src\shared\utils" "  utils/")$allOk = $allOk -and (Test-Directory "src\shared\utils" "  utils/")

Write-Host ""Write-Host ""



# Core# Core

Write-Host "Core:" -ForegroundColor CyanWrite-Host "Core:" -ForegroundColor Cyan

$allOk = $allOk -and (Test-Directory "src\core\router" "  router/")$allOk = $allOk -and (Test-Directory "src\core\router" "  router/")

$allOk = $allOk -and (Test-Directory "src\core\providers" "  providers/")$allOk = $allOk -and (Test-Directory "src\core\providers" "  providers/")

Write-Host ""Write-Host ""



# Backend# Backend

Write-Host "Backend:" -ForegroundColor CyanWrite-Host "Backend:" -ForegroundColor Cyan

$allOk = $allOk -and (Test-Directory "backend\data\surgeries" "  data/surgeries/")$allOk = $allOk -and (Test-Directory "backend\data\surgeries" "  data/surgeries/")

$allOk = $allOk -and (Test-Directory "backend\migrations" "  migrations/")$allOk = $allOk -and (Test-Directory "backend\migrations" "  migrations/")

Write-Host ""Write-Host ""



# Docs# Docs

Write-Host "Documentacion:" -ForegroundColor CyanWrite-Host "Documentación:" -ForegroundColor Cyan

$allOk = $allOk -and (Test-FileExists "docs\arquitectura.md" "  arquitectura.md")$allOk = $allOk -and (Test-FileExists "docs\arquitectura.md" "  arquitectura.md")

$allOk = $allOk -and (Test-FileExists "docs\guia-instalacion.md" "  guia-instalacion.md")$allOk = $allOk -and (Test-FileExists "docs\guia-instalacion.md" "  guia-instalacion.md")

$allOk = $allOk -and (Test-FileExists "docs\guia-desarrollo.md" "  guia-desarrollo.md")$allOk = $allOk -and (Test-FileExists "docs\guia-desarrollo.md" "  guia-desarrollo.md")

$allOk = $allOk -and (Test-FileExists "docs\RESUMEN_REORGANIZACION.md" "  RESUMEN_REORGANIZACION.md")$allOk = $allOk -and (Test-FileExists "docs\RESUMEN_REORGANIZACION.md" "  RESUMEN_REORGANIZACION.md")

Write-Host ""Write-Host ""



# Scripts# Scripts

Write-Host "Scripts:" -ForegroundColor CyanWrite-Host "Scripts:" -ForegroundColor Cyan

$allOk = $allOk -and (Test-FileExists "scripts\setup.ps1" "  setup.ps1")$allOk = $allOk -and (Test-FileExists "scripts\setup.ps1" "  setup.ps1")

$allOk = $allOk -and (Test-FileExists "scripts\setup.sh" "  setup.sh")$allOk = $allOk -and (Test-FileExists "scripts\setup.sh" "  setup.sh")

$allOk = $allOk -and (Test-FileExists "scripts\deploy.sh" "  deploy.sh")$allOk = $allOk -and (Test-FileExists "scripts\deploy.sh" "  deploy.sh")

Write-Host ""Write-Host ""



# Archivos raiz# Archivos raíz

Write-Host "Archivos de configuracion:" -ForegroundColor CyanWrite-Host "Archivos de configuración:" -ForegroundColor Cyan

$allOk = $allOk -and (Test-FileExists "README.md" "  README.md")$allOk = $allOk -and (Test-FileExists "README.md" "  README.md")

$allOk = $allOk -and (Test-FileExists ".env.example" "  .env.example")$allOk = $allOk -and (Test-FileExists ".env.example" "  .env.example")

$allOk = $allOk -and (Test-FileExists ".gitignore" "  .gitignore")$allOk = $allOk -and (Test-FileExists ".gitignore" "  .gitignore")

$allOk = $allOk -and (Test-FileExists "package.json" "  package.json")$allOk = $allOk -and (Test-FileExists "package.json" "  package.json")

$allOk = $allOk -and (Test-FileExists "vite.config.ts" "  vite.config.ts")$allOk = $allOk -and (Test-FileExists "vite.config.ts" "  vite.config.ts")

$allOk = $allOk -and (Test-FileExists "tsconfig.json" "  tsconfig.json")$allOk = $allOk -and (Test-FileExists "tsconfig.json" "  tsconfig.json")

Write-Host ""Write-Host ""



# Verificar archivos clave# Verificar archivos clave

Write-Host "Archivos clave del codigo:" -ForegroundColor CyanWrite-Host "Archivos clave del código:" -ForegroundColor Cyan

$allOk = $allOk -and (Test-FileExists "src\main.tsx" "  main.tsx")$allOk = $allOk -and (Test-FileExists "src\main.tsx" "  main.tsx")

$allOk = $allOk -and (Test-FileExists "src\core\router\AppRouter.tsx" "  AppRouter.tsx")$allOk = $allOk -and (Test-FileExists "src\core\router\AppRouter.tsx" "  AppRouter.tsx")

$allOk = $allOk -and (Test-FileExists "src\shared\lib\fine.ts" "  fine.ts")$allOk = $allOk -and (Test-FileExists "src\shared\lib\fine.ts" "  fine.ts")

$allOk = $allOk -and (Test-FileExists "src\shared\utils\csvLoader.ts" "  csvLoader.ts")$allOk = $allOk -and (Test-FileExists "src\shared\utils\csvLoader.ts" "  csvLoader.ts")

Write-Host ""Write-Host ""



# Resultado final# Resultado final

Write-Host "======================================" -ForegroundColor GrayWrite-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

if ($allOk) {if ($allOk) {

    Write-Host "Estructura verificada correctamente!" -ForegroundColor Green    Write-Host "✅ ¡Estructura verificada correctamente!" -ForegroundColor Green

    Write-Host ""    Write-Host ""

    Write-Host "Proximos pasos:" -ForegroundColor Cyan    Write-Host "📚 Próximos pasos:" -ForegroundColor Cyan

    Write-Host "  1. Ejecutar: npm install" -ForegroundColor White    Write-Host "  1. Ejecutar: npm install" -ForegroundColor White

    Write-Host "  2. Configurar: .env" -ForegroundColor White    Write-Host "  2. Configurar: .env" -ForegroundColor White

    Write-Host "  3. Iniciar: npm run dev" -ForegroundColor White    Write-Host "  3. Iniciar: npm run dev" -ForegroundColor White

    Write-Host ""    Write-Host ""

} else {} else {

    Write-Host "Faltan algunos archivos o carpetas" -ForegroundColor Red    Write-Host "❌ Faltan algunos archivos o carpetas" -ForegroundColor Red

    Write-Host "Por favor revisa los elementos marcados" -ForegroundColor Yellow    Write-Host "   Por favor revisa los elementos marcados en rojo" -ForegroundColor Yellow

    Write-Host ""    Write-Host ""

}}

Write-Host "======================================" -ForegroundColor GrayWrite-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray


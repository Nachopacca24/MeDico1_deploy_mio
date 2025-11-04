# Script para ejecutar Backend (Django) y Frontend (Vite) simultáneamente

Write-Host "🚀 Iniciando MeDico1 - Django + React" -ForegroundColor Green
Write-Host ""

# Activar entorno virtual
Write-Host "📦 Activando entorno virtual..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

# Iniciar Django en background
Write-Host "🐍 Iniciando servidor Django en http://localhost:8000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\venv\Scripts\Activate.ps1; python manage.py runserver 8000"

# Esperar 3 segundos
Start-Sleep -Seconds 3

# Iniciar Vite en background  
Write-Host "⚛️  Iniciando servidor Vite en http://localhost:5173..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"

Write-Host ""
Write-Host "✅ Servidores iniciados:" -ForegroundColor Green
Write-Host "   - Django API: http://localhost:8000" -ForegroundColor Cyan
Write-Host "   - React Frontend: http://localhost:5173" -ForegroundColor Magenta
Write-Host ""
Write-Host "Para detener, cierra las ventanas de PowerShell" -ForegroundColor Yellow

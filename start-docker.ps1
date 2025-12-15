# Script PowerShell para iniciar WhatsApp Bot Guardian en Docker
# Uso: .\start-docker.ps1

Write-Host "Iniciando WhatsApp Bot Guardian en Docker..." -ForegroundColor Cyan
Write-Host ""

# Verificar que Docker esta instalado
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Docker no esta instalado" -ForegroundColor Red
    Write-Host "Instala Docker Desktop desde: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Verificar que Docker esta corriendo
$dockerRunning = docker info 2>$null
if (!$dockerRunning) {
    Write-Host "ERROR: Docker Desktop no esta ejecutandose" -ForegroundColor Red
    Write-Host "Inicia Docker Desktop y vuelve a ejecutar este script" -ForegroundColor Yellow
    exit 1
}

# Crear archivos JSON si no existen
Write-Host "Verificando archivos de datos..." -ForegroundColor Cyan
if (!(Test-Path "blacklist.json")) {
    "[]" | Out-File -Encoding UTF8 "blacklist.json"
    Write-Host "Creado blacklist.json" -ForegroundColor Green
}
if (!(Test-Path "banned_images.json")) {
    "[]" | Out-File -Encoding UTF8 "banned_images.json"
    Write-Host "Creado banned_images.json" -ForegroundColor Green
}
if (!(Test-Path "muted_users.json")) {
    "[]" | Out-File -Encoding UTF8 "muted_users.json"
    Write-Host "Creado muted_users.json" -ForegroundColor Green
}

Write-Host ""
Write-Host "Construyendo imagen Docker..." -ForegroundColor Cyan
docker-compose build

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR al construir la imagen" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Iniciando contenedor..." -ForegroundColor Cyan
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR al iniciar el contenedor" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Bot iniciado exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "Comandos utiles:" -ForegroundColor Yellow
Write-Host "  Ver logs:        docker-compose logs -f whatsapp-bot"
Write-Host "  Acceder consola: docker attach whatsapp-guardian-bot"
Write-Host "  Detener bot:     docker-compose down"
Write-Host "  Ver estado:      docker-compose ps"
Write-Host ""
Write-Host "Mostrando logs (Ctrl+C para salir)..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

Write-Host ""
docker-compose logs -f whatsapp-bot


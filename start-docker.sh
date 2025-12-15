#!/bin/bash

# Script de inicio rápido para WhatsApp Bot Guardián
# Uso: ./start-docker.sh

echo "🐳 Iniciando WhatsApp Bot Guardián en Docker..."
echo ""

# Verificar que Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker no está instalado"
    echo "📥 Instala Docker Desktop desde: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Verificar que Docker Compose está disponible
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: Docker Compose no está instalado"
    exit 1
fi

# Crear archivos JSON si no existen
echo "📁 Verificando archivos de datos..."
[ ! -f blacklist.json ] && echo "[]" > blacklist.json && echo "✅ Creado blacklist.json"
[ ! -f banned_images.json ] && echo "[]" > banned_images.json && echo "✅ Creado banned_images.json"
[ ! -f muted_users.json ] && echo "[]" > muted_users.json && echo "✅ Creado muted_users.json"

echo ""
echo "🔨 Construyendo imagen Docker..."
docker-compose build

if [ $? -ne 0 ]; then
    echo "❌ Error al construir la imagen"
    exit 1
fi

echo ""
echo "🚀 Iniciando contenedor..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "❌ Error al iniciar el contenedor"
    exit 1
fi

echo ""
echo "✅ Bot iniciado exitosamente!"
echo ""
echo "📋 Comandos útiles:"
echo "  Ver logs:        docker-compose logs -f whatsapp-bot"
echo "  Ver QR code:     docker-compose logs whatsapp-bot | grep -A 30 'QR'"
echo "  Acceder consola: docker attach whatsapp-guardian-bot"
echo "  Detener bot:     docker-compose down"
echo "  Ver estado:      docker-compose ps"
echo ""
echo "⏳ Esperando 5 segundos para mostrar logs..."
sleep 5

echo ""
echo "📜 Últimos logs (Ctrl+C para salir):"
docker-compose logs -f whatsapp-bot

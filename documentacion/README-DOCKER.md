# 🐳 WhatsApp Bot Guardián - Guía Docker

## 📦 Requisitos Previos

- **Docker Desktop** instalado en Windows
- **WSL2** habilitado (Docker lo requiere en Windows)
- Al menos **2GB de RAM** disponible para el contenedor
- Conexión a Internet estable

## 🚀 Instalación y Uso

### 1️⃣ Construir la imagen Docker

```bash
docker-compose build
```

Esto instalará:
- Node.js 22
- Chromium (para Puppeteer/WhatsApp Web)
- FFmpeg (procesamiento multimedia)
- Todas las dependencias npm

**Tiempo estimado:** 5-10 minutos en primera construcción

---

### 2️⃣ Iniciar el bot

```bash
docker-compose up
```

O en segundo plano:
```bash
docker-compose up -d
```

---

### 3️⃣ Autenticación con WhatsApp

**Primera vez:**

1. Espera a que aparezca el código QR en la terminal
2. Abre WhatsApp en tu teléfono
3. Ve a **Dispositivos vinculados** → **Vincular dispositivo**
4. Escanea el código QR

**Nota:** La sesión se guardará en `.wwebjs_auth/` y persistirá entre reinicios.

---

### 4️⃣ Ver logs

**Ver logs en tiempo real:**
```bash
docker-compose logs -f whatsapp-bot
```

**Ver últimas 100 líneas:**
```bash
docker-compose logs --tail=100 whatsapp-bot
```

---

### 5️⃣ Detener el bot

**Detener contenedor:**
```bash
docker-compose down
```

**Detener y eliminar volúmenes:**
```bash
docker-compose down -v
```

⚠️ **Advertencia:** `-v` eliminará la sesión de WhatsApp y todos los datos.

---

## 🎛️ Consola Interactiva

### Acceder a la consola del bot

```bash
docker attach whatsapp-guardian-bot
```

### Comandos disponibles dentro del contenedor:

```
BOT> chats                    # Listar chats
BOT> send 0 Mensaje          # Enviar mensaje
BOT> monitor 0               # Monitorear chat
BOT> broadcast Mensaje       # Broadcast
BOT> stats                   # Estadísticas
BOT> groups                  # Listar grupos
BOT> exit                    # Salir de consola
```

### Salir sin detener el bot:

Presiona: `Ctrl+P` luego `Ctrl+Q`

---

## 🔧 Comandos Útiles

### Ver estado del contenedor
```bash
docker-compose ps
```

### Reiniciar el bot
```bash
docker-compose restart
```

### Ver uso de recursos
```bash
docker stats whatsapp-guardian-bot
```

### Acceder al shell del contenedor
```bash
docker exec -it whatsapp-guardian-bot /bin/bash
```

### Ver archivos de datos dentro del contenedor
```bash
docker exec whatsapp-guardian-bot ls -la /app
```

---

## 📁 Archivos Persistentes

Los siguientes archivos/carpetas se mantienen entre reinicios:

| Archivo/Carpeta | Propósito |
|----------------|-----------|
| `.wwebjs_auth/` | Sesión de WhatsApp |
| `.wwebjs_cache/` | Caché de Puppeteer |
| `blacklist.json` | Palabras prohibidas |
| `banned_images.json` | Hashes de imágenes baneadas |
| `muted_users.json` | Usuarios silenciados |

**Ubicación en host:** `./` (directorio actual)  
**Ubicación en contenedor:** `/app/`

---

## 🐛 Solución de Problemas

### El QR no aparece

```bash
# Ver logs completos
docker-compose logs whatsapp-bot

# Reconstruir imagen
docker-compose build --no-cache
docker-compose up
```

### Error de autenticación

```bash
# Eliminar sesión y reintentar
rm -rf .wwebjs_auth .wwebjs_cache
docker-compose restart
```

### Bot no responde

```bash
# Verificar que el contenedor está corriendo
docker-compose ps

# Ver logs de errores
docker-compose logs --tail=50 whatsapp-bot

# Reiniciar
docker-compose restart
```

### Error de memoria

Aumenta la memoria asignada a Docker Desktop:
- Docker Desktop → Settings → Resources → Memory
- Recomendado: Mínimo 4GB

---

## 🔄 Actualizar el Bot

### Después de cambios en el código:

```bash
# 1. Detener el contenedor
docker-compose down

# 2. Reconstruir imagen
docker-compose build

# 3. Iniciar nuevamente
docker-compose up -d
```

---

## 🌐 Variables de Entorno

Configuradas en `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=production       # Modo producción
  - TZ=Europe/Madrid          # Zona horaria
  - PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
  - PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

---

## 📊 Monitoreo

### Ver métricas en tiempo real

```bash
docker stats whatsapp-guardian-bot
```

Muestra:
- **CPU %** - Uso de procesador
- **MEM USAGE / LIMIT** - Memoria usada/límite
- **NET I/O** - Red entrada/salida
- **BLOCK I/O** - Disco entrada/salida

---

## 🔐 Seguridad

### Recomendaciones:

1. ✅ **No compartir** la carpeta `.wwebjs_auth/`
2. ✅ **Backup regular** de archivos JSON de moderación
3. ✅ **Restringir acceso** al servidor Docker
4. ✅ **Actualizar** dependencias periódicamente

### Backup de datos:

```bash
# Crear backup
tar -czf whatsapp-bot-backup.tar.gz .wwebjs_auth .wwebjs_cache *.json

# Restaurar backup
tar -xzf whatsapp-bot-backup.tar.gz
```

---

## 🚀 Producción

### Ejecutar en segundo plano permanente:

```bash
docker-compose up -d --restart=unless-stopped
```

### Auto-restart en caso de fallo:

Ya configurado en `docker-compose.yml`:
```yaml
restart: unless-stopped
```

---

## 📝 Logs Persistentes

### Guardar logs en archivo:

```bash
docker-compose logs -f > bot-logs.txt
```

### Rotar logs automáticamente:

Agregar a `docker-compose.yml`:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

---

## 🔗 Enlaces Útiles

- **Documentación Docker:** https://docs.docker.com/
- **Docker Compose:** https://docs.docker.com/compose/
- **WhatsApp Web.js:** https://wwebjs.dev/
- **Documentación del Bot:** Ver `DOCUMENTACION.md`

---

## ❓ FAQ

**P: ¿Puedo ejecutar múltiples instancias?**  
R: Sí, pero necesitas números de WhatsApp diferentes y cambiar el nombre del contenedor.

**P: ¿Funciona en Linux/Mac?**  
R: Sí, Docker es multiplataforma. Los comandos son los mismos.

**P: ¿Cuánta RAM necesita?**  
R: Mínimo 1GB, recomendado 2GB para funcionamiento óptimo.

**P: ¿Se pueden hacer backups automáticos?**  
R: Sí, usa cron jobs o scripts programados para copiar los archivos JSON y carpetas de autenticación.

---

**Última actualización:** 15 de diciembre de 2025  
**Versión Docker:** 3.8  
**Imagen base:** node:22-bullseye

### Eliminar sesión de WhatsApp
```bash
docker-compose down
rm -rf wwebjs_auth wwebjs_cache
```

### Reconstruir desde cero
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up
```

## 📁 Archivos persistentes

Los siguientes datos se guardan en tu máquina (fuera del contenedor):
- `wwebjs_auth/` - Sesión de WhatsApp (para no escanear QR cada vez)
- `wwebjs_cache/` - Cache de WhatsApp Web
- `blacklist.json` - Lista de palabras bloqueadas

## ⚙️ Configuración

### Cambiar recursos del contenedor
Edita `docker-compose.yml` y agrega:
```yaml
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

### Ejecutar en segundo plano
```bash
docker-compose up -d
```

## 🐛 Solución de problemas

### El bot no se conecta
1. Verifica que Docker Desktop esté ejecutándose
2. Revisa los logs: `docker-compose logs -f`
3. Elimina la sesión y vuelve a escanear el QR

### Error de memoria
Aumenta la memoria asignada a Docker en Docker Desktop > Settings > Resources

### Actualizar el código
```bash
docker-compose down
docker-compose build
docker-compose up
```

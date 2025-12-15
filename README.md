# WhatsApp Bot Multi-Función

Bot de WhatsApp con detección NSFW, moderación, descarga de medios y consulta de buses TUS Santander.

## 🚀 Características

- ✅ Detección automática de contenido NSFW con TensorFlow.js
- 🚫 Sistema de moderación con baneos y silenciados
- 🎵 Descarga de audio de YouTube/Spotify
- 🎥 Descarga de videos de redes sociales (TikTok, Instagram, Twitter, YouTube)
- 🚌 Consulta en tiempo real del transporte público TUS Santander
- 📱 Comandos de utilidad (stickers, info del bot, etc.)

## 📋 Requisitos Previos

- **Node.js** v18 o superior
- **FFmpeg** instalado en el sistema
- **yt-dlp** instalado en el sistema
- Conexión a Internet estable

### Instalación de Dependencias del Sistema (Windows)

```powershell
# Instalar FFmpeg
winget install FFmpeg

# Instalar yt-dlp
winget install yt-dlp
```

### Instalación de Dependencias del Sistema (Linux/Mac)

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

# macOS
brew install ffmpeg yt-dlp
```

## 🛠️ Instalación

### Opción 1: Instalación Local

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/TU_USUARIO/whatsapp-bot.git
   cd whatsapp-bot
   ```

2. **Instalar dependencias de Node.js:**
   ```bash
   npm install
   ```

3. **Iniciar el bot:**
   ```bash
   npm start
   ```

4. **Escanear el código QR:**
   - Se generará un código QR en la terminal
   - Abre WhatsApp en tu móvil → Dispositivos vinculados → Vincular un dispositivo
   - Escanea el código QR mostrado en la terminal

### Opción 2: Instalación con Docker

Para instrucciones detalladas de Docker, consulta [README-DOCKER.md](README-DOCKER.md)

**Inicio rápido Docker:**

```bash
# Windows
.\start-docker.ps1

# Linux/Mac
./start-docker.sh
```

## 📖 Comandos Disponibles

### 🚌 Comandos TUS Santander

- `!bus paradas` - Lista todas las paradas de autobús disponibles
- `!bus lineas` - Muestra todas las líneas de autobús
- `!bus [número]` - Consulta tiempos de espera para una parada específica
  - Ejemplo: `!bus 315` muestra los próximos autobuses en la parada 315

### 🎵 Comandos de Música

- `!musica <URL>` - Descarga audio de YouTube/Spotify
  - Ejemplo: `!musica https://youtube.com/watch?v=...`
- `!spotify <URL>` - Descarga playlist de Spotify
  - Ejemplo: `!spotify https://open.spotify.com/playlist/...`

### 🎥 Comandos de Video

- `!video <URL>` - Descarga videos de TikTok, Instagram, Twitter, YouTube
  - Ejemplo: `!video https://tiktok.com/@user/video/...`

### 🛡️ Comandos de Moderación (Solo Admins)

- `!ban @usuario` - Banea a un usuario
- `!unban @usuario` - Desbanea a un usuario
- `!mute @usuario` - Silencia a un usuario
- `!unmute @usuario` - Quita el silencio a un usuario
- `!admins` - Lista los administradores del grupo
- `!info` - Muestra información del bot

### 🎨 Otros Comandos

- `!sticker` - Convierte imagen/video a sticker (responder a un mensaje con media)
- `!ping` - Verifica si el bot está activo

## 🔧 Configuración

### Archivos de Configuración

El bot genera automáticamente estos archivos JSON:

- **`blacklist.json`** - Lista de usuarios baneados
- **`muted_users.json`** - Lista de usuarios silenciados
- **`banned_images.json`** - Hashes de imágenes NSFW detectadas

Estos archivos persisten entre reinicios y se actualizan automáticamente.

### Persistencia de Sesión

La sesión de WhatsApp se guarda en:
- **Local:** `.wwebjs_auth/` y `.wwebjs_cache/`
- **Docker:** Montado como volúmenes persistentes

⚠️ **IMPORTANTE:** NO compartas estas carpetas, contienen tu sesión privada.

## 🐳 Docker

Para despliegue con Docker, el proyecto incluye:

- `Dockerfile` - Imagen optimizada con Chromium y FFmpeg
- `docker-compose.yml` - Orquestación con volúmenes persistentes
- `start-docker.ps1` / `start-docker.sh` - Scripts de inicio automático

Ver [README-DOCKER.md](README-DOCKER.md) para instrucciones completas.

## 📚 Documentación Técnica

Para información técnica detallada sobre arquitectura, APIs, seguridad y troubleshooting, consulta [DOCUMENTACION.md](DOCUMENTACION.md).

## 🔒 Seguridad y Privacidad

- ✅ Detección automática de contenido NSFW (sin moderación manual)
- ✅ Sistema de hashing para evitar re-escaneo de imágenes
- ✅ Archivos temporales eliminados después de 5 minutos
- ⚠️ **NO compartas** las carpetas `.wwebjs_auth/` o `.wwebjs_cache/`
- ⚠️ **NO subas a GitHub** archivos que contengan tu sesión de WhatsApp

## 🐛 Solución de Problemas

### El bot no responde

1. Verifica que FFmpeg y yt-dlp estén instalados:
   ```bash
   ffmpeg -version
   yt-dlp --version
   ```

2. Revisa los logs en la terminal

3. Reinicia el bot:
   ```bash
   # Ctrl+C para detener
   npm start
   ```

### Error al escanear QR

1. Elimina la sesión existente:
   ```bash
   # Windows
   Remove-Item -Recurse -Force .wwebjs_auth, .wwebjs_cache

   # Linux/Mac
   rm -rf .wwebjs_auth .wwebjs_cache
   ```

2. Reinicia el bot y escanea de nuevo

### Descarga de videos falla

- Actualiza yt-dlp a la última versión:
  ```bash
  # Windows
  winget upgrade yt-dlp

  # Linux/Mac
  yt-dlp -U
  ```

## 📄 Licencia

Este proyecto es de código abierto. Úsalo libremente bajo tu propia responsabilidad.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📞 Soporte

Para reportar bugs o solicitar features, abre un [Issue](https://github.com/TU_USUARIO/whatsapp-bot/issues) en GitHub.

---

**Nota:** Este bot es para uso personal/educativo. Respeta los términos de servicio de WhatsApp y las plataformas de terceros.

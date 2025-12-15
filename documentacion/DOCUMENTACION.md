# 📚 Documentación del Bot WhatsApp Guardián

## 📋 Índice
1. [Descripción General](#descripción-general)
2. [Requisitos](#requisitos)
3. [Instalación](#instalación)
4. [Arquitectura del Sistema](#arquitectura-del-sistema)
5. [Funcionalidades](#funcionalidades)
6. [Comandos Disponibles](#comandos-disponibles)
7. [APIs Utilizadas](#apis-utilizadas)
8. [Consola Interactiva](#consola-interactiva)
9. [Archivos de Datos](#archivos-de-datos)
10. [Dockerización](#dockerización)

---

## 📖 Descripción General

Bot de WhatsApp multifuncional con capacidades de:
- **Moderación automática**: Filtrado de contenido NSFW, palabras prohibidas, imágenes baneadas y usuarios muteados
- **Procesamiento multimedia**: Conversión de medios, creación de stickers, edición de imágenes y audio
- **Integración TUS Santander**: Información en tiempo real del transporte público de Santander
- **Consola administrativa**: Control del bot desde terminal con comandos interactivos

**Tecnologías principales:**
- Node.js con whatsapp-web.js v1.34.2
- TensorFlow.js + NSFWJS para detección de contenido
- FFmpeg para procesamiento multimedia
- Jimp para manipulación de imágenes
- Axios para consumo de APIs REST

---

## ⚙️ Requisitos

### Software necesario:
- **Node.js** 14 o superior
- **FFmpeg** (instalado vía winget)
- **yt-dlp** (instalado vía winget)
- **Chrome/Chromium** (para Puppeteer)

### Dependencias npm:
```json
{
  "whatsapp-web.js": "^1.34.2",
  "@tensorflow/tfjs-node": "^4.22.0",
  "nsfwjs": "^2.4.2",
  "fluent-ffmpeg": "^2.1.3",
  "jimp": "^0.22.8",
  "axios": "^1.6.2",
  "qrcode-terminal": "^0.12.0"
}
```

---

## 🚀 Instalación

### Instalación local:

```powershell
# 1. Instalar dependencias del sistema
winget install yt-dlp.yt-dlp
winget install Gyan.FFmpeg

# 2. Clonar/descargar el proyecto
cd C:\Users\tu_usuario\Desktop\ws

# 3. Instalar dependencias Node
npm install

# 4. Iniciar el bot
npm start
```

### Primera ejecución:
1. Escanea el código QR con WhatsApp en tu teléfono
2. El bot se autenticará y guardará la sesión en `.wwebjs_auth/`
3. La IA se cargará automáticamente (puede tardar ~30 segundos)

---

## 🏗️ Arquitectura del Sistema

### Estructura del código (index.js):

```
├── CONFIGURACIÓN (líneas 1-50)
│   ├── Importación de módulos
│   ├── Rutas de FFmpeg y yt-dlp
│   └── Inicialización de variables globales
│
├── FUNCIONES DE MODERACIÓN (líneas 51-250)
│   ├── Blacklist de palabras
│   ├── Perceptual hashing de imágenes
│   └── Sistema de usuarios muteados
│
├── FUNCIONES MULTIMEDIA (líneas 251-380)
│   ├── Procesamiento de audio
│   ├── Edición de imágenes
│   └── Creación de stickers
│
├── INTEGRACIÓN TUS SANTANDER (líneas 381-470)
│   ├── API de paradas y líneas
│   └── API de estimaciones en tiempo real
│
├── CONSOLA INTERACTIVA (líneas 471-650)
│   ├── Gestión de chats
│   ├── Monitoreo en tiempo real
│   └── Comandos administrativos
│
├── INICIALIZACIÓN WHATSAPP (líneas 651-850)
│   ├── Configuración de cliente
│   ├── Carga de IA (NSFWJS)
│   └── Event handlers
│
└── PROCESAMIENTO DE MENSAJES (líneas 851-1380)
    ├── Parser de comandos
    ├── Handlers por tipo de comando
    └── Verificaciones automáticas
```

---

## 🎯 Funcionalidades

### 1. **Moderación Automática con IA**

#### a) Filtro NSFW (TensorFlow + NSFWJS)
```javascript
// Detecta contenido pornográfico/hentai con >60% confianza
const predictions = await model.classify(imagen);
if (predictions.porn > 0.6 || predictions.hentai > 0.6) {
    await msg.delete(true); // Elimina mensaje
}
```

**Categorías detectadas:** Porn, Hentai, Sexy, Neutral, Drawing

#### b) Perceptual Hashing de Imágenes
```javascript
// Algoritmo:
// 1. Redimensiona imagen a 8x8 píxeles
// 2. Convierte a escala de grises
// 3. Calcula promedio de píxeles
// 4. Genera hash binario de 64 bits
// 5. Compara con Hamming distance (85% threshold)

Ejemplo de hash: "1010011100110101..." (64 caracteres)
```

**Almacenamiento:** `banned_images.json`

#### c) Blacklist de Palabras
- Lista de palabras prohibidas
- Comparación case-insensitive
- Eliminación automática del mensaje
- Almacenamiento: `blacklist.json`

#### d) Sistema de Muteo de Usuarios
```javascript
{
  "userId": "1234567890@c.us",
  "reason": "Spam repetido",
  "mutedAt": "2025-12-15T12:30:00.000Z"
}
```

**Comportamiento:** Elimina todos los mensajes del usuario automáticamente

---

### 2. **Procesamiento Multimedia**

#### a) Descarga de YouTube (yt-dlp)
```bash
# Comando interno ejecutado:
yt-dlp --extract-audio --audio-format mp3 --audio-quality 0 [URL] -o output.mp3
```

#### b) Manipulación de Audio (FFmpeg)
```javascript
// Velocidad (1x - 4x)
ffmpeg -i input.mp3 -filter:a "atempo=2.0" output.mp3

// Reversa
ffmpeg -i input.mp3 -af areverse output.mp3

// Extracción de video
ffmpeg -i video.mp4 -vn -acodec libmp3lame audio.mp3
```

#### c) Edición de Imágenes (Jimp)
```javascript
// Resize
image.resize(ancho, alto)

// Filtros
image.greyscale()        // Blanco y negro
image.blur(10)           // Desenfoque
image.sepia()           // Tono sepia
image.invert()          // Invertir colores

// Memes (texto superior/inferior)
image.print(font, x, y, texto)
```

---

### 3. **Integración TUS Santander**

#### APIs consumidas:

**a) Paradas de bus** (estático)
```
GET https://datos.santander.es/api/rest/datasets/paradas_bus.json
Campos: ayto:parada, ayto:numero
Cantidad: 462 paradas
```

**b) Líneas de bus** (estático)
```
GET https://datos.santander.es/api/rest/datasets/lineas_bus.json
Campos: dc:name, ayto:numero
Cantidad: 32 líneas
```

**c) Estimaciones en tiempo real**
```
GET http://datos.santander.es/api/datos/control_flotas_estimaciones.json

Respuesta:
{
  "ayto:paradaId": "11",
  "ayto:etiqLinea": "LC",
  "ayto:destino1": "INTERCAMBIADOR SARDINERO",
  "ayto:tiempo1": "679",  // segundos
  "ayto:destino2": "...",
  "ayto:tiempo2": "1579"
}

Cantidad: 983 estimaciones activas
```

**Conversión de tiempo:**
```javascript
const minutos = Math.floor(segundos / 60);
// 679 seg → 11 min
```

---

## 📱 Comandos Disponibles

### 🔒 Moderación

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| `!blacklist add [palabra]` | Añadir palabra prohibida | `!blacklist add spam` |
| `!blacklist list` | Ver palabras baneadas | - |
| `!blacklist remove [palabra]` | Quitar palabra | `!blacklist remove spam` |
| `!blacklist clear` | Limpiar lista completa | - |
| `!banimagen` | Banear imagen (responder) | Responde a imagen |
| `!banimagen list` | Ver imágenes baneadas | - |
| `!banimagen remove` | Quitar ban (responder) | Responde a imagen |
| `!banimagen clear` | Limpiar todas | - |
| `!mutear [razón]` | Silenciar usuario (responder) | `!mutear Spam` |
| `!mutear list` | Ver usuarios muteados | - |
| `!mutear unmute` | Desmutear (responder) | Responde a mensaje |
| `!mutear clear` | Limpiar lista | - |

### 🎵 Audio

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| `!ytmp3 [URL]` | Descargar audio de YouTube | `!ytmp3 https://youtu.be/...` |
| `!speed [1-4]` | Cambiar velocidad (responder) | `!speed 2` |
| `!reverse` | Invertir audio (responder) | Responde a audio |
| `!extractaudio` | Extraer audio de video (responder) | Responde a video |

### 🖼️ Imágenes

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| `!sticker` | Crear sticker (responder) | Responde a imagen/video |
| `!resize [ancho]x[alto]` | Redimensionar (responder) | `!resize 800x600` |
| `!grayscale` | Blanco y negro (responder) | Responde a imagen |
| `!meme texto1 \| texto2` | Crear meme (responder) | `!meme hola \| mundo` |
| `!filter [tipo]` | Aplicar filtro (responder) | `!filter blur` |

**Filtros disponibles:** blur, sepia, invert

### 🚌 TUS Santander

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| `!bus paradas` | Ver todas las paradas (462) | - |
| `!bus lineas` | Ver líneas disponibles (32) | - |
| `!bus [número]` | Próximos buses en tiempo real | `!bus 539` |

**Salida de `!bus 539`:**
```
🚌 PARADA 539 - Próximos buses:

🔢 Línea LC → INTERCAMBIADOR SARDINERO
⏱️ 11 min
🔢 Línea LC → INTERCAMBIADOR SARDINERO
⏱️ 26 min
```

### 👥 Grupo

| Comando | Descripción |
|---------|-------------|
| `!todos` | Mencionar a todos los miembros |
| `!ayuda` | Ver lista completa de comandos |

---

## 🎛️ Consola Interactiva

### Comandos de terminal:

```bash
BOT> chats                    # Listar todos los chats
BOT> send 0 Hola             # Enviar mensaje al chat #0
BOT> monitor 0               # Monitorear chat #0 en tiempo real
BOT> stop                    # Detener monitoreo
BOT> broadcast Mensaje       # Enviar a todos los chats (delay 2s)
BOT> stats                   # Ver estadísticas (mensajes/comandos)
BOT> groups                  # Listar solo grupos
BOT> leave 5                 # Salir del grupo #5
BOT> exit                    # Cerrar consola
```

### Funciones internas:

```javascript
const consola = {
    isMonitoring: boolean,
    log: function(mensaje),           // Imprime en consola
    incrementMessages: function(),    // Contador de mensajes
    incrementCommands: function()     // Contador de comandos
}
```

---

## 📦 Archivos de Datos

### Archivos JSON persistentes:

#### `blacklist.json`
```json
["palabra1", "palabra2", "palabra3"]
```

#### `banned_images.json`
```json
[
  "1010011100110101001011010010110100101101001011010010110100101101",
  "0101100011001010110100101101001011010010110100101101001011010010"
]
```

#### `muted_users.json`
```json
[
  {
    "userId": "1234567890@c.us",
    "reason": "Spam repetido",
    "mutedAt": "2025-12-15T12:30:00.000Z"
  }
]
```

### Directorios de sesión:

- `.wwebjs_auth/` - Sesión de WhatsApp (LocalAuth)
- `.wwebjs_cache/` - Caché de puppeteer/chromium

---

## 🐳 Dockerización

### Dockerfile
```dockerfile
FROM node:22-bullseye

# Dependencias de Chrome/Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libnss3 \
    ffmpeg

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

CMD ["node", "index.js"]
```

### docker-compose.yml
```yaml
version: '3.8'
services:
  whatsapp-bot:
    build: .
    volumes:
      - ./.wwebjs_auth:/app/.wwebjs_auth
      - ./.wwebjs_cache:/app/.wwebjs_cache
      - ./blacklist.json:/app/blacklist.json
      - ./banned_images.json:/app/banned_images.json
      - ./muted_users.json:/app/muted_users.json
    environment:
      - PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
      - PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

### Comandos Docker:

```bash
# Construir imagen
docker-compose build

# Iniciar bot
docker-compose up -d

# Ver logs (incluye QR)
docker-compose logs -f

# Detener bot
docker-compose down
```

---

## 🔧 Rutas de Ejecutables

### Windows (winget):

```javascript
const FFMPEG_PATH = 'C:\\Users\\javier.turcios\\AppData\\Local\\Microsoft\\WinGet\\Packages\\yt-dlp.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-N-121583-g4348bde2d2-win64-gpl\\bin\\ffmpeg.exe';

const YTDLP_PATH = 'C:\\Users\\javier.turcios\\AppData\\Local\\Microsoft\\WinGet\\Packages\\yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe\\yt-dlp.exe';
```

**⚠️ Nota:** Estas rutas son específicas de la instalación. Actualizar según tu sistema.

---

## 📊 Flujo de Procesamiento de Mensajes

```
Mensaje recibido
    ↓
¿Usuario muteado? → SÍ → Eliminar mensaje → FIN
    ↓ NO
¿Es ViewOnce? → SÍ → Eliminar mensaje → FIN
    ↓ NO
¿Tiene imagen? → SÍ → ¿Es NSFW? → SÍ → Eliminar → FIN
    ↓ NO              ↓ NO
¿Tiene imagen? → SÍ → ¿Está baneada? → SÍ → Eliminar → FIN
    ↓ NO              ↓ NO
¿Es comando? → SÍ → Procesar comando → Incrementar contador
    ↓ NO
¿Contiene palabra blacklist? → SÍ → Eliminar → FIN
    ↓ NO
Incrementar contador mensajes → FIN
```

---

## 🐛 Debugging y Logs

### Logs en consola:

```javascript
console.log(`[BLACKLIST] Mensaje bloqueado de ${userId} por: ${palabra}`);
console.log(`[NSFW] Imagen NSFW detectada de ${userId}`);
console.log(`[BAN] Imagen baneada detectada de ${userId}`);
console.error('Error obteniendo estimaciones:', error.message);
```

### Errores comunes:

| Error | Solución |
|-------|----------|
| `Cannot find module 'whatsapp-web.js'` | `npm install` |
| `FFmpeg not found` | Verificar `FFMPEG_PATH` |
| `Authentication failure` | Borrar `.wwebjs_auth/` y reautenticar |
| `API 404` | Verificar URLs de APIs TUS |

---

## 📈 Métricas del Sistema

- **Paradas TUS:** 462
- **Líneas TUS:** 32
- **Estimaciones activas:** ~983
- **Comandos totales:** 30+
- **Categorías:** 6 (Moderación, Audio, Imagen, TUS, Grupo, Sistema)

---

## 🔐 Seguridad

### Buenas prácticas implementadas:

1. ✅ **Validación de entrada** en todos los comandos
2. ✅ **Sanitización de rutas** de archivos
3. ✅ **Timeout en operaciones** multimedia (30s)
4. ✅ **Rate limiting** en broadcast (2s delay)
5. ✅ **Manejo de errores** con try-catch
6. ✅ **Logs de actividad** para auditoría

### Recomendaciones adicionales:

- 🔒 No compartir la carpeta `.wwebjs_auth/` (contiene sesión)
- 🔒 Usar variables de entorno para rutas sensibles
- 🔒 Implementar rate limiting por usuario
- 🔒 Revisar periódicamente archivos JSON de moderación

---

## 📝 Notas Técnicas

### Limitaciones conocidas:

1. **APIs TUS**: Algunas paradas pueden no tener estimaciones en tiempo real
2. **WhatsApp Web**: Requiere conexión activa del teléfono
3. **Procesamiento multimedia**: Limitado por recursos del servidor
4. **Perceptual hashing**: 85% threshold puede dar falsos positivos

### Optimizaciones futuras:

- [ ] Caché de resultados de APIs TUS
- [ ] Compresión de imágenes antes de enviar
- [ ] Base de datos para moderación (SQLite)
- [ ] Webhooks en lugar de polling
- [ ] Multilenguaje (i18n)

---

## 📞 Soporte y Contacto

- **Repositorio**: (agregar URL si aplica)
- **Issues**: Reportar bugs en GitHub
- **Documentación API TUS**: https://datos.santander.es/

---

## 📄 Licencia

(Agregar información de licencia según corresponda)

---

**Última actualización:** 15 de diciembre de 2025
**Versión del bot:** 1.0.0
**Autor:** (Agregar información del autor)

# 🚀 Guía de Inicio Rápido

Guía paso a paso para ejecutar el bot desde cero.

## 📦 Opción 1: Ejecución Local (Windows)

### Paso 1: Instalar Node.js

1. Descarga Node.js v18+ desde: https://nodejs.org/
2. Ejecuta el instalador y sigue las instrucciones
3. Verifica la instalación:
   ```powershell
   node --version
   npm --version
   ```

### Paso 2: Instalar FFmpeg y yt-dlp

Abre PowerShell como Administrador y ejecuta:

```powershell
# Instalar FFmpeg
winget install FFmpeg

# Instalar yt-dlp
winget install yt-dlp
```

Verifica que se instalaron correctamente:
```powershell
ffmpeg -version
yt-dlp --version
```

### Paso 3: Clonar/Descargar el Proyecto

**Si tienes Git instalado:**
```powershell
cd Desktop
git clone https://github.com/ulrjv/NOMBRE-DEL-REPO.git
cd NOMBRE-DEL-REPO
```

**Si NO tienes Git:**
1. Ve a https://github.com/ulrjv/NOMBRE-DEL-REPO
2. Click en "Code" → "Download ZIP"
3. Extrae el ZIP en tu escritorio
4. Abre PowerShell y navega a la carpeta:
   ```powershell
   cd Desktop\NOMBRE-DEL-REPO
   ```

### Paso 4: Instalar Dependencias

```powershell
npm install
```

Este comando instalará todas las librerías necesarias (~200MB, puede tardar 2-5 minutos).

### Paso 5: Iniciar el Bot

```powershell
npm start
```

### Paso 6: Escanear Código QR

1. Verás un código QR en la terminal
2. En tu móvil, abre WhatsApp
3. Ve a **Configuración** → **Dispositivos vinculados**
4. Toca **Vincular un dispositivo**
5. Escanea el código QR que aparece en la terminal

**¡Listo!** Verás el mensaje "✅ Bot Guardián ACTIVO y LISTO"

### Paso 7: Usar la Consola Interactiva

Después de que el bot esté listo, verás el prompt:
```
BOT>
```

Comandos disponibles:
- `chats` - Ver todos tus chats y grupos
- `send 0 Hola` - Enviar mensaje al chat número 0
- `groups` - Ver solo grupos
- `stats` - Ver estadísticas
- `exit` - Salir (el bot sigue corriendo)

### Paso 8: Probar el Bot

Envíate un mensaje de WhatsApp a ti mismo o a un grupo de prueba:
- `!ping` - El bot responderá "Pong!"
- `!bus paradas` - Mostrará las paradas de autobús
- `!help` - Lista de todos los comandos

---

## 🐳 Opción 2: Ejecución con Docker (Recomendado para Producción)

### Requisitos Previos

1. Instalar Docker Desktop desde: https://www.docker.com/products/docker-desktop/

### Paso 1: Descargar el Proyecto

Igual que en la Opción 1, Paso 3.

### Paso 2: Iniciar con el Script Automático

```powershell
cd Desktop\NOMBRE-DEL-REPO
.\start-docker.ps1
```

El script hará automáticamente:
- ✅ Verificar que Docker esté corriendo
- ✅ Crear archivos JSON necesarios
- ✅ Construir la imagen Docker
- ✅ Iniciar el contenedor

### Paso 3: Ver los Logs y Código QR

```powershell
docker-compose logs -f whatsapp-bot
```

Verás el código QR. Escanéalo con WhatsApp (igual que en la Opción 1, Paso 6).

**Para salir de los logs:** Presiona `Ctrl+C` (el bot sigue corriendo).

### Paso 4: Acceder a la Consola Interactiva

```powershell
docker attach whatsapp-guardian-bot
```

Verás el prompt `BOT>`. Usa los mismos comandos del Paso 7 de la Opción 1.

**Para salir:** Escribe `exit` o presiona `Ctrl+C`.

### Comandos Útiles Docker

```powershell
# Ver si está corriendo
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f whatsapp-bot

# Reiniciar el bot
docker-compose restart whatsapp-bot

# Detener el bot
docker-compose down

# Volver a iniciar
docker-compose up -d

# Ver estadísticas de recursos
docker stats whatsapp-guardian-bot

# Acceder a bash dentro del contenedor
docker-compose exec whatsapp-bot /bin/bash
```

---

## 🐛 Solución de Problemas Comunes

### ❌ "npm: command not found"
**Solución:** Node.js no está instalado. Vuelve al Paso 1.

### ❌ "ffmpeg: command not found"
**Solución:** FFmpeg no está instalado. Ejecuta:
```powershell
winget install FFmpeg
```
Luego cierra y abre de nuevo PowerShell.

### ❌ "Cannot find module 'whatsapp-web.js'"
**Solución:** No se instalaron las dependencias. Ejecuta:
```powershell
npm install
```

### ❌ Error al escanear QR / "Session not created"
**Solución 1:** Elimina la sesión anterior y reinicia:
```powershell
Remove-Item -Recurse -Force .wwebjs_auth, .wwebjs_cache
npm start
```

**Solución 2 (Docker):**
```powershell
docker-compose down
docker volume rm ws_wwebjs_auth ws_wwebjs_cache
docker-compose up -d
docker-compose logs -f whatsapp-bot
```

### ❌ "Docker is not running"
**Solución:** Abre Docker Desktop y espera a que inicie completamente (icono en la bandeja del sistema).

### ❌ El bot no responde a comandos
**Posibles causas:**
1. El mensaje no empieza con `!` (todos los comandos llevan `!`)
2. Estás en un grupo donde no eres admin (algunos comandos solo para admins)
3. El bot no ha cargado completamente (espera a ver "✅ Bot Guardián ACTIVO")

### ❌ "Address already in use" o "port is already allocated"
**Solución:** Ya hay un bot corriendo. Detén el anterior:
```powershell
# Si es local:
# Presiona Ctrl+C en la terminal donde corre

# Si es Docker:
docker-compose down
```

### ❌ Descargas de video fallan
**Solución:** Actualiza yt-dlp:
```powershell
# Windows
winget upgrade yt-dlp

# Linux
yt-dlp -U
```

---

## 📚 Siguientes Pasos

Una vez que el bot esté funcionando:

1. **Lee la documentación completa:** [DOCUMENTACION.md](DOCUMENTACION.md)
2. **Configura Docker para producción:** [README-DOCKER.md](README-DOCKER.md)
3. **Personaliza comandos:** Edita `index.js` según tus necesidades
4. **Administra moderación:** Usa `!ban`, `!mute`, etc. en tus grupos

---

## 🔒 Importante: Seguridad

⚠️ **NUNCA compartas estas carpetas:**
- `.wwebjs_auth/` - Contiene tu sesión de WhatsApp
- `.wwebjs_cache/` - Contiene datos temporales

Si subes el proyecto a GitHub, estas carpetas ya están excluidas en `.gitignore`.

---

## 💡 Consejo: Primera Ejecución

La primera vez que inicias el bot puede tardar más porque:
1. Descarga modelos de TensorFlow (~50MB)
2. Descarga dependencias de Chromium
3. Inicializa la sesión de WhatsApp

**Tiempo estimado primera ejecución:**
- Local: 3-5 minutos
- Docker: 5-10 minutos (incluye build de imagen)

---

## 🆘 ¿Necesitas Ayuda?

Si sigues teniendo problemas:

1. Revisa los logs completos:
   ```powershell
   # Local
   # Los verás en la terminal directamente

   # Docker
   docker-compose logs --tail=100 whatsapp-bot
   ```

2. Busca el error en [DOCUMENTACION.md](DOCUMENTACION.md) sección "Solución de Problemas"

3. Verifica que cumples todos los requisitos previos

4. Abre un Issue en GitHub con:
   - Tu sistema operativo y versión
   - Versión de Node.js (`node --version`)
   - El error completo que recibes
   - Los pasos que seguiste

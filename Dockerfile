# Usar imagen base de Node.js
FROM node:22-bullseye

# Instalar dependencias del sistema necesarias para Puppeteer y Chrome
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    ffmpeg \
    ca-certificates \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Instalar yt-dlp
RUN pip3 install --no-cache-dir --upgrade yt-dlp

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json (y package-lock.json si existe)
COPY package*.json ./

# --- CORRECCIÓN AQUÍ ---
# Cambiamos 'npm ci' por 'npm install' para que funcione sin lockfile
RUN npm install --only=production

# Copiar el resto de archivos
COPY index.js ./

# Crear directorios para persistencia
RUN mkdir -p /app/.wwebjs_auth /app/.wwebjs_cache

# Variables de entorno para Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

# Comando para ejecutar el bot
CMD ["node", "index.js"]
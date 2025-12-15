const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const tf = require('@tensorflow/tfjs');
const nsfw = require('nsfwjs');
const jpeg = require('jpeg-js');
const ffmpeg = require('fluent-ffmpeg');
const Jimp = require('jimp').default;
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const readline = require('readline');
const axios = require('axios');
const execFileAsync = promisify(execFile);

// Configurar ffmpeg
const ffmpegStatic = require('ffmpeg-static');

// Detectar si estamos en Windows y si existe la instalación de winget
let ffmpegPath = ffmpegStatic;
if (process.env.LOCALAPPDATA) {
    const ffmpegWinget = path.join(
        process.env.LOCALAPPDATA,
        'Microsoft',
        'WinGet',
        'Packages',
        'yt-dlp.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe',
        'ffmpeg-N-121583-g4348bde2d2-win64-gpl',
        'bin',
        'ffmpeg.exe'
    );
    
    if (fs.existsSync(ffmpegWinget)) {
        ffmpegPath = ffmpegWinget;
    }
}

// En Docker/Linux, intentar usar ffmpeg del sistema
if (process.platform === 'linux' && fs.existsSync('/usr/bin/ffmpeg')) {
    ffmpegPath = '/usr/bin/ffmpeg';
}

ffmpeg.setFfmpegPath(ffmpegPath);

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            // User agent realista para parecer navegador normal
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        headless: true
    }
});

let model;
let blacklist = [];
const BLACKLIST_FILE = './blacklist.json';
let bannedImageHashes = [];
const BANNED_IMAGES_FILE = './banned_images.json';
let mutedUsers = [];
const MUTED_USERS_FILE = './muted_users.json';

// Sistema de Rate Limiting para evitar detección como bot
const rateLimits = new Map(); // userId -> { lastCommand: timestamp, commandCount: number, downloadCount: number }
const RATE_LIMIT_WINDOW = 60000; // 1 minuto
const MAX_COMMANDS_PER_MINUTE = 5;
const MAX_DOWNLOADS_PER_HOUR = 10;
const MIN_RESPONSE_DELAY = 1500; // 1.5 segundos mínimo antes de responder
const MAX_RESPONSE_DELAY = 4000; // 4 segundos máximo (parecer humano)

// Cargar blacklist al iniciar
if (fs.existsSync(BLACKLIST_FILE)) {
    try {
        blacklist = JSON.parse(fs.readFileSync(BLACKLIST_FILE, 'utf-8'));
        console.log(`📋 Blacklist cargada: ${blacklist.length} palabras`);
    } catch (e) {
        console.log('Error cargando blacklist, iniciando vacía');
    }
}

// Cargar imágenes baneadas
if (fs.existsSync(BANNED_IMAGES_FILE)) {
    try {
        bannedImageHashes = JSON.parse(fs.readFileSync(BANNED_IMAGES_FILE, 'utf-8'));
        console.log(`🚫 Imágenes baneadas: ${bannedImageHashes.length}`);
    } catch (e) {
        console.log('Error cargando imágenes baneadas, iniciando vacía');
    }
}

// Cargar usuarios muteados
if (fs.existsSync(MUTED_USERS_FILE)) {
    try {
        mutedUsers = JSON.parse(fs.readFileSync(MUTED_USERS_FILE, 'utf-8'));
        console.log(`🔇 Usuarios muteados: ${mutedUsers.length}`);
    } catch (e) {
        console.log('Error cargando usuarios muteados, iniciando vacía');
    }
}

function guardarBlacklist() {
    fs.writeFileSync(BLACKLIST_FILE, JSON.stringify(blacklist, null, 2));
}

function guardarBannedImages() {
    fs.writeFileSync(BANNED_IMAGES_FILE, JSON.stringify(bannedImageHashes, null, 2));
}

function guardarMutedUsers() {
    fs.writeFileSync(MUTED_USERS_FILE, JSON.stringify(mutedUsers, null, 2));
}

function isUserMuted(userId) {
    return mutedUsers.some(muted => muted.userId === userId);
}

// Sistema anti-detección: Rate limiting y delays humanizados
function checkRateLimit(userId, isDownload = false) {
    const now = Date.now();
    const userLimit = rateLimits.get(userId) || { 
        lastCommand: 0, 
        commandCount: 0, 
        downloadCount: 0,
        lastDownload: 0 
    };
    
    // Resetear contador si pasó 1 minuto
    if (now - userLimit.lastCommand > RATE_LIMIT_WINDOW) {
        userLimit.commandCount = 0;
    }
    
    // Resetear descargas si pasó 1 hora
    if (now - userLimit.lastDownload > 3600000) {
        userLimit.downloadCount = 0;
    }
    
    // Verificar límites
    if (userLimit.commandCount >= MAX_COMMANDS_PER_MINUTE) {
        return { allowed: false, reason: 'Demasiados comandos. Espera un minuto.' };
    }
    
    if (isDownload && userLimit.downloadCount >= MAX_DOWNLOADS_PER_HOUR) {
        return { allowed: false, reason: 'Límite de descargas alcanzado. Espera una hora.' };
    }
    
    // Actualizar contadores
    userLimit.commandCount++;
    userLimit.lastCommand = now;
    if (isDownload) {
        userLimit.downloadCount++;
        userLimit.lastDownload = now;
    }
    rateLimits.set(userId, userLimit);
    
    return { allowed: true };
}

// Delay aleatorio para parecer humano (1.5 - 4 segundos)
async function humanDelay() {
    const delay = Math.floor(Math.random() * (MAX_RESPONSE_DELAY - MIN_RESPONSE_DELAY)) + MIN_RESPONSE_DELAY;
    await new Promise(resolve => setTimeout(resolve, delay));
}

// Simular "escribiendo..." por un tiempo aleatorio
async function simulateTyping(chat) {
    const typingTime = Math.floor(Math.random() * 2000) + 1000; // 1-3 segundos
    await chat.sendStateTyping();
    await new Promise(resolve => setTimeout(resolve, typingTime));
}

function verificarBlacklist(texto) {
    const textoLower = texto.toLowerCase();
    return blacklist.find(palabra => textoLower.includes(palabra.toLowerCase()));
}

// Función para generar hash perceptual de imagen usando IA
async function getImageHash(imageBuffer) {
    try {
        const image = await Jimp.read(imageBuffer);
        // Redimensionar a 8x8 para hash perceptual
        image.resize(8, 8).greyscale();
        
        const pixels = [];
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const pixel = Jimp.intToRGBA(image.getPixelColor(x, y));
                pixels.push(pixel.r);
            }
        }
        
        // Calcular promedio
        const avg = pixels.reduce((a, b) => a + b) / pixels.length;
        
        // Generar hash binario
        let hash = '';
        for (let pixel of pixels) {
            hash += pixel > avg ? '1' : '0';
        }
        
        return hash;
    } catch (e) {
        console.error('Error generando hash:', e);
        return null;
    }
}

// Calcular similitud entre dos hashes (distancia de Hamming)
function hashSimilarity(hash1, hash2) {
    if (!hash1 || !hash2 || hash1.length !== hash2.length) return 0;
    
    let differences = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) differences++;
    }
    
    // Retornar porcentaje de similitud
    return ((hash1.length - differences) / hash1.length) * 100;
}

// Verificar si imagen está baneada (tolerancia 85% de similitud)
async function isImageBanned(imageBuffer) {
    const hash = await getImageHash(imageBuffer);
    if (!hash) return false;
    
    for (let bannedHash of bannedImageHashes) {
        const similarity = hashSimilarity(hash, bannedHash);
        if (similarity >= 85) {
            return true;
        }
    }
    
    return false;
}

// --- Función auxiliar para convertir imagen a Tensor ---
async function imageToTensor(mediaData) {
    const imageBuffer = Buffer.from(mediaData, 'base64');
    const rawImageData = jpeg.decode(imageBuffer, { useTArray: true });
    const { width, height, data } = rawImageData;
    const tensor = tf.browser.fromPixels({ data, width, height });
    return tensor;
}

// --- UTILIDADES DE TEXTO ---

async function crearMeme(inputBuffer, textoArriba, textoAbajo) {
    try {
        const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
        const image = await Jimp.read(inputBuffer);
        
        if (textoArriba) {
            image.print(font, 10, 10, {
                text: textoArriba.toUpperCase(),
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                alignmentY: Jimp.VERTICAL_ALIGN_TOP
            }, image.bitmap.width - 20, image.bitmap.height);
        }
        
        if (textoAbajo) {
            image.print(font, 10, image.bitmap.height - 80, {
                text: textoAbajo.toUpperCase(),
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM
            }, image.bitmap.width - 20, 70);
        }
        
        return await image.png();
    } catch (e) {
        console.error('Error creando meme:', e);
        return null;
    }
}

// --- UTILIDADES DE AUDIO ---

async function descargarCancion(url) {
    try {
        if (!fs.existsSync('./descargas')) {
            fs.mkdirSync('./descargas', { recursive: true });
        }

        const timestamp = Date.now();
        const outputPath = path.resolve(`./descargas/audio_${timestamp}.mp3`);
        
        // Ruta completa de yt-dlp instalado por winget
        const ytdlpPath = path.join(
            process.env.LOCALAPPDATA, 
            'Microsoft', 
            'WinGet', 
            'Packages', 
            'yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe', 
            'yt-dlp.exe'
        );
        
        // Ruta de ffmpeg instalado por winget
        const ffmpegDir = path.join(
            process.env.LOCALAPPDATA,
            'Microsoft',
            'WinGet',
            'Packages',
            'yt-dlp.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe',
            'ffmpeg-N-121583-g4348bde2d2-win64-gpl',
            'bin'
        );
        
        const args = [
            '-x',
            '--audio-format', 'mp3',
            '--audio-quality', '128K',
            '--ffmpeg-location', ffmpegDir,
            '-o', outputPath,
            url
        ];
        
        await execFileAsync(ytdlpPath, args);
        
        if (fs.existsSync(outputPath)) {
            return { 
                archivo: outputPath, 
                titulo: path.basename(outputPath) 
            };
        }
        
        return null;
    } catch (e) {
        console.error('Error descargando canción:', e.message);
        return null;
    }
}

async function cambiarVelocidadAudio(inputBuffer, velocidad) {
    try {
        const inputFile = './temp_audio_speed.mp3';
        const outputFile = './temp_audio_speed_out.mp3';
        
        fs.writeFileSync(inputFile, inputBuffer);
        
        return new Promise((resolve, reject) => {
            ffmpeg(inputFile)
                .audioFilter(`atempo=${velocidad}`)
                .save(outputFile)
                .on('end', () => {
                    const buffer = fs.readFileSync(outputFile);
                    try { fs.unlinkSync(inputFile); } catch(e) {}
                    try { fs.unlinkSync(outputFile); } catch(e) {}
                    resolve(buffer);
                })
                .on('error', reject);
        });
    } catch (e) {
        console.error('Error modificando audio:', e);
        return null;
    }
}

async function invertirAudio(inputBuffer) {
    try {
        const inputFile = './temp_audio_reverse.mp3';
        const outputFile = './temp_audio_reverse_out.mp3';
        
        fs.writeFileSync(inputFile, inputBuffer);
        
        return new Promise((resolve, reject) => {
            ffmpeg(inputFile)
                .audioFilter('areverse')
                .save(outputFile)
                .on('end', () => {
                    const buffer = fs.readFileSync(outputFile);
                    try { fs.unlinkSync(inputFile); } catch(e) {}
                    try { fs.unlinkSync(outputFile); } catch(e) {}
                    resolve(buffer);
                })
                .on('error', reject);
        });
    } catch (e) {
        console.error('Error invirtiendo audio:', e);
        return null;
    }
}

async function extraerAudioDeVideo(inputBuffer) {
    try {
        const inputFile = './temp_video.mp4';
        const outputFile = './temp_audio_extracted.mp3';
        
        fs.writeFileSync(inputFile, inputBuffer);
        
        return new Promise((resolve, reject) => {
            ffmpeg(inputFile)
                .noVideo()
                .audioCodec('libmp3lame')
                .audioBitrate(128)
                .toFormat('mp3')
                .save(outputFile)
                .on('end', () => {
                    const buffer = fs.readFileSync(outputFile);
                    try { fs.unlinkSync(inputFile); } catch(e) {}
                    try { fs.unlinkSync(outputFile); } catch(e) {}
                    resolve(buffer);
                })
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                    reject(err);
                });
        });
    } catch (e) {
        console.error('Error extrayendo audio:', e);
        return null;
    }
}

// --- UTILIDADES DE IMAGEN ---

async function redimensionarImagen(inputBuffer, ancho, alto) {
    try {
        const image = await Jimp.read(inputBuffer);
        const resized = await image.resize({ width: parseInt(ancho), height: parseInt(alto) });
        return await resized.png();
    } catch (e) {
        console.error('Error redimensionando:', e);
        return null;
    }
}

async function imagenAEscalaGrises(inputBuffer) {
    try {
        const image = await Jimp.read(inputBuffer);
        const bw = await image.greyscale();
        return await bw.png();
    } catch (e) {
        console.error('Error convirtiendo:', e);
        return null;
    }
}

async function filtroImagen(inputBuffer, tipo) {
    try {
        const image = await Jimp.read(inputBuffer);
        
        switch(tipo.toLowerCase()) {
            case 'blur':
                return await image.blur(10).png();
            case 'sepia':
                return await image.sepia().png();
            case 'contrast':
                return await image.contrast(0.8).png();
            case 'brightness':
                return await image.brightness(0.5).png();
            case 'invert':
                return await image.invert().png();
            default:
                return inputBuffer;
        }
    } catch (e) {
        console.error('Error aplicando filtro:', e);
        return inputBuffer;
    }
}

async function iniciarBot() {
    console.log("Cargando cerebro de Inteligencia Artificial...");
    model = await nsfw.load(); 
    console.log("¡IA Cargada! Iniciando WhatsApp...");
    client.initialize();
}

// --- FUNCIONES API TUS SANTANDER ---

async function getBusParadas() {
    try {
        const response = await axios.get('https://datos.santander.es/api/rest/datasets/paradas_bus.json');
        return response.data.resources;
    } catch (e) {
        console.error('Error obteniendo paradas:', e);
        return null;
    }
}

async function getBusLineas() {
    try {
        const response = await axios.get('https://datos.santander.es/api/rest/datasets/lineas_bus.json');
        return response.data.resources;
    } catch (e) {
        console.error('Error obteniendo líneas:', e);
        return null;
    }
}

async function getTiemposEstimados(paradaId) {
    try {
        const response = await axios.get('http://datos.santander.es/api/datos/control_flotas_estimaciones.json');
        
        // Verificar estructura de respuesta
        let estimaciones = response.data;
        if (response.data.resources) {
            estimaciones = response.data.resources;
        }
        
        if (!Array.isArray(estimaciones)) {
            console.error('Respuesta inesperada de API estimaciones:', typeof estimaciones);
            return null;
        }
        
        // Filtrar por número de parada (campo ayto:paradaId)
        const tiemposParada = estimaciones.filter(e => 
            e['ayto:paradaId'] && e['ayto:paradaId'].toString() === paradaId.toString()
        );
        
        return tiemposParada;
    } catch (e) {
        console.error('Error obteniendo estimaciones:', e.message);
        return null;
    }
}

async function getPosicionBuses() {
    try {
        // API no disponible - devuelve null directamente
        console.log('API de posiciones no disponible');
        return null;
    } catch (e) {
        console.error('Error obteniendo posiciones:', e.message);
        return null;
    }
}

async function getHorariosParada(paradaId) {
    try {
        const response = await axios.get('http://datos.santander.es/api/rest/datasets/programacionTUS_horariosLineas.json?items=1000');
        
        let horarios = response.data.resources;
        
        if (!Array.isArray(horarios)) {
            console.error('Respuesta inesperada de API horarios:', typeof horarios);
            return null;
        }
        
        // Filtrar por idParada
        const horariosParada = horarios.filter(h => 
            h['ayto:idParada'] && h['ayto:idParada'].toString() === paradaId.toString()
        );
        
        return horariosParada;
    } catch (e) {
        console.error('Error obteniendo horarios:', e.message);
        return null;
    }
}



// --- INTERFAZ DE CONSOLA ---
function iniciarConsolaInteractiva() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'BOT> '
    });

    console.log('\n📱 Consola interactiva activada. Comandos disponibles:');
    console.log('  chats - Listar chats y grupos disponibles');
    console.log('  send [ID] [mensaje] - Enviar mensaje a chat o grupo');
    console.log('  monitor [ID] - Monitorear mensajes de un chat en tiempo real');
    console.log('  stop - Detener monitoreo actual');
    console.log('  stats - Ver estadísticas del bot');
    console.log('  groups - Listar solo grupos');
    console.log('  leave [ID] - Salir de un grupo');
    console.log('  Ejemplo: send 0 Hola desde consola (usar el número de la lista)');
    console.log('  exit - Salir');
    console.log('\n⚠️  Nota: "broadcast" deshabilitado por riesgo de ban\n');

    let chatsList = [];
    let monitoringChatId = null;
    let messageCount = 0;
    let commandCount = 0;

    rl.prompt();

    rl.on('line', async (line) => {
        const input = line.trim();
        
        if (input === 'exit') {
            console.log('Cerrando consola...');
            rl.close();
            return;
        }

        if (input === 'stop') {
            if (monitoringChatId) {
                monitoringChatId = null;
                console.log('⏹️  Monitoreo detenido');
            } else {
                console.log('⚠️  No hay monitoreo activo');
            }
        } else if (input === 'stats') {
            console.log('\n📊 ESTADÍSTICAS DEL BOT');
            console.log(`  Mensajes procesados: ${messageCount}`);
            console.log(`  Comandos ejecutados: ${commandCount}`);
            console.log(`  Chats cargados: ${chatsList.length}`);
            console.log(`  Blacklist: ${blacklist.length} palabras`);
            console.log(`  Monitoreo: ${monitoringChatId ? 'Activo' : 'Inactivo'}\n`);
        } else if (input === 'groups') {
            try {
                const chats = await client.getChats();
                const groups = chats.filter(chat => chat.isGroup);
                chatsList = chats;
                console.log(`\n👥 GRUPOS (${groups.length}):`);
                groups.forEach((group, index) => {
                    const monitoring = monitoringChatId === group.id._serialized ? ' [MONITOREANDO]' : '';
                    console.log(`  [${chats.indexOf(group)}] ${group.name}${monitoring}`);
                    console.log(`      Participantes: ${group.participants.length}`);
                });
                console.log('');
            } catch (e) {
                console.log('❌ Error obteniendo grupos:', e.message);
            }
        } else if (input.startsWith('leave ')) {
            const chatIdOrIndex = input.substring(6).trim();
            
            if (!chatIdOrIndex) {
                console.log('❌ Uso: leave [número|ID]');
            } else {
                try {
                    let chatId;
                    
                    if (!isNaN(chatIdOrIndex)) {
                        const index = parseInt(chatIdOrIndex);
                        if (chatsList[index]) {
                            chatId = chatsList[index].id._serialized;
                        } else {
                            console.log('❌ Índice inválido. Usa "groups" para ver la lista');
                            rl.prompt();
                            return;
                        }
                    } else {
                        chatId = chatIdOrIndex;
                    }
                    
                    const chat = await client.getChatById(chatId);
                    if (chat.isGroup) {
                        await chat.leave();
                        console.log(`✅ Saliste del grupo: ${chat.name}`);
                    } else {
                        console.log('❌ Solo puedes salir de grupos');
                    }
                } catch (e) {
                    console.log('❌ Error saliendo del grupo:', e.message);
                }
            }
        } else if (input.startsWith('broadcast ')) {
            const mensaje = input.substring(10).trim();
            
            if (!mensaje) {
                console.log('❌ Uso: broadcast [mensaje]');
            } else {
                console.log('⚠️  ADVERTENCIA: broadcast puede ser detectado como spam por WhatsApp');
                console.log('⚠️  Esto aumenta el riesgo de ban. ¿Continuar? (escribe "si" para confirmar)');
                
                // No implementar confirmación automática para evitar uso accidental
                console.log('❌ Comando deshabilitado por seguridad. Usa "send" individualmente.');
                console.log('💡 Alternativa: Crea un grupo y envía el mensaje ahí.');
            }
        } else if (input === 'chats') {
            try {
                const chats = await client.getChats();
                chatsList = chats;
                console.log('\n📋 CHATS DISPONIBLES:');
                chats.forEach((chat, index) => {
                    const tipo = chat.isGroup ? '👥 GRUPO' : '💬 CHAT';
                    const monitoring = monitoringChatId === chat.id._serialized ? ' [MONITOREANDO]' : '';
                    console.log(`  [${index}] ${tipo}: ${chat.name || 'Sin nombre'}${monitoring}`);
                    console.log(`      ID: ${chat.id._serialized}`);
                });
                console.log('');
            } catch (e) {
                console.log('❌ Error obteniendo chats:', e.message);
            }
        } else if (input.startsWith('monitor ')) {
            const chatIdOrIndex = input.substring(8).trim();
            
            if (!chatIdOrIndex) {
                console.log('❌ Uso: monitor [número|ID]');
            } else {
                try {
                    let chatId;
                    
                    if (!isNaN(chatIdOrIndex)) {
                        const index = parseInt(chatIdOrIndex);
                        if (chatsList[index]) {
                            chatId = chatsList[index].id._serialized;
                        } else {
                            console.log('❌ Índice inválido. Usa "chats" para ver la lista');
                            rl.prompt();
                            return;
                        }
                    } else {
                        chatId = chatIdOrIndex;
                    }
                    
                    const chat = await client.getChatById(chatId);
                    monitoringChatId = chatId;
                    console.log(`👁️  Monitoreando: ${chat.name || chatId}`);
                    console.log('💡 Usa "stop" para detener el monitoreo\n');
                } catch (e) {
                    console.log('❌ Error iniciando monitoreo:', e.message);
                }
            }
        } else if (input.startsWith('send ')) {
            const parts = input.substring(5).split(' ');
            const chatIdOrIndex = parts[0];
            const mensaje = parts.slice(1).join(' ');

            if (!chatIdOrIndex || !mensaje) {
                console.log('❌ Uso: send [número|ID] [mensaje]');
            } else {
                try {
                    let chatId;
                    
                    if (!isNaN(chatIdOrIndex)) {
                        const index = parseInt(chatIdOrIndex);
                        if (chatsList[index]) {
                            chatId = chatsList[index].id._serialized;
                        } else {
                            console.log('❌ Índice inválido. Usa "chats" para ver la lista');
                            rl.prompt();
                            return;
                        }
                    } else {
                        chatId = chatIdOrIndex;
                    }
                    
                    await client.sendMessage(chatId, mensaje);
                    console.log('✅ Mensaje enviado');
                } catch (e) {
                    console.log('❌ Error enviando mensaje:', e.message);
                }
            }
        } else if (input) {
            console.log('❌ Comando no reconocido. Usa "chats", "send", "monitor", "stop", "broadcast", "stats", "groups", "leave" o "exit"');
        }

        rl.prompt();
    });

    rl.on('close', () => {
        console.log('\n👋 Consola cerrada. Bot sigue activo.');
    });

    // Retornar función para verificar si un chat está siendo monitoreado
    return {
        isMonitoring: (chatId) => monitoringChatId === chatId,
        log: (message) => {
            console.log(message);
            rl.prompt();
        },
        incrementMessages: () => messageCount++,
        incrementCommands: () => commandCount++
    };
}

let consolaMonitor = null;

// Estadísticas de uso para auto-regulación
let sessionStats = {
    startTime: Date.now(),
    totalCommands: 0,
    totalDownloads: 0,
    lastActivity: Date.now()
};

// Auto-regulación: Advertir si uso excesivo
setInterval(() => {
    const horasActivo = (Date.now() - sessionStats.startTime) / 3600000;
    
    if (horasActivo > 12) {
        console.log('\n⚠️  ADVERTENCIA: Bot activo por más de 12 horas');
        console.log('⚠️  Recomendación: Reinicia el bot para evitar detección');
        console.log(`📊 Comandos totales: ${sessionStats.totalCommands}`);
        console.log(`📥 Descargas totales: ${sessionStats.totalDownloads}\n`);
    }
    
    if (sessionStats.totalDownloads > 50) {
        console.log('\n⚠️  ADVERTENCIA: Más de 50 descargas realizadas');
        console.log('⚠️  Alto riesgo de detección. Considera reiniciar.\n');
    }
}, 3600000); // Verificar cada hora

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('ESCANEA EL QR AHORA');
});

client.on('ready', () => {
    console.log('✅ Bot Guardián ACTIVO y LISTO.');
    console.log('🛡️  Sistema anti-detección activado:');
    console.log('   - Rate limiting: 5 comandos/min, 10 descargas/hora');
    console.log('   - Delays humanizados: 1.5-4 segundos');
    console.log('   - Typing simulation activado');
    console.log('   - Broadcast deshabilitado\n');
    sessionStats.startTime = Date.now();
    consolaMonitor = iniciarConsolaInteractiva();
});
client.on('message', async (msg) => {
    try {
        // Incrementar contador de mensajes
        if (consolaMonitor) consolaMonitor.incrementMessages();

        // Monitoreo de chat específico
        if (consolaMonitor && consolaMonitor.isMonitoring(msg.from)) {
            const tipo = msg.hasMedia ? '📎 [Media]' : '';
            consolaMonitor.log(`\n📨 ${msg.from}: ${msg.body} ${tipo}`);
        }

        if (msg.fromMe) return;

        // Verificar si el usuario está muteado
        if (isUserMuted(msg.author || msg.from)) {
            console.log(`[MUTED] Mensaje eliminado de usuario muteado: ${msg.author || msg.from}`);
            try {
                await msg.delete(true);
            } catch (e) {
                console.log("Error borrando mensaje de usuario muteado", e);
            }
            return;
        }

        const comando = msg.body.split(' ')[0];
        const args = msg.body.split(' ').slice(1);
        const userId = msg.author || msg.from;

        // Solo aplicar rate limiting y delays a comandos (que empiecen con !)
        if (comando.startsWith('!')) {
            // Incrementar contador de comandos
            if (consolaMonitor) consolaMonitor.incrementCommands();
            sessionStats.totalCommands++;
            sessionStats.lastActivity = Date.now();
            
            // Verificar rate limiting
            const isDownloadCommand = ['!musica', '!spotify', '!video', '!ytmp3', '!tiktok', '!insta', '!tw'].includes(comando);
            const rateCheck = checkRateLimit(userId, isDownloadCommand);
            
            if (!rateCheck.allowed) {
                await humanDelay(); // Delay incluso para rechazos
                msg.reply(`⏱️ ${rateCheck.reason}`);
                return;
            }
            
            // Incrementar descargas si es comando de descarga
            if (isDownloadCommand) {
                sessionStats.totalDownloads++;
            }
            
            // Delay humanizado antes de responder (1.5-4 segundos aleatorio)
            await humanDelay();
            
            // Simular "escribiendo..." para comandos largos
            if (isDownloadCommand) {
                const chat = await msg.getChat();
                await simulateTyping(chat);
            }
        }

        // --- COMANDOS DE AUDIO ---

        if (comando === '!ytmp3') {
            const url = args.join(' ');
            if (!url.includes('youtube') && !url.includes('youtu.be')) {
                msg.reply('❌ Por favor envía un enlace de YouTube válido');
                return;
            }
            
            msg.reply('⏳ Descargando canción...');
            try {
                const resultado = await descargarCancion(url);
                if (resultado && fs.existsSync(resultado.archivo)) {
                    const media = MessageMedia.fromFilePath(resultado.archivo);
                    await msg.reply(media);
                    fs.unlinkSync(resultado.archivo);
                } else {
                    msg.reply('❌ Error al descargar la canción');
                }
            } catch (e) {
                msg.reply('❌ Error: ' + e.message);
            }
        }

        if (comando === '!speed' && args.length === 1) {
            const velocidad = args[0];
            const quotedMsg = await msg.getQuotedMessage();
            
            if (!quotedMsg || !quotedMsg.hasMedia) {
                msg.reply('❌ Por favor responde a un audio con !speed 1.5');
                return;
            }
            
            msg.reply('⏳ Modificando velocidad...');
            try {
                const media = await quotedMsg.downloadMedia();
                const mimeType = media?.mimetype || media?.mime;
                if (media && (mimeType.includes('audio') || mimeType.includes('mp3'))) {
                    const buffer = Buffer.from(media.data, 'base64');
                    const resultado = await cambiarVelocidadAudio(buffer, velocidad);
                    if (resultado) {
                        const newMedia = new MessageMedia('audio/mpeg', resultado.toString('base64'));
                        await msg.reply(newMedia);
                    }
                }
            } catch (e) {
                msg.reply('❌ Error procesando audio');
            }
        }

            if (comando === '!reverse') {
            const quotedMsg = await msg.getQuotedMessage();
            
            if (!quotedMsg || !quotedMsg.hasMedia) {
                msg.reply('❌ Por favor responde a un audio con !reverse');
                return;
            }
            
            msg.reply('⏳ Invirtiendo audio...');
            try {
                const media = await quotedMsg.downloadMedia();
                const mimeType = media?.mimetype || media?.mime;
                if (media && (mimeType.includes('audio') || mimeType.includes('mp3'))) {
                    const buffer = Buffer.from(media.data, 'base64');
                    const resultado = await invertirAudio(buffer);
                    if (resultado) {
                        const newMedia = new MessageMedia('audio/mpeg', resultado.toString('base64'));
                        await msg.reply(newMedia);
                    }
                }
            } catch (e) {
                msg.reply('❌ Error procesando audio');
            }
        }

        if (comando === '!extractaudio') {
            try {
                let quotedMsg = await msg.getQuotedMessage();
                
                if (!quotedMsg || !quotedMsg.hasMedia) {
                    msg.reply('❌ Por favor responde a un video con !extractaudio');
                    return;
                }
                
                if (quotedMsg.type !== 'video' && quotedMsg.type !== 'ptt') {
                    msg.reply('❌ Solo funciona con videos. Tipo detectado: ' + quotedMsg.type);
                    return;
                }
                
                msg.reply('⏳ Descargando video... esto puede tardar un momento');
                
                // Aumentar timeout para videos grandes
                const media = await quotedMsg.downloadMedia().catch(err => {
                    console.error('Error descargando media:', err);
                    return null;
                });
                
                if (!media || !media.data) {
                    msg.reply('❌ No se pudo descargar el video. Puede ser demasiado grande o estar en formato no soportado.');
                    return;
                }
                
                msg.reply('⏳ Extrayendo audio del video...');
                
                const buffer = Buffer.from(media.data, 'base64');
                const resultado = await extraerAudioDeVideo(buffer);
                
                if (resultado) {
                    const newMedia = new MessageMedia('audio/mpeg', resultado.toString('base64'));
                    await msg.reply(newMedia);
                } else {
                    msg.reply('❌ Error procesando el video');
                }
            } catch (e) {
                console.error('Error en extractaudio:', e);
                msg.reply('❌ Error extrayendo audio: ' + e.message);
            }
        }

        // --- COMANDOS DE IMAGEN ---

        if (comando === '!resize' && args.length === 2) {
            const quotedMsg = await msg.getQuotedMessage();
            
            if (!quotedMsg || !quotedMsg.hasMedia) {
                msg.reply('❌ Por favor responde a una imagen con !resize 512 512');
                return;
            }
            
            msg.reply('⏳ Redimensionando imagen...');
            try {
                const media = await quotedMsg.downloadMedia();
                const mimeType = media?.mimetype || media?.mime;
                if (media && mimeType && mimeType.includes('image')) {
                    const buffer = Buffer.from(media.data, 'base64');
                    const resultado = await redimensionarImagen(buffer, args[0], args[1]);
                    if (resultado) {
                        const newMedia = new MessageMedia('image/png', resultado.toString('base64'));
                        await msg.reply(newMedia);
                    }
                }
            } catch (e) {
                msg.reply('❌ Error redimensionando imagen');
            }
        }

        if (comando === '!grayscale') {
            const quotedMsg = await msg.getQuotedMessage();
            
            if (!quotedMsg || !quotedMsg.hasMedia) {
                msg.reply('❌ Por favor responde a una imagen con !grayscale');
                return;
            }
            
            msg.reply('⏳ Convirtiendo a escala de grises...');
            try {
                const media = await quotedMsg.downloadMedia();
                const mimeType = media?.mimetype || media?.mime;
                if (media && mimeType && mimeType.includes('image')) {
                    const buffer = Buffer.from(media.data, 'base64');
                    const resultado = await imagenAEscalaGrises(buffer);
                    if (resultado) {
                        const newMedia = new MessageMedia('image/png', resultado.toString('base64'));
                        await msg.reply(newMedia);
                    }
                }
            } catch (e) {
                msg.reply('❌ Error convirtiendo imagen');
            }
        }

        if (comando === '!filter' && args.length === 1) {
            const quotedMsg = await msg.getQuotedMessage();
            
            if (!quotedMsg || !quotedMsg.hasMedia) {
                msg.reply('❌ Por favor responde a una imagen con !filter blur');
                return;
            }
            
            msg.reply('⏳ Aplicando filtro...');
            try {
                const media = await quotedMsg.downloadMedia();
                const mimeType = media?.mimetype || media?.mime;
                if (media && mimeType && mimeType.includes('image')) {
                    const buffer = Buffer.from(media.data, 'base64');
                    const resultado = await filtroImagen(buffer, args[0]);
                    if (resultado) {
                        const newMedia = new MessageMedia('image/png', resultado.toString('base64'));
                        await msg.reply(newMedia);
                    }
                }
            } catch (e) {
                msg.reply('❌ Error aplicando filtro');
            }
        }

        // --- COMANDOS DE BLACKLIST ---

        if (comando === '!blacklist') {
            if (args.length === 0) {
                if (blacklist.length === 0) {
                    msg.reply('📋 La blacklist está vacía');
                } else {
                    msg.reply(`📋 *BLACKLIST* (${blacklist.length} palabras):\n${blacklist.join(', ')}`);
                }
            } else if (args[0] === 'add' && args.length >= 2) {
                const palabra = args.slice(1).join(' ');
                if (!blacklist.includes(palabra)) {
                    blacklist.push(palabra);
                    guardarBlacklist();
                    msg.reply(`✅ "${palabra}" agregada a la blacklist`);
                } else {
                    msg.reply(`❌ "${palabra}" ya está en la blacklist`);
                }
            } else if (args[0] === 'remove' && args.length >= 2) {
                const palabra = args.slice(1).join(' ');
                const index = blacklist.indexOf(palabra);
                if (index !== -1) {
                    blacklist.splice(index, 1);
                    guardarBlacklist();
                    msg.reply(`✅ "${palabra}" eliminada de la blacklist`);
                } else {
                    msg.reply(`❌ "${palabra}" no está en la blacklist`);
                }
            } else if (args[0] === 'clear') {
                blacklist = [];
                guardarBlacklist();
                msg.reply('✅ Blacklist limpiada');
            }
        }

        // --- COMANDO PARA BANEAR IMÁGENES ---

        if (comando === '!banimagen') {
            // Subcomandos que no requieren imagen citada
            if (args[0] === 'list') {
                if (bannedImageHashes.length === 0) {
                    msg.reply('📋 No hay imágenes baneadas');
                } else {
                    msg.reply(`🚫 *IMÁGENES BANEADAS* (${bannedImageHashes.length}):\n\nUsa !banimagen remove [número] para eliminar`);
                }
                return;
            }

            if (args[0] === 'clear') {
                bannedImageHashes = [];
                guardarBannedImages();
                msg.reply('✅ Lista de imágenes baneadas limpiada');
                return;
            }

            if (args[0] === 'remove' && args.length === 2) {
                const index = parseInt(args[1]);
                if (index >= 0 && index < bannedImageHashes.length) {
                    bannedImageHashes.splice(index, 1);
                    guardarBannedImages();
                    msg.reply(`✅ Imagen #${index} eliminada de la lista de baneadas`);
                } else {
                    msg.reply('❌ Índice inválido');
                }
                return;
            }

            // Para banear imagen, requiere responder a una imagen
            const quotedMsg = await msg.getQuotedMessage();
            
            if (!quotedMsg || !quotedMsg.hasMedia) {
                msg.reply('❌ Responde a una imagen con !banimagen para banearla\n\nComandos:\n!banimagen list - Ver todas\n!banimagen remove [#] - Eliminar\n!banimagen clear - Limpiar todo');
                return;
            }

            msg.reply('⏳ Procesando imagen...');
            try {
                const media = await quotedMsg.downloadMedia();
                const mimeType = media?.mimetype || media?.mime;
                
                if (media && mimeType && mimeType.includes('image')) {
                    const buffer = Buffer.from(media.data, 'base64');
                    const hash = await getImageHash(buffer);
                    
                    if (hash) {
                        bannedImageHashes.push(hash);
                        guardarBannedImages();
                        msg.reply(`✅ Imagen baneada (#${bannedImageHashes.length - 1})\n\nCualquier imagen similar será eliminada automáticamente.\n\nComandos:\n!banimagen list - Ver todas\n!banimagen remove [#] - Eliminar\n!banimagen clear - Limpiar todo`);
                    } else {
                        msg.reply('❌ Error procesando imagen');
                    }
                } else {
                    msg.reply('❌ Solo se pueden banear imágenes');
                }
            } catch (e) {
                msg.reply('❌ Error baneando imagen');
                console.error('Error en banimagen:', e);
            }
        }

        // --- COMANDO PARA MUTEAR USUARIOS ---

        if (comando === '!mutear') {
            const quotedMsg = await msg.getQuotedMessage();
            
            if (!quotedMsg) {
                msg.reply('❌ Responde al mensaje de alguien con !mutear para silenciarlo');
                return;
            }

            const userId = quotedMsg.author || quotedMsg.from;
            
            if (args[0] === 'remove' || args[0] === 'unmute') {
                const index = mutedUsers.findIndex(m => m.userId === userId);
                if (index !== -1) {
                    mutedUsers.splice(index, 1);
                    guardarMutedUsers();
                    msg.reply('✅ Usuario desmuteado');
                } else {
                    msg.reply('❌ Este usuario no está muteado');
                }
                return;
            }

            if (args[0] === 'list') {
                if (mutedUsers.length === 0) {
                    msg.reply('📋 No hay usuarios muteados');
                } else {
                    let lista = `🔇 *USUARIOS MUTEADOS* (${mutedUsers.length}):\n\n`;
                    mutedUsers.forEach((muted, index) => {
                        const tiempo = muted.reason || 'Sin razón';
                        lista += `${index + 1}. ${muted.userId}\n   Razón: ${tiempo}\n\n`;
                    });
                    msg.reply(lista);
                }
                return;
            }

            if (args[0] === 'clear') {
                mutedUsers = [];
                guardarMutedUsers();
                msg.reply('✅ Lista de usuarios muteados limpiada');
                return;
            }

            const razon = args.join(' ') || 'Sin razón especificada';
            
            if (isUserMuted(userId)) {
                msg.reply('❌ Este usuario ya está muteado');
                return;
            }

            mutedUsers.push({
                userId: userId,
                reason: razon,
                mutedAt: new Date().toISOString()
            });
            
            guardarMutedUsers();
            msg.reply(`🔇 Usuario muteado\n\nTodos sus mensajes serán eliminados automáticamente.\n\nComandos:\n!mutear list - Ver todos\n!mutear unmute - Desmutear (responde a mensaje)\n!mutear clear - Limpiar todo`);
        }

        // --- COMANDOS TUS SANTANDER ---

        if (comando === '!bus') {
            if (!args[0]) {
                msg.reply('🚌 *TUS SANTANDER*\n\n*Comandos disponibles:*\n• !bus paradas - Ver lista de paradas\n• !bus lineas - Ver líneas disponibles\n• !bus [número] - Ver próximos buses (tiempo real)\n\n_Muestra tiempos estimados de llegada en tiempo real_');
                return;
            }

            if (args[0] === 'paradas') {
                msg.reply('⏳ Consultando paradas...');
                const paradas = await getBusParadas();
                
                if (paradas && paradas.length > 0) {
                    // Dividir en grupos de 30 paradas por mensaje
                    const grupoSize = 30;
                    const numGrupos = Math.ceil(paradas.length / grupoSize);
                    
                    for (let i = 0; i < numGrupos; i++) {
                        const inicio = i * grupoSize;
                        const fin = Math.min(inicio + grupoSize, paradas.length);
                        const grupo = paradas.slice(inicio, fin);
                        
                        let respuesta = `🚌 *PARADAS TUS SANTANDER* (${inicio + 1}-${fin} de ${paradas.length}):\n\n`;
                        grupo.forEach(p => {
                            const nombre = p['ayto:parada'] || 'Sin nombre';
                            const numero = p['ayto:numero'] || '?';
                            respuesta += `📍 *${numero}* - ${nombre}\n`;
                        });
                        
                        if (i === numGrupos - 1) {
                            respuesta += '\n💡 Usa !bus [número] para ver tiempos';
                        }
                        
                        await msg.reply(respuesta);
                        
                        // Pequeña pausa entre mensajes para evitar flood
                        if (i < numGrupos - 1) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                } else {
                    msg.reply('❌ No se pudieron obtener las paradas');
                }
                return;
            }

            if (args[0] === 'lineas') {
                msg.reply('⏳ Consultando líneas...');
                const lineas = await getBusLineas();
                
                if (lineas && lineas.length > 0) {
                    let respuesta = '🚌 *LÍNEAS TUS SANTANDER*:\n\n';
                    lineas.forEach(l => {
                        const numero = l['ayto:numero'] || '?';
                        const nombre = l['dc:name'] || 'Sin nombre';
                        respuesta += `🔢 *Línea ${numero}*: ${nombre}\n`;
                    });
                    msg.reply(respuesta);
                } else {
                    msg.reply('❌ No se pudieron obtener las líneas');
                }
                return;
            }

            if (args[0] === 'posicion') {
                msg.reply('⏳ Consultando posición de autobuses...');
                const posiciones = await getPosicionBuses();
                
                if (posiciones && posiciones.length > 0) {
                    let respuesta = '🚌 *POSICIÓN AUTOBUSES* (últimas 5):\n\n';
                    posiciones.slice(0, 5).forEach(pos => {
                        const linea = pos.ayto_linea || '?';
                        const vehiculo = pos.ayto_vehiculo || 'N/A';
                        const lat = pos.ayto_latitud || 'N/A';
                        const lon = pos.ayto_longitud || 'N/A';
                        respuesta += `🔢 Línea *${linea}* (Vehículo ${vehiculo})\n`;
                        respuesta += `📍 ${lat}, ${lon}\n\n`;
                    });
                    msg.reply(respuesta);
                } else if (posiciones === null) {
                    msg.reply('❌ Error al consultar la API de posiciones.\n\n💡 El servicio podría estar temporalmente no disponible.');
                } else {
                    msg.reply('❌ No hay datos de posición disponibles');
                }
                return;
            }

            // Consultar tiempos estimados de una parada
            const paradaId = args[0];
            
            // Validar que sea un número
            if (!/^\d+$/.test(paradaId)) {
                msg.reply('❌ Comando no válido.\n\nComandos:\n• !bus paradas\n• !bus lineas\n• !bus [número]');
                return;
            }
            
            msg.reply(`⏳ Consultando tiempos de parada ${paradaId}...`);
            const tiempos = await getTiemposEstimados(paradaId);
            
            if (tiempos && tiempos.length > 0) {
                let respuesta = `🚌 *PARADA ${paradaId}* - Próximos buses:\n\n`;
                
                tiempos.forEach(t => {
                    const linea = t['ayto:etiqLinea'] || '?';
                    const destino1 = t['ayto:destino1'] || 'Desconocido';
                    const tiempo1 = t['ayto:tiempo1'] ? `${Math.floor(t['ayto:tiempo1'] / 60)} min` : 'N/A';
                    
                    respuesta += `🔢 Línea *${linea}* → ${destino1}\n`;
                    respuesta += `⏱️ ${tiempo1}\n`;
                    
                    // Si hay segundo bus
                    if (t['ayto:destino2'] && t['ayto:tiempo2']) {
                        const destino2 = t['ayto:destino2'];
                        const tiempo2 = `${Math.floor(t['ayto:tiempo2'] / 60)} min`;
                        respuesta += `🔢 Línea *${linea}* → ${destino2}\n`;
                        respuesta += `⏱️ ${tiempo2}\n`;
                    }
                    respuesta += '\n';
                });
                
                msg.reply(respuesta);
            } else if (tiempos === null) {
                msg.reply(`❌ Error al consultar la API de estimaciones.\n\n💡 El servicio podría estar temporalmente no disponible.\nPrueba con !bus paradas para ver paradas estáticas.`);
            } else {
                msg.reply(`❌ No hay estimaciones para la parada ${paradaId}\n\n💡 Usa !bus paradas para ver paradas disponibles`);
            }
        }

        // --- COMANDOS DE IMAGEN ---

        if (comando === '!meme') {
            const quotedMsg = await msg.getQuotedMessage();
            
            if (!quotedMsg || !quotedMsg.hasMedia) {
                msg.reply('❌ Responde a una imagen con !meme texto arriba | texto abajo');
                return;
            }
            
            const textos = args.join(' ').split('|');
            const textoArriba = textos[0]?.trim() || '';
            const textoAbajo = textos[1]?.trim() || '';
            
            msg.reply('⏳ Creando meme...');
            try {
                const media = await quotedMsg.downloadMedia();
                const mimeType = media?.mimetype || media?.mime;
                if (media && mimeType && mimeType.includes('image')) {
                    const buffer = Buffer.from(media.data, 'base64');
                    const resultado = await crearMeme(buffer, textoArriba, textoAbajo);
                    if (resultado) {
                        const newMedia = new MessageMedia('image/png', resultado.toString('base64'));
                        await msg.reply(newMedia);
                    }
                }
            } catch (e) {
                msg.reply('❌ Error creando meme');
            }
        }

        // --- COMANDOS GENERALES ---

        if (msg.body === '!todos') {
            const chat = await msg.getChat();
            
            if (chat.isGroup) {
                let text = "📢 *LLAMANDO A TODOS*\n\n";
                let mentions = [];
        
                for (let participant of chat.participants) {
                    mentions.push(participant.id._serialized);
                    text += `@${participant.id.user} `;
                }
        
                await chat.sendMessage(text, { mentions });
            }
        }

        if (msg.body === '!sticker' && msg.hasMedia) {
            try {
                const media = await msg.downloadMedia();
                await client.sendMessage(msg.from, media, { 
                    sendMediaAsSticker: true,
                    stickerName: 'Bot Sticker',
                    stickerAuthor: 'WhatsApp Bot'
                });
            } catch (e) {
                msg.reply('❌ Error al crear sticker.');
            }
        }

        if (comando === '!ayuda') {
            const ayuda = `📋 *UTILIDADES DEL BOT*

🎵 *AUDIO* 
!ytmp3 [URL] - Descargar canción de YouTube
!speed [velocidad] - Cambiar velocidad (responde a audio)
!reverse - Invertir audio (responde a audio)
!extractaudio - Extraer audio de video

🖼️ *IMAGEN*
!resize [ancho] [alto] - Redimensionar (responde a imagen)
!grayscale - Convertir a B&N (responde a imagen)
!filter [tipo] - Aplicar filtro (responde a imagen)
   Filtros: blur, sepia, contrast, brightness, invert
!meme texto arriba | texto abajo - Crear meme (responde a imagen)

🚫 *MODERACIÓN*
!blacklist - Ver palabras bloqueadas
!blacklist add [palabra] - Agregar palabra
!blacklist remove [palabra] - Quitar palabra
!blacklist clear - Limpiar lista

!banimagen - Banear imagen (responde a imagen)
!banimagen list - Ver imágenes baneadas
!banimagen remove [#] - Quitar imagen baneada
!banimagen clear - Limpiar lista

!mutear [razón] - Mutear usuario (responde a mensaje)
!mutear list - Ver usuarios muteados
!mutear unmute - Desmutear (responde a mensaje)
!mutear clear - Limpiar lista

🚌 *TUS SANTANDER*
!bus paradas - Ver paradas de autobús
!bus lineas - Ver líneas disponibles
!bus [número] - Próximos buses (tiempo real)

👥 *GRUPO*
!todos - Mencionar a todos
!sticker - Convertir imagen a sticker`;
            msg.reply(ayuda);
        }

        // --- VERIFICAR BLACKLIST EN MENSAJES ---
        
        const palabraBloqueada = verificarBlacklist(msg.body);
        if (palabraBloqueada) {
            console.log(`[BLACKLIST] Mensaje bloqueado de ${msg.from} por: ${palabraBloqueada}`);
            try {
                await msg.delete(true);
                await msg.reply(`⚠️ Mensaje eliminado. Palabra prohibida detectada.`);
            } catch (e) {
                console.log("Error borrando mensaje de blacklist", e);
            }
            return;
        }

        // --- FILTRO DE CONTENIDO NSFW ---

        if (msg.hasMedia) {
            if (msg.isViewOnce || (msg._data && msg._data.isViewOnce)) {
                console.log(`[PELIGRO] ViewOnce detectado de ${msg.from}`);
                try {
                    await msg.delete(true);
                } catch (e) {
                    console.log("Error borrando", e);
                }
                return;
            }

            if (msg.type === 'image') {
                try {
                    const media = await msg.downloadMedia();
                    if (media) {
                        const buffer = Buffer.from(media.data, 'base64');
                        
                        // Verificar si la imagen está baneada
                        const isBanned = await isImageBanned(buffer);
                        if (isBanned) {
                            console.log(`[IMAGEN BANEADA] Eliminando de ${msg.from}`);
                            await msg.delete(true);
                            await msg.reply('🚫 Esta imagen está prohibida y ha sido eliminada.');
                            return;
                        }
                        
                        const imageTensor = await imageToTensor(media.data);
                        const predictions = await model.classify(imageTensor);
                        imageTensor.dispose();

                        const pornProb = predictions.find(p => p.className === 'Porn')?.probability || 0;
                        const hentaiProb = predictions.find(p => p.className === 'Hentai')?.probability || 0;

                        console.log(`Analizando imagen... Porn: ${(pornProb*100).toFixed(1)}%`);

                        if (pornProb > 0.60 || hentaiProb > 0.60) {
                            console.log('!!! BORRANDO CONTENIDO !!!');
                            await msg.delete(true);
                            await msg.reply('⚠️ Imagen eliminada por contenido inapropiado.');
                        }
                    }
                } catch (error) {
                    // Ignorar errores
                }
            }
        }
    } catch (e) {
        console.error('Error procesando mensaje:', e);
    }
});

iniciarBot();
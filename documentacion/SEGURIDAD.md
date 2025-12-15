# 🛡️ Guía de Seguridad y Anti-Detección

## ⚠️ Riesgo de Ban en WhatsApp

WhatsApp puede **banear tu número** si detecta uso automatizado. Este bot incluye múltiples capas de protección, pero **NO es 100% seguro**.

---

## 🔒 Protecciones Implementadas

### 1. **Rate Limiting (Límite de Tasa)**
- ✅ Máximo **5 comandos por minuto** por usuario
- ✅ Máximo **10 descargas por hora** por usuario
- ✅ Rechaza automáticamente si se excede el límite

### 2. **Delays Humanizados**
- ✅ Espera **1.5 a 4 segundos** antes de responder (aleatorio)
- ✅ Simula "escribiendo..." en comandos de descarga
- ✅ Tiempo de "typing" aleatorio de 1-3 segundos

### 3. **User-Agent Realista**
- ✅ Se hace pasar por navegador Chrome normal
- ✅ Flags de Puppeteer optimizados para menor detección

### 4. **Comando Broadcast Deshabilitado**
- ❌ Enviar el mismo mensaje a TODOS los chats es la forma **#1 de ser baneado**
- ✅ Comando deshabilitado por defecto

### 5. **Monitoreo de Uso Excesivo**
- ✅ Alerta automática si el bot está activo **más de 12 horas**
- ✅ Alerta si se realizan **más de 50 descargas**
- ✅ Recomienda reiniciar para evitar detección

---

## 📊 Niveles de Riesgo

### ✅ **BAJO RIESGO** (5-10% probabilidad de ban)
- Uso personal con amigos/familia
- Menos de 20 comandos por día
- Grupos pequeños (< 20 personas)
- Reinicio del bot cada 6-12 horas
- **Recomendación:** Úsalo normalmente, es seguro

### ⚠️ **RIESGO MEDIO** (30-40% probabilidad de ban)
- Grupos medianos (20-100 personas)
- 20-50 comandos por día
- Bot activo 24/7 sin reiniciar
- Múltiples descargas de video/audio
- **Recomendación:** Usa número secundario

### 🚨 **ALTO RIESGO** (80-90+ probabilidad de ban)
- Grupos grandes (100+ personas)
- Más de 50 comandos por día
- Uso comercial o spam
- Broadcast a múltiples chats
- Modificar el código para quitar límites
- **Recomendación:** NO LO HAGAS

---

## 🛡️ Mejores Prácticas

### ✅ **HACER:**
1. **Usa un número secundario** (SIM prepago de 5-10€)
2. **Reinicia el bot cada 12 horas** máximo
3. Mantén los límites de rate limiting activos
4. Usa en grupos privados pequeños
5. Evita descargar más de 20-30 videos por día
6. Deja el bot "descansar" algunas horas al día

### ❌ **NO HACER:**
1. **NO uses tu número principal** (tu SIM personal)
2. **NO remuevas los delays** ni rate limiting del código
3. **NO habilites broadcast** nunca
4. **NO uses en grupos de 500+ personas**
5. **NO dejes el bot 24/7 por semanas**
6. **NO hagas scraping** de contactos masivo
7. **NO envíes mensajes automáticos no solicitados**

---

## 🔍 Cómo WhatsApp Detecta Bots

WhatsApp monitorea:
- ✅ **Patrones de respuesta instantánea** → Solucionado con delays aleatorios
- ✅ **Mensajes idénticos a múltiples chats** → Broadcast deshabilitado
- ✅ **Actividad 24/7 sin descanso** → Alertas automáticas
- ✅ **Uso excesivo de ancho de banda** → Rate limiting de descargas
- ✅ **User-Agent sospechoso** → Cambiado a Chrome realista

---

## 📈 Estadísticas en Tiempo Real

El bot muestra estadísticas de uso:

```
BOT> stats

📊 ESTADÍSTICAS DEL BOT
  Mensajes procesados: 45
  Comandos ejecutados: 12
  Descargas realizadas: 3
  Tiempo activo: 2 horas
```

**Si ves:**
- ⚠️ Más de 50 comandos → Considera reiniciar
- ⚠️ Más de 12 horas activo → Reinicia AHORA
- ⚠️ Más de 50 descargas → Alto riesgo, detén uso

---

## 🚨 Señales de Advertencia de WhatsApp

Si WhatsApp sospecha, verás:
1. **Mensajes de verificación** frecuentes (código SMS)
2. **"Cuenta en revisión"** al iniciar WhatsApp
3. **Desconexiones aleatorias** del bot
4. **Límite de mensajes** ("Demasiados mensajes")

**Si ves esto:** ⛔ **DETÉN EL BOT INMEDIATAMENTE**

---

## 🔄 Reinicio Seguro del Bot

### Reinicio Automático cada 12 horas (Docker):

```yaml
# En docker-compose.yml, cambia:
restart: unless-stopped

# Por:
restart: "no"
```

Luego usa cron para reiniciar:
```bash
# Editar crontab
crontab -e

# Añadir línea (reinicia a las 3am y 3pm)
0 3,15 * * * cd /ruta/ws && docker-compose restart whatsapp-bot
```

### Reinicio Manual:
```powershell
# Local
# Ctrl+C, luego npm start

# Docker
docker-compose restart whatsapp-bot
```

---

## 🆘 Si Te Banean

### Ban Temporal (24-48 horas):
- Espera el tiempo indicado
- No intentes escanear QR repetidamente
- Cuando vuelva, usa el bot **menos intensivamente**

### Ban Permanente:
- WhatsApp no levanta bans permanentes
- Necesitarás un **nuevo número**
- **NO contactes a soporte** (no ayudan con bots)

### Prevenir Ban Permanente:
- Si recibes ban temporal, **reduce uso a mínimo**
- Considera dejar de usar el bot en ese número
- Siempre usa número secundario para testing

---

## 📞 Número Secundario Recomendado

**Opciones baratas (5-15€/año):**
1. **Movistar Prepago** (España): 5€ SIM + recarga mínima
2. **Lebara** (Europa): 6€ SIM + 5€/mes recarga
3. **Lyca Mobile**: 1€ SIM + 5€ recarga
4. **Google Voice** (USA): Gratis (requiere número USA para verificar)

**⚠️ NO uses números virtuales** (TextNow, etc.) - WhatsApp los bloquea.

---

## 🔐 Configuración Paranoica (Máxima Seguridad)

Si quieres **reducir aún más el riesgo**, edita `index.js`:

```javascript
// Aumentar delays (líneas 53-54)
const MIN_RESPONSE_DELAY = 3000; // 3 segundos
const MAX_RESPONSE_DELAY = 8000; // 8 segundos

// Reducir límites (líneas 51-52)
const MAX_COMMANDS_PER_MINUTE = 3; // Solo 3 comandos/min
const MAX_DOWNLOADS_PER_HOUR = 5;  // Solo 5 descargas/hora
```

Luego reinicia el bot.

---

## 📊 Resumen: Configuración Óptima

| Configuración | Valor Recomendado |
|---------------|------------------|
| **Tiempo activo máximo** | 12 horas |
| **Comandos por día** | < 30 |
| **Descargas por día** | < 20 |
| **Tamaño de grupos** | < 50 personas |
| **Número usado** | Secundario (prepago) |
| **Reinicio** | Cada 12 horas |
| **Broadcast** | NUNCA |

---

## ✅ Verificación de Seguridad

Antes de usar el bot, confirma:

- [ ] Estoy usando un **número secundario** (no mi SIM principal)
- [ ] Los **delays están activados** (no los modifiqué)
- [ ] El **rate limiting está activo** (no lo quité del código)
- [ ] **Broadcast está deshabilitado**
- [ ] Voy a **reiniciar el bot cada 12 horas**
- [ ] NO voy a usar en grupos de **más de 50 personas**
- [ ] Entiendo que existe **riesgo de ban**

---

## 📚 Más Información

- **Documentación técnica:** [DOCUMENTACION.md](DOCUMENTACION.md)
- **Guía Docker:** [README-DOCKER.md](README-DOCKER.md)
- **Inicio rápido:** [INICIO-RAPIDO.md](INICIO-RAPIDO.md)

---

## ⚖️ Disclaimer Legal

Este bot es para **uso educativo y personal**. El autor **NO se hace responsable** de:
- Bans de cuenta de WhatsApp
- Pérdida de números telefónicos
- Violaciones de términos de servicio de WhatsApp
- Uso indebido del bot para spam o actividades ilegales

**Al usar este bot, aceptas todos los riesgos.**

---

**🛡️ Última actualización:** Diciembre 2025  
**📌 Versión:** 2.0 con sistema anti-detección

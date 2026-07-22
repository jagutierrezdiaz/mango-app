import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js'; 
import { errorHandler } from './middlewares/errorMiddleware.js';
import uploadRoutes from './routes/uploadRoutes.js';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const normalizeOrigin = (value = '') => String(value || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\.$/, '');
const APP_URL = normalizeOrigin(process.env.APP_URL || '');
const DEV_FRONTEND_PORT = Number(process.env.VUE_APP_DEV_FRONTEND_PORT || 5173) || 5173;

// ==========================================================================
// MIDDLEWARES GLOBALES
// ==========================================================================

// ===================== CORS FLEXIBLE =====================

const allowedOrigins = [
    'https://patio.local',
    `http://localhost:${DEV_FRONTEND_PORT}`,
    `https://localhost:${DEV_FRONTEND_PORT}`,
    'https://app.patiobohemio.com'
].map(normalizeOrigin);

// Añadir APP_URL si está presente en las env vars (útil en producción)
if (APP_URL) {
    const normalizedAppUrl = normalizeOrigin(APP_URL);
    if (!allowedOrigins.includes(normalizedAppUrl)) allowedOrigins.push(normalizedAppUrl);
}

function isApiOriginAllowed(origin) {
    if (!origin) return true; // Permitir peticiones internas (server to server)
    const normalizedOrigin = normalizeOrigin(origin);
    // Siempre permitir https://patio.local explícitamente
    if (normalizedOrigin === 'https://patio.local') return true;
    if (allowedOrigins.includes(normalizedOrigin)) return true;
    if (normalizedOrigin.endsWith('.patio.local')) return true;
    return false;
}

// Middleware CORS (debe ir antes de las rutas)
app.use(cors({
    origin: (origin, callback) => {
        const normalized = normalizeOrigin(origin || '');
        const allowed = isApiOriginAllowed(origin);
        // console.log(`[CORS] Origin: ${origin} -> normalized: ${normalized} -> allowed: ${allowed}`);
        if (allowed) {
            callback(null, true);
        } else {
            console.error(`CORS: origen no permitido -> ${origin}`);
            callback(null, false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Middleware para garantizar charset UTF-8 en todas las respuestas
app.use((req, res, next) => {
    // Configurar el charset UTF-8 por defecto
    const originalJson = res.json;
    res.json = function(data) {
        // Asegurarse de que el header Content-Type incluya charset=utf-8
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return originalJson.call(this, data);
    };
    next();
});

// Middleware para garantizar charset en archivos estáticos HTML/CSS/JS
app.use((req, res, next) => {
    const originalSend = res.send;
    res.send = function(data) {
        if (req.url.endsWith('.html') || req.url.endsWith('.js') || req.url.endsWith('.css')) {
            res.setHeader('Content-Type', res.getHeader('Content-Type') + '; charset=utf-8');
        }
        return originalSend.call(this, data);
    };
    next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ==========================================================================
// SISTEMA DE RUTAS (CONEXIÓN CON NGINX)
// ==========================================================================

/**
 * IMPORTANTE: 
 * Como en nginx.conf usamos 'proxy_pass http://backend_upstream' (SIN barra al final),
 * Nginx envía la ruta completa: /api/categorias.
 * 
 * 
 */
app.use((req, res, next) => {
    if (req.url.includes('/api')) {
        console.log(`🚀 Petición API: ${req.method} ${req.url}`);
    }
    next();
});


app.use('/api', routes);
app.use('/api/uploads', uploadRoutes);

// Ruta de prueba para WebSocket nativo
app.get('/test-socket', (req, res) => {
    const testPage = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test WebSocket</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            max-width: 600px;
            width: 100%;
            padding: 40px;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            text-align: center;
        }
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }
        .status-box {
            background: #f8f9fa;
            border-left: 4px solid #ddd;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            max-height: 300px;
            overflow-y: auto;
        }
        .status-box.success {
            border-left-color: #28a745;
            background: #d4edda;
        }
        .status-box.error {
            border-left-color: #dc3545;
            background: #f8d7da;
        }
        .status-box.info {
            border-left-color: #17a2b8;
            background: #d1ecf1;
        }
        .log-entry {
            margin: 5px 0;
            padding: 3px 0;
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        button {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            margin: 10px 5px;
            transition: background 0.3s;
        }
        button:hover {
            background: #764ba2;
        }
        .buttons {
            text-align: center;
            margin-top: 20px;
        }
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
            animation: pulse 2s infinite;
        }
        .status-indicator.connected {
            background: #28a745;
        }
        .status-indicator.disconnected {
            background: #dc3545;
            animation: none;
        }
        .status-indicator.pending {
            background: #ffc107;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔌 Prueba de WebSocket</h1>
        <p class="subtitle">Prueba de conexión WebSocket</p>

        <div style="text-align: center; margin-bottom: 20px;">
            <span class="status-indicator pending"></span>
            <span id="status-text" style="font-weight: bold; font-size: 16px;">INICIALIZANDO...</span>
        </div>

        <div class="status-box info">
            <strong>📍 Servidor Backend:</strong>
            <div class="log-entry" id="ws-endpoint-hint">(misma origen + /pb-realtime-ws)</div>
            <strong style="display: block; margin-top: 10px;">🔐 Usuario de Prueba:</strong>
            <div class="log-entry">admin (ID: 1, Rol: Administrador)</div>
        </div>

        <div style="margin-top: 20px;">
            <strong style="display: block; margin-bottom: 10px;">📋 Eventos Registrados:</strong>
            <div id="logs" class="status-box" style="border-left-color: #6c757d;"></div>
        </div>

        <div class="buttons">
            <button onclick="clearLogs()">🗑️ Limpiar Logs</button>
            <button onclick="testEmit()">📤 Enviar Test Emit</button>
            <button onclick="location.reload()">🔄 Recargar</button>
        </div>
    </div>

    <script>
        const PROTOCOL_VERSION = 1;
        const WS_PATH = '/pb-realtime-ws';
        const logsContainer = document.getElementById('logs');
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = document.getElementById('status-text');
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sIjoiQWRtaW5pc3RyYWRvciIsImlhdCI6MTc3NjIzMDEyNSwiZXhwIjoxNzc2MzE2NTI1fQ.pDAZQCYCYc5Vd7kQmRRPwBuJyEqhWRWrtkc80kZYjig';

        function buildWsUrl() {
            const loc = window.location;
            const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
            return proto + '//' + loc.host + WS_PATH + '?token=' + encodeURIComponent(token);
        }

        function addLog(message, type = 'info') {
            const timestamp = new Date().toLocaleTimeString();
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.innerHTML = '<strong>[' + timestamp + ']</strong> ' + message;
            logsContainer.insertBefore(entry, logsContainer.firstChild);

            while (logsContainer.children.length > 50) {
                logsContainer.removeChild(logsContainer.lastChild);
            }
        }

        function updateStatus(status, indicator) {
            statusText.textContent = status;
            statusIndicator.className = 'status-indicator ' + indicator;
        }

        function clearLogs() {
            logsContainer.innerHTML = '';
            addLog('Logs limpiados', 'info');
        }

        const hintEl = document.getElementById('ws-endpoint-hint');
        if (hintEl) {
            hintEl.textContent = buildWsUrl().replace(/\?token=[^&]*/, '?token=(jwt)');
        }

        function createTestSocket() {
            const listeners = {};
            const pendingAcks = {};
            let ws = null;

            const socket = {
                id: null,
                get connected() {
                    return ws && ws.readyState === WebSocket.OPEN;
                },
                on: function(ev, fn) {
                    if (!listeners[ev]) listeners[ev] = [];
                    listeners[ev].push(fn);
                    return socket;
                },
                emit: function(eventName, data, ack) {
                    if (!socket.connected) {
                        if (typeof ack === 'function') ack({ success: false, message: 'not-connected' });
                        return false;
                    }
                    var payload = { v: PROTOCOL_VERSION, kind: 'call', event: eventName, data: data || {} };
                    if (typeof ack === 'function') {
                        var rid = Date.now() + '-' + Math.random().toString(36).slice(2);
                        pendingAcks[rid] = ack;
                        payload.rid = rid;
                    }
                    ws.send(JSON.stringify(payload));
                    return true;
                },
                connect: function() {
                    ws = new WebSocket(buildWsUrl());
                    ws.onopen = function() {
                        socket.id = 'ws_' + Date.now().toString(36);
                        addLog('✅ CONECTADO - ID: ' + socket.id, 'success');
                        (listeners.connect || []).forEach(function(fn) { fn(); });
                        updateStatus('CONECTADO ✓', 'connected');
                    };
                    ws.onmessage = function(ev) {
                        var msg;
                        try { msg = JSON.parse(ev.data); } catch (e) { return; }
                        if (!msg || Number(msg.v) !== PROTOCOL_VERSION) return;
                        if (msg.kind === 'emit' && msg.event) {
                            var subs = listeners[msg.event] || [];
                            subs.forEach(function(fn) { fn(msg.data); });
                            addLog('📨 EVENTO: ' + msg.event + ' — ' + JSON.stringify(msg.data || {}).substring(0, 120), 'info');
                            return;
                        }
                        if (msg.kind === 'ack' && msg.rid && pendingAcks[msg.rid]) {
                            var cb = pendingAcks[msg.rid];
                            delete pendingAcks[msg.rid];
                            if (msg.ok) cb(Object.assign({ success: true }, msg.data || {}));
                            else cb(Object.assign({ success: false, message: msg.error }, msg.data || {}));
                        }
                    };
                    ws.onerror = function() {
                        addLog('❌ ERROR DE WEBSOCKET', 'error');
                        updateStatus('ERROR DE CONEXIÓN', 'disconnected');
                        (listeners.connect_error || []).forEach(function(fn) { fn(new Error('websocket error')); });
                    };
                    ws.onclose = function() {
                        socket.id = null;
                        (listeners.disconnect || []).forEach(function(fn) { fn('closed'); });
                        updateStatus('DESCONECTADO', 'disconnected');
                    };
                    return socket;
                }
            };

            return socket;
        }

        function testEmit() {
            if (window.socket && window.socket.connected) {
                addLog('🚀 Enviando evento de prueba...', 'info');
                window.socket.emit('test-event', { message: 'Test desde navegador' }, function(ack) {
                    addLog('✅ ACK recibido: ' + JSON.stringify(ack), 'success');
                });
            } else {
                addLog('❌ Socket no está conectado', 'error');
            }
        }

        localStorage.setItem('token', token);
        addLog('✅ Token inyectado en localStorage', 'success');
        addLog('🔌 Conectando vía WebSocket nativo...', 'info');
        updateStatus('CONECTANDO...', 'pending');

        window.socket = createTestSocket();
        window.socket.connect();

        addLog('🌐 Página de prueba cargada', 'info');
    </script>
</body>
</html>`;
    res.send(testPage);
});

// Activos estáticos compartidos (logos, sonidos) — fuente única: public/ en la raíz
app.use('/img', express.static(path.join(__dirname, '../public/img')));
app.use('/sounds', express.static(path.join(__dirname, '../public/sounds')));

// Servir archivos de uploads
const BASE_UPLOADS = process.env.NGINX_UPLOADS_PATH || 'C:/nginx-1.24.0/html/uploads_mango';
app.use('/uploads', express.static(BASE_UPLOADS));

// ==========================================================================
// ESTÁTICOS Y MANEJO DE ERRORES
// ==========================================================================

// Servir archivos estáticos del frontend SOLO en producción (build de Vue)
const frontendDist = path.join(__dirname, '../frontend/dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));

    // Fallback a index.html para rutas de SPA cuando se navega directamente.
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendDist, 'index.html'));
    });
}

// Manejador 404 específico para la API
app.use('/api', (req, res) => {
    console.log(`⚠️ 404 detectado en API: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
        success: false, 
        message: `Endpoint no encontrado en el servidor: ${req.originalUrl}` 
    });
});

// Manejador de errores global (Debe ser el último middleware)
app.use(errorHandler);

export default app;
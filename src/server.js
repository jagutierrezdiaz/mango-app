import http from 'http';
import https from 'https';
import { ExpressPeerServer } from 'peer';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import app from './app.js';
import { startNotificationWatcher } from './services/notificationWatcher.js';
import { attachRealtimeWebSocket } from './realtime/realtimeWsHub.js';

dotenv.config();

const normalizeOrigin = (value = '') => String(value || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\.$/, '');

const APP_URL = normalizeOrigin(process.env.APP_URL || '');
const PEER_PATH = (() => {
    const raw = String(process.env.PEER_PATH || '/peerjs').trim();
    const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`;
    return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/$/, '') : withLeadingSlash;
})();
const PEER_PORT = Number(process.env.PEER_PORT || process.env.PORT || 3000);
const PEER_KEY = String(process.env.PEER_KEY || 'peerjs').trim() || 'peerjs';
const REALTIME_WS_PATH = String(process.env.REALTIME_WS_PATH || '/pb-realtime-ws').trim() || '/pb-realtime-ws';
const DEFAULT_PUBLIC_ORIGIN = APP_URL || 'https://mango.hazlosoftware.com';
const DEV_FRONTEND_PORT = Number(process.env.VUE_APP_DEV_FRONTEND_PORT || 5173) || 5173;
const REALTIME_ALLOWED_ORIGINS = [...new Set([
    `http://localhost:${DEV_FRONTEND_PORT}`,
    `http://127.0.0.1:${DEV_FRONTEND_PORT}`,
    `https://localhost:${DEV_FRONTEND_PORT}`,
    `https://patio.local:${DEV_FRONTEND_PORT}`,
    'https://app.patiobohemio.com',
    APP_URL,
    DEFAULT_PUBLIC_ORIGIN
].map(normalizeOrigin).filter(Boolean))];

const isRealtimeOriginAllowed = (origin) => {
    if (!origin) return false;

    const normalizedOrigin = normalizeOrigin(origin);
    return REALTIME_ALLOWED_ORIGINS.includes(normalizedOrigin);
};

// ======================================================
// 1. CONFIGURACIÓN DE RUTAS FÍSICAS (Nginx)
// ======================================================

const BASE_UPLOADS = process.env.NGINX_UPLOADS_PATH || 'C:/nginx-1.24.0/html/uploads_mango';
console.log('NGINX_UPLOADS_PATH (env):', process.env.NGINX_UPLOADS_PATH || '(no definido)');
console.log('BASE_UPLOADS (resuelto):', BASE_UPLOADS);

const RUTAS_SISTEMA = [
    `${BASE_UPLOADS}/img-personal`,
    `${BASE_UPLOADS}/img-categorias`,
    `${BASE_UPLOADS}/img-fichas-tecnicas`,
    `${BASE_UPLOADS}/img-gastos-comprobantes`,
    `${BASE_UPLOADS}/img-articulos`,
    `${BASE_UPLOADS}/img-proveedores`,
    `${BASE_UPLOADS}/img-branding`
];

const prepararEstructuraArchivos = () => {

    console.log("🛠️  Verificando estructura de archivos...");

    RUTAS_SISTEMA.forEach(ruta => {

        if (!fs.existsSync(ruta)) {

            try {

                fs.mkdirSync(ruta, { recursive: true });

                console.log(`📁 Carpeta creada: ${ruta}`);

            } catch (err) {

                console.error(`❌ Error creando carpeta ${ruta}:`, err.message);

            }

        }

    });

};

prepararEstructuraArchivos();

// ======================================================
// 2. CREACIÓN DEL SERVIDOR HTTP/HTTPS
// ======================================================

const NODE_ENV = String(process.env.NODE_ENV || 'development').trim().toLowerCase();
const isProductionEnvironment = NODE_ENV === 'production';
const ENABLE_LOCAL_HTTPS = String(process.env.ENABLE_LOCAL_HTTPS || 'false').trim().toLowerCase() === 'true';
const LOCAL_SSL_CERT_PATH = path.resolve(process.env.LOCAL_SSL_CERT_PATH || './localhost.pem');
const LOCAL_SSL_KEY_PATH = path.resolve(process.env.LOCAL_SSL_KEY_PATH || './localhost-key.pem');

const createAppServer = () => {
    if (!ENABLE_LOCAL_HTTPS) {
        return { server: http.createServer(app), protocol: 'http' };
    }

    const cert = fs.readFileSync(LOCAL_SSL_CERT_PATH, 'utf8');
    const key = fs.readFileSync(LOCAL_SSL_KEY_PATH, 'utf8');

    console.log(`🔐 HTTPS local habilitado con certificado: ${LOCAL_SSL_CERT_PATH}`);
    console.log(`🔐 HTTPS local habilitado con llave: ${LOCAL_SSL_KEY_PATH}`);

    return {
        server: https.createServer({ key, cert }, app),
        protocol: 'https'
    };
};

const { server, protocol: serverProtocol } = createAppServer();

const normalizeOriginValue = (value = '') => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw.replace(/\/$/, '');
    return `https://${raw.replace(/\/$/, '')}`;
};

const resolveUpgradeOrigin = (request) => {
    const headerOrigin = normalizeOriginValue(request.headers?.origin);
    if (headerOrigin) return headerOrigin;

    const forwardedProto = String(request.headers?.['x-forwarded-proto'] || 'https').split(',')[0].trim() || 'https';
    const forwardedHost = String(request.headers?.['x-forwarded-host'] || '').split(',')[0].trim();
    const host = forwardedHost || String(request.headers?.host || '').trim();
    if (!host) return normalizeOriginValue(DEFAULT_PUBLIC_ORIGIN);

    return normalizeOriginValue(`${forwardedProto}://${host}`);
};

const resolveUpgradeHost = (request) => {
    const currentHost = String(request.headers?.host || '').trim();
    if (currentHost) return currentHost;

    const forwardedHost = String(request.headers?.['x-forwarded-host'] || '').split(',')[0].trim();
    if (forwardedHost) return forwardedHost;

    try {
        const fallbackUrl = new URL(DEFAULT_PUBLIC_ORIGIN);
        return fallbackUrl.host;
    } catch {
        return 'app.patiobohemio.com';
    }
};

server.prependListener('upgrade', (request) => {
    const requestUrl = String(request?.url || '');
    if (!(requestUrl.startsWith(PEER_PATH) || requestUrl.startsWith(REALTIME_WS_PATH))) return;

    const resolvedHost = resolveUpgradeHost(request);
    const resolvedOrigin = resolveUpgradeOrigin(request);

    if (!request.headers.host || String(request.headers.host).trim() !== resolvedHost) {
        request.headers.host = resolvedHost;
    }

    if (!request.headers.origin || !String(request.headers.origin).trim()) {
        request.headers.origin = resolvedOrigin;
    }

    console.log(`[WS UPGRADE] url=${requestUrl} host=${request.headers.host} origin=${request.headers.origin || '(vacio)'} upgrade=${request.headers.upgrade || '(none)'}`);
});

/**
 * PeerJS registra un WebSocketServer sobre el mismo http.Server. El paquete `ws`
 * responde 400 a cualquier upgrade cuya ruta no sea la de Peer — rompiendo
 * `/pb-realtime-ws`. Solo delegamos en Peer cuando la URL coincide con su path.
 */
const createPeerOnlyWebSocketServer = (opts) => {
    const peerWsPath = opts.path;
    const wss = new WebSocketServer(opts);
    const delegateUpgrade = wss.handleUpgrade.bind(wss);
    wss.handleUpgrade = (req, socket, head, cb) => {
        const rawUrl = String(req.url || '');
        const q = rawUrl.indexOf('?');
        const pathname = q !== -1 ? rawUrl.slice(0, q) : rawUrl;
        if (pathname !== peerWsPath) {
            return;
        }
        return delegateUpgrade(req, socket, head, cb);
    };
    return wss;
};

const peerServer = ExpressPeerServer(server, {
    path: '/',
    key: PEER_KEY,
    proxied: true,
    allow_discovery: false,
    alive_timeout: 60000,
    pingInterval: 5000,
    corsOptions: {
        origin: REALTIME_ALLOWED_ORIGINS,
        credentials: true
    },
    createWebSocketServer: createPeerOnlyWebSocketServer
});

app.use(PEER_PATH, peerServer);

peerServer.on('connection', (client) => {
    console.log(`🎯 Peer conectado: ${client.getId()}`);
});

peerServer.on('disconnect', (client) => {
    console.log(`🧹 Peer desconectado: ${client.getId()}`);
});

// ======================================================
// 3. WEBSOCKET NATIVO (paquete ws) — tiempo real / soporte
// ======================================================

console.log('🔧 Configurando WebSocket nativo (ws) con CORS de origen explícito...');

const realtimeHub = attachRealtimeWebSocket(server, app, {
    // En entornos de desarrollo permitir upgrades para facilitar debugging local.
    // En producción se utiliza la función `isRealtimeOriginAllowed` original.
    isOriginAllowed: (process.env.NODE_ENV || '').trim().toLowerCase() !== 'production'
        ? () => true
        : isRealtimeOriginAllowed,
    jwtSecret: process.env.JWT_SECRET || 'secreto_patio_777',
    wsPath: REALTIME_WS_PATH
});

console.log(`🔌 REALTIME_WS_PATH: ${REALTIME_WS_PATH}`);
console.log(`🧭 PeerJS y WebSocket tiempo real comparten puerto; rutas: ${PEER_PATH} y ${REALTIME_WS_PATH}`);

const ioCompat = realtimeHub.ioShim;
const stopNotificationWatcher = startNotificationWatcher({ io: ioCompat });

// ======================================================
// 4. MIDDLEWARE DE MANEJO DE ERRORES GLOBAL
// ======================================================

app.use((err, req, res, next) => {

    const status = err.status || 500;

    console.error(`\n❌ [ERROR ${status}]: ${err.message}`);

    if (err.code === 'ER_DUP_ENTRY') {

        return res.status(400).json({
            success: false,
            message: "El registro ya existe (duplicado)."
        });

    }

    res.status(status).json({
        success: false,
        message: err.message || "Error interno del servidor",
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

});

// ======================================================
// 5. ESCUDOS DE SEGURIDAD (Runtime)
// ======================================================

process.on('unhandledRejection', (reason, promise) => {

    console.error('⚠️ Rejection no manejada en:', promise, 'Razón:', reason);
    realtimeHub.logSupportError({
        context: 'process:unhandledRejection',
        error: reason,
        extra: { promise: String(promise) }
    });

});

process.on('uncaughtException', (err) => {

    console.error('💀 Excepción crítica no atrapada:', err);
    realtimeHub.logSupportError({
        context: 'process:uncaughtException',
        error: err
    });

});

// ======================================================
// 6. INICIO DEL SERVIDOR
// ======================================================

const PORT = Number(process.env.PORT || 3000);
// En desarrollo, preferir escuchar en IPv6 unspecified ('::') para cubrir
// conexiones desde `localhost` que resuelven a `::1` (evita NS_ERROR_CONNECTION_REFUSED).
const HOST = process.env.SERVER_HOST || (process.env.NODE_ENV !== 'production' ? '::' : '0.0.0.0');

server.on('error', (error) => {
    if (error?.code === 'EADDRINUSE') {
        console.error(`¡ERROR: El puerto ${PORT} ya está en uso!`, error);
        return;
    }

    console.error('Error al arrancar el servidor:', error);
});

server.listen(PORT, HOST, () => {

    console.log(`\n==========================================`);
    console.log(`🚀 PATIO BOHEMIO - SERVIDOR ACTIVO`);
    console.log(`📍 URL: ${serverProtocol}://${HOST}:${PORT}`);
    console.log(`🚀 WebSocket tiempo real (ws) en ${serverProtocol}://${HOST}:${PORT}${REALTIME_WS_PATH}`);
    console.log(`🔗 PEER PATH: ${PEER_PATH}`);
    console.log(`🔐 PEER KEY: ${PEER_KEY}`);
    console.log(`🔌 PEER PORT (env): ${PEER_PORT}`);
    console.log(`📅 AMBIENTE: ${process.env.NODE_ENV || 'desarrollo'}`);
    console.log(`📂 UPLOADS: ${BASE_UPLOADS} ✅`);
    console.log(`🛡️  SISTEMA ANTICRASH ACTIVADO`);
    console.log(`⚡ AUTO-RELOAD FRONTEND ACTIVADO`);
    console.log(`==========================================\n`);

});

const shutdownWatcher = () => {
    try {
        stopNotificationWatcher();
    } catch (_error) {
        // noop
    }
};

process.on('SIGINT', shutdownWatcher);
process.on('SIGTERM', shutdownWatcher);

// ======================================================
// EXPORTACIÓN
// ======================================================

export { server, realtimeHub };

import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { WebSocketServer } from 'ws';
import { normalizeRole, resolveSocketRoomFromRole } from '../utils/roles.js';
import { enableKeepAlive } from './realtimeKeepalive.js';
import { createRealtimeRedisAdapter } from './realtimeRedisAdapter.js';

export const PROTOCOL_VERSION = 1;

/**
 * Compatibilidad con código existente que esperaba socket.io (emit, to().emit, sockets.adapter).
 */
export function createRealtimeIoShim(hub) {
    return {
        emit(event, payload) {
            hub.broadcast(event, payload);
        },
        to(room) {
            return {
                emit(event, payload) {
                    hub.emitToRoom(room, event, payload);
                }
            };
        },
        sockets: {
            sockets: {
                has(id) {
                    return hub.hasClient(id);
                }
            },
            adapter: {
                rooms: {
                    get(room) {
                        return hub.getRoomMembers(room);
                    }
                }
            }
        }
    };
}

const SUPPORT_PRIMARY_LOG_DIR = path.resolve('./logs');
const SUPPORT_FALLBACK_LOG_DIR = SUPPORT_PRIMARY_LOG_DIR;

export class RealtimeHub {
    constructor(options = {}) {
        this.jwtSecret = options.jwtSecret || process.env.JWT_SECRET || 'secreto_patio_777';
        this.wsPath = options.wsPath || '/pb-realtime-ws';
        this.isOriginAllowed = options.isOriginAllowed || (() => false);

        this.clients = new Map();
        this.roomMembers = new Map();

        this.activeSupportSessions = new Map();
        this.SUPPORT_CONSOLE_PASSWORD = String(process.env.SUPPORT_CONSOLE_PASSWORD || 'PB-SOPORTE-2026').trim();
        let supportActiveLogDir = String(process.env.SUPPORT_LOG_DIR || SUPPORT_PRIMARY_LOG_DIR).trim();
        this.getSupportLogFile = () => (supportActiveLogDir ? path.join(supportActiveLogDir, 'logs_soporte.txt') : null);
        this.getSupportErrorFile = () => (supportActiveLogDir ? path.join(supportActiveLogDir, 'errores_soporte.txt') : null);

        this.ensureSupportLogDirectory = () => {
            try {
                const targetDir = String(supportActiveLogDir || '').trim() || SUPPORT_PRIMARY_LOG_DIR;
                if (!fs.existsSync(targetDir)) {
                    try {
                        fs.mkdirSync(targetDir, { recursive: true });
                    } catch (mkdirError) {
                        console.error('[SUPPORT LOG] no se pudo crear directorio de logs; se desactiva persistencia de soporte', mkdirError);
                        supportActiveLogDir = null;
                        return false;
                    }
                }
                supportActiveLogDir = targetDir;
                return true;
            } catch (primaryError) {
                console.error('[SUPPORT LOG] no se pudo preparar ruta principal de logs', primaryError);
                try {
                    if (!fs.existsSync(SUPPORT_FALLBACK_LOG_DIR)) {
                        fs.mkdirSync(SUPPORT_FALLBACK_LOG_DIR, { recursive: true });
                    }
                    supportActiveLogDir = SUPPORT_FALLBACK_LOG_DIR;
                    return true;
                } catch (fallbackError) {
                    console.error('[SUPPORT LOG] no se pudo preparar ruta fallback ./logs', fallbackError);
                    supportActiveLogDir = null;
                    return false;
                }
            }
        };

        this.logSupportError = ({ context = 'support:unknown', error, extra = null }) => {
            const serializeSupportError = (err) => {
                if (!err) return 'unknown-error';
                if (err instanceof Error) {
                    return `${err.name}: ${err.message} | stack=${err.stack || 'n/a'}`;
                }
                try {
                    return JSON.stringify(err);
                } catch {
                    return String(err);
                }
            };

            const formatLogTimestamp = (date = new Date()) => {
                const dd = String(date.getDate()).padStart(2, '0');
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const yyyy = String(date.getFullYear());
                const hh = String(date.getHours()).padStart(2, '0');
                const mi = String(date.getMinutes()).padStart(2, '0');
                const ss = String(date.getSeconds()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
            };

            const details = serializeSupportError(error);
            const extraDetails = extra ? ` | extra=${JSON.stringify(extra)}` : '';
            const line = `[${formatLogTimestamp()}] | CONTEXTO: ${context} | ERROR: ${details}${extraDetails}.\r\n`;

            console.error(`[SUPPORT ERROR] ${context}`, error, extra || {});

            try {
                const hasDirectory = this.ensureSupportLogDirectory();
                const supportErrorFile = this.getSupportErrorFile();
                if (!hasDirectory || !supportErrorFile) return;
                fs.appendFileSync(supportErrorFile, line, { encoding: 'utf8' });
            } catch (writeError) {
                console.error('[SUPPORT ERROR] no se pudo escribir errores_soporte.txt', writeError);
            }
        };

        this.wss = null;
        this.ioShim = createRealtimeIoShim(this);
    }

    hasClient(id) {
        return this.clients.has(id);
    }

    getRoomMembers(room) {
        return this.roomMembers.get(room) || new Set();
    }

    joinRoom(clientId, roomName) {
        if (!clientId || !roomName) return;
        const session = this.clients.get(clientId);
        if (!session) return;

        if (!this.roomMembers.has(roomName)) {
            this.roomMembers.set(roomName, new Set());
        }
        this.roomMembers.get(roomName).add(clientId);
        session.rooms.add(roomName);
    }

    leaveAllRooms(clientId) {
        const session = this.clients.get(clientId);
        if (!session) return;

        for (const roomName of session.rooms) {
            const set = this.roomMembers.get(roomName);
            if (set) {
                set.delete(clientId);
                if (!set.size) {
                    this.roomMembers.delete(roomName);
                }
            }
        }
        session.rooms.clear();
    }

    removeClient(clientId) {
        this.leaveAllRooms(clientId);
        this.clients.delete(clientId);
    }

    broadcast(event, data) {
        const msg = JSON.stringify({
            v: PROTOCOL_VERSION,
            kind: 'emit',
            event,
            data
        });

        for (const session of this.clients.values()) {
            if (session.ws.readyState === 1) {
                session.ws.send(msg);
            }
        }
    }

    emitToRoom(roomName, event, data) {
        const ids = this.roomMembers.get(roomName);
        if (!ids?.size) return;

        const msg = JSON.stringify({
            v: PROTOCOL_VERSION,
            kind: 'emit',
            event,
            data
        });

        for (const clientId of ids) {
            const session = this.clients.get(clientId);
            if (session?.ws.readyState === 1) {
                session.ws.send(msg);
            }
        }
    }

    sendAck(ws, rid, ok, result = {}) {
        if (!rid || ws.readyState !== 1) return;
        if (ok) {
            ws.send(JSON.stringify({
                v: PROTOCOL_VERSION,
                kind: 'ack',
                rid,
                ok: true,
                data: result
            }));
        } else {
            ws.send(JSON.stringify({
                v: PROTOCOL_VERSION,
                kind: 'ack',
                rid,
                ok: false,
                error: String(result?.message || 'error'),
                data: result
            }));
        }
    }

    resolveTokenFromUrl(request) {
        try {
            const url = new URL(request.url, `http://${request.headers.host}`);
            const token = url.searchParams.get('token');
            return token ? String(token) : null;
        } catch {
            return null;
        }
    }

    setSocketIdentity(session, token) {
        if (!token) {
            this.leaveAllRooms(session.id);
            session.data.user = null;
            session.data.supportConsoleAuthorized = false;
            return false;
        }

        try {
            const decoded = jwt.verify(token, this.jwtSecret);
            const role = normalizeRole(decoded?.rol);
            const personalId = Number(decoded?.id);

            if (!role || !personalId) return false;

            this.leaveAllRooms(session.id);

            session.data.user = {
                id: personalId,
                rol: role,
                usuario: decoded?.usuario || null
            };

            this.joinRoom(session.id, `user:${personalId}`);
            const roleRoom = resolveSocketRoomFromRole(role);
            if (roleRoom) {
                this.joinRoom(session.id, `role:${roleRoom}`);
            }

            console.warn(`[DEBUG-ROOMS] Usuario ID:${personalId} rol:${role} -> room:role:${roleRoom} | socketId:${session.id}`);

            if (roleRoom && role !== roleRoom) {
                this.joinRoom(session.id, `role:${role}`);
            }

            if (roleRoom === 'COCINA') {
                this.joinRoom(session.id, 'role:COCINERO');
                console.warn('[DEBUG-ROOMS] -> también unido a role:COCINERO (compatibilidad)');
            }

            if (role === 'CAJERO') {
                this.joinRoom(session.id, 'role:CAJERO');
            }

            return true;
        } catch {
            return false;
        }
    }

    sanitizeSupportId(value) {
        return String(value || '')
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9-]/g, '');
    }

    sanitizePeerId(value) {
        return String(value || '')
            .trim()
            .replace(/[^a-zA-Z0-9_-]/g, '');
    }

    sanitizeLabel(value) {
        return String(value || '')
            .trim()
            .slice(0, 80);
    }

    getActiveSupportSessionsPayload() {
        return Array
            .from(this.activeSupportSessions.values())
            .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
            .map((session) => ({
                support_id: session.supportId,
                user_peer_id: session.userPeerId,
                rol_vista: session.rolVista,
                user_name: session.userName,
                user_local: session.userLocal,
                card_label: `${session.rolVista || 'Soporte'} - ${session.userLocal || 'Sede principal'}`,
                created_at: session.createdAt
            }));
    }

    broadcastActiveSupportSessions() {
        this.ioShim.to('support-console-auth').emit('support:active-sessions-update', {
            sessions: this.getActiveSupportSessionsPayload(),
            updatedAt: Date.now()
        });
    }

    removeSupportSessionBySocket(socketId) {
        for (const [supportId, session] of this.activeSupportSessions.entries()) {
            if (session.socketId === socketId) {
                this.activeSupportSessions.delete(supportId);
                this.ioShim.to(`support:${supportId}`).emit('support:session-ended', {
                    supportId,
                    reason: 'user-disconnected'
                });
            }
        }
    }

    isSupportConsoleAuthorized(session) {
        if (session?.data?.supportConsoleAuthorized) return true;
        const role = String(session?.data?.user?.rol || '').toUpperCase();
        return role === 'ADMINISTRADOR';
    }

    resolveAckFromArgs(args = []) {
        if (!args.length) return null;
        const maybeAck = args[args.length - 1];
        return typeof maybeAck === 'function' ? maybeAck : null;
    }

    attachToServer(server) {
        const wss = new WebSocketServer({ noServer: true });
        this.wss = wss;

        server.on('upgrade', (request, socket, head) => {
            // Debug: registrar cabeceras relevantes para diagnosticar handshakes fallidos
            try {
                const keys = [
                    'host', 'origin', 'upgrade', 'connection', 'sec-websocket-key',
                    'sec-websocket-version', 'sec-websocket-protocol', 'x-forwarded-proto',
                    'x-forwarded-host', 'x-forwarded-for'
                ];
                const hdrs = {};
                for (const k of keys) hdrs[k] = request.headers[k];
                console.log('[REALTIME UPGRADE] incoming upgrade request', { url: request.url, headers: hdrs });
            } catch (e) {
                /* noop */
            }

            let pathname = '';
            try {
                pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
            } catch {
                return;
            }

            if (pathname !== this.wsPath) {
                console.debug(`[REALTIME WS] upgrade ignored (path mismatch): requested=${pathname} expected=${this.wsPath}`);
                return;
            }

            const origin = request.headers.origin;
            if (!this.isOriginAllowed(origin)) {
                console.error(`[REALTIME WS] origen rechazado: ${origin || '(vacío)'} - request.headers=`, request.headers);
                socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
                socket.destroy();
                return;
            }

            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        });

        wss.on('connection', (ws, request) => {
            this.handleWsConnection(ws, request);
        });

        console.log(`✅ WebSocket nativo (ws) en path: ${this.wsPath}`);
    }

    handleWsConnection(ws, request) {
        const clientId = randomUUID();
        const session = {
            id: clientId,
            ws,
            rooms: new Set(),
            data: {
                user: null,
                supportConsoleAuthorized: false
            }
        };

        this.clients.set(clientId, session);

        const queryToken = this.resolveTokenFromUrl(request);
        if (queryToken) {
            const identified = this.setSocketIdentity(session, queryToken);
            if (identified) {
                console.log(`🔐 WS autenticado por query: ${clientId} -> user:${session.data.user.id}`);
                if (String(session.data?.user?.rol || '').toUpperCase() === 'ADMINISTRADOR') {
                    session.data.supportConsoleAuthorized = true;
                    this.joinRoom(clientId, 'support-console-auth');
                }
            }
        }

        console.log(`[REALTIME WS] Cliente conectado: ${clientId}`);

        ws.on('message', (raw) => {
            let msg;
            try {
                msg = JSON.parse(String(raw || ''));
            } catch {
                return;
            }

            if (!msg || Number(msg.v) !== PROTOCOL_VERSION || msg.kind !== 'call' || !msg.event) {
                return;
            }

            const rid = msg.rid || null;
            const payload = msg.data !== undefined ? msg.data : {};
            const reply = rid
                ? (result) => {
                    const ok = !!(result && result.success !== false);
                    this.sendAck(ws, rid, ok, result || {});
                }
                : () => {};

            try {
                this.dispatchClientEvent(session, msg.event, payload, reply);
            } catch (error) {
                console.error(`[REALTIME WS] error en ${msg.event}:`, error);
                if (rid) {
                    this.sendAck(ws, rid, false, { success: false, message: error?.message || 'handler-error' });
                }
            }
        });

        ws.on('close', () => {
            this.removeSupportSessionBySocket(clientId);
            this.broadcastActiveSupportSessions();
            this.removeClient(clientId);
            console.log(`[REALTIME WS] Cliente desconectado: ${clientId}`);
        });

        ws.on('error', (err) => {
            console.error(`[REALTIME WS] error socket ${clientId}:`, err?.message || err);
        });
    }

    dispatchClientEvent(session, eventName, payload, ack) {
        const registerSupport = (handler) => {
            try {
                handler(payload, ack);
            } catch (error) {
                this.logSupportError({
                    context: `ws:${eventName}`,
                    error,
                    extra: {
                        socketId: session.id,
                        userId: session.data?.user?.id || null
                    }
                });
                if (typeof ack === 'function') {
                    ack({ success: false, message: 'support-handler-error' });
                }
            }
        };

        switch (eventName) {
            case 'authenticate': {
                const ok = this.setSocketIdentity(session, payload?.token);
                if (ok) {
                    console.log(`🔐 Reautenticación WS OK: ${session.id} -> user:${session.data.user.id}`);
                    if (String(session.data?.user?.rol || '').toUpperCase() === 'ADMINISTRADOR') {
                        session.data.supportConsoleAuthorized = true;
                        this.joinRoom(session.id, 'support-console-auth');
                    }
                }
                ack({ success: ok });
                break;
            }

            case 'join-room': {
                const room = String(payload || '').trim();
                if (room) {
                    this.joinRoom(session.id, room);
                    console.log(`🏠 Cliente unido a sala: ${room}`);
                }
                ack({ success: true });
                break;
            }

            case 'join-private-room':
                registerSupport(() => {
                    const requestedPersonalId = Number(payload?.personal_id || payload?.id || 0);
                    const authenticatedPersonalId = Number(session?.data?.user?.id || 0);
                    const targetPersonalId = authenticatedPersonalId || requestedPersonalId;

                    if (!targetPersonalId) {
                        ack({ success: false, message: 'missing-personal-id' });
                        return;
                    }

                    if (authenticatedPersonalId && requestedPersonalId && authenticatedPersonalId !== requestedPersonalId) {
                        ack({ success: false, message: 'personal-id-mismatch' });
                        return;
                    }

                    const privateRoom = `user:${targetPersonalId}`;
                    this.joinRoom(session.id, privateRoom);
                    console.log(`🔒 Cliente unido a sala privada: ${privateRoom}`);
                    ack({ success: true, room: privateRoom });
                });
                break;

            case 'configurar-usuario':
                registerSupport(() => {
                    const requestedPersonalId = Number(payload?.id || 0);
                    const authenticatedPersonalId = Number(session?.data?.user?.id || 0);
                    const targetPersonalId = authenticatedPersonalId || requestedPersonalId;

                    if (!targetPersonalId) {
                        ack({ success: false, message: 'missing-user-id' });
                        return;
                    }

                    if (authenticatedPersonalId && requestedPersonalId && authenticatedPersonalId !== requestedPersonalId) {
                        ack({ success: false, message: 'user-id-mismatch' });
                        return;
                    }

                    const privateRoom = `user:${targetPersonalId}`;
                    this.joinRoom(session.id, privateRoom);
                    console.log(`🔒 Cliente configurado en sala privada: ${privateRoom}`);
                    ack({ success: true, room: privateRoom });
                });
                break;

            case 'log':
                console.log(`[CLIENT LOG] ${payload}`);
                ack({ success: true });
                break;

            case 'test-event':
                ack({ success: true, echo: payload });
                break;

            case 'support:register-request':
                registerSupport(() => {
                    const supportId = this.sanitizeSupportId(payload.supportId);
                    const userPeerId = this.sanitizePeerId(payload.userPeerId);
                    const rolVista = this.sanitizeLabel(payload.rol_vista) || 'Soporte';
                    const userName = this.sanitizeLabel(payload.nombre_usuario || payload.userName) || session.data?.user?.usuario || 'Usuario';
                    const userLocal = this.sanitizeLabel(payload.userLocal) || 'Local principal';

                    if (!supportId || supportId.length < 4 || !userPeerId) {
                        ack({ success: false, message: 'invalid-support-payload' });
                        return;
                    }

                    this.activeSupportSessions.set(supportId, {
                        supportId,
                        userPeerId,
                        rolVista,
                        userName,
                        userLocal,
                        socketId: session.id,
                        createdAt: Date.now()
                    });

                    this.joinRoom(session.id, `support:${supportId}`);
                    this.broadcastActiveSupportSessions();

                    ack({
                        success: true,
                        supportId,
                        userPeerId
                    });
                });
                break;

            case 'support:unregister-request':
                registerSupport(() => {
                    const supportId = this.sanitizeSupportId(payload.supportId);
                    const sess = this.activeSupportSessions.get(supportId);

                    if (sess && sess.socketId === session.id) {
                        this.activeSupportSessions.delete(supportId);
                        this.ioShim.to(`support:${supportId}`).emit('support:session-ended', {
                            supportId,
                            reason: 'user-closed-session'
                        });
                        this.broadcastActiveSupportSessions();
                    }

                    ack({ success: true });
                });
                break;

            case 'support:validate-session':
                registerSupport(() => {
                    const supportId = this.sanitizeSupportId(payload.supportId);
                    const sess = this.activeSupportSessions.get(supportId);
                    const isActive = !!sess && this.clients.has(sess.socketId);

                    if (!isActive && supportId) {
                        this.activeSupportSessions.delete(supportId);
                    }

                    if (isActive) {
                        this.joinRoom(session.id, `support:${supportId}`);
                    }

                    ack({
                        success: true,
                        active: isActive,
                        supportId,
                        userPeerId: isActive ? sess.userPeerId : null,
                        rol_vista: isActive ? sess.rolVista : null,
                        user_name: isActive ? sess.userName : null,
                        user_local: isActive ? sess.userLocal : null
                    });
                });
                break;

            case 'support:end-session':
                registerSupport(() => {
                    const supportId = this.sanitizeSupportId(payload.supportId);
                    const sess = this.activeSupportSessions.get(supportId);

                    if (sess) {
                        this.activeSupportSessions.delete(supportId);
                        this.ioShim.to(`support:${supportId}`).emit('support:session-ended', {
                            supportId,
                            reason: 'support-closed-session'
                        });
                        this.broadcastActiveSupportSessions();
                    }

                    ack({ success: true });
                });
                break;

            case 'support:request-active-sessions':
                registerSupport(() => {
                    if (!this.isSupportConsoleAuthorized(session)) {
                        ack({ success: false, message: 'support-console-unauthorized' });
                        return;
                    }

                    const snapshot = {
                        sessions: this.getActiveSupportSessionsPayload(),
                        updatedAt: Date.now()
                    };

                    ack({ success: true, ...snapshot });
                });
                break;

            case 'support:chat-to-user':
                registerSupport(() => {
                    const supportId = this.sanitizeSupportId(payload.supportId);
                    const message = this.sanitizeLabel(payload.message);
                    if (!supportId || !message) {
                        ack({ success: false, message: 'invalid-chat-payload' });
                        return;
                    }

                    this.ioShim.to(`support:${supportId}`).emit('support:chat-message', {
                        supportId,
                        from: 'support',
                        message,
                        ts: Date.now()
                    });

                    ack({ success: true });
                });
                break;

            case 'support:authorize-console':
                registerSupport(() => {
                    const password = String(payload?.password || '').trim();
                    const allowed = password && password === this.SUPPORT_CONSOLE_PASSWORD;

                    if (allowed) {
                        session.data.supportConsoleAuthorized = true;
                        this.joinRoom(session.id, 'support-console-auth');
                    }

                    ack({ success: true, authorized: !!allowed });
                });
                break;

            case 'support:connected':
                registerSupport(() => {
                    const supportId = this.sanitizeSupportId(payload.supportId);
                    const sess = this.activeSupportSessions.get(supportId);

                    if (sess) {
                        this.ioShim.to(`support:${supportId}`).emit('support:connected', {
                            supportId,
                            by: 'support',
                            ts: Date.now()
                        });
                    }

                    ack({ success: true });
                });
                break;

            case 'support:chat-to-support':
                registerSupport(() => {
                    const supportId = this.sanitizeSupportId(payload.supportId);
                    const message = this.sanitizeLabel(payload.message);
                    if (!supportId || !message) {
                        ack({ success: false, message: 'invalid-chat-payload' });
                        return;
                    }

                    this.ioShim.to(`support:${supportId}`).emit('support:chat-message', {
                        supportId,
                        from: 'user',
                        message,
                        ts: Date.now()
                    });

                    ack({ success: true });
                });
                break;

            case 'support:save-log-file':
                registerSupport(() => {
                    try {
                        const supportId = this.sanitizeSupportId(payload.support_id || payload.supportId);
                        const modulo = this.sanitizeLabel(payload.modulo || payload.rol_vista) || 'Operacion';
                        const user = this.sanitizeLabel(payload.user || payload.usuario || payload.user_name) || 'Usuario';
                        const duracion = String(payload.tiempo || payload.duracion || '00:00:00').trim();

                        if (!supportId) {
                            ack({ success: false, message: 'invalid-support-id' });
                            return;
                        }

                        const hasDirectory = this.ensureSupportLogDirectory();
                        const supportLogFile = this.getSupportLogFile();
                        if (!hasDirectory || !supportLogFile) {
                            ack({ success: true, persisted: false, path: null });
                            return;
                        }

                        const formatLogTimestamp = (date = new Date()) => {
                            const dd = String(date.getDate()).padStart(2, '0');
                            const mm = String(date.getMonth() + 1).padStart(2, '0');
                            const yyyy = String(date.getFullYear());
                            const hh = String(date.getHours()).padStart(2, '0');
                            const mi = String(date.getMinutes()).padStart(2, '0');
                            const ss = String(date.getSeconds()).padStart(2, '0');
                            return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
                        };

                        const line = `[${formatLogTimestamp()}] | ID: ${supportId} | MÓDULO: ${modulo} | USUARIO: ${user} | DURACIÓN: ${duracion}.\r\n`;
                        fs.appendFileSync(supportLogFile, line, { encoding: 'utf8' });

                        ack({
                            success: true,
                            persisted: true,
                            path: supportLogFile
                        });
                    } catch (error) {
                        this.logSupportError({
                            context: 'ws:support:save-log-file:write',
                            error,
                            extra: {
                                payloadSupportId: payload?.support_id || payload?.supportId || null,
                                socketId: session.id
                            }
                        });
                        ack({
                            success: false,
                            message: error?.message || 'support-log-write-error'
                        });
                    }
                });
                break;

            case 'support:log-client-error':
                registerSupport(() => {
                    const context = this.sanitizeLabel(payload?.context || 'frontend-support') || 'frontend-support';
                    const message = this.sanitizeLabel(payload?.message || 'client-error') || 'client-error';
                    const stack = String(payload?.stack || '').slice(0, 2000);
                    const clientExtra = payload?.extra && typeof payload.extra === 'object' ? payload.extra : null;
                    const errorType = this.sanitizeLabel(payload?.errorType || '') || null;
                    const errorName = this.sanitizeLabel(payload?.errorName || '') || null;

                    this.logSupportError({
                        context: `client:${context}`,
                        error: `${message}${stack ? ` | stack=${stack}` : ''}`,
                        extra: {
                            supportId: this.sanitizeSupportId(payload?.supportId || payload?.support_id),
                            socketId: session.id,
                            userId: session.data?.user?.id || null,
                            errorType,
                            errorName,
                            clientExtra
                        }
                    });

                    ack({ success: true });
                });
                break;

            default:
                ack({ success: false, message: `unknown-event:${eventName}` });
                break;
        }
    }
}

/**
 * @param {import('http').Server} server
 * @param {import('express').Application} app
 */
export function attachRealtimeWebSocket(server, app, {
    isOriginAllowed = (origin) => {
        // Permitir forzar todos los orígenes mediante variable de entorno (útil temporalmente)
        const allowAll = String(process.env.REALTIME_ALLOW_ALL_ORIGINS || '').toLowerCase() === 'true';
        if (allowAll) return true;

        const nodeEnv = String(process.env.NODE_ENV || 'development').trim().toLowerCase();
        if (nodeEnv !== 'production') {
            // En desarrollo permitir conexiones (localhost / herramientas) para no bloquear upgrades
            return true;
        }

        if (!origin) return false;
        const allowed = [
            'https://app.patiobohemio.com',
            'https://www.app.patiobohemio.com',
            'https://mango.hazlosoftware.com',
            'https://www.mango.hazlosoftware.com'
        ].map(o => o.replace(/\/+$/, ''));
        const normalized = String(origin || '').trim().replace(/\/+$/, '');
        return allowed.includes(normalized);
    },
    jwtSecret = process.env.JWT_SECRET,
    wsPath = '/pb-realtime-ws'
} = {}) {
    const hub = new RealtimeHub({
        jwtSecret,
        wsPath,
        isOriginAllowed
    });

    hub.attachToServer(server);

    // enable keepalive pings to detect stale sockets
    try {
        const pingMs = Number(process.env.REALTIME_PING_MS || 30000);
        enableKeepAlive(hub, { pingIntervalMs: pingMs });
        console.log(`[REALTIME] keepalive enabled (ping ${pingMs}ms)`);
    } catch (err) {
        console.warn('[REALTIME] failed to enable keepalive', err);
    }

    // optional: attach redis adapter when REDIS_URL provided
    if (process.env.REDIS_URL) {
        try {
            const adapter = createRealtimeRedisAdapter(hub, {
                redisUrl: process.env.REDIS_URL,
                prefix: process.env.REALTIME_REDIS_PREFIX || 'pb:realtime'
            });
            hub.redisAdapter = adapter;
            console.log('[REALTIME] redis adapter attached');
        } catch (err) {
            console.warn('[REALTIME] failed to init redis adapter', err);
        }
    }

    app.set('socketio', hub.ioShim);
    app.set('realtimeHub', hub);

    return hub;
}

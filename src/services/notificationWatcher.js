import db from '../config/db.js';
import { normalizeSocketRoom } from '../utils/roles.js';
import { COMANDA_ESTADOS, MESA_ESTADOS, SOCKET_EVENTS } from '../constants/domainConstants.js';

const WATCH_INTERVAL_MS = Number(process.env.NOTIFICATIONS_WATCH_INTERVAL_MS || 800);
const WATCH_BATCH_SIZE = Number(process.env.NOTIFICATIONS_WATCH_BATCH_SIZE || 50);
const EVENTS_WITH_COMANDA_SUMMARY = new Set([
  SOCKET_EVENTS.NUEVA_COMANDA,
  SOCKET_EVENTS.EDITAR_COMANDA,
  SOCKET_EVENTS.NUEVO_PRODUCTO_COMANDA,
  SOCKET_EVENTS.EDITAR_PRODUCTO_COMANDA,
  SOCKET_EVENTS.BORRAR_PRODUCTO_COMANDA,
  SOCKET_EVENTS.SOLICITUD_CUENTA,
  SOCKET_EVENTS.COMANDA_PAGADA,
  SOCKET_EVENTS.COMANDA_CERRADA
]);

/** Sonido sugerido por evento (null = silencio). Se inyecta en el payload. */
const SOUND_MAP = {
  [SOCKET_EVENTS.NUEVA_COMANDA]:           'new_order.mp3',
  [SOCKET_EVENTS.EDITAR_COMANDA]:          'edit_warning.mp3',
  [SOCKET_EVENTS.BORRAR_COMANDA]:          'bell_ding.mp3',
  [SOCKET_EVENTS.NUEVO_PRODUCTO_COMANDA]:  'new_order.mp3',
  [SOCKET_EVENTS.EDITAR_PRODUCTO_COMANDA]: 'edit_warning.mp3',
  [SOCKET_EVENTS.BORRAR_PRODUCTO_COMANDA]: 'bell_ding.mp3',
  [SOCKET_EVENTS.SOLICITUD_CUENTA]:        'cash_register.mp3',
  [SOCKET_EVENTS.COMANDA_CERRADA]:         null,
  [SOCKET_EVENTS.COMANDA_PAGADA]:          'success_finish.mp3',
  [SOCKET_EVENTS.PLATO_LISTO]:             'bell_ding.mp3',
  [SOCKET_EVENTS.ABRIR_CAJON]:             null,
  // Eventos de Admin (triggers existentes)
  [SOCKET_EVENTS.CONFIG_CAMBIO]:           'system_update.mp3',
  [SOCKET_EVENTS.ALERTA_ADMIN]:            'bell_ding.mp3',
  [SOCKET_EVENTS.NUEVO_PRODUCTO]:          'system_update.mp3',
  [SOCKET_EVENTS.ESTADO_CAMBIO]:           'edit_warning.mp3',
};

const CANONICAL_EVENT_MAP = {
  [SOCKET_EVENTS.SOLICITUD_CUENTA]: SOCKET_EVENTS.COMANDA_CERRADA,
  [SOCKET_EVENTS.COMANDA_CERRADA]: SOCKET_EVENTS.COMANDA_CERRADA,
  [SOCKET_EVENTS.COMANDA_PAGADA]: SOCKET_EVENTS.COMANDA_PAGADA
};

const LEGACY_EVENT_ALIASES = {
  'plato-listo': SOCKET_EVENTS.PLATO_LISTO
};

const RAW_DB_PAYLOAD_EVENTS = new Set([
  SOCKET_EVENTS.NUEVO_PRODUCTO_COMANDA
]);

let timer = null;
let isRunning = false;
let warnedMissingTable = false;

const resolveTargetsFromScope = (scopeRaw) => {
  const scope = String(scopeRaw || '').trim();
  if (!scope || /^broadcast$/i.test(scope)) {
    return [{ type: 'broadcast' }];
  }

  const chunks = scope
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const unique = new Set();
  const targets = [];

  for (const chunk of chunks) {
    if (/^broadcast$/i.test(chunk)) {
      if (!unique.has('broadcast')) {
        unique.add('broadcast');
        targets.push({ type: 'broadcast' });
      }
      continue;
    }

    if (/^user:/i.test(chunk)) {
      const userId = Number(String(chunk).split(':')[1]);
      if (Number.isInteger(userId) && userId > 0) {
        const key = `user:${userId}`;
        if (!unique.has(key)) {
          unique.add(key);
          targets.push({ type: 'user', userId });
        }
      }
      continue;
    }

    if (/^role:/i.test(chunk)) {
      const room = normalizeSocketRoom(String(chunk).split(':')[1]);
      if (room) {
        const key = `role:${room}`;
        if (!unique.has(key)) {
          unique.add(key);
          targets.push({ type: 'role', room });
        }
      }
      continue;
    }
  }

  return targets.length ? targets : [{ type: 'broadcast' }];
};

const tryParsePayload = (rawPayload) => {
  if (!rawPayload) return {};
  if (typeof rawPayload === 'object') return rawPayload;

  try {
    return JSON.parse(rawPayload);
  } catch (_error) {
    return {};
  }
};

const fetchComandaSummary = async (comandaId, summaryCache = null) => {
  const numericId = Number(comandaId || 0);
  if (!numericId) return null;

  if (summaryCache?.has(numericId)) {
    return summaryCache.get(numericId);
  }

  const summaryPromise = (async () => {
    const [comandaRows] = await db.query(
      `SELECT
        c.id,
        c.mesa_id,
        c.personal_id,
        c.total_final,
        c.total_sin_servicio,
        m.nombre AS nombre_mesa
       FROM comandas c
       LEFT JOIN mesas m ON m.id = c.mesa_id
       WHERE c.id = ?
       LIMIT 1`,
      [numericId]
    );

    if (!comandaRows.length) return null;

    const [itemsRows] = await db.query(
      `SELECT
        cd.id,
        cd.producto_id,
        cd.cantidad,
        cd.estado_producto,
        p.nombre AS nombre_producto
       FROM comandas_detalle cd
       LEFT JOIN productos p ON p.id = cd.producto_id
       WHERE cd.comanda_id = ?
       ORDER BY cd.id ASC`,
      [numericId]
    );

    const row = comandaRows[0];
    return {
      id: Number(row.id),
      id_comanda: Number(row.id),
      comanda_id: Number(row.id),
      mesa_id: Number(row.mesa_id || 0),
      id_mesa: Number(row.mesa_id || 0),
      nombre_mesa: row.nombre_mesa || null,
      personal_id: Number(row.personal_id || 0),
      id_mesero: Number(row.personal_id || 0),
      total_final: Number(row.total_final || 0),
      total_sin_servicio: Number(row.total_sin_servicio || 0),
      items: (itemsRows || []).map((item) => ({
        id_detalle: Number(item.id),
        id_producto: Number(item.producto_id),
        nombre_producto: item.nombre_producto || null,
        cantidad: Number(item.cantidad || 0),
        estado_producto: item.estado_producto || null
      }))
    };
  })();

  if (summaryCache) {
    summaryCache.set(numericId, summaryPromise);
  }

  return summaryPromise;
};

const enrichPayload = async (eventName, originalPayload, targets, context = {}) => {
  const payload = {
    ...originalPayload
  };

  const comandaId = Number(payload.comanda_id || payload.id_comanda || payload.id || 0);

  if (comandaId) {
    payload.comanda_id = comandaId;
    payload.id_comanda = comandaId;
    payload.id = comandaId;
  }

  if (EVENTS_WITH_COMANDA_SUMMARY.has(eventName)) {
    const summary = comandaId ? await fetchComandaSummary(comandaId, context.summaryCache) : null;
    if (summary) {
      Object.assign(payload, summary);
    }
  }

  if (eventName === SOCKET_EVENTS.COMANDA_PAGADA || eventName === SOCKET_EVENTS.COMANDA_CERRADA) {
    const summary = comandaId ? await fetchComandaSummary(comandaId, context.summaryCache) : null;
    if (summary) {
      payload.id_mesa = summary.id_mesa;
      payload.mesa_id = summary.mesa_id;
    }
    if (eventName === SOCKET_EVENTS.COMANDA_CERRADA) {
      payload.estado_comanda = payload.estado_comanda || COMANDA_ESTADOS.CERRADA;
      payload.estado = payload.estado || MESA_ESTADOS.EN_CAJA;
    }

    if (eventName === SOCKET_EVENTS.COMANDA_PAGADA) {
      payload.estado_comanda = payload.estado_comanda || COMANDA_ESTADOS.PAGADA;
      payload.estado = payload.estado || MESA_ESTADOS.LIBRE;
    }
  }

  if (eventName === SOCKET_EVENTS.SOLICITUD_CUENTA) {
    payload.estado_comanda = payload.estado_comanda || COMANDA_ESTADOS.CERRADA;
    payload.estado = payload.estado || MESA_ESTADOS.EN_CAJA;
  }

  if (eventName === SOCKET_EVENTS.PLATO_LISTO) {
    const userTarget = targets.find((target) => target.type === 'user');
    if (userTarget?.userId) {
      payload.personal_id = Number(payload.personal_id || userTarget.userId);
      payload.id_mesero = Number(payload.id_mesero || userTarget.userId);
    }
  }

  if (payload.detalle_id !== undefined) payload.detalle_id = Number(payload.detalle_id || 0);
  if (payload.producto_id !== undefined) payload.producto_id = Number(payload.producto_id || 0);
  if (payload.id_mesa !== undefined) payload.id_mesa = Number(payload.id_mesa || 0);
  if (payload.mesa_id !== undefined) payload.mesa_id = Number(payload.mesa_id || 0);

  // Inyectar sonido desde SOUND_MAP si no existe
  if (!payload.sound && eventName in SOUND_MAP) {
    payload.sound = SOUND_MAP[eventName] || null;
  }

  return payload;
};

const emitToTarget = (io, eventName, payload, target) => {
  if (target.type === 'broadcast') {
    io.emit(eventName, payload);
    return;
  }

  if (target.type === 'role') {
    io.to(`role:${target.room}`).emit(eventName, payload);
    return;
  }

  if (target.type === 'user') {
    io.to(`user:${target.userId}`).emit(eventName, payload);
  }
};

const emitNotification = async (io, notification, context = {}) => {
  const rawEventName = String(notification.evento || '').trim();
  const eventName = LEGACY_EVENT_ALIASES[rawEventName] || rawEventName;
  if (!eventName) return;

  // Para eventos de admin: usar Broadcast por defecto
  const isAdminEvent = [SOCKET_EVENTS.CONFIG_CAMBIO, SOCKET_EVENTS.ALERTA_ADMIN, SOCKET_EVENTS.NUEVO_PRODUCTO, SOCKET_EVENTS.ESTADO_CAMBIO].includes(eventName);
  const scope = notification.destinatario_scope || (isAdminEvent ? 'Broadcast' : '');
  const targets = resolveTargetsFromScope(scope);

  if (RAW_DB_PAYLOAD_EVENTS.has(eventName)) {
    const payload = tryParsePayload(notification.payload);
    for (const target of targets) {
      emitToTarget(io, eventName, payload, target);
    }
    return;
  }

  const notificationId = Number(notification.id || 0);
  const payload = await enrichPayload(eventName, tryParsePayload(notification.payload), targets, context);
  if (notificationId > 0) {
    payload.notification_id = notificationId;
  }
  payload.event_name = eventName;
  payload.canonical_event = CANONICAL_EVENT_MAP[eventName] || eventName;


  for (const target of targets) {
    emitToTarget(io, eventName, payload, target);
  }

  // Contrato canónico: cuando una comanda pasa a Cerrada emitimos comanda-cerrada
  // para consumidores de transición de estado (mesero/admin),
  // manteniendo solicitud-cuenta para compatibilidad en caja.
  if (eventName === SOCKET_EVENTS.SOLICITUD_CUENTA) {
    const meseroId = Number(payload?.id_mesero || payload?.personal_id || 0);
    console.warn('[DEBUG-STEP][WATCHER-1] solicitud-cuenta detectado. meseroId=', meseroId, 'payload=', JSON.stringify(payload));
    const canonicalPayload = {
      ...payload,
      comanda_id: Number(payload?.comanda_id || payload?.id_comanda || payload?.id || 0),
      id_comanda: Number(payload?.comanda_id || payload?.id_comanda || payload?.id || 0),
      mesa_id: Number(payload?.mesa_id || payload?.id_mesa || 0),
      id_mesa: Number(payload?.id_mesa || payload?.mesa_id || 0),
      canonical_event: SOCKET_EVENTS.COMANDA_CERRADA,
      source_event: SOCKET_EVENTS.SOLICITUD_CUENTA,
      derived_event: true
    };

    // [DEBUG] Listar sockets activos en role:COCINA antes de emitir
    const socketsEnCocina = io.sockets.adapter.rooms.get('role:COCINA');
    console.warn('[DEBUG-STEP][WATCHER-2] Emitiendo comanda-cerrada. canonicalPayload=', JSON.stringify(canonicalPayload));
    console.warn('[DEBUG-STEP][WATCHER-2b] Sockets en role:COCINA:', socketsEnCocina ? [...socketsEnCocina] : '*** NINGUNO - ROOM VACÍA ***');
    emitToTarget(io, SOCKET_EVENTS.COMANDA_CERRADA, canonicalPayload, { type: 'role', room: 'CAJA' });
    emitToTarget(io, SOCKET_EVENTS.COMANDA_CERRADA, canonicalPayload, { type: 'role', room: 'ADMIN' });
    emitToTarget(io, SOCKET_EVENTS.COMANDA_CERRADA, canonicalPayload, { type: 'role', room: 'COCINA' });
    emitToTarget(io, SOCKET_EVENTS.COMANDA_CERRADA, canonicalPayload, { type: 'role', room: 'BARISTA' });
    emitToTarget(io, SOCKET_EVENTS.COMANDA_CERRADA, canonicalPayload, { type: 'role', room: 'BARTENDER' });
    console.warn('[DEBUG-STEP][WATCHER-3] Emitido a 5 rooms (CAJA/ADMIN/COCINA/BARISTA/BARTENDER). meseroId=', meseroId);

    if (meseroId > 0) {
      emitToTarget(io, SOCKET_EVENTS.COMANDA_CERRADA, canonicalPayload, { type: 'user', userId: meseroId });
    }
  }
};

const readPending = async () => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM registro_notificaciones WHERE procesado = 0 ORDER BY created_at ASC`
    );

    warnedMissingTable = false;
    return rows || [];
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      if (!warnedMissingTable) {
        console.warn('[watcher] Tabla registro_notificaciones no existe. Ejecuta scripts/sql/create_notification_triggers.sql.');
        warnedMissingTable = true;
      }
      return [];
    }

    throw error;
  }
};

const markProcessedBatch = async (notificationIds = []) => {
  const ids = Array.from(
    new Set(
      notificationIds
        .map((value) => Number(value || 0))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );

  if (!ids.length) return;

  try {
    const placeholders = ids.map(() => '?').join(', ');
    await db.query(
      `UPDATE registro_notificaciones
       SET procesado = 1
       WHERE id IN (${placeholders})`,
      ids
    );

    warnedMissingTable = false;
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      if (!warnedMissingTable) {
        console.warn('[watcher] Tabla registro_notificaciones no existe. Ejecuta scripts/sql/create_notification_triggers.sql.');
        warnedMissingTable = true;
      }
      return;
    }

    throw error;
  }
};

const tick = async (io) => {
  if (isRunning) return;
  isRunning = true;

  try {
    const pending = await readPending();
    if (!pending.length) return;

    const context = {
      summaryCache: new Map()
    };
    const processedIds = [];

    for (const notification of pending) {
      try {
        await emitNotification(io, notification, context);
        const notificationId = Number(notification.id || 0);
        if (notificationId > 0) {
          processedIds.push(notificationId);
        }
      } catch (error) {
        console.error(`[watcher] Error emitiendo notificacion ${notification.id}:`, error?.message || error);
      }
    }

    await markProcessedBatch(processedIds);
  } catch (error) {
    console.error('[watcher] Error leyendo notificaciones pendientes:', error?.message || error);
  } finally {
    isRunning = false;
  }
};

export const startNotificationWatcher = ({ io }) => {
  if (!io) return () => {};

  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    tick(io).catch(() => {});
  }, WATCH_INTERVAL_MS);

  // Ejecutar una pasada al iniciar.
  tick(io).catch(() => {});

  console.log(`[watcher] Notificaciones en tiempo real activadas (intervalo: ${WATCH_INTERVAL_MS}ms).`);

  return () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };
};

import db from '../config/db.js';
import { normalizeSocketRoom } from '../utils/roles.js';

const NOTIFICATION_BATCH_SIZE = Number(process.env.NOTIFICATIONS_POLL_BATCH_SIZE || 50);

const parsePayload = (rawPayload) => {
  if (!rawPayload) return {};
  if (typeof rawPayload === 'object') return rawPayload;

  try {
    return JSON.parse(rawPayload);
  } catch (_error) {
    return {};
  }
};

export const getNotificacionesPendientes = async (req, res) => {
  const roleParam = String(req.params.rol || req.query.rol || '').trim();
  const requestedScope = normalizeSocketRoom(roleParam || req.user?.rol);
  const userScope = normalizeSocketRoom(req.user?.rol);
  const userId = Number(req.user?.id || 0);
  const parsedUltimoId = Number.parseInt(String(req.query?.ultimoId ?? '0'), 10);
  const ultimoId = Number.isFinite(parsedUltimoId) && parsedUltimoId > 0 ? parsedUltimoId : 0;

  if (!requestedScope || !userScope || requestedScope !== userScope) {
    return res.status(403).json({ success: false, message: 'No autorizado para consultar este scope.' });
  }

  try {
    const [rows] = await db.query(
      `SELECT id, evento, destinatario_scope, payload, created_at
       FROM registro_notificaciones
       WHERE id > ?
         AND COALESCE(procesado, 0) = 0
         AND (
           destinatario_scope LIKE ?
           OR destinatario_scope = 'Broadcast'
           OR destinatario_scope = ?
         )
       ORDER BY id ASC
       LIMIT ?`,
      [
        ultimoId,
        `%role:${requestedScope}%`,
        `user:${userId}`,
        NOTIFICATION_BATCH_SIZE
      ]
    );

    const notifications = Array.isArray(rows) ? rows : [];
    const maxId = notifications.reduce((acc, notification) => {
      const id = Number(notification.id || 0);
      return id > acc ? id : acc;
    }, Math.trunc(ultimoId));

    return res.json({
      success: true,
      ultimoId: maxId,
      data: notifications.map((notification) => ({
        id: Number(notification.id),
        evento: String(notification.evento || '').trim(),
        destinatario_scope: notification.destinatario_scope || null,
        payload: parsePayload(notification.payload),
        created_at: notification.created_at || null
      }))
    });
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      return res.json({ success: true, data: [], ultimoId: Math.trunc(ultimoId) });
    }

    console.error(error);
    console.error('Error en getNotificacionesPendientes:', error);
    return res.status(500).json({ success: false, message: 'Error al consultar notificaciones pendientes.' });
  }
};
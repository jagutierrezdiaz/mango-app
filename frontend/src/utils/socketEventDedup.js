const nowMs = () => Date.now();

export const createSocketDeduper = (windowMs = 1800) => {
  const seen = new Map();

  const cleanup = () => {
    const cutoff = nowMs() - windowMs * 2;
    for (const [key, ts] of seen.entries()) {
      if (ts < cutoff) seen.delete(key);
    }
  };

  return (eventName, payload = {}, customKey = '') => {
    const notificationId = Number(payload?.notification_id || 0);
    const comandaId = Number(payload?.comanda_id || payload?.id_comanda || payload?.id || 0);
    const mesaId = Number(payload?.id_mesa || payload?.mesa_id || 0);

    const key = customKey || (notificationId > 0
      ? `n:${notificationId}:${eventName}`
      : `e:${eventName}:c:${comandaId}:m:${mesaId}`);

    const ts = seen.get(key);
    const now = nowMs();
    if (ts && now - ts < windowMs) {
      return false;
    }

    seen.set(key, now);
    if (seen.size > 250) cleanup();
    return true;
  };
};

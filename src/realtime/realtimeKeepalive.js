// src/realtime/realtimeKeepalive.js
export function enableKeepAlive(hub, {
  pingIntervalMs = 30000
} = {}) {
  if (!hub || !hub.wss) throw new Error('hub.wss required');

  // marcar y responder pong
  hub.wss.on('connection', (ws) => {
    try { ws._pb_isAlive = true; } catch (_) {}
    try {
      ws.on('pong', () => {
        try { ws._pb_isAlive = true; } catch (_) {}
      });
    } catch (_) {}
  });

  // ping periódico
  hub._pb_keepAliveTimer = setInterval(() => {
    try {
      for (const [clientId, session] of hub.clients.entries()) {
        const ws = session?.ws;
        if (!ws) continue;

        // si no respondió al último ping -> terminar
        if (ws._pb_isAlive === false) {
          try { ws.terminate(); } catch (_e) { /* noop */ }
          try { hub.removeClient(clientId); } catch (_e) { /* noop */ }
          continue;
        }

        // marcar como esperando y enviar ping
        try { ws._pb_isAlive = false; } catch (_e) {}
        try { ws.ping(); } catch (_e) { /* noop */ }
      }
    } catch (err) {
      console.error('[keepalive] error en el ciclo de ping', err);
    }
  }, pingIntervalMs);

  hub.stopKeepAlive = () => {
    if (hub._pb_keepAliveTimer) {
      clearInterval(hub._pb_keepAliveTimer);
      hub._pb_keepAliveTimer = null;
    }
  };

  return hub;
}

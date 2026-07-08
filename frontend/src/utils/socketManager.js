// frontend/src/utils/socketManager.js
// Simple manager that proxies subscriptions to the current socket and re-attaches on pb:socket-ready.
const subscriptions = new Map(); // key -> [{ event, handler }]
let currentSocket = null;
let bound = false;

function attachToSocket(sock) {
  // detach old
  if (currentSocket && currentSocket !== sock) {
    for (const subs of subscriptions.values()) {
      for (const s of subs) {
        try { currentSocket.off(s.event, s.handler); } catch (_) {}
      }
    }
  }
  currentSocket = sock;

  if (!currentSocket) return;
  for (const subs of subscriptions.values()) {
    for (const s of subs) {
      try { currentSocket.on(s.event, s.handler); } catch (_) {}
    }
  }
}

function ensureBoundToWindowEvents() {
  if (bound) return;
  bound = true;
  window.addEventListener('pb:socket-ready', (ev) => {
    const sock = (ev && ev.detail && ev.detail.socket) || window.socket;
    try { attachToSocket(sock); } catch (_) {}
  });
}

export default {
  init() {
    ensureBoundToWindowEvents();
    try { attachToSocket(window.socket); } catch (_) {}
    return this;
  },

  subscribe(key, handlers = {}) {
    if (!key) throw new Error('key required');
    const entries = Object.keys(handlers).map((event) => ({ event, handler: handlers[event] }));
    subscriptions.set(key, entries);

    if (currentSocket) {
      for (const e of entries) {
        try { currentSocket.on(e.event, e.handler); } catch (_) {}
      }
    }

    return {
      unsubscribe: () => {
        const subs = subscriptions.get(key) || [];
        if (currentSocket) {
          for (const s of subs) {
            try { currentSocket.off(s.event, s.handler); } catch (_) {}
          }
        }
        subscriptions.delete(key);
      }
    };
  },

  on(event, fn) {
    if (!currentSocket) return;
    try { currentSocket.on(event, fn); } catch (_) {}
  },

  off(event, fn) {
    if (!currentSocket) return;
    try { currentSocket.off(event, fn); } catch (_) {}
  },

  emit(...args) {
    if (!currentSocket) return false;
    try { return currentSocket.emit(...args); } catch (_) { return false; }
  },

  getSocket() {
    return currentSocket;
  },

  attachSocket(sock) {
    attachToSocket(sock);
  }
};

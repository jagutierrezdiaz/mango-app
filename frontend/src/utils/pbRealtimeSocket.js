import { DEV_BACKEND_ORIGIN } from '../config/devPorts'

/**
 * Cliente WebSocket nativo con una superficie mínima compatible con socket.io-client
 * usada en la app (.on / .once / .off / .emit con ack / .connect / .disconnect / .connected).
 */
const PROTOCOL_VERSION = 1

const buildWsHttpUrl = (httpOrigin, path) => {
  const fallbackOrigin = (typeof window !== 'undefined' && window.location && window.location.origin)
    ? String(window.location.origin).replace(/\/+$/, '')
    : DEV_BACKEND_ORIGIN

  const baseOrigin = String(httpOrigin || '').trim().replace(/\/+$/, '') || fallbackOrigin
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${baseOrigin}${suffix}`
}

const toWsUrl = (httpOrigin, path) => {
  let url = buildWsHttpUrl(httpOrigin, path)
  if (/^https:/i.test(url)) return url.replace(/^https:/i, 'wss:')
  return url.replace(/^http:/i, 'ws:')
}

const addListener = (store, eventName, handler) => {
  if (!store.has(eventName)) store.set(eventName, new Set())
  store.get(eventName).add(handler)
}

const removeListener = (store, eventName, handler) => {
  if (!eventName) {
    store.clear()
    return
  }
  if (!store.has(eventName)) return
  if (!handler) {
    store.delete(eventName)
    return
  }
  const handlers = store.get(eventName)
  for (const candidate of handlers) {
    if (candidate === handler || candidate.__original === handler) {
      handlers.delete(candidate)
    }
  }
  if (!handlers.size) store.delete(eventName)
}

const emitToListeners = (store, eventName, payload) => {
  const handlers = Array.from(store.get(eventName) || [])
  for (const handler of handlers) {
    try {
      handler(payload)
    } catch (error) {
      console.error(`[pb-realtime] error en listener "${eventName}":`, error)
    }
  }
}

export function createPbRealtimeSocket(httpOrigin, options = {}) {
  const path = String(options.path || '/pb-realtime-ws').trim() || '/pb-realtime-ws'
  const reconnectAttempts = Number(options.reconnectionAttempts ?? 25)
  const reconnectDelay = Number(options.reconnectionDelay ?? 1200)
  const reconnectDelayMax = Number(options.reconnectionDelayMax ?? 6000)
  const ackTimeoutMs = Number(options.ackTimeout ?? 12000)

  const listeners = new Map()
  const pendingAcks = new Map()

  let ws = null
  let intentionalClose = false
  let reconnectTimer = null
  let attempt = 0
  let openingFromReconnect = false
  let everOpened = false

  const socket = {
    auth: {},
    io: { engine: { transport: { name: 'websocket' } } },
    id: null,

    get connected() {
      return ws?.readyState === WebSocket.OPEN
    },

    on(eventName, handler) {
      if (!eventName || typeof handler !== 'function') return socket
      addListener(listeners, eventName, handler)
      return socket
    },

    once(eventName, handler) {
      if (!eventName || typeof handler !== 'function') return socket

      const wrapper = (payload) => {
        socket.off(eventName, wrapper)
        handler(payload)
      }
      wrapper.__original = handler
      addListener(listeners, eventName, wrapper)
      return socket
    },

    off(eventName, handler) {
      removeListener(listeners, eventName, handler)
      return socket
    },

    removeAllListeners(eventName) {
      removeListener(listeners, eventName)
      return socket
    },

    emit(eventName, data = {}, ack) {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        if (typeof ack === 'function') {
          ack({ success: false, message: 'socket-not-connected' })
        }
        return false
      }

      const base = {
        v: PROTOCOL_VERSION,
        kind: 'call',
        event: eventName,
        data
      }

      if (typeof ack !== 'function') {
        ws.send(JSON.stringify(base))
        return true
      }

      const rid = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const timeoutId = setTimeout(() => {
        if (!pendingAcks.has(rid)) return
        pendingAcks.delete(rid)
        ack({ success: false, message: 'ack-timeout' })
      }, ackTimeoutMs)

      pendingAcks.set(rid, { timeoutId, ack })
      ws.send(JSON.stringify({ ...base, rid }))
      return true
    },

    connect() {
      intentionalClose = false
      openSocket()
      return socket
    },

    disconnect() {
      intentionalClose = true
      openingFromReconnect = false
      clearScheduledReconnect()
      pendingAcks.forEach(({ timeoutId, ack }) => {
        clearTimeout(timeoutId)
        try {
          ack({ success: false, message: 'disconnected' })
        } catch (_e) {
          /* noop */
        }
      })
      pendingAcks.clear()

      if (ws) {
        try {
          ws.close()
        } catch (_e) {
          /* noop */
        }
        ws = null
      }

      socket.id = null
      emitToListeners(listeners, 'disconnect', 'io client disconnect')
      return socket
    }
  }

  const clearScheduledReconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  const scheduleReconnect = () => {
    if (intentionalClose) return
    if (attempt >= reconnectAttempts) {
      emitToListeners(listeners, 'connect_error', new Error('max reconnect attempts'))
      return
    }

    clearScheduledReconnect()
    const backoff = Math.min(
      reconnectDelayMax,
      reconnectDelay * Math.pow(1.6, attempt)
    )
    attempt += 1
    emitToListeners(listeners, 'reconnecting', attempt)

    reconnectTimer = setTimeout(() => {
      openingFromReconnect = true
      openSocket()
    }, backoff)
  }

  const resolveUrlWithToken = () => {
    const base = toWsUrl(httpOrigin, path)
    const token = socket.auth?.token
    if (!token) return base

    try {
      const url = new URL(base)
      url.searchParams.set('token', String(token))
      return url.toString()
    } catch {
      const sep = base.includes('?') ? '&' : '?'
      return `${base}${sep}token=${encodeURIComponent(String(token))}`
    }
  }

  const flushInboundMessage = (raw) => {
    let msg
    try {
      msg = JSON.parse(String(raw || ''))
    } catch {
      return
    }

    if (!msg || Number(msg.v) !== PROTOCOL_VERSION) return

    if (msg.kind === 'emit' && msg.event) {
      emitToListeners(listeners, msg.event, msg.data)
      return
    }

    if (msg.kind === 'ack' && msg.rid) {
      const pending = pendingAcks.get(msg.rid)
      if (!pending) return
      clearTimeout(pending.timeoutId)
      pendingAcks.delete(msg.rid)

      if (msg.ok) {
        pending.ack({ success: true, ...(msg.data || {}) })
      } else {
        pending.ack({
          success: false,
          message: msg.error || 'error',
          ...(msg.data || {})
        })
      }
    }
  }

  const openSocket = () => {
    clearScheduledReconnect()

    try {
      ws?.close()
    } catch (_e) {
      /* noop */
    }

    let nextWs
    try {
      nextWs = new WebSocket(resolveUrlWithToken())
    } catch (error) {
      emitToListeners(listeners, 'connect_error', error)
      scheduleReconnect()
      return
    }

    ws = nextWs

    ws.onopen = () => {
      attempt = 0
      everOpened = true
      socket.id = `ws_${Date.now().toString(36)}`

      if (openingFromReconnect) {
        emitToListeners(listeners, 'reconnect')
        openingFromReconnect = false
      }

      emitToListeners(listeners, 'connect')
    }

    ws.onmessage = (ev) => {
      flushInboundMessage(ev.data)
    }

    ws.onerror = () => {
      const error = new Error('websocket error')
      if (!everOpened) {
        emitToListeners(listeners, 'connect_error', error)
      }
      emitToListeners(listeners, 'error', error)
    }

    ws.onclose = (evt) => {
      ws = null
      socket.id = null

      pendingAcks.forEach(({ timeoutId, ack }) => {
        clearTimeout(timeoutId)
        try {
          ack({ success: false, message: 'socket-closed' })
        } catch (_e) {
          /* noop */
        }
      })
      pendingAcks.clear()

      emitToListeners(listeners, 'disconnect', evt?.reason || 'closed')

      if (!intentionalClose) {
        scheduleReconnect()
      }
    }
  }

  return socket
}

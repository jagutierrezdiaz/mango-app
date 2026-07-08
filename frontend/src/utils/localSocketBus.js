const addListener = (store, eventName, handler) => {
  if (!store.has(eventName)) {
    store.set(eventName, new Set())
  }

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

  if (!handlers.size) {
    store.delete(eventName)
  }
}

const emitToListeners = (store, eventName, payload) => {
  const handlers = Array.from(store.get(eventName) || [])

  for (const handler of handlers) {
    try {
      handler(payload)
    } catch (error) {
      console.error(`[pb-notifications] Error manejando "${eventName}":`, error)
    }
  }
}

export const createLocalSocketBus = () => {
  const store = new Map()
  let connected = false

  return {
    auth: {},
    get connected() {
      return connected
    },
    on(eventName, handler) {
      if (!eventName || typeof handler !== 'function') return this
      addListener(store, eventName, handler)
      return this
    },
    once(eventName, handler) {
      if (!eventName || typeof handler !== 'function') return this

      const wrapper = (payload) => {
        this.off(eventName, wrapper)
        handler(payload)
      }

      wrapper.__original = handler
      addListener(store, eventName, wrapper)
      return this
    },
    off(eventName, handler) {
      removeListener(store, eventName, handler)
      return this
    },
    emit(eventName, payload = {}, ack) {
      if (eventName === 'authenticate') {
        this.auth = payload || {}
        if (!connected) this.connect()
        if (typeof ack === 'function') ack({ success: true, local: true })
        return true
      }

      emitToListeners(store, eventName, payload)

      if (typeof ack === 'function') {
        ack({ success: false, local: true, message: 'polling-bus' })
      }

      return true
    },
    connect() {
      if (connected) return this
      connected = true
      emitToListeners(store, 'connect')
      return this
    },
    disconnect(reason = 'manual') {
      if (!connected) return this
      connected = false
      emitToListeners(store, 'disconnect', reason)
      return this
    },
    removeAllListeners(eventName) {
      removeListener(store, eventName)
      return this
    }
  }
}
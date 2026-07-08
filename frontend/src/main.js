/*
  MAIN.JS: Punto de entrada de la aplicación Vue.
  - Importa y configura Vue, Pinia, Router.
  - Inicializa WebSocket nativo (ws en servidor) para notificaciones en tiempo real.
  - Monta la app en el DOM.
*/
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import es from 'element-plus/dist/locale/es.mjs'
import 'element-plus/dist/index.css'
import '../css/tailwind.css'
import '../css/styles.css'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import { useAuthStore } from './stores'
import { BACKEND_ORIGIN, SOCKET_ORIGIN } from './config/api'
import { appDocumentTitle } from './config/businessInfo.js'
import { DEV_BACKEND_PORT } from './config/devPorts'
import { formatCurrencyNoDecimals, formatQuantity } from './utils/formatters'
import { createLocalSocketBus } from './utils/localSocketBus'
import { createPbRealtimeSocket } from './utils/pbRealtimeSocket'
import socketManager from './utils/socketManager'
import {
  initNotificationAudio,
  registerNotificationListeners,
  notifyUi,
  playNotification,
  playUniqueNotification,
  checkDuplicate,
  clearDedupRegistry
} from './utils/realtimeNotifications'

document.title = appDocumentTitle

// Crear instancia de la app Vue
const app = createApp(App)
app.use(ElementPlus, { locale: es })

// Configurar Pinia (estado global)
const pinia = createPinia()
app.use(pinia)

const authStore = useAuthStore(pinia)

const syncTokenFromApiResponse = async (response) => {
  try {
    const headerToken = response.headers.get('x-renewed-token') || ''
    if (headerToken) {
      authStore.updateToken(headerToken)
      return response
    }

    // Solo procesa body si la respuesta fue exitosa (2xx) y es JSON
    if (!response.ok) {
      return response
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return response
    }

    // Intenta leer el body solo si es JSON
    try {
      const cloned = response.clone()
      const payload = await cloned.json().catch(() => null)
      
      if (payload?.token) {
        if (payload.user) {
          authStore.setUser(payload.user, payload.token)
        } else {
          authStore.updateToken(payload.token)
        }
      }
    } catch (e) {
      // Si falla la lectura del body, continúa sin actualizar token
    }

    return response
  } catch (e) {
    // Si algo falla completamente, retorna la respuesta original
    return response
  }
}

const nativeFetch = window.fetch.bind(window)
window.fetch = async (...args) => {
  try {
    const response = await nativeFetch(...args)
    return syncTokenFromApiResponse(response)
  } catch (error) {
    // Propagate CORS y otros errores de red sin modificarlos
    throw error
  }
}

// Configurar Router
app.use(router)

const WS_PATH = String(process.env.VUE_APP_WS_PATH || '/pb-realtime-ws').trim() || '/pb-realtime-ws'
const normalizeSocketOrigin = (value = '') => String(value || '')
  .trim()
  .replace(/^wss:/i, 'https:')
  .replace(/^ws:/i, 'http:')

const SOCKET_SERVER_ORIGIN = normalizeSocketOrigin(
  SOCKET_ORIGIN || BACKEND_ORIGIN || (typeof window !== 'undefined' ? String(window.location.origin || '') : `https://localhost:${DEV_BACKEND_PORT}`)
)

// Runtime diagnostics: ayudar a depurar origenes en producción
try {
  console.log('[DIAG] BACKEND_ORIGIN =', BACKEND_ORIGIN)
  console.log('[DIAG] SOCKET_ORIGIN =', SOCKET_ORIGIN)
  console.log('[DIAG] SOCKET_SERVER_ORIGIN =', SOCKET_SERVER_ORIGIN)
} catch (e) {
  /* noop */
}
// Socket global compartido por chat de soporte y módulos operativos.
let socket = null
let currentSocketToken = null
const boundSocketLifecycle = new WeakSet()
const syncedComandasSockets = new WeakSet()
window.socketInstance = null

const emitSocketLifecycle = (status, extra = {}) => {
  window.dispatchEvent(new CustomEvent('pb:socket-status', {
    detail: { status, ...extra }
  }))
}

const emitSocketReady = () => {
  window.dispatchEvent(new CustomEvent('pb:socket-ready', {
    detail: { socket }
  }))
}

const resolveSocketPersonalId = () => {
  const user = authStore.user || null
  const directId = Number(user?.id || 0)
  if (directId > 0) return directId

  const personalId = Number(user?.personal_id || 0)
  if (personalId > 0) return personalId

  return 0
}

const emitJoinPrivateRoom = (targetSocket) => {
  if (!targetSocket || typeof targetSocket.emit !== 'function') return

  const personalId = resolveSocketPersonalId()
  if (!personalId) return

  targetSocket.emit('join-private-room', { personal_id: personalId }, () => {})
  targetSocket.emit('configurar-usuario', { id: personalId }, () => {})
}

const bindSocketLifecycleListeners = (targetSocket) => {
  if (!targetSocket || boundSocketLifecycle.has(targetSocket)) return

  boundSocketLifecycle.add(targetSocket)

  targetSocket.on('connect', () => {
    const transport = targetSocket?.io?.engine?.transport?.name || 'websocket'
    console.log('✅ Socket global listo')
    emitJoinPrivateRoom(targetSocket)
    emitSocketLifecycle('connected', { id: targetSocket.id, transport })
    emitSocketReady()
  })

  targetSocket.on('disconnect', (reason) => {
    emitSocketLifecycle('disconnected', { reason })
  })

  targetSocket.on('connect_error', (error) => {
    console.error('❌ Error en el túnel de notificaciones:', error?.message || 'unknown')
    emitSocketLifecycle('connect_error', {
      message: error?.message || 'unknown'
    })
  })
}

const createRealtimeSocket = (token = '') => {
  console.log(`🚀 Inicializando WebSocket nativo → ${WS_PATH}`)
  const instance = createPbRealtimeSocket(SOCKET_SERVER_ORIGIN, {
    path: WS_PATH,
    reconnectionAttempts: 25,
    reconnectionDelay: 1200,
    reconnectionDelayMax: 6000,
    ackTimeout: 12000
  })
  instance.auth = token ? { token } : {}
  return instance
}

const syncWindowSocketInstance = (instance) => {
  socket = instance || null
  window.socketInstance = socket
}

const initializeSocket = async () => {
  const token = localStorage.getItem('token') || authStore.token

  socket = window.socketInstance || socket

  if (!socket) {
    try {
      syncWindowSocketInstance(createRealtimeSocket(token))
      socket = window.socketInstance
    } catch (error) {
      console.error('⚠️ No se pudo crear el cliente WebSocket, usando bus local de respaldo', error)
      syncWindowSocketInstance(createLocalSocketBus())
      socket = window.socketInstance
    }
  }

  currentSocketToken = token

  // Si por cualquier razón seguimos en bus local, conserva comportamiento previo.
  if (!socket?.io) {
    socket.auth = token ? { token } : {}
    bindSocketLifecycleListeners(socket)
    if (!socket.connected) {
      socket.connect()
    }
    setupSocketEventListeners()
    emitSocketReady()
    return
  }

  socket.auth = token ? { token } : {}

  bindSocketLifecycleListeners(socket)

  if (socket.connected && token) {
    try {
      socket.emit('authenticate', { token }, () => {})
      emitJoinPrivateRoom(socket)
    } catch (_error) {
      // noop
    }
  }

  if (!socket.connected) {
    socket.connect()
  }
  setupSocketEventListeners()

  emitSocketReady()
}


const setupSocketEventListeners = () => {
  if (!socket) return
  if (syncedComandasSockets.has(socket)) return
  registerNotificationListeners(socket)
  syncedComandasSockets.add(socket)
  console.log('[main.js] Listeners de notificaciones centralizados registrados')
}

initNotificationAudio()

// init socketManager early to track subscriptions and reattach on reconnect
socketManager.init()
window.$socketManager = socketManager

window.playNotification = playNotification
window.playUniqueNotification = playUniqueNotification
window.checkDuplicate = checkDuplicate
window.clearDedupRegistry = clearDedupRegistry
window.notifyUi = notifyUi

// Hacer socket globalmente accesible Y sinronizar en el store
Object.defineProperty(window, 'socket', {
  get() {
    return window.socketInstance || socket
  },
  configurable: true
})

// Actualizar socket cuando cambie el token
authStore.$subscribe((mutation, state) => {
  if (state.token) {
    initializeSocket()
  } else {
    currentSocketToken = null
    if (socket?.io) {
      socket.auth = {}
      if (socket.connected) {
        socket.emit('authenticate', { token: null }, () => {})
      }
      emitSocketLifecycle('logged-out')
    } else if (socket) {
      socket.disconnect('logged-out')
      emitSocketLifecycle('logged-out')
    }
  }
})

// Habilitar global properties para acceso en componentes
app.config.globalProperties.$socket = window.socket
app.config.globalProperties.$playNotification = playNotification
app.config.globalProperties.$playUniqueNotification = playUniqueNotification
app.config.globalProperties.$notifyUi = notifyUi
app.config.globalProperties.$checkDuplicate = checkDuplicate

// Registrar filtros globales para formato numérico
app.config.globalProperties.$formatMoney = formatCurrencyNoDecimals
app.config.globalProperties.$formatQuantity = formatQuantity

// Registrar filtros globales
app.config.globalProperties.$money = formatCurrencyNoDecimals
app.config.globalProperties.$qty = formatQuantity

// Iniciar renovación automática de token y reautenticación de socket
authStore.initTokenAutoRefresh()

const isSupportRoutePath = (path = '') => {
  const normalized = String(path || '').trim().toLowerCase()
  return normalized === '/soporte' || normalized.startsWith('/soporte/')
}

const shouldInitializeSocketForRoute = (path = '') => {
  if (isSupportRoutePath(path)) return true
  return !!authStore.token
}

// Evita bucle de reconexión en login; la consola /soporte necesita socket aunque no haya login.
if (shouldInitializeSocketForRoute(window.location.pathname)) {
  initializeSocket()
}

router.afterEach((to) => {
  if (!to.meta?.isSupport) return
  if (window.socketInstance?.connected) return
  initializeSocket()
})

// Montar la app en el elemento #app
app.mount('#app')
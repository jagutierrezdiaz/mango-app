<template>
  <main class="pb-support-remote-shell" :class="{ 'is-viewer': isViewerMode }">
    <section v-if="!isViewerMode" class="pb-support-console-card">
      <header class="pb-support-console-head">
        <h1>Consola de Soporte Tecnico</h1>
        <p>Sesion publica con control por contraseña de soporte</p>
      </header>

      <p v-if="consoleNotice" class="pb-support-console-notice">{{ consoleNotice }}</p>

      <div v-if="!consoleAuthorized" class="pb-support-auth-wrap">
        <label class="pb-support-auth-label" for="supportPassword">Contraseña de Soporte</label>
        <p v-if="socketConnecting" class="pb-support-auth-hint">Conectando canal en tiempo real...</p>
        <p v-else-if="socketUnavailable" class="pb-support-auth-error">
          Sin conexion en tiempo real. Espere unos segundos o recargue la pagina.
        </p>
        <div class="pb-support-auth-row">
          <input
            id="supportPassword"
            v-model="consolePassword"
            type="password"
            placeholder="Ingresa tu clave de soporte"
            :disabled="authSubmitting"
            @keyup.enter="authorizeConsole"
          />
          <button
            type="button"
            class="pb-btn pb-btn-primary"
            :disabled="authSubmitting || socketConnecting || socketUnavailable"
            @click="authorizeConsole"
          >
            {{ authSubmitting ? 'Validando...' : 'Entrar' }}
          </button>
        </div>
        <p v-if="authError" class="pb-support-auth-error">{{ authError }}</p>
      </div>

      <div v-else>
        <p v-if="sessionsLoadError" class="pb-support-console-notice is-warning">{{ sessionsLoadError }}</p>
        <div class="pb-support-console-meta">
          <span>{{ activeSessions.length }} sesiones activas</span>
          <button type="button" class="pb-btn pb-btn-secondary" @click="requestActiveSessions">Actualizar</button>
        </div>

        <div v-if="activeSessions.length" class="pb-support-console-grid">
          <article v-for="session in activeSessions" :key="session.support_id" class="pb-support-session-card">
            <h3>{{ session.card_label || `${session.rol_vista || 'Operacion'} - ${session.user_local || 'Sede principal'}` }}</h3>
            <p class="pb-support-session-user">{{ session.user_name || 'Usuario Patio Bohemio' }}</p>
            <p class="pb-support-session-id">ID: {{ session.support_id }}</p>
            <button type="button" class="pb-btn pb-btn-primary" @click="enterSupportSession(session)">
              ENTRAR A SOPORTE
            </button>
          </article>
        </div>

        <p v-else class="pb-support-console-empty">No hay solicitudes activas en este momento.</p>

        <section class="pb-support-history-wrap">
          <header class="pb-support-history-head">
            <h3>Historial Reciente</h3>
            <button type="button" class="pb-btn pb-btn-secondary" @click="clearRecentHistory">Limpiar</button>
          </header>

          <div v-if="recentHistory.length" class="pb-support-history-table-wrap">
            <table class="pb-support-history-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>ID</th>
                  <th>Modulo</th>
                  <th>Usuario</th>
                  <th>Duracion</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in recentHistory" :key="row.key">
                  <td>{{ row.fechaHora }}</td>
                  <td>{{ row.support_id }}</td>
                  <td>{{ row.modulo }}</td>
                  <td>{{ row.user }}</td>
                  <td>{{ row.tiempo }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p v-else class="pb-support-history-empty">Aun no hay logs guardados en este navegador.</p>
        </section>
      </div>
    </section>

    <section v-else class="pb-support-remote-card" :class="{ 'is-admin-full': isAdminSupport }">
      <header class="pb-support-remote-head">
        <h1>Soporte remoto</h1>
        <p>ID de sesion: {{ supportId }}</p>
        <p class="pb-support-timer">Duracion: {{ sessionElapsedLabel }}</p>
      </header>

      <div class="pb-support-remote-layout">
        <div class="pb-support-remote-stage" :class="{ 'is-empty': !hasRemoteStream }">
          <video
            ref="remoteVideoRef"
            id="remoteVideo"
            autoplay
            playsinline
            muted
            class="pb-support-remote-video"
          ></video>
          <div v-if="statusMessage" class="pb-support-status">{{ statusMessage }}</div>
        </div>

        <aside class="pb-support-chat" :class="{ 'is-collapsed': chatCollapsed }">
          <header class="pb-support-chat-head">
            <strong>Chat rapido</strong>
            <button type="button" class="pb-support-chat-toggle" @click="chatCollapsed = !chatCollapsed">
              {{ chatCollapsed ? 'Abrir' : 'Ocultar' }}
            </button>
          </header>

          <div v-if="!chatCollapsed" class="pb-support-chat-body">
            <div class="pb-support-chat-log">
              <p v-if="!chatMessages.length" class="pb-support-chat-empty">Sin mensajes por ahora</p>
              <article
                v-for="message in chatMessages"
                :key="message.id"
                class="pb-support-chat-item"
                :class="message.from === 'support' ? 'from-support' : 'from-user'"
              >
                <span class="pb-support-chat-author">{{ message.from === 'support' ? 'Soporte' : 'Usuario' }}</span>
                <p>{{ message.message }}</p>
              </article>
            </div>

            <form class="pb-support-chat-form" @submit.prevent="sendChatMessage">
              <input
                v-model="chatInput"
                type="text"
                maxlength="220"
                placeholder="Escribe una indicacion rapida"
              />
              <button type="submit" class="pb-btn pb-btn-primary" :disabled="!chatInput.trim()">Enviar</button>
            </form>
          </div>
        </aside>
      </div>

      <button type="button" class="pb-support-float-end" @click="endSessionAndClose">
        Finalizar y Cerrar
      </button>

      <footer class="pb-support-remote-footer">
        <button type="button" class="pb-support-retry" @click="retryConnection">Reintentar Conexion</button>
        <button type="button" class="pb-support-end" @click="endSessionAndClose">Finalizar sesion</button>
      </footer>
    </section>
  </main>
</template>

<script setup>
import Peer from 'peerjs'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  buildSupportPeerId,
  buildUserPeerId,
  getPeerConnectionConfigCandidates,
  normalizeSupportId
} from '../services/remoteSupportService'

const route = useRoute()
const router = useRouter()
const SUPPORT_HISTORY_STORAGE_KEY = 'pb_support_recent_logs'

const supportId = computed(() => normalizeSupportId(route.params.support_id))
const isViewerMode = computed(() => !!supportId.value)
const targetPeerId = computed(() => buildUserPeerId(supportId.value))

const remoteVideoRef = ref(null)
const hasRemoteStream = ref(false)
const status = ref('connecting')
const chatCollapsed = ref(false)
const chatInput = ref('')
const chatMessages = ref([])
const sessionElapsedSeconds = ref(0)
const recentHistory = ref([])
const currentSessionMeta = ref({ modulo: 'Operacion', user: 'Usuario Patio Bohemio' })

const consoleAuthorized = ref(sessionStorage.getItem('support-console-ok') === '1')
const consolePassword = ref('')
const authError = ref('')
const authSubmitting = ref(false)
const socketConnecting = ref(true)
const socketUnavailable = ref(false)
const sessionsLoadError = ref('')
const consoleNotice = ref('')
const activeSessions = ref([])

let rememberedConsolePassword = ''

const isAdminSupport = computed(() => {
  const rawUser = JSON.parse(localStorage.getItem('user') || 'null')
  const role = String(rawUser?.rol || '').trim().toUpperCase()
  return role === 'ADMINISTRADOR'
})

const statusMessage = computed(() => {
  if (status.value === 'connecting') return 'Conectando con la sesion de soporte...'
  if (status.value === 'waiting-stream') return 'Esperando la pantalla del usuario...'
  if (status.value === 'ended') return 'Sesion de soporte finalizada'
  if (status.value === 'error') return 'No fue posible establecer la sesion de soporte'
  return ''
})

const sessionElapsedLabel = computed(() => {
  const total = Math.max(0, Number(sessionElapsedSeconds.value) || 0)
  const hh = String(Math.floor(total / 3600)).padStart(2, '0')
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
})

let socket = null
let peer = null
let mediaCall = null
let probeStream = null
let sessionTimer = null
let sessionStartedAt = 0
let supportWindowErrorHandler = null
let supportUnhandledRejectionHandler = null

const emitUiNotification = (message, type = 'info') => {
  window.dispatchEvent(new CustomEvent('pb:notify-ui', {
    detail: { message, type }
  }))
}

const getSharedSocket = () => window.socketInstance || window.socket || null

const waitForSharedSocket = (timeoutMs = 5000) => new Promise((resolve) => {
  const existing = getSharedSocket()
  if (existing) {
    resolve(existing)
    return
  }

  const onReady = () => {
    clearTimeout(timeoutId)
    window.removeEventListener('pb:socket-ready', onReady)
    resolve(getSharedSocket())
  }

  const timeoutId = setTimeout(() => {
    window.removeEventListener('pb:socket-ready', onReady)
    resolve(null)
  }, timeoutMs)

  window.addEventListener('pb:socket-ready', onReady, { once: true })
})

const waitForSocketConnected = (targetSocket, timeoutMs = 8000) => new Promise((resolve) => {
  if (!targetSocket) {
    resolve(false)
    return
  }

  if (targetSocket.connected) {
    resolve(true)
    return
  }

  let settled = false
  const finish = (result) => {
    if (settled) return
    settled = true
    clearTimeout(timeoutId)
    targetSocket.off('connect', onConnect)
    resolve(result)
  }

  const onConnect = () => finish(true)
  const timeoutId = setTimeout(() => finish(false), timeoutMs)
  targetSocket.once('connect', onConnect)
})

const emitSocketAck = (eventName, payload, timeoutMs = 5000) => new Promise((resolve) => {
  if (!socket || typeof socket.emit !== 'function') {
    resolve({ success: false, message: 'socket-not-ready' })
    return
  }

  let settled = false
  const finish = (result) => {
    if (settled) return
    settled = true
    resolve(result)
  }

  const timeoutId = setTimeout(() => {
    finish({ success: false, message: 'ack-timeout' })
  }, timeoutMs)

  socket.emit(eventName, payload, (ack = {}) => {
    clearTimeout(timeoutId)
    finish(ack)
  })
})

const clearConsoleAuthorization = (message = '') => {
  consoleAuthorized.value = false
  rememberedConsolePassword = ''
  sessionStorage.removeItem('support-console-ok')
  activeSessions.value = []
  if (message) {
    authError.value = message
  }
}

const resolveConsoleNotice = () => {
  const motivo = String(route.query.motivo || '').trim()
  if (motivo === 'sesion-no-activa') {
    consoleNotice.value = 'La sesion indicada no esta activa. Verifique que el usuario haya iniciado soporte y siga compartiendo pantalla.'
    return
  }
  consoleNotice.value = ''
}

const reportSupportError = (context, error, extra = {}) => {
  console.error(`[support-frontend] ${context}`, error, extra)

  if (!socket) return

  socket.emit('support:log-client-error', {
    context,
    message: String(error?.message || error || 'unknown-error'),
    stack: String(error?.stack || ''),
    supportId: supportId.value || null,
    extra
  })
}

const loadRecentHistory = () => {
  try {
    const raw = localStorage.getItem(SUPPORT_HISTORY_STORAGE_KEY)
    const rows = JSON.parse(raw || '[]')
    recentHistory.value = Array.isArray(rows) ? rows : []
  } catch {
    recentHistory.value = []
  }
}

const persistRecentHistory = () => {
  localStorage.setItem(SUPPORT_HISTORY_STORAGE_KEY, JSON.stringify(recentHistory.value))
}

const clearRecentHistory = () => {
  recentHistory.value = []
  persistRecentHistory()
}

const startSessionTimer = () => {
  if (sessionTimer) return
  sessionStartedAt = Date.now() - ((Number(sessionElapsedSeconds.value) || 0) * 1000)
  sessionTimer = setInterval(() => {
    sessionElapsedSeconds.value = Math.floor((Date.now() - sessionStartedAt) / 1000)
  }, 1000)
}

const stopSessionTimer = () => {
  if (sessionTimer) {
    clearInterval(sessionTimer)
    sessionTimer = null
  }
}

const resetSessionTimer = () => {
  stopSessionTimer()
  sessionStartedAt = 0
  sessionElapsedSeconds.value = 0
}

const attachSocketListeners = () => {
  if (!socket) return

  socket.on('support:active-sessions-update', (payload = {}) => {
    activeSessions.value = Array.isArray(payload.sessions) ? payload.sessions : []
    const current = activeSessions.value.find((row) => normalizeSupportId(row.support_id) === supportId.value)
    if (current) {
      currentSessionMeta.value = {
        modulo: String(current.rol_vista || 'Operacion'),
        user: String(current.user_name || 'Usuario Patio Bohemio')
      }
    }
  })

  socket.on('support:chat-message', (payload = {}) => {
    if (normalizeSupportId(payload.supportId) !== supportId.value) return
    addChatMessage(payload.from === 'user' ? 'user' : 'support', payload.message)
  })

  socket.on('support:session-ended', (payload = {}) => {
    if (normalizeSupportId(payload.supportId) !== supportId.value) return
    status.value = 'ended'
    hasRemoteStream.value = false
    cleanupViewer()
  })
}

const detachSocketListeners = () => {
  if (!socket) return
  socket.off('support:active-sessions-update')
  socket.off('support:chat-message')
  socket.off('support:session-ended')
  socket.off('connect_error', handleSocketConnectError)
  socket.off('error', handleSocketError)
  socket.off('connect', handleSocketConnect)
}

const handleSocketConnectError = (error) => {
  socketConnecting.value = false
  socketUnavailable.value = true
  reportSupportError('socket:connect_error', error)
}

const handleSocketError = (error) => {
  reportSupportError('socket:error', error)
}

const reauthorizeConsole = async (password) => {
  const cleanPassword = String(password || '').trim()
  if (!cleanPassword || !socket) return false

  const ack = await emitSocketAck('support:authorize-console', { password: cleanPassword })
  if (!ack.success || !ack.authorized) {
    clearConsoleAuthorization('La sesion de consola expiro. Ingrese la contraseña nuevamente.')
    return false
  }

  return true
}

const handleActiveSessionsAck = (ack = {}) => {
  const message = String(ack.message || '').trim()

  if (message === 'support-console-unauthorized') {
    clearConsoleAuthorization('La sesion de consola expiro. Ingrese la contraseña nuevamente.')
    return
  }

  if (!ack.success) {
    sessionsLoadError.value = message === 'ack-timeout'
      ? 'Tiempo de espera agotado al cargar sesiones activas.'
      : 'No se pudo cargar la lista de sesiones activas.'
    return
  }

  sessionsLoadError.value = ''
  activeSessions.value = Array.isArray(ack.sessions) ? ack.sessions : []

  const current = activeSessions.value.find((row) => normalizeSupportId(row.support_id) === supportId.value)
  if (current) {
    currentSessionMeta.value = {
      modulo: String(current.rol_vista || 'Operacion'),
      user: String(current.user_name || 'Usuario Patio Bohemio')
    }
  }
}

const handleSocketConnect = async () => {
  socketConnecting.value = false
  socketUnavailable.value = false

  if (isViewerMode.value) return

  if (consoleAuthorized.value && rememberedConsolePassword) {
    const ok = await reauthorizeConsole(rememberedConsolePassword)
    if (ok) {
      await requestActiveSessions()
    }
    return
  }

  if (consoleAuthorized.value) {
    await requestActiveSessions()
  }
}

const connectSocket = async () => {
  socketConnecting.value = true
  socketUnavailable.value = false

  let sharedSocket = getSharedSocket()
  if (!sharedSocket) {
    sharedSocket = await waitForSharedSocket(8000)
  }

  if (!sharedSocket) {
    socketConnecting.value = false
    socketUnavailable.value = true
    return false
  }

  if (socket !== sharedSocket) {
    detachSocketListeners()
    socket = sharedSocket
    attachSocketListeners()

    socket.on('connect_error', handleSocketConnectError)
    socket.on('error', handleSocketError)
    socket.on('connect', handleSocketConnect)
  }

  if (!socket.connected) {
    try {
      socket.connect()
    } catch (_error) {
      // noop
    }
  }

  if (!socket.connected) {
    await waitForSocketConnected(socket, 8000)
  }

  socketConnecting.value = false
  socketUnavailable.value = !socket?.connected
  return !!socket?.connected
}

const requestActiveSessions = async () => {
  if (!consoleAuthorized.value) return

  if (!socket || !socket.connected) {
    const connected = await connectSocket()
    if (!connected) {
      sessionsLoadError.value = 'Sin conexion en tiempo real. No se pudo cargar la lista de sesiones.'
      return
    }
  }

  const ack = await emitSocketAck('support:request-active-sessions', {})
  handleActiveSessionsAck(ack)
}

const authorizeConsole = async () => {
  authError.value = ''
  authSubmitting.value = true

  try {
    if (!socket || !socket.connected) {
      await connectSocket()
    }

    if (!socket || !socket.connected) {
      authError.value = 'Sin conexion en tiempo real. Espere unos segundos o recargue la pagina.'
      return
    }

    const ack = await emitSocketAck('support:authorize-console', { password: consolePassword.value })
    if (!ack.success || !ack.authorized) {
      authError.value = ack.message === 'ack-timeout'
        ? 'Tiempo de espera agotado. Intente de nuevo.'
        : 'Contraseña invalida para la consola de soporte.'
      return
    }

    rememberedConsolePassword = String(consolePassword.value || '')
    consoleAuthorized.value = true
    sessionStorage.setItem('support-console-ok', '1')
    authError.value = ''
    await requestActiveSessions()
  } catch (error) {
    reportSupportError('socket:support:authorize-console', error)
    authError.value = 'No fue posible validar la contraseña de soporte.'
  } finally {
    authSubmitting.value = false
  }
}

const requestFullscreenIfAdmin = async () => {
  if (!isAdminSupport.value) return
  const container = document.documentElement
  if (!container || document.fullscreenElement) return

  try {
    await nextTick()
    await container.requestFullscreen()
  } catch (error) {
    reportSupportError('viewer:requestFullscreen', error)
  }
}

const buildProbeStream = () => {
  const canvas = document.createElement('canvas')
  canvas.width = 8
  canvas.height = 8
  const context = canvas.getContext('2d')
  context.fillStyle = '#000000'
  context.fillRect(0, 0, canvas.width, canvas.height)
  const stream = canvas.captureStream(2)
  const [track] = stream.getVideoTracks()
  if (track) track.enabled = false
  return stream
}

const addChatMessage = (from, message) => {
  const clean = String(message || '').trim()
  if (!clean) return

  chatMessages.value.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    from,
    message: clean
  })

  if (chatMessages.value.length > 60) {
    chatMessages.value = chatMessages.value.slice(-60)
  }
}

const sendChatMessage = () => {
  const message = String(chatInput.value || '').trim()
  if (!message || !socket || !supportId.value) return

  socket.emit('support:chat-to-user', {
    supportId: supportId.value,
    message
  })

  chatInput.value = ''
}

const attachRemoteStream = (stream) => {
  const videoElement = remoteVideoRef.value
  if (!videoElement) return
  videoElement.srcObject = stream
  hasRemoteStream.value = true
  status.value = ''
}

const releaseProbeStream = () => {
  if (!probeStream) return
  probeStream.getTracks().forEach((track) => track.stop())
  probeStream = null
}

const closeMediaCall = () => {
  if (!mediaCall) return
  mediaCall.close()
  mediaCall = null
}

const destroyPeer = () => {
  if (!peer) return
  peer.removeAllListeners()
  peer.destroy()
  peer = null
}

const waitPeerOpen = (peerInstance) => new Promise((resolve, reject) => {
  const onOpen = () => {
    peerInstance.off('error', onError)
    resolve(peerInstance)
  }

  const onError = (error) => {
    peerInstance.off('open', onOpen)
    reject(error)
  }

  peerInstance.once('open', onOpen)
  peerInstance.once('error', onError)
})

const createViewerPeerWithFallback = async (peerId) => {
  const configs = getPeerConnectionConfigCandidates()
  let lastError = null

  for (const config of configs) {
    const candidatePeer = new Peer(peerId, config)
    try {
      return await waitPeerOpen(candidatePeer)
    } catch (error) {
      lastError = error
      reportSupportError('peer:connect-attempt-failed', error, {
        path: config.path,
        host: config.host,
        port: config.port,
        secure: config.secure,
        key: config.key,
        errorType: String(error?.type || ''),
        errorName: String(error?.name || ''),
        errorMessage: String(error?.message || '')
      })
      candidatePeer.destroy()
    }
  }

  throw lastError || new Error('peer-connect-failed')
}

const cleanupViewer = () => {
  stopSessionTimer()
  closeMediaCall()
  destroyPeer()
  releaseProbeStream()

  if (remoteVideoRef.value?.srcObject) {
    const activeStream = remoteVideoRef.value.srcObject
    activeStream.getTracks().forEach((track) => track.stop())
    remoteVideoRef.value.srcObject = null
  }
}

const startViewer = async () => {
  if (!supportId.value) return

  status.value = 'connecting'
  chatMessages.value = []
  resetSessionTimer()

  if (socket) {
    socket.emit('support:validate-session', { supportId: supportId.value }, (ack = {}) => {
      if (ack?.success && ack?.active) {
        currentSessionMeta.value = {
          modulo: String(ack.rol_vista || 'Operacion'),
          user: String(ack.user_name || 'Usuario Patio Bohemio')
        }
      }
    })
  }

  if (socket) {
    socket.emit('support:connected', { supportId: supportId.value })
  }

  try {
    const supportPeerId = buildSupportPeerId(supportId.value)
    peer = await createViewerPeerWithFallback(supportPeerId)

    if (socket) {
      socket.emit('support:connected', { supportId: supportId.value })
    }

    probeStream = buildProbeStream()
    mediaCall = peer.call(targetPeerId.value, probeStream)
    status.value = 'waiting-stream'

    mediaCall.on('stream', (remoteStream) => {
      attachRemoteStream(remoteStream)
      startSessionTimer()
      requestFullscreenIfAdmin()
    })

    mediaCall.on('close', () => {
      hasRemoteStream.value = false
      status.value = 'ended'
    })

    mediaCall.on('error', () => {
      hasRemoteStream.value = false
      status.value = 'error'
    })

    peer.on('error', () => {
      reportSupportError('peer:error', new Error('peer-error'))
      status.value = 'error'
    })

    peer.on('disconnected', () => {
      reportSupportError('peer:disconnected', new Error('peer-disconnected'))
      status.value = 'ended'
    })

    peer.on('close', () => {
      reportSupportError('peer:close', new Error('peer-close'))
      status.value = 'ended'
    })
  } catch (error) {
    reportSupportError('startViewer', error)
    cleanupViewer()
    status.value = 'error'
  }
}

const enterSupportSession = (session = {}) => {
  const targetId = normalizeSupportId(session.support_id)
  if (!targetId) return

  currentSessionMeta.value = {
    modulo: String(session.rol_vista || 'Operacion'),
    user: String(session.user_name || 'Usuario Patio Bohemio')
  }

  router.push(`/soporte/${targetId}`)
}

const saveSupportLog = async () => {
  if (!socket || !supportId.value) return

  stopSessionTimer()

  const payload = {
    support_id: supportId.value,
    modulo: String(currentSessionMeta.value?.modulo || 'Operacion'),
    user: String(currentSessionMeta.value?.user || 'Usuario Patio Bohemio'),
    tiempo: sessionElapsedLabel.value
  }

  await new Promise((resolve) => {
    socket.emit('support:save-log-file', payload, (ack = {}) => {
      if (ack?.success) {
        const now = new Date()
        const yyyy = now.getFullYear()
        const mm = String(now.getMonth() + 1).padStart(2, '0')
        const dd = String(now.getDate()).padStart(2, '0')
        const hh = String(now.getHours()).padStart(2, '0')
        const mi = String(now.getMinutes()).padStart(2, '0')
        const ss = String(now.getSeconds()).padStart(2, '0')
        recentHistory.value = [
          {
            key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            fechaHora: `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`,
            ...payload
          },
          ...recentHistory.value
        ].slice(0, 30)
        persistRecentHistory()

        emitUiNotification('Log guardado en D:\\Logs_soporte_remoto\\patio-bohemio', 'success')
      }
      resolve(true)
    })
  })
}

const retryConnection = () => {
  try {
    cleanupViewer()
    hasRemoteStream.value = false
    status.value = 'connecting'
    startViewer()
  } catch (error) {
    reportSupportError('viewer:retryConnection', error)
  }
}

const endSessionAndClose = async () => {
  try {
    await saveSupportLog()

    if (socket && supportId.value) {
      socket.emit('support:end-session', { supportId: supportId.value })
    }

    cleanupViewer()
    status.value = 'ended'

    setTimeout(() => {
      window.close()
      router.replace('/soporte')
    }, 180)
  } catch (error) {
    reportSupportError('viewer:endSessionAndClose', error)
  }
}

watch(
  () => route.query.motivo,
  () => {
    resolveConsoleNotice()
  }
)

watch(supportId, (nextId, prevId) => {
  if (prevId) {
    cleanupViewer()
  }

  if (nextId) {
    startViewer()
  } else if (consoleAuthorized.value) {
    requestActiveSessions()
  }
})

onMounted(async () => {
  resolveConsoleNotice()

  supportWindowErrorHandler = (event) => {
    reportSupportError('window:error', event?.error || new Error(event?.message || 'window-error'))
  }

  supportUnhandledRejectionHandler = (event) => {
    reportSupportError('window:unhandledrejection', event?.reason || new Error('unhandled-rejection'))
  }

  window.addEventListener('error', supportWindowErrorHandler)
  window.addEventListener('unhandledrejection', supportUnhandledRejectionHandler)

  await connectSocket()
  loadRecentHistory()

  if (isViewerMode.value) {
    startViewer()
  } else if (consoleAuthorized.value) {
    await requestActiveSessions()
  }
})

onBeforeUnmount(() => {
  if (supportWindowErrorHandler) {
    window.removeEventListener('error', supportWindowErrorHandler)
    supportWindowErrorHandler = null
  }
  if (supportUnhandledRejectionHandler) {
    window.removeEventListener('unhandledrejection', supportUnhandledRejectionHandler)
    supportUnhandledRejectionHandler = null
  }

  cleanupViewer()
  stopSessionTimer()
  if (socket) {
    detachSocketListeners()
    socket = null
  }
})
</script>

<style scoped>
.pb-support-remote-shell {
  min-height: 100vh;
  padding: 1rem;
  background:
    radial-gradient(circle at 10% 10%, rgba(14, 116, 144, 0.2) 0, transparent 32%),
    radial-gradient(circle at 88% 15%, rgba(15, 23, 42, 0.25) 0, transparent 30%),
    linear-gradient(160deg, #0f172a, #1e293b);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pb-support-console-card,
.pb-support-remote-card {
  width: min(82rem, 100%);
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 1.2rem;
  box-shadow: 0 22px 45px rgba(2, 6, 23, 0.5);
  padding: 1rem;
  position: relative;
}

.pb-support-console-head h1,
.pb-support-remote-head h1 {
  margin: 0;
  color: #f8fafc;
  font-size: 1.25rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.pb-support-console-head p,
.pb-support-remote-head p {
  margin: 0.3rem 0 0;
  color: #67e8f9;
  font-size: 0.8rem;
  font-weight: 700;
}

.pb-support-auth-wrap {
  margin-top: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 0.9rem;
  padding: 0.9rem;
  background: rgba(15, 23, 42, 0.45);
}

.pb-support-auth-label {
  display: block;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #e2e8f0;
  font-weight: 700;
  margin-bottom: 0.35rem;
}

.pb-support-auth-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem;
}

.pb-support-auth-row input {
  border: 1px solid rgba(148, 163, 184, 0.45);
  border-radius: 0.65rem;
  padding: 0.58rem 0.65rem;
  background: rgba(2, 6, 23, 0.8);
  color: #f8fafc;
}

.pb-support-auth-error {
  margin: 0.45rem 0 0;
  color: #fda4af;
  font-size: 0.76rem;
  font-weight: 700;
}

.pb-support-auth-hint {
  margin: 0 0 0.45rem;
  color: #67e8f9;
  font-size: 0.76rem;
  font-weight: 700;
}

.pb-support-console-notice {
  margin: 0.85rem 0 0;
  border: 1px solid rgba(251, 191, 36, 0.45);
  border-radius: 0.75rem;
  padding: 0.65rem 0.75rem;
  color: #fde68a;
  background: rgba(120, 53, 15, 0.35);
  font-size: 0.78rem;
  line-height: 1.45;
}

.pb-support-console-notice.is-warning {
  margin-top: 0;
  margin-bottom: 0.75rem;
}

.pb-support-console-meta {
  margin-top: 1rem;
  margin-bottom: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #e2e8f0;
  font-weight: 700;
}

.pb-support-console-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: 0.75rem;
}

.pb-support-session-card {
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 0.9rem;
  padding: 0.75rem;
  background: rgba(2, 6, 23, 0.6);
}

.pb-support-session-card h3 {
  margin: 0;
  font-size: 0.9rem;
  color: #ecfeff;
}

.pb-support-session-user {
  margin: 0.3rem 0;
  color: #bae6fd;
  font-size: 0.8rem;
}

.pb-support-session-id {
  margin: 0 0 0.7rem;
  color: #94a3b8;
  font-size: 0.78rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.pb-support-console-empty {
  border: 1px dashed rgba(148, 163, 184, 0.35);
  border-radius: 0.85rem;
  padding: 1rem;
  color: #cbd5e1;
  text-align: center;
}

.pb-support-history-wrap {
  margin-top: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 0.9rem;
  padding: 0.75rem;
  background: rgba(2, 6, 23, 0.5);
}

.pb-support-history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.65rem;
}

.pb-support-history-head h3 {
  margin: 0;
  color: #ecfeff;
  font-size: 0.9rem;
}

.pb-support-history-table-wrap {
  overflow-x: auto;
}

.pb-support-history-table {
  width: 100%;
  min-width: 620px;
  border-collapse: collapse;
}

.pb-support-history-table th,
.pb-support-history-table td {
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
  padding: 0.48rem;
  text-align: left;
  color: #dbeafe;
  font-size: 0.74rem;
}

.pb-support-history-table th {
  color: #93c5fd;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.pb-support-history-empty {
  margin: 0;
  color: #94a3b8;
  font-size: 0.78rem;
}

.pb-support-timer {
  margin-top: 0.35rem !important;
  color: #86efac !important;
  font-size: 0.78rem !important;
  font-weight: 800 !important;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.pb-support-remote-card.is-admin-full {
  width: 100%;
  min-height: calc(100vh - 2rem);
}

.pb-support-remote-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 20rem;
  gap: 0.8rem;
}

.pb-support-remote-stage {
  position: relative;
  border-radius: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: #020617;
  min-height: clamp(22rem, 65vh, 46rem);
  overflow: hidden;
}

.pb-support-remote-stage.is-empty {
  display: grid;
  place-items: center;
}

.pb-support-remote-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  background: #020617;
}

.pb-support-status {
  position: absolute;
  inset: auto 0 0 0;
  padding: 0.8rem;
  text-align: center;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: #f8fafc;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0), rgba(15, 23, 42, 0.86));
}

.pb-support-chat {
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 0.9rem;
  background: rgba(15, 23, 42, 0.66);
  min-height: clamp(20rem, 62vh, 46rem);
  display: flex;
  flex-direction: column;
}

.pb-support-chat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.7rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  color: #f8fafc;
}

.pb-support-chat-toggle {
  border: 0;
  border-radius: 0.55rem;
  padding: 0.35rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 800;
  color: #0f172a;
  background: #a5f3fc;
  cursor: pointer;
}

.pb-support-chat.is-collapsed {
  min-height: auto;
}

.pb-support-chat-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.pb-support-chat-log {
  flex: 1;
  overflow-y: auto;
  padding: 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.pb-support-chat-empty {
  color: #94a3b8;
  font-size: 0.8rem;
  text-align: center;
}

.pb-support-chat-item {
  border-radius: 0.65rem;
  padding: 0.5rem 0.55rem;
}

.pb-support-chat-item p {
  margin: 0.2rem 0 0;
  color: #e2e8f0;
  font-size: 0.82rem;
}

.pb-support-chat-item.from-support {
  background: rgba(14, 116, 144, 0.26);
  border: 1px solid rgba(6, 182, 212, 0.34);
}

.pb-support-chat-item.from-user {
  background: rgba(30, 64, 175, 0.24);
  border: 1px solid rgba(96, 165, 250, 0.34);
}

.pb-support-chat-author {
  font-size: 0.68rem;
  font-weight: 800;
  color: #67e8f9;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pb-support-chat-form {
  padding: 0.65rem;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem;
}

.pb-support-chat-form input {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 0.65rem;
  padding: 0.5rem;
  font-size: 0.82rem;
  background: rgba(2, 6, 23, 0.7);
  color: #f8fafc;
}

.pb-support-float-end {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  border: 0;
  border-radius: 999px;
  padding: 0.75rem 1rem;
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fff1f2;
  background: linear-gradient(135deg, #e11d48, #be123c);
  box-shadow: 0 14px 28px rgba(136, 19, 55, 0.4);
  cursor: pointer;
  z-index: 90;
}

.pb-support-remote-footer {
  margin-top: 0.8rem;
  display: flex;
  justify-content: flex-end;
}

.pb-support-end {
  border: 0;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, #be123c, #e11d48);
  color: #fff1f2;
  padding: 0.65rem 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 800;
  cursor: pointer;
}

.pb-support-retry {
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 0.75rem;
  background: rgba(15, 23, 42, 0.65);
  color: #e2e8f0;
  padding: 0.65rem 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 800;
  cursor: pointer;
  margin-right: 0.5rem;
}

@media (max-width: 1024px) {
  .pb-support-remote-layout {
    grid-template-columns: 1fr;
  }

  .pb-support-chat {
    min-height: 18rem;
  }
}

@media (max-width: 768px) {
  .pb-support-remote-shell {
    padding: 0.5rem;
  }

  .pb-support-console-card,
  .pb-support-remote-card {
    padding: 0.7rem;
  }

  .pb-support-remote-stage {
    min-height: 56vh;
  }
}

/* ─── Viewer mode: fill 100% of the browser window ─────────────────────────── */

.pb-support-remote-shell.is-viewer {
  height: 100vh; /* fallback */
  height: 100dvh;
  min-height: unset;
  padding: 0;
  align-items: stretch;
}

.pb-support-remote-shell.is-viewer .pb-support-remote-card {
  width: 100%;
  flex: 1;
  min-height: 0;
  border-radius: 0;
  border-left: 0;
  border-right: 0;
  box-shadow: none;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0.55rem 0.75rem 0.4rem;
  box-sizing: border-box;
}

.pb-support-remote-shell.is-viewer .pb-support-remote-head {
  flex-shrink: 0;
  padding-bottom: 0.3rem;
  margin-bottom: 0.3rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
}

.pb-support-remote-shell.is-viewer .pb-support-remote-layout {
  flex: 1;
  min-height: 0;
  grid-template-rows: 1fr;
  align-items: stretch;
}

.pb-support-remote-shell.is-viewer .pb-support-remote-stage {
  min-height: 0;
  height: 100%;
}

.pb-support-remote-shell.is-viewer .pb-support-chat {
  min-height: 0;
  height: 100%;
}

.pb-support-remote-shell.is-viewer .pb-support-remote-footer {
  flex-shrink: 0;
  margin-top: 0.4rem;
  padding-top: 0.3rem;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
}

@media (max-width: 1024px) {
  .pb-support-remote-shell.is-viewer .pb-support-remote-layout {
    grid-template-rows: 1fr 20rem;
  }

  .pb-support-remote-shell.is-viewer .pb-support-chat {
    height: 20rem;
  }
}

@media (max-width: 768px) {
  .pb-support-remote-shell.is-viewer {
    padding: 0;
  }

  .pb-support-remote-shell.is-viewer .pb-support-remote-card {
    padding: 0.4rem 0.5rem 0.3rem;
    border-radius: 0;
  }

  .pb-support-remote-shell.is-viewer .pb-support-remote-layout {
    grid-template-rows: 1fr 15rem;
  }

  .pb-support-remote-shell.is-viewer .pb-support-chat {
    height: 15rem;
  }

  .pb-support-remote-shell.is-viewer .pb-support-float-end {
    right: 0.5rem;
    bottom: 0.5rem;
    padding: 0.6rem 0.75rem;
    font-size: 0.7rem;
  }
}
</style>

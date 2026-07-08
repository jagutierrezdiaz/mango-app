<template>
  <section v-if="canRender" class="pb-support-widget">
    <button
      v-if="!isSharing"
      type="button"
      class="pb-support-trigger"
      :disabled="isStarting"
      @click="startSupportSession"
    >
      <i class="fas fa-headset" aria-hidden="true"></i>
      Soporte
    </button>

    <article v-else class="pb-support-panel" :class="{ 'is-chat-mode': supportConnected }" role="status" aria-live="polite">
      <div class="pb-support-panel-header" :class="{ 'is-connected': supportConnected }">
        <strong>{{ supportConnected ? 'Tecnico Conectado - Soporte en curso' : 'Compartiendo pantalla' }}</strong>
        <div class="pb-support-header-right">
          <span class="pb-support-dot" :class="{ 'is-connected': supportConnected }" aria-hidden="true"></span>
          <button v-if="supportConnected" type="button" class="pb-support-stop pb-support-stop--inline" @click="stopSupportSession">
            <i class="fas fa-stop" aria-hidden="true"></i>
            Finalizar
          </button>
        </div>
      </div>

      <template v-if="!supportConnected">
        <p class="pb-support-copy">Comparte este enlace con soporte:</p>
        <div class="pb-support-link-wrap">
          <input :value="supportJoinUrl" readonly class="pb-support-link" />
          <button type="button" class="pb-support-copy-btn" @click="copySupportUrl">Copiar</button>
        </div>
        <p class="pb-support-id">Codigo: {{ supportId }}</p>
      </template>

      <div class="pb-support-chat-box">
        <p class="pb-support-chat-title">Chat de soporte</p>
        <div ref="chatLogRef" class="pb-support-chat-log">
          <p v-if="!chatMessages.length" class="pb-support-chat-empty">Sin mensajes</p>
          <article
            v-for="message in chatMessages"
            :key="message.id"
            class="pb-support-chat-item"
            :class="message.from === 'support' ? 'from-support' : 'from-user'"
          >
            <span>{{ message.from === 'support' ? 'Soporte' : 'Tu' }}</span>
            <p>{{ message.message }}</p>
          </article>
        </div>
        <form class="pb-support-chat-form" @submit.prevent="sendUserChatMessage">
          <input v-model="chatInput" type="text" maxlength="220" placeholder="Responder al tecnico" />
          <button type="submit" :disabled="!chatInput.trim()">Enviar</button>
        </form>
      </div>

      <button v-if="!supportConnected" type="button" class="pb-support-stop" @click="stopSupportSession">
        <i class="fas fa-stop" aria-hidden="true"></i>
        Detener captura
      </button>
    </article>
  </section>
</template>

<script setup>
import Peer from 'peerjs'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  buildUserPeerId,
  generateSupportId,
  getPeerConnectionConfigCandidates,
  getSupportJoinUrl
} from '../services/remoteSupportService'

const route = useRoute()
const peer = ref(null)
const screenStream = ref(null)
const supportId = ref('')
const supportJoinUrl = ref('')
const isStarting = ref(false)
const supportConnected = ref(false)
const chatInput = ref('')
const chatMessages = ref([])

let activeCall = null
let supportSessionEndedHandler = null
let supportChatHandler = null
let supportConnectedHandler = null
let supportWidgetWindowErrorHandler = null
let supportWidgetUnhandledRejectionHandler = null

const chatLogRef = ref(null)

watch(chatMessages, async () => {
  await nextTick()
  if (chatLogRef.value) {
    chatLogRef.value.scrollTop = chatLogRef.value.scrollHeight
  }
}, { deep: true })

const canRender = computed(() => {
  if (route.meta?.isSupport) return false
  return !!localStorage.getItem('token')
})

const resolveRoleView = () => {
  const path = String(route.path || '').toLowerCase()
  if (path.startsWith('/cajero')) return 'Caja'
  if (path.startsWith('/cocinero')) return 'Cocina'
  if (path.startsWith('/admin')) return 'Administracion'
  return 'Operacion'
}

const isSharing = computed(() => !!screenStream.value && !!supportId.value)

const emitUiNotification = (message, type = 'info') => {
  window.dispatchEvent(new CustomEvent('pb:notify-ui', {
    detail: { message, type }
  }))
}

const reportSupportWidgetError = (context, error, extra = {}) => {
  console.error(`[support-widget] ${context}`, error, extra)

  if (!window.socket) return
  window.socket.emit('support:log-client-error', {
    context,
    message: String(error?.message || error || 'unknown-error'),
    stack: String(error?.stack || ''),
    supportId: supportId.value || null,
    errorType: String(error?.type || ''),
    errorName: String(error?.name || ''),
    extra
  })
}

const emitSocketAck = (eventName, payload, timeoutMs = 5000) => new Promise((resolve) => {
  const activeSocket = window.socket
  if (!activeSocket) {
    resolve({ success: false, message: 'socket-not-ready' })
    return
  }

  let settled = false
  const finish = (result) => {
    if (settled) return
    settled = true
    resolve(result)
  }

  const timeout = setTimeout(() => {
    finish({ success: false, message: 'ack-timeout' })
  }, timeoutMs)

  activeSocket.emit(eventName, payload, (ack = {}) => {
    clearTimeout(timeout)
    finish(ack)
  })
})

const waitPeerOpen = (peerInstance) => new Promise((resolve, reject) => {
  const onOpen = () => {
    peerInstance.off('error', onError)
    resolve(true)
  }

  const onError = (error) => {
    peerInstance.off('open', onOpen)
    reject(error)
  }

  peerInstance.once('open', onOpen)
  peerInstance.once('error', onError)
})

const createPeerWithFallback = async (peerId) => {
  const configs = getPeerConnectionConfigCandidates()
  let lastError = null
  let lastAttemptMeta = null

  for (const config of configs) {
    const candidatePeer = new Peer(peerId, config)
    try {
      await waitPeerOpen(candidatePeer)
      return candidatePeer
    } catch (error) {
      lastError = error
      lastAttemptMeta = {
        path: config.path,
        host: config.host,
        port: config.port,
        secure: config.secure,
        key: config.key,
        errorType: String(error?.type || ''),
        errorName: String(error?.name || ''),
        errorMessage: String(error?.message || '')
      }
      reportSupportWidgetError('peer:connect-attempt-failed', error, lastAttemptMeta)
      candidatePeer.destroy()
    }
  }

  const enrichedError = lastError || new Error('peer-connect-failed')
  enrichedError.__supportExtra = lastAttemptMeta || null
  throw enrichedError
}

const resolveSupportIdWithRetry = (maxAttempts = 3) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const nextId = String(generateSupportId(6) || '').trim()
    if (nextId) return nextId
  }
  throw new Error('support-id-generation-failed')
}

const destroyPeer = () => {
  if (!peer.value) return
  peer.value.removeAllListeners()
  peer.value.destroy()
  peer.value = null
}

const appendChatMessage = (from, message) => {
  const clean = String(message || '').trim()
  if (!clean) return

  chatMessages.value.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    from,
    message: clean
  })

  if (chatMessages.value.length > 40) {
    chatMessages.value = chatMessages.value.slice(-40)
  }
}

const clearSocketRealtimeListeners = () => {
  if (!window.socket) return
  if (supportSessionEndedHandler) {
    window.socket.off('support:session-ended', supportSessionEndedHandler)
    supportSessionEndedHandler = null
  }
  if (supportChatHandler) {
    window.socket.off('support:chat-message', supportChatHandler)
    supportChatHandler = null
  }
  if (supportConnectedHandler) {
    window.socket.off('support:connected', supportConnectedHandler)
    supportConnectedHandler = null
  }
}

const stopScreenTracks = () => {
  if (!screenStream.value) return
  screenStream.value.getTracks().forEach((track) => track.stop())
  screenStream.value = null
}

const stopSupportSession = async () => {
  const currentSupportId = supportId.value

  if (activeCall) {
    activeCall.close()
    activeCall = null
  }

  stopScreenTracks()
  destroyPeer()

  supportId.value = ''
  supportJoinUrl.value = ''
  supportConnected.value = false
  chatInput.value = ''
  chatMessages.value = []
  isStarting.value = false
  clearSocketRealtimeListeners()

  if (currentSupportId && window.socket) {
    await emitSocketAck('support:unregister-request', { supportId: currentSupportId })
  }
}

const startSupportSession = async () => {
  if (isStarting.value || isSharing.value) return

  // ─── PASO 1: capturar pantalla INMEDIATAMENTE (transient activation requerida).
  // Ningún await puede preceder a esta llamada o el navegador lanza InvalidStateError.
  let stream
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: { ideal: 30, max: 60 } },
      audio: false
    })
  } catch (captureError) {
    // El usuario canceló o denegó el permisos — no es un error de app.
    const isUserCancel = captureError?.name === 'NotAllowedError' || captureError?.name === 'AbortError'
    if (!isUserCancel) {
      reportSupportWidgetError('getDisplayMedia', captureError)
      emitUiNotification('No fue posible compartir la pantalla', 'error')
    }
    return
  }

  // ─── PASO 2: ya tenemos stream — ahora podemos hacer operaciones asíncronas.
  isStarting.value = true
  clearSocketRealtimeListeners()

  try {
    const nextSupportId = resolveSupportIdWithRetry(4)
    supportId.value = nextSupportId
    supportJoinUrl.value = getSupportJoinUrl(nextSupportId)

    const userPeerId = buildUserPeerId(nextSupportId)
    const rawUser = JSON.parse(localStorage.getItem('user') || 'null')
    const rolVista = resolveRoleView()
    const userName = String(rawUser?.nombres || rawUser?.nombre_completo || rawUser?.usuario || 'Usuario Patio Bohemio')
    const userLocal = String(rawUser?.sede_nombre || rawUser?.sede || 'Local principal')

    const mainTrack = stream.getVideoTracks()[0]
    if (mainTrack) {
      mainTrack.onended = () => { stopSupportSession() }
    }

    const peerInstance = await createPeerWithFallback(userPeerId)

    peerInstance.on('call', (call) => {
      activeCall = call
      call.answer(stream)
      supportConnected.value = true
      emitUiNotification('Tecnico conectado. Soporte en curso.', 'success')

      call.on('stream', () => {
        supportConnected.value = true
      })

      call.on('close', () => {
        supportConnected.value = false
        activeCall = null
        emitUiNotification('Sesion de soporte finalizada', 'info')
      })
      call.on('error', (error) => {
        reportSupportWidgetError('peer:call:error', error)
        supportConnected.value = false
        activeCall = null
        emitUiNotification('No se pudo mantener la sesion de soporte', 'error')
      })
    })

    supportSessionEndedHandler = (payload = {}) => {
      if (String(payload.supportId || '') !== nextSupportId) return
      stopSupportSession()
      emitUiNotification('Sesion finalizada por soporte tecnico', 'info')
    }

    supportChatHandler = (payload = {}) => {
      if (String(payload.supportId || '') !== nextSupportId) return
      const from = payload.from === 'support' ? 'support' : 'user'
      appendChatMessage(from, payload.message)
    }

    supportConnectedHandler = (payload = {}) => {
      if (String(payload.supportId || '') !== nextSupportId) return
      supportConnected.value = true
      emitUiNotification('Tecnico conectado. Soporte en curso.', 'success')
    }

    if (window.socket) {
      if (typeof supportSessionEndedHandler === 'function') {
        window.socket.on('support:session-ended', supportSessionEndedHandler)
      }
      if (typeof supportChatHandler === 'function') {
        window.socket.on('support:chat-message', supportChatHandler)
      }
      if (typeof supportConnectedHandler === 'function') {
        window.socket.on('support:connected', supportConnectedHandler)
      }
    }

    const ack = await emitSocketAck('support:register-request', {
      supportId: nextSupportId,
      userPeerId,
      rol_vista: rolVista,
      nombre_usuario: userName,
      userName,
      userLocal
    })

    if (!ack?.success) {
      throw new Error(ack?.message || 'support-register-failed')
    }

    peer.value = peerInstance
    screenStream.value = stream

    emitUiNotification('Soporte remoto listo. Comparte el enlace con el tecnico.', 'success')
  } catch (_error) {
    // El stream ya existe — pararlo antes de reportar.
    console.log(_error)
    stream.getTracks().forEach((t) => t.stop())
    reportSupportWidgetError('startSupportSession', _error, _error?.__supportExtra || {})
    await stopSupportSession()
    emitUiNotification('No fue posible iniciar el soporte remoto', 'error')
  } finally {
    isStarting.value = false
  }
}

const copySupportUrl = async () => {
  if (!supportJoinUrl.value) return

  try {
    await navigator.clipboard.writeText(supportJoinUrl.value)
    emitUiNotification('Enlace copiado al portapapeles', 'success')
  } catch {
    emitUiNotification('No se pudo copiar el enlace', 'warning')
  }
}

const sendUserChatMessage = async () => {
  const message = String(chatInput.value || '').trim()
  if (!message || !supportId.value) return

  const ack = await emitSocketAck('support:chat-to-support', {
    supportId: supportId.value,
    message
  })

  if (!ack?.success) return
  appendChatMessage('user', message)
  chatInput.value = ''
}

onMounted(() => {
  supportWidgetWindowErrorHandler = (event) => {
    reportSupportWidgetError('window:error', event?.error || new Error(event?.message || 'window-error'))
  }

  supportWidgetUnhandledRejectionHandler = (event) => {
    reportSupportWidgetError('window:unhandledrejection', event?.reason || new Error('unhandled-rejection'))
  }

  window.addEventListener('error', supportWidgetWindowErrorHandler)
  window.addEventListener('unhandledrejection', supportWidgetUnhandledRejectionHandler)
})

onBeforeUnmount(() => {
  if (supportWidgetWindowErrorHandler) {
    window.removeEventListener('error', supportWidgetWindowErrorHandler)
    supportWidgetWindowErrorHandler = null
  }
  if (supportWidgetUnhandledRejectionHandler) {
    window.removeEventListener('unhandledrejection', supportWidgetUnhandledRejectionHandler)
    supportWidgetUnhandledRejectionHandler = null
  }

  stopSupportSession()
})
</script>

<style scoped>
.pb-support-widget {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 75;
}

.pb-support-trigger,
.pb-support-copy-btn,
.pb-support-stop {
  border: 0;
  cursor: pointer;
  font-family: var(--pb-font-ui, 'Manrope', sans-serif);
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.pb-support-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.75rem 1rem;
  border-radius: 0.9rem;
  color: #f0fdfa;
  background: linear-gradient(135deg, #0f766e, #0891b2);
  box-shadow: 0 14px 22px rgba(8, 47, 73, 0.2);
}

.pb-support-trigger:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.pb-support-panel {
  width: min(24rem, calc(100vw - 2rem));
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.32);
  border-radius: 1rem;
  padding: 0.9rem;
  box-shadow: 0 18px 32px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(10px);
}

.pb-support-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.9rem;
  color: #0f172a;
}

.pb-support-panel-header.is-connected strong {
  color: #047857;
}

.pb-support-dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 999px;
  background: #dc2626;
  box-shadow: 0 0 0 6px rgba(220, 38, 38, 0.2);
  animation: pb-support-pulse 1.1s ease-in-out infinite;
}

.pb-support-dot.is-connected {
  background: #22c55e;
  box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.22);
}

.pb-support-copy {
  margin-top: 0.65rem;
  margin-bottom: 0.4rem;
  font-size: 0.72rem;
  color: #334155;
}

.pb-support-link-wrap {
  display: flex;
  gap: 0.4rem;
}

.pb-support-link {
  flex: 1;
  border: 1px solid #cbd5e1;
  border-radius: 0.65rem;
  padding: 0.5rem 0.6rem;
  font-size: 0.72rem;
  color: #0f172a;
}

.pb-support-copy-btn,
.pb-support-stop {
  border-radius: 0.65rem;
  padding: 0.52rem 0.72rem;
  font-size: 0.66rem;
}

.pb-support-copy-btn {
  color: #0f172a;
  background: #e2e8f0;
}

.pb-support-id {
  margin-top: 0.45rem;
  margin-bottom: 0.7rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #0f766e;
}

.pb-support-chat-box {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 0.7rem;
  padding: 0.45rem;
  margin-bottom: 0.65rem;
  background: #f8fafc;
}

.pb-support-chat-title {
  margin: 0 0 0.35rem;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #0f766e;
}

.pb-support-chat-log {
  max-height: 8rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.35rem;
}

.pb-support-chat-empty {
  margin: 0;
  font-size: 0.72rem;
  color: #64748b;
}

.pb-support-chat-item {
  border-radius: 0.5rem;
  border: 1px solid rgba(148, 163, 184, 0.25);
  padding: 0.35rem 0.45rem;
}

.pb-support-chat-item span {
  font-size: 0.62rem;
  font-weight: 800;
  color: #0f766e;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.pb-support-chat-item p {
  margin: 0.18rem 0 0;
  font-size: 0.74rem;
  color: #0f172a;
}

.pb-support-chat-item.from-support {
  background: #ecfeff;
}

.pb-support-chat-item.from-user {
  background: #eef2ff;
}

.pb-support-chat-form {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.35rem;
}

.pb-support-chat-form input {
  border: 1px solid #cbd5e1;
  border-radius: 0.55rem;
  padding: 0.4rem 0.45rem;
  font-size: 0.73rem;
}

.pb-support-chat-form button {
  border: 0;
  border-radius: 0.55rem;
  background: #0f766e;
  color: #ecfeff;
  font-size: 0.67rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.4rem 0.6rem;
  cursor: pointer;
}

.pb-support-chat-form button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.pb-support-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pb-support-header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pb-support-stop {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  color: #fff1f2;
  background: linear-gradient(135deg, #be123c, #e11d48);
  width: 100%;
}

.pb-support-stop--inline {
  width: auto;
  padding: 0.32rem 0.6rem;
  font-size: 0.62rem;
  border-radius: 0.55rem;
}

/* Chat mode: hide link section, expand chat log */
.pb-support-panel.is-chat-mode .pb-support-chat-log {
  max-height: 18rem;
}

.pb-support-panel.is-chat-mode .pb-support-chat-box {
  margin-bottom: 0;
}

.pb-support-panel.is-chat-mode .pb-support-chat-title {
  color: #047857;
}

@keyframes pb-support-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(1.06);
    opacity: 0.85;
  }
}

@media (max-width: 640px) {
  .pb-support-widget {
    left: 0.75rem;
    right: 0.75rem;
    bottom: 0.75rem;
  }

  .pb-support-trigger {
    width: 100%;
    justify-content: center;
  }

  .pb-support-panel {
    width: 100%;
  }
}
</style>

import { useAuthStore } from '../stores'
import { useComandasStore } from '../stores/useComandasStore'
import { playNotification as playSoundFile } from './audioUtils'
import { createSocketDeduper } from './socketEventDedup'

// --- Audio unlock state and helpers
let audioUnlocked = false
export function isAudioUnlocked() {
  return Boolean(audioUnlocked)
}

/**
 * Try to resume a single global AudioContext (reused on window) and/or play a
 * tiny silent audio to satisfy autoplay user-gesture requirements.
 * This must be called from a user gesture (click/tap).
 */
export async function unlockAudioContext() {
  try {
    console.log('[realtimeNotifications] unlockAudioContext called — attempting resume/unlock')

    const w = window
    const AudioCtxClass = w.AudioContext || w.webkitAudioContext
    if (AudioCtxClass) {
      if (!w.__pb_audio_ctx) {
        try {
          w.__pb_audio_ctx = new AudioCtxClass()
        } catch (e) {
          // ignore creation errors
        }
      }
      const ctx = w.__pb_audio_ctx
      if (ctx && typeof ctx.resume === 'function') {
        try {
          await ctx.resume()
        } catch (e) {
          // resume may throw if already running or not allowed; continue to fallback
        }
      }
    }

    // Fallback: play a short silent audio (must exist in /public/sounds/)
    try {
      const a = new Audio('/sounds/silence.mp3')
      a.volume = 0
      await a.play().catch(() => {})
      try { a.pause() } catch (e) {}
      try { a.currentTime = 0 } catch (e) {}
    } catch (e) {
      // ignore
    }

    audioUnlocked = true
    console.log('[realtimeNotifications] audioUnlocked = true')
    window.dispatchEvent(new CustomEvent('pb:audio-unlocked'))
    return true
  } catch (err) {
    console.warn('[realtimeNotifications] unlockAudioContext failed', err)
    return false
  }
}

export function initNotificationAudio() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[realtimeNotifications] initNotificationAudio')
  }
}

let listenersRegistered = false

const socketDeduper = createSocketDeduper(2600)

/** Evita doble alerta (toast/sonido) cuando solicitud-cuenta y comanda-cerrada llegan seguidas por el mismo cierre. */
const cajaFlowAlertAt = new Map()
const CAJA_FLOW_ALERT_MS = 3200
const CAJA_FLOW_MAP_MAX = 400

const tryCajaFlowAlert = (comandaId) => {
  const cid = Number(comandaId || 0)
  if (!cid) return true
  const now = Date.now()
  const prev = cajaFlowAlertAt.get(cid) || 0
  if (now - prev < CAJA_FLOW_ALERT_MS) return false
  cajaFlowAlertAt.set(cid, now)
  if (cajaFlowAlertAt.size > CAJA_FLOW_MAP_MAX) {
    for (const [k, t] of cajaFlowAlertAt) {
      if (now - t > 120000) cajaFlowAlertAt.delete(k)
    }
  }
  return true
}

const uniqueSoundKeys = new Map()
const UNIQUE_SOUND_MS = 2200

export function clearDedupRegistry() {
  uniqueSoundKeys.clear()
  cajaFlowAlertAt.clear()
  recentKdsMeseroByComanda.clear()
}

export function checkDuplicate(key) {
  const k = String(key || '')
  if (!k) return false
  const now = Date.now()
  const prev = uniqueSoundKeys.get(k) || 0
  return now - prev < UNIQUE_SOUND_MS
}

export function playUniqueNotification(key, fileName) {
  const k = String(key || '')
  if (!k || !fileName) return false
  const now = Date.now()
  const prev = uniqueSoundKeys.get(k) || 0
  if (now - prev < UNIQUE_SOUND_MS) return false
  uniqueSoundKeys.set(k, now)
  playSoundFile(fileName)
  return true
}

/**
 * Desempaqueta payload enviado por el watcher (a veces viene como { payload: {...} }).
 */
export function resolveSocketPayload(raw) {
  const envelope = raw && typeof raw === 'object' ? raw : {}
  const inner = envelope.payload && typeof envelope.payload === 'object' ? envelope.payload : envelope
  return inner && typeof inner === 'object' ? inner : {}
}


const pickSound = (payload, fallbackFile) => {
  const fromPayload = String(payload?.sonido || payload?.sound || '').trim()
  if (fromPayload) return fromPayload
  return String(fallbackFile || '').trim()
}

const playIfAny = (payload, fallbackFile) => {
  const name = pickSound(payload, fallbackFile)
  if (!name) return
  playSoundFile(name)
}

// -----------------------
// Role / view based audio filtering
// -----------------------
const ROLE_ALLOW_MAP = {
  'nueva-comanda': ['COCINERO', 'BARISTA', 'BARTENDER'],
  'flash-comanda': ['COCINERO', 'BARISTA', 'BARTENDER'],
  'nuevo-producto-comanda': ['COCINERO', 'BARISTA', 'BARTENDER'],
  'editar-producto-comanda': ['COCINERO', 'BARISTA', 'BARTENDER'],
  'editar-comanda': ['COCINERO', 'BARISTA', 'BARTENDER'],
  'borrar-producto-comanda': ['COCINERO', 'BARISTA', 'BARTENDER', ],
  'plato-procesado': ['MESERO'],
  'cocina-comanda-actualizada': ['MESERO'],

  // Caja / cobranza events — prefer to play for cajero/admin (mesero may also want some)
  'comanda-cerrada': ['CAJERO'],
  'solicitud-cuenta': ['CAJERO'],
  'comanda-pagada': ['ADMINISTRADOR'],
  'abrir-cajon': ['CAJERO'],
  'borrar-comanda': ['COCINERO', 'BARISTA', 'BARTENDER']
}

/*
const ROLE_ALLOW_MAP = {
  'nueva-comanda': ['MESERO', 'COCINERO', 'BARISTA', 'BARTENDER', 'ADMINISTRADOR'],
  'flash-comanda': ['MESERO', 'COCINERO', 'BARISTA', 'BARTENDER', 'ADMINISTRADOR'],
  'nuevo-producto-comanda': ['MESERO', 'COCINERO', 'BARISTA', 'BARTENDER', 'ADMINISTRADOR'],
  'editar-producto-comanda': ['MESERO', 'COCINERO', 'BARISTA', 'BARTENDER', 'ADMINISTRADOR'],
  'editar-comanda': ['MESERO', 'COCINERO', 'BARISTA', 'BARTENDER', 'ADMINISTRADOR'],
  'borrar-producto-comanda': ['MESERO', 'COCINERO', 'BARISTA', 'BARTENDER', 'ADMINISTRADOR'],
  'plato-procesado': ['MESERO', 'COCINERO', 'BARISTA', 'BARTENDER', 'ADMINISTRADOR'],
  'cocina-comanda-actualizada': ['COCINERO', 'BARISTA', 'BARTENDER', 'MESERO', 'ADMINISTRADOR'],

  // Caja / cobranza events — prefer to play for cajero/admin (mesero may also want some)
  'comanda-cerrada': ['CAJERO', 'MESERO', 'ADMINISTRADOR'],
  'solicitud-cuenta': ['CAJERO', 'ADMINISTRADOR'],
  'comanda-pagada': ['CAJERO', 'ADMINISTRADOR'],
  'abrir-cajon': ['CAJERO', 'ADMINISTRADOR'],
  'borrar-comanda': ['MESERO', 'CAJERO', 'ADMINISTRADOR']
}
*/

const normalizeRole = () => {
  try {
    return String(useAuthStore().user?.rol || '').trim().toUpperCase()
  } catch (e) {
    return ''
  }
}

const shouldPlayForEvent = (eventName, payload) => {
  try {
    const allowed = ROLE_ALLOW_MAP[eventName]
    if (!Array.isArray(allowed)) return true // no restriction

    const role = normalizeRole()
    if (role && allowed.includes(role)) return true

    // If payload explicitly targets the current user (mesero/personal), allow
    const me = getAuthUserId()
    const target = Number(payload?.id_mesero || payload?.personal_id || 0)
    if (me && target && me === target) return true

    // Fallback: try to infer from path if role is not set
    try {
      const path = String(window.location.pathname || '').toLowerCase()
      if (path.includes('/cocina') && allowed.includes('COCINERO')) return true
      if (path.includes('/mesero') && allowed.includes('MESERO')) return true
      if (path.includes('/cajero') && allowed.includes('CAJERO')) return true
    } catch (ee) {
      // noop
    }

    return false
  } catch (err) {
    return true
  }
}

const getAuthUserId = () => {
  try {
    return Number(useAuthStore().user?.id || 0)
  } catch {
    return 0
  }
}

/** Evita doble toast si el watcher emite editar-* justo después de cocina-comanda-actualizada (misma comanda). */
const recentKdsMeseroByComanda = new Map()
const KDS_MESERO_SUPPRESS_MS = 2800

const esPersonalCocinaOBar = () => {
  try {
    const r = String(useAuthStore().user?.rol || '').trim().toUpperCase()
    return r === 'COCINERO' || r === 'COCINA' || r === 'BARISTA' || r === 'BARTENDER'
  } catch {
    return false
  }
}

const shouldSuppressEditarAfterKds = (comandaId) => {
  if (!esPersonalCocinaOBar()) return false
  const cid = Number(comandaId || 0)
  if (!cid) return false
  const t = recentKdsMeseroByComanda.get(cid) || 0
  return Date.now() - t < KDS_MESERO_SUPPRESS_MS
}

const markKdsMeseroSignal = (comandaId) => {
  const cid = Number(comandaId || 0)
  if (!cid) return
  recentKdsMeseroByComanda.set(cid, Date.now())
  if (recentKdsMeseroByComanda.size > 200) {
    const cutoff = Date.now() - KDS_MESERO_SUPPRESS_MS * 4
    for (const [k, v] of recentKdsMeseroByComanda) {
      if (v < cutoff) recentKdsMeseroByComanda.delete(k)
    }
  }
}

const comandaIdFromPayload = (payload) =>
  Number(payload?.comanda_id || payload?.id_comanda || payload?.id || 0)

/**
 * Misma clave para flash-comanda y nueva-comanda → un solo toast/sonido por comanda nueva.
 * (No usar refresh-cocina: el servidor también lo emite al agregar/borrar productos.)
 */
const kitchenNewUiKey = (payload) => {
  const cid = comandaIdFromPayload(payload)
  return cid > 0 ? `kitchen-new:${cid}` : ''
}

const notifyCerradaMessage = (payload) => {
  const mesaNombre = String(payload?.nombre_mesa || payload?.mesa_nombre || '').trim()
  const mesaId = Number(payload?.mesa_id || payload?.id_mesa || 0)
  const cid = comandaIdFromPayload(payload)
  const mesaLabel = mesaNombre || (mesaId ? `Mesa ${mesaId}` : (cid ? `Comanda #${cid}` : 'Comanda'))
  return `${mesaLabel} enviada a caja`
}

export function registerNotificationListeners(socket) {
  if (listenersRegistered) {
    console.warn('[realtimeNotifications] Listeners ya registrados')
    return
  }
  listenersRegistered = true
  const store = useComandasStore()

  socket.on('nueva-comanda', (raw) => {
    const payload = resolveSocketPayload(raw)
    const uiKey = kitchenNewUiKey(payload)
    const showUi = !uiKey || socketDeduper('nueva-comanda', payload, uiKey)
    console.log('[SOCKET] nueva-comanda', payload)
    const cid = comandaIdFromPayload(payload)
    if (cid && !store.comandas.some((c) => Number(c.id) === cid)) {
      store.addComanda(payload)
    }
    if (showUi) {
      const mesa = String(payload?.mesa_nombre || payload?.nombre_mesa || payload?.mesa || '').trim()
      notifyUi({
        message: mesa ? `Nueva comanda (${mesa})` : 'Nueva comanda recibida',
        type: 'success',
        duration: 4000,
      })
      if (shouldPlayForEvent('nueva-comanda', payload)) {
        playIfAny(payload, 'new_order.mp3')
      }
    }
  })

  // createComanda en API solo emite estos eventos (no "nueva-comanda") hasta que el watcher inserte en BD.
  socket.on('flash-comanda', (raw) => {
    const payload = resolveSocketPayload(raw)
    const uiKey = kitchenNewUiKey(payload)
    if (!uiKey || !socketDeduper('flash-comanda', payload, uiKey)) return
    console.log('[SOCKET] flash-comanda', payload)
    const mesa = String(payload?.mesa || payload?.mesa_nombre || payload?.nombre_mesa || '').trim()
    notifyUi({
      message: mesa ? `Nueva comanda (${mesa})` : 'Nueva comanda recibida',
      type: 'success',
      duration: 4000,
    })
    if (shouldPlayForEvent('flash-comanda', payload)) {
      playIfAny(payload, 'new_order.mp3')
    }
  })

  socket.on('cocina-comanda-actualizada', (raw) => {
    const payload = resolveSocketPayload(raw)
    if (!esPersonalCocinaOBar()) return
    const cid = comandaIdFromPayload(payload)
    if (!cid) return
    const did = Number(payload?.detalle_id || 0)
    const dedupKey =
      String(payload?.tipo || '') === 'detalle' && did > 0 ? `kds:${cid}:d:${did}` : `kds:${cid}`
    if (!socketDeduper('cocina-comanda-actualizada', payload, dedupKey)) return
    console.log('[SOCKET] cocina-comanda-actualizada', payload)
    markKdsMeseroSignal(cid)
    store.updateComanda(payload)
    const esDetalle = String(payload?.tipo || '') === 'detalle'
    notifyUi({
      message: esDetalle ? 'Producto actualizado por el mesero' : 'Pedido actualizado por el mesero',
      type: 'info',
      duration: 4000,
    })
    if (shouldPlayForEvent('cocina-comanda-actualizada', payload)) {
      playIfAny(payload, 'edit_warning.mp3')
    }
  })

  socket.on('editar-comanda', (raw) => {
    const payload = resolveSocketPayload(raw)
    if (!socketDeduper('editar-comanda', payload)) return
    console.log('[SOCKET] editar-comanda', payload)
    store.updateComanda(payload)
    const cid = comandaIdFromPayload(payload)
    if (shouldSuppressEditarAfterKds(cid)) return
    notifyUi({ message: 'Comanda actualizada', type: 'info', duration: 3200 })
    if (shouldPlayForEvent('editar-comanda', payload)) {
      playIfAny(payload, 'edit_warning.mp3')
    }
  })

  socket.on('borrar-comanda', (raw) => {
    const payload = resolveSocketPayload(raw)
    if (!socketDeduper('borrar-comanda', payload)) return
    console.log('[SOCKET] borrar-comanda', payload)
    store.removeComanda(payload)
    notifyUi({ message: 'Comanda eliminada', type: 'warning', duration: 4000 })
    if (shouldPlayForEvent('borrar-comanda', payload)) {
      playIfAny(payload, 'bell_ding.mp3')
    }
  })

  socket.on('comanda-cerrada', (raw) => {
    const payload = resolveSocketPayload(raw)
    if (!socketDeduper('comanda-cerrada', payload)) return
    console.log('[SOCKET] comanda-cerrada', payload)
    const cid = comandaIdFromPayload(payload)
    const exists = store.comandas.some((c) => Number(c.id) === cid)
    if (!exists) store.addComanda(payload)
    if (tryCajaFlowAlert(cid)) {
      notifyUi({ message: notifyCerradaMessage(payload), type: 'info', duration: 4200 })
      if (shouldPlayForEvent('comanda-cerrada', payload)) {
        playIfAny(payload, 'cash_register.mp3')
      }
    }
  })

  socket.on('nuevo-producto-comanda', (raw) => {
    const payload = resolveSocketPayload(raw)
    const ncid = comandaIdFromPayload(payload)
    const ndet = Number(payload?.detalle_id || payload?.id || 0)
    const npKey = ndet > 0 ? `np:${ncid}:${ndet}` : ''
    if (!socketDeduper('nuevo-producto-comanda', payload, npKey)) return
    console.log('[SOCKET] nuevo-producto-comanda', payload)
    const comandaId = Number(payload.comanda_id || payload.id_comanda || 0)
    if (comandaId) store.addDetalle(comandaId, payload)
    notifyUi({ message: 'Nuevo producto en comanda', type: 'info', duration: 4000 })
    if (shouldPlayForEvent('nuevo-producto-comanda', payload)) {
      playIfAny(payload, 'new_order.mp3')
    }
  })

  socket.on('editar-producto-comanda', (raw) => {
    const payload = resolveSocketPayload(raw)
    if (!socketDeduper('editar-producto-comanda', payload)) return
    console.log('[SOCKET] editar-producto-comanda', payload)
    const cid = comandaIdFromPayload(payload)
    if (shouldSuppressEditarAfterKds(cid)) return
    notifyUi({ message: 'Producto de comanda actualizado', type: 'info', duration: 3200 })
    if (shouldPlayForEvent('editar-producto-comanda', payload)) {
      playIfAny(payload, 'edit_warning.mp3')
    }
  })

  socket.on('borrar-producto-comanda', (raw) => {
    const payload = resolveSocketPayload(raw)
    const bpid = Number(payload?.detalle_id || 0)
    const bpcid = comandaIdFromPayload(payload)
    const bpKey = bpid > 0 ? `bp:${bpcid}:${bpid}` : ''
    if (!socketDeduper('borrar-producto-comanda', payload, bpKey)) return
    console.log('[SOCKET] borrar-producto-comanda', payload)
    store.removeDetalle(payload.comanda_id, payload.detalle_id)
    notifyUi({ message: 'Producto eliminado de la comanda', type: 'warning', duration: 4000 })
    if (shouldPlayForEvent('borrar-producto-comanda', payload)) {
      playIfAny(payload, 'bell_ding.mp3')
    }
  })

  socket.on('plato-procesado', (raw) => {
    const payload = resolveSocketPayload(raw)
    const me = getAuthUserId()
    const target = Number(payload?.id_mesero || payload?.personal_id || 0)
    if (target && me && target !== me) return
    const cid = comandaIdFromPayload(payload)
    const did = Number(payload?.detalle_id || 0)
    const platoDedupKey = did > 0 ? `plato:${cid}:${did}` : `plato:${cid}:${Number(payload?.notification_id || 0)}`
    if (!socketDeduper('plato-procesado', payload, platoDedupKey)) return
    console.log('[SOCKET] plato-procesado', payload)
    store.updateComanda(payload)
    notifyUi({ message: 'Producto listo para entrega.', type: 'success', duration: 4500 })
    if (shouldPlayForEvent('plato-procesado', payload)) {
      playIfAny(payload, 'bell_ding.mp3')
    }
  })

  socket.on('solicitud-cuenta', (raw) => {
    const payload = resolveSocketPayload(raw)
    if (!socketDeduper('solicitud-cuenta', payload)) return
    console.log('[SOCKET] solicitud-cuenta', payload)
    const sid = comandaIdFromPayload(payload)
    const ya = store.solicitudesPendientes.some(
      (s) => Number(s?.comanda_id || s?.id_comanda || 0) === sid
    )
    if (!ya) store.addSolicitud(payload)
    const cid = comandaIdFromPayload(payload)
    if (tryCajaFlowAlert(cid)) {
      notifyUi({ message: 'Solicitud de cuenta recibida', type: 'info', duration: 4000 })
      if (shouldPlayForEvent('solicitud-cuenta', payload)) {
        playIfAny(payload, 'cash_register.mp3')
      }
    }
  })

  socket.on('comanda-pagada', (raw) => {
    const payload = resolveSocketPayload(raw)
    if (!socketDeduper('comanda-pagada', payload)) return
    console.log('[SOCKET] comanda-pagada', payload)
    store.removeComanda(payload)
    notifyUi({ message: 'Comanda pagada', type: 'success', duration: 4000 })
    if (shouldPlayForEvent('comanda-pagada', payload)) {
      playIfAny(payload, 'success_finish.mp3')
    }
  })

  socket.on('abrir-cajon', (raw) => {
    const payload = resolveSocketPayload(raw)
    if (!socketDeduper('abrir-cajon', payload)) return
    console.log('[SOCKET] abrir-cajon', payload)
    notifyUi({ message: 'Cajón abierto', type: 'info', duration: 3000 })
  })

  console.log('[realtimeNotifications] Listeners de notificaciones en tiempo real registrados')
}

export function notifyUi(options = {}) {
  const {
    message = '',
    type = 'info',
    duration = 3500,
    persistent = false,
  } = options
  const text = String(message ?? '').trim()
  if (!text) return
  window.dispatchEvent(new CustomEvent('pb:notify-ui', {
    detail: { message: text, type, duration, persistent },
  }))
}

/** Reproduce un sonido desde `/public/sounds/` (misma lógica que las vistas). */
export function playNotification(fileName) {
  playSoundFile(fileName)
}

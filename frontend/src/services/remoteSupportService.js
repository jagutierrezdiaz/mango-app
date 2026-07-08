import { BACKEND_ORIGIN } from '../config/api'
import { DEV_BACKEND_ORIGIN } from '../config/devPorts'

const SUPPORT_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '')
const normalizePeerEnvOrigin = (value) => trimTrailingSlash(String(value || '')
  .trim()
  .replace(/^wss:/i, 'https:')
  .replace(/^ws:/i, 'http:'))
const inBrowser = typeof window !== 'undefined'
const browserOrigin = inBrowser ? trimTrailingSlash(window.location.origin || '') : ''
const browserHostname = inBrowser ? String(window.location.hostname || '').toLowerCase() : ''
const isLocalFrontendHost = browserHostname === 'localhost' || browserHostname === '127.0.0.1' || browserHostname === '::1'

const normalizePeerPath = (value) => {
  const raw = String(value || '/peerjs').trim()
  const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`
  if (withLeadingSlash === '/') return withLeadingSlash
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

const PEER_PATH = process.env.VUE_APP_PEER_PATH
  ? normalizePeerPath(process.env.VUE_APP_PEER_PATH)
  : '/peerjs/'
const PEER_KEY = String(process.env.VUE_APP_PEER_KEY || 'peerjs').trim() || 'peerjs'
const PEER_PING_INTERVAL = Math.max(1000, Number(process.env.VUE_APP_PEER_PING_INTERVAL || 5000) || 5000)

const resolvePeerOrigin = () => {
  const envPeerOrigin = process.env.VUE_APP_PEER_URL
    ? normalizePeerEnvOrigin(process.env.VUE_APP_PEER_URL)
    : ''

  if (process.env.NODE_ENV === 'production') {
    const probe = String(envPeerOrigin || '').toLowerCase()
    if (!probe || probe.includes('localhost') || probe.includes('127.0.0.1') || probe.includes('::1')) {
      return browserOrigin || trimTrailingSlash(BACKEND_ORIGIN)
    }

    return envPeerOrigin
  }

  if (envPeerOrigin) return envPeerOrigin
  if (trimTrailingSlash(BACKEND_ORIGIN)) return trimTrailingSlash(BACKEND_ORIGIN)
  if (browserOrigin && !isLocalFrontendHost) return browserOrigin
  return process.env.VUE_APP_PEER_URL || DEV_BACKEND_ORIGIN
}

export const normalizeSupportId = (value) => String(value || '')
  .trim()
  .toUpperCase()
  .replace(/[^A-Z0-9-]/g, '')

export const generateSupportId = (length = 6) => {
  const size = Math.max(4, Number(length) || 6)
  const chars = Array.from({ length: size }, () => {
    const index = Math.floor(Math.random() * SUPPORT_ALPHABET.length)
    return SUPPORT_ALPHABET[index]
  })
  return chars.join('')
}

export const buildUserPeerId = (supportId) => `pb-user-${normalizeSupportId(supportId)}`

export const buildSupportPeerId = (supportId) => {
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `pb-support-${normalizeSupportId(supportId)}-${suffix}`
}

export const getPeerConnectionConfig = () => {
  const peerOrigin = resolvePeerOrigin()
  const peerUrl = new URL(peerOrigin)
  const secure = peerUrl.protocol === 'https:'
  const hasExplicitPort = Boolean(peerUrl.port)
  const resolvedPort = hasExplicitPort
    ? Number(peerUrl.port)
    : (secure ? 443 : 80)
  const debugLevel = Number(process.env.VUE_APP_PEER_DEBUG)

  return {
    host: peerUrl.hostname,
    port: resolvedPort,
    path: PEER_PATH,
    key: PEER_KEY,
    secure,
    pingInterval: PEER_PING_INTERVAL,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ],
      sdpSemantics: 'unified-plan'
    },
    debug: Number.isFinite(debugLevel)
      ? debugLevel
      : (process.env.NODE_ENV === 'production' ? 3 : 1)
  }
}

export const getPeerConnectionConfigCandidates = () => {
  const base = getPeerConnectionConfig()
  const candidates = [base]

  const alternates = ['/peerjs/', '/']
  alternates.forEach((altPath) => {
    const normalizedAlt = normalizePeerPath(altPath)
    const normalizedCurrent = normalizePeerPath(base.path)
    if (normalizedAlt === normalizedCurrent) return

    candidates.push({
      ...base,
      path: normalizedAlt
    })
  })

  return candidates
}

export const getSupportJoinUrl = (supportId) => `${window.location.origin}/soporte/${normalizeSupportId(supportId)}`

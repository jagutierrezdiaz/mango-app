import { DEV_BACKEND_ORIGIN } from './devPorts'

const trimSlash = (value) => String(value || '').replace(/\/$/, '')
const normalizeSocketEnvOrigin = (value) => String(value || '')
  .trim()
  .replace(/^wss:/i, 'https:')
  .replace(/^ws:/i, 'http:')
const inBrowser = typeof window !== 'undefined'
const browserOrigin = inBrowser ? trimSlash(window.location.origin || '') : ''
const browserHostname = inBrowser ? String(window.location.hostname || '').toLowerCase() : ''
const isLocalFrontendHost = browserHostname === 'localhost' || browserHostname === '127.0.0.1' || browserHostname === '::1'

const resolveBackendOrigin = () => {
  // Durante desarrollo podemos respetar VUE_APP_API_URL.
  // Evitar que una variable de entorno mal configurada en el CI/build
  // inyecte un origen local de desarrollo en el bundle de producción.
  if (process.env.VUE_APP_API_URL && process.env.NODE_ENV !== 'production') {
    return trimSlash(process.env.VUE_APP_API_URL)
  }

  // Si la app corre detrás de Caddy (ej. patio.local), usar su mismo origen.
  if (browserOrigin && !isLocalFrontendHost) {
    return browserOrigin
  }

  return process.env.NODE_ENV === 'development' ? DEV_BACKEND_ORIGIN : browserOrigin
}

// VUE_APP_API_URL puede venir de .env.development o .env.production.
// Si no está definida, en producción se usa window.location.origin (mismo dominio vía proxy nginx).
export const BACKEND_ORIGIN = resolveBackendOrigin()

// Origen único para WebSocket tiempo real (debe coincidir con el backend que sirve /api).
// En producción, ignorar un VUE_APP_SOCKET_URL que apunte a localhost (evita conectar al
// backend de desarrollo por error). Preferir el `BACKEND_ORIGIN` cuando corresponda.
let _socketEnvOrigin = process.env.VUE_APP_SOCKET_URL
  ? trimSlash(normalizeSocketEnvOrigin(process.env.VUE_APP_SOCKET_URL))
  : ''

if (process.env.NODE_ENV === 'production') {
  const probe = String(_socketEnvOrigin || '').toLowerCase()
  if (!probe || probe.includes('localhost') || probe.includes('127.0.0.1')) {
    _socketEnvOrigin = ''
  }
}

export const SOCKET_ORIGIN = _socketEnvOrigin || BACKEND_ORIGIN

export const API_BASE_URL = `${trimSlash(BACKEND_ORIGIN)}/api`

export const buildApiUrl = (path = '') => {
  const normalizedPath = String(path).startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

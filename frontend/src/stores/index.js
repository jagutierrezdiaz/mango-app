import { defineStore } from 'pinia'
import { buildApiUrl } from '../config/api'

const REFRESH_EARLY_MS = 5 * 60 * 1000
const REFRESH_FALLBACK_MS = 10 * 60 * 1000
const REFRESH_MIN_MS = 15 * 1000
const IS_DEV = process.env.NODE_ENV !== 'production'

const logAuthRefresh = (...args) => {
  if (!IS_DEV) return
  // Debug controlado solo en desarrollo.
  console.debug('[auth-refresh]', ...args)
}

const parseJwtPayload = (token) => {
  try {
    const parts = String(token || '').split('.')
    if (parts.length < 2) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const decoded = decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    )
    return JSON.parse(decoded)
  } catch (_error) {
    return null
  }
}

const getNextRefreshDelay = (token) => {
  const payload = parseJwtPayload(token)
  const exp = Number(payload?.exp || 0)
  if (!exp) return REFRESH_FALLBACK_MS

  const targetMs = (exp * 1000) - REFRESH_EARLY_MS
  const delay = targetMs - Date.now()
  if (!Number.isFinite(delay)) return REFRESH_FALLBACK_MS
  return Math.max(REFRESH_MIN_MS, delay)
}

/*
  STORE DE AUTENTICACIÓN: Maneja el estado global del usuario y token.
  - State: Almacena user y token.
  - Actions: Métodos para setUser, logout, y lógica de redirección.
*/
let hydrationResolve
let hydrationPromise = new Promise((resolve) => { hydrationResolve = resolve })

export const useAuthStore = defineStore('auth', {
  state: () => {
    // Hydration universal: intenta leer de 'user-info' si 'user' es null
    let user = null
    try {
      user = JSON.parse(localStorage.getItem('user') || 'null')
      if (!user) {
        user = JSON.parse(localStorage.getItem('user-info') || 'null')
      }
    } catch { user = null }
    // Marca la hidratación como lista
    setTimeout(() => { hydrationResolve && hydrationResolve() }, 0)
    return {
      user,
      token: localStorage.getItem('token') || ''
    }
  },
    getters: {
      hydrationReady: () => hydrationPromise
    },
  actions: {
    updateToken(token) {
      this.token = token || ''

      if (this.token) {
        localStorage.setItem('token', this.token)

        if (window.socket && typeof window.socket.emit === 'function') {
          window.socket.emit('authenticate', { token: this.token })
        }

        this.scheduleTokenRefresh()
        return
      }

      localStorage.removeItem('token')

      if (this._refreshTimer) {
        clearTimeout(this._refreshTimer)
        this._refreshTimer = null
      }
    },
    setUser(user, token) {
      this.user = user
      this.token = token
      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('token', token)
      localStorage.setItem('user-info', JSON.stringify({ user, token }))
      this.updateToken(token)
    },
    scheduleTokenRefresh() {
      if (this._refreshTimer) {
        clearTimeout(this._refreshTimer)
        this._refreshTimer = null
      }

      if (!this.token) return

      const delay = getNextRefreshDelay(this.token)
      logAuthRefresh('next-refresh-scheduled', { inMs: delay })
      this._refreshTimer = setTimeout(() => {
        this.refreshToken()
      }, delay)
    },
    async refreshToken() {
      if (!this.token) return false

      try {
        logAuthRefresh('refresh-start')
        const response = await fetch(buildApiUrl('/auth/refresh'), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        })

        const result = await response.json().catch(() => ({}))
        if (!response.ok || result.success === false || !result.token) {
          throw new Error(result?.message || 'No se pudo renovar el token')
        }

        this.updateToken(result.token)

        if (result.user) {
          this.user = result.user
          localStorage.setItem('user', JSON.stringify(result.user))
        }

        logAuthRefresh('refresh-success')
        return true
      } catch (_error) {
        logAuthRefresh('refresh-failed-logout')
        // Si falla renovación por sesión inválida, limpiar sesión.
        this.logout()
        return false
      }
    },
    initTokenAutoRefresh() {
      if (!this.token) return

      if (window.socket && typeof window.socket.emit === 'function') {
        window.socket.emit('authenticate', { token: this.token })
      }

      this.scheduleTokenRefresh()

      if (this._storageSyncBound) return
      this._storageSyncBound = true

      window.addEventListener('storage', (event) => {
        if (event.key !== 'token' && event.key !== 'user') return

        const nextToken = localStorage.getItem('token') || ''
        const nextUser = JSON.parse(localStorage.getItem('user') || 'null')

        // Sincronizar sesión entre pestañas para evitar desajuste de rol/token.
        this.token = nextToken
        this.user = nextUser

        if (nextToken) {
          if (window.socket && typeof window.socket.emit === 'function') {
            window.socket.emit('authenticate', { token: nextToken })
          }
          this.scheduleTokenRefresh()
        } else {
          if (this._refreshTimer) {
            clearTimeout(this._refreshTimer)
            this._refreshTimer = null
          }
        }
      })
    },
    logout() {
      if (this._refreshTimer) {
        clearTimeout(this._refreshTimer)
        this._refreshTimer = null
      }

      this.user = null
      localStorage.removeItem('user')
      this.updateToken('')
    },
    // Método auxiliar para obtener headers con token
    getHeaders() {
      return {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    }
  }
})

/*
  STORE DE COMANDAS: Maneja el estado de comandas en tiempo real.
  - State: Lista de comandas activas.
  - Actions: Agregar, actualizar, eliminar comandas (para notificaciones push).
*/
export const useComandasStore = defineStore('comandas', {
  state: () => ({
    comandas: [] // Array de comandas activas
  }),
  actions: {
    addComanda(comanda) {
      this.comandas.push(comanda)
    },
    updateComanda(id, updates) {
      const index = this.comandas.findIndex(c => c.id === id)
      if (index !== -1) {
        this.comandas[index] = { ...this.comandas[index], ...updates }
      }
    },
    removeComanda(id) {
      this.comandas = this.comandas.filter(c => c.id !== id)
    },
    // Método para sincronizar con el bus en tiempo real (WebSocket)
    syncWithSocket(socket) {
      socket.on('nueva-comanda', (comanda) => {
        this.addComanda(comanda)
      })
      socket.on('comanda-lista', (id) => {
        this.updateComanda(id, { status: 'lista' })
      })
      socket.on('comanda-cerrada', (id) => {
        this.removeComanda(id)
      })
    }
  }
})
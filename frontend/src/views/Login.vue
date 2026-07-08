<template>
  <!--
    TEMPLATE: Define la estructura visual del componente.
    Aquí se renderiza el formulario de login con inputs reactivos.
  -->
  <div class="login-container min-h-screen flex items-center justify-center bg-gray-100">
    <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">

      <div class="flex justify-center -mt-20 mb-4">
        <img src="/img/mango-logo.png" alt="Mango Software"
            class="w-50 h-auto rounded-full shadow-lg bg-white p-2" />
      </div>

      <h2 class="text-2xl font-bold mb-6 text-center">{{ loginTitle }}</h2>
      <p class="-mt-4 mb-6 text-center text-xs font-semibold tracking-wide text-gray-500">{{ buildLabel }}</p>

      <!-- Formulario principal de login -->
      <form @submit.prevent="handleLogin" class="space-y-4" v-if="!requiresSetup">
        <div>
          <label class="block text-sm font-medium text-gray-700">Usuario</label>
          <input
            v-model="username"
            type="text"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Ingresa tu usuario"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Contraseña</label>
          <div class="relative mt-1">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              class="block w-full px-3 py-2 pr-11 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ingresa tu contraseña"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="password-toggle"
              :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            >
              <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
            </button>
          </div>
        </div>
        <button
          type="submit"
          :disabled="loading"
          class="w-full btn-icon-text py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <i :class="loading ? 'fas fa-spinner fa-spin' : 'fas fa-right-to-bracket'"></i>
          {{ loading ? 'Cargando...' : 'Iniciar Sesión' }}
        </button>
      </form>

      <!-- Formulario de configuración de contraseña (primer ingreso) -->
      <form @submit.prevent="handleSetup" class="space-y-4" v-else>
        <div class="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800 flex items-start gap-2">
          <i class="fas fa-circle-info mt-0.5 shrink-0"></i>
          <span>Tu cuenta no tiene contraseña. Registra una nueva para continuar.</span>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Nueva Contraseña</label>
          <div class="relative mt-1">
            <input
              v-model="newPassword"
              :type="showNewPassword ? 'text' : 'password'"
              required
              minlength="4"
              class="block w-full px-3 py-2 pr-11 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Mínimo 4 caracteres"
            />
            <button
              type="button"
              @click="showNewPassword = !showNewPassword"
              class="password-toggle"
              :aria-label="showNewPassword ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'"
            >
              <i :class="showNewPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
            </button>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Confirmar Contraseña</label>
          <div class="relative mt-1">
            <input
              v-model="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              required
              class="block w-full px-3 py-2 pr-11 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              :class="{ 'border-red-400 focus:ring-red-400 focus:border-red-400': confirmPassword && newPassword !== confirmPassword }"
              placeholder="Repite la contraseña"
            />
            <button
              type="button"
              @click="showConfirmPassword = !showConfirmPassword"
              class="password-toggle"
              :aria-label="showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'"
            >
              <i :class="showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
            </button>
          </div>
          <p v-if="confirmPassword && newPassword !== confirmPassword" class="mt-1 text-xs text-red-600">
            Las contraseñas no coinciden.
          </p>
        </div>
        <div v-if="setupSuccess" class="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800 flex items-start gap-2">
          <i class="fas fa-circle-check mt-0.5 shrink-0"></i>
          <span>{{ setupSuccess }}</span>
        </div>
        <button
          type="submit"
          :disabled="loading || (confirmPassword && newPassword !== confirmPassword)"
          class="w-full btn-icon-text py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          <i :class="loading ? 'fas fa-spinner fa-spin' : 'fas fa-key'"></i>
          {{ loading ? 'Guardando...' : 'Guardar Contraseña' }}
        </button>
      </form>

      <!-- Mensajes de error -->
      <!-- Aviso para habilitar sonido si el navegador bloqueó autoplay -->
      <div v-if="showEnableSoundNotice" class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800 flex items-center justify-between gap-2">
        <div class="flex items-center gap-3">
          <i class="fas fa-volume-xmark"></i>
          <div>
            <div class="font-semibold">Sonidos deshabilitados</div>
            <div class="text-xs">Haz clic para habilitar notificaciones sonoras en este dispositivo.</div>
          </div>
        </div>
        <button @click="enableSounds" class="btn px-3 py-1 bg-amber-600 text-white rounded">Habilitar sonido</button>
      </div>

      <div v-if="error" class="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        {{ error }}
      </div>
    </div>

    <!-- Botón flotante de WhatsApp -->
    <a
      href="https://wa.me/573182204367?text=Hola,%20necesito%20ayuda"
      target="_blank"
      class="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-3xl transition-all"
    >
      <i class="fab fa-whatsapp"></i>
    </a>

  </div>
</template>

<script>
/*
  SCRIPT: Contiene la lógica reactiva del componente.
  - Imports: Librerías y stores necesarios.
  - Data: Estado reactivo del componente.
  - Computed: Propiedades calculadas.
  - Methods: Funciones para manejar eventos y lógica.
  - Lifecycle: Hooks como mounted si es necesario.
*/
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { unlockAudioContext } from '../utils/realtimeNotifications'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores'
import { logger } from '../utils/logger'
import { buildApiUrl } from '../config/api.js'

export default {
  name: 'Login',
  setup() {
    // Estado reactivo usando Composition API
    const username = ref('')
    const password = ref('')
    const newPassword = ref('')
    const confirmPassword = ref('')
    const setupSuccess = ref('')
    const showPassword = ref(false)
    const showNewPassword = ref(false)
    const showConfirmPassword = ref(false)
    const loading = ref(false)
    const error = ref('')
    const requiresSetup = ref(false)
    const userId = ref(null)
    const now = new Date()
    const fallbackDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now)
    const fallbackTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Bogota',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(now).toLowerCase()

    const loginTitle = process.env.VUE_APP_LOGIN_TITLE || 'Iniciar Sesión'
    const buildInfo = process.env.VUE_APP_BUILD_INFO || `v 1.1.50 ${fallbackDate} ${fallbackTime}`
    const infoMatch = String(buildInfo).match(/^v\s+([^\s]+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}(?:\s*[ap]m)?)$/i)

    let buildLabel = buildInfo
    if (infoMatch) {
      const [, version, date, timeRaw] = infoMatch
      const normalizedTime = String(timeRaw).replace(/\s+/g, ' ').trim().toLowerCase()
      buildLabel = `v ${version} (${date} ${normalizedTime})`
    }

    // Instancias de stores y router
    const authStore = useAuthStore()
    const router = useRouter()

    // Método para manejar login normal
    const handleLogin = async () => {
      // Desbloquear audio sincrónicamente dentro del gesto del usuario (obligatorio para autoplay).
      console.log('[Login] Llamando unlockAudioContext() desde handleLogin')
      unlockAudioContext()
      logger.info('Iniciando proceso de login')
      loading.value = true
      error.value = ''

      try {
        logger.debug(`Intentando login para usuario: ${username.value}`)
        // Petición a la API de login
        const response = await fetch(buildApiUrl('/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.value, password: password.value })
        })

        const raw = await response.text()
        let data = {}
        try {
          data = raw ? JSON.parse(raw) : {}
        } catch (_parseError) {
          data = {}
        }

        if (!response.ok) {
          const serverMessage = String(data?.message || '').trim()
          error.value = serverMessage || `Error del servidor (${response.status})`
          logger.error(`Login HTTP ${response.status}: ${error.value}`)
          return
        }

        if (data.success) {
          logger.info(`Login exitoso para usuario: ${data.user.nombre}, rol: ${data.user.rol}`)
          // Guardar usuario y token en el store
          authStore.setUser(data.user, data.token)
          // Persistir user-info universal (user y token juntos)
          localStorage.setItem('user-info', JSON.stringify({ user: data.user, token: data.token }))
          // Reautenticar socket activo para suscripciones por rol/usuario
          if (window.socket && typeof window.socket.emit === 'function') {
            window.socket.emit('authenticate', { token: data.token })
          }
          // Redirigir según rol
          redirectByRole(data.user.rol)
        } else if (data.requiresSetup) {
          logger.warn(`Usuario ${username.value} requiere configuración de contraseña`)
          // Requiere configuración de contraseña
          requiresSetup.value = true
          userId.value = data.userId
        } else {
          logger.error(`Error en login: ${data.message || 'Error desconocido'}`)
          error.value = data.message || 'Error en login'
        }
      } catch (err) {
        logger.error(`Error de conexión en login: ${err.message}`)
        error.value = 'Error de conexión'
      } finally {
        loading.value = false
      }
    }
    
    // Estado y handlers para desbloqueo de audio manual
    const showEnableSoundNotice = ref(false)

    const onAudioUnlockRequired = () => {
      console.log('[Login] pb:audio-unlock-required recibido: mostrar aviso para habilitar sonido')
      showEnableSoundNotice.value = true
    }

    const enableSounds = async () => {
      console.log('[Login] Intentando habilitar sonido por gesto del usuario')
      try {
        const a = new Audio('/sounds/new_order.mp3')
        a.volume = 0
        await a.play()
        a.pause()
        a.currentTime = 0
        try { unlockAudioContext() } catch (e) {}
        showEnableSoundNotice.value = false
        console.log('[Login] Audio habilitado manualmente: éxito')
        window.dispatchEvent(new CustomEvent('pb:audio-unlocked'))
      } catch (err) {
        console.warn('No se pudo habilitar audio:', err?.message || err)
        console.log('[Login] Audio habilitado manualmente: fallo — dejar aviso visible')
        showEnableSoundNotice.value = true
      }
    }

    onMounted(() => {
      console.log('[Login] Registrando listener pb:audio-unlock-required')
      window.addEventListener('pb:audio-unlock-required', onAudioUnlockRequired)
    })

    onBeforeUnmount(() => {
      console.log('[Login] Removiendo listener pb:audio-unlock-required')
      window.removeEventListener('pb:audio-unlock-required', onAudioUnlockRequired)
    })

    // Método para configurar contraseña por primera vez
    const handleSetup = async () => {
      // Desbloquear audio sincrónicamente dentro del gesto del usuario.
      console.log('[Login] Llamando unlockAudioContext() desde handleSetup')
      unlockAudioContext()
        if (newPassword.value !== confirmPassword.value) {
          error.value = 'Las contraseñas no coinciden.'
          return
        }
        if (newPassword.value.length < 4) {
          error.value = 'La contraseña debe tener al menos 4 caracteres.'
          return
        }
      loading.value = true
      error.value = ''

      try {
        const response = await fetch(buildApiUrl('/auth/setup-password'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userId.value, password: newPassword.value })
        })

        const raw = await response.text()
        let data = {}
        try {
          data = raw ? JSON.parse(raw) : {}
        } catch (_parseError) {
          data = {}
        }

        if (!response.ok) {
          error.value = String(data?.message || '').trim() || `Error del servidor (${response.status})`
          return
        }

        if (data.success) {
          // Volver al login para que el usuario ingrese con su nueva contraseña
          setupSuccess.value = '¡Contraseña guardada! Ahora ingresa con tu nueva contraseña.'
          setTimeout(() => {
            requiresSetup.value = false
            newPassword.value = ''
            confirmPassword.value = ''
            setupSuccess.value = ''
            password.value = ''
            showPassword.value = false
            showNewPassword.value = false
            showConfirmPassword.value = false
          }, 2000)
        } else {
          error.value = data.message || 'Error en configuración'
        }
      } catch (err) {
        error.value = 'Error de conexión'
      } finally {
        loading.value = false
      }
    }

    // Función auxiliar para redirigir según rol
    const redirectByRole = (rol) => {
      const normalized = String(rol || '').trim()
      if (normalized === 'Cajero') {
        router.push('/cajero/arqueo')
        return
      }
      if (['Cocinero', 'Barista', 'Bartender'].includes(normalized)) {
        router.push('/cocina/pedidos')
        return
      }
      switch (normalized) {
        case 'Administrador':
          router.push('/admin/dashboard')
          break
        case 'Mesero':
          router.push('/mesero/pedidos')
          break
        default:
          router.push('/login')
      }
    }

    // Retornar estado y métodos para el template
    return {
      username,
      password,
      newPassword,
      confirmPassword,
      setupSuccess,
      showPassword,
      showNewPassword,
      showConfirmPassword,
      loading,
      error,
      requiresSetup,
      loginTitle,
      buildLabel,
      handleLogin,
      handleSetup,
      showEnableSoundNotice,
      enableSounds
    }
  }
}
</script>

<style scoped>
/*
  STYLE: Estilos específicos del componente.
  Scoped asegura que no afecten otros componentes.
  Aquí se pueden agregar estilos personalizados para el login.
*/
.login-container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: 0.75rem;
  transform: translateY(-50%);
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1;
}

.password-toggle:hover {
  color: #374151;
}
</style>
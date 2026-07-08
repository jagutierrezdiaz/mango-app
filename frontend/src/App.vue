<template>
  <div id="app">
    <router-view v-slot="{ Component, route }">
      <!-- Usar la ruta padre (matched[0]) como key para que los layouts
           (LayoutAdmin, CajeroLayout, CocineroLayout) NO se remonten al
           navegar entre sub-rutas del mismo módulo. Esto permite que
           RemoteSupportWidget sobreviva a la navegación interna.
           Las páginas dentro de cada layout tienen su propio :key en su
           router-view interno, así que se siguen reemplazando correctamente. -->
      <component :is="Component" :key="route.matched[0]?.path || route.fullPath" />
    </router-view>

    <div class="pb-toast-wrap pointer-events-none" aria-live="polite" aria-atomic="true">
      <transition-group name="pb-toast-fade" tag="div" class="space-y-2">
        <article
          v-for="toast in toasts"
          :key="toast.id"
          class="pb-toast pointer-events-auto"
          :class="`pb-toast-${toast.type || 'info'}`"
        >
          <p class="pb-toast-message">{{ toast.message }}</p>
          <button
            v-if="toast.persistent"
            type="button"
            class="pb-toast-close"
            @click="dismissToast(toast.id)"
          >
            Cerrar
          </button>
        </article>
      </transition-group>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from './stores'

const SOCKET_NOTIFICATION_EVENTS = [ // Eventos que el socket emite y que sincronizan el cursor local
  'nueva-comanda',
  'editar-comanda',
  'borrar-comanda',
  'nuevo-producto-comanda',
  'editar-producto-comanda',
  'borrar-producto-comanda',
  'solicitud-cuenta',
  'comanda-cerrada',
  'comanda-pagada',
  'plato-procesado',
  'abrir-cajon',
  'categorias-actualizadas',
  'productos-actualizados',
  'flash-comanda',
  'cocina-comanda-actualizada'
]

export default {
  name: 'App',
  setup() {
    const authStore = useAuthStore()
    const toasts = ref([])
    let notificationIntervalId = null
    let socketRef = null

    const dismissToast = (id) => {
      toasts.value = toasts.value.filter((item) => item.id !== id)
    }

    const handleNotifyUi = (event) => {
      const detail = event?.detail || {}
      const message = String(detail.message || '').trim()
      if (!message) return

      const id = Date.now() + Math.random()
      const duration = Number(detail.duration)
      const isPersistent = !!detail.persistent

      toasts.value.push({
        id,
        message,
        type: detail.type || 'info',
        persistent: isPersistent
      })

      if (!isPersistent) {
        const timeout = Number.isFinite(duration) ? Math.max(1200, duration) : 3500
        setTimeout(() => dismissToast(id), timeout)
      }
    }

    const emitSocketStatus = (status, extra = {}) => {
      window.dispatchEvent(new CustomEvent('pb:socket-status', {
        detail: { status, ...extra }
      }))
    }

    const syncPointerFromSocketPayload = (eventName, payload = {}) => {
      const incomingId = Number(payload?.notification_id || payload?.id_notificacion || 0)
      if (!Number.isFinite(incomingId) || incomingId <= 0) return
      console.log(`🧭 Cursor actualizado por socket en ${incomingId} (${eventName})`)
    }

    const bindSocketPointerSync = (candidate) => {
      const target = candidate || window.socket
      if (!target || target === socketRef || typeof target.on !== 'function') return

      if (socketRef && typeof socketRef.off === 'function') {
        for (const eventName of SOCKET_NOTIFICATION_EVENTS) {
          socketRef.off(eventName, socketPointerHandlers[eventName])
        }
      }

      socketRef = target
      for (const eventName of SOCKET_NOTIFICATION_EVENTS) {
        socketRef.on(eventName, socketPointerHandlers[eventName])
      }
    }

    const unbindSocketPointerSync = () => {
      if (!socketRef || typeof socketRef.off !== 'function') return
      for (const eventName of SOCKET_NOTIFICATION_EVENTS) {
        socketRef.off(eventName, socketPointerHandlers[eventName])
      }
      socketRef = null
    }

    const socketPointerHandlers = SOCKET_NOTIFICATION_EVENTS.reduce((acc, eventName) => {
      acc[eventName] = (payload = {}) => syncPointerFromSocketPayload(eventName, payload)
      return acc
    }, {})

    const handleSocketReady = () => {
      bindSocketPointerSync(window.socket)
    }

    onMounted(() => {
      window.addEventListener('pb:notify-ui', handleNotifyUi)
      window.addEventListener('pb:socket-ready', handleSocketReady)
      bindSocketPointerSync(window.socket)
    })

    onUnmounted(() => {
      window.removeEventListener('pb:notify-ui', handleNotifyUi)
      window.removeEventListener('pb:socket-ready', handleSocketReady)
      unbindSocketPointerSync()
    })

    return {
      toasts,
      dismissToast
    }
  }
}
</script>

<style>
/* Font Awesome: cargado en frontend/public/index.html via <link> para evitar bloqueo de Tracking Prevention */

html,
body,
#app {
  min-height: 100%;
}

html {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-text-size-adjust: 100%;
}

body {
  min-height: 100vh;
  min-height: 100svh;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior-y: auto;
  -webkit-overflow-scrolling: touch;
}

#app {
  width: 100%;
  overflow-x: hidden;
}

.pb-table-wrap {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
}

.pb-table-wrap > table,
.pb-data-table {
  width: 100%;
  min-width: 640px;
  border-collapse: separate;
  border-spacing: 0;
}

.pb-data-table th,
.pb-data-table td {
  vertical-align: top;
}

@media (max-width: 767px) {
  .pb-table-wrap {
    margin-inline: -0.75rem;
    padding-inline: 0.75rem;
  }
}

:root {
  --pb-bg-a: #ecfeff;
  --pb-bg-b: #f8fafc;
  --pb-panel: rgba(255, 255, 255, 0.86);
  --pb-panel-strong: rgba(255, 255, 255, 0.92);
  --pb-border-soft: rgba(148, 163, 184, 0.2);
  --pb-border-soft-2: rgba(148, 163, 184, 0.18);

  --pb-rgb-sky-950: 8, 47, 73;
  --pb-rgb-teal-700: 15, 118, 110;
  --pb-rgb-cyan-500: 6, 182, 212;
  --pb-rgb-cyan-300: 125, 211, 252;
  --pb-rgb-slate-900: 15, 23, 42;

  --pb-shadow-soft: 0 12px 30px rgba(15, 23, 42, 0.08);
  --pb-shadow-panel: 0 16px 35px rgba(15, 23, 42, 0.08);
  --pb-shadow-hero: 0 20px 40px rgba(15, 23, 42, 0.2);

  --pb-font-ui: 'Manrope', sans-serif;
  --pb-font-title: 'Sora', sans-serif;
}

.admin-crud-shell {
  font-family: var(--pb-font-ui);
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin-inline: auto;
  overflow-x: hidden;
  background:
    radial-gradient(circle at 5% 5%, rgba(var(--pb-rgb-teal-700), 0.16) 0, transparent 36%),
    radial-gradient(circle at 90% 10%, rgba(var(--pb-rgb-cyan-500), 0.16) 0, transparent 30%),
    linear-gradient(180deg, var(--pb-bg-a), var(--pb-bg-b));
  border-radius: 2rem;
}

.admin-crud-title {
  font-family: var(--pb-font-title);
  letter-spacing: -0.02em;
}

.admin-crud-subtitle {
  color: #64748b;
}

.admin-crud-primary-btn {
  background: #0f766e;
  color: #ecfeff;
  border-radius: 1rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  transition: all 0.2s ease;
}

.admin-crud-primary-btn:hover {
  background: #0d9488;
}

.admin-crud-panel {
  min-width: 0;
  max-width: 100%;
  background: var(--pb-panel);
  border: 1px solid var(--pb-border-soft);
  box-shadow: var(--pb-shadow-soft);
}

.admin-crud-shell * {
  min-width: 0;
}

.admin-crud-shell button,
.admin-crud-shell [role='button'],
.admin-crud-shell input,
.admin-crud-shell select,
.admin-crud-shell textarea {
  touch-action: manipulation;
}

.admin-card-title {
  color: #0f766e;
}

/* Global pattern: icon + text for actions and menu links */
.btn-icon-text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-icon-text i {
  line-height: 1;
}

.menu-link-icon-text {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.admin-crud-primary-btn,
.btn-upload-file,
.btn-modal-cancel,
.btn-modal-save,
.btn-cancel,
.btn-save {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.pb-toast-wrap {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 70;
  width: min(24rem, calc(100vw - 2rem));
}

.pb-toast {
  border-radius: 0.9rem;
  border: 1px solid #dbeafe;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
  padding: 0.75rem 0.85rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
}

.pb-toast-message {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #1e293b;
}

.pb-toast-close {
  border-radius: 0.6rem;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #334155;
  padding: 0.2rem 0.45rem;
  font-size: 0.62rem;
  font-weight: 900;
  text-transform: uppercase;
}

.pb-toast-info {
  border-color: #bae6fd;
}

.pb-toast-success {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.pb-toast-warning {
  border-color: #fed7aa;
  background: #fff7ed;
}

.pb-toast-error {
  border-color: #fecaca;
  background: #fef2f2;
}

.pb-toast-fade-enter-active,
.pb-toast-fade-leave-active {
  transition: all 0.2s ease;
}

.pb-toast-fade-enter-from,
.pb-toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 1024px) {
  .admin-crud-shell {
    border-radius: 1.35rem;
  }

  .admin-crud-title {
    font-size: clamp(1.45rem, 3.8vw, 2rem);
    line-height: 1.1;
  }

  .admin-crud-primary-btn,
  .btn-upload-file,
  .btn-modal-cancel,
  .btn-modal-save,
  .btn-cancel,
  .btn-save {
    min-height: 44px;
  }
}
</style>
<template>
  <div class="panel-modulos min-h-screen flex flex-col bg-slate-100 text-slate-800 overflow-hidden">
    <header class="panel-modulos-header shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm">
      <div class="panel-modulos-header-row mx-auto flex w-full items-center gap-3 px-4 py-3 md:gap-4 md:px-6">
        <div class="panel-modulos-brand flex min-w-0 shrink-0 items-center gap-3 md:gap-4">
          <div class="shrink-0 rounded-full border-2 border-teal-200 bg-white p-1 shadow-sm">
            <img
              :src="logoUrl"
              :alt="businessInfo.identificacion.razonSocial"
              class="h-11 w-11 rounded-full object-contain md:h-12 md:w-12"
              @error="onLogoError"
            >
          </div>
          <div class="min-w-0">
            <h1 class="truncate font-black uppercase italic tracking-tight text-slate-900 text-sm md:text-base">
              {{ businessInfo.identificacion.razonSocial }}
            </h1>
            <p class="truncate text-[10px] font-bold uppercase tracking-widest text-teal-700 md:text-[11px]">
              {{ businessInfo.identificacion.tipoDocumento }}: {{ businessInfo.identificacion.numeroDocumento }}
            </p>
            <p class="hidden truncate text-[10px] text-slate-500 lg:block">
              {{ businessInfo.ubicacion.direccion }} · {{ businessInfo.ubicacion.municipio }}, {{ businessInfo.ubicacion.departamento }}
            </p>
          </div>
        </div>

        <nav class="panel-modulos-nav flex min-w-0 flex-1 flex-wrap items-center justify-center gap-2">
          <button
            v-for="module in modules"
            :key="module.id"
            type="button"
            class="panel-nav-btn btn-icon-text"
            :class="{ 'is-active': activeModule?.id === module.id }"
            @click="openModule(module)"
          >
            <i :class="module.icon"></i>
            <span>{{ module.shortLabel }}</span>
          </button>

          <button
            v-if="activeModule"
            type="button"
            class="panel-nav-btn panel-nav-btn-panel btn-icon-text"
            @click="closeModule"
          >
            <i class="fas fa-grip"></i>
            <span>Panel</span>
          </button>
        </nav>

        <button
          type="button"
          class="panel-nav-btn panel-nav-btn-exit btn-icon-text shrink-0"
          @click="handleExit"
        >
          <i class="fas fa-right-from-bracket"></i>
          <span>Salir</span>
        </button>
      </div>
    </header>

    <main class="panel-modulos-main flex min-h-0 flex-1 flex-col">
      <section v-if="!activeModule" class="flex flex-1 items-center justify-center p-6">
        <div class="panel-empty-state text-center">
          <div class="panel-empty-icon">
            <i class="fas fa-grip"></i>
          </div>
          <p class="panel-empty-title">Panel de módulos</p>
          <p class="panel-empty-hint">Seleccione un módulo en el encabezado para comenzar</p>
        </div>
      </section>

      <div v-show="activeModule" class="panel-modulos-iframe-stack">
        <template v-for="module in modules" :key="module.id">
          <iframe
            v-if="loadedModules[module.id]"
            v-show="activeModule?.id === module.id"
            :src="module.url"
            :title="module.label"
            :name="`pb-panel-${module.id}`"
            class="panel-modulos-iframe"
          ></iframe>
        </template>
      </div>
    </main>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { businessInfo } from '../config/businessInfo.js'

const DEFAULT_LOGO_URL = '/img/mango-logo.png'
const FALLBACK_LOGO_URL = '/img/logo.png'

const MODULES = [
  {
    id: 'admin',
    label: 'Administración',
    shortLabel: 'Admin',
    url: '/admin/dashboard',
    icon: 'fas fa-user-shield'
  },
  {
    id: 'cocina',
    label: 'Cocina',
    shortLabel: 'Cocina',
    url: '/cocina/pedidos',
    icon: 'fas fa-fire-burner'
  },
  {
    id: 'mesero',
    label: 'Mesero',
    shortLabel: 'Mesero',
    url: '/mesero/pedidos',
    icon: 'fas fa-clipboard-list'
  },
  {
    id: 'caja',
    label: 'Caja',
    shortLabel: 'Caja',
    url: '/cajero/arqueo',
    icon: 'fas fa-cash-register'
  }
]

export default {
  name: 'PanelModulos',
  setup() {
    const router = useRouter()
    const logoUrl = ref(DEFAULT_LOGO_URL)
    const activeModule = ref(null)
    const loadedModules = ref({})
    const modules = MODULES

    const onLogoError = () => {
      if (logoUrl.value !== FALLBACK_LOGO_URL) {
        logoUrl.value = FALLBACK_LOGO_URL
      }
    }

    const openModule = (module) => {
      if (!loadedModules.value[module.id]) {
        loadedModules.value = {
          ...loadedModules.value,
          [module.id]: true
        }
      }
      activeModule.value = module
    }

    const closeModule = () => {
      activeModule.value = null
    }

    const handleExit = () => {
      router.push('/login')
    }

    return {
      businessInfo,
      logoUrl,
      modules,
      activeModule,
      loadedModules,
      onLogoError,
      openModule,
      closeModule,
      handleExit
    }
  }
}
</script>

<style scoped>
.panel-modulos {
  font-family: var(--pb-font-ui, 'Manrope', sans-serif);
  height: 100vh;
  height: 100dvh;
}

.panel-modulos-header h1 {
  font-family: var(--pb-font-title, 'Sora', sans-serif);
}

.panel-modulos-header-row {
  min-height: 4.5rem;
}

.panel-modulos-brand {
  max-width: min(100%, 22rem);
}

.panel-modulos-nav {
  justify-content: center;
}

.panel-nav-btn {
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  padding: 0.5rem 0.85rem;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #475569;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  white-space: nowrap;
}

.panel-nav-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.panel-nav-btn.is-active {
  border-color: #0f766e;
  background: #0f766e;
  color: #ecfeff;
  box-shadow: 0 4px 12px rgba(15, 118, 110, 0.25);
}

.panel-nav-btn-exit {
  margin-left: auto;
}

.panel-modulos-main {
  min-height: 0;
}

.panel-modulos-iframe-stack {
  position: relative;
  flex: 1;
  min-height: 0;
}

.panel-modulos-iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  background: #fff;
}

.panel-empty-state {
  max-width: 24rem;
}

.panel-empty-icon {
  display: inline-flex;
  height: 4rem;
  width: 4rem;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  background: rgba(15, 118, 110, 0.1);
  color: #0f766e;
  font-size: 1.35rem;
  margin-bottom: 1rem;
}

.panel-empty-title {
  font-family: var(--pb-font-title, 'Sora', sans-serif);
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #0f172a;
}

.panel-empty-hint {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #64748b;
}

@media (max-width: 1023px) {
  .panel-modulos-header-row {
    flex-wrap: wrap;
  }

  .panel-modulos-brand {
    flex: 1 1 auto;
    max-width: calc(100% - 6rem);
  }

  .panel-modulos-nav {
    order: 3;
    flex-basis: 100%;
    justify-content: flex-start;
  }

  .panel-nav-btn-exit {
    margin-left: 0;
  }
}

@media (min-width: 1024px) {
  .panel-modulos-nav {
    padding-inline: 1rem;
  }
}
</style>

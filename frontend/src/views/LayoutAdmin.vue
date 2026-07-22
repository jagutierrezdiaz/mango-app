<template>
  <!--
    TEMPLATE: Layout para usuarios ADMIN.
    - Sidebar con navegación a módulos.
    - Área principal con router-view.
    - Header con usuario y logout.
  -->
    <div class="admin-layout min-h-screen bg-gray-50 flex overflow-x-hidden">

      <!-- ═══════════════════════════════════════════
           SIDEBAR — desktop (lg+): fijo vertical
      ═══════════════════════════════════════════ -->
      <aside class="sidebar-surface hidden lg:flex lg:flex-col fixed inset-y-0 left-0 w-64 border-r border-white/20 shadow-sm z-40">
        <!-- Brand -->
        <div class="flex items-center gap-3 px-5 py-4 border-b border-white/20 shrink-0">
          <div class="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <i class="fas fa-leaf text-white text-sm"></i>
          </div>
          <div>
          
          <!--  
          <h1 class="font-black uppercase italic text-white text-[clamp(10px,1vw,16px)] leading-none whitespace-nowrap mb-2">
            Hazlo Software SAS
          </h1>

          <p class="text-[10px] text-cyan-100/80 uppercase font-bold tracking-wide whitespace-nowrap">
            Gestión de Restaurantes
          </p>
          -->

            <h1 class="font-black uppercase italic tracking-tighter text-white text-sm leading-tight">{{ businessInfo.identificacion.razonSocial }}</h1>             
            <p class="text-[8px] text-cyan-100/80 uppercase font-bold tracking-widest">Sistema de Gestión</p>
            
          </div>
        </div>

        <!-- Navegación agrupada -->
        <nav class="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <template v-for="group in menuGroups" :key="group.name">
            <!-- Grupo con un solo ítem → link directo -->
            <template v-if="group.items.length === 1 && !group.asMenu">
              <router-link
                :to="group.items[0].path"
                class="menu-link-icon-text px-4 py-2.5 rounded-xl text-cyan-100/90 hover:bg-white/10 hover:text-white transition-all font-bold uppercase text-[11px] tracking-widest"
                active-class="bg-white !text-slate-900 shadow-md"
              >
                <i :class="group.icon" class="w-4 text-center text-sm"></i>
                <span>{{ group.items[0].label }}</span>
              </router-link>
            </template>

            <!-- Grupo con múltiples ítems → colapsable -->
            <template v-else>
              <button
                @click="toggleGroup(group.name)"
                class="btn-icon-text w-full px-4 py-2.5 rounded-xl transition-all font-bold uppercase text-[11px] tracking-widest"
                :class="openGroups.includes(group.name) ? 'bg-white/15 text-white' : 'text-cyan-100/90 hover:bg-white/10 hover:text-white'"
              >
                <i :class="group.icon" class="w-4 text-center text-sm"></i>
                <span class="flex-1 text-left">{{ group.name }}</span>
                <i class="fas fa-chevron-down text-[9px] transition-transform duration-200"
                   :class="openGroups.includes(group.name) ? 'rotate-180' : ''"></i>
              </button>
              <div v-show="openGroups.includes(group.name)" class="ml-7 mt-0.5 mb-1 border-l-2 border-white/30 pl-3 space-y-0.5">
                <router-link
                  v-for="item in group.items"
                  :key="item.key || `${item.path}-${item.label}`"
                  :to="item.path"
                  class="menu-link-icon-text px-3 py-2 rounded-lg transition-all font-semibold text-[11px] uppercase tracking-wider"
                  :class="route.path === item.path ? 'bg-white !text-teal-900 font-black shadow-sm' : 'text-cyan-100/90 hover:bg-white/10 hover:text-white'"
                >
                  <i :class="item.icon" class="w-3.5 text-center text-[11px]"></i>
                  <span>{{ item.label }}</span>
                </router-link>
              </div>
            </template>
          </template>
        </nav>

        <!-- Usuario footer -->
        <div class="p-3 border-t border-white/20 shrink-0">
          <div class="flex items-center gap-2.5 bg-white/10 rounded-2xl px-3 py-2.5 backdrop-blur-sm">
            <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <i class="fas fa-user text-white text-xs"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-bold text-white truncate">{{ authUserDisplayName }}</p>
              <p class="text-[9px] text-cyan-100/80 uppercase tracking-wide">{{ authStore.user?.rol }}</p>
              <p class="text-[9px] text-cyan-100/70 tracking-wide mt-1">{{ buildLabel }}</p>
            </div>
            <button @click="logout" title="Cerrar sesión"
              class="btn-icon-text px-2.5 py-1.5 rounded-lg hover:bg-red-500/20 text-cyan-100/80 hover:text-red-100 transition-colors text-[10px] font-black uppercase tracking-wide">
              <i class="fas fa-sign-out-alt text-xs"></i>
              <span>Salir</span>
            </button>
          </div>
        </div>
      </aside>

      <!-- ═══════════════════════════════════════════
           TOP NAV — tablet + móvil (< lg)
      ═══════════════════════════════════════════ -->
      <header class="topbar-surface lg:hidden fixed top-0 left-0 right-0 z-50 border-b border-white/20 shadow-sm">
        <!-- Fila superior: brand + usuario -->
        <div class="flex items-center justify-between h-14 px-4">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
              <i class="fas fa-leaf text-white text-xs"></i>
            </div>
            <h1 class="font-black uppercase italic tracking-tighter text-white text-sm">{{ businessInfo.identificacion.razonSocial }}</h1>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-cyan-100 hidden sm:inline truncate max-w-[120px]">{{ authUserDisplayName }}</span>
            <button @click="logout"
              class="btn-icon-text px-2.5 py-1.5 rounded-lg hover:bg-red-500/20 text-cyan-100/80 hover:text-red-100 transition-colors text-[10px] font-black uppercase tracking-wide">
              <i class="fas fa-sign-out-alt text-sm"></i>
              <span>Salir</span>
            </button>
          </div>
        </div>
        <!-- Fila nav horizontal scrolleable -->
        <nav class="flex items-center overflow-x-auto gap-1 px-3 pb-2 scrollbar-hide">
          <template v-for="group in menuGroups" :key="group.name">
            <!-- Ítem único -->
            <template v-if="group.items.length === 1 && !group.asMenu">
              <router-link :to="group.items[0].path"
                class="menu-link-icon-text flex-shrink-0 px-3 py-1.5 rounded-xl text-cyan-100/90 hover:bg-white/10 hover:text-white font-bold text-[11px] uppercase tracking-wider transition-all whitespace-nowrap"
                active-class="bg-white !text-teal-900 shadow-sm">
                <i :class="group.icon" class="text-[11px]"></i>
                <span>{{ group.items[0].label }}</span>
              </router-link>
            </template>
            <!-- Múltiples ítems → mostrar todos individualmente en la barra -->
            <template v-else>
              <router-link v-for="item in group.items" :key="item.key || `${item.path}-${item.label}`" :to="item.path"
                class="menu-link-icon-text flex-shrink-0 px-3 py-1.5 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all whitespace-nowrap"
                :class="route.path === item.path ? 'bg-white !text-teal-900 shadow-sm' : 'text-cyan-100/90 hover:bg-white/10 hover:text-white'">
                <i :class="item.icon" class="text-[11px]"></i>
                <span>{{ item.label }}</span>
              </router-link>
            </template>
          </template>
        </nav>
      </header>

      <!-- ═══════════════════════════════════════════
           CONTENIDO PRINCIPAL
      ═══════════════════════════════════════════ -->
      <main class="flex-1 flex flex-col min-h-screen lg:ml-64 pt-[6.25rem] lg:pt-0 overflow-x-hidden">
        <!-- Barra de título desktop -->
        <header class="hidden lg:flex items-center justify-between h-14 px-6 bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="w-1 h-5 bg-teal-500 rounded-full"></div>
            <h2 class="text-sm font-black uppercase italic text-gray-700 tracking-tight">{{ currentPageTitle }}</h2>
          </div>
          <span class="text-[11px] text-gray-400 font-medium hidden md:block">
            {{ new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}
          </span>
        </header>

        <div class="admin-main-scroll flex-1 overflow-x-hidden">
          <div class="admin-content-viewport mx-auto w-full px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-5 lg:px-6 lg:py-6">
            <router-view v-slot="{ Component, route: currentRoute }">
              <component :is="Component" :key="currentRoute.fullPath" />
            </router-view>
          </div>
        </div>
      </main>

      <ConfirmarBorradoModal
        v-model="deleteSecurityOpen"
        :usuario-activo="deleteSecurityUser"
        :mensaje-advertencia="pendingDeleteRequest?.mensajeAdvertencia || ''"
        @confirmacion-final="handleDeleteConfirmed"
        @cancelado="handleDeleteCancelled"
      />

      <RemoteSupportWidget />
    </div>
</template>

<script>
/*
  SCRIPT: Lógica del layout ADMIN.
  - Imports: Router, auth store.
  - Estado: menuItems con navegación.
  - Computed: currentPageTitle basado en ruta.
  - Métodos: logout.
*/
import { ref, computed, watch, onMounted, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores'
import ConfirmarBorradoModal from '../components/ConfirmarBorradoModal.vue'
import RemoteSupportWidget from '../components/RemoteSupportWidget.vue'
import { DELETE_SECURITY_KEY } from '../composables/useDeleteSecurity.js'
import { businessInfo } from '../config/businessInfo.js'

export default {
  name: 'LayoutAdmin',
  components: {
    ConfirmarBorradoModal,
    RemoteSupportWidget
  },
  setup() {
    const OPEN_GROUPS_STORAGE_KEY = 'admin_open_menu_groups'
    const router = useRouter()
    const route = useRoute()
    const authStore = useAuthStore()
    const buildVersion = process.env.VUE_APP_BUILD_VERSION || '0.0.0'
    const buildDate = process.env.VUE_APP_BUILD_DATE || new Date().toISOString().slice(0, 10)
    const buildLabel = `v${buildVersion} (${buildDate})`
    const deleteSecurityOpen = ref(false)
    const pendingDeleteRequest = ref(null)

    const authUserDisplayName = computed(() => {
      const singleName = String(authStore.user?.nombre || '').trim()
      if (singleName) return singleName

      return [authStore.user?.nombres, authStore.user?.apellidos]
        .filter(Boolean)
        .join(' ')
        .trim() || 'Usuario'
    })

    const deleteSecurityUser = computed(() => ({
      ...(authStore.user || {}),
      nombre: authUserDisplayName.value
    }))

    const resetDeleteState = () => {
      deleteSecurityOpen.value = false
      pendingDeleteRequest.value = null
    }

    const requestDeleteSecurity = (config = {}) => {
      return new Promise((resolve) => {
        pendingDeleteRequest.value = {
          execute: config.execute,
          mensajeAdvertencia: config.mensajeAdvertencia || '',
          successMessage: config.successMessage || 'Registro eliminado correctamente.',
          errorMessage: config.errorMessage || 'No se pudo completar la eliminacion.',
          resolve
        }
        deleteSecurityOpen.value = true
      })
    }

    provide(DELETE_SECURITY_KEY, requestDeleteSecurity)

    const handleDeleteCancelled = () => {
      const currentRequest = pendingDeleteRequest.value
      resetDeleteState()
      currentRequest?.resolve?.(false)
    }

    const handleDeleteConfirmed = async () => {
      const currentRequest = pendingDeleteRequest.value
      if (!currentRequest || typeof currentRequest.execute !== 'function') {
        resetDeleteState()
        return
      }

      try {
        await currentRequest.execute()
        if (currentRequest.successMessage) {
          alert(currentRequest.successMessage)
        }
        currentRequest.resolve(true)
      } catch (error) {
        alert(error?.message || currentRequest.errorMessage)
        currentRequest.resolve(false)
      } finally {
        resetDeleteState()
      }
    }

    // Grupos de menú (igual que la app legacy)
    const menuGroups = [
      {
        name: 'Indicadores',
        icon: 'fas fa-chart-line',
        items: [{ label: 'Dashboard', path: '/admin/dashboard', icon: 'fas fa-home' }]
      },
      {
        name: 'Productos',
        icon: 'fas fa-box-open',
        asMenu: true,
        items: [
          { label: 'Categorías', path: '/admin/categorias', icon: 'fas fa-tags' },
          { label: 'Fichas Técnicas', path: '/admin/fichas-tecnicas', icon: 'fas fa-utensils' },
          { label: 'Lista de Precios', path: '/admin/lista-precios', icon: 'fas fa-money-bill-wave' }
        ]
      },
      {
        name: 'Personal',
        icon: 'fas fa-id-badge',
        asMenu: true,
        items: [{ label: 'Personal', path: '/admin/personal', icon: 'fas fa-users' }]
      },
      {
        name: 'Compras',
        icon: 'fas fa-shopping-cart',
        asMenu: true,
        items: [
          { label: 'Artículos', path: '/admin/articulos', icon: 'fas fa-boxes' },
          { label: 'Proveedores', path: '/admin/proveedores', icon: 'fas fa-truck' },
          { label: 'Compras', path: '/admin/compras', icon: 'fas fa-file-invoice-dollar' },
          { label: 'Inventario', path: '/admin/inventario', icon: 'fas fa-warehouse' }
        ]
      },
      {
        name: 'Producción',
        icon: 'fas fa-industry',
        asMenu: true,
        items: [
          { label: 'Programar', path: '/admin/produccion/programar', icon: 'fas fa-calendar-check' },
          { label: 'Registrar', path: '/admin/produccion/registrar', icon: 'fas fa-edit' }
        ]
      },
      {
        name: 'Salon',
        icon: 'fas fa-concierge-bell',
        asMenu: true,
        items: [
          { key: 'salon-mesas', label: 'Mesas', path: '/admin/salon/mesas', icon: 'fas fa-chair' },
          { key: 'salon-servicios', label: 'Servicios', path: '/admin/salon/servicios', icon: 'fas fa-concierge-bell' },
          { key: 'salon-ventas', label: 'Comandas', path: '/admin/salon/ventas', icon: 'fas fa-cash-register' }
        ]
      },
      {
        name: 'Finanzas',
        icon: 'fas fa-coins',
        asMenu: true,
        items: [
          { key: 'salon-arqueo', label: 'Arqueos', path: '/admin/salon/arqueo-caja', icon: 'fas fa-cash-register' },
          { key: 'finanzas-tesoreria', label: 'TESORERIA', path: '/admin/finanzas/movimientos-tesoreria', icon: 'fas fa-vault' },
        /*   { key: 'finanzas-movimientos-efectivo', label: 'Movimientos Efectivo', path: '/admin/finanzas/movimientos-tesoreria', icon: 'fas fa-exchange-alt' }, */
          { label: 'REGISTRO GASTOS', path: '/admin/gastos', icon: 'fas fa-receipt' },
          { key: 'finanzas-cxp', label: 'PAGO A PROVEEDORES', path: '/admin/finanzas/cuentas-por-pagar', icon: 'fas fa-file-invoice-dollar' },
          { key: 'finanzas-resultados', label: 'Resultados', path: '/admin/finanzas/resultados', icon: 'fas fa-chart-pie' }
        ]
      },
      {
        name: 'Utilidades',
        icon: 'fas fa-ruler-combined',
        asMenu: true,
        items: [
          { key: 'util-ajustes', label: 'AJUSTES', path: '/admin/ajustes', icon: 'fas fa-balance-scale' },
          { key: 'util-auditoria', label: 'Auditoria BD', path: '/admin/auditoria', icon: 'fas fa-history' },
          { key: 'util-parametros', label: 'Parametros', path: '/admin/parametros', icon: 'fas fa-sliders-h' },
          { key: 'util-unidades', label: 'Unidades', path: '/admin/unidades', icon: 'fas fa-balance-scale' }
        ]
      }
    ]

    const getGroupNameByPath = (path) => {
      const group = menuGroups.find((g) => g.items.some((item) => item.path === path))
      return group ? group.name : null
    }

    const readStoredOpenGroups = () => {
      try {
        const raw = localStorage.getItem(OPEN_GROUPS_STORAGE_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return parsed.filter((name) => menuGroups.some((group) => group.name === name))
      } catch {
        return []
      }
    }

    const saveOpenGroups = () => {
      localStorage.setItem(OPEN_GROUPS_STORAGE_KEY, JSON.stringify(openGroups.value))
    }

    const ensureRouteGroupOpen = (path) => {
      const groupName = getGroupNameByPath(path)
      if (!groupName) return
      if (!openGroups.value.includes(groupName)) {
        openGroups.value.push(groupName)
      }
    }

    // Grupos abiertos (persistidos entre navegaciones)
    const openGroups = ref(readStoredOpenGroups())
    if (!openGroups.value.length) {
      const defaultGroup = getGroupNameByPath(route.path) || 'Compras'
      openGroups.value = [defaultGroup]
    }
    ensureRouteGroupOpen(route.path)

    const toggleGroup = (name) => {
      const idx = openGroups.value.indexOf(name)
      if (idx > -1) openGroups.value.splice(idx, 1)
      else openGroups.value.push(name)
      saveOpenGroups()
    }

    onMounted(() => {
      saveOpenGroups()
    })

    watch(
      () => route.path,
      (newPath) => {
        ensureRouteGroupOpen(newPath)
        saveOpenGroups()
      }
    )

    // Todos los ítems planos para el título de página
    const allItems = menuGroups.flatMap(g => g.items)

    // Título de página actual
    const currentPageTitle = computed(() => {
      const item = allItems.find(item => item.path === route.path)
      return item ? item.label : 'Administración'
    })

    // Logout
    const logout = async () => {
      await authStore.logout()
      router.push('/login')
    }

    return {
      menuGroups,
      openGroups,
      toggleGroup,
      businessInfo,
      currentPageTitle,
      route,
      authStore,
      authUserDisplayName,
      buildLabel,
      deleteSecurityOpen,
      deleteSecurityUser,
      pendingDeleteRequest,
      handleDeleteConfirmed,
      handleDeleteCancelled,
      logout
    }
  }
}
</script>

<style scoped>
.sidebar-surface,
.topbar-surface {
  background:
    linear-gradient(130deg, rgba(var(--pb-rgb-sky-950), 0.92), rgba(var(--pb-rgb-teal-700), 0.9)),
    radial-gradient(circle at 80% 20%, rgba(var(--pb-rgb-cyan-300), 0.35), transparent 50%);
}

.admin-layout {
  min-height: 100svh;
  width: 100%;
  overflow-x: hidden;
}

.admin-main-scroll {
  min-height: 0;
  overflow: visible;
  overscroll-behavior-y: auto;
}

.admin-content-viewport {
  width: min(100%, 1380px);
  min-width: 0;
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom));
}

.admin-content-viewport > * {
  min-width: 0;
  max-width: 100%;
}

/* Ocultar scrollbar en la nav horizontal del top bar */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

@media (min-width: 768px) and (max-width: 1279px) {
  .admin-content-viewport {
    width: min(100%, 1100px);
    padding-left: clamp(0.9rem, 2.2vw, 1.5rem);
    padding-right: clamp(0.9rem, 2.2vw, 1.5rem);
  }
}
</style>
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores'
const Login = () => import('../views/Login.vue')
const LayoutAdmin = () => import('../views/LayoutAdmin.vue')
const MeseroLayout = () => import('../views/MeseroLayout.vue')
const Comandas = () => import('../views/mesero/Comandas.vue')
const CocineroLayout = () => import('../views/CocineroLayout.vue')
const ProgramaCocina = () => import('../views/cocinero/ProgramaCocina.vue')
const CajeroLayout = () => import('../views/CajeroLayout.vue')
const GestionCaja = () => import('../views/cajero/GestionCaja.vue')
const SoporteRemoto = () => import('../views/SoporteRemoto.vue')
const PanelModulos = () => import('../views/PanelModulos.vue')
const TrasladosDinero = () => import('../views/TrasladosDinero.vue')

// Normaliza el rol para que coincida exactamente con el ENUM de MySQL: 'Administrador', 'Mesero', etc.
const normalizeRole = (role) => {
  const raw = String(role || '').trim();
  if (!raw) return null;
  if (raw === 'Administrador') return 'Administrador';
  if (raw === 'Mesero') return 'Mesero';
  if (raw === 'Cajero') return 'Cajero';
  if (raw === 'Cocinero') return 'Cocinero';
  if (raw === 'Barista') return 'Barista';
  if (raw === 'Bartender') return 'Bartender';
  // Permitir variantes comunes por compatibilidad
  if (raw.toLowerCase() === 'administrador' || raw.toLowerCase() === 'admin') return 'Administrador';
  if (raw.toLowerCase() === 'mesero') return 'Mesero';
  if (raw.toLowerCase() === 'cajero') return 'Cajero';
  if (raw.toLowerCase() === 'cocinero') return 'Cocinero';
  if (raw.toLowerCase() === 'barista') return 'Barista';
  if (raw.toLowerCase() === 'bartender') return 'Bartender';
  return raw;
}

const decodeJwtPayload = (token) => {
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    )
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

const getRoleFromAuth = (authStore) => {
  const role = authStore.user?.rol || decodeJwtPayload(authStore.token)?.rol || null
  return normalizeRole(role)
}

const getDefaultRouteByRole = (role) => {
  switch (role) {
    case 'Administrador': return '/admin/dashboard'
    case 'Cocinero':
    case 'Barista':
    case 'Bartender':
      return '/cocina/pedidos'
    case 'Mesero':
      return '/mesero/pedidos'
    case 'Cajero':
      return '/cajero/arqueo'
    default: return '/login'
  }
}

const normalizeSupportId = (value) => String(value || '')
  .trim()
  .toUpperCase()
  .replace(/[^A-Z0-9-]/g, '')

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

const ensureSocketConnected = (sharedSocket, timeoutMs = 5000) => new Promise((resolve) => {
  if (!sharedSocket) {
    resolve(false)
    return
  }

  if (sharedSocket.connected) {
    resolve(true)
    return
  }

  let settled = false
  const finish = (result) => {
    if (settled) return
    settled = true
    clearTimeout(timeoutId)
    sharedSocket.off('connect', handleConnect)
    sharedSocket.off('connect_error', handleConnectError)
    resolve(result)
  }

  const handleConnect = () => finish(true)
  const handleConnectError = () => finish(false)
  const timeoutId = setTimeout(() => finish(false), timeoutMs)

  sharedSocket.once('connect', handleConnect)
  sharedSocket.once('connect_error', handleConnectError)

  try {
    sharedSocket.connect()
  } catch (_error) {
    finish(false)
  }
})

const emitWithAck = (socket, eventName, payload, timeoutMs = 4500) => new Promise((resolve) => {
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

const validateSupportSession = async (supportId) => {
  const normalizedId = normalizeSupportId(supportId)
  if (!normalizedId) return false

  const sharedSocket = await waitForSharedSocket(5000)
  const isConnected = await ensureSocketConnected(sharedSocket, 5000)
  if (!sharedSocket || !isConnected) return false

  try {
    const ack = await emitWithAck(
      sharedSocket,
      'support:validate-session',
      { supportId: normalizedId },
      4500
    )

    return !!ack?.active
  } catch {
    return false
  }
}

/*
  RUTAS: Define las rutas de la aplicación con meta información.
  - path: URL de la ruta.
  - name: Nombre único para navegación programática.
  - component: Componente Vue a renderizar.
  - meta: Información adicional (requiere auth, roles permitidos).
*/
const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false } // No requiere login
  },
  {
    path: '/panel',
    name: 'PanelModulos',
    component: PanelModulos,
    meta: { requiresAuth: false }
  },
  {
    path: '/admin',
    component: LayoutAdmin,
    meta: { requiresAuth: true, roles: ['Administrador'] },
    children: [
      {
        path: '',
        redirect: '/admin/dashboard'
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { requiresAuth: true, roles: ['Administrador'] }
      },
      {
        path: 'articulos',
        name: 'Articulos',
        component: () => import('../views/Articulos.vue')
      },
      {
        path: 'categorias',
        name: 'Categorias',
        component: () => import('../views/Categorias.vue')
      },
      {
        path: 'personal',
        name: 'Personal',
        component: () => import('../views/Personal.vue')
      },
      {
        path: 'fichas-tecnicas',
        name: 'FichasTecnicas',
        component: () => import('../views/FichasTecnicas.vue')
      },
      {
        path: 'lista-precios',
        name: 'ListaPrecios',
        component: () => import('../views/ListaPrecios.vue')
      },
      {
        path: 'lista-de-precios',
        redirect: '/admin/lista-precios'
      },
      {
        path: 'proveedores',
        name: 'Proveedores',
        component: () => import('../views/Proveedores.vue')
      },
      {
        path: 'proveedor',
        redirect: '/admin/proveedores'
      },
      {
        path: 'compras',
        name: 'Compras',
        component: () => import('../views/Compras.vue')
      },
      {
        path: 'compra',
        redirect: '/admin/compras'
      },
      {
        path: 'inventario',
        name: 'Inventario',
        component: () => import('../views/KardexArticulos.vue')
      },
      {
        path: 'inventarios',
        redirect: '/admin/inventario'
      },
      {
        path: 'ajustes',
        name: 'Ajustes',
        component: () => import('../views/ajustesContables.vue')
      },
      {
        path: 'gastos',
        name: 'Gastos',
        component: () => import('../views/Gastos.vue')
      },
      {
        path: 'gasto',
        redirect: '/admin/gastos'
      },
      {
        path: 'costos',
        name: 'Costos',
        component: () => import('../views/Costos.vue')
      },
      {
        path: 'produccion/programar',
        name: 'ProgramaProduccion',
        component: () => import('../views/ProgramaProduccion.vue')
      },
      {
        path: 'produccion/registrar',
        name: 'RegistrarProduccion',
        component: () => import('../views/RegistrarProduccion.vue')
      },
      {
        path: 'salon/mesas',
        name: 'AdminMesas',
        component: () => import('../views/Mesas.vue')
      },
      {
        path: 'salon/servicios',
        name: 'SalonServicios',
        component: () => import('../views/admin/comandasServicio.vue')
      },
      {
        path: 'salon/ventas',
        name: 'InformeCaja',
        component: () => import('../views/InformeCaja.vue')
      },
      {
        path: 'salon/arqueo-caja',
        name: 'InformeArqueoCaja',
        component: () => import('../views/GestionArqueos.vue')
      },
      {
        path: 'finanzas/tesoreria',
        name: 'Tesoreria',
        component: () => import('../views/Tesoreria.vue')
      },
      {
        path: 'finanzas/movimientos-tesoreria',
        name: 'MovimientosTesoreria',
        component: () => import('../views/movimientosTesoreria.vue')
      },
      {
        path: 'finanzas/resultados',
        name: 'EstadoResultados',
        component: () => import('../views/EstadoResultados.vue')
      },
      {
        path: 'finanzas/cuentas-por-pagar',
        name: 'CuentasPorPagar',
        component: () => import('../views/CuentasPorPagar.vue')
      },
      {
        path: 'parametros',
        name: 'ParametrosSistema',
        component: () => import('../views/ParametrosSistema.vue')
      },
      {
        path: 'auditoria',
        name: 'Auditoria',
        component: () => import('../views/Auditoria.vue')
      },
      {
        path: 'unidades',
        name: 'Unidades',
        component: () => import('../views/Unidades.vue')
      },
      {
        path: 'traslados-dinero',
        name: 'trasladosDinero', // ESTE ES EL NOMBRE QUE BUSCA TU BOTÓN
        component: TrasladosDinero,
        meta: { title: 'Traslados de Dinero' }
      }
    ]
  },
  {
    path: '/mesero',
    component: MeseroLayout,
    meta: { requiresAuth: true, roles: ['Mesero'] },
    children: [
      {
        path: '',
        redirect: '/mesero/pedidos'
      },
      {
        path: 'pedidos',
        name: 'Comandas',
        component: Comandas,
        meta: { requiresAuth: true, roles: ['Mesero'] }
      }
    ]
  },
  {
    path: '/cocina',
    component: CocineroLayout,
    meta: { requiresAuth: true, roles: ['Cocinero', 'Barista', 'Bartender'] },
    children: [
      {
        path: '',
        redirect: '/cocina/pedidos'
      },
      {
        path: 'pedidos',
        name: 'ProgramaCocina',
        component: ProgramaCocina,
        meta: { requiresAuth: true, roles: ['Cocinero', 'Barista', 'Bartender'] }
      },
      {
        path: 'programacion',
        redirect: '/cocina/pedidos'
      }
    ]
  },
  {
    path: '/cajero',
    component: CajeroLayout,
    meta: { requiresAuth: true, roles: ['Cajero'] },
    children: [
      {
        path: '',
        redirect: '/cajero/arqueo'
      },
      {
        path: 'arqueo',
        name: 'GestionCaja',
        component: GestionCaja,
        meta: { requiresAuth: true, roles: ['Cajero'] }
      }
    ]
  },
  // Ruta por defecto: redirige según rol
  {
    path: '/',
    redirect: () => {
      const authStore = useAuthStore()
      return getDefaultRouteByRole(getRoleFromAuth(authStore))
    }
  },
  {
    path: '/dashboard',
    redirect: '/admin/dashboard'
  },
  // Rutas legacy eliminadas: '/comandas', '/comanda', '/cocina', '/caja', '/cajero/cobros', '/cocinero/pedidos', '/mesero/comanda'.
  // Solo se mantienen rutas válidas: '/admin/dashboard', '/cocina/pedidos', '/mesero/pedidos', '/cajero/arqueo'.
  {
    path: '/soporte',
    name: 'SoporteConsole',
    component: SoporteRemoto,
    meta: { requiresAuth: false, isSupport: true }
  },
  {
    path: '/soporte/:support_id',
    name: 'SoporteRemoto',
    component: SoporteRemoto,
    meta: { requiresAuth: false, isSupport: true }
  }
]

/*
  ROUTER: Instancia del router con configuración.
  - history: Modo de navegación (HTML5 History API).
  - routes: Array de rutas definidas arriba.
*/
const router = createRouter({
  history: createWebHistory(),
  routes
})

// para borrar solo en desarrollo — acceso directo a la vista Tesoreria
if (process.env.NODE_ENV === 'development') {
  routes.push({
    path: '/dev/tesoreria',
    name: 'TesoreriaDev',
    component: () => import('../views/Tesoreria.vue'),
    meta: { requiresAuth: false }
  })
}

/*
  GUARDS DE NAVEGACIÓN: Middleware que se ejecuta antes de cada cambio de ruta.
  - Verifica autenticación.
  - Verifica permisos por rol.
  - Redirige automáticamente si no cumple condiciones.
*/
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  if (authStore.hydrationReady) {
    await authStore.hydrationReady
  }
  const isAuthenticated = !!authStore.token
  const userRole = isAuthenticated ? getRoleFromAuth(authStore) : null

  // Auditoría de navegación
  console.log(`[Router] Navegando a: ${to.path} | Rol detectado: ${userRole} | Requiere: ${to.meta.roles}`)

  // Espera activa si está autenticado pero el usuario aún no está cargado
  if (isAuthenticated && !authStore.user?.rol) {
    console.log('[Router] Esperando hidratación de usuario...')
    if (authStore.hydrationReady) {
      await authStore.hydrationReady
    }
  }

  // Soporte remoto
  if (to.meta.isSupport) {
    const supportParam = String(to.params.support_id || '').trim()
    if (!supportParam) { next(); return }
    const isValidSupport = await validateSupportSession(to.params.support_id)
    if (isValidSupport) { next(); return }
    next({ path: '/soporte', query: { motivo: 'sesion-no-activa' } }); return
  }

  // Si la ruta requiere auth y no está logueado
  if (to.meta.requiresAuth && !isAuthenticated) {
    if (to.path !== '/login') { next('/login'); return }
    next(); return
  }

  // Si está logueado pero intenta ir a login
  if (isAuthenticated && to.path === '/login') {
    const defaultRoute = getDefaultRouteByRole(userRole)
    if (to.path !== defaultRoute) { next(defaultRoute); return }
    next(); return
  }

  // Verificar roles permitidos (solo si hay rol y está autenticado)
  if (to.meta.roles && isAuthenticated) {
    if (!to.meta.roles.includes(userRole)) {
      const defaultRoute = getDefaultRouteByRole(userRole)
      if (to.path !== defaultRoute) { next(defaultRoute); return }
      next(false); return // Bloquea acceso si no es su ruta
    }
  }

  // Todo OK, continuar
  next()
})

// Mitiga errores transitorios de lazy chunks durante hot-reload o cache desfasado.
router.onError((error, to) => {
  const message = String(error?.message || '')
  const isChunkError = /Loading chunk\s+\S+\s+failed|ChunkLoadError|Failed to fetch dynamically imported module/i.test(message)
  if (!isChunkError) return

  try {
    const targetPath = to?.fullPath || window.location.pathname || '/'
    const reloadKey = `chunk-reload:${targetPath}`
    const alreadyReloaded = sessionStorage.getItem(reloadKey)

    if (alreadyReloaded) {
      sessionStorage.removeItem(reloadKey)
      return
    }

    sessionStorage.setItem(reloadKey, '1')
    window.location.assign(targetPath)
  } catch {
    window.location.reload()
  }
})

export default router
<template>
  <div class="kitchen-shell w-screen ml-[calc(-50vw+50%)] px-0 lg:px-0 xl:px-0">
    <button
      v-if="showEnableSoundNotice"
      type="button"
      class="sound-enable-banner"
      :disabled="activatingSound"
      @click="activateSoundByUserGesture"
    >
      {{ activatingSound ? 'Activando sonidos...' : 'Haga clic aqui para activar sonidos' }}
    </button>

    <div class="socket-health-wrap">
      <button
        type="button"
        class="socket-health-btn"
        :class="socketHealthClass"
        :title="healthTooltipText"
        :aria-label="healthTooltipText"
        @click="toggleHealthTooltip"
        @blur="hideHealthTooltip"
      >
        <span class="socket-health-led"></span>
      </button>
      <div v-if="showHealthTooltip" class="socket-health-tooltip">
        <p class="socket-health-title">{{ socketHealthLabel }}</p>
        <p class="socket-health-time">Ult. sync: {{ lastSyncLabel }}</p>
      </div>
    </div>

    <section class="kds-banner mb-0 px-4 py-3 md:px-6 grid items-center gap-x-3" style="grid-template-columns: 1fr auto 1fr">
      <!-- Izquierda: marca + contador -->
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-2 shrink-0">
          <div class="shrink-0 flex items-center justify-center h-9 w-9 rounded-xl bg-white/15 border border-white/25">
            <i class="fas fa-utensils text-white text-sm"></i>
          </div>
          <div class="hidden sm:block">
            <p class="text-xs font-black uppercase tracking-wide text-white leading-tight">Cocina y Barra</p>
          </div>
        </div>

        <span class="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-white/90 shrink-0">
          <i class="fas fa-layer-group text-[9px]"></i>
          {{ ticketsOrdenados.length }} comanda(s)
        </span>
      </div>

      <!-- Centro: título -->
      <h2 class="kitchen-title text-xl md:text-2xl text-white font-extrabold leading-none tracking-tight text-center whitespace-nowrap">Tablero de Comandas</h2>

      <!-- Derecha: usuario + salir -->
      <div class="flex items-center justify-end gap-2">
        <div class="user-chip rounded-xl px-2.5 py-1.5 flex items-center gap-2 border border-white/20 bg-white/10 backdrop-blur-sm">
          <div class="h-8 w-8 rounded-lg overflow-hidden border border-sky-200/40 bg-slate-100 shrink-0">
            <img
              :src="getPersonalImageUrl(currentUser?.url_foto, currentUser?.nombre || 'Usuario')"
              :alt="currentUser?.nombre || 'Usuario'"
              class="h-full w-full object-cover"
              @error="handleImageError"
            >
          </div>
          <div>
            <p class="text-white font-black text-xs uppercase leading-none">{{ currentUser?.nombre || 'Usuario' }}</p>
            <p class="text-[9px] font-bold uppercase tracking-wider text-blue-200/80 leading-tight mt-0.5">{{ currentUser?.rol || 'Sin rol' }}</p>
          </div>
          <button
            type="button"
            class="ml-1 inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/15 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white transition hover:bg-white/25"
            @click="logout"
          >
            <i class="fas fa-sign-out-alt text-[9px]"></i>
            <span>Salir</span>
          </button>
        </div>
      </div>
    </section>

    <section class="px-2 md:px-3 lg:px-2 xl:px-2 pt-4">
      <div v-if="loading && !ticketsOrdenados.length" class="rounded-3xl border border-slate-200 bg-white/70 py-16 flex justify-center">
        <div class="h-12 w-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
      </div>

      <div v-else-if="!ticketsOrdenados.length" class="rounded-3xl border border-dashed border-slate-300 bg-white/60 py-14 text-center">
        <i class="fas fa-clipboard-check text-4xl text-slate-300 mb-4 block"></i>
        <p class="text-sm font-black uppercase tracking-widest text-slate-500">No hay tickets pendientes</p>
        <p class="text-xs font-semibold text-slate-400 mt-2">Esperando nuevas comandas desde mesero.</p>
      </div>

      <div v-else class="grid w-full grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-5 lg:gap-3 xl:grid-cols-5 xl:gap-3">
        <article
          v-for="ticket in ticketsOrdenados"
          :key="ticket.id"
          class="kds-ticket rounded-2xl border shadow-sm overflow-hidden flex flex-col"
          :class="[
            getUrgencyTicketClass(ticket.elapsedMinutes),
            recentlyAddedTicketId === ticket.id ? 'kds-ticket-enter' : ''
          ]"
        >
          <header class="kds-ticket-header px-4 py-3 border-b border-white/40">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <p class="text-[11px] uppercase tracking-[0.18em] font-black opacity-75 mb-1">Mesa</p>
                <p class="text-4xl font-black leading-none tracking-tight text-slate-900 break-words mb-3">{{ ticket.mesaNombre }}</p>
                
                <!-- Ficha del Mesero -->
                <div class="flex items-center gap-2.5 mt-2">
                  <div class="h-10 w-10 rounded-full bg-slate-200 border-2 border-slate-300 overflow-hidden shrink-0 flex items-center justify-center">
                    <img
                      v-if="ticket.meseroFoto"
                      :src="getPersonalImageUrl(ticket.meseroFoto, ticket.meseroNombre || 'Mesero')"
                      :alt="ticket.meseroNombre"
                      class="h-full w-full object-cover"
                      @error="handleImageError"
                    >
                    <i v-else class="fas fa-user text-slate-400 text-xs"></i>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="font-black text-slate-800 text-sm truncate">{{ ticket.meseroNombre }}</p>
                    <span v-if="ticket.meseroRol" class="inline-flex rounded-md border border-teal-300 bg-teal-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-teal-700 mt-0.5">
                      {{ ticket.meseroRol }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="shrink-0 text-right flex items-start gap-2">
                <p class="text-sm font-black rounded-lg px-2 py-1 border" :class="getTimerClass(ticket.elapsedMinutes)">
                  {{ ticket.elapsedMinutes }} min
                </p>
                <button
                  type="button"
                  @click.stop="toggleOrder(ticket)"
                  :aria-expanded="selectedOrderId === ticket.id"
                  class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-slate-700"
                >
                  <i :class="['fas fa-chevron-down transition-transform', selectedOrderId === ticket.id ? 'rotate-180' : '']"></i>
                </button>
              </div>
            </div>
          </header>

          <div class="p-3 md:p-4 flex-1 min-h-0">
            <div class="mb-2 flex items-center justify-between gap-2">
              <p class="text-[10px] uppercase tracking-widest font-black text-slate-500">Comanda #{{ ticket.id }}</p>
              <p class="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {{ ticket.totalUnidades }} uds · {{ ticket.items.length }} partida(s)
              </p>
            </div>

            <div class="ticket-items max-h-[420px] overflow-y-auto pr-1 space-y-2.5">
              <div
                v-for="item in ticket.items"
                :key="item.id"
                class="rounded-xl border border-slate-200 bg-white/95 p-3"
              >
                <div class="flex items-start gap-3">
                  <div class="h-14 w-14 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                    <img
                      :src="getProductImageUrl(item.producto_url_foto, item.producto_nombre)"
                      :alt="item.producto_nombre"
                      class="h-full w-full object-cover"
                      @error="handleImageError"
                    >
                  </div>

                  <div class="min-w-0 flex-1">
                    <div class="flex items-start justify-between gap-2">
                      <h4 class="text-xl font-black uppercase leading-tight text-slate-800">{{ item.producto_nombre }}</h4>
                      <span class="inline-flex shrink-0 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-xl font-black text-sky-500">
                        x{{ item.cantidad }}
                      </span>
                    </div>

                    <p
                      v-if="item.observaciones_mesero"
                      class="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs font-bold text-amber-800"
                    >
                      <span class="block text-[10px] font-black uppercase tracking-wider text-amber-900">OBSERVACIONES</span>
                      <span class="block mt-1">{{ item.observaciones_mesero }}</span>
                    </p>

                    <p
                      v-if="item.observaciones_cocina"
                      class="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1.5 text-xs font-bold text-sky-800"
                    >
                      <span class="block text-[10px] font-black uppercase tracking-wider text-sky-900">COCINA</span>
                      <span class="block mt-1">{{ item.observaciones_cocina }}</span>
                    </p>

                    <button
                      type="button"
                      class="mt-3 inline-flex min-h-[46px] w-full items-center justify-center rounded-xl border border-emerald-700 bg-emerald-600 px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      :disabled="item.detalleIds.some((id) => savingDetalleIds.includes(id))"
                      @click="marcarDetalleListo(ticket.id, item)"
                    >
                      <i :class="item.detalleIds.some((id) => savingDetalleIds.includes(id)) ? 'fas fa-circle-notch fa-spin mr-2' : 'fas fa-check mr-2'"></i>
                      <span>{{ item.detalleIds.some((id) => savingDetalleIds.includes(id)) ? 'Procesando...' : 'Listo' }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              class="mt-3 inline-flex min-h-[46px] w-full items-center justify-center rounded-xl border px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition disabled:opacity-50"
              :class="getPrintButtonClass(ticket.id)"
              :disabled="isPrintButtonDisabled(ticket)"
              :title="getPrintButtonTitle(ticket.id)"
              @click.stop="imprimirComandaTicket(ticket)"
            >
              <i :class="[getPrintButtonIcon(ticket.id), 'mr-2']"></i>
              <span>{{ getPrintButtonLabel(ticket.id) }}</span>
            </button>
          </div>

          <div v-show="selectedOrderId === ticket.id" class="p-3 bg-white border-t border-slate-100">
            <h3 class="font-black text-sm mb-2">Inventario para realizar la orden de producción</h3>
            <div v-if="inventoryLoading" class="text-sm text-slate-500 mb-2">Cargando inventario...</div>
            <table v-else class="w-full text-sm">
              <thead>
                <tr class="text-left text-xs text-slate-500">
                  <th class="pb-2">Artículo</th>
                  <th class="pb-2">Cantidad Necesaria</th>
                  <th class="pb-2">Saldo Actual</th>
                  <th class="pb-2">Faltante</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in inventoryItems" :key="item.articulo_id" class="border-t border-slate-100">
                  <td class="py-2">{{ item.articulo_nombre }}</td>
                  <td class="py-2">{{ item.cantidad_necesaria_total }}</td>
                  <td class="py-2">{{ item.saldo_cantidad }}</td>
                  <td class="py-2">{{ item.Cantidad_Faltante }}</td>
                </tr>
                <tr v-if="!inventoryItems.length">
                  <td colspan="4" class="py-2 text-slate-500">No hay artículos.</td>
                </tr>
              </tbody>
            </table>
          </div>

        </article>
      </div>
    </section>
  </div>
</template>

<script>
import { computed, onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores';
import { API_BASE_URL as API_BASE } from '../../config/api.js';
import { businessInfo } from '../../config/businessInfo.js';
import { buildComandaCocinaHtml } from '../../utils/ticketTemplates.js';
import { notifyUi } from '../../utils/notifyUi.js';
import { printTicketSilently, isBridgeUnavailableError } from '../../services/printBridgeService.js';
import { cocinaService } from '../../services/cocinaService.js';
import { ordenesProduccionService } from '../../services/ordenesProduccionService.js';

const UPLOADS_BASE = (process.env.VUE_APP_UPLOADS_BASE_URL || API_BASE.replace(/\/api\/?$/, '')).replace(/\/$/, '');
const COMPANY_LOGO_URL = '/img/logo.png';

export default {
  name: 'ProgramaCocina',
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();

    const normalizeRole = (role) => {
      const raw = String(role || '').trim().toUpperCase();
      if (!raw) return null;
      if (raw === 'COCINERO') return 'COCINERO';
      if (raw === 'BARISTA') return 'BARISTA';
      if (raw === 'BARTENDER') return 'BARTENDER';
      if (raw === 'MESERO') return 'MESERO';
      if (raw === 'CAJERO') return 'CAJERO';
      if (raw === 'ADMINISTRADOR') return 'ADMINISTRADOR';
      return raw;
    };

    const resolveDefaultRouteByRole = (role) => {
      switch (normalizeRole(role)) {
        case 'ADMINISTRADOR': return '/admin/dashboard';
        case 'MESERO': return '/mesero/pedidos';
        case 'COCINERO':
        case 'BARISTA':
        case 'BARTENDER':
          return '/cocina/pedidos';
        case 'CAJERO': return '/cajero/arqueo';
        default: return '/login';
      }
    };

    const loading = ref(false);
    const mesas = ref([]);
    const detallesPorComanda = ref({});
    const savingDetalleIds = ref([]);
    const printStatusByTicketId = ref({});
    const recentlyAddedTicketId = ref(null);
    const nowTick = ref(Date.now());
    const socketHealth = ref('disconnected');
    const lastSyncAt = ref(null);
    const showHealthTooltip = ref(false);
    const showEnableSoundNotice = ref(false);
    const activatingSound = ref(false);
    const logoDataUrl = ref(null);

    let reloadTimer = null;
    let newTicketFlashTimer = null;
    let clockInterval = null;
    let socketRef = null;
    const printStatusTimers = {};
    const printFallbackTimers = {};

    const currentUser = computed(() => authStore.user || null);
    const currentRole = computed(() => normalizeRole(currentUser.value?.rol));
    const canAccessKitchen = computed(() => ['COCINERO', 'BARISTA', 'BARTENDER'].includes(currentRole.value));
    const socketHealthClass = computed(() => `is-${socketHealth.value}`);
    const socketHealthLabel = computed(() => {
      if (socketHealth.value === 'connected') return 'Conectado';
      if (socketHealth.value === 'reconnecting') return 'Reconectando';
      return 'Desconectado';
    });
    const lastSyncLabel = computed(() => {
      const ts = Number(lastSyncAt.value || 0);
      if (!ts) return 'sin datos';
      const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
      if (diff < 60) return `hace ${diff}s`;
      if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
      return new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    });
    const healthTooltipText = computed(() => `${socketHealthLabel.value} · Ult. sync: ${lastSyncLabel.value}`);

    const enforceKitchenAccess = () => {
      if (canAccessKitchen.value) return true;

      mesas.value = [];
      detallesPorComanda.value = {};

      const target = resolveDefaultRouteByRole(currentRole.value);
      if (router.currentRoute.value.path !== target) {
        router.replace(target);
      }
      return false;
    };

    const getFallbackAvatar = (name = 'Usuario') => {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e2e8f0&color=334155`;
    };

    const getPersonalImageUrl = (filename, name = 'Usuario') => {
      if (!filename) return getFallbackAvatar(name);
      if (/^https?:\/\//i.test(filename)) return filename;
      if (filename.startsWith('/uploads/')) return `${UPLOADS_BASE}${filename}`;
      return `${UPLOADS_BASE}/uploads/personal/${filename}`;
    };

    const getProductImageUrl = (filename, name = 'Producto') => {
      if (!filename) return getFallbackAvatar(name);
      if (/^https?:\/\//i.test(filename)) return filename;
      if (filename.startsWith('/uploads/')) return `${UPLOADS_BASE}${filename}`;
      return `${UPLOADS_BASE}/uploads/productos/${filename}`;
    };

    const handleImageError = (event) => {
      event.target.src = getFallbackAvatar('PB');
    };

    const getNombrePersonal = (comanda) => {
      const nombres = [comanda.personal_nombres, comanda.personal_apellidos].filter(Boolean).join(' ').trim();
      return nombres || 'Mesero';
    };

    const getCreatedTimestamp = (comanda) => {
      const raw = comanda?.fecha_hora || comanda?.fecha_creacion;
      const timestamp = new Date(raw).getTime();
      return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
    };

    const getElapsedMinutes = (comanda) => {
      const raw = comanda?.fecha_creacion || comanda?.fecha_hora;
      if (!raw) return 0;
      const createdAt = new Date(raw).getTime();
      if (!Number.isFinite(createdAt)) return 0;
      return Math.max(0, Math.floor((nowTick.value - createdAt) / 60000));
    };

    const getUrgencyTicketClass = (minutes) => {
      if (minutes > 15) return 'ticket-urgency-high';
      if (minutes >= 8) return 'ticket-urgency-medium';
      return 'ticket-urgency-low';
    };

    const getTimerClass = (minutes) => {
      if (minutes > 15) return 'border-rose-300 bg-rose-100 text-rose-800 timer-danger';
      if (minutes >= 8) return 'border-amber-300 bg-amber-100 text-amber-800';
      return 'border-emerald-300 bg-emerald-100 text-emerald-800';
    };

    const getAllComandas = () => mesas.value.flatMap((mesa) => (mesa.comandas || []).map((comanda) => ({ mesa, comanda })));

    const resolveComandaIdFromPayload = (payload = {}) => Number(
      payload?.comanda_id || payload?.id_comanda || payload?.id || 0
    );

    const hasComandaInView = (comandaId) => getAllComandas()
      .some(({ comanda }) => Number(comanda.id) === Number(comandaId));

    const isComandaNotFoundError = (error) => {
      const statusCode = Number(error?.statusCode || 0);
      if (statusCode === 404) return true;
      return /comanda no encontrada/i.test(String(error?.message || ''));
    };

    const limpiarEstadoStale = (comandas) => {
      const idsVigentes = new Set(comandas.map((item) => Number(item.comanda.id)));

      detallesPorComanda.value = Object.fromEntries(
        Object.entries(detallesPorComanda.value).filter(([id]) => idsVigentes.has(Number(id)))
      );
    };

    const cargarDetallesParaComandas = async (comandas) => {
      const faltantes = comandas.filter((item) => !Array.isArray(detallesPorComanda.value[item.comanda.id]));
      if (!faltantes.length) return;

      await Promise.allSettled(
        faltantes.map(({ comanda }) => getDetalles(comanda.id, { removeIfMissing: true }))
      );
    };

    const cargarProgramacion = async () => {
      if (!enforceKitchenAccess()) return;
      loading.value = true;
      try {
        const data = await cocinaService.getProgramacion();
        mesas.value = Array.isArray(data) ? data : [];

        const comandas = getAllComandas();
        limpiarEstadoStale(comandas);
        await cargarDetallesParaComandas(comandas);
        lastSyncAt.value = Date.now();
      } catch (error) {
        alert(error.message || 'No se pudo cargar la programacion de cocina.');
      } finally {
        loading.value = false;
      }
    };

    // Inventario por orden: compatible con columnas devueltas por el nuevo endpoint
    const inventoryItems = ref([]);
    const inventoryLoading = ref(false);

    const loadInventarioForOrden = async (ordenId) => {
      inventoryLoading.value = true;
      inventoryItems.value = [];
      try {
        // utiliza el servicio ya existente que llama a /ordenes-produccion/:id/inventario
        const rows = await ordenesProduccionService.getInventario(ordenId);
        inventoryItems.value = Array.isArray(rows) ? rows : [];
      } catch (error) {
        console.error('Error cargando inventario para orden', ordenId, error);
        inventoryItems.value = [];
      } finally {
        inventoryLoading.value = false;
      }
    };

    // Estado para tarjeta expandible en la lista de ordenes (cocina)
    const selectedOrderId = ref(null);

    const toggleOrder = async (orden) => {
      const next = selectedOrderId.value === orden.id ? null : orden.id;
      selectedOrderId.value = next;
      if (next) {
        // Si el ticket/orden tiene el id de orden de produccion en otro campo, reemplazar orden.id por el campo correcto
        const ordenId = orden.id;
        await loadInventarioForOrden(ordenId);
      } else {
        inventoryItems.value = [];
      }
    };

    const syncSocketHealthFromWindow = () => {
      const socket = window.socket;
      if (socket && socket.connected) {
        socketHealth.value = 'connected';
        return;
      }
      socketHealth.value = authStore.token ? 'reconnecting' : 'disconnected';
    };

    const handleSocketStatus = (event) => {
      const status = String(event?.detail?.status || '').toLowerCase();
      if (status === 'connected') {
        socketHealth.value = 'connected';
        return;
      }
      if (status === 'disconnected' || status === 'connect_error') {
        socketHealth.value = authStore.token ? 'reconnecting' : 'disconnected';
        return;
      }
      if (status === 'logged-out' || status === 'no-token') {
        socketHealth.value = 'disconnected';
        return;
      }
      syncSocketHealthFromWindow();
    };

    const toggleHealthTooltip = () => {
      showHealthTooltip.value = !showHealthTooltip.value;
    };

    const hideHealthTooltip = () => {
      showHealthTooltip.value = false;
    };

    const removeTicketLocally = (ticketId) => {
      mesas.value = mesas.value
        .map((mesa) => ({
          ...mesa,
          comandas: (mesa.comandas || []).filter((comanda) => Number(comanda.id) !== Number(ticketId))
        }))
        .filter((mesa) => (mesa.comandas || []).length > 0);
    };

    const setDetallesComanda = (comandaId, detalles = []) => {
      detallesPorComanda.value = {
        ...detallesPorComanda.value,
        [Number(comandaId)]: Array.isArray(detalles) ? detalles : []
      };
    };

    const removeComandaFromView = (comandaId) => {
      const next = { ...detallesPorComanda.value };
      delete next[Number(comandaId)];
      detallesPorComanda.value = next;
      removeTicketLocally(comandaId);
    };

    const getDetalles = async (comandaId, { removeIfMissing = true } = {}) => {
      const numericComandaId = Number(comandaId || 0);
      if (!numericComandaId) return [];

      try {
        const response = await cocinaService.getComandaDetallesOrdenados(numericComandaId);
        const detalles = Array.isArray(response?.detalles) ? response.detalles : [];
        setDetallesComanda(numericComandaId, detalles);
        return detalles;
      } catch (error) {
        if (removeIfMissing && isComandaNotFoundError(error)) {
          removeComandaFromView(numericComandaId);
          return [];
        }
        throw error;
      }
    };

    const normObsKds = (v) => String(v ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();

    /** Agrupa líneas pendientes iguales (mismo producto + mismas observaciones) para mostrar x2, x3… */
    const agruparDetallesParaKds = (detalles = []) => {
      if (!Array.isArray(detalles) || !detalles.length) return [];
      const buckets = new Map();
      for (const row of detalles) {
        const pid = Number(row.producto_id || 0);
        const nameKey = normObsKds(row.producto_nombre || '');
        const productKey = pid > 0 ? String(pid) : `n:${nameKey}`;
        const key = `${productKey}|${normObsKds(row.observaciones_mesero)}|${normObsKds(row.observaciones_cocina)}`;
        if (!buckets.has(key)) {
          buckets.set(key, {
            detalleIds: [],
            cantidad: 0,
            producto_nombre: row.producto_nombre || '',
            producto_url_foto: row.producto_url_foto || null,
            observaciones_mesero: row.observaciones_mesero || null,
            observaciones_cocina: row.observaciones_cocina || null,
          });
        }
        const g = buckets.get(key);
        g.detalleIds.push(Number(row.id));
        g.cantidad += Number(row.cantidad || 0) || 0;
      }
      return Array.from(buckets.values()).map((g) => ({
        ...g,
        id: `grp:${g.detalleIds.slice().sort((a, b) => a - b).join(':')}`,
      }));
    };

    const ticketsOrdenados = computed(() => {
      const rows = getAllComandas().map(({ mesa, comanda }) => {
        const raw = detallesPorComanda.value[comanda.id] || [];
        const items = agruparDetallesParaKds(raw);
        const totalUnidades = items.reduce((acc, it) => acc + Number(it.cantidad || 0), 0);
        return {
          id: Number(comanda.id),
          mesaNumero: mesa.numero || mesa.id,
          mesaNombre: mesa.nombre || `Mesa ${mesa.numero || mesa.id}`,
          meseroNombre: getNombrePersonal(comanda),
          meseroRol: comanda.personal_rol || '',
          meseroFoto: comanda.personal_url_foto || null,
          prioridad: comanda.prioridad || 'Media',
          elapsedMinutes: getElapsedMinutes(comanda),
          createdTimestamp: getCreatedTimestamp(comanda),
          items,
          totalUnidades,
        };
      });

      // CAMBIO AQUÍ: Filtramos para que solo pasen los tickets con productos pendientes (> 0)
      return rows
        .filter((row) => row.totalUnidades > 0)
        .sort((a, b) => {
          if (a.createdTimestamp !== b.createdTimestamp) return a.createdTimestamp - b.createdTimestamp;
          return Number(a.id) - Number(b.id);
        });

      /* old
      return rows.sort((a, b) => {
        if (a.createdTimestamp !== b.createdTimestamp) return a.createdTimestamp - b.createdTimestamp;
        return Number(a.id) - Number(b.id);
      });
      */
    });

    const marcarDetalleListo = async (ticketId, item) => {
      const ids = Array.isArray(item?.detalleIds) && item.detalleIds.length
        ? item.detalleIds.map(Number).filter((n) => n > 0)
        : (item?.id && !String(item.id).startsWith('grp:') ? [Number(item.id)] : []);
      if (!ids.length) return;
      if (ids.some((id) => savingDetalleIds.value.includes(id))) return;

      savingDetalleIds.value = [...new Set([...savingDetalleIds.value, ...ids])];
      try {
        for (const detalleId of ids) {
          await cocinaService.marcarDetalleListo(detalleId);
        }

        const idSet = new Set(ids);
        const detallesActuales = (detallesPorComanda.value[ticketId] || []).filter(
          (row) => !idSet.has(Number(row.id))
        );
        

        if (detallesActuales.length > 0) {
          detallesPorComanda.value = {
            ...detallesPorComanda.value,
            [ticketId]: detallesActuales,
          };
          console.log("detalles1", detallesActuales)
        } else {
          const next = { ...detallesPorComanda.value };
          delete next[ticketId];
          detallesPorComanda.value = next;
          console.log("detalles2", detallesActuales)
          removeTicketLocally(ticketId);
        }
        await cargarProgramacion();
      } catch (error) {
        alert(error.message || 'No se pudo actualizar el producto.');
      } finally {
        savingDetalleIds.value = savingDetalleIds.value.filter((id) => !ids.includes(id));
      }
    };

    const getPrintStatus = (ticketId) => printStatusByTicketId.value[Number(ticketId)] || 'idle';

    const setPrintStatus = (ticketId, status) => {
      const numericId = Number(ticketId);
      printStatusByTicketId.value = {
        ...printStatusByTicketId.value,
        [numericId]: status
      };

      if (printStatusTimers[numericId]) {
        clearTimeout(printStatusTimers[numericId]);
        delete printStatusTimers[numericId];
      }

      if (status === 'success' || status === 'error') {
        printStatusTimers[numericId] = setTimeout(() => {
          const next = { ...printStatusByTicketId.value };
          delete next[numericId];
          printStatusByTicketId.value = next;
          delete printStatusTimers[numericId];
        }, 3200);
      }
    };

    const clearPrintFallback = (ticketId) => {
      const numericId = Number(ticketId);
      if (printFallbackTimers[numericId]) {
        clearTimeout(printFallbackTimers[numericId]);
        delete printFallbackTimers[numericId];
      }
    };

    const isPrintButtonDisabled = (ticket) => {
      if (!ticket?.items?.length) return true;
      return getPrintStatus(ticket.id) === 'printing';
    };

    const getPrintButtonClass = (ticketId) => {
      const status = getPrintStatus(ticketId);
      if (status === 'printing') return 'border-slate-600 bg-slate-700 hover:bg-slate-700 cursor-wait';
      if (status === 'success') return 'border-emerald-700 bg-emerald-600 hover:bg-emerald-600';
      if (status === 'error') return 'border-rose-700 bg-rose-600 hover:bg-rose-600';
      return 'border-slate-700 bg-slate-800 hover:bg-slate-900';
    };

    const getPrintButtonIcon = (ticketId) => {
      const status = getPrintStatus(ticketId);
      if (status === 'printing') return 'fas fa-circle-notch fa-spin';
      if (status === 'success') return 'fas fa-check';
      if (status === 'error') return 'fas fa-exclamation-triangle';
      return 'fas fa-print';
    };

    const getPrintButtonLabel = (ticketId) => {
      const status = getPrintStatus(ticketId);
      if (status === 'printing') return 'Imprimiendo...';
      if (status === 'success') return 'Comanda impresa';
      if (status === 'error') return 'Reintentar impresion';
      return 'Imprimir comanda';
    };

    const getPrintButtonTitle = (ticketId) => {
      const status = getPrintStatus(ticketId);
      if (status === 'printing') return 'Preparando ticket para la impresora POS...';
      if (status === 'success') return 'La comanda se envio correctamente a la impresora.';
      if (status === 'error') return 'No se pudo imprimir. Verifique la impresora POS del equipo.';
      return 'Imprimir comanda en la impresora POS del equipo';
    };

    const imprimirComandaTicketFallback = (ticketId, html, finishPrintAttempt) => {
      let iframe = null;

      const cleanupIframe = () => {
        if (iframe?.parentNode) {
          document.body.removeChild(iframe);
        }
        iframe = null;
      };

      iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.zIndex = '-1000';
      document.body.appendChild(iframe);

      const printWindow = iframe.contentWindow;
      if (!printWindow) {
        cleanupIframe();
        finishPrintAttempt(
          'error',
          'No se pudo preparar la vista de impresion. Recargue la pagina e intente de nuevo.'
        );
        return;
      }

      const doc = printWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
      printWindow.focus();

      printWindow.onafterprint = () => {
        cleanupIframe();
        finishPrintAttempt(
          'success',
          `Comanda #${ticketId} impresa correctamente.`
        );
      };

      printFallbackTimers[ticketId] = setTimeout(() => {
        if (getPrintStatus(ticketId) !== 'printing') return;
        cleanupIframe();
        finishPrintAttempt(
          'success',
          `Comanda #${ticketId} enviada a la impresora POS.`
        );
      }, 12000);

      setTimeout(() => {
        try {
          printWindow.print();
        } catch (error) {
          cleanupIframe();
          finishPrintAttempt(
            'error',
            error?.message || 'No se pudo abrir el dialogo de impresion. Verifique la impresora POS del equipo.'
          );
        }
      }, 200);
    };

    const imprimirComandaTicket = async (ticket) => {
      const ticketId = Number(ticket?.id || 0);
      if (!ticketId) return;

      if (!ticket?.items?.length) {
        notifyUi({
          message: 'No hay productos pendientes para imprimir en esta comanda.',
          type: 'error'
        });
        return;
      }

      if (getPrintStatus(ticketId) === 'printing') return;

      const finishPrintAttempt = (status, message, messageType = status) => {
        clearPrintFallback(ticketId);
        setPrintStatus(ticketId, status);
        if (message) {
          notifyUi({ message, type: messageType });
        }
      };

      setPrintStatus(ticketId, 'printing');

      try {
        const html = buildComandaCocinaHtml(
          {
            id: ticketId,
            mesaNombre: ticket.mesaNombre,
            meseroNombre: ticket.meseroNombre,
            items: ticket.items
          },
          businessInfo,
          logoDataUrl.value || COMPANY_LOGO_URL,
          { skipAutoPrint: true }
        );

        try {
          await printTicketSilently({
            html,
            comandaId: ticketId,
            ticketType: 'comanda-cocina',
            source: 'programa-cocina'
          });

          finishPrintAttempt(
            'success',
            `Comanda #${ticketId} enviada a la impresora predeterminada.`,
            'success'
          );
          return;
        } catch (bridgeError) {
          if (!isBridgeUnavailableError(bridgeError)) {
            finishPrintAttempt(
              'error',
              bridgeError?.message || 'No se pudo imprimir la comanda en la impresora predeterminada.'
            );
            return;
          }

          notifyUi({
            message: 'Bridge de impresion no disponible. Se abrira el dialogo de impresion del navegador.',
            type: 'warning',
            duration: 4500
          });
        }

        imprimirComandaTicketFallback(ticketId, html, finishPrintAttempt);
      } catch (error) {
        finishPrintAttempt(
          'error',
          error?.message || 'No se pudo generar el ticket de comanda para imprimir.'
        );
      }
    };

    const preloadLogoDataUrl = async () => {
      try {
        const res = await fetch(COMPANY_LOGO_URL);
        if (!res.ok) return;
        const blob = await res.blob();
        logoDataUrl.value = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      } catch {
        // logo opcional
      }
    };

    watch(currentRole, () => {
      enforceKitchenAccess();
    });

    const debouncedReload = () => {
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        if (canAccessKitchen.value) cargarProgramacion();
      }, 350);
    };

    const flashNuevoTicket = (comandaId) => {
      if (!comandaId) return;
      recentlyAddedTicketId.value = Number(comandaId);
      clearTimeout(newTicketFlashTimer);
      newTicketFlashTimer = setTimeout(() => {
        if (recentlyAddedTicketId.value === Number(comandaId)) {
          recentlyAddedTicketId.value = null;
        }
      }, 1800);
    };

    const resolveSocketEventData = (data = {}) => {
      const envelope = (data && typeof data === 'object') ? data : {};
      const payload = (envelope.payload && typeof envelope.payload === 'object') ? envelope.payload : envelope;
      const sound = payload?.sonido || payload?.sound || envelope?.sonido || envelope?.sound || null;
      return { payload, sound };
    };

    const activateSoundByUserGesture = async () => {
      if (activatingSound.value) return;
      activatingSound.value = true;

      try {
        const audio = new Audio('/sounds/new_order.mp3');
        audio.volume = 0;
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
        showEnableSoundNotice.value = false;
      } catch (error) {
        console.warn('🔇 [Cocina] No se pudo activar sonido por gesto:', error?.message || error);
        showEnableSoundNotice.value = true;
      } finally {
        activatingSound.value = false;
      }
    };

    const handleComandaEliminada = async () => {
      debouncedReload();
    };

    const handleNuevaComanda = async (data = {}) => {
      const { payload } = resolveSocketEventData(data);
      const comandaId = Number(payload?.id_comanda || payload?.id || 0);
      console.log('📢 [Cocina] Evento nueva-comanda recibido, refrescando programación', payload);
      if (comandaId) flashNuevoTicket(comandaId);
      debouncedReload();
    };

    const handleComandaActualizada = async () => {
      debouncedReload();
    };

    const handleNuevoProducto = async (data = {}) => {
      const { payload } = resolveSocketEventData(data);
      console.log('📢 [Cocina] Evento nuevo-producto-comanda recibido, refrescando lista', payload);
      const comandaId = resolveComandaIdFromPayload(payload);
      const payloadEstado = String(
        payload?.producto?.estado_producto || payload?.estado_producto || ''
      ).trim();

      if (payloadEstado && payloadEstado !== 'Ordenado') {
        console.warn('⚠️ [Cocina] estado_producto en payload distinto de Ordenado:', payloadEstado, payload);
      }

      try {
        if (comandaId && !hasComandaInView(comandaId)) {
          await cargarProgramacion();
        }

        if (comandaId) {
          await getDetalles(comandaId, { removeIfMissing: true });
        } else {
          await cargarProgramacion();
        }
      } catch (error) {
        console.error('❌ [Cocina] Error al refrescar detalles tras nuevo producto:', error?.message || error);
        debouncedReload();
      }
    };

    const handleEditarProducto = async (data = {}) => {
      const { payload } = resolveSocketEventData(data);
      console.log('📢 [Cocina] Evento editar-producto-comanda recibido, refrescando lista', payload);
      const comandaId = Number(payload?.comanda_id || 0);
      if (comandaId) {
        const next = { ...detallesPorComanda.value };
        delete next[comandaId];
        detallesPorComanda.value = next;
      }
      debouncedReload();
    };

    const handleBorrarProducto = async (data = {}) => {
      const { payload } = resolveSocketEventData(data);
      console.log('📢 [Cocina] Evento borrar-producto-comanda recibido, refrescando lista', payload);
      const comandaId = Number(payload?.comanda_id || 0);
      if (comandaId) {
        const next = { ...detallesPorComanda.value };
        delete next[comandaId];
        detallesPorComanda.value = next;
      }
      debouncedReload();
    };

    const handleSolicitudCuenta = async () => {
      debouncedReload();
    };

    const handleComandaCerrada = async (data = {}) => {
      console.log('[DEBUG-STEP][COCINA-1] comanda-cerrada llegó al browser. data=', JSON.stringify(data));
      const { payload } = resolveSocketEventData(data);
      const comandaId = Number(payload?.comanda_id || payload?.id_comanda || payload?.id || 0);
      console.log('[DEBUG-STEP][COCINA-2] comandaId resuelto=', comandaId, 'payload=', JSON.stringify(payload));
      if (!comandaId) {
        console.warn('[DEBUG-STEP][COCINA-X] comandaId es 0 o nulo, SALIENDO prematuramente.');
        return;
      }

      console.log('📢 [Cocina] Evento comanda-cerrada recibido, removiendo ticket local', payload);

      removeComandaFromView(comandaId);
      if (recentlyAddedTicketId.value === comandaId) {
        recentlyAddedTicketId.value = null;
      }
      lastSyncAt.value = Date.now();
    };

    const handleComandaPagada = async () => {
      debouncedReload();
    };

    const handleFlashComanda = async (data = {}) => {
      console.log('⚡ FLASH: Comanda recibida por Socket estilo chat', data);
      await cargarProgramacion();
    };

    const handleRefreshCocina = async (payload = {}) => {
      const comandaId = Number(payload?.comanda_id || 0);
      if (!comandaId) {
        await cargarProgramacion();
        return;
      }

      try {
        if (!hasComandaInView(comandaId)) {
          await cargarProgramacion();
        }

        await getDetalles(comandaId, { removeIfMissing: true });
      } catch (error) {
        console.error('❌ [Cocina] Error al refrescar comanda puntual:', error?.message || error);
      }
    };

    const bindSocketListeners = (candidate) => {
      const target = candidate || window.socket;
      if (!target || target === socketRef) return;

      if (socketRef) {
        socketRef.off('nueva-comanda', handleNuevaComanda);
        socketRef.off('editar-comanda', handleComandaActualizada);
        socketRef.off('borrar-comanda', handleComandaEliminada);
        socketRef.off('nuevo-producto-comanda', handleNuevoProducto);
        socketRef.off('editar-producto-comanda', handleEditarProducto);
        socketRef.off('borrar-producto-comanda', handleBorrarProducto);
        socketRef.off('solicitud-cuenta', handleSolicitudCuenta);
        socketRef.off('comanda-cerrada', handleComandaCerrada);
        socketRef.off('comanda-pagada', handleComandaPagada);
        socketRef.off('flash-comanda', handleFlashComanda);
        socketRef.off('refresh-cocina', handleRefreshCocina);
      }

      socketRef = target;
      console.log('🔌 [Cocina] Suscribiendo listeners de notificaciones');
      socketRef.on('nueva-comanda', handleNuevaComanda);
      socketRef.on('editar-comanda', handleComandaActualizada);
      socketRef.on('borrar-comanda', handleComandaEliminada);
      socketRef.on('nuevo-producto-comanda', handleNuevoProducto);
      socketRef.on('editar-producto-comanda', handleEditarProducto);
      socketRef.on('borrar-producto-comanda', handleBorrarProducto);
      socketRef.on('solicitud-cuenta', handleSolicitudCuenta);
      socketRef.on('comanda-cerrada', handleComandaCerrada);
      socketRef.on('comanda-pagada', handleComandaPagada);
      socketRef.on('flash-comanda', handleFlashComanda);
      socketRef.on('refresh-cocina', handleRefreshCocina);
    };

    const unbindSocketListeners = () => {
      if (!socketRef) return;
      socketRef.off('nueva-comanda', handleNuevaComanda);
      socketRef.off('editar-comanda', handleComandaActualizada);
      socketRef.off('borrar-comanda', handleComandaEliminada);
      socketRef.off('nuevo-producto-comanda', handleNuevoProducto);
      socketRef.off('editar-producto-comanda', handleEditarProducto);
      socketRef.off('borrar-producto-comanda', handleBorrarProducto);
      socketRef.off('solicitud-cuenta', handleSolicitudCuenta);
      socketRef.off('comanda-cerrada', handleComandaCerrada);
      socketRef.off('comanda-pagada', handleComandaPagada);
      socketRef.off('flash-comanda', handleFlashComanda);
      socketRef.off('refresh-cocina', handleRefreshCocina);
      socketRef = null;
    };

    const handleSocketReady = () => {
      if (!canAccessKitchen.value) return;
      bindSocketListeners(window.socket);
      socketHealth.value = 'connected';
    };

    onMounted(async () => {
      if (!enforceKitchenAccess()) return;

      await cargarProgramacion();
      await preloadLogoDataUrl();
      syncSocketHealthFromWindow();
      clockInterval = setInterval(() => {
        nowTick.value = Date.now();
      }, 15000);

      bindSocketListeners(window.socket);
      window.addEventListener('pb:socket-ready', handleSocketReady);
      window.addEventListener('pb:socket-status', handleSocketStatus);
    });

    onBeforeUnmount(() => {
      clearInterval(clockInterval);
      clearTimeout(reloadTimer);
      clearTimeout(newTicketFlashTimer);
      Object.keys(printStatusTimers).forEach((key) => clearTimeout(printStatusTimers[key]));
      Object.keys(printFallbackTimers).forEach((key) => clearTimeout(printFallbackTimers[key]));
    });

    onUnmounted(() => {
      unbindSocketListeners();
      window.removeEventListener('pb:socket-ready', handleSocketReady);
      window.removeEventListener('pb:socket-status', handleSocketStatus);
    });

    const logout = async () => {
      await authStore.logout();
      router.push('/login');
    };

    return {
      loading,
      currentUser,
      ticketsOrdenados,
      savingDetalleIds,
      printStatusByTicketId,
      recentlyAddedTicketId,
      socketHealthClass,
      socketHealthLabel,
      lastSyncLabel,
      healthTooltipText,
      inventoryItems,
      inventoryLoading,
      loadInventarioForOrden,
      selectedOrderId,
      toggleOrder,
      showHealthTooltip,
      showEnableSoundNotice,
      activatingSound,
      getTimerClass,
      getUrgencyTicketClass,
      getPersonalImageUrl,
      getProductImageUrl,
      handleImageError,
      marcarDetalleListo,
      imprimirComandaTicket,
      isPrintButtonDisabled,
      getPrintButtonClass,
      getPrintButtonIcon,
      getPrintButtonLabel,
      getPrintButtonTitle,
      toggleHealthTooltip,
      hideHealthTooltip,
      activateSoundByUserGesture,
      logout
    };
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Sora:wght@600;700;800&display=swap');

.kitchen-shell {
  --bg-a: #f5f9ff;
  --bg-b: #edf4ff;
  background:
    radial-gradient(circle at 6% 7%, rgba(30, 64, 175, 0.16) 0, transparent 34%),
    radial-gradient(circle at 88% 6%, rgba(59, 130, 246, 0.16) 0, transparent 28%),
    linear-gradient(180deg, var(--bg-a), var(--bg-b));
  font-family: 'Manrope', sans-serif;
}

.sound-enable-banner {
  position: fixed;
  top: 14px;
  left: 14px;
  z-index: 45;
  border: 1px solid #f59e0b;
  background: #fef3c7;
  color: #92400e;
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  font-size: 0.72rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: 0 10px 24px rgba(146, 64, 14, 0.18);
}

.sound-enable-banner:disabled {
  opacity: 0.7;
}

.socket-health-wrap {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 40;
}

.socket-health-btn {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.65);
  background: rgba(15, 23, 42, 0.35);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.28);
}

.socket-health-led {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: block;
}

.socket-health-btn.is-connected .socket-health-led {
  background: #22c55e;
  box-shadow: 0 0 0 5px rgba(34, 197, 94, 0.22);
}

.socket-health-btn.is-reconnecting .socket-health-led {
  background: #f59e0b;
  box-shadow: 0 0 0 5px rgba(245, 158, 11, 0.22);
  animation: healthBlink 1.1s ease-in-out infinite;
}

.socket-health-btn.is-disconnected .socket-health-led {
  background: #ef4444;
  box-shadow: 0 0 0 5px rgba(239, 68, 68, 0.22);
}

.socket-health-tooltip {
  margin-top: 0.45rem;
  border-radius: 0.7rem;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: rgba(15, 23, 42, 0.9);
  color: #e2e8f0;
  font-size: 0.7rem;
  line-height: 1.25;
  padding: 0.45rem 0.55rem;
  min-width: 145px;
  text-align: left;
}

.socket-health-title {
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.socket-health-time {
  margin-top: 0.2rem;
  color: #bfdbfe;
  font-weight: 700;
}

.kds-banner {
  background: linear-gradient(100deg, #0f2d6b 0%, #1a4bbd 40%, #2563eb 70%, #1d55d4 100%);
  box-shadow: 0 4px 20px rgba(15, 45, 107, 0.35);
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.kitchen-title {
  font-family: 'Sora', sans-serif;
  letter-spacing: -0.02em;
}

.badge {
  display: inline-flex;
  align-items: center;
  border-width: 1px;
  border-style: solid;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  line-height: 1.1;
}

.kds-ticket {
  background: rgba(255, 255, 255, 0.96);
  min-height: 420px;
}

.kds-ticket-header {
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.94), rgba(226, 232, 240, 0.86));
}

.ticket-urgency-low {
  border-color: rgba(16, 185, 129, 0.45);
  box-shadow: 0 10px 25px rgba(16, 185, 129, 0.14);
}

.ticket-urgency-medium {
  border-color: rgba(245, 158, 11, 0.45);
  box-shadow: 0 10px 25px rgba(245, 158, 11, 0.16);
}

.ticket-urgency-high {
  border-color: rgba(239, 68, 68, 0.5);
  box-shadow: 0 12px 30px rgba(239, 68, 68, 0.2);
}

.timer-danger {
  animation: timerPulse 1.2s ease-in-out infinite;
}

.kds-ticket-enter {
  animation: ticketEnter 380ms ease both;
}

.ticket-items {
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 116, 139, 0.5) transparent;
}

.ticket-items::-webkit-scrollbar {
  width: 6px;
}

.ticket-items::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.45);
  border-radius: 999px;
}

@keyframes timerPulse {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.35); }
  70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

@keyframes ticketEnter {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes healthBlink {
  0% { opacity: 1; }
  50% { opacity: 0.45; }
  100% { opacity: 1; }
}
</style>

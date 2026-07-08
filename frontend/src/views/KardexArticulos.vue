<template>
  <div class="kardex-view admin-crud-shell min-h-screen w-full max-w-7xl overflow-x-hidden p-4 md:p-6 mx-auto">
    <div class="mb-8 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5 border-b border-slate-200 pb-6">
      <div>
        <h1 class="admin-crud-title text-3xl font-black text-teal-700 italic uppercase tracking-tighter">Inventario</h1>
        <p class="admin-crud-subtitle text-[10px] uppercase tracking-widest font-black">Patio Bohemio / Kardex de Artículos para Auditoría</p>
      </div>

      <div class="flex flex-wrap gap-2 items-end">
        <button @click="abrirNuevoMovimiento" class="pb-btn pb-btn-new pb-btn-unified px-5 py-3 text-[11px] whitespace-nowrap">
          <i class="fas fa-right-left"></i>
          <span>Movimiento Manual</span>
        </button>
        <button @click="imprimirCarta" :disabled="loading || movimientos.length === 0" class="pb-btn pb-btn-secondary pb-btn-unified px-5 py-3 text-[11px] whitespace-nowrap disabled:opacity-50">
          <i class="fas fa-print"></i>
          <span>Imprimir Carta</span>
        </button>
        <button @click="exportarExcel" :disabled="loading || movimientos.length === 0" class="pb-btn pb-btn-excel pb-btn-unified px-5 py-3 text-[11px] whitespace-nowrap disabled:opacity-50">
          <i class="fas fa-file-excel"></i>
          <span>Exportar</span>
        </button>
      </div>
    </div>

    <div class="mb-5 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
      <button @click="activeTab = 'kardex'" :class="['tab-btn', activeTab === 'kardex' ? 'tab-btn-active' : 'tab-btn-idle']">
        Kardex
      </button>
      <button @click="activeTab = 'valorizacion'" :class="['tab-btn', activeTab === 'valorizacion' ? 'tab-btn-active' : 'tab-btn-idle']">
        Valorización
      </button>
    </div>

    <section v-if="activeTab === 'kardex'">

    <section class="rounded-[2rem] border border-slate-200 bg-white/90 shadow-sm p-5 md:p-6 mb-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-4 items-end">
        <!-- Buscar Artículo -->
        <div class="sm:col-span-2 xl:col-span-6">
          <label class="filter-label">Buscar Artículo</label>
          <div class="relative w-full">
            <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input
              v-model="filtroNombre"
              type="text"
              placeholder="Buscar artículo..."
              class="w-full bg-white/90 border border-slate-200 text-slate-700 placeholder-slate-400 rounded-2xl pl-11 pr-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-cyan-100 shadow-sm transition-all"
              @input="onFiltroNombreInput"
              @keyup.enter="consultarKardex"
            >
          </div>
        </div>
        <!-- Fecha Inicio -->
        <div class="xl:col-span-2">
          <label class="filter-label">Fecha Inicio</label>
          <input v-model="filters.fechaInicio" type="date" class="filter-input">
        </div>
        <!-- Fecha Final -->
        <div class="xl:col-span-2">
          <label class="filter-label">Fecha Final</label>
          <input v-model="filters.fechaFinal" type="date" class="filter-input">
        </div>
        <!-- Acciones -->
        <div class="sm:col-span-2 xl:col-span-2 flex gap-2">
          <button @click="consultarKardex" :disabled="loading" class="flex-1 pb-btn pb-btn-primary pb-btn-unified px-4 py-3 text-[11px] disabled:opacity-50">
            <i :class="loading ? 'fas fa-circle-notch fa-spin' : 'fas fa-magnifying-glass'"></i>
            <span>{{ loading ? 'Consultando...' : 'Consultar' }}</span>
          </button>
          <button @click="setMesActual" :disabled="loading" class="flex-1 pb-btn pb-btn-secondary pb-btn-unified px-4 py-3 text-[11px] disabled:opacity-50">
            <i class="fas fa-calendar-day"></i>
            <span>Mes Actual</span>
          </button>
        </div>
        <!-- Resumen -->
        <div class="sm:col-span-2 xl:col-span-12 rounded-[1.35rem] border border-cyan-200 bg-cyan-50 px-4 py-3 flex items-center">
          <p class="text-sm font-bold text-cyan-900">{{ resumenTexto }}</p>
        </div>
      </div>
    </section>

    <div class="mb-6 rounded-[1.45rem] border border-amber-200 bg-amber-50 px-4 py-4 shadow-sm">
      <div class="flex flex-wrap items-center gap-2 justify-between">
        <div>
          <p class="summary-title">Artículos por Agotar</p>
          <p class="text-xl font-black text-amber-700 mt-2">{{ lowStockArticulos.length }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <span v-for="item in lowStockPreview" :key="item.id" class="inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-300 bg-amber-100 text-amber-800">
            {{ item.nombre }} — POR AGOTAR
          </span>
          <span v-if="lowStockArticulos.length > lowStockPreview.length" class="inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-300 bg-slate-100 text-slate-700">
            +{{ lowStockArticulos.length - lowStockPreview.length }} más
          </span>
        </div>
      </div>
    </div>

    <h3 class="text-xl font-bold text-gray-700 mb-4">Movimientos en el Kardex</h3>

    <div v-if="loading" class="flex items-center justify-center p-24 bg-white/70 rounded-[2rem] border border-slate-200 shadow-inner">
      <p class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Cargando movimientos de inventario...</p>
    </div>

    <div v-else-if="movimientos.length === 0" class="flex items-center justify-center p-24 bg-white/70 rounded-[2rem] border border-dashed border-slate-200 shadow-inner">
      <div class="text-center">
        <i class="fas fa-warehouse text-4xl text-slate-300 mb-4 block"></i>
        <p class="text-slate-400 font-bold text-lg">No hay movimientos para los filtros seleccionados</p>
      </div>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="grupo in movimientosAgrupados"
        :key="grupo.articulo_id"
        class="rounded-[1.6rem] border border-slate-200 bg-white shadow-sm overflow-hidden"
      >
        <div
          class="flex items-center gap-4 px-5 py-4 cursor-pointer select-none hover:bg-slate-50/80 transition-colors"
          @click="toggleRow(grupo.articulo_id)"
        >
          <div
            class="shrink-0 w-7 h-7 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center transition-transform duration-200"
            :class="isRowExpanded(grupo.articulo_id) ? 'rotate-90' : ''"
          >
            <i class="fas fa-chevron-right text-[10px] text-slate-400"></i>
          </div>
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <div class="w-10 h-10 rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
              <img v-if="getArticuloImageUrl(grupo.articulo_url_foto)" :src="getArticuloImageUrl(grupo.articulo_url_foto)" class="w-full h-full object-cover" @error="handleImageError">
              <i v-else class="fas fa-boxes text-slate-300 text-xs"></i>
            </div>
            <div class="min-w-0">
              <div class="font-black text-slate-800 uppercase truncate text-sm">{{ grupo.articulo_nombre }}</div>
              <div class="text-[11px] font-semibold text-slate-400 uppercase">{{ grupo.articulo_tipo || 'Sin tipo' }}</div>
              <span
                v-if="isGrupoPorAgotar(grupo)"
                class="inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-300 bg-amber-100 text-amber-800"
              >POR AGOTAR</span>
            </div>
          </div>
          <div class="shrink-0 text-right min-w-[110px]">
            <div class="text-sm font-black text-slate-800">{{ formatMoney(grupo.saldo_total) }}</div>
            <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Saldo</div>
          </div>
        </div>

        <div v-if="isRowExpanded(grupo.articulo_id)" class="border-t border-slate-100 bg-slate-50/40 px-5 pb-5 pt-4 space-y-5">
          <div
            v-for="movimiento in grupo.movimientos"
            :key="movimiento.id"
            class="rounded-2xl border border-slate-200 bg-white overflow-hidden"
          >
            <div class="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
              <div class="shrink-0 min-w-[130px]">
                <div class="font-black text-slate-800 text-sm leading-tight">{{ formatDateTime(movimiento.fecha_movimiento) }}</div>
                <div class="text-[11px] font-semibold text-slate-500 mt-0.5">{{ getSucursalLabel(movimiento.sucursal_id) }}</div>
              </div>
              <div class="shrink-0 text-center">
                <span class="inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border" :class="tipoBadgeClass(movimiento.tipo_movimiento)">
                  {{ movimiento.tipo_movimiento }}
                </span>
                <div class="mt-1 text-[11px] font-semibold" :class="movimiento.es_manual ? 'text-amber-700' : 'text-slate-500'">
                  {{ movimiento.es_manual ? 'Manual' : movimiento.es_compra_reversion ? 'Reversión' : 'Automático' }}
                </div>
              </div>
            </div>
            <div class="px-4 py-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p class="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-2">Referencia</p>
                  <button
                    v-if="movimiento.compra_id"
                    @click.stop="abrirDetalleCompra(movimiento.compra_id)"
                    class="document-link text-sm"
                  >{{ movimiento.documento_referencia_visible || 'Compra vinculada' }}</button>
                  <span v-else class="font-semibold text-slate-700 text-sm break-words">{{ movimiento.documento_referencia_visible || 'Sin referencia' }}</span>
                  <div v-if="movimiento.es_compra_reversion" class="text-[11px] font-semibold text-rose-600 mt-1">Compra anulada</div>
                </div>
                <div class="rounded-2xl border border-teal-200 bg-teal-50/50 px-4 py-3">
                  <p class="text-[9px] uppercase font-black tracking-widest text-teal-600 mb-2">Entrada</p>
                  <div class="space-y-1.5 text-sm">
                    <div class="flex justify-between">
                      <span class="text-slate-500 font-semibold">Cant.:</span>
                      <span class="font-black text-slate-800">{{ formatQuantity(movimiento.cant_entrada) }} {{ movimiento.unidad_abreviatura || '' }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-500 font-semibold">Costo unit.:</span>
                      <span class="font-black text-slate-800">{{ formatMoney(movimiento.costo_entrada) }}</span>
                    </div>
                    <div class="flex justify-between border-t border-teal-200 pt-1.5">
                      <span class="text-teal-700 font-bold">Total:</span>
                      <span class="font-black text-teal-700">{{ formatMoney(movimiento.total_entrada) }}</span>
                    </div>
                  </div>
                </div>
                <div class="rounded-2xl border border-rose-200 bg-rose-50/50 px-4 py-3">
                  <p class="text-[9px] uppercase font-black tracking-widest text-rose-600 mb-2">Salida</p>
                  <div class="space-y-1.5 text-sm">
                    <div class="flex justify-between">
                      <span class="text-slate-500 font-semibold">Cant.:</span>
                      <span class="font-black text-slate-800">{{ formatQuantity(movimiento.cant_salida) }} {{ movimiento.unidad_abreviatura || '' }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-500 font-semibold">Costo unit.:</span>
                      <span class="font-black text-slate-800">{{ formatMoney(movimiento.costo_salida) }}</span>
                    </div>
                    <div class="flex justify-between border-t border-rose-200 pt-1.5">
                      <span class="text-rose-700 font-bold">Total:</span>
                      <span class="font-black text-rose-700">{{ formatMoney(movimiento.total_salida) }}</span>
                    </div>
                  </div>
                </div>
                <div class="rounded-2xl border border-cyan-200 bg-cyan-50/50 px-4 py-3">
                  <p class="text-[9px] uppercase font-black tracking-widest text-cyan-600 mb-2">Estado Saldo</p>
                  <div class="space-y-1.5 text-sm">
                    <div class="flex justify-between">
                      <span class="text-slate-500 font-semibold">Cant.:</span>
                      <span class="font-black text-slate-800">{{ formatQuantity(movimiento.saldo_cantidad) }} {{ movimiento.unidad_abreviatura || '' }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-500 font-semibold">Costo unit.:</span>
                      <span class="font-black text-slate-800">{{ formatMoney(movimiento.saldo_costo_unitario) }}</span>
                    </div>
                    <div class="flex justify-between border-t border-cyan-200 pt-1.5">
                      <span class="text-cyan-700 font-bold">Total:</span>
                      <span class="font-black text-cyan-700">{{ formatMoney(movimiento.saldo_total) }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="puedeEditarMovimiento(movimiento) || movimiento.compra_id" class="flex flex-wrap gap-2 mt-4">
                <button v-if="puedeEditarMovimiento(movimiento)" @click.stop="editarMovimiento(movimiento)" class="pb-btn pb-btn-edit btn-icon-text text-xs px-3 py-1.5">
                  <i class="fas fa-pen-to-square text-[11px]"></i>
                  <span>Editar</span>
                </button>
                <button v-if="puedeEditarMovimiento(movimiento)" @click.stop="eliminarMovimiento(movimiento)" class="pb-btn pb-btn-danger btn-icon-text text-xs px-3 py-1.5">
                  <i class="fas fa-trash-can text-[11px]"></i>
                  <span>Borrar</span>
                </button>
                <button v-if="movimiento.compra_id" @click.stop="abrirDetalleCompra(movimiento.compra_id)" class="pb-btn pb-btn-secondary btn-icon-text text-xs px-3 py-1.5">
                  <i class="fas fa-receipt text-[11px]"></i>
                  <span>Compra</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </section>

    <section v-else class="space-y-5">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div class="summary-card border-slate-200 bg-white">
          <p class="summary-title">Artículos Valorizados</p>
          <p class="summary-number text-slate-800">{{ valorizacionRows.length }}</p>
        </div>
        <div class="summary-card border-teal-200 bg-teal-50 md:col-span-2">
          <p class="summary-title">Gran Total Activos en Inventario (Cuenta 14)</p>
          <p class="summary-number text-teal-700">{{ formatMoney(granTotalInventario) }}</p>
        </div>
      </div>

      <div class="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="audit-table min-w-full">
            <thead>
              <tr>
                <th>Artículo</th>
                <th>Stock Actual</th>
                <th>Costo Unitario Promedio</th>
                <th>Costo Total en Bodega</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in valorizacionRows" :key="row.id">
                <td>
                  <div class="font-black text-slate-800 uppercase">{{ row.nombre }}</div>
                  <div class="text-[11px] font-semibold text-slate-500 uppercase">{{ row.tipo || 'Sin tipo' }}</div>
                </td>
                <td>
                  <div class="font-black" :class="row.porAgotar ? 'text-rose-700' : 'text-slate-800'">{{ formatQuantity(row.stock_actual) }} {{ row.unidad_medida || '' }}</div>
                  <div class="text-[11px] font-semibold text-slate-500">Min: {{ formatQuantity(row.stock_minimo) }}</div>
                </td>
                <td class="font-black text-slate-800 num-entero">{{ formatMoney(row.costo_unitario) }}</td>
                <td class="font-black text-teal-700 num-entero">{{ formatMoney(row.totalBodega) }}</td>
                <td>
                  <span
                    v-if="row.porAgotar"
                    class="inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-300 bg-amber-100 text-amber-800"
                  >
                    POR AGOTAR
                  </span>
                  <span v-else class="inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-300 bg-emerald-100 text-emerald-800">
                    OK
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <MovimientoKardexArticulos
      :visible="showMovimientoModal"
      :movimiento="movimientoActivo"
      :sucursales="sucursales"
      :movimientos="movimientos"
      @close="cerrarMovimientoModal"
      @saved="onMovimientoSaved"
    />

    <CompraKardexDetalleModal
      :visible="showCompraModal"
      :compra-id="compraActivaId"
      @close="cerrarDetalleCompra"
    />
  </div>
</template>

<script>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { kardexArticulosService } from '../services/kardexArticulosService.js';
import { articuloService } from '../services/articuloService.js';
import { API_BASE_URL } from '../config/api.js';
import { getXLSX } from '../utils/lazyVendors.js';
import MovimientoKardexArticulos from './movimientoKardexArticulos.vue';
import CompraKardexDetalleModal from './CompraKardexDetalleModal.vue';

const API_BASE = API_BASE_URL;
const UPLOADS_BASE = (process.env.VUE_APP_UPLOADS_BASE_URL || API_BASE.replace(/\/api\/?$/, '')).replace(/\/$/, '');

const todayString = () => new Date().toISOString().slice(0, 10);
const currentMonthStart = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
};

export default {
  name: 'KardexArticulos',
  components: {
    CompraKardexDetalleModal,
    MovimientoKardexArticulos
  },
  setup() {
    let setupActive = true;

    const activeTab = ref('kardex');
    const loading = ref(true);
    const movimientos = ref([]);
    const sucursales = ref([]);
    const articulos = ref([]);
    const filtroNombre = ref('');
    const showMovimientoModal = ref(false);
    const movimientoActivo = ref(null);
    const showCompraModal = ref(false);
    const compraActivaId = ref(null);
    const autoSearchTimer = ref(null);
    const expandedRows = ref(new Set());

    const toggleRow = (id) => {
      const s = new Set(expandedRows.value);
      if (s.has(id)) { s.delete(id); } else { s.add(id); }
      expandedRows.value = s;
    };

    const isRowExpanded = (id) => expandedRows.value.has(id);

    const filters = ref({
      fechaInicio: currentMonthStart(),
      fechaFinal: todayString(),
      sucursalId: 'TODAS',
      articuloId: 'TODOS',
      tipoMovimiento: 'TODOS'
    });

    const parseNumber = (value) => {
      if (value === null || value === undefined || value === '') return 0;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const formatQuantity = (value) => parseNumber(value).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    const formatMoney = (value) => parseNumber(value).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    const formatDateTime = (value) => {
      if (!value) return '---';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        const raw = String(value).slice(0, 16).replace('T', ' ');
        const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2})$/);
        if (!match) return raw;
        const [, year, month, day, hour, minute] = match;
        return `${day}/${month}/${year} ${hour}:${minute}`;
      }

      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hour}:${minute}`;
    };

    // Artículo que coincide exactamente (o primera coincidencia parcial) con filtroNombre
    const articuloCoincidente = computed(() => {
      const term = filtroNombre.value.trim().toLowerCase();
      if (!term) return null;
      // Primero intento exacto
      const exacto = articulos.value.find(
        (item) => String(item.nombre || '').toLowerCase() === term
      );
      if (exacto) return exacto;
      // Luego parcial
      return articulos.value.find(
        (item) => String(item.nombre || '').toLowerCase().includes(term)
      ) || null;
    });

    // Resuelve el articuloId a pasar al backend basándose en filtroNombre
    const resolveArticuloId = () => {
      if (!filtroNombre.value.trim()) return 'TODOS';
      return articuloCoincidente.value ? String(articuloCoincidente.value.id) : 'TODOS';
    };

    const tipoBadgeClass = (tipo) => {
      const styles = {
        ENTRADA: 'border-teal-200 bg-teal-50 text-teal-700',
        SALIDA: 'border-rose-200 bg-rose-50 text-rose-700',
        AJUSTE: 'border-amber-200 bg-amber-50 text-amber-700',
        DEVOLUCION: 'border-cyan-200 bg-cyan-50 text-cyan-700'
      };
      return styles[tipo] || 'border-slate-200 bg-slate-50 text-slate-700';
    };

    const tipoIcono = (tipo) => {
      const icons = {
        ENTRADA: 'fas fa-arrow-down',
        SALIDA: 'fas fa-arrow-up',
        AJUSTE: 'fas fa-sliders',
        DEVOLUCION: 'fas fa-rotate-left'
      };
      return icons[tipo] || 'fas fa-boxes';
    };

    const getArticuloImageUrl = (url) => {
      if (!url) return '';
      if (/^https?:\/\//i.test(url)) return url;
      if (url.startsWith('/uploads/')) return `${UPLOADS_BASE}${url}`;
      return `${UPLOADS_BASE}/uploads/articulos/${url}`;
    };

    const handleImageError = (event) => {
      event.target.style.display = 'none';
    };

    const getSucursalLabel = (sucursalId) => {
      const sucursal = sucursales.value.find((item) => Number(item.id) === Number(sucursalId));
      return sucursal?.nombre || `Sucursal ${sucursalId}`;
    };

    const totalEntradas = computed(() => movimientos.value.reduce(
      (accumulator, item) => accumulator + parseNumber(item.total_entrada),
      0
    ));

    const totalSalidas = computed(() => movimientos.value.reduce(
      (accumulator, item) => accumulator + parseNumber(item.total_salida),
      0
    ));

    const totalAjustes = computed(() => movimientos.value
      .filter((item) => item.tipo_movimiento === 'AJUSTE')
      .reduce((accumulator, item) => accumulator + parseNumber(item.total_salida), 0));

    const totalDevoluciones = computed(() => movimientos.value
      .filter((item) => item.tipo_movimiento === 'DEVOLUCION')
      .reduce((accumulator, item) => accumulator + parseNumber(item.total_salida), 0));

    const variacionNeta = computed(() => totalEntradas.value - totalSalidas.value);

    const saldoVisible = computed(() => movimientos.value.length ? movimientos.value[0] : null);

    const saldoVisibleTexto = computed(() => {
      if (!saldoVisible.value) return 'Sin datos';
      return `${formatQuantity(saldoVisible.value.saldo_cantidad)} ${saldoVisible.value.unidad_abreviatura || ''} / ${formatMoney(saldoVisible.value.saldo_total)}`;
    });

    const resumenTexto = computed(() => {
      const parts = [
        `Entradas: ${formatMoney(totalEntradas.value)}`,
        `Salidas: ${formatMoney(totalSalidas.value)}`,
        `Ajustes: ${formatMoney(totalAjustes.value)}`,
        `Devoluciones: ${formatMoney(totalDevoluciones.value)}`
      ];

      if (articuloCoincidente.value) {
        parts.unshift(`Artículo: ${articuloCoincidente.value.nombre}`);
      } else if (filtroNombre.value.trim()) {
        parts.unshift(`Búsqueda: "${filtroNombre.value.trim()}"`);
      }

      return parts.join(' | ');
    });

    const lowStockArticulos = computed(() => articulos.value.filter((item) => Number(item.stock_actual || 0) <= Number(item.stock_minimo || 0)));
    const lowStockPreview = computed(() => lowStockArticulos.value.slice(0, 6));

    const movimientosAgrupados = computed(() => {
      const grupos = {};

      movimientos.value.forEach((mov) => {
        const key = mov.articulo_id;

        if (!grupos[key]) {
          grupos[key] = {
            articulo_id: mov.articulo_id,
            articulo_nombre: mov.articulo_nombre,
            articulo_tipo: mov.articulo_tipo,
            articulo_url_foto: mov.articulo_url_foto,
            unidad_abreviatura: mov.unidad_abreviatura,
            saldo_total: 0,
            saldo_cantidad: 0,
            movimientos: []
          };
        }

        grupos[key].movimientos.push(mov);
      });

      const result = Object.values(grupos);

      result.forEach((grupo) => {
        grupo.movimientos.sort(
          (a, b) => new Date(b.fecha_movimiento) - new Date(a.fecha_movimiento)
        );

        const ultimoMovimiento = grupo.movimientos[0];
        if (ultimoMovimiento) {
          grupo.saldo_total = ultimoMovimiento.saldo_total;
          grupo.saldo_cantidad = ultimoMovimiento.saldo_cantidad;
          grupo.unidad_abreviatura = ultimoMovimiento.unidad_abreviatura || grupo.unidad_abreviatura;
        }
      });

      return result.sort(
        (a, b) => new Date(b.movimientos[0]?.fecha_movimiento || 0) - new Date(a.movimientos[0]?.fecha_movimiento || 0)
      );
    });

    const articuloIndex = computed(() => {
      const map = new Map();
      for (const item of articulos.value) {
        map.set(Number(item.id), item);
      }
      return map;
    });

    const isMovimientoPorAgotar = (movimiento) => {
      const articulo = articuloIndex.value.get(Number(movimiento.articulo_id));
      if (!articulo) return false;
      return Number(articulo.stock_actual || 0) <= Number(articulo.stock_minimo || 0);
    };

    const isGrupoPorAgotar = (grupo) => {
      const articulo = articuloIndex.value.get(Number(grupo.articulo_id));
      if (!articulo) return false;
      return Number(articulo.stock_actual || 0) <= Number(articulo.stock_minimo || 0);
    };

    const valorizacionRows = computed(() => articulos.value.map((item) => {
      const stockActual = parseNumber(item.stock_actual);
      const costoUnitario = parseNumber(item.costo_unitario);
      const stockMinimo = parseNumber(item.stock_minimo);
      return {
        ...item,
        stock_actual: stockActual,
        costo_unitario: costoUnitario,
        stock_minimo: stockMinimo,
        totalBodega: stockActual * costoUnitario,
        porAgotar: stockActual <= stockMinimo
      };
    }));

    const granTotalInventario = computed(() => valorizacionRows.value.reduce((acc, row) => acc + parseNumber(row.totalBodega), 0));

    const cargarSucursales = async () => {
      try {
        const data = await kardexArticulosService.getSucursales();
        if (!setupActive) return;
        sucursales.value = Array.isArray(data) ? data : [];
      } catch (error) {
        console.error(error);
        if (!setupActive) return;
        sucursales.value = [];
      }
    };

    const cargarArticulos = async () => {
      try {
        const data = await articuloService.getAll();
        if (!setupActive) return;
        articulos.value = Array.isArray(data) ? data : [];
      } catch (error) {
        console.error(error);
        if (!setupActive) return;
        articulos.value = [];
      }
    };

    const consultarKardex = async () => {
      if (!setupActive) return;
      loading.value = true;
      // Resolver articuloId desde el texto antes de enviar al backend
      filters.value.articuloId = resolveArticuloId();
      try {
        const data = await kardexArticulosService.getMovimientos(filters.value);
        if (!setupActive) return;
        movimientos.value = Array.isArray(data) ? data : [];
      } catch (error) {
        console.error(error);
        if (!setupActive) return;
        movimientos.value = [];
        alert(error.message || 'Error al consultar el kardex');
      } finally {
        if (setupActive) {
          loading.value = false;
        }
      }
    };

    const onFiltroNombreInput = () => {
      if (autoSearchTimer.value) {
        clearTimeout(autoSearchTimer.value);
      }

      autoSearchTimer.value = setTimeout(() => {
        consultarKardex();
      }, 300);
    };

    const abrirNuevoMovimiento = () => {
      movimientoActivo.value = null;
      showMovimientoModal.value = true;
    };

    const editarMovimiento = (movimiento) => {
      movimientoActivo.value = movimiento;
      showMovimientoModal.value = true;
    };

    const cerrarMovimientoModal = () => {
      showMovimientoModal.value = false;
      movimientoActivo.value = null;
    };

    const abrirDetalleCompra = (compraId) => {
      compraActivaId.value = Number(compraId);
      showCompraModal.value = true;
    };

    const cerrarDetalleCompra = () => {
      showCompraModal.value = false;
      compraActivaId.value = null;
    };

    const onMovimientoSaved = async () => {
      cerrarMovimientoModal();
      await Promise.all([consultarKardex(), cargarArticulos()]);
    };

    const puedeEditarMovimiento = (movimiento) => {
      const docRef = String(movimiento.documento_referencia || movimiento.documento_referencia_visible || '');
      return (
        movimiento.tipo_movimiento === 'ENTRADA' &&
        docRef.includes('MANUAL') &&
        movimientos.value.length === 1
      );
    };

    const eliminarMovimiento = async (movimiento) => {
      if (!confirm(`Desea eliminar el movimiento manual de ${movimiento.articulo_nombre}?`)) return;

      try {
        await kardexArticulosService.deleteManualMovimiento(movimiento.id);
        await Promise.all([consultarKardex(), cargarArticulos()]);
      } catch (error) {
        alert(error.message || 'Error al eliminar el movimiento manual');
      }
    };

    const resetFilters = () => {
      filtroNombre.value = '';
      filters.value = {
        fechaInicio: currentMonthStart(),
        fechaFinal: todayString(),
        sucursalId: 'TODAS',
        articuloId: 'TODOS',
        tipoMovimiento: 'TODOS'
      };
      consultarKardex();
    };

    const setMesActual = () => {
      filters.value.fechaInicio = currentMonthStart();
      filters.value.fechaFinal = todayString();
      consultarKardex();
    };

    const exportarExcel = async () => {
      const rows = movimientos.value.map((item) => ({
        Fecha: formatDateTime(item.fecha_movimiento),
        'Tipo Movimiento': item.tipo_movimiento,
        Sucursal: getSucursalLabel(item.sucursal_id),
        Articulo: item.articulo_nombre,
        'Documento Referencia': item.documento_referencia_visible || '',
        'Cant. Entrada': parseNumber(item.cant_entrada),
        'Costo Entrada': parseNumber(item.costo_entrada),
        'Total Entrada': parseNumber(item.total_entrada),
        'Cant. Salida': parseNumber(item.cant_salida),
        'Costo Salida': parseNumber(item.costo_salida),
        'Total Salida': parseNumber(item.total_salida),
        'Saldo Cantidad': parseNumber(item.saldo_cantidad),
        'Saldo Costo Unitario': parseNumber(item.saldo_costo_unitario),
        'Saldo Total': parseNumber(item.saldo_total)
      }));

      const XLSX = await getXLSX();
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      const filename = `kardex-articulos-${filters.value.fechaInicio || 'sin-fecha'}-${filters.value.fechaFinal || 'sin-fecha'}.csv`;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      link.click();
      URL.revokeObjectURL(url);
    };

    const buildPrintRows = () => movimientos.value.map((item) => ({
      fecha: formatDateTime(item.fecha_movimiento),
      articulo: item.articulo_nombre,
      tipo: item.tipo_movimiento,
      documento: item.documento_referencia_visible || '---',
      entrada: formatMoney(item.total_entrada),
      salida: formatMoney(item.total_salida),
      saldo: `${formatQuantity(item.saldo_cantidad)} / ${formatMoney(item.saldo_total)}`
    }));

    const imprimirCarta = () => {
      const popup = window.open('', '_blank');
      if (!popup) {
        alert('Permite ventanas emergentes para imprimir.');
        return;
      }

      const rows = buildPrintRows().map((row) => `
        <tr>
          <td>${row.fecha}</td>
          <td>${row.articulo}</td>
          <td>${row.tipo}</td>
          <td>${row.documento}</td>
          <td style="text-align:right;">${row.entrada}</td>
          <td style="text-align:right;">${row.salida}</td>
          <td style="text-align:right;">${row.saldo}</td>
        </tr>
      `).join('');

      popup.document.write(`
        <html>
          <head>
            <title>Kardex Carta</title>
            <style>
              @page { size: letter; margin: 14mm; }
              body { font-family: Arial, sans-serif; color: #334155; }
              h1 { color: #0f172a; margin: 0 0 6px; }
              .meta { font-size: 12px; margin-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 8px; }
              th, td { border: 1px solid #e2e8f0; padding: 7px; font-size: 11px; }
              th { background: #f8fafc; text-transform: uppercase; font-size: 10px; }
              .firmas { margin-top: 28px; display: flex; justify-content: space-between; gap: 20px; }
              .firma { flex: 1; border-top: 1px solid #94a3b8; text-align: center; padding-top: 6px; font-size: 11px; }
            </style>
          </head>
          <body>
            <h1>Reporte Kardex para Auditoría</h1>
            <div class="meta">Periodo: ${filters.value.fechaInicio || '---'} al ${filters.value.fechaFinal || '---'}<br/>Entradas: ${formatMoney(totalEntradas.value)} | Salidas: ${formatMoney(totalSalidas.value)} | Neto: ${formatMoney(variacionNeta.value)}</div>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th><th>Artículo</th><th>Tipo</th><th>Documento</th><th>Entrada</th><th>Salida</th><th>Saldo</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <div class="firmas">
              <div class="firma">Quien Entrega</div>
              <div class="firma">Quien Recibe</div>
            </div>
            <script>window.onload = () => { window.print(); window.close(); };<\/script>
          </body>
        </html>
      `);
      popup.document.close();
    };

    onMounted(async () => {
      await Promise.all([cargarSucursales(), cargarArticulos()]);
      await consultarKardex();
    });

    onBeforeUnmount(() => {
      setupActive = false;
      if (autoSearchTimer.value) {
        clearTimeout(autoSearchTimer.value);
        autoSearchTimer.value = null;
      }
    });

    return {
      articulos,
      activeTab,
      compraActivaId,
      loading,
      movimientoActivo,
      movimientos,
      movimientosAgrupados,
      abrirDetalleCompra,
      showMovimientoModal,
      showCompraModal,
      sucursales,
      filters,
      abrirNuevoMovimiento,
      editarMovimiento,
      eliminarMovimiento,
      cerrarMovimientoModal,
      cerrarDetalleCompra,
      granTotalInventario,
      imprimirCarta,
      isMovimientoPorAgotar,
      isGrupoPorAgotar,
      lowStockArticulos,
      lowStockPreview,
      filtroNombre,
      articuloCoincidente,
      resetFilters,
      setMesActual,
      resumenTexto,
      saldoVisibleTexto,
      totalAjustes,
      totalDevoluciones,
      totalEntradas,
      totalSalidas,
      variacionNeta,
      valorizacionRows,
      formatQuantity,
      formatMoney,
      formatDateTime,
      tipoBadgeClass,
      tipoIcono,
      getArticuloImageUrl,
      handleImageError,
      getSucursalLabel,
      onMovimientoSaved,
      puedeEditarMovimiento,
      consultarKardex,
      onFiltroNombreInput,
      toggleRow,
      isRowExpanded,
      exportarExcel
    };
  }
};
</script>

<style scoped>
.filter-label {
  display: block;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-weight: 900;
  color: rgb(100 116 139 / 1);
  margin-bottom: 0.55rem;
}

.filter-input {
  width: 100%;
  padding: 0.9rem 1rem;
  border-radius: 1.15rem;
  border: 1px solid rgb(226 232 240 / 1);
  background: white;
  font-size: 0.95rem;
  font-weight: 600;
  color: rgb(15 23 42 / 1);
  outline: none;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.filter-input:focus {
  border-color: rgb(13 148 136 / 1);
  box-shadow: 0 0 0 3px rgb(204 251 241 / 1);
}

.summary-card {
  border-width: 1px;
  border-radius: 1.6rem;
  padding: 1rem 1.1rem;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.summary-title {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-weight: 900;
  color: rgb(100 116 139 / 1);
}

.summary-number {
  margin-top: 0.65rem;
  font-size: 1.55rem;
  line-height: 1.1;
  font-weight: 900;
}

.audit-table {
  border-collapse: separate;
  border-spacing: 0;
}

.audit-table th {
  padding: 1rem;
  background: rgb(248 250 252 / 1);
  border-bottom: 1px solid rgb(226 232 240 / 1);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-weight: 900;
  color: rgb(100 116 139 / 1);
  text-align: left;
  white-space: nowrap;
}

.audit-table td {
  padding: 1rem;
  border-bottom: 1px solid rgb(241 245 249 / 1);
  vertical-align: top;
  font-size: 0.9rem;
  color: rgb(51 65 85 / 1);
}

.document-link {
  color: rgb(15 118 110 / 1);
  font-weight: 800;
  text-align: left;
  line-height: 1.35;
}

.document-link:hover {
  color: rgb(13 148 136 / 1);
  text-decoration: underline;
}

.tab-btn {
  border-radius: 9999px;
  padding: 0.55rem 1rem;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.13em;
  font-weight: 900;
  border: 1px solid transparent;
}

.tab-btn-active {
  color: rgb(255 255 255 / 1);
  background: rgb(15 23 42 / 1);
  border-color: rgb(15 23 42 / 1);
}

.tab-btn-idle {
  color: rgb(51 65 85 / 1);
  background: rgb(248 250 252 / 1);
  border-color: rgb(226 232 240 / 1);
}
</style>

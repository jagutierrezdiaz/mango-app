<template>
  <div class="compras-view admin-crud-shell animate-fadeIn min-h-screen w-full max-w-7xl overflow-x-hidden p-4 md:p-6 mx-auto">
    <div class="mb-8 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5 border-b border-slate-200 pb-6">
      <div>
        <h1 class="admin-crud-title text-3xl font-black text-teal-700 italic uppercase tracking-tighter">Compras</h1>
        <p class="admin-crud-subtitle text-[10px] uppercase tracking-widest font-black">Patio Bohemio / Histórico de Compras Registradas</p>
      </div>

      <div class="flex flex-col lg:flex-row gap-3 w-full xl:w-auto xl:min-w-[980px]">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Fecha Inicio</label>
            <input v-model="filters.fechaInicio" type="date" class="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-teal-500 focus:ring-2 focus:ring-cyan-100 text-sm font-medium">
          </div>
          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Fecha Final</label>
            <input v-model="filters.fechaFinal" type="date" class="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-teal-500 focus:ring-2 focus:ring-cyan-100 text-sm font-medium">
          </div>
          <div class="flex items-end">
            <button @click="consultar" :disabled="loading" class="w-full pb-btn pb-btn-consult pb-btn-unified px-4 py-3 disabled:opacity-50">
              <i :class="loading ? 'fas fa-circle-notch fa-spin' : 'fas fa-filter'"></i>
              <span>{{ loading ? 'Consultando...' : 'Consultar' }}</span>
            </button>
          </div>
          <div class="flex items-end">
            <button @click="resetFechas" class="w-full pb-btn pb-btn-secondary pb-btn-unified px-4 py-3 text-[11px]">
              <i class="fas fa-redo"></i>
              <span>Mes Actual</span>
            </button>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 items-end">
          <button @click="nuevaCompra" class="flex-1 lg:flex-none pb-btn pb-btn-new pb-btn-unified px-5 py-3 whitespace-nowrap">
            <i class="fas fa-plus"></i>
            <span>Nueva Compra</span>
          </button>
          <button @click="exportarPDF" :disabled="loading || comprasFiltradas.length === 0" class="flex-1 lg:flex-none pb-btn pb-btn-export pb-btn-unified px-5 py-3 text-[11px] whitespace-nowrap">
            <i class="fas fa-file-pdf"></i>
            <span>PDF</span>
          </button>
          <button @click="exportarExcel" :disabled="loading || comprasFiltradas.length === 0" class="flex-1 lg:flex-none pb-btn pb-btn-export pb-btn-unified px-5 py-3 text-[11px] whitespace-nowrap">
            <i class="fas fa-file-excel"></i>
            <span>Exportar</span>
          </button>
          <button @click="imprimirReporte" :disabled="loading || comprasFiltradas.length === 0" class="flex-1 lg:flex-none pb-btn pb-btn-print pb-btn-unified px-5 py-3 text-[11px] whitespace-nowrap">
            <i class="fas fa-print"></i>
            <span>Imprimir</span>
          </button>
        </div>
      </div>
    </div>

    <div class="mb-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      <div class="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">Total Compras</p>
        <p class="text-2xl font-black text-slate-800 mt-2">{{ comprasFiltradas.length }}</p>
      </div>
      <div class="rounded-[1.6rem] border border-blue-200 bg-blue-50 p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">Total Subtotal</p>
        <p class="text-2xl font-black text-blue-700 mt-2">{{ formatMoney(resumen.totalSubtotal) }}</p>
      </div>
      <div class="rounded-[1.6rem] border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">Total Pendiente</p>
        <p class="text-2xl font-black text-amber-700 mt-2">{{ formatMoney(resumen.totalPendiente) }}</p>
      </div>
      <div class="rounded-[1.6rem] border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">Total IVA</p>
        <p class="text-2xl font-black text-emerald-700 mt-2">{{ formatMoney(resumen.totalIva) }}</p>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center p-32 bg-white/50 rounded-[40px] border-2 border-dashed border-gray-100 shadow-inner animate-fadeIn">
      <p class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Cargando compras...</p>
    </div>
    <div v-else-if="comprasFiltradas.length === 0" class="flex items-center justify-center p-32 bg-white/50 rounded-[40px] border-2 border-dashed border-gray-100 shadow-inner animate-fadeIn">
      <p class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic">No hay compras registradas</p>
    </div>
    <div v-else class="space-y-4 w-full max-w-full">
      <article v-for="c in comprasFiltradas" :key="c.id" class="admin-crud-panel rounded-2xl overflow-hidden mb-3 border border-slate-200 bg-white/95">
        <div class="flex flex-wrap lg:flex-nowrap items-center gap-3 p-4 sm:p-5 hover:bg-slate-50/70 transition-colors">
          <div class="flex-1 min-w-0" @click="toggleDetalle(c.id)">
            <div class="flex flex-wrap lg:flex-nowrap items-center gap-4 cursor-pointer">
              <div class="w-full sm:w-[240px] lg:w-56 bg-slate-50/80 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3 flex-1 min-w-0">
                  <div class="w-12 h-12 rounded-lg overflow-hidden bg-white shadow-inner border border-gray-200 flex-shrink-0">
                    <img :src="getProveedorImageUrl(c.proveedor_url_logo)" @error="handleProveedorImageError" class="w-full h-full object-cover">
                  </div>
                  <div>
                    <p class="text-[8px] font-black admin-card-title uppercase">Proveedor</p>
                    <p class="text-[11px] font-bold admin-card-title mt-1 truncate max-w-[140px]">{{ c.proveedor_razon_social }}</p>
                  </div>
                </div>
                <button type="button" :aria-expanded="expanded.includes(c.id)" @click.stop="toggleDetalle(c.id)" class="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-teal-100 text-slate-700 hover:text-teal-700 font-bold rounded-lg transition-all border border-slate-300 hover:border-teal-300">
                  <i :class="['fas fa-chevron-down transition-transform text-[13px]', expanded.includes(c.id) ? 'rotate-180' : '']"></i>
                </button>
              </div>

              <div class="w-full lg:flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <p class="text-[9px] font-black admin-card-title uppercase mb-1">Tipo Documento</p>
                  <p class="font-bold text-gray-800 text-sm break-words">{{ c.tipo_documento }}</p>
                </div>
                <div>
                  <p class="text-[9px] font-black admin-card-title uppercase mb-1">Fecha Compra y Hora</p>
                  <p class="font-bold text-gray-700 text-sm">{{ formatDateTime(c.fecha_compra) }}</p>
                </div>
                <div>
                  <p class="text-[9px] font-black admin-card-title uppercase mb-1">Fecha Pagada y Hora</p>
                  <p class="font-bold text-gray-700 text-sm">{{ formatDateTime(c.fecha_pagada) }}</p>
                </div>
                <div>
                  <p class="text-[9px] font-black admin-card-title uppercase mb-1">Estado Pago</p>
                  <p
                    :class="[
                      'font-bold text-sm',
                      ['Pagada', 'Pagado'].includes(c.estado_pago) ? 'text-emerald-600' : 'text-amber-600'
                    ]"
                  >
                    {{ c.estado_pago || 'Pendiente' }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="w-full sm:w-auto flex items-center justify-end gap-2 lg:ml-auto">
            <button @click.stop="editarCompra(c.id)" class="pb-btn pb-btn-edit btn-icon-text text-xs px-3 py-1.5">
              <i class="fas fa-pen-to-square text-[11px]"></i>
              <span class="hidden sm:inline">Editar</span>
            </button>
            <button @click.stop="eliminarCompra(c.id)" class="pb-btn pb-btn-danger btn-icon-text text-xs px-3 py-1.5">
              <i class="fas fa-trash-can text-[11px]"></i>
              <span class="hidden sm:inline">Borrar</span>
            </button>
          </div>
        </div>

        <div v-show="expanded.includes(c.id)" class="border-t border-slate-200 bg-slate-50/60 p-6 animate-fadeIn space-y-5">
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <p><b>Subtotal:</b> {{ formatMoney(c.subtotal) }}</p>
            <p><b>IVA Total:</b> {{ formatMoney(c.iva_total) }}</p>
            <p><b>ReteFuente:</b> {{ formatMoney(c.retefuente_total) }}</p>
            <p><b>ReteICA:</b> {{ formatMoney(c.reteica_total) }}</p>
            <p><b>Total Pagar:</b> {{ formatMoney(c.total_pagar) }}</p>
            <p class="col-span-2"><b>Observaciones:</b> {{ c.observaciones || '---' }}</p>
          </div>

          <CompraDetalle :compra-id="c.id" @updated="fetchCompras" />
        </div>
      </article>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-white/20">
        <div class="bg-teal-700 p-6 text-white flex justify-between items-center sticky top-0 z-20">
          <h3 class="text-xs font-black uppercase tracking-[0.2em] italic">{{ isEdit ? 'Editar' : 'Nueva' }} Compra</h3>
          <button @click="closeModal" class="pb-btn pb-btn-secondary btn-icon-text px-3 py-1.5 text-[10px]">
            <i class="fas fa-times"></i>
            <span>Cerrar</span>
          </button>
        </div>

        <form @submit.prevent="guardarCompra" class="p-8 space-y-5">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Fecha Compra</label>
              <input v-model="form.fecha_compra" type="date" required class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium">
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Tipo de Documento</label>
              <select
                v-model="form.tipo_documento"
                required
                :disabled="!tiposDocumento.length"
                class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium appearance-none"
              >
                <option v-if="!tiposDocumento.length" value="" disabled>Seleccione tipo de documento</option>
                <option v-for="tipo in tiposDocumento" :key="tipo" :value="tipo">{{ tipo }}</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Número Documento</label>
              <input v-model="form.numero_documento" type="text" required class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="sm:col-span-2">
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Lista de Proveedores</label>
              <select v-model="form.proveedor_id" required class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium appearance-none">
                <option value="">Seleccione proveedor</option>
                <option v-for="p in proveedores" :key="p.id" :value="p.id">{{ p.razon_social }}</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Forma de Pago</label>
              <select
                v-model="form.forma_pago"
                :disabled="!formasPago.length"
                class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium appearance-none"
              >
                <option v-if="!formasPago.length" value="" disabled>Cargando formas de pago...</option>
                <option v-for="forma in formasPago" :key="forma" :value="forma">{{ forma }}</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Observaciones</label>
            <textarea v-model="form.observaciones" rows="3" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium"></textarea>
          </div>

          <div class="flex gap-3 pt-4">
            <button type="button" @click="closeModal" class="btn-modal-cancel pb-btn-unified flex-1 py-3 text-[10px]">
              <i class="fas fa-times"></i>
              <span>Cancelar</span>
            </button>
            <button type="submit" :disabled="saving" class="btn-modal-save pb-btn-unified flex-1 py-3 text-[10px] disabled:opacity-50">
              <i :class="saving ? 'fas fa-circle-notch fa-spin' : 'fas fa-save'"></i>
              <span>{{ saving ? 'Guardando...' : 'Guardar' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue';
import { compraService } from '../services/compraService.js';
import { proveedoresService } from '../services/proveedoresService.js';
import CompraDetalle from './CompraDetalle.vue';
import { API_BASE_URL } from '../config/api.js';
import { getPdfTools, getXLSX } from '../utils/lazyVendors.js';
import { useDeleteSecurity } from '../composables/useDeleteSecurity.js';

const API_BASE = API_BASE_URL;
const UPLOADS_BASE = (process.env.VUE_APP_UPLOADS_BASE_URL || API_BASE.replace(/\/api\/?$/, '')).replace(/\/$/, '');

// Fecha final = hoy; fecha inicial = hoy menos 2 meses (mismo día).
const getDefaultFechaFinal = () => new Date().toISOString().slice(0, 10);

const getDefaultFechaInicio = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 2);
  return d.toISOString().slice(0, 10);
};

export default {
  name: 'Compras',
  components: {
    CompraDetalle
  },
  setup() {
    const requestDeleteSecurity = useDeleteSecurity();
    const compras = ref([]);
    const proveedores = ref([]);
    const tiposDocumento = ref([]);
    const formasPago = ref([]);
    const estadosPago = ref([]);
    const loading = ref(true);
    const saving = ref(false);
    const showModal = ref(false);
    const isEdit = ref(false);
    const expanded = ref([]);
    const filters = ref({
      fechaInicio: getDefaultFechaInicio(),
      fechaFinal: getDefaultFechaFinal()
    });

    const form = ref({
      id: null,
      proveedor_id: '',
      tipo_documento: '',
      numero_documento: '',
      fecha_compra: '',
      fecha_pagada: '',
      subtotal: '0,00',
      iva_total: '0,00',
      retefuente_total: '0,00',
      reteica_total: '0,00',
      total_pagar: '0,00',
      estado_pago: 'Pendiente',
      forma_pago: 'Contado',
      observaciones: ''
    });

    const parseLocaleNumber = (value) => {
      if (value === null || value === undefined || value === '') return 0;
      const normalized = String(value).replace(/\./g, '').replace(',', '.');
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const formatNumber = (value) => Number(value || 0).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    const parseNumber = (value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const formatMoney = (value) => Math.round(parseNumber(value)).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    const formatDate = (value) => {
      if (!value) return '---';
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) {
        const raw = String(value).trim().replace('T', ' ').slice(0, 16);
        const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2})$/);
        if (!match) return raw;
        const [, year, month, day, hour, minute] = match;
        return `${day}/${month}/${year} ${hour}:${minute}`;
      }
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hour = String(d.getHours()).padStart(2, '0');
      const minute = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hour}:${minute}`;
    };

    const formatDateTime = (value) => formatDate(value);

    // El rango se aplica en backend con DATE(fecha_compra) para evitar desfases por zona horaria.
    const comprasFiltradas = computed(() => compras.value);

    const resumen = computed(() => comprasFiltradas.value.reduce((acc, item) => {
      const subtotal = parseNumber(item.subtotal);
      const iva = parseNumber(item.iva_total);
      const total = parseNumber(item.total_pagar);
      const estado = String(item.estado_pago || '').toLowerCase();

      acc.totalSubtotal += subtotal;
      acc.totalIva += iva;
      if (estado.includes('pendiente')) {
        acc.totalPendiente += total;
      }
      return acc;
    }, {
      totalSubtotal: 0,
      totalIva: 0,
      totalPendiente: 0
    }));

    const fetchCompras = async () => {
      loading.value = true;
      try {
        compras.value = await compraService.getAll({
          fecha_inicio: filters.value.fechaInicio,
          fecha_final: filters.value.fechaFinal
        });
      } catch (error) {
        console.error(error);
        compras.value = [];
      } finally {
        loading.value = false;
      }
    };

    const consultar = () => {
      fetchCompras();
    };

    const resetFechas = () => {
      filters.value.fechaInicio = getDefaultFechaInicio();
      filters.value.fechaFinal = getDefaultFechaFinal();
      consultar();
    };

    const fetchProveedores = async () => {
      try {
        const result = await proveedoresService.getAll();
        proveedores.value = Array.isArray(result) ? result : (Array.isArray(result?.data) ? result.data : []);
      } catch (error) {
        console.error(error);
        proveedores.value = [];
      }
    };

    const normalizeFormaPagoDisplay = (value) => {
      if (value === 'Credito') return 'Crédito';
      return value || '';
    };

    const applyCatalogDefaults = () => {
      if (!form.value.tipo_documento && tiposDocumento.value.length) {
        form.value.tipo_documento = tiposDocumento.value[0];
      }
      if (!form.value.forma_pago && formasPago.value.length) {
        form.value.forma_pago = formasPago.value[0];
      }
      if (!form.value.estado_pago && estadosPago.value.length) {
        form.value.estado_pago = estadosPago.value[0];
      }
    };

    const fetchCatalogos = async () => {
      try {
        const catalogos = await compraService.getCatalogos();
        tiposDocumento.value = catalogos.tipos_documento;
        formasPago.value = catalogos.formas_pago;
        estadosPago.value = catalogos.estados_pago;
        applyCatalogDefaults();
      } catch (error) {
        console.error('[Compras] No se pudieron cargar los catálogos:', error);
        tiposDocumento.value = [];
        formasPago.value = [];
        estadosPago.value = [];
      }
    };

    const toggleDetalle = (id) => {
      const index = expanded.value.indexOf(id);
      if (index > -1) {
        expanded.value.splice(index, 1);
      } else {
        expanded.value.splice(0, expanded.value.length, id);
      }
    };

    const resetForm = () => {
      form.value = {
        id: null,
        proveedor_id: '',
        tipo_documento: '',
        numero_documento: '',
        fecha_compra: '',
        fecha_pagada: '',
        subtotal: '0,00',
        iva_total: '0,00',
        retefuente_total: '0,00',
        reteica_total: '0,00',
        total_pagar: '0,00',
        estado_pago: estadosPago.value[0] || 'Pendiente',
        forma_pago: formasPago.value[0] || '',
        observaciones: ''
      };
      applyCatalogDefaults();
    };

    const nuevaCompra = async () => {
      await fetchProveedores();
      resetForm();
      isEdit.value = false;
      showModal.value = true;
    };

    const toDatetimeLocal = (value) => {
      if (!value) return '';
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return '';
      const offset = d.getTimezoneOffset();
      const local = new Date(d.getTime() - (offset * 60000));
      return local.toISOString().slice(0, 16);
    };

    const editarCompra = async (id) => {
      try {
        await fetchProveedores();
        const compra = await compraService.getById(id);
        form.value = {
          id: compra.id,
          proveedor_id: compra.proveedor_id,
          tipo_documento: compra.tipo_documento,
          numero_documento: compra.numero_documento,
          fecha_compra: compra.fecha_compra ? String(compra.fecha_compra).slice(0, 10) : '',
          fecha_pagada: toDatetimeLocal(compra.fecha_pagada),
          subtotal: formatNumber(compra.subtotal),
          iva_total: formatNumber(compra.iva_total),
          retefuente_total: formatNumber(compra.retefuente_total),
          reteica_total: formatNumber(compra.reteica_total),
          total_pagar: formatNumber(compra.total_pagar),
          estado_pago: compra.estado_pago || 'Pendiente',
          forma_pago: normalizeFormaPagoDisplay(compra.forma_pago) || formasPago.value[0] || '',
          observaciones: compra.observaciones || ''
        };
        isEdit.value = true;
        showModal.value = true;
      } catch (error) {
        alert(error.message || 'Error al cargar la compra');
      }
    };

    const normalizeDateTimeToApp = (value) => {
      if (!value) return null;
      const cleaned = String(value).trim().replace('T', ' ');
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(cleaned)) {
        return cleaned;
      }
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(cleaned)) {
        return `${cleaned}:00`;
      }
      return cleaned.slice(0, 19);
    };

    const buildCompraTimestamp = (dateOnlyValue) => {
      if (!dateOnlyValue) return null;
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      return normalizeDateTimeToApp(`${String(dateOnlyValue).slice(0, 10)} ${hh}:${mm}:${ss}`);
    };

    const guardarCompra = async () => {
      saving.value = true;
      const payload = {
        proveedor_id: Number(form.value.proveedor_id),
        tipo_documento: form.value.tipo_documento,
        numero_documento: form.value.numero_documento,
        fecha_compra: buildCompraTimestamp(form.value.fecha_compra),
        fecha_pagada: normalizeDateTimeToApp(form.value.fecha_pagada),
        subtotal: parseLocaleNumber(form.value.subtotal),
        iva_total: parseLocaleNumber(form.value.iva_total),
        retefuente_total: parseLocaleNumber(form.value.retefuente_total),
        reteica_total: parseLocaleNumber(form.value.reteica_total),
        total_pagar: parseLocaleNumber(form.value.total_pagar),
        estado_pago: form.value.estado_pago || 'Pendiente',
        forma_pago: form.value.forma_pago,
        observaciones: form.value.observaciones
      };

      try {
        await compraService.save(payload, form.value.id);
        await fetchCompras();
        closeModal();
      } catch (error) {
        alert(error.message || 'Error al guardar compra');
      } finally {
        saving.value = false;
      }
    };

    const eliminarCompra = async (id) => {
      await requestDeleteSecurity({
        execute: async () => {
          const result = await compraService.delete(id);
          if (result?.success === false) {
            throw new Error(result.message || 'No se pudo eliminar la compra.');
          }
          await fetchCompras();
        },
        successMessage: 'Compra eliminada correctamente.',
        errorMessage: 'Error al eliminar compra.'
      });
    };

    const closeModal = () => {
      showModal.value = false;
    };

    const getProveedorImageUrl = (filename) => {
      if (!filename) return `${UPLOADS_BASE}/uploads/proveedores/default.png`;
      if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
      if (filename.startsWith('/uploads/')) return `${UPLOADS_BASE}${filename}`;
      return `${UPLOADS_BASE}/uploads/proveedores/${filename}`;
    };

    const handleProveedorImageError = (event) => {
      event.target.src = `${UPLOADS_BASE}/uploads/proveedores/default.png`;
    };

    const exportarExcel = async () => {
      const rows = comprasFiltradas.value.map((item) => ({
        Fecha: formatDate(item.fecha_compra),
        Proveedor: item.proveedor_razon_social,
        TipoDocumento: item.tipo_documento,
        NumeroDocumento: item.numero_documento,
        Subtotal: parseNumber(item.subtotal),
        IVA: parseNumber(item.iva_total),
        TotalPagar: parseNumber(item.total_pagar),
        EstadoPago: item.estado_pago || 'Pendiente'
      }));

      const XLSX = await getXLSX();
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Compras');
      const filename = `compras-${filters.value.fechaInicio || 'sin-fecha'}-${filters.value.fechaFinal || 'sin-fecha'}.xlsx`;
      XLSX.writeFile(workbook, filename);
    };

    const exportarPDF = async () => {
      try {
        const pdfTools = await getPdfTools();
        const jsPDF = pdfTools.jsPDF;
        const autoTable = pdfTools.autoTable;

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm' });
        doc.setFontSize(14);
        doc.setTextColor(17, 94, 89);
        doc.text('INFORME DE COMPRAS', 105, 14, { align: 'center' });

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Periodo: ${filters.value.fechaInicio} al ${filters.value.fechaFinal}`, 14, 22);
        doc.text(`Total compras: ${comprasFiltradas.value.length}`, 14, 27);

        const rows = comprasFiltradas.value.map((item) => [
          formatDate(item.fecha_compra),
          item.proveedor_razon_social || '---',
          item.numero_documento || '---',
          formatMoney(item.total_pagar),
          item.estado_pago || 'Pendiente'
        ]);

        autoTable(doc, {
          startY: 32,
          head: [['Fecha', 'Proveedor', 'Documento', 'Total', 'Estado']],
          body: rows,
          margin: 14,
          headerStyles: {
            fillColor: [17, 94, 89],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 8
          },
          bodyStyles: {
            fontSize: 8,
            textColor: 55
          },
          alternateRowStyles: {
            fillColor: [243, 244, 246]
          }
        });

        doc.save(`compras-${filters.value.fechaInicio || 'sin-fecha'}-${filters.value.fechaFinal || 'sin-fecha'}.pdf`);
      } catch (error) {
        alert(error.message || 'No fue posible exportar PDF');
      }
    };

    const imprimirReporte = () => {
      const popup = window.open('', '_blank');
      if (!popup) {
        alert('Permite las ventanas emergentes para imprimir');
        return;
      }

      const rows = comprasFiltradas.value.map((item) => `
        <tr>
          <td>${formatDate(item.fecha_compra)}</td>
          <td>${item.proveedor_razon_social || '---'}</td>
          <td>${item.numero_documento || '---'}</td>
          <td class="text-right num-entero">${formatMoney(item.total_pagar)}</td>
          <td>${item.estado_pago || 'Pendiente'}</td>
        </tr>
      `).join('');

      popup.document.write(`
        <html>
          <head>
            <title>Informe de Compras</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 16px; color: #334155; }
              h1 { color: #115e59; margin-bottom: 8px; }
              table { width: 100%; border-collapse: collapse; margin-top: 12px; }
              th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; text-align: left; }
              th { background: #f1f5f9; font-weight: 700; }
            </style>
          </head>
          <body>
            <h1>Informe de Compras</h1>
            <p>Periodo: ${filters.value.fechaInicio} al ${filters.value.fechaFinal}</p>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Proveedor</th>
                  <th>Documento</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <script>window.onload = () => { window.print(); window.close(); };<\/script>
          </body>
        </html>
      `);
      popup.document.close();
    };

    onMounted(async () => {
      await Promise.all([fetchCompras(), fetchProveedores(), fetchCatalogos()]);
    });

    return {
      compras,
      comprasFiltradas,
      proveedores,
      loading,
      saving,
      showModal,
      isEdit,
      expanded,
      filters,
      resumen,
      form,
      tiposDocumento,
      formasPago,
      formatDate,
      formatDateTime,
      formatMoney,
      consultar,
      resetFechas,
      toggleDetalle,
      fetchCompras,
      nuevaCompra,
      editarCompra,
      guardarCompra,
      eliminarCompra,
      closeModal,
      getProveedorImageUrl,
      handleProveedorImageError,
      exportarPDF,
      exportarExcel,
      imprimirReporte
    };
  }
};
</script>

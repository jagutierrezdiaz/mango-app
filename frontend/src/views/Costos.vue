<template>
  <div class="costos-view admin-crud-shell min-h-screen w-full max-w-7xl overflow-x-hidden p-4 md:p-6 mx-auto">
    <div class="mb-8 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5 border-b border-slate-200 pb-6">
      <div>
        <h1 class="admin-crud-title text-3xl font-black text-teal-700 italic uppercase tracking-tighter">Costos</h1>
        <p class="admin-crud-subtitle text-[10px] uppercase tracking-widest font-black">Patio Bohemio / Flujo de Costos</p>
      </div>

      <div class="flex flex-col lg:flex-row gap-3 w-full xl:w-auto xl:min-w-[880px]">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 flex-1">
          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Fecha Inicio</label>
            <input v-model="filters.fechaInicio" type="date" class="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-teal-500 focus:ring-2 focus:ring-cyan-100 text-sm font-medium">
          </div>
          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Fecha Final</label>
            <input v-model="filters.fechaFinal" type="date" class="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-teal-500 focus:ring-2 focus:ring-cyan-100 text-sm font-medium">
          </div>
          <div class="flex items-end">
            <button @click="consultarCostos" :disabled="loading" class="w-full pb-btn pb-btn-primary pb-btn-unified px-4 py-3 disabled:opacity-50">
              <i :class="loading ? 'fas fa-circle-notch fa-spin' : 'fas fa-filter'"></i>
              <span>{{ loading ? 'Consultando...' : 'Consultar' }}</span>
            </button>
          </div>
          <div class="flex items-end">
            <button @click="aplicarMesActual" :disabled="loading" class="w-full px-4 py-3 text-[11px] pb-btn-month-current">
              <i class="fas fa-calendar-alt"></i>
              <span>Mes Actual</span>
            </button>
          </div>
          <div class="flex items-end">
            <button @click="abrirNuevo" class="w-full px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-2">
              <i class="fas fa-plus"></i>
              <span>Nuevo Costo</span>
            </button>
          </div>
        </div>

        <div class="flex items-end">
          <button @click="exportarExcel" :disabled="loading || costos.length === 0" class="w-full xl:w-auto pb-btn pb-btn-excel pb-btn-unified px-5 py-3 text-[11px] whitespace-nowrap">
            <i class="fas fa-file-excel"></i>
            <span>Exportar</span>
          </button>
        </div>
      </div>
    </div>

    <div class="mb-5 grid grid-cols-1 md:grid-cols-3 gap-3">
      <div class="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">Registros</p>
        <p class="text-2xl font-black text-slate-800 mt-2">{{ costos.length }}</p>
      </div>
      <div class="rounded-[1.6rem] border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">Cantidad Acumulada</p>
        <p class="text-2xl font-black text-amber-700 mt-2">{{ totalCantidad }}</p>
      </div>
      <div class="rounded-[1.6rem] border border-rose-200 bg-rose-50 p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">Total Costo Acumulado</p>
        <p class="text-2xl font-black text-rose-700 mt-2">{{ formatMoney(totalCostos) }}</p>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center p-24 bg-white/70 rounded-[2rem] border border-slate-200 shadow-inner">
      <p class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Cargando costos...</p>
    </div>

    <div v-else-if="costos.length === 0" class="flex items-center justify-center p-24 bg-white/70 rounded-[2rem] border border-dashed border-slate-200 shadow-inner">
      <div class="text-center">
        <i class="fas fa-calculator text-4xl text-slate-300 mb-4 block"></i>
        <p class="text-slate-400 font-bold text-lg">No hay costos para los filtros seleccionados</p>
      </div>
    </div>

    <div v-else class="space-y-4">
      <article v-for="item in costos" :key="item.id" class="relative overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white shadow-sm">
        <div class="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-200 via-teal-300 to-transparent"></div>

        <div class="relative flex flex-col xl:flex-row gap-4 p-5 xl:p-6">
          <div class="flex items-start gap-4 xl:w-[290px] shrink-0">
            <div class="relative z-10 mt-2 w-7 h-7 rounded-full border-4 border-white shadow bg-teal-500 flex items-center justify-center text-white text-[10px]">
              <i class="fas fa-cubes"></i>
            </div>

            <div class="article-photo-box flex-1 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 flex items-center gap-3 min-w-0">
              <div class="w-14 h-14 rounded-2xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center shrink-0">
                <img v-if="item.articulo_url_foto" :src="item.articulo_url_foto" class="w-full h-full object-cover" @error="hideImage">
                <i v-else class="fas fa-boxes text-slate-300 text-lg"></i>
              </div>
              <div class="min-w-0">
                <p class="text-[8px] uppercase font-black admin-card-title">Articulo</p>
                <p class="text-sm font-black text-slate-800 break-words uppercase">{{ item.articulo_nombre || 'Sin articulo' }}</p>
                <p class="text-[10px] font-bold text-slate-500 uppercase mt-1">{{ item.tipo_costo }}</p>
              </div>
            </div>
          </div>

          <div class="flex-1 min-w-0 space-y-4">
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200 bg-slate-50 text-slate-700">
                {{ item.clase_puc }}
              </span>
              <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-cyan-200 bg-cyan-50 text-cyan-700">
                {{ formatDateTime(item.fecha_costo) }}
              </span>
              <span
                :class="{
                  'border-emerald-200 bg-emerald-50 text-emerald-700': item.estado === 'CAUSADO',
                  'border-blue-200 bg-blue-50 text-blue-700': item.estado === 'PAGADO',
                  'border-rose-200 bg-rose-50 text-rose-600 line-through': item.estado === 'ANULADO'
                }"
                class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border">
                {{ item.estado || 'CAUSADO' }}
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
              <div class="readonly-box md:col-span-2 xl:col-span-2">
                <p class="readonly-label">Descripcion</p>
                <p class="readonly-value break-words">{{ item.descripcion }}</p>
              </div>
              <div class="readonly-box">
                <p class="readonly-label">Documento Origen</p>
                <p class="readonly-value">{{ item.id_documento_origen || '---' }}</p>
              </div>
              <div class="readonly-box">
                <p class="readonly-label">Sucursal ID</p>
                <p class="readonly-value">{{ item.sucursal_id }}</p>
              </div>
              <div class="readonly-box">
                <p class="readonly-label">Cantidad</p>
                <p class="readonly-value">{{ formatQty(item.cantidad) }} {{ item.unidad_abreviatura || '' }}</p>
              </div>
              <div class="readonly-box">
                <p class="readonly-label">Valor Unitario</p>
                <p class="readonly-value">{{ formatMoney(item.valor_unitario) }}</p>
              </div>
              <div class="readonly-box">
                <p class="readonly-label">Total Costo</p>
                <p class="readonly-value text-rose-700">{{ formatMoney(item.total_costo) }}</p>
              </div>
            </div>
          </div>

          <div class="w-full xl:w-auto flex xl:flex-col items-end justify-end gap-2 xl:pl-2">
            <button @click="editar(item.id)" :disabled="item.estado === 'ANULADO'" class="btn-icon-text bg-cyan-50 hover:bg-cyan-100 text-teal-700 font-bold text-xs px-3 py-1.5 rounded-xl transition-all border border-cyan-200 disabled:opacity-40 disabled:cursor-not-allowed">
              <i class="fas fa-pen-to-square text-[11px]"></i>
              <span>Editar</span>
            </button>
            <button v-if="item.estado !== 'PAGADO' && item.estado !== 'ANULADO'" @click="abrirModalPago(item)" class="btn-icon-text bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-3 py-1.5 rounded-xl transition-all border border-emerald-200">
              <i class="fas fa-coins text-[11px]"></i>
              <span>Pagar</span>
            </button>
            <button v-if="item.estado !== 'ANULADO'" @click="anular(item)" class="btn-icon-text bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs px-3 py-1.5 rounded-xl transition-all border border-rose-200">
              <i class="fas fa-ban text-[11px]"></i>
              <span>Anular</span>
            </button>
          </div>
        </div>
      </article>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto border border-white/20">
        <div class="bg-teal-700 p-6 text-white flex justify-between items-center sticky top-0 z-20">
          <h3 class="text-xs font-black uppercase tracking-[0.2em] italic">{{ isEdit ? 'Editar' : 'Nuevo' }} Costo</h3>
          <button @click="cerrarModal" class="pb-btn pb-btn-secondary btn-icon-text px-3 py-1.5 text-[10px]">
            <i class="fas fa-times"></i>
            <span>Cerrar</span>
          </button>
        </div>

        <form @submit.prevent="guardar" class="p-8 space-y-5">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="lg:col-span-2">
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Clase PUC</label>
              <select v-model="form.clase_puc" required class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium appearance-none">
                <option v-for="clase in clasesPuc" :key="clase" :value="clase">{{ clase }}</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Estado</label>
              <div v-if="!isEdit" class="w-full px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm font-bold text-emerald-700">
                CAUSADO (obligatorio en creación)
              </div>
              <div v-else class="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-2xl text-sm font-bold text-slate-700">
                {{ form.estado || 'CAUSADO' }}
              </div>
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Fecha Costo</label>
              <input v-model="form.fecha_costo" type="datetime-local" required class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium">
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Fecha Registro</label>
              <input v-model="form.fecha_registro" type="datetime-local" required class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium">
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="lg:col-span-2">
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Articulo</label>
              <select v-model="form.articulo_id" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium appearance-none">
                <option value="">Sin articulo</option>
                <option v-for="art in articulos" :key="art.id" :value="String(art.id)">{{ art.nombre }}</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Tipo Costo</label>
              <select v-model="form.tipo_costo" required class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium appearance-none">
                <option v-for="tipo in tiposCosto" :key="tipo" :value="tipo">{{ tipo }}</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Sucursal ID</label>
              <input v-model.number="form.sucursal_id" type="number" min="1" step="1" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium text-right">
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Descripcion</label>
            <textarea v-model="form.descripcion" rows="2" required class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium"></textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Cantidad</label>
              <input v-model.number="form.cantidad" type="number" min="0" step="1" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium text-right">
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Valor Unitario</label>
              <input v-model="form.valor_unitario" type="text" inputmode="decimal" required @blur="onBlurMoney('valor_unitario')" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium text-right">
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Total Costo</label>
              <input :value="totalCalculado" readonly class="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-2xl text-sm font-bold text-slate-700 text-right">
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">ID Doc. Origen</label>
              <input v-model.number="form.id_documento_origen" type="number" min="1" step="1" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium text-right">
            </div>
          </div>

          <div class="flex gap-3 pt-4">
            <button type="button" @click="cerrarModal" class="btn-modal-cancel pb-btn-unified flex-1 py-3 text-[10px]">
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

    <ModalPagos
      v-if="showPagoModal && pagoContext.registro_id"
      :monto_objetivo="pagoContext.monto_objetivo"
      :registro_id="pagoContext.registro_id"
      :tipo_registro="pagoContext.tipo_registro"
      @close="showPagoModal = false"
      @paid="handlePagoRegistrado"
    />
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue';
import { costosService } from '../services/costosService.js';
import { articuloService } from '../services/articuloService.js';
import { getXLSX } from '../utils/lazyVendors.js';
import ModalPagos from '../components/modalPagos.vue';

const toLocalDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Rango por defecto: hoy menos 2 meses ? hoy
const defaultDateRange = () => {
  const fin = new Date();
  const inicio = new Date();
  inicio.setMonth(inicio.getMonth() - 2);
  return {
    fechaInicio: toLocalDateInput(inicio),
    fechaFinal: toLocalDateInput(fin)
  };
};

const todayDate = () => toLocalDateInput(new Date());
const nowDateTimeLocal = () => {
  const d = new Date();
  d.setSeconds(0, 0);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - (offset * 60000));
  return local.toISOString().slice(0, 16);
};

const clasesPuc = ['61 - Costo de Ventas - Alimentos', '71 - Costos de Producción/Operación'];
const tiposCosto = ['MATERIA_PRIMA', 'MANO_OBRA_DIRECTA', 'COSTO_MERCANCIA', 'COSTO_INDIRECTO'];

export default {
  name: 'Costos',
  components: {
    ModalPagos
  },
  setup() {
    const loading = ref(true);
    const saving = ref(false);
    const showModal = ref(false);
    const showPagoModal = ref(false);
    const isEdit = ref(false);
    const costoId = ref(null);
    const costos = ref([]);
    const articulos = ref([]);
    const pagoContext = ref({
      monto_objetivo: 0,
      registro_id: null,
      tipo_registro: 'costo'
    });

    const filters = ref(defaultDateRange());

    const form = ref({
      articulo_id: '',
      sucursal_id: 1,
      clase_puc: clasesPuc[0],
      fecha_costo: nowDateTimeLocal(),
      fecha_registro: nowDateTimeLocal(),
      tipo_costo: tiposCosto[0],
      descripcion: '',
      cantidad: 0,
      valor_unitario: 0,
      total_costo: 0,
      id_documento_origen: '',
      estado: 'CAUSADO'
    });

    const parseNumber = (value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const localeParts = new Intl.NumberFormat(undefined).formatToParts(12345.6);
    const localeGroup = localeParts.find((p) => p.type === 'group')?.value || ',';
    const localeDecimal = localeParts.find((p) => p.type === 'decimal')?.value || '.';

    const parseLocaleNumber = (value) => {
      if (value === null || value === undefined || value === '') return 0;
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      const raw = String(value).trim().replace(/\s+/g, '').replace(/[\$€£¥₱₡₲₴₦₵R$]/g, '');
      const normalized = raw
        .replace(new RegExp(`\\${localeGroup}`, 'g'), '')
        .replace(new RegExp(`\\${localeDecimal}`, 'g'), '.')
        .replace(/,/g, '.')
        .replace(/[^\d.-]/g, '');
      const n = Number(normalized);
      return Number.isFinite(n) ? n : 0;
    };

    const systemMoneyFormatter = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    const formatNumber = (value) => systemMoneyFormatter.format(parseLocaleNumber(value));

    const onBlurMoney = (field) => {
      form.value[field] = formatNumber(parseLocaleNumber(form.value[field]));
    };

    const totalCalculadoRaw = computed(() => parseNumber(form.value.cantidad) * parseLocaleNumber(form.value.valor_unitario));
    const totalCalculado = computed(() => parseNumber(totalCalculadoRaw.value).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }));

    const totalCantidad = computed(() => {
      const activos = costos.value.filter((c) => String(c.estado || '').toUpperCase() !== 'ANULADO');
      return parseNumber(activos.reduce((acc, item) => acc + parseNumber(item.cantidad), 0)).toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    });

    const totalCostos = computed(() =>
      costos.value
        .filter((c) => String(c.estado || '').toUpperCase() !== 'ANULADO')
        .reduce((acc, item) => acc + parseNumber(item.total_costo), 0)
    );

    const formatQty = (value) => parseNumber(value).toLocaleString('es-CO', {
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
      const date = new Date(String(value).replace(' ', 'T'));
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    };

    const hideImage = (event) => {
      event.target.style.display = 'none';
    };

    const resetForm = () => {
      form.value = {
        articulo_id: '',
        sucursal_id: 1,
        clase_puc: clasesPuc[0],
        fecha_costo: nowDateTimeLocal(),
        fecha_registro: nowDateTimeLocal(),
        tipo_costo: tiposCosto[0],
        descripcion: '',
        cantidad: 0,
        valor_unitario: '0,00',
        total_costo: 0,
        id_documento_origen: '',
        estado: 'CAUSADO'
      };
    };

    const consultarCostos = async () => {
      loading.value = true;
      try {
        costos.value = await costosService.getAll(filters.value);
      } catch (error) {
        console.error(error);
        costos.value = [];
        alert(error.message || 'Error al consultar costos');
      } finally {
        loading.value = false;
      }
    };

    const aplicarMesActual = async () => {
      filters.value = defaultDateRange();
      await consultarCostos();
    };

    const cargarArticulos = async () => {
      try {
        const data = await articuloService.getAll();
        articulos.value = Array.isArray(data) ? data : [];
      } catch (error) {
        console.error(error);
        articulos.value = [];
      }
    };

    const abrirNuevo = async () => {
      await cargarArticulos();
      isEdit.value = false;
      costoId.value = null;
      resetForm();
      showModal.value = true;
    };

    const editar = async (id) => {
      try {
        await cargarArticulos();
        const data = await costosService.getById(id);
        isEdit.value = true;
        costoId.value = id;
        form.value = {
          articulo_id: data.articulo_id ? String(data.articulo_id) : '',
          sucursal_id: Number(data.sucursal_id || 1),
          clase_puc: data.clase_puc,
          fecha_costo: String(data.fecha_costo || '').replace(' ', 'T').slice(0, 16),
          fecha_registro: String(data.fecha_registro || '').replace(' ', 'T').slice(0, 16) || nowDateTimeLocal(),
          tipo_costo: data.tipo_costo,
          descripcion: data.descripcion || '',
          cantidad: parseNumber(data.cantidad),
          valor_unitario: formatNumber(data.valor_unitario),
          total_costo: parseNumber(data.total_costo),
          id_documento_origen: data.id_documento_origen || '',
          estado: data.estado || 'CAUSADO'
        };
        showModal.value = true;
      } catch (error) {
        alert(error.message || 'Error al cargar costo');
      }
    };

    const guardar = async () => {
      saving.value = true;
      try {
        const payload = {
          articulo_id: form.value.articulo_id ? Number(form.value.articulo_id) : null,
          sucursal_id: Number(form.value.sucursal_id || 1),
          clase_puc: form.value.clase_puc,
          fecha_costo: form.value.fecha_costo,
          fecha_registro: form.value.fecha_registro,
          tipo_costo: form.value.tipo_costo,
          descripcion: form.value.descripcion,
          cantidad: parseNumber(form.value.cantidad),
          valor_unitario: parseLocaleNumber(form.value.valor_unitario),
          total_costo: parseNumber(totalCalculadoRaw.value),
          id_documento_origen: form.value.id_documento_origen ? Number(form.value.id_documento_origen) : null
        };

        await costosService.save(payload, costoId.value);
        await consultarCostos();
        cerrarModal();
      } catch (error) {
        alert(error.message || 'Error al guardar costo');
      } finally {
        saving.value = false;
      }
    };

    const eliminar = async (id) => {
      // DELETE bloqueado: usar Anular
      alert('Los costos no se eliminan físicamente. Use el botón Anular.');
    };

    const anular = async (item) => {
      if (!window.confirm(`¿Anular el costo "${item.descripcion}"? Esta acción es irreversible y generará asientos contables de reversión.`)) return;
      try {
        await costosService.save({ estado: 'ANULADO' }, item.id);
        await consultarCostos();
      } catch (error) {
        alert(error.message || 'Error al anular el costo');
      }
    };

    const abrirModalPago = (item) => {
      pagoContext.value = {
        monto_objetivo: parseNumber(item?.total_costo),
        registro_id: Number(item?.id || 0),
        tipo_registro: 'costo'
      };
      showPagoModal.value = true;
    };

    const handlePagoRegistrado = async () => {
      showPagoModal.value = false;
      await consultarCostos();
    };

    const cerrarModal = () => {
      showModal.value = false;
      resetForm();
    };

    const exportarExcel = async () => {
      const rows = costos.value.map((item) => ({
        'Fecha Costo': formatDateTime(item.fecha_costo),
        'Clase PUC': item.clase_puc,
        'Tipo Costo': item.tipo_costo,
        Articulo: item.articulo_nombre || '',
        Descripcion: item.descripcion,
        Cantidad: parseNumber(item.cantidad),
        'Valor Unitario': parseNumber(item.valor_unitario),
        'Total Costo': parseNumber(item.total_costo),
        'ID Documento Origen': item.id_documento_origen || '',
        'Sucursal ID': item.sucursal_id
      }));

      const XLSX = await getXLSX();
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Costos');
      XLSX.writeFile(workbook, `costos-${filters.value.fechaInicio || 'sin-fecha'}-${filters.value.fechaFinal || 'sin-fecha'}.xlsx`);
    };

    onMounted(async () => {
      await consultarCostos();
    });

    return {
      loading,
      saving,
      showModal,
      showPagoModal,
      isEdit,
      costos,
      articulos,
      filters,
      form,
      pagoContext,
      clasesPuc,
      tiposCosto,
      totalCantidad,
      totalCostos,
      totalCalculado,
      formatMoney,
      formatQty,
      formatDateTime,
      hideImage,
      consultarCostos,
      aplicarMesActual,
      abrirNuevo,
      editar,
      guardar,
      onBlurMoney,
      abrirModalPago,
      handlePagoRegistrado,
      eliminar,
      anular,
      cerrarModal,
      exportarExcel
    };
  }
};
</script>

<style scoped>
.readonly-box {
  border: 1px solid rgb(226 232 240 / 1);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(255, 255, 255, 1));
  border-radius: 1.15rem;
  padding: 0.9rem 1rem;
  min-height: 84px;
}

.readonly-label {
  font-size: 9px;
  line-height: 1.1;
  text-transform: uppercase;
  font-weight: 900;
  letter-spacing: 0.14em;
  color: rgb(100 116 139 / 1);
  margin-bottom: 0.55rem;
}

.readonly-value {
  font-size: 0.92rem;
  line-height: 1.3;
  font-weight: 800;
  color: rgb(30 41 59 / 1);
}
</style>

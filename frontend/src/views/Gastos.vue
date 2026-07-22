<template>
  <div class="gastos-view admin-crud-shell min-h-screen w-full max-w-7xl overflow-x-hidden p-4 md:p-6 mx-auto">
    <div class="mb-8 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5 border-b border-slate-200 pb-6">
      <div>
        <h1 class="admin-crud-title text-3xl font-black text-teal-700 italic uppercase tracking-tighter">REGISTRO GASTOS</h1>
        <p class="admin-crud-subtitle text-[10px] uppercase tracking-widest font-black">Flujo de Gastos</p>
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
            <button @click="consultarGastos" :disabled="loading" class="w-full pb-btn pb-btn-primary pb-btn-unified px-4 py-3 disabled:opacity-50">
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
              <span>Nuevo Gasto</span>
            </button>
          </div>
        </div>

        <div class="flex items-end">
          <button @click="exportarExcel" :disabled="loading || gastos.length === 0" class="w-full xl:w-auto pb-btn pb-btn-excel pb-btn-unified px-5 py-3 text-[11px] whitespace-nowrap">
            <i class="fas fa-file-excel"></i>
            <span>Exportar</span>
          </button>
        </div>
      </div>
    </div>

    <div class="mb-5 grid grid-cols-1 md:grid-cols-4 gap-3">
      <div class="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">Registros</p>
        <p class="text-2xl font-black text-slate-800 mt-2">{{ gastos.length }}</p>
      </div>
      <div class="rounded-[1.6rem] border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">Valor Neto Acumulado</p>
        <p class="text-2xl font-black text-amber-700 mt-2">{{ formatMoney(totalNeto) }}</p>
      </div>
      <div class="rounded-[1.6rem] border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">IVA Acumulado</p>
        <p class="text-2xl font-black text-cyan-700 mt-2">{{ formatMoney(totalIva) }}</p>
      </div>
      <div class="rounded-[1.6rem] border border-rose-200 bg-rose-50 p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">Total Gasto Acumulado</p>
        <p class="text-2xl font-black text-rose-700 mt-2">{{ formatMoney(totalGastos) }}</p>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center p-24 bg-white/70 rounded-[2rem] border border-slate-200 shadow-inner">
      <p class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Cargando gastos...</p>
    </div>

    <div v-else-if="gastos.length === 0" class="flex items-center justify-center p-24 bg-white/70 rounded-[2rem] border border-dashed border-slate-200 shadow-inner">
      <div class="text-center">
        <i class="fas fa-receipt text-4xl text-slate-300 mb-4 block"></i>
        <p class="text-slate-400 font-bold text-lg">No hay gastos para los filtros seleccionados</p>
      </div>
    </div>

    <div v-else class="space-y-4">
      <article v-for="item in gastos" :key="item.id" class="relative overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white shadow-sm">
        <div class="relative flex flex-col xl:flex-row gap-4 p-5 xl:p-6">

        <div class="flex items-start gap-4 xl:w-[290px] shrink-0">
          <div class="article-photo-box flex-1 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 flex items-center gap-3 min-w-0">
            <div class="w-14 h-14 rounded-2xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center shrink-0">
              <img :src="getProveedorLogo(item.proveedor_url_logo)" class="w-full h-full object-cover" @error="handleLogoError">
            </div>
            <div class="min-w-0">
              <p class="text-[8px] uppercase font-black admin-card-title">Proveedor</p>
              <p class="text-sm font-black text-slate-800 break-words uppercase">{{ item.proveedor_nombre || 'Sin Proveedor' }}</p>
              <p class="text-[10px] font-bold text-slate-500 uppercase mt-1">{{ item.tipo_documento }}</p>
            </div>
          </div>
        </div>



          <div class="flex-1 min-w-0 space-y-4">
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200 bg-slate-50 text-slate-700">
                {{ item.grupo_puc }}
              </span>
              <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-cyan-200 bg-cyan-50 text-cyan-700">
                {{ formatDateTime(item.fecha_gasto) }}
              </span>
              <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border" :class="estadoClass(item.estado)">
                {{ item.estado }}
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
              <div class="readonly-box md:col-span-2 xl:col-span-2">
                <p class="readonly-label">Descripcion</p>
                <p class="readonly-value break-words">{{ item.descripcion }}</p>
              </div>
              <div class="readonly-box">
                <p class="readonly-label">Numero Soporte</p>
                <p class="readonly-value">{{ item.numero_soporte || '---' }}</p>
              </div>
              <div class="readonly-box">
                <p class="readonly-label">Comprobante</p>
                <a :href="item.url_comprobante" target="_blank" rel="noreferrer" class="readonly-value text-cyan-700 hover:underline">Ver Soporte</a>
              </div>
              <div class="readonly-box">
                <p class="readonly-label">Valor Neto</p>
                <p class="readonly-value">{{ formatMoney(item.valor_neto) }}</p>
              </div>
              <div class="readonly-box">
                <p class="readonly-label">IVA</p>
                <p class="readonly-value">{{ formatMoney(item.iva) }}</p>
              </div>
              <div class="readonly-box">
                <p class="readonly-label">Retencion Fuente</p>
                <p class="readonly-value">{{ formatMoney(item.retencion_fuente) }}</p>
              </div>
              <div class="readonly-box">
                <p class="readonly-label">Total Gasto</p>
                <p class="readonly-value text-rose-700">{{ formatMoney(item.total_gasto) }}</p>
              </div>
            </div>
          </div>

          <div class="w-full xl:w-auto flex xl:flex-col items-end justify-end gap-2 xl:pl-2">
            <!--
            <button
              @click="editar(item.id)"
              :disabled="item.estado === 'ANULADO'"
              class="btn-icon-text bg-cyan-50 hover:bg-cyan-100 text-teal-700 font-bold text-xs px-3 py-1.5 rounded-xl transition-all border border-cyan-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i class="fas fa-pen-to-square text-[11px]"></i>
              <span>Editar</span>
            </button>
            -->
            <button
              v-if="item.estado !== 'PAGADO' && item.estado !== 'ANULADO'"
              @click="abrirModalPago(item)"
              class="btn-icon-text bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-3 py-1.5 rounded-xl transition-all border border-emerald-200"
            >
              <i class="fas fa-coins text-[11px]"></i>
              <span>Pagar</span>
            </button>
            <button
              v-if="item.estado === 'CAUSADO' || item.estado === 'PENDIENTE'"
              @click="anular(item)"
              class="btn-icon-text bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs px-3 py-1.5 rounded-xl transition-all border border-rose-200"
            >
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
          <h3 class="text-xs font-black uppercase tracking-[0.2em] italic">{{ isEdit ? 'Editar' : 'Nuevo' }} Gasto</h3>
          <button @click="cerrarModal" class="pb-btn pb-btn-secondary btn-icon-text px-3 py-1.5 text-[10px]">
            <i class="fas fa-times"></i>
            <span>Cerrar</span>
          </button>
        </div>

        <form @submit.prevent="guardar" class="p-8 space-y-5">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="lg:col-span-2">
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Grupo PUC</label>
              <select v-model="form.grupo_puc" required class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium appearance-none" @change="onGrupoChange">
                <option v-for="grupo in gruposPuc" :key="grupo.codigo" :value="grupo.codigo">{{ grupo.etiqueta }}</option>
              </select>
            </div>
            <div class="lg:col-span-2">
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Cuenta PUC (Subcuenta)</label>
              <select v-model="form.subcuenta_puc" required class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium appearance-none">
                <option v-for="s in subcuentas" :key="s.codigo" :value="s.codigo">{{ s.etiqueta }}</option>
              </select>
              <!--
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 mt-3">Tipo Movimiento</label>
              <input v-model="form.tipo_movimiento" type="text" readonly class="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium" />
              -->
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Fecha Gasto</label>
              <input v-model="form.fecha_gasto" type="datetime-local" required class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium">
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Fecha Registro</label>
              <input v-model="form.fecha_registro" type="datetime-local" required class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium">
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="lg:col-span-2">
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Proveedor</label>
              <select v-model="form.proveedor_id" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium appearance-none">
                <option value="">Sin proveedor</option>
                <option v-for="prov in proveedores" :key="prov.id" :value="String(prov.id)">{{ prov.razon_social || prov.nombre || prov.contacto_nombre }}</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Tipo Documento</label>
              <select v-model="form.tipo_documento" required class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium appearance-none">
                <option v-for="tipo in tiposDocumento" :key="tipo" :value="tipo">{{ tipo }}</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Estado</label>
              <div v-if="!isEdit" class="px-4 py-3 rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 text-[11px] font-black uppercase tracking-widest">
                CAUSADO (obligatorio en creación)
              </div>
              <div v-else class="px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 text-[11px] font-black uppercase tracking-widest">
                {{ form.estado || 'CAUSADO' }}
              </div>
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Descripcion</label>
            <textarea v-model="form.descripcion" rows="2" required class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium"></textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Valor Neto</label>
              <input v-model="form.valor_neto" type="text" inputmode="decimal" required @blur="onBlurMoney('valor_neto')" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium text-right">
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">IVA</label>
              <input v-model="form.iva" type="text" inputmode="decimal" @blur="onBlurMoney('iva')" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium text-right">
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Retencion Fuente</label>
              <input v-model="form.retencion_fuente" type="text" inputmode="decimal" @blur="onBlurMoney('retencion_fuente')" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium text-right">
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Total Gasto</label>
              <input :value="totalCalculado" type="text" readonly class="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-2xl text-sm font-bold text-slate-700 text-right">
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Numero Soporte</label>
              <input v-model="form.numero_soporte" type="text" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium">
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Sucursal ID</label>
              <input v-model.number="form.sucursal_id" type="number" min="1" step="1" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium text-right">
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Comprobante (Imagen/PDF)</label>
              <input ref="comprobanteInput" type="file" accept="image/*,application/pdf" @change="onComprobanteChange" class="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm">
              <p class="text-[10px] text-slate-400 mt-2">Si no se carga archivo se usara `default.png`.</p>
            </div>

            <div class="rounded-2xl border border-slate-200 p-4 bg-slate-50 min-h-[140px] flex items-center justify-center">
              <div v-if="previewType === 'image'" class="w-full h-full flex items-center justify-center">
                <img :src="previewUrl" class="max-h-[180px] rounded-xl object-contain" />
              </div>
              <div v-else-if="previewType === 'pdf'" class="text-center">
                <i class="fas fa-file-pdf text-4xl text-rose-500"></i>
                <p class="text-xs font-bold text-slate-600 mt-2">Archivo PDF listo</p>
                <a :href="previewUrl" target="_blank" rel="noreferrer" class="text-xs text-cyan-700 hover:underline">Abrir PDF</a>
              </div>
              <img v-else :src="defaultComprobanteUrl" class="max-h-[120px] rounded-xl object-contain opacity-90" />
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
import { computed, onMounted, ref, watch } from 'vue';
import { gastosService } from '../services/gastosService.js';
import { proveedoresService } from '../services/proveedoresService.js';
import { API_BASE_URL } from '../config/api.js';
import { getXLSX } from '../utils/lazyVendors.js';
import ModalPagos from '../components/modalPagos.vue';
import { obtenerTipoMovimientoPorCuenta } from '../services/contabilidadService.js';

const API_BASE = API_BASE_URL;
const UPLOADS_BASE = (process.env.VUE_APP_UPLOADS_BASE_URL || API_BASE.replace(/\/api\/?$/, '')).replace(/\/$/, '');

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

const tiposDocumento = ['FACTURA_ELECTRONICA', 'DOCUMENTO_SOPORTE', 'CUENTA_COBRO'];

export default {
  name: 'Gastos',
  components: {
    ModalPagos
  },
  setup() {
    const loading = ref(true);
    const saving = ref(false);
    const showModal = ref(false);
    const showPagoModal = ref(false);
    const isEdit = ref(false);
    const gastoId = ref(null);
    const gastos = ref([]);
    const proveedores = ref([]);
    const gruposPuc = ref([]);
    const subcuentas = ref([]);
    const comprobanteFile = ref(null);
    const previewUrl = ref('');
    const previewType = ref('');
    const pagoContext = ref({
      monto_objetivo: 0,
      registro_id: null,
      tipo_registro: 'gasto'
    });

    const filters = ref(defaultDateRange());

    const form = ref({
      sucursal_id: 1,
      proveedor_id: '',
      grupo_puc: '',
      descripcion: '',
      fecha_gasto: nowDateTimeLocal(),
      fecha_registro: nowDateTimeLocal(),
      valor_neto: 0,
      iva: 0,
      retencion_fuente: 0,
      total_gasto: 0,
      tipo_documento: tiposDocumento[0],
      numero_soporte: '',
      estado: 'CAUSADO'
    });

    const defaultComprobanteUrl = computed(() => `${UPLOADS_BASE}/uploads/gastos/default.png`);

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

    const totalCalculadoRaw = computed(() => parseLocaleNumber(form.value.valor_neto) + parseLocaleNumber(form.value.iva) - parseLocaleNumber(form.value.retencion_fuente));

    const totalCalculado = computed(() => parseNumber(totalCalculadoRaw.value).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }));

    const incluirEnTotales = (estado) => ['CAUSADO', 'PAGADO', 'PENDIENTE'].includes(String(estado || '').toUpperCase());

    const totalNeto = computed(() => gastos.value
      .filter((item) => incluirEnTotales(item.estado))
      .reduce((acc, item) => acc + parseNumber(item.valor_neto), 0));

    const totalIva = computed(() => gastos.value
      .filter((item) => incluirEnTotales(item.estado))
      .reduce((acc, item) => acc + parseNumber(item.iva), 0));

    const totalGastos = computed(() => gastos.value
      .filter((item) => incluirEnTotales(item.estado))
      .reduce((acc, item) => acc + parseNumber(item.total_gasto), 0));

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

    const estadoClass = (estado) => {
      if (estado === 'PAGADO') return 'border-teal-200 bg-teal-50 text-teal-700';
      if (estado === 'CAUSADO' || estado === 'PENDIENTE') return 'border-amber-200 bg-amber-50 text-amber-700';
      if (estado === 'ANULADO') return 'border-rose-200 bg-rose-50 text-rose-700';
      return 'border-slate-200 bg-slate-50 text-slate-700';
    };

    const getProveedorLogo = (url) => {
      if (!url) return `${UPLOADS_BASE}/uploads/proveedores/default.png`;
      if (/^https?:\/\//i.test(url)) return url;
      if (url.startsWith('/uploads/')) return `${UPLOADS_BASE}${url}?t=${new Date().getTime()}`;
      return `${UPLOADS_BASE}/uploads/proveedores/${url}?t=${new Date().getTime()}`;
    };

    const handleLogoError = (event) => {
      event.target.src = `${UPLOADS_BASE}/uploads/proveedores/default.png`;
    };

    const normalizeGroupCode = (value) => {
      const match = String(value || '').match(/^(\d{2})/);
      return match ? match[1] : '';
    };

    const cargarGruposPuc = async () => {
      const grupos = await gastosService.getPucGrupos();
      gruposPuc.value = Array.isArray(grupos) ? grupos : [];
      return gruposPuc.value;
    };

    const cargarSubcuentas = async (groupCode) => {
      try {
        subcuentas.value = await gastosService.getPucSubcuentas(groupCode);
        // Si ya hay una subcuenta seleccionada (modo edición o cambio previo), actualizar el tipo de movimiento
        if (form.value && form.value.subcuenta_puc) {
          try {
            form.value.tipo_movimiento = obtenerTipoMovimientoPorCuenta(String(form.value.subcuenta_puc || '')) || '';
          } catch (err) {
            // no interrumpir flujo por errores en cálculo local
            console.error('Error calculando tipo_movimiento:', err);
          }
        }
        return subcuentas.value;
      } catch (error) {
        console.error('Error cargando subcuentas:', error);
        subcuentas.value = [];
        return [];
      }
    };

    // Vigilar cambios en la subcuenta seleccionada para autocompletar el tipo de movimiento
    watch(
      () => form.value.subcuenta_puc,
      (newVal) => {
        try {
          form.value.tipo_movimiento = obtenerTipoMovimientoPorCuenta(String(newVal || '')) || '';
        } catch (err) {
          console.error('Error calculando tipo_movimiento (watch):', err);
        }
      }
    );

    const onGrupoChange = async () => {
      try {
        form.value.grupo_puc = normalizeGroupCode(String(form.value.grupo_puc || ''));
        await cargarSubcuentas(form.value.grupo_puc);
      } catch (err) {
        console.error('Error en onGrupoChange:', err);
      }
    };

    const cargarCatalogoPuc = async () => {
      const grupos = await cargarGruposPuc();

      if (!grupos.length) {
        form.value.grupo_puc = '';
        return;
      }

      const currentCode = normalizeGroupCode(form.value.grupo_puc);
      form.value.grupo_puc = grupos.some((item) => item.codigo === currentCode)
        ? currentCode
        : grupos[0].codigo;
    };

    const resetForm = () => {
      form.value = {
        sucursal_id: 1,
        proveedor_id: '',
        grupo_puc: gruposPuc.value[0]?.codigo || '',
        subcuenta_puc: '',
        tipo_movimiento: 'GASTO',
        descripcion: '',
        fecha_gasto: nowDateTimeLocal(),
        fecha_registro: nowDateTimeLocal(),
        valor_neto: '0,00',
        iva: '0,00',
        retencion_fuente: '0,00',
        total_gasto: 0,
        tipo_documento: tiposDocumento[0],
        numero_soporte: '',
        estado: 'CAUSADO'
      };
      comprobanteFile.value = null;
      previewUrl.value = '';
      previewType.value = '';
    };

    const consultarGastos = async () => {
      loading.value = true;
      try {
        gastos.value = await gastosService.getAll(filters.value);
      } catch (error) {
        console.error(error);
        gastos.value = [];
        alert(error.message || 'Error al consultar gastos');
      } finally {
        loading.value = false;
      }
    };

    const aplicarMesActual = async () => {
      filters.value = defaultDateRange();
      await consultarGastos();
    };

    const cargarProveedores = async () => {
      try {
        const result = await proveedoresService.getAll();
        proveedores.value = Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
            ? result.data
            : [];
      } catch (error) {
        console.error(error);
        proveedores.value = [];
      }
    };

    const abrirNuevo = async () => {
      await cargarProveedores();
      // cargar grupos primero para que resetForm establezca el grupo inicial
      await cargarCatalogoPuc();
      // inicializar formulario con el grupo cargado
      resetForm();
      // cargar subcuentas para el grupo inicial y seleccionar la primera
      await cargarSubcuentas(form.value.grupo_puc);
      form.value.subcuenta_puc = subcuentas.value[0]?.codigo || '';
      isEdit.value = false;
      gastoId.value = null;
      showModal.value = true;
    };

    const editar = async (id) => {
      try {
        await cargarProveedores();
        await cargarGruposPuc();
        const data = await gastosService.getById(id);
        isEdit.value = true;
        gastoId.value = id;

        const grupoCode = normalizeGroupCode(data.grupo_puc);
        const grupoValido = gruposPuc.value.some((item) => item.codigo === grupoCode)
          ? grupoCode
          : (gruposPuc.value[0]?.codigo || '');

        form.value = {
          sucursal_id: Number(data.sucursal_id || 1),
          proveedor_id: data.proveedor_id ? String(data.proveedor_id) : '',
          grupo_puc: grupoValido,
          descripcion: data.descripcion,
          fecha_gasto: String(data.fecha_gasto || '').replace(' ', 'T').slice(0, 16),
          fecha_registro: String(data.fecha_registro || '').replace(' ', 'T').slice(0, 16) || nowDateTimeLocal(),
          valor_neto: formatNumber(data.valor_neto),
          iva: formatNumber(data.iva),
          retencion_fuente: formatNumber(data.retencion_fuente),
          total_gasto: parseNumber(data.total_gasto),
          tipo_documento: data.tipo_documento,
          numero_soporte: data.numero_soporte || '',
          estado: data.estado === 'PENDIENTE' ? 'CAUSADO' : (data.estado || 'CAUSADO'),
          subcuenta_puc: data.subcuenta_puc || data.cuenta_puc || ''
        };

        comprobanteFile.value = null;
        previewUrl.value = data.url_comprobante || '';
        previewType.value = previewUrl.value.toLowerCase().endsWith('.pdf') ? 'pdf' : (previewUrl.value ? 'image' : '');
        // cargar subcuentas para el grupo seleccionado
        await cargarSubcuentas(grupoValido);
        // si la data tiene subcuenta_puc/cuenta_puc la dejamos, sino seleccionamos la primera subcuenta
        form.value.subcuenta_puc = form.value.subcuenta_puc || form.value.cuenta_puc || subcuentas.value[0]?.codigo || '';
        // Asegurar que el grupo cargado tenga formato de 2 dígitos
        form.value.grupo_puc = normalizeGroupCode(String(form.value.grupo_puc || ''));
        showModal.value = true;
      } catch (error) {
        alert(error.message || 'Error al cargar gasto');
      }
    };

    const onComprobanteChange = (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        comprobanteFile.value = null;
        return;
      }

      comprobanteFile.value = file;
      previewUrl.value = URL.createObjectURL(file);
      previewType.value = file.type === 'application/pdf' ? 'pdf' : 'image';
    };

    const guardar = async () => {
      saving.value = true;

      try {
        if (!form.value.grupo_puc || !gruposPuc.value.some((item) => item.codigo === form.value.grupo_puc)) {
          throw new Error('Debe seleccionar un grupo PUC válido');
        }

        // Normalizar grupo_puc a los primeros 2 caracteres para evitar truncamiento en la BD
        const normalizedGrupo = normalizeGroupCode(String(form.value.grupo_puc || ''));
        const payload = new FormData();
        payload.append('sucursal_id', String(form.value.sucursal_id || 1));
        payload.append('proveedor_id', form.value.proveedor_id ? String(form.value.proveedor_id) : '');
        payload.append('grupo_puc', normalizedGrupo);
        payload.append('descripcion', form.value.descripcion || '');
        payload.append('fecha_gasto', form.value.fecha_gasto || '');
        payload.append('fecha_registro', form.value.fecha_registro || nowDateTimeLocal());
        payload.append('valor_neto', String(parseLocaleNumber(form.value.valor_neto)));
        payload.append('iva', String(parseLocaleNumber(form.value.iva)));
        payload.append('retencion_fuente', String(parseLocaleNumber(form.value.retencion_fuente)));
        payload.append('total_gasto', String(parseNumber(totalCalculadoRaw.value)));
        payload.append('tipo_documento', form.value.tipo_documento);
        payload.append('numero_soporte', form.value.numero_soporte || '');
        payload.append('estado', isEdit.value ? (form.value.estado || 'CAUSADO') : 'CAUSADO');
        payload.append('subcuenta_puc', String(form.value.subcuenta_puc || form.value.cuenta_puc || ''));
        payload.append('tipo_movimiento', String(form.value.tipo_movimiento || 'GASTO'));

        if (comprobanteFile.value) {
          payload.append('comprobante', comprobanteFile.value);
        }

        // DEBUG: imprimir payload que se enviará al backend
        console.log('DEBUG guardar -> normalizedGrupo:', normalizedGrupo);

        // Imprimir todos los pares del FormData
        for (const [key, value] of payload.entries()) {
          console.log('DEBUG guardar payload', key, value);
        }

        // (Opcional) imprimir form completo por si hay discrepancia
        console.log('DEBUG guardar form.value', JSON.parse(JSON.stringify(form.value)));

        await gastosService.save(payload, gastoId.value);
        await consultarGastos();
        cerrarModal();
      } catch (error) {
        alert(error.message || 'Error al guardar gasto');
      } finally {
        saving.value = false;
      }
    };

    const anular = async (item) => {
      const gastoIdLocal = Number(item?.id || 0);
      if (!gastoIdLocal) return;
      if (String(item?.estado || '').toUpperCase() === 'ANULADO') return;

      const ok = window.confirm('¿Estás seguro de anular este gasto? Esta acción es irreversible y generará un asiento contable de reversión.');
      if (!ok) return;

      try {
        const payload = new FormData();
        payload.append('estado', 'ANULADO');
        await gastosService.save(payload, gastoIdLocal);
        await consultarGastos();
      } catch (error) {
        alert(error.message || 'Error al anular gasto');
      }
    };

    const abrirModalPago = (item) => {
      pagoContext.value = {
        monto_objetivo: parseNumber(item?.total_gasto),
        registro_id: Number(item?.id || 0),
        tipo_registro: 'gasto'
      };
      showPagoModal.value = true;
    };

    const handlePagoRegistrado = async () => {
      showPagoModal.value = false;
      await consultarGastos();
    };

    const cerrarModal = () => {
      showModal.value = false;
      resetForm();
    };

    const exportarExcel = async () => {
      const rows = gastos.value.map((item) => ({
        'Fecha Gasto': formatDateTime(item.fecha_gasto),
        Proveedor: item.proveedor_nombre || '',
        'Grupo PUC': item.grupo_puc,
        Descripcion: item.descripcion,
        'Tipo Documento': item.tipo_documento,
        'Numero Soporte': item.numero_soporte || '',
        Estado: item.estado,
        'Valor Neto': parseNumber(item.valor_neto),
        IVA: parseNumber(item.iva),
        'Retencion Fuente': parseNumber(item.retencion_fuente),
        'Total Gasto': parseNumber(item.total_gasto)
      }));

      const XLSX = await getXLSX();
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Gastos');
      XLSX.writeFile(workbook, `gastos-${filters.value.fechaInicio || 'sin-fecha'}-${filters.value.fechaFinal || 'sin-fecha'}.xlsx`);
    };

    onMounted(() => {
      void (async () => {
        try {
          await consultarGastos();
          await cargarCatalogoPuc();
        } catch (error) {
          console.error('Error inicializando vista de gastos:', error);
        }
      })();
    });

    return {
      loading,
      saving,
      showModal,
      showPagoModal,
      isEdit,
      gastos,
      proveedores,
      filters,
      form,
      pagoContext,
      gruposPuc,
      subcuentas,
      tiposDocumento,
      totalNeto,
      totalIva,
      totalGastos,
      totalCalculado,
      defaultComprobanteUrl,
      previewUrl,
      previewType,
      formatMoney,
      formatDateTime,
      estadoClass,
      getProveedorLogo,
      handleLogoError,
      consultarGastos,
      aplicarMesActual,
      abrirNuevo,
      editar,
      guardar,
      onBlurMoney,
      abrirModalPago,
      handlePagoRegistrado,
      anular,
      cerrarModal,
      onComprobanteChange,
      exportarExcel
      ,
      cargarSubcuentas,
      onGrupoChange
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

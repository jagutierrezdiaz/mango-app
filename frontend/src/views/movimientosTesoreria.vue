<template>
  <div class="informe-caja-view admin-crud-shell min-h-screen w-full max-w-7xl overflow-x-hidden p-4 md:p-6 mx-auto">
    <div class="mb-8 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5 border-b border-slate-200 pb-6">
      <div>
        <h1 class="admin-crud-title text-3xl font-black text-teal-700 italic uppercase tracking-tighter">Movimientos Tesorería</h1>
        <p class="admin-crud-subtitle text-[10px] uppercase tracking-widest font-black">Patio Bohemio / Movimientos por cuenta</p>

    <!-- Traslados modal -->
    <TrasladosDinero
      :open="showTraslados"
      :selectedArqueoProp="selectedArqueo"
      @close="showTraslados = false"
      @processed="handleTrasladoProcessed"
    />
      </div>

      <div class="flex flex-col lg:flex-row gap-3 w-full xl:w-auto xl:min-w-[760px]">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Mes</label>
            <select v-model.number="filters.mes" class="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-teal-500 focus:ring-2 focus:ring-cyan-100 text-sm font-medium">
              <option v-for="item in months" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Año</label>
            <select v-model.number="filters.anio" class="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-teal-500 focus:ring-2 focus:ring-cyan-100 text-sm font-medium">
              <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
            </select>
          </div>
          <div class="flex items-end">
            <button @click="consultarTotales" :disabled="loading" class="w-full pb-btn pb-btn-consult pb-btn-unified px-4 py-3 disabled:opacity-50">
              <i :class="loading ? 'fas fa-circle-notch fa-spin' : 'fas fa-search'"></i>
              <span>{{ loading ? 'Cargando...' : 'Actualizar' }}</span>
            </button>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 items-end">
          <button @click="exportarCSV" :disabled="loading" class="flex-1 lg:flex-none pb-btn pb-btn-export pb-btn-unified px-5 py-3 text-[11px] whitespace-nowrap">
            <i class="fas fa-file-csv"></i>
            <span>CSV</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center p-24 bg-white/70 rounded-[2rem] border border-slate-200 shadow-inner">
      <p class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Cargando movimientos...</p>
    </div>

    <div v-else>
      <div class="mb-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <div v-for="card in cards" :key="card.codigo" class="rounded-[1.6rem] border p-4 shadow-sm" :class="card.class">
          <p class="text-[9px] uppercase font-black admin-card-title">{{ card.nombre }}</p>
          <p class="text-[11px] text-slate-500">Código: {{ card.codigo }}</p>
          <p class="text-xl font-black mt-2">{{ formatMoney(card.total) }}</p>
        </div>
      </div>

      <div class="rounded-[1.8rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div class="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">

          
        <div class="tabs flex items-center flex-wrap gap-2 w-full contenedor-buttons">
            <button v-for="(tab, idx) in tabs" :key="tab.codigo" @click="activeTab = idx" :class="activeTab === idx ? 'px-4 py-2 rounded-xl bg-teal-600 text-white font-black' : 'px-4 py-2 rounded-xl border bg-white'">
              {{ tab.label }}
            </button>

            <button 
              @click="abrirTraslados"
              class="ml-auto px-5 py-2 rounded-xl bg-slate-900 text-white font-black hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm"
            >
              <i class="fas fa-exchange-alt text-teal-400"></i>
              <span>Traslados</span>
            </button>
          </div>
        </div>


        <div class="p-5 space-y-4">
          <div class="border border-slate-200 rounded-2xl overflow-hidden p-4">
            <div class="mb-4">
              <p class="text-sm font-black">Cuenta: {{ currentTab.codigo }} — {{ currentTab.label }}</p>
            </div>

            <div class="mb-4">
              <p class="text-sm font-semibold">Total:</p>
              <p class="text-2xl font-black">{{ formatMoney(currentTotal) }}</p>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-100">
                  <tr>
                      <th class="th-cell">Fecha</th>
                      <th class="th-cell text-right">Débito</th>
                      <th class="th-cell text-right">Crédito</th>
                      <th class="th-cell">Referencia</th>
                      <th class="th-cell">Ref ID</th>
                      <th class="th-cell">Descripción</th>
                    </tr>
                </thead>
                <tbody>
                  <tr v-if="!rows.length">
                    <td class="td-cell" colspan="6">Sin movimientos para la cuenta en el período seleccionado.</td>
                  </tr>
                  <tr v-for="r in rows" :key="r.id" class="border-t">
                    <td class="td-cell">{{ formatDateTime(r.fecha) }}</td>
                    <td class="td-cell text-right num-entero">{{ formatMoney(r.Debito) }}</td>
                    <td class="td-cell text-right num-entero">{{ formatMoney(r.Credito) }}</td>
                    <td class="td-cell">{{ r.referencia_tabla }}</td>
                    <td class="td-cell">{{ r.referencia_id }}</td>
                    <td class="td-cell">{{ r.descripcion }}</td>
                  </tr>
                </tbody>
                <tfoot class="bg-slate-50">
                  <tr class="border-t">
                    <td class="td-cell font-black">Totales</td>
                    <td class="td-cell text-right font-black num-entero">{{ formatMoney(totals.debito) }}</td>
                    <td class="td-cell text-right font-black num-entero">{{ formatMoney(totals.credito) }}</td>
                    <td class="td-cell"></td>
                    <td class="td-cell"></td>
                    <td class="td-cell"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>


<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { API_BASE_URL as API_BASE } from '../config/api.js';
import TrasladosDinero from './TrasladosDinero.vue';

const MONTHS = [
  { value: 1, label: 'Enero' },{ value: 2, label: 'Febrero' },{ value: 3, label: 'Marzo' },{ value: 4, label: 'Abril' },{ value: 5, label: 'Mayo' },{ value: 6, label: 'Junio' },{ value: 7, label: 'Julio' },{ value: 8, label: 'Agosto' },{ value: 9, label: 'Septiembre' },{ value: 10, label: 'Octubre' },{ value: 11, label: 'Noviembre' },{ value: 12, label: 'Diciembre' }
];

const now = new Date();
const loading = ref(false);
// Modal state for Traslados
const showTraslados = ref(false);
const selectedArqueo = ref({ id: null, efectivo_real: 0 });
const months = ref(MONTHS);
const years = ref([now.getFullYear()]);
const filters = reactive({ mes: now.getMonth() + 1, anio: now.getFullYear() });

const tabs = ref([
  { codigo: '110510', label: 'Caja Operativa' }, //(110510)
  { codigo: '111005', label: 'Bancos (Cta Ahorros)' }, //(111005)
  { codigo: '110515', label: 'Ahorros (Reserva)' }, //(110515)
  { codigo: '110505', label: 'Caja Punto de Venta' }, //(110505)
  { codigo: '238505', label: 'Propinas' } //(238505)
]);

const cards = ref([
  { codigo: '110510', nombre: 'Caja Operativa', total: 0, class: 'border-emerald-200 bg-emerald-50 p-4' },
  { codigo: '111005', nombre: 'Bancos (Cta Ahorros)', total: 0, class: 'border-blue-200 bg-blue-50 p-4' },
  { codigo: '110515', nombre: 'Ahorros (Reserva)', total: 0, class: 'border-cyan-200 bg-cyan-50 p-4' },
  { codigo: '110505', nombre: 'Caja Punto de Venta', total: 0, class: 'border-amber-200 bg-amber-50 p-4' },
  { codigo: '238505', nombre: 'Propinas', total: 0, class: 'border-pink-200 bg-pink-50 p-4' }
]);

const activeTab = ref(0);
const rows = ref([]);

const currentTab = computed(() => tabs.value[activeTab.value] || tabs.value[0]);
const currentTotal = computed(() => {
  const card = cards.value.find(c => c.codigo === currentTab.value.codigo);
  return card ? card.total : 0;
});

const formatMoney = (v) => {
  const n = Number(v || 0);
  return Math.round(n).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
};

const formatDateTime = (value) => {
  if (!value) return '---';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

const parseResult = async (response, fallbackMessage = 'Error en la consulta') => {
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    throw new Error(result.message || fallbackMessage);
  }
  return result;
};

const apiFetch = async (path, params = {}) => {
  const url = new URL(path.startsWith('/') ? `${API_BASE}${path}` : `${API_BASE}/${path}`, window.location.origin);
  Object.keys(params).forEach(k => url.searchParams.append(k, params[k]));
  const res = await fetch(url.toString(), { headers: authHeaders() });
  return parseResult(res);
};

const consultarTotales = async () => {
  loading.value = true;
  try {
    // Para cada cuenta consultamos el total (back-end debe soportar el endpoint)
    await Promise.all(cards.value.map(async (c) => {
      try {
        const result = await apiFetch('/movimientos_contables/total', { codigo: c.codigo, mes: filters.mes, anio: filters.anio });
        c.total = Number(result?.total || 0);
      } catch (e) {
        c.total = 0;
      }
    }));
    await loadRowsForCurrentTab();
  } catch (error) {
    console.error('Error al consultar totales:', error);
    alert('No se pudieron cargar totales.');
  } finally {
    loading.value = false;
  }
};

const abrirTraslados = () => {
  // Pre-fill selected arqueo efectivo with current total of the active tab
  selectedArqueo.value = { id: null, efectivo_real: currentTotal.value || 0 };
  showTraslados.value = true;
};

const handleTrasladoProcessed = (payload) => {
  // After a processed traslado, refresh totals and close modal
  consultarTotales();
  showTraslados.value = false;
};

const loadRowsForCurrentTab = async () => {
  loading.value = true;
  try {
    const codigo = currentTab.value.codigo;
    // Endpoint espera: codigo, mes, anio
    const result = await apiFetch('/movimientos_contables/list', { codigo, mes: filters.mes, anio: filters.anio });
    // Normalizar filas; extra puede contener datos adicionales provenientes del backend
    rows.value = Array.isArray(result?.rows) ? result.rows : [];
  } catch (error) {
    console.error('Error al cargar movimientos:', error);
    rows.value = [];
  } finally {
    loading.value = false;
  }
};

watch(() => activeTab.value, () => loadRowsForCurrentTab());
watch(() => [filters.mes, filters.anio], () => consultarTotales());

const exportarCSV = () => {
  // Exporta las filas actuales como CSV (cliente)
  if (!rows.value.length) return alert('No hay datos para exportar');
  const header = ['fecha','Debito','Credito','referencia_tabla','referencia_id','descripcion'];
  const csv = [header.join(',')].concat(rows.value.map(r => header.map(h => (`"${String(r[h] ?? '').replace(/"/g,'""')}"`)).join(','))).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `movimientos-${currentTab.value.codigo}-${filters.mes}-${filters.anio}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const totals = computed(() => rows.value.reduce((acc, r) => {
  acc.debito += Number(r.Debito || 0);
  acc.credito += Number(r.Credito || 0);
  return acc;
}, { debito: 0, credito: 0 }));

onMounted(() => {
  consultarTotales();
});
</script>

<style scoped>
.th-cell{padding:8px;text-align:left}
.td-cell{padding:8px;vertical-align:middle}
.num-entero{font-feature-settings: 'tnum';}
.tabs button{margin-left:6px}
.contenedor-buttons{
  justify-content: space-between;
}
</style>

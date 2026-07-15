<template>
  <div class="informe-caja-view admin-crud-shell min-h-screen w-full max-w-7xl overflow-x-hidden p-4 md:p-6 mx-auto">
    <!-- Encabezado -->
    <div class="mb-8 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5 border-b border-slate-200 pb-6">
      <div>
        <h1 class="admin-crud-title text-3xl font-black text-teal-700 italic uppercase tracking-tighter">Informe de
          Ventas</h1>
        <p class="admin-crud-subtitle text-[10px] uppercase tracking-widest font-black">Patio Bohemio / Histórico de
          Ventas Registradas</p>
      </div>

      <div class="flex flex-col lg:flex-row gap-3 w-full xl:w-auto xl:min-w-[880px]">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Fecha
              Inicio</label>
            <input v-model="filters.fechaInicio" type="date"
              class="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-teal-500 focus:ring-2 focus:ring-cyan-100 text-sm font-medium">
          </div>
          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Fecha
              Final</label>
            <input v-model="filters.fechaFinal" type="date"
              class="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-teal-500 focus:ring-2 focus:ring-cyan-100 text-sm font-medium">
          </div>
          <div class="flex items-end">
            <button @click="consultar" :disabled="loading"
              class="w-full pb-btn pb-btn-consult pb-btn-unified px-4 py-3 disabled:opacity-50">
              <i :class="loading ? 'fas fa-circle-notch fa-spin' : 'fas fa-filter'"></i>
              <span>{{ loading ? 'Consultando...' : 'Consultar' }}</span>
            </button>
          </div>
          <div class="flex items-end">
            <button @click="resetFechas" class="w-full pb-btn pb-btn-secondary px-4 py-3 text-[11px]">
              <i class="fas fa-redo"></i>
              <span>Mes Actual</span>
            </button>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 items-end">
          <!-- PDF export removed -->
          <button @click="exportarExcel" :disabled="loading || ingresos.length === 0"
            class="flex-1 lg:flex-none pb-btn pb-btn-export pb-btn-unified px-5 py-3 text-[11px] whitespace-nowrap">
            <i class="fas fa-file-excel"></i>
            <span>Exportar</span>
          </button>
          <button @click="imprimirReporte" :disabled="loading || ingresos.length === 0"
            class="flex-1 lg:flex-none pb-btn pb-btn-print pb-btn-unified px-5 py-3 text-[11px] whitespace-nowrap">
            <i class="fas fa-print"></i>
            <span>Imprimir</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Tarjetas de resumen -->
    <div class="mb-5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <div class="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">Número de Ventas</p>
        <p class="text-2xl font-black text-slate-800 mt-2">{{ resumen.total_ingresos }}</p>
      </div>
      <div class="rounded-[1.6rem] border border-blue-200 bg-blue-50 p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">Total Comandas</p>
        <p class="text-xl font-black text-blue-700 mt-2">{{ formatMoney(resumen.total_venta) }}</p>
      </div>
      <div class="rounded-[1.6rem] border border-violet-200 bg-violet-50 p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">Total Aporte Servicio</p>
        <p class="text-xl font-black text-violet-700 mt-2">{{ formatMoney(resumen.total_servicio) }}</p>
      </div>
      <div class="rounded-[1.6rem] border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">Total Efectivo</p>
        <p class="text-xl font-black text-emerald-700 mt-2">{{ formatMoney(resumen.total_efectivo) }}</p>
      </div>
      <div class="rounded-[1.6rem] border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">Total Transferencia</p>
        <p class="text-xl font-black text-cyan-700 mt-2">{{ formatMoney(resumen.total_digital) }}</p>
      </div>
      <div class="rounded-[1.6rem] border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">Total Ingresos</p>
        <p class="text-xl font-black text-amber-700 mt-2">{{ formatMoney(resumen.total_pagado) }}</p>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading"
      class="flex items-center justify-center p-24 bg-white/70 rounded-[2rem] border border-slate-200 shadow-inner">
      <p class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Cargando datos...</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="ingresos.length === 0"
      class="flex items-center justify-center p-24 bg-white/70 rounded-[2rem] border border-dashed border-slate-200 shadow-inner">
      <div class="text-center">
        <i class="fas fa-inbox text-4xl text-slate-300 mb-4 block"></i>
        <p class="text-slate-400 font-bold text-lg">No hay ventas para los filtros seleccionados</p>
      </div>
    </div>

    <!-- Acordeón de ventas -->
    <div v-else class="space-y-4">
      <article v-for="item in ingresos" :key="item.id"
        class=" overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
        <div class="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-200 via-teal-300 to-transparent">
        </div>

        <div @click="toggleAcordeon(item.id)"
          class="cursor-pointer relative flex flex-col xl:flex-row gap-4 p-5 xl:p-6 hover:bg-slate-50/50 transition-colors">
          <div class="flex items-start gap-4 xl:w-[300px] shrink-0">
            <div class="flex-1 min-w-0">
              <p class="text-[8px] uppercase font-black admin-card-title">Fecha Venta</p>
              <div class="flex items-center justify-between gap-3">
                <p class="text-sm font-black text-slate-800">{{ formatFecha(item.fecha_venta) }}</p>
                <button @click.stop="toggleAcordeon(item.id)" :class="{ 'rotate-180': expandedIds.includes(item.id) }"
                  class="flex-shrink-0 text-slate-400 hover:text-teal-600 transition-all transform">
                  <i class="fas fa-chevron-down"></i>
                </button>
              </div>
            </div>
          </div>

          <div class="flex-1 min-w-0 grid grid-cols-2 lg:grid-cols-5 gap-4 items-center">
            <div class="min-w-0">
              <p class="text-[8px] uppercase font-black admin-card-title">Comanda #</p>
              <p class="text-sm font-bold text-slate-700 break-words">{{ item.comanda_id }}</p>
            </div>
            <div class="min-w-0">
              <p class="text-[8px] uppercase font-black admin-card-title">Núm. Control</p>
              <p class="text-sm font-bold text-slate-700 break-words">{{ formatNumeroControl(item.numero_factura) }}</p>
            </div>
            <div class="min-w-0">
              <p class="text-[8px] uppercase font-black admin-card-title">Total Pagado</p>
              <p class="text-lg font-black text-teal-700">{{ formatMoney(item.total_pagado) }}</p>
            </div>
            <div class="min-w-0">
              <p class="text-[8px] uppercase font-black admin-card-title">Estado</p>
              <span :class="getEstadoClass(item.estado)"
                class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block">
                {{ item.estado }}
              </span>
            </div>
            <div class="flex items-center justify-end gap-2">
              <button @click.stop="imprimirFactura(item)"
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-colors"
                title="Imprimir comprobante">
                <i class="fas fa-print"></i>
                <span class="hidden sm:inline">Comprobante</span>
              </button>
            </div>
          </div>
        </div>

        <transition name="accordion">
          <div v-show="expandedIds.includes(item.id)" class="bg-slate-50/50 border-t border-slate-200">
            <div class="p-6">
              <div class="rounded-2xl border border-slate-200 bg-white p-5 space-y-5">
                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <!-- Columna izquierda fija: título, foto, nombre, rol -->
                  <div class="flex-shrink-0 w-full sm:w-48">
                    <h4 class="text-[10px] uppercase font-black text-slate-600 mb-3 flex items-center gap-2">
                      <i class="fas fa-user-tie text-teal-600"></i>
                      <span>Mesero / Personal</span>
                    </h4>
                    <div class="flex items-center gap-3">
                      <div v-if="item.personal_url_foto"
                        class="w-16 h-16 rounded-2xl overflow-hidden bg-slate-200 flex items-center justify-center flex-shrink-0 border border-slate-300">
                        <img :src="getPersonalImageUrl(item.personal_url_foto, item.personal_nombre)"
                          :alt="item.personal_nombre" class="w-full h-full object-cover"
                          @error="handlePersonalImageError($event, item.personal_nombre)">
                      </div>
                      <div v-else
                        class="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-100 to-teal-100 flex items-center justify-center flex-shrink-0 border border-cyan-200">
                        <i class="fas fa-user text-teal-600 text-lg"></i>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-[8px] uppercase font-black text-slate-500 mb-1">Nombre</p>
                        <div class="flex flex-col items-start">
                          <div class="w-full flex items-center justify-between gap-2 border-r-4 border-slate-900 pr-3">
                            <p class="text-sm font-bold text-slate-800 break-words">
                              {{ [item.nombres, item.apellidos].filter(Boolean).join(' ').trim() || item.personal_nombre
                                || '---' }}
                            </p>
                          </div>
                          <div class="mt-2">
                            <span
                              class="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">{{
                                item.rol || '---' }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Columna derecha: tarjetas métricas alineadas horizontalmente -->
                  <div class="flex flex-wrap gap-3 flex-1 items-center">
                    <div class="readonly-box flex-1 min-w-[120px]">
                      <p class="readonly-label">Método Pago</p>
                      <p class="readonly-value">{{ (getResumenRow(item.comanda_id) && getResumenRow(item.comanda_id).Metodo_Pago) || item.metodo_pago || '---' }}</p>
                    </div>

                    <div class="readonly-box flex-1 min-w-[120px]">
                      <p class="readonly-label">Venta Efectivo</p>
                      <p class="readonly-value">{{ formatMoney(Number((getResumenRow(item.comanda_id) && getResumenRow(item.comanda_id).Venta_Efectivo) || 0)) }}</p>
                    </div>

                    <div class="readonly-box flex-1 min-w-[120px]">
                      <p class="readonly-label">Servicio Efectivo</p>
                      <p class="readonly-value">{{ formatMoney(Number((getResumenRow(item.comanda_id) && getResumenRow(item.comanda_id).Servicio_Efectivo) || 0)) }}</p>
                    </div>

                    <div class="readonly-box flex-1 min-w-[120px]">
                      <p class="readonly-label">Venta Transferencia</p>
                      <p class="readonly-value">{{ formatMoney(Number((getResumenRow(item.comanda_id) && getResumenRow(item.comanda_id).Venta_Transferencia) || 0)) }}</p>
                    </div>

                    <div class="readonly-box flex-1 min-w-[120px]">
                      <p class="readonly-label">Servicio Transferencia</p>
                      <p class="readonly-value">{{ formatMoney(Number((getResumenRow(item.comanda_id) && getResumenRow(item.comanda_id).Servicio_Transferencia) || 0)) }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="border-t border-slate-200 pt-5">
                <h4 class="text-[10px] uppercase font-black text-slate-600 mb-4 flex items-center gap-2">
                  <i class="fas fa-list-check text-teal-600"></i>
                  <span>Detalle de Venta y Desglose de Pago</span>
                </h4>

                <div class="overflow-x-auto pb-1">
                  <table class="w-full text-left">
                    <thead>
                      <tr>
                        <th class="text-[8px] uppercase font-black text-slate-500 border-b border-slate-200 pb-2">Producto
                        </th>
                        <th class="text-[8px] uppercase font-black text-slate-500 border-b border-slate-200 pb-2">Cantidad
                        </th>
                        <th class="text-[8px] uppercase font-black text-slate-500 border-b border-slate-200 pb-2">Precio
                          Unitario</th>
                        <th class="text-[8px] uppercase font-black text-slate-500 border-b border-slate-200 pb-2">Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(detalle, idx) in item.productos" :key="idx" class="border-b border-slate-100">
                        <td class="py-3 pr-4 whitespace-nowrap">
                          <p class="text-sm font-medium text-slate-800 break-words">{{ detalle.producto_nombre }}</p>
                        </td>
                        <td class="py-3 pr-4 whitespace-nowrap">
                          <p class="text-sm text-slate-700">{{ detalle.cantidad }}</p>
                        </td>
                        <td class="py-3 pr-4 whitespace-nowrap">
                          <p class="text-sm text-slate-700">{{ formatMoney(detalle.precio_unitario) }}</p>
                        </td>
                        <td class="py-3 pr-4 whitespace-nowrap">
                          <p class="text-sm font-bold text-teal-700">{{ formatMoney(detalle.valor_subtotal) }}</p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>


              </div>

              <div v-if="item.notas" class="mt-4 pt-4 border-t border-slate-200">
                <p class="text-[8px] uppercase font-black text-slate-600 mb-2">Notas</p>
                <p class="text-sm text-slate-700 bg-slate-100 p-3 rounded-xl break-words">{{ item.notas }}</p>
              </div>
            </div>
          </div>
        </transition>
      </article>
    </div>
  </div>
</template>

<script>
import { onMounted, onUnmounted, ref } from 'vue';
import { ingresoCajaService } from '../services/ingresoCajaService.js';
import { BACKEND_ORIGIN } from '../config/api.js';
import { getXLSX } from '../utils/lazyVendors.js';
import { buildTicketHtml, formatNumeroControl } from '../utils/ticketTemplates.js';
import { businessInfo } from '../config/businessInfo.js';

const todayDate = () => new Date().toISOString().slice(0, 10);

const getDefaultFechaFinal = () => new Date().toISOString().slice(0, 10);

const getDefaultFechaInicio = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 2);
  return d.toISOString().slice(0, 10);
};

const UPLOADS_BASE = String(BACKEND_ORIGIN || '').replace(/\/$/, '');
const COMPANY_LOGO_URL = '/img/logo.png';

export default {
  name: 'InformeCaja',
  setup() {
    let logoDataUrl = null;
    const loading = ref(true);
    const ingresos = ref([]);
    const expandedIds = ref([]);
    const resumen = ref({
      total_ingresos: 0,
      total_venta: 0,
      total_impuestos: 0,
      total_servicio: 0,
      total_pagado: 0,
      total_efectivo: 0,
      total_digital: 0
    });

    const resumenRows = ref([]);

    const filters = ref({
      fechaInicio: getDefaultFechaInicio(),
      fechaFinal: getDefaultFechaFinal()
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

    const formatFecha = (value) => {
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

    const formatFechaSQL = (value) => {
      if (!value) return '---';
      const date = new Date(String(value).replace(' ', 'T'));
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleDateString('es-CO');
    };

    const formatFechaEmision = () => new Date().toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const getEstadoClass = (estado) => {
      if (estado === 'Generada') {
        return 'bg-green-100 text-green-700 border border-green-300';
      } else if (estado === 'Anulada') {
        return 'bg-rose-100 text-rose-700 border border-rose-300';
      }
      return 'bg-slate-100 text-slate-700 border border-slate-300';
    };

    const hideImage = (event) => {
      event.target.style.display = 'none';
    };

    const getFallbackAvatar = (name = 'Usuario') => (
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f1f5f9&color=64748b`
    );

    const getPersonalImageUrl = (filename, name = 'Usuario') => {
      if (!filename) return getFallbackAvatar(name);
      if (/^https?:\/\//i.test(filename)) return filename;
      if (filename.startsWith('/uploads/')) return `${UPLOADS_BASE}${filename}`;
      return `${UPLOADS_BASE}/uploads/personal/${filename}`;
    };

    const handlePersonalImageError = (event, name = 'Usuario') => {
      event.target.src = getFallbackAvatar(name);
    };

    const toggleAcordeon = (id) => {
      const idx = expandedIds.value.indexOf(id);
      if (idx > -1) {
        expandedIds.value.splice(idx, 1);
      } else {
        expandedIds.value.push(id);
      }
    };

    const consultar = async () => {
      loading.value = true;
      try {
        const data = await ingresoCajaService.getIngresos(filters.value);
        ingresos.value = Array.isArray(data) ? data : [];
        console.log("ingresos");
        console.log(ingresos.value);
        console.log("i-----------");
        const resumenResult = await ingresoCajaService.getResumen(filters.value);
        // resumenResult: { resumen: {...}, rows: [...] }
        if (resumenResult && resumenResult.resumen) {
          const r = resumenResult.resumen;
          resumen.value = {
            // preserve old keys used by template
            total_ingresos: r.numero_ventas || 0,
            total_venta: r.total_venta || 0,
            total_impuestos: r.total_impuestos || 0,
            total_servicio: r.total_servicio || 0,
            total_pagado: r.total_pagado || 0,
            total_efectivo: r.total_efectivo || 0,
            total_digital: r.total_digital || 0
          };
          resumenRows.value = Array.isArray(resumenResult.rows) ? resumenResult.rows : [];
        } else {
          resumen.value = {
            total_ingresos: 0,
            total_venta: 0,
            total_impuestos: 0,
            total_servicio: 0,
            total_pagado: 0,
            total_efectivo: 0,
            total_digital: 0
          };
          resumenRows.value = [];
        }

        expandedIds.value = [];
      } catch (error) {
        console.error(error);
        ingresos.value = [];
        resumen.value = {
          total_ingresos: 0,
          total_venta: 0,
          total_impuestos: 0,
          total_servicio: 0,
          total_pagado: 0,
          total_efectivo: 0,
          total_digital: 0
        };
        alert(error.message || 'Error al consultar ingresos');
      } finally {
        loading.value = false;
      }
    };

    const getResumenRow = (comandaId) => {
      if (!comandaId) return null;
      const id = String(comandaId);
      return resumenRows.value.find(r => String(r.Comanda) === id) || null;
    };

    const resetFechas = () => {
      filters.value.fechaInicio = getDefaultFechaInicio();
      filters.value.fechaFinal = getDefaultFechaFinal();
      consultar();
    };

    const exportarExcel = async () => {
      try {
        const desglosado = await ingresoCajaService.getIngresosDesglosados(filters.value);
        if (!Array.isArray(desglosado) || desglosado.length === 0) {
          alert('No hay datos para exportar en el rango seleccionado.');
          return;
        }

        const formatDateDDMMYYYY = (value) => {
          if (!value) return '';
          const s = String(value).trim();
          // Prefer simple YYYY-MM-DD parsing to avoid timezone issues
          const ymd = s.slice(0, 10).split('-');
          if (ymd.length === 3 && ymd[0].length === 4) {
            return `${ymd[2].padStart(2, '0')}/${ymd[1].padStart(2, '0')}/${ymd[0]}`;
          }
          // Fallback to Date parsing
          const d = new Date(s.replace(' ', 'T'));
          if (Number.isNaN(d.getTime())) return s;
          return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        };

        const toInt = (v) => Math.round(Number(v || 0));

        const rows = desglosado.map((item) => ({
          Fecha: formatDateDDMMYYYY(item.Fecha),
          Comanda: item.Comanda || '',
          'Núm. Control': formatNumeroControl(item.Factura || ''),
          'Método Pago': item.Metodo_Pago || '',
          'Total Pagado': toInt(item.Total_Pagado),
          'Venta Efectivo': toInt(item.Venta_Efectivo),
          'Servicio Efectivo': toInt(item.Servicio_Efectivo),
          'Venta Transferencia': toInt(item.Venta_Transferencia),
          'Servicio Transferencia': toInt(item.Servicio_Transferencia)
        }));

        const XLSX = await getXLSX();
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Informe Ventas Desglosado');

        const filename = `informe-caja-desglosado-${filters.value.fechaInicio || 'sin-fecha'}-${filters.value.fechaFinal || 'sin-fecha'}.xlsx`;
        XLSX.writeFile(workbook, filename);
      } catch (error) {
        console.error('Error exportando Excel desglosado:', error);
        alert(error.message || 'Error al exportar el informe desglosado.');
      }
    };

    const loadLogoDataUrl = async () => {
      if (logoDataUrl) return logoDataUrl;
      try {
        const response = await fetch(COMPANY_LOGO_URL, { mode: 'cors' });
        if (!response.ok) return null;
        const blob = await response.blob();
        logoDataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        return logoDataUrl;
      } catch {
        return null;
      }
    };

    // exportarPDF removed

    const imprimirFactura = async (item) => {
      const popup = window.open('', '_blank', 'width=420,height=720');
      if (!popup) {
        alert('Por favor habilite ventanas emergentes para imprimir.');
        return;
      }

      const logoSrc = (await loadLogoDataUrl()) || COMPANY_LOGO_URL;
      const efectivoRecibido = Number(item.monto_efectivo) || 0;
      const transferenciaRecibida = Number(item.monto_digital) || 0;
      const totalRecibido = Math.round(efectivoRecibido + transferenciaRecibida);
      const ticket = {
        numero_factura: item.numero_factura,
        fecha_venta: item.fecha_venta,
        comanda_id: item.comanda_id,
        id_mesa: item.id_mesa,
        mesa_nombre: item.mesa_nombre,
        mesero_nombre: item.mesero_nombre || 'Sin asignar',
        detalles: item.productos || [],
        total_venta: item.total_venta,
        aporte_servicio: item.aporte_servicio,
        total_pagado: item.total_pagado,
        metodo_pago: item.metodo_pago,
        monto_efectivo: efectivoRecibido,
        monto_digital: transferenciaRecibida,
        total_recibido: totalRecibido,
        notas: item.notas
      };

      popup.document.open();
      popup.document.write(buildTicketHtml(ticket, businessInfo, logoSrc, { hideDevuelta: true }));
      popup.document.close();
    };

    const imprimirReporte = async () => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Por favor, permite las ventanas emergentes para imprimir');
        return;
      }

      try {
        const desglosado = await ingresoCajaService.getIngresosDesglosados(filters.value);

        // Build table rows with subtotals per date and a grand total
        // Normalize and sort by date to ensure grouping
        desglosado.sort((a, b) => {
          const da = new Date(String(a.Fecha).replace(' ', 'T'));
          const db = new Date(String(b.Fecha).replace(' ', 'T'));
          if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return 0;
          return da - db;
        });

        let rowsHtml = '';
        let currentKey = null;
        let currentDisplay = '';
        const subtotal = { Total_Pagado: 0, Venta_Efectivo: 0, Servicio_Efectivo: 0, Venta_Transferencia: 0, Servicio_Transferencia: 0 };
        const grandTotals = { Total_Pagado: 0, Venta_Efectivo: 0, Servicio_Efectivo: 0, Venta_Transferencia: 0, Servicio_Transferencia: 0 };

        const pushSubtotal = (display) => {
          rowsHtml += `
            <tr class="subtotal-row">
              <td colspan="4" style="text-align:right;font-weight:800">Subtotal ${display}:</td>
              <td class="text-right num-entero">${formatMoney(subtotal.Total_Pagado)}</td>
              <td class="text-right num-entero">${formatMoney(subtotal.Venta_Efectivo)}</td>
              <td class="text-right num-entero">${formatMoney(subtotal.Servicio_Efectivo)}</td>
              <td class="text-right num-entero">${formatMoney(subtotal.Venta_Transferencia)}</td>
              <td class="text-right num-entero">${formatMoney(subtotal.Servicio_Transferencia)}</td>
            </tr>
          `;

          // add to grand totals
          grandTotals.Total_Pagado += subtotal.Total_Pagado;
          grandTotals.Venta_Efectivo += subtotal.Venta_Efectivo;
          grandTotals.Servicio_Efectivo += subtotal.Servicio_Efectivo;
          grandTotals.Venta_Transferencia += subtotal.Venta_Transferencia;
          grandTotals.Servicio_Transferencia += subtotal.Servicio_Transferencia;

          // reset subtotal values
          subtotal.Total_Pagado = 0;
          subtotal.Venta_Efectivo = 0;
          subtotal.Servicio_Efectivo = 0;
          subtotal.Venta_Transferencia = 0;
          subtotal.Servicio_Transferencia = 0;
        };

        for (const item of desglosado) {
          const d = new Date(String(item.Fecha).replace(' ', 'T'));
          const key = Number.isNaN(d.getTime()) ? String(item.Fecha || '').slice(0, 10) : d.toISOString().slice(0, 10);
          const displayDate = Number.isNaN(d.getTime()) ? (item.Fecha || '') : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

          if (currentKey && key !== currentKey) {
            // end of a date group -> push subtotal row
            pushSubtotal(currentDisplay);
          }

          // add the item row
          rowsHtml += `
            <tr>
              <td>${displayDate || ''}</td>
              <td class="text-center">${item.Comanda || ''}</td>
              <td class="text-center">${formatNumeroControl(item.Factura) || '---'}</td>
              <td>${item.Metodo_Pago || ''}</td>
              <td class="text-right num-entero">${formatMoney(item.Total_Pagado || 0)}</td>
              <td class="text-right num-entero">${formatMoney(item.Venta_Efectivo || 0)}</td>
              <td class="text-right num-entero">${formatMoney(item.Servicio_Efectivo || 0)}</td>
              <td class="text-right num-entero">${formatMoney(item.Venta_Transferencia || 0)}</td>
              <td class="text-right num-entero">${formatMoney(item.Servicio_Transferencia || 0)}</td>
            </tr>
          `;

          // accumulate subtotals
          subtotal.Total_Pagado += Number(item.Total_Pagado || 0);
          subtotal.Venta_Efectivo += Number(item.Venta_Efectivo || 0);
          subtotal.Servicio_Efectivo += Number(item.Servicio_Efectivo || 0);
          subtotal.Venta_Transferencia += Number(item.Venta_Transferencia || 0);
          subtotal.Servicio_Transferencia += Number(item.Servicio_Transferencia || 0);

          currentKey = key;
          currentDisplay = displayDate;
        }

        // push subtotal for last group
        if (currentKey) pushSubtotal(currentDisplay);

        // push grand total row
        rowsHtml += `
          <tr class="grand-total-row">
            <td colspan="4" style="text-align:right;font-weight:900">TOTAL GENERAL:</td>
            <td class="text-right num-entero">${formatMoney(grandTotals.Total_Pagado)}</td>
            <td class="text-right num-entero">${formatMoney(grandTotals.Venta_Efectivo)}</td>
            <td class="text-right num-entero">${formatMoney(grandTotals.Servicio_Efectivo)}</td>
            <td class="text-right num-entero">${formatMoney(grandTotals.Venta_Transferencia)}</td>
            <td class="text-right num-entero">${formatMoney(grandTotals.Servicio_Transferencia)}</td>
          </tr>
        `;

        const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Informe de Ventas</title>
            <style>
              @page { margin: 12mm; }
              body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #333; width: 100%; max-width: 7.7in; box-sizing: border-box; }
              h1 { color: #115e59; text-align: center; font-size: 24px; margin-bottom: 5px; }
              .report-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
              .report-head-title { flex: 1; text-align: center; color: #115e59; font-size: 20px; font-weight: 800; letter-spacing: 0.02em; text-transform: uppercase; }
              .report-head-date { min-width: 180px; text-align: right; font-size: 12px; color: #64748b; font-weight: 700; }
              .logo-wrap { min-width: 150px; }
              .logo-wrap img { max-width: 150px; max-height: 42px; object-fit: contain; }
              .header-info { text-align: center; color: #666; margin-bottom: 20px; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px }
              th { background-color: #115e59; color: white; padding: 8px; text-align: left; }
              td { border: 1px solid #ddd; padding: 6px; }
              tr:nth-child(even) { background-color: #f9fafb; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .subtotal-row td { background-color: #f1f5f9; font-weight: 800; }
              .grand-total-row td { background-color: #e6fffa; font-weight: 900; }
            </style>
          </head>
          <body>
            <div class="report-head">
              <div class="logo-wrap"><img src="${COMPANY_LOGO_URL}" alt="Logo Patio Bohemio"></div>
              <div class="report-head-title">Informe de Ventas</div>
              <div class="report-head-date">Fecha: ${formatFechaEmision()}</div>
            </div>
            <div class="header-info">
              <p><strong>Histórico de Ventas Registradas</strong></p>
              <p>Período: ${filters.value.fechaInicio} al ${filters.value.fechaFinal}</p>
              <p>Total de ventas: ${desglosado.length}</p>
            </div>

            <h2 style="color:#115e59;font-size:14px">DETALLE DESGLOSADO</h2>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Comanda</th>
                  <th>Núm. Control</th>
                  <th>Método</th>
                  <th class="text-right">Total Pagado</th>
                  <th class="text-right">Venta Efectivo</th>
                  <th class="text-right">Servicio Efectivo</th>
                  <th class="text-right">Venta Transferencia</th>
                  <th class="text-right">Servicio Transferencia</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </body>
        </html>
      `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        window.setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      } catch (error) {
        console.error('Error imprimiendo informe desglosado:', error);
        alert(error.message || 'Error al imprimir el informe desglosado.');
      }
    };

    // WebSocket listener para actualizaciones
    const handleComandaCerrada = () => {
      consultar();
    };

    onMounted(async () => {
      await consultar();

      // Escuchar eventos WebSocket
      if (window.socket) {
        window.socket.on('editar-comanda', handleComandaCerrada);
      }
    });

    onUnmounted(() => {
      // Limpiar listeners
      if (window.socket) {
        window.socket.off('editar-comanda', handleComandaCerrada);
      }
    });

    return {
      loading,
      ingresos,
      filters,
      expandedIds,
      resumen,
      resumenRows,
      getResumenRow,
      formatMoney,
      formatFecha,
      formatFechaSQL,
      getEstadoClass,
      hideImage,
      getPersonalImageUrl,
      handlePersonalImageError,
      toggleAcordeon,
      consultar,
      resetFechas,
      exportarExcel,
      imprimirReporte,
      imprimirFactura,
      formatNumeroControl
    };
  }
};
</script>

<style scoped>
.readonly-box {
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 0.75rem;
  background-color: #f8fafc;
}

.readonly-label {
  font-size: 0.625rem;
  font-weight: 900;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.readonly-value {
  font-size: 0.875rem;
  font-weight: bold;
  color: #1e293b;
}

.accordion-enter-active,
.accordion-leave-active {
  transition: all 0.3s ease;
}

.accordion-enter-from {
  opacity: 0;
  max-height: 0;
}

.accordion-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>

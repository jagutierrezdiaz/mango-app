<template>
  <div class="informe-caja-view admin-crud-shell min-h-screen w-full max-w-7xl overflow-x-hidden p-4 md:p-6 mx-auto">
    <div class="mb-8 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5 border-b border-slate-200 pb-6">
      <div>
        <h1 class="admin-crud-title text-3xl font-black text-teal-700 italic uppercase tracking-tighter">Arqueo de Caja
        </h1>
        <p class="admin-crud-subtitle text-[10px] uppercase tracking-widest font-black">Patio Bohemio / Control Diario
          de Arqueos</p>
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
            <button @click="resetFechas" :disabled="loading" class="w-full px-4 py-3 text-[11px] pb-btn-month-current">
              <i class="fas fa-calendar-alt"></i>
              <span>Mes Actual</span>
            </button>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 items-end">
          <button @click="openCreateModal"
            class="flex-1 lg:flex-none pb-btn pb-btn-new pb-btn-unified px-5 py-3 text-[11px] whitespace-nowrap">
            <i class="fas fa-plus"></i>
            <span>Nuevo Arqueo</span>
          </button>
          <button @click="exportarSExcel" :disabled="loading || arqueos.length === 0"
            class="flex-1 lg:flex-none pb-btn pb-btn-export pb-btn-unified px-5 py-3 text-[11px] whitespace-nowrap">
            <i class="fas fa-file-excel"></i>
            <span>Exportar</span>
          </button>
          <button @click="imprimirReporte" :disabled="loading || arqueos.length === 0"
            class="flex-1 lg:flex-none pb-btn pb-btn-print pb-btn-unified px-5 py-3 text-[11px] whitespace-nowrap">
            <i class="fas fa-print"></i>
            <span>Imprimir</span>
          </button>
        </div>
      </div>
    </div>

    <div class="mb-5 grid grid-cols-1 md:grid-cols-3 gap-3">
      <div class="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">Registros</p>
        <p class="text-2xl font-black text-slate-800 mt-2">{{ arqueos.length }}</p>
      </div>
      <div class="rounded-[1.4rem] border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">Total Ventas Efectivo</p>
        <p class="text-xl font-black text-emerald-700 mt-2">{{ formatMoney(summary.totalEfectivo) }}</p>
      </div>
      <div class="rounded-[1.4rem] border border-blue-200 bg-blue-50 p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">Total Ventas Digital</p>
        <p class="text-xl font-black text-blue-700 mt-2">{{ formatMoney(summary.totalDigital) }}</p>
      </div>
    </div>

    <div v-if="loading"
      class="flex items-center justify-center p-24 bg-white/70 rounded-[2rem] border border-slate-200 shadow-inner">
      <p class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Cargando arqueos...</p>
    </div>

    <div v-else-if="arqueos.length === 0"
      class="flex items-center justify-center p-24 bg-white/70 rounded-[2rem] border border-dashed border-slate-200 shadow-inner">
      <div class="text-center">
        <i class="fas fa-vault text-4xl text-slate-300 mb-4 block"></i>
        <p class="text-slate-400 font-bold text-lg">No hay arqueos para la fecha seleccionada</p>
      </div>
    </div>

    <div v-else class="space-y-4">
      <article v-for="item in arqueos" :key="item.id"
        class="overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
        <div @click="toggleAcordeon(item.id)"
          class="cursor-pointer flex flex-col xl:flex-row xl:items-center gap-4 p-5 hover:bg-slate-50/50 transition-colors">
          <div class="flex items-center gap-3 xl:w-[300px]">
            <div v-if="item.personal_url_foto"
              class="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              <img :src="item.personal_url_foto" :alt="item.personal_nombre" class="w-full h-full object-cover"
                @error="onPhotoError">
            </div>
            <div v-else
              class="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-100 to-teal-100 flex items-center justify-center border border-cyan-200 text-teal-600">
              <i class="fas fa-user"></i>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-[8px] uppercase font-black text-slate-500 tracking-wider">Personal</p>
              <p class="text-sm font-black text-slate-800 truncate">{{ item.personal_nombre || '---' }}</p>
            </div>
          </div>

          <div class="flex items-center justify-end">
            <button @click.stop="toggleAcordeon(item.id)" :class="expandedIds.includes(item.id) ? 'rotate-180' : ''"
              class="text-slate-500 hover:text-teal-600 transition-all">
              <i class="fas fa-chevron-down"></i>
            </button>
          </div>

          <div class="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-w-0">
            <!-- Grupo Izquierdo: Fecha Arqueo y Estado alineados horizontalmente -->
            <div class="flex flex-row items-center gap-6 sm:gap-12 shrink-0">
              
              <!-- Fecha Arqueo (Extremo izquierdo) -->
              <div class="text-left shrink-0">
                <p class="text-[8px] uppercase font-black text-slate-500 tracking-wider">Fecha Arqueo</p>
                <p class="text-sm font-bold text-slate-700 mt-1">{{ formatDateTime(item.fecha_arqueo) }}</p>
              </div>

              <!-- Estado (Alineado a la derecha de Fecha Arqueo) -->
              <div class="text-left shrink-0">
                <p class="text-[8px] uppercase font-black text-slate-500 tracking-wider">Estado</p>
                <div class="mt-1">
                  <span
                    :class="item.estado === 'Cerrado' ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-700'"
                    class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block">
                    {{ item.estado }}
                  </span>
                </div>
              </div>

            </div>

            <!-- Grupo Derecho: Botón Imprimir (Empujado al extremo derecho de la tarjeta) -->
            <div class="sm:ml-auto shrink-0 self-start sm:self-center">
              <button @click="imprimirReporteIndividual(item.id)"
                class="pb-btn pb-btn-print pb-btn-unified px-5 py-3 text-[11px] whitespace-nowrap">
                <i class="fas fa-print"></i>
                <span>Imprimir</span>
              </button>
            </div>
          </div>

          
        </div>

        <transition name="accordion">
          <div v-show="expandedIds.includes(item.id)" class="bg-slate-50/60 border-t border-slate-200">
            <div class="p-5 space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 grid-rows-4 auto-rows-fr gap-3 info-arqueo">
                <div class="readonly-box col-base">
                  <p class="readonly-label">Base Inicial</p>
                  <p class="readonly-value">{{ formatMoney(item.base_inicial) }}</p>
                </div>
                <div class="readonly-box col-vte">
                  <p class="readonly-label">Total Efectivo</p>
                  <p class="readonly-value">{{ formatMoney(Number(item.efectivo_recibido) +
                    Number(item.aporte_efectivo)) }}</p>
                </div>
                <div class="readonly-box col-vtt">
                  <p class="readonly-label">Total Transferencias</p>
                  <p class="readonly-value">{{ formatMoney(Number(item.digital_recibido) + Number(item.aporte_digital))
                    }}</p>
                </div>
                <div class="readonly-box col-gr">
                  <p class="readonly-label">Gastos Registrados en la Fecha</p>
                  <p class="readonly-value">{{ formatMoney(item.egresos_registrados) }}</p>
                </div>
                <div class="readonly-box col-ve">
                  <p class="readonly-label">Ventas Efectivo</p>
                  <p class="readonly-value">{{ formatMoney(item.efectivo_recibido) }}</p>
                </div>
                <div class="readonly-box col-vt">
                  <p class="readonly-label">Ventas Transferencia</p>
                  <p class="readonly-value">{{ formatMoney(item.digital_recibido) }}</p>
                </div>
                <div class="readonly-box col-ee">
                  <p class="readonly-label">Total Esperado = Efectivo + Transferencia</p>
                  <p class="readonly-value">{{ formatMoney(item.efectivo_esperado) }}</p>
                </div>
                <div class="readonly-box col-pe">
                  <p class="readonly-label">Propinas Efectivo</p>
                  <p class="readonly-value">{{ formatMoney(item.aporte_efectivo) }}</p>
                </div>
                <div class="readonly-box col-pt">
                  <p class="readonly-label">Propinas Transferencia</p>
                  <p class="readonly-value">{{ formatMoney(item.aporte_digital) }}</p>
                </div>
                <div class="readonly-box col-er">
                  <p class="readonly-label">Total Real = Efectivo + Transferencia</p>
                  <p class="readonly-value">{{ formatMoney(item.efectivo_real) }}</p>
                </div>
                <div class="readonly-box col-obs">
                  <p class="readonly-label">Observaciones</p>
                  <p class="text-sm text-slate-700 mt-2">{{ item.observaciones || 'Sin observaciones' }}</p>
                </div>
                <div class="readonly-box col-dif">
                  <p class="readonly-label">Diferencia</p>
                  <p class="readonly-value">{{ formatMoney(item.diferencia) }}</p>
                </div>
              </div>


              <div class="flex justify-end">
                <button v-if="item.estado === 'Abierto'" @click="cerrarArqueo(item)"
                  class="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-wider text-[11px]">
                  <i class="fas fa-lock mr-2"></i>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </transition>
      </article>
    </div>

    <CrearArqueo v-if="showCreateModal" :open="showCreateModal" :fecha="modalFecha" :persona-id="authStore.user?.id"
      @close="showCreateModal = false" @created="handleCreated" />
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue';
import CrearArqueo from './CrearArqueo.vue';
import { arqueoCajaService } from '../services/arqueoCajaService.js';
import { useAuthStore } from '../stores/index.js';
import { getPdfTools, getXLSX } from '../utils/lazyVendors.js';

const COMPANY_LOGO_URL = '/img/logo.png';

const getDefaultFechaFinal = () => new Date().toISOString().slice(0, 10);

const getDefaultFechaInicio = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 2);
  return d.toISOString().slice(0, 10);
};

const parseNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default {
  name: 'ArqueosCaja',
  components: {
    CrearArqueo
  },
  setup() {
    const authStore = useAuthStore();
    const loading = ref(false);
    const showCreateModal = ref(false);
    const arqueos = ref([]);
    const expandedIds = ref([]);

    const filters = ref({
      fechaInicio: getDefaultFechaInicio(),
      fechaFinal: getDefaultFechaFinal()
    });

    const modalFecha = computed(() => (
      filters.value.fechaFinal
      || filters.value.fechaInicio
      || getDefaultFechaFinal()
    ));

    const summary = computed(() => {
      return arqueos.value.reduce((acc, item) => {
        acc.totalEfectivo += parseNumber(item.total_ventas_efectivo);
        acc.totalDigital += parseNumber(item.total_ventas_digital);
        return acc;
      }, {
        totalEfectivo: 0,
        totalDigital: 0
      });
    });

    const formatMoney = (value) => Math.round(parseNumber(value)).toLocaleString('es-CO', {
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

    const consultar = async () => {
      console.log('Iniciando carga de arqueos...');
      loading.value = true;
      try {
        arqueos.value = await arqueoCajaService.getArqueosByFecha(filters.value);
        expandedIds.value = [];
      } catch (error) {
        console.error('Error al consultar arqueos:', error);
        arqueos.value = [];
      } finally {
        loading.value = false;
      }
    };

    const resetFechas = () => {
      filters.value.fechaInicio = getDefaultFechaInicio();
      filters.value.fechaFinal = getDefaultFechaFinal();
      consultar();
    };

    const toggleAcordeon = (id) => {
      const idx = expandedIds.value.indexOf(id);
      if (idx > -1) {
        expandedIds.value.splice(idx, 1);
      } else {
        expandedIds.value.push(id);
      }
    };

    const openCreateModal = () => {
      if (!filters.value.fechaInicio && !filters.value.fechaFinal) {
        resetFechas();
      }
      showCreateModal.value = true;
    };

    const handleCreated = async () => {
      showCreateModal.value = false;
      await consultar();
    };

    const cerrarArqueo = async (item) => {
      const confirmed = window.confirm(`¿Desea cerrar el arqueo #${item.id}?`);
      if (!confirmed) return;
      try {
        await arqueoCajaService.cerrarArqueo(item.id);
        await consultar();
      } catch (error) {
        alert(error.message || 'No se pudo cerrar el arqueo');
      }
    };

    const onPhotoError = (event) => {
      event.target.src = 'https://ui-avatars.com/api/?name=Usuario&background=f1f5f9&color=64748b';
    };

    const exportarExcel = async () => {
      const rows = arqueos.value.map((item) => ({
        'Personal': item.personal_nombre || '---',
        'Fecha Arqueo': formatDateTime(item.fecha_arqueo),
        'Comandas Aprobadas': item.comandas_aprobadas,
        'Comandas Anuladas': item.comandas_anuladas,
        'Base Inicial': formatMoney(item.base_inicial),
        'Ventas Efectivo': formatMoney(item.total_ventas_efectivo),
        'Ventas Digital': formatMoney(item.total_ventas_digital),
        'Total Retiros': formatMoney(item.total_retiros),
        'Total Egresos': formatMoney(item.total_egresos),
        'Base Final': formatMoney(item.base_final),
        'Estado': item.estado,
        'Observaciones': item.observaciones || ''
      }));

      const XLSX = await getXLSX();
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Arqueos Caja');
      const filename = `arqueos-caja-${filters.value.fechaInicio || 'sin-fecha'}-${filters.value.fechaFinal || 'sin-fecha'}.xlsx`;
      XLSX.writeFile(workbook, filename);
    };


    const imprimirReporteIndividual = async (id) => {
      const item = arqueos.value.find(a => Number(a.id) === Number(id));
      if (!item) {
        alert('Arqueo no encontrado');
        return;
      }

      let jsPDF;
      try {
        const pdfTools = await getPdfTools();
        jsPDF = pdfTools.jsPDF;
      } catch (err) {
        alert('No fue posible cargar dependencias de PDF.');
        return;
      }

      const width = 48; // mm (ancho fijo requerido)
      const height = 300; // suficiente para contenido; el lector ajustará el zoom
      const margin = 0.5;

      const doc = new jsPDF({ unit: 'mm', format: [width, height] });
      let y = margin;
      y += 3;

      // Intentar cargar y dibujar el logo en la parte superior (si existe)
      const loadImage = (src) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      });

      try {
        const logoImg = await loadImage(COMPANY_LOGO_URL);
        if (logoImg) {
          const imgWidth = 30; // mm
          const imgHeight = (logoImg.height / logoImg.width) * imgWidth;
          const imgX = (width - imgWidth) / 2;
          // addImage acepta un HTMLImageElement
          doc.addImage(logoImg, 'PNG', imgX, y, imgWidth, imgHeight);
          y += imgHeight + 2;
        }
      } catch (e) {
        // Si falla la carga del logo, continuar sin él
      }


      /* doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.text('PATIO BOHEMIO', width / 2, y, { align: 'center' });
      y += 6; */
      y += 4;
      doc.setFontSize(7.5);
      doc.text('REPORTE DE ARQUEO', width / 2, y, { align: 'center' });
      y += 4;

      doc.setLineWidth(0.4);
      doc.setLineDash([2, 1], 0); // [dashLength, gapLength]
      doc.line(margin, y, width - margin, y);
      doc.setLineDash([], 0); // restaurar a sólido
      y += 4;

      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(`Arqueo ID: ${item.id}`, margin, y);
      doc.text(`Estado: ${item.estado || '---'}`, width - margin, y, { align: 'right' });
      y += 5;

      doc.text(`Cajero: ${item.personal_nombre || '---'}`, margin, y);
      y += 5;

      doc.text(`Fecha Arqueo: ${formatDateTime(item.fecha_arqueo)}`, margin, y);
      y += 4;

      doc.setLineWidth(0.4);
      doc.setLineDash([2, 1], 0); // [dashLength, gapLength]
      doc.line(margin, y, width - margin, y);
      doc.setLineDash([], 0); // restaurar a sólido
      y += 4;

      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.text('CONSOLIDADO DE MOVIMIENTOS', width / 2, y, { align: 'center' });
      doc.setFont(undefined, 'normal');
      y += 6;

      const line = (label, value, opts = {}) => {
        doc.text(label, margin + (opts.indent || 0), y);
        doc.text(value, width - margin, y, { align: 'right' });
        y += 5;
      };

      line('(+) Base Inicial:', formatMoney(item.base_inicial));
      line('(+) Total Efectivo :', formatMoney(item.efectivo_recibido));
      line('  (+) Ventas', formatMoney(item.efectivo_recibido), { indent: 1 });
      line('  (+) Propinas', formatMoney(item.aporte_efectivo), { indent: 1 });
      line('(+) Total Transf.:', formatMoney(item.digital_recibido));
      line('  (+) Ventas', formatMoney(item.digital_recibido), { indent: 1 });
      line('  (+) Propinas', formatMoney(item.aporte_digital), { indent: 1 });
      line('(-) Gastos del Turno:', formatMoney(item.egresos_registrados));

      doc.setLineWidth(0.4);
      doc.setLineDash([2, 1], 0); // [dashLength, gapLength]
      doc.line(margin, y, width - margin, y);
      doc.setLineDash([], 0); // restaurar a sólido
      y += 4;

      doc.setFont(undefined, 'bold');
      doc.text('VERIFICACION FISICA', width / 2, y, { align: 'center' });
      doc.setFont(undefined, 'normal');
      y += 4;

      line('Efectivo Esperado:', formatMoney(item.efectivo_esperado));
      line('Efectivo real:', formatMoney(item.efectivo_real));

      doc.setLineWidth(0.4);
      doc.setLineDash([2, 1], 0); // [dashLength, gapLength]
      doc.line(margin, y, width - margin, y);
      doc.setLineDash([], 0); // restaurar a sólido
      y += 4;

      doc.setFontSize(7);
      line('DIFERENCIA (FALTANTE):', formatMoney(item.diferencia));
      const hubo = Math.abs(Number(item.diferencia || 0)) > 0.009 ? 'SI' : 'NO';
      line('HUBO DESCUADRE:', hubo);


      doc.setLineWidth(0.4);
      doc.setLineDash([2, 1], 0); // [dashLength, gapLength]
      doc.line(margin, y, width - margin, y);
      doc.setLineDash([], 0); // restaurar a sólido
      y += 4;

      y += 5;
      doc.text('Firma Cajero: ____________________', margin, y);
      y += 5;
      doc.text('Firma Admin:  ____________________', margin, y);
      y += 5;

      doc.setFontSize(8);
      y += 3;
      doc.text('GRACIAS POR SU GESTION', width / 2, y, { align: 'center' });

      doc.save(`arqueo-${item.id}.pdf`);
    };

    const imprimirReporte = () => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Por favor habilite ventanas emergentes para imprimir.');
        return;
      }

      const tableRows = arqueos.value.map((item) => {
        const totalEfectivo = parseNumber(item.efectivo_recibido) + parseNumber(item.aporte_efectivo);
        const totalTransferencias = parseNumber(item.digital_recibido) + parseNumber(item.aporte_digital);

        return `
        <tr>
          <td>${item.personal_nombre || '---'}</td>
          <td>${formatDateTime(item.fecha_arqueo)}</td>
          <td class="text-right">${formatMoney(item.base_inicial)}</td>
          <td class="text-right">${formatMoney(totalEfectivo)}</td>
          <td class="text-right">${formatMoney(item.efectivo_recibido)}</td>
          <td class="text-right">${formatMoney(item.aporte_efectivo)}</td>
          <td class="text-right">${formatMoney(totalTransferencias)}</td>
          <td class="text-right">${formatMoney(item.digital_recibido)}</td>
          <td class="text-right">${formatMoney(item.aporte_digital)}</td>
          <td class="text-right">${formatMoney(item.egresos_registrados)}</td>
          <td class="text-right">${formatMoney(item.efectivo_esperado)}</td>
          <td class="text-right">${formatMoney(item.efectivo_real)}</td>
          <td>${item.observaciones || '---'}</td>
        </tr>
      `;
      }).join('');

      printWindow.document.write(`
        <!doctype html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Arqueos de Caja</title>
          <style>
            @page { size: landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; color: #334155; font-size: 10px; }
            .report-head { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 10px; }
            .report-head-title { color: #115e59; text-transform: uppercase; font-weight: 900; font-size: 18px; }
            .report-head-date { color: #64748b; font-size: 11px; font-weight: 700; }
            .logo-wrap img { max-height: 40px; max-width: 140px; object-fit: contain; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; table-layout: fixed; }
            th { background: #115e59; color: white; text-align: left; padding: 6px 4px; font-size: 9px; vertical-align: bottom; }
            td { border: 1px solid #e2e8f0; padding: 5px 4px; font-size: 9px; vertical-align: top; word-wrap: break-word; }
            tr:nth-child(even) { background: #f8fafc; }
            .text-right { text-align: right; white-space: nowrap; }
          </style>
        </head>
        <body>
          <div class="report-head">
            <div class="logo-wrap"><img src="${COMPANY_LOGO_URL}" alt="Logo"></div>
            <div class="report-head-title">Arqueos de Caja</div>
            <div class="report-head-date">Fecha: ${new Date().toLocaleString('es-CO')}</div>
          </div>

          <p><strong>Período:</strong> ${filters.value.fechaInicio} al ${filters.value.fechaFinal}</p>
          <p><strong>Total registros:</strong> ${arqueos.value.length}</p>

          <table>
            <thead>
              <tr>
                <th>Personal</th>
                <th>Fecha Arqueo</th>
                <th>Base Inicial</th>
                <th>Total Efectivo</th>
                <th>Ventas Efectivo</th>
                <th>Propinas Efectivo</th>
                <th>Total Transferencias</th>
                <th>Ventas Transferencias</th>
                <th>Propinas Transferencias</th>
                <th>Gastos</th>
                <th>Total Esperado</th>
                <th>Total Real</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    };

    onMounted(() => {
      consultar();
    });

    return {
      authStore,
      loading,
      showCreateModal,
      arqueos,
      expandedIds,
      filters,
      modalFecha,
      summary,
      formatMoney,
      formatDateTime,
      consultar,
      resetFechas,
      toggleAcordeon,
      openCreateModal,
      handleCreated,
      cerrarArqueo,
      imprimirReporteIndividual,
      onPhotoError,
      exportarExcel,
      imprimirReporte
    };
  }
};
</script>

<style scoped>
.readonly-box {
  border: 1px solid #e2e8f0;
  border-radius: 0.9rem;
  background: white;
  padding: 0.75rem 0.9rem;
}

.readonly-label {
  font-size: 10px;
  text-transform: uppercase;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: #64748b;
}

.readonly-value {
  margin-top: 0.35rem;
  font-size: 0.95rem;
  font-weight: 800;
  color: #0f172a;
}

.accordion-enter-active,
.accordion-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.accordion-enter-from,
.accordion-leave-to {
  max-height: 0;
  opacity: 0;
}

.accordion-enter-to,
.accordion-leave-from {
  max-height: 1000px;
  opacity: 1;
}

.info-arqueo {
  grid-template-areas:
    "col-base vte vtt gr"
    "col-base ve vt ee"
    "col-base pe pt er"
    "col-obs col-obs col-obs dif";
  gap: 10px;
}

.col-base {
  grid-area: col-base;
}

.col-obs {
  grid-area: col-obs;
}

.col-vte {
  grid-area: vte;
}

.col-vtt {
  grid-area: vtt;
}

.col-gr {
  grid-area: gr;
}

.col-ve {
  grid-area: ve;
}

.col-vt {
  grid-area: vt;
}

.col-pe {
  grid-area: pe;
}

.col-pt {
  grid-area: pt;
}

.col-ee {
  grid-area: ee;
}

.col-er {
  grid-area: er;
}

.col-dif {
  grid-area: dif;
}
</style>

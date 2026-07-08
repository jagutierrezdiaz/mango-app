<template>
  <div class="informe-caja-view admin-crud-shell min-h-screen w-full max-w-7xl overflow-x-hidden p-4 md:p-6 mx-auto">
    <div class="mb-8 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5 border-b border-slate-200 pb-6">
      <div>
        <h1 class="admin-crud-title text-3xl font-black text-teal-700 italic uppercase tracking-tighter">Estado de Resultados</h1>
        <p class="admin-crud-subtitle text-[10px] uppercase tracking-widest font-black">Patio Bohemio / Reporte mensual de devengo contable</p>
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
            <button @click="consultar" :disabled="loading" class="w-full pb-btn pb-btn-consult pb-btn-unified px-4 py-3 disabled:opacity-50">
              <i :class="loading ? 'fas fa-circle-notch fa-spin' : 'fas fa-chart-line'"></i>
              <span>{{ loading ? 'Generando...' : 'Generar Reporte' }}</span>
            </button>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 items-end">
          <button @click="exportarPDF" :disabled="loading || !report" class="flex-1 lg:flex-none pb-btn pb-btn-export pb-btn-unified px-5 py-3 text-[11px] whitespace-nowrap">
            <i class="fas fa-file-pdf"></i>
            <span>PDF</span>
          </button>
          <button @click="imprimirReporte" :disabled="loading || !report" class="flex-1 lg:flex-none pb-btn pb-btn-print pb-btn-unified px-5 py-3 text-[11px] whitespace-nowrap">
            <i class="fas fa-print"></i>
            <span>Imprimir</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center p-24 bg-white/70 rounded-[2rem] border border-slate-200 shadow-inner">
      <p class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Generando estado de resultados...</p>
    </div>

    <div v-else-if="!report" class="flex items-center justify-center p-24 bg-white/70 rounded-[2rem] border border-dashed border-slate-200 shadow-inner">
      <div class="text-center">
        <i class="fas fa-inbox text-4xl text-slate-300 mb-4 block"></i>
        <p class="text-slate-400 font-bold text-lg">No hay información contable para el período seleccionado</p>
      </div>
    </div>

    <template v-else>
      <div class="mb-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <div class="rounded-[1.6rem] border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p class="text-[9px] uppercase font-black admin-card-title">Ingresos (Clase 4)</p>
          <p class="text-xl font-black text-emerald-700 mt-2">{{ formatMoney(summary.ingresos) }}</p>
        </div>
        <div class="rounded-[1.6rem] border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p class="text-[9px] uppercase font-black admin-card-title">Costos de Ventas (Clase 6)</p>
          <p class="text-xl font-black text-amber-700 mt-2">{{ formatMoney(summary.costos_ventas) }}</p>
        </div>
        <div class="rounded-[1.6rem] border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
          <p class="text-[9px] uppercase font-black admin-card-title">Utilidad Bruta</p>
          <p class="text-xl font-black text-cyan-700 mt-2">{{ formatMoney(summary.utilidad_bruta) }}</p>
        </div>
        <div class="rounded-[1.6rem] border border-violet-200 bg-violet-50 p-4 shadow-sm">
          <p class="text-[9px] uppercase font-black admin-card-title">Gastos Operacionales (Clase 5)</p>
          <p class="text-xl font-black text-violet-700 mt-2">{{ formatMoney(summary.gastos_operacionales) }}</p>
        </div>
        <div class="rounded-[1.6rem] border p-4 shadow-sm" :class="summary.utilidad_neta >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'">
          <p class="text-[9px] uppercase font-black admin-card-title">Utilidad Neta</p>
          <p class="text-xl font-black mt-2" :class="summary.utilidad_neta >= 0 ? 'text-emerald-700' : 'text-rose-700'">{{ formatMoney(summary.utilidad_neta) }}</p>
        </div>
      </div>

      <div class="rounded-[1.8rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div class="p-5 border-b border-slate-200 bg-slate-50">
          <h3 class="text-sm font-black uppercase tracking-widest text-slate-700">Estructura Contable del Periodo</h3>
          <p class="text-xs font-semibold text-slate-500 mt-1">Periodo: {{ report.periodo?.etiqueta || periodLabel }}</p>
        </div>

        <div class="p-5 space-y-4">
          <div class="border border-slate-200 rounded-2xl overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-slate-100">
                <tr>
                  <th class="th-cell">Estructura</th>
                  <th class="th-cell">Detalle por Grupo PUC</th>
                  <th class="th-cell text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-t border-emerald-100 bg-emerald-50/70">
                  <td class="td-cell font-black text-emerald-700" colspan="2">(+) Ingresos - Clase 4</td>
                  <td class="td-cell text-right font-black text-emerald-700 num-entero">{{ formatMoney(summary.ingresos) }}</td>
                </tr>
                <tr v-if="!ingresosRows.length" class="border-t border-emerald-100">
                  <td class="td-cell text-xs text-slate-500" colspan="3">Sin desgloses de grupos para ingresos en este período.</td>
                </tr>
                <tr v-for="row in ingresosRows" :key="`ing-${row.grupo}`" class="border-t border-emerald-100">
                  <td class="td-cell text-[12px] text-emerald-700 pl-8" colspan="2">{{ row.grupo }} - {{ row.nombre }}</td>
                  <td class="td-cell text-right text-[12px] font-semibold text-emerald-700 num-entero">{{ formatMoney(row.total) }}</td>
                </tr>

                <tr class="border-t border-amber-100 bg-amber-50/70">
                  <td class="td-cell font-black text-amber-700" colspan="2">(-) Costos de Ventas - Clase 6</td>
                  <td class="td-cell text-right font-black text-amber-700 num-entero">{{ formatMoney(summary.costos_ventas) }}</td>
                </tr>
                <tr v-if="!costosRows.length" class="border-t border-amber-100">
                  <td class="td-cell text-xs text-slate-500" colspan="3">Sin desgloses de grupos para costos de ventas en este período.</td>
                </tr>
                <tr v-for="row in costosRows" :key="`cos-${row.grupo}`" class="border-t border-amber-100">
                  <td class="td-cell text-[12px] text-amber-700 pl-8" colspan="2">{{ row.grupo }} - {{ row.nombre }}</td>
                  <td class="td-cell text-right text-[12px] font-semibold text-amber-700 num-entero">{{ formatMoney(row.total) }}</td>
                </tr>

                <tr class="border-t-2 border-cyan-200 bg-cyan-50">
                  <td class="td-cell font-black text-cyan-700" colspan="2">(=) Utilidad Bruta</td>
                  <td class="td-cell text-right font-black text-cyan-700 num-entero">{{ formatMoney(summary.utilidad_bruta) }}</td>
                </tr>

                <tr class="border-t border-violet-100 bg-violet-50/70">
                  <td class="td-cell font-black text-violet-700" colspan="2">(-) Gastos Operacionales - Clase 5</td>
                  <td class="td-cell text-right font-black text-violet-700 num-entero">{{ formatMoney(summary.gastos_operacionales) }}</td>
                </tr>
                <tr v-if="!gastosRows.length" class="border-t border-violet-100">
                  <td class="td-cell text-xs text-slate-500" colspan="3">Sin desgloses de grupos para gastos operacionales en este período.</td>
                </tr>
                <tr v-for="row in gastosRows" :key="`gas-${row.grupo}`" class="border-t border-violet-100">
                  <td class="td-cell text-[12px] text-violet-700 pl-8" colspan="2">{{ row.grupo }} - {{ row.nombre }}</td>
                  <td class="td-cell text-right text-[12px] font-semibold text-violet-700 num-entero">{{ formatMoney(row.total) }}</td>
                </tr>

                <tr class="border-t-2" :class="summary.utilidad_neta >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'">
                  <td class="td-cell font-black" colspan="2">(=) Utilidad Neta</td>
                  <td class="td-cell text-right font-black num-entero" :class="summary.utilidad_neta >= 0 ? 'text-emerald-700' : 'text-rose-700'">{{ formatMoney(summary.utilidad_neta) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue';
import { estadoResultadosService } from '../services/estadoResultadosService.js';
import { getPdfTools } from '../utils/lazyVendors.js';
import { businessInfo } from '../config/businessInfo.js';

const MONTHS_FALLBACK = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' }
];

const COMPANY_LOGO_URL = '/img/logo.png';

export default {
  name: 'EstadoResultados',
  setup() {
    let jsPDF = null;
    let autoTable = null;
    let logoDataUrl = null;

    const now = new Date();
    const loading = ref(false);
    const report = ref(null);
    const years = ref([now.getFullYear()]);
    const months = ref(MONTHS_FALLBACK);
    const filters = ref({
      mes: now.getMonth() + 1,
      anio: now.getFullYear()
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

    const summary = computed(() => ({
      ingresos: parseNumber(report.value?.resumen?.ingresos),
      costos_ventas: parseNumber(report.value?.resumen?.costos_ventas),
      utilidad_bruta: parseNumber(report.value?.resumen?.utilidad_bruta),
      gastos_operacionales: parseNumber(report.value?.resumen?.gastos_operacionales),
      utilidad_neta: parseNumber(report.value?.resumen?.utilidad_neta)
    }));

    const normalizeDetailRows = (rows) => (Array.isArray(rows) ? rows : []).map((row) => ({
      grupo: String(row?.grupo || '').trim(),
      nombre: String(row?.nombre || '').trim(),
      total: parseNumber(row?.total)
    }));

    const ingresosRows = computed(() => normalizeDetailRows(report.value?.ingresos?.detalles));
    const costosRows = computed(() => normalizeDetailRows(report.value?.costos?.detalles));
    const gastosRows = computed(() => {
      const rows = report.value?.gastos?.detalles || report.value?.gastos_desglosados;
      return normalizeDetailRows(rows);
    });

    const buildPdfBreakdownRows = () => {
      const sections = [
        { section: 'Ingresos (Clase 4)', rows: ingresosRows.value, empty: 'Sin ingresos por grupo en el período.' },
        { section: 'Costos (Clase 6)', rows: costosRows.value, empty: 'Sin costos por grupo en el período.' },
        { section: 'Gastos (Clase 5)', rows: gastosRows.value, empty: 'Sin gastos por grupo en el período.' }
      ];

      const output = [];
      for (const item of sections) {
        if (!item.rows.length) {
          output.push([item.section, '-', item.empty, '-']);
          continue;
        }

        item.rows.forEach((row, index) => {
          output.push([
            index === 0 ? item.section : '',
            row.grupo,
            row.nombre,
            formatMoney(row.total)
          ]);
        });
      }

      return output;
    };

    const buildPrintBreakdownRows = () => {
      const sections = [
        { title: '(+) Ingresos - Clase 4', className: 'ingresos', rows: ingresosRows.value, empty: 'Sin desgloses de ingresos para el período.' },
        { title: '(-) Costos de Ventas - Clase 6', className: 'costos', rows: costosRows.value, empty: 'Sin desgloses de costos para el período.' },
        { title: '(-) Gastos Operacionales - Clase 5', className: 'gastos', rows: gastosRows.value, empty: 'Sin desgloses de gastos para el período.' }
      ];

      return sections.map((section) => {
        const detailRows = section.rows.length
          ? section.rows.map((row) => `
              <tr class="detail-row ${section.className}">
                <td>${row.grupo} - ${row.nombre}</td>
                <td class="text-right num-entero">${formatMoney(row.total)}</td>
              </tr>
            `).join('')
          : `
              <tr class="detail-row empty">
                <td>${section.empty}</td>
                <td class="text-right">-</td>
              </tr>
            `;

        return `
          <tr class="section-row ${section.className}">
            <td>${section.title}</td>
            <td class="text-right num-entero">${
              section.className === 'ingresos'
                ? formatMoney(summary.value.ingresos)
                : section.className === 'costos'
                  ? formatMoney(summary.value.costos_ventas)
                  : formatMoney(summary.value.gastos_operacionales)
            }</td>
          </tr>
          ${detailRows}
        `;
      }).join('');
    };

    const periodLabel = computed(() => {
      const m = months.value.find((item) => Number(item.value) === Number(filters.value.mes));
      return `${m?.label || 'Mes'} ${filters.value.anio}`;
    });

    const formatFechaEmision = () => new Date().toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const loadMeta = async () => {
      try {
        const meta = await estadoResultadosService.getMeta();
        months.value = Array.isArray(meta?.months) && meta.months.length ? meta.months : MONTHS_FALLBACK;

        const currentYear = Number(meta?.current_year || now.getFullYear());
        const yearsList = Array.isArray(meta?.years) && meta.years.length
          ? meta.years.map((y) => Number(y)).filter((y) => Number.isFinite(y))
          : [currentYear];

        years.value = yearsList.length ? yearsList : [currentYear];

        if (!years.value.includes(Number(filters.value.anio))) {
          filters.value.anio = years.value[years.value.length - 1];
        }
      } catch (error) {
        console.error('Error al cargar metadatos de estado resultados:', error);
      }
    };

    const consultar = async () => {
      loading.value = true;
      try {
        report.value = await estadoResultadosService.getReporte(filters.value);
      } catch (error) {
        console.error('Error al consultar estado resultados:', error);
        report.value = null;
        alert(error.message || 'No se pudo generar el reporte.');
      } finally {
        loading.value = false;
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

    const exportarPDF = async () => {
      if (!report.value) return;

      try {
        if (!jsPDF || !autoTable) {
          const pdfTools = await getPdfTools();
          jsPDF = pdfTools.jsPDF;
          autoTable = pdfTools.autoTable;
        }

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm' });
        const margin = 10;
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = margin;

        const logo = await loadLogoDataUrl();
        if (logo) {
          doc.addImage(logo, 'PNG', margin, y, 30, 12);
        }

        doc.setFontSize(14);
        doc.setTextColor(17, 94, 89);
        doc.text('ESTADO DE RESULTADOS', pageWidth / 2, y + 6, { align: 'center' });

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Fecha: ${formatFechaEmision()}`, pageWidth - margin, y + 6, { align: 'right' });

        y += 16;

        doc.setFontSize(10);
        doc.text(`${businessInfo.identificacion.razonSocial}`, margin, y);
        y += 5;
        doc.text(`${businessInfo.identificacion.tipoDocumento}: ${businessInfo.identificacion.numeroDocumento}`, margin, y);
        y += 5;
        doc.text(`Periodo: ${report.value?.periodo?.etiqueta || periodLabel.value}`, margin, y);
        y += 8;

        autoTable(doc, {
          startY: y,
          head: [['Concepto', 'Valor']],
          body: [
            ['(+) Ingresos (Clase 4)', formatMoney(summary.value.ingresos)],
            ['(-) Costos de Ventas (Clase 6)', formatMoney(summary.value.costos_ventas)],
            ['(=) Utilidad Bruta', formatMoney(summary.value.utilidad_bruta)],
            ['(-) Gastos Operacionales (Clase 5)', formatMoney(summary.value.gastos_operacionales)],
            ['(=) Utilidad Neta', formatMoney(summary.value.utilidad_neta)]
          ],
          margin,
          styles: { fontSize: 9 },
          headStyles: {
            fillColor: [17, 94, 89],
            textColor: 255,
            fontStyle: 'bold'
          },
          columnStyles: {
            1: { halign: 'right' }
          }
        });

        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 8,
          head: [['Sección', 'Grupo', 'Concepto', 'Total']],
          body: buildPdfBreakdownRows(),
          margin,
          styles: { fontSize: 8 },
          headStyles: {
            fillColor: [15, 23, 42],
            textColor: 255,
            fontStyle: 'bold'
          },
          columnStyles: {
            3: { halign: 'right' }
          }
        });

        doc.save(`estado-resultados-${filters.value.anio}-${String(filters.value.mes).padStart(2, '0')}.pdf`);
      } catch (error) {
        console.error('Error al exportar PDF:', error);
        alert(error.message || 'No se pudo exportar el PDF.');
      }
    };

    const imprimirReporte = () => {
      if (!report.value) return;

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Por favor, permite las ventanas emergentes para imprimir.');
        return;
      }

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Estado de Resultados</title>
            <style>
              @page { margin: 12mm; }
              body { font-family: Arial, sans-serif; color: #334155; }
              .report-head { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 10px; }
              .report-head-title { color: #115e59; text-transform: uppercase; font-weight: 900; font-size: 20px; }
              .report-head-date { color: #64748b; font-size: 12px; font-weight: 700; }
              .logo-wrap img { max-height: 40px; max-width: 140px; object-fit: contain; }
              .meta { margin-bottom: 10px; font-size: 12px; color: #475569; }
              table { width: 100%; border-collapse: collapse; margin-top: 12px; }
              th { background: #115e59; color: #fff; padding: 8px; font-size: 12px; text-align: left; }
              td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; }
              .text-right { text-align: right; }
              .headline { font-weight: 800; background: #f8fafc; }
              .section-row { font-weight: 800; }
              .section-row.ingresos { background: #ecfdf5; color: #047857; }
              .section-row.costos { background: #fffbeb; color: #b45309; }
              .section-row.gastos { background: #f5f3ff; color: #6d28d9; }
              .detail-row td { font-size: 11px; }
              .detail-row.ingresos td { color: #047857; }
              .detail-row.costos td { color: #b45309; }
              .detail-row.gastos td { color: #6d28d9; }
              .detail-row.empty td { color: #64748b; }
              .positive { color: #15803d; }
              .negative { color: #be123c; }
            </style>
          </head>
          <body>
            <div class="report-head">
              <div class="logo-wrap"><img src="${COMPANY_LOGO_URL}" alt="Logo"></div>
              <div class="report-head-title">Estado de Resultados</div>
              <div class="report-head-date">Fecha: ${formatFechaEmision()}</div>
            </div>

            <div class="meta">
              <div><strong>${businessInfo.identificacion.razonSocial}</strong></div>
              <div>${businessInfo.identificacion.tipoDocumento}: ${businessInfo.identificacion.numeroDocumento}</div>
              <div>Periodo: ${report.value?.periodo?.etiqueta || periodLabel.value}</div>
            </div>

            <table>
              <tbody>
                <tr><td>(+) Ingresos (Clase 4)</td><td class="text-right num-entero">${formatMoney(summary.value.ingresos)}</td></tr>
                <tr><td>(-) Costos de Ventas (Clase 6)</td><td class="text-right num-entero">${formatMoney(summary.value.costos_ventas)}</td></tr>
                <tr class="headline"><td>(=) Utilidad Bruta</td><td class="text-right num-entero">${formatMoney(summary.value.utilidad_bruta)}</td></tr>
                <tr><td>(-) Gastos Operacionales (Clase 5)</td><td class="text-right num-entero">${formatMoney(summary.value.gastos_operacionales)}</td></tr>
                <tr class="headline"><td>(=) Utilidad Neta</td><td class="text-right num-entero ${summary.value.utilidad_neta >= 0 ? 'positive' : 'negative'}">${formatMoney(summary.value.utilidad_neta)}</td></tr>
              </tbody>
            </table>

            <table>
              <thead><tr><th>Desglose por Grupo PUC</th><th class="text-right">Total</th></tr></thead>
              <tbody>
                ${buildPrintBreakdownRows()}
              </tbody>
            </table>
          </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };

    onMounted(() => {
      void (async () => {
        try {
          await loadMeta();
          await consultar();
        } catch (error) {
          console.error('Error inicializando estado de resultados:', error);
        }
      })();
    });

    return {
      loading,
      filters,
      years,
      months,
      report,
      summary,
      ingresosRows,
      costosRows,
      gastosRows,
      periodLabel,
      formatMoney,
      consultar,
      exportarPDF,
      imprimirReporte
    };
  }
};
</script>

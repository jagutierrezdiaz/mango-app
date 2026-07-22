<template>
  <div class="cxp-shell min-h-screen rounded-3xl p-4 md:p-6 lg:p-8">

    <!-- Header -->
    <section class="rounded-3xl border border-slate-200/70 bg-white/90 p-5 md:p-6 shadow-sm">
      <div class="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 class="text-3xl md:text-4xl font-black tracking-tight text-slate-900">Pago a Proveedores</h1>
          <p class="mt-2 text-sm font-medium text-slate-600 max-w-3xl">
            Registra abonos o pagos totales directamente desde aquí.
          </p>
        </div>

        <div class="flex flex-col lg:flex-row gap-3 w-full xl:w-auto xl:min-w-[920px]">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 flex-1">
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Fecha Inicio</label>
              <input
                v-model="filters.fechaInicio"
                type="date"
                class="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 text-sm font-medium"
              >
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Fecha Final</label>
              <input
                v-model="filters.fechaFinal"
                type="date"
                class="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 text-sm font-medium"
              >
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Estado Pago</label>
              <select
                v-model="filters.estadoPago"
                class="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 text-sm font-medium appearance-none"
              >
                <option value="Pendiente">Pendiente</option>
                <option value="Pagada">Pagada</option>
                <option value="Todos">Todos</option>
              </select>
            </div>
            <div class="flex items-end">
              <button
                type="button"
                @click="consultar"
                :disabled="loading"
                class="w-full pb-btn pb-btn-consult pb-btn-unified px-4 py-3 disabled:opacity-50"
              >
                <i :class="loading ? 'fas fa-circle-notch fa-spin' : 'fas fa-filter'"></i>
                <span>{{ loading ? 'Consultando...' : 'Consultar' }}</span>
              </button>
            </div>
            <div class="flex items-end">
              <button
                type="button"
                @click="resetFechas"
                :disabled="loading"
                class="w-full px-4 py-3 text-[11px] pb-btn-month-current"
              >
                <i class="fas fa-calendar-alt"></i>
                <span>Mes Actual</span>
              </button>
            </div>
          </div>

          <div class="flex flex-wrap gap-2 items-end">
            <button
              type="button"
              @click="exportarExcel"
              :disabled="loading || cuentas.length === 0"
              class="flex-1 lg:flex-none pb-btn pb-btn-export pb-btn-unified px-5 py-3 text-[11px] whitespace-nowrap"
            >
              <i class="fas fa-file-excel"></i>
              <span>Exportar</span>
            </button>
            <button
              type="button"
              @click="imprimirReporte"
              :disabled="loading || cuentas.length === 0"
              class="flex-1 lg:flex-none pb-btn pb-btn-print pb-btn-unified px-5 py-3 text-[11px] whitespace-nowrap"
            >
              <i class="fas fa-print"></i>
              <span>Imprimir</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Summary Cards -->
    <section class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <article class="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
        <p class="text-[10px] uppercase tracking-widest font-black text-red-500">Total por Pagar</p>
        <p class="mt-3 text-2xl font-black text-red-700 num-value">{{ formatMoney(resumen.totalPorPagar) }}</p>
        <p class="text-[11px] font-semibold text-red-400 mt-1">{{ cuentas.length }} factura{{ cuentas.length !== 1 ? 's' : '' }} en consulta</p>
      </article>

      <article class="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <p class="text-[10px] uppercase tracking-widest font-black text-amber-500">Vencimientos Esta Semana</p>
        <p class="mt-3 text-2xl font-black text-amber-700 num-value">{{ formatMoney(resumen.vencimientosSemana) }}</p>
        <p class="text-[11px] font-semibold text-amber-400 mt-1">{{ resumen.countSemana }} factura{{ resumen.countSemana !== 1 ? 's' : '' }} esta semana</p>
      </article>
    </section>

    <!-- Table -->
    <section class="mt-5 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div v-if="loading" class="flex items-center justify-center py-20 text-sm font-black text-slate-400 uppercase tracking-widest">
        Cargando cuentas por pagar...
      </div>

      <div v-else-if="!cuentas.length" class="flex items-center justify-center py-20 text-sm font-black text-slate-400 uppercase tracking-widest">
        <div class="text-center">
          <i class="fas fa-file-invoice text-3xl mb-3 block text-slate-300"></i>
          No hay facturas para los filtros seleccionados.
        </div>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-left text-[10px] uppercase tracking-widest text-slate-500">
              <th class="px-4 py-3 font-black">Proveedor</th>
              <th class="px-4 py-3 font-black">Nro. Factura</th>
              <th class="px-4 py-3 font-black">Fecha Compra</th>
              <th class="px-4 py-3 font-black">Forma Pago</th>
              <th class="px-4 py-3 font-black text-right">Total Factura</th>
              <th class="px-4 py-3 font-black text-right">Saldo Pendiente</th>
              <th class="px-4 py-3 font-black text-center">Estado</th>
              <th class="px-4 py-3 font-black text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in cuentas"
              :key="row.id"
              class="border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
            >
              <td class="px-4 py-3 font-bold text-slate-800">{{ row.proveedor_razon_social }}</td>
              <td class="px-4 py-3 font-semibold text-slate-600">{{ row.numero_documento }}</td>
              <td class="px-4 py-3 font-semibold text-slate-500">{{ formatDate(row.fecha_compra) }}</td>
              <td class="px-4 py-3 font-semibold text-slate-500">{{ row.forma_pago }}</td>
              <td class="px-4 py-3 text-right font-black text-slate-900 num-entero">{{ formatMoney(row.total_pagar) }}</td>
              <td class="px-4 py-3 text-right font-black num-entero"
                :class="row.saldo_pendiente > 0 ? 'text-red-600' : 'text-emerald-600'">
                {{ formatMoney(row.saldo_pendiente) }}
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  class="inline-block rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide"
                  :class="estadoBadgeClass(row.estado_pago)"
                >{{ row.estado_pago }}</span>
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  v-if="Number(row.saldo_pendiente) > 0"
                  type="button"
                  class="inline-flex items-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 text-[10px] font-black uppercase tracking-wide transition"
                  @click="abrirModalPago(row)"
                >
                  <i class="fas fa-dollar-sign"></i>
                  Registrar Pago
                </button>
                <span v-else class="text-[10px] font-bold text-slate-400 uppercase">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Modal Registrar Pago -->
    <Teleport to="body">
      <div
        v-if="modalPago.visible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        @mousedown.self="cerrarModal"
      >
        <div class="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden">
          <!-- Modal Header -->
          <div class="flex items-center justify-between p-5 border-b border-slate-100">
            <div>
              <p class="text-[10px] font-black uppercase tracking-widest text-slate-500">Registrar Pago</p>
              <h2 class="text-lg font-black text-slate-900">{{ modalPago.compra?.proveedor_razon_social }}</h2>
              <p class="text-xs font-semibold text-slate-500 mt-0.5">Factura: {{ modalPago.compra?.numero_documento }}</p>
            </div>
            <button type="button" @click="cerrarModal" class="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 transition">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Saldo Info -->
          <div class="px-5 pt-4">
            <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex justify-between gap-4">
              <div>
                <p class="text-[10px] font-black uppercase text-slate-400">Total Factura</p>
                <p class="text-lg font-black text-slate-700 num-value">{{ formatMoney(modalPago.compra?.total_pagar) }}</p>
              </div>
              <div class="text-right">
                <p class="text-[10px] font-black uppercase text-red-400">Saldo Pendiente</p>
                <p class="text-lg font-black text-red-600 num-value">{{ formatMoneyExact(modalPago.compra?.saldo_pendiente) }}</p>
              </div>
            </div>
          </div>

          <!-- Form -->
          <form novalidate @submit.prevent="confirmarPago" class="p-5 space-y-4">
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Monto a Pagar</label>
              <input
                v-model="modalPago.monto"
                type="number"
                step="0.01"
                min="0.01"
                required
                class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium"
                placeholder="0.00"
              >
              <div class="mt-1 flex gap-2">
                <button
                  type="button"
                  @click="modalPago.monto = roundMoney(modalPago.compra?.saldo_pendiente)"
                  class="text-[10px] font-black text-amber-600 hover:text-amber-700 underline"
                >
                  Pagar total ({{ formatMoneyExact(modalPago.compra?.saldo_pendiente) }})
                </button>
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Medio de Pago</label>
              <div class="flex items-center gap-3">
                <select
                  v-model="modalPago.cuenta_pago"
                  class="flex-1 min-w-0 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium appearance-none"
                  @change="onCuentaPagoChange"
                >
                  <option value="110510">Efectivo – Caja Operativa (110510)</option>
                  <option value="110515">Efectivo – Ahorros Reserva (110515)</option>
                  <option value="111005">Transferencia – Bancos (Cta Ahorros) (111005)</option>
                </select>
                <div class="shrink-0 text-right min-w-[130px]">
                  <p class="text-[9px] font-black uppercase text-slate-400 tracking-widest">Saldo</p>
                  <p class="text-sm font-black text-slate-800 num-value">
                    <span v-if="loadingSaldoCuenta" class="text-slate-400">...</span>
                    <span v-else>{{ formatMoneyExact(saldoCuenta) }}</span>
                  </p>
                </div>
              </div>
            </div>

            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="cerrarModal"
                class="flex-1 py-3 rounded-2xl border border-slate-300 text-slate-700 text-[10px] font-black uppercase tracking-wide hover:bg-slate-50 transition"
              >
                <i class="fas fa-times mr-1"></i> Cancelar
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-wide transition disabled:opacity-50"
              >
                <i :class="saving ? 'fas fa-circle-notch fa-spin mr-1' : 'fas fa-check mr-1'"></i>
                {{ saving ? 'Guardando...' : 'Confirmar Pago' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Swal from 'sweetalert2';
import { compraService } from '../services/compraService.js';
import { getXLSX } from '../utils/lazyVendors.js';

const COMPANY_LOGO_URL = '/img/logo.png';

const getDefaultFechaFinal = () => new Date().toISOString().slice(0, 10);

const getDefaultFechaInicio = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 2);
  return d.toISOString().slice(0, 10);
};

const cuentas = ref([]);
const loading = ref(false);
const saving = ref(false);
const saldoCuenta = ref(0);
const loadingSaldoCuenta = ref(false);

const filters = ref({
  fechaInicio: getDefaultFechaInicio(),
  fechaFinal: getDefaultFechaFinal(),
  estadoPago: 'Pendiente'
});

const modalPago = ref({
  visible: false,
  compra: null,
  monto: '',
  cuenta_pago: '110510'
});

const roundMoney = (value) => Number((Number(value) || 0).toFixed(2));

const formatMoney = (value) => Number(value || 0).toLocaleString('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

const formatMoneyExact = (value) => Number(value || 0).toLocaleString('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(String(value).replace(' ', 'T'));
  if (isNaN(d.getTime())) return String(value).slice(0, 10);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const estadoBadgeClass = (estado) => {
  if (estado === 'Parcial') return 'bg-amber-100 text-amber-700 border border-amber-200';
  if (estado === 'Pendiente') return 'bg-red-100 text-red-700 border border-red-200';
  if (estado === 'Pagada' || estado === 'Pagado') return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
  return 'bg-slate-100 text-slate-600 border border-slate-200';
};

const estadoPagoLabel = computed(() => {
  if (filters.value.estadoPago === 'Pagada') return 'Pagada';
  if (filters.value.estadoPago === 'Todos') return 'Todos';
  return 'Pendiente';
});

const semanaInicio = (() => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(now.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
})();

const semanaFin = (() => {
  const end = new Date(semanaInicio);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
})();

const resumen = computed(() => {
  let totalPorPagar = 0;
  let vencimientosSemana = 0;
  let countSemana = 0;

  cuentas.value.forEach((row) => {
    totalPorPagar += Number(row.saldo_pendiente || 0);

    const fechaCompra = row.fecha_compra ? new Date(String(row.fecha_compra).replace(' ', 'T')) : null;
    if (fechaCompra && fechaCompra >= semanaInicio && fechaCompra <= semanaFin) {
      vencimientosSemana += Number(row.saldo_pendiente || 0);
      countSemana += 1;
    }
  });

  return {
    totalPorPagar: Number(totalPorPagar.toFixed(2)),
    vencimientosSemana: Number(vencimientosSemana.toFixed(2)),
    countSemana
  };
});

const consultar = async () => {
  loading.value = true;
  try {
    cuentas.value = await compraService.getCuentasPorPagar({
      fecha_inicio: filters.value.fechaInicio,
      fecha_final: filters.value.fechaFinal,
      estado_pago: filters.value.estadoPago
    });
  } catch (error) {
    console.error(error);
    cuentas.value = [];
  } finally {
    loading.value = false;
  }
};

const resetFechas = () => {
  filters.value.fechaInicio = getDefaultFechaInicio();
  filters.value.fechaFinal = getDefaultFechaFinal();
  consultar();
};

const exportarExcel = async () => {
  const rows = cuentas.value.map((row) => ({
    Proveedor: row.proveedor_razon_social || '---',
    'Nro. Factura': row.numero_documento || '---',
    'Fecha Compra': formatDate(row.fecha_compra),
    'Forma Pago': row.forma_pago || '---',
    'Total Factura': formatMoney(row.total_pagar),
    'Saldo Pendiente': formatMoney(row.saldo_pendiente),
    Estado: row.estado_pago || '---'
  }));

  const XLSX = await getXLSX();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cuentas Por Pagar');
  const filename = `cuentas-por-pagar-${filters.value.fechaInicio || 'sin-fecha'}-${filters.value.fechaFinal || 'sin-fecha'}.xlsx`;
  XLSX.writeFile(workbook, filename);
};

const imprimirReporte = () => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor habilite ventanas emergentes para imprimir.');
    return;
  }

  const tableRows = cuentas.value.map((row) => `
    <tr>
      <td>${row.proveedor_razon_social || '---'}</td>
      <td>${row.numero_documento || '---'}</td>
      <td>${formatDate(row.fecha_compra)}</td>
      <td>${row.forma_pago || '---'}</td>
      <td class="text-right">${formatMoney(row.total_pagar)}</td>
      <td class="text-right">${formatMoney(row.saldo_pendiente)}</td>
      <td>${row.estado_pago || '---'}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!doctype html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Pago a Proveedores</title>
      <style>
        @page { size: landscape; margin: 10mm; }
        body { font-family: Arial, sans-serif; color: #334155; font-size: 10px; }
        .report-head { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 10px; }
        .report-head-title { color: #b45309; text-transform: uppercase; font-weight: 900; font-size: 18px; }
        .report-head-date { color: #64748b; font-size: 11px; font-weight: 700; }
        .logo-wrap img { max-height: 40px; max-width: 140px; object-fit: contain; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th { background: #b45309; color: white; text-align: left; padding: 6px 4px; font-size: 9px; }
        td { border: 1px solid #e2e8f0; padding: 5px 4px; font-size: 9px; }
        tr:nth-child(even) { background: #f8fafc; }
        .text-right { text-align: right; white-space: nowrap; }
      </style>
    </head>
    <body>
      <div class="report-head">
        <div class="logo-wrap"><img src="${COMPANY_LOGO_URL}" alt="Logo"></div>
        <div class="report-head-title">Pago a Proveedores</div>
        <div class="report-head-date">Fecha: ${new Date().toLocaleString('es-CO')}</div>
      </div>
      <p><strong>Período:</strong> ${filters.value.fechaInicio} al ${filters.value.fechaFinal}</p>
      <p><strong>Estado:</strong> ${estadoPagoLabel.value}</p>
      <p><strong>Total registros:</strong> ${cuentas.value.length}</p>
      <table>
        <thead>
          <tr>
            <th>Proveedor</th>
            <th>Nro. Factura</th>
            <th>Fecha Compra</th>
            <th>Forma Pago</th>
            <th>Total Factura</th>
            <th>Saldo Pendiente</th>
            <th>Estado</th>
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

const abrirModalPago = async (compra) => {
  modalPago.value = {
    visible: true,
    compra,
    monto: roundMoney(compra.saldo_pendiente),
    cuenta_pago: '110510'
  };
  await cargarSaldoCuenta('110510');
};

const cargarSaldoCuenta = async (codigo) => {
  loadingSaldoCuenta.value = true;
  try {
    const result = await compraService.getSaldoCuentaPago(codigo);
    saldoCuenta.value = roundMoney(result.saldo);
  } catch (error) {
    console.error(error);
    saldoCuenta.value = 0;
  } finally {
    loadingSaldoCuenta.value = false;
  }
};

const onCuentaPagoChange = () => {
  cargarSaldoCuenta(modalPago.value.cuenta_pago);
};

const cerrarModal = () => {
  if (saving.value) return;
  modalPago.value.visible = false;
};

const confirmarPago = async () => {
  const saldoFactura = roundMoney(modalPago.value.compra?.saldo_pendiente);
  let monto = roundMoney(modalPago.value.monto);

  if (!monto || monto <= 0) {
    await Swal.fire({
      icon: 'warning',
      title: 'Monto inválido',
      text: 'Ingrese un monto válido.',
      confirmButtonColor: '#f59e0b'
    });
    return;
  }

  if (monto > saldoFactura) {
    monto = saldoFactura;
  }

  const saldoDisponible = roundMoney(saldoCuenta.value);
  if (saldoDisponible < monto) {
    await Swal.fire({
      icon: 'error',
      title: 'Saldo insuficiente',
      text: `El saldo de la cuenta (${formatMoneyExact(saldoDisponible)}) no es suficiente para realizar el pago de ${formatMoneyExact(monto)}.`,
      confirmButtonColor: '#e11d48'
    });
    return;
  }

  const { isConfirmed } = await Swal.fire({
    icon: 'question',
    title: 'Confirmar pago',
    html: `¿Confirma el registro del pago por <strong>${formatMoneyExact(monto)}</strong>?`,
    showCancelButton: true,
    confirmButtonText: 'Sí, registrar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#f59e0b',
    cancelButtonColor: '#64748b'
  });

  if (!isConfirmed) return;

  saving.value = true;
  try {
    const result = await compraService.pagar(modalPago.value.compra.id, {
      monto,
      cuenta_pago: modalPago.value.cuenta_pago
    });

    await Swal.fire({
      icon: 'success',
      title: 'Pago registrado',
      text: result.message || 'Pago registrado correctamente.',
      confirmButtonColor: '#f59e0b'
    });
    modalPago.value.visible = false;
    await consultar();
  } catch (error) {
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.message || 'Error al registrar el pago.',
      confirmButtonColor: '#e11d48'
    });
  } finally {
    saving.value = false;
  }
};

onMounted(consultar);
</script>

<style scoped>
.cxp-shell {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.num-value {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}
</style>

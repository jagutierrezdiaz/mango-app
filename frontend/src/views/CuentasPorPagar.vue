<template>
  <div class="cxp-shell min-h-screen rounded-3xl p-4 md:p-6 lg:p-8">

    <!-- Header -->
    <section class="rounded-3xl border border-slate-200/70 bg-white/90 p-5 md:p-6 shadow-sm">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 class="text-3xl md:text-4xl font-black tracking-tight text-slate-900">Pago a Proveedores</h1>
          <p class="mt-2 text-sm font-medium text-slate-600 max-w-3xl">
            Registra abonos o pagos totales directamente desde aquí.
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-700 transition hover:bg-slate-50"
          :disabled="loading"
          @click="loadData"
        >
          <i :class="loading ? 'fas fa-circle-notch fa-spin' : 'fas fa-sync-alt'"></i>
          <span>{{ loading ? 'Actualizando...' : 'Actualizar' }}</span>
        </button>
      </div>
    </section>

    <!-- Summary Cards -->
    <section class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <article class="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
        <p class="text-[10px] uppercase tracking-widest font-black text-red-500">Total por Pagar</p>
        <p class="mt-3 text-2xl font-black text-red-700 num-value">{{ formatMoney(resumen.totalPorPagar) }}</p>
        <p class="text-[11px] font-semibold text-red-400 mt-1">{{ cuentas.length }} factura{{ cuentas.length !== 1 ? 's' : '' }} pendiente{{ cuentas.length !== 1 ? 's' : '' }}</p>
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

      <div v-else-if="!cuentas.length" class="flex items-center justify-center py-20 text-sm font-black text-emerald-600 uppercase tracking-widest">
        <div class="text-center">
          <i class="fas fa-check-circle text-3xl mb-3 block"></i>
          No hay facturas pendientes de pago.
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
                  type="button"
                  class="inline-flex items-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 text-[10px] font-black uppercase tracking-wide transition"
                  @click="abrirModalPago(row)"
                >
                  <i class="fas fa-dollar-sign"></i>
                  Registrar Pago
                </button>
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

const cuentas = ref([]);
const loading = ref(false);
const saving = ref(false);
const saldoCuenta = ref(0);
const loadingSaldoCuenta = ref(false);

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
  return 'bg-slate-100 text-slate-600 border border-slate-200';
};

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

const loadData = async () => {
  loading.value = true;
  try {
    cuentas.value = await compraService.getCuentasPorPagar();
  } catch (error) {
    console.error(error);
    cuentas.value = [];
  } finally {
    loading.value = false;
  }
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
    cerrarModal();
    await loadData();
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

onMounted(loadData);
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

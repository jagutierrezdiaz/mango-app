<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
    <div class="w-full max-w-3xl rounded-[2rem] border border-slate-200 bg-white shadow-2xl overflow-hidden">
      <div class="bg-teal-700 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h3 class="text-xs font-black uppercase tracking-[0.2em]">Registrar Pago</h3>
          <p class="text-[10px] uppercase tracking-wider opacity-90 mt-1">Tesoreria Centralizada</p>
        </div>
        <button class="pb-btn pb-btn-secondary pb-btn-unified px-3 py-2 text-[10px]" @click="$emit('close')">
          <i class="fas fa-times"></i>
          <span>Cerrar</span>
        </button>
      </div>

      <div class="p-6 space-y-5">
        <div class="rounded-2xl border border-cyan-200 bg-cyan-50 px-5 py-4">
          <p class="text-[10px] font-black uppercase tracking-widest text-slate-500">Monto Objetivo</p>
          <p class="text-3xl font-black text-teal-700 mt-1">{{ formatMoney(montoObjetivo) }}</p>
          <p class="text-[11px] font-semibold text-slate-500 mt-2">{{ tipoRegistroLabel }} #{{ registro_id }}</p>
        </div>

        <div v-if="loadingSaldos" class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center">
          <p class="text-[11px] font-black uppercase tracking-widest text-slate-500">Cargando saldos...</p>
        </div>

        <div v-else class="space-y-4">
          <div class="overflow-x-auto rounded-xl border border-slate-200">
            <table class="w-full min-w-[620px] text-sm">
              <thead>
                <tr class="bg-slate-100">
                  <th class="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-black text-slate-500">Cuenta</th>
                  <th class="text-right px-4 py-3 text-[10px] uppercase tracking-widest font-black text-slate-500">Saldo Disponible</th>
                  <th class="text-right px-4 py-3 text-[10px] uppercase tracking-widest font-black text-slate-500">Monto a Tomar</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="cuenta in cuentas" :key="cuenta.cuenta_codigo" class="border-t border-slate-200">
                  <td class="px-4 py-3 font-bold text-slate-700">{{ cuenta.nombre }} ({{ cuenta.cuenta_codigo }})</td>
                  <td class="px-4 py-3 text-right font-black text-slate-700 num-entero">{{ formatMoney(cuenta.saldo_disponible) }}</td>
                  <td class="px-4 py-3">
                    <input
                      :value="asignaciones[cuenta.cuenta_codigo]"
                      @input="onInputMonto(cuenta.cuenta_codigo, $event.target.value)"
                      type="number"
                      min="0"
                      step="1"
                      class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-right font-bold outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                      :class="(asignaciones[cuenta.cuenta_codigo] || 0) > Number(cuenta.saldo_disponible || 0) ? 'border-rose-300 bg-rose-50 text-rose-700' : ''"
                    >
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p class="text-[10px] uppercase tracking-wider font-black text-slate-500">Total Asignado</p>
              <p class="text-lg font-black text-slate-800 mt-1">{{ formatMoney(totalAsignado) }}</p>
            </div>
            <div class="rounded-xl border px-4 py-3" :class="isExacto ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'">
              <p class="text-[10px] uppercase tracking-wider font-black text-slate-500">Diferencia</p>
              <p class="text-lg font-black mt-1" :class="isExacto ? 'text-emerald-700' : 'text-amber-700'">{{ formatMoney(Math.abs(diferencia)) }}</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p class="text-[10px] uppercase tracking-wider font-black text-slate-500">Estado</p>
              <p class="text-lg font-black mt-1" :class="isExacto ? 'text-emerald-700' : 'text-rose-600'">
                {{ isExacto ? 'Listo para Confirmar' : 'Monto Incompleto' }}
              </p>
            </div>
          </div>

          <p v-if="errorMessage" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] font-bold text-rose-700">
            {{ errorMessage }}
          </p>
        </div>
      </div>

      <div class="px-6 py-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
        <button class="pb-btn pb-btn-secondary pb-btn-unified px-4 py-2 text-[11px]" @click="$emit('close')">
          <i class="fas fa-times"></i>
          <span>Cancelar</span>
        </button>
        <button
          class="pb-btn pb-btn-new pb-btn-unified px-5 py-2 text-[11px]"
          :disabled="saving || loadingSaldos || !isExacto"
          @click="confirmarPago"
        >
          <i :class="saving ? 'fas fa-circle-notch fa-spin' : 'fas fa-check'"></i>
          <span>{{ saving ? 'Guardando...' : 'Confirmar Pago' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import Swal from 'sweetalert2';
import { gastosService } from '../services/gastosService.js';
import { tesoreriaService } from '../services/tesoreriaService.js';
import { formatCurrencyNoDecimals } from '../utils/formatters.js';

const props = defineProps({
  monto_objetivo: {
    type: Number,
    required: true
  },
  registro_id: {
    type: Number,
    required: true
  },
  tipo_registro: {
    type: String,
    required: true,
    validator: (value) => ['gasto', 'costo'].includes(String(value || '').toLowerCase())
  }
});

const emit = defineEmits(['close', 'paid']);

const loadingSaldos = ref(false);
const saving = ref(false);
const errorMessage = ref('');
const cuentas = ref([]);
const asignaciones = ref({
  '110505': 0,
  '110510': 0,
  '111005': 0
});

const roundMoney = (value) => Number((Number(value) || 0).toFixed(0));
const parseNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const montoObjetivo = computed(() => roundMoney(props.monto_objetivo));
const tipoRegistroLabel = computed(() => (String(props.tipo_registro || '').toLowerCase() === 'gasto' ? 'Gasto' : 'Costo'));
const totalAsignado = computed(() => roundMoney(Object.values(asignaciones.value).reduce((acc, monto) => acc + parseNumber(monto), 0)));
const diferencia = computed(() => roundMoney(montoObjetivo.value - totalAsignado.value));
const isExacto = computed(() => Math.abs(diferencia.value) < 0.5);

const formatMoney = (value) => formatCurrencyNoDecimals(roundMoney(value));

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const renderDetalleRow = (label, value) => `
  <div style="display:flex;justify-content:space-between;gap:12px;padding:5px 0;border-bottom:1px solid #e2e8f0;">
    <span style="color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">${escapeHtml(label)}</span>
    <span style="color:#0f172a;font-size:13px;font-weight:700;text-align:right;max-width:65%;">${escapeHtml(value)}</span>
  </div>
`;

const buildAsignacionesHtml = () => {
  const items = Object.entries(asignaciones.value)
    .map(([cuentaCodigo, monto]) => ({
      cuentaCodigo,
      monto: roundMoney(monto)
    }))
    .filter((item) => item.monto > 0);

  if (!items.length) {
    return '<p style="margin:8px 0 0;color:#64748b;font-size:12px;">Sin cuentas asignadas.</p>';
  }

  return `
    <ul style="margin:8px 0 0;padding-left:18px;text-align:left;color:#0f172a;font-size:13px;">
      ${items.map((item) => {
        const cuenta = cuentas.value.find((c) => c.cuenta_codigo === item.cuentaCodigo);
        const nombre = cuenta?.nombre || item.cuentaCodigo;
        return `<li style="margin-bottom:4px;"><strong>${escapeHtml(nombre)}</strong> (${escapeHtml(item.cuentaCodigo)}): ${escapeHtml(formatMoney(item.monto))}</li>`;
      }).join('')}
    </ul>
  `;
};

const buildGastoConfirmacionHtml = (resumen) => `
  <div style="text-align:left;margin-top:8px;">
    <p style="margin:0 0 10px;color:#334155;font-size:14px;">
      Revise la información del gasto antes de registrar el pago:
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;">
      ${renderDetalleRow('Gasto #', String(props.registro_id))}
      ${renderDetalleRow('Proveedor ID', resumen.proveedor_id ?? '---')}
      ${renderDetalleRow('Razón social', resumen.razon_social || '---')}
      ${renderDetalleRow('Fecha gasto', resumen.fecha_gasto || '---')}
      ${renderDetalleRow('Descripción', resumen.descripcion || '---')}
      ${renderDetalleRow('Total gasto', formatMoney(resumen.total_gasto))}
    </div>
    <div style="margin-top:14px;background:#ecfeff;border:1px solid #a5f3fc;border-radius:12px;padding:12px 14px;">
      <p style="margin:0;color:#0f766e;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;">
        Distribución del pago
      </p>
      ${buildAsignacionesHtml()}
    </div>
    <p style="margin:12px 0 0;color:#475569;font-size:13px;font-weight:600;">
      ¿Desea registrar el pago por <strong style="color:#0f766e;">${escapeHtml(formatMoney(resumen.total_gasto ?? montoObjetivo.value))}</strong>?
    </p>
  </div>
`;

const buildCostoConfirmacionHtml = () => `
  <p style="margin:0;color:#475569;font-size:14px;">
    ¿Confirma el registro del pago de <strong style="color:#0f766e;">${escapeHtml(formatMoney(montoObjetivo.value))}</strong>
    para ${escapeHtml(tipoRegistroLabel.value)} #${escapeHtml(props.registro_id)}?
  </p>
  <div style="margin-top:14px;background:#ecfeff;border:1px solid #a5f3fc;border-radius:12px;padding:12px 14px;text-align:left;">
    <p style="margin:0;color:#0f766e;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;">
      Distribución del pago
    </p>
    ${buildAsignacionesHtml()}
  </div>
`;

const obtenerHtmlConfirmacion = async () => {
  if (String(props.tipo_registro || '').toLowerCase() !== 'gasto') {
    return buildCostoConfirmacionHtml();
  }

  const resumen = await gastosService.getResumenPago(props.registro_id);
  return buildGastoConfirmacionHtml(resumen);
};

const resetAsignaciones = () => {
  asignaciones.value = {
    '110505': 0, //Caja Punto de Venta
    '110510': 0, //Caja Principal Operativa 
    '111005': 0  //Bancos (Cta Ahorros)
  };
};

const loadSaldos = async () => {
  loadingSaldos.value = true;
  errorMessage.value = '';
  try {
    const saldos = await tesoreriaService.getSaldos();
    cuentas.value = saldos;
    resetAsignaciones();
  } catch (error) {
    cuentas.value = [];
    errorMessage.value = error.message || 'No se pudieron cargar saldos de tesoreria.';
  } finally {
    loadingSaldos.value = false;
  }
};

const onInputMonto = (cuentaCodigo, value) => {
  const parsed = roundMoney(parseNumber(value));
  asignaciones.value[cuentaCodigo] = parsed < 0 ? 0 : parsed;
};

const confirmarPago = async () => {
  if (!isExacto.value) {
    errorMessage.value = 'La suma de montos debe ser exactamente igual al monto objetivo.';
    return;
  }

  let confirmacionHtml = '';
  try {
    confirmacionHtml = await obtenerHtmlConfirmacion();
  } catch (error) {
    await Swal.fire({
      icon: 'error',
      title: 'No se pudo cargar el gasto',
      text: error.message || 'No se pudo obtener la información del gasto para confirmar el pago.',
      confirmButtonColor: '#e11d48'
    });
    return;
  }

  const { isConfirmed } = await Swal.fire({
    icon: 'question',
    title: 'Confirmar pago',
    html: confirmacionHtml,
    showCancelButton: true,
    confirmButtonText: 'Sí, registrar pago',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#0f766e',
    cancelButtonColor: '#64748b',
    width: 620
  });

  if (!isConfirmed) return;

  saving.value = true;
  errorMessage.value = '';

  try {
    const payload = {
      registro_id: Number(props.registro_id),
      tipo_registro: String(props.tipo_registro || '').toLowerCase(),
      monto_objetivo: montoObjetivo.value,
      asignaciones: Object.entries(asignaciones.value)
        .map(([cuenta_codigo, monto]) => ({ cuenta_codigo, monto: roundMoney(monto) }))
        .filter((item) => item.monto > 0)
    };

    const result = await tesoreriaService.registrarPago(payload);

    await Swal.fire({
      icon: 'success',
      title: 'Pago registrado',
      text: result?.message || 'El pago se registró correctamente.',
      confirmButtonColor: '#0f766e'
    });

    emit('paid', result?.data || null);
    emit('close');
  } catch (error) {
    await Swal.fire({
      icon: 'error',
      title: 'Error al registrar pago',
      text: error.message || 'No se pudo registrar el pago.',
      confirmButtonColor: '#e11d48'
    });
    errorMessage.value = error.message || 'No se pudo registrar el pago.';
  } finally {
    saving.value = false;
  }
};

watch(
  () => [props.registro_id, props.tipo_registro, props.monto_objetivo],
  () => {
    loadSaldos();
  }
);

onMounted(() => {
  loadSaldos();
});
</script>

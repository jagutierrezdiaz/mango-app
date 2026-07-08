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
    emit('paid', result?.data || null);
    emit('close');
  } catch (error) {
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

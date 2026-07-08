<template>
  <div class="tesoreria-shell min-h-screen rounded-3xl p-4 md:p-6 lg:p-8">
    <section class="rounded-3xl border border-slate-200/70 bg-white/90 p-5 md:p-6 shadow-sm">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Finanzas · Tesoreria</p>
          <h1 class="text-3xl md:text-4xl font-black tracking-tight text-slate-900">Gestion de Traslados de Arqueo</h1>
          <p class="mt-2 text-sm font-medium text-slate-600 max-w-3xl">
            Administra el dinero de arqueos cerrados y distribuye el efectivo real reportado entre las bolsas operativas.
          </p>
        </div>

        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-700 transition hover:bg-slate-50"
          :disabled="loading"
          @click="loadData"
        >
          <i :class="loading ? 'fas fa-circle-notch fa-spin' : 'fas fa-sync-alt'"></i>
          <span>{{ loading ? 'Actualizando...' : 'Actualizar Datos' }}</span>
        </button>
      </div>
    </section>

    <section class="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      <article
        v-for="card in bolsasCards"
        :key="card.cuenta"
        class="rounded-2xl border p-4 shadow-sm"
        :class="card.tone"
      >
        <p class="text-[10px] uppercase tracking-widest font-black opacity-80">{{ card.titulo }}</p>
        <p class="text-[11px] font-bold opacity-70 mt-1">Cuenta {{ card.cuenta }}</p>
        <p class="mt-3 text-xl font-black num-value">{{ formatMoney(card.saldo) }}</p>
      </article>
    </section>

    <section class="mt-5 grid grid-cols-1 xl:grid-cols-12 gap-4">
      <article class="xl:col-span-7 rounded-3xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
        <div class="flex items-center justify-between gap-3 mb-4">
          <h2 class="text-lg font-black text-slate-800">Arqueos Pendientes de Tesoreria</h2>
          <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
            {{ arqueosPendientes.length }} pendientes
          </span>
        </div>

        <div v-if="loading" class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-500">
          Cargando arqueos pendientes...
        </div>

        <div v-else-if="!arqueosPendientes.length" class="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 px-4 py-10 text-center text-sm font-semibold text-emerald-700">
          No hay arqueos pendientes por trasladar en tesoreria.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="border-b border-slate-200 text-left text-[10px] uppercase tracking-widest text-slate-500">
                <th class="px-3 py-2 font-black">ID Arqueo</th>
                <th class="px-3 py-2 font-black">Fecha</th>
                <th class="px-3 py-2 font-black">Cajero</th>
                <th class="px-3 py-2 font-black text-right">Efectivo Real</th>
                <th class="px-3 py-2 font-black text-right">Transferencias</th>
                <th class="px-3 py-2 font-black text-right">Total Ingresos/Ventas</th>
                <th class="px-3 py-2 font-black text-right">Accion</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in arqueosPendientes"
                :key="row.id"
                class="border-b border-slate-100"
                :class="selectedArqueo?.id === row.id ? 'bg-amber-50/60' : 'bg-white'"
              >
                <td class="px-3 py-3 font-black text-slate-800">#{{ row.id }}</td>
                <td class="px-3 py-3 font-semibold text-slate-600">{{ formatDateTime(row.fecha) }}</td>
                <td class="px-3 py-3 font-semibold text-slate-700">{{ row.cajero }}</td>
                <td class="px-3 py-3 text-right font-black text-slate-900 num-entero">{{ formatMoney(row.efectivo_real_reportado) }}</td>
                <td class="px-3 py-3 text-right font-black text-blue-700 num-entero">{{ formatMoney(row.total_transferencias) }}</td>
                <td class="px-3 py-3 text-right font-black text-slate-900 num-entero">{{ formatMoney(row.efectivo_real_reportado + row.total_transferencias) }}</td>
                <td class="px-3 py-3 text-right">
                  <button
                    type="button"
                    class="rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-wide transition"
                    :class="selectedArqueo?.id === row.id ? 'border-amber-300 bg-amber-100 text-amber-900' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
                    @click="selectArqueo(row)"
                  >
                    {{ selectedArqueo?.id === row.id ? 'Seleccionado' : 'Seleccionar' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="xl:col-span-5 rounded-3xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
        <h2 class="text-lg font-black text-slate-800">Formulario de Distribucion</h2>
        <p class="mt-1 text-xs text-slate-500 font-semibold">Traslado de efectivo real del arqueo seleccionado</p>

        <div v-if="!selectedArqueo" class="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
          Selecciona un arqueo en la tabla para distribuir el efectivo.
        </div>

        <div v-else class="mt-4 space-y-3">
          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p class="text-[10px] uppercase tracking-widest font-black text-slate-500">Arqueo Seleccionado</p>
            <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
              <p class="font-bold text-slate-700">ID: <span class="num-value">#{{ selectedArqueo.id }}</span></p>
              <p class="font-bold text-slate-700">Fecha: <span class="num-value">{{ formatDateTime(selectedArqueo.fecha) }}</span></p>
              <p class="col-span-2 font-bold text-slate-700">Cajero: {{ selectedArqueo.cajero }}</p>
              <p class="col-span-2 font-black text-slate-900">Efectivo Real: {{ formatMoney(selectedArqueo.efectivo_real_reportado) }}</p>
            </div>
          </div>

          <div class="space-y-2">
            <label class="field-label">Caja Operativa</label>
            <input v-model.number="form.caja_menor" type="number" min="0" step="1" class="field-input">
          </div>

          <div class="space-y-2">
            <label class="field-label">Bancos (Cta Ahorros)</label>
            <input v-model.number="form.bancos" type="number" min="0" step="1" class="field-input">
          </div>

          <div class="space-y-2">
            <label class="field-label">Ahorros (Fondo Reserva) </label>
            <input v-model.number="form.ahorros" type="number" min="0" step="1" class="field-input">
          </div>

          <div class="space-y-2">
            <label class="field-label">Caja Punto de Venta</label>
            <input v-model.number="form.caja_general" type="number" min="0" step="1" class="field-input">
          </div>

          <div class="rounded-2xl border p-3" :class="differenceValue === 0 ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'">
            <div class="flex items-center justify-between gap-2 text-sm font-black">
              <span class="text-slate-700">Total Distribuido</span>
              <span class="num-value">{{ formatMoney(totalDistribuido) }}</span>
            </div>
            <div class="mt-2 flex items-center justify-between gap-2 text-sm font-black">
              <span class="text-slate-700">Diferencia</span>
              <span class="num-value" :class="differenceValue === 0 ? 'text-emerald-700' : 'text-amber-700'">{{ formatMoney(differenceValue) }}</span>
            </div>
            <p class="mt-2 text-xs font-semibold" :class="differenceValue === 0 ? 'text-emerald-700' : 'text-amber-700'">
              {{ differenceValue === 0 ? 'La distribución está cuadrada.' : 'La suma debe coincidir con el efectivo real reportado.' }}
            </p>
          </div>

          <button
            type="button"
            class="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="submitting || differenceValue !== 0"
            @click="submitTraslado"
          >
            <i :class="submitting ? 'fas fa-circle-notch fa-spin' : 'fas fa-file-invoice-dollar'"></i>
            <span>{{ submitting ? 'Procesando...' : 'Procesar Traslado a Tesoreria' }}</span>
          </button>
        </div>
      </article>
    </section>
  </div>
</template>

<script>
import { computed, onMounted, ref, shallowRef } from 'vue';
import { tesoreriaService } from '../services/tesoreriaService.js';

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (value) => Number(toNumber(value).toFixed(2));

export default {
  name: 'Tesoreria',
  setup() {
    const loading = ref(false);
    const submitting = ref(false);
    const saldos = ref([]);
    const arqueosPendientes = ref([]);
    const parametrosTesoreria = shallowRef([]);
    const selectedArqueo = ref(null);

    const form = ref({
      caja_menor: 0,
      bancos: 0,
      ahorros: 0,
      caja_general: 0
    });

    const formatMoney = (value) => roundMoney(value).toLocaleString('es-CO', {
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

    const saldoByCuenta = computed(() => {
      return (saldos.value || []).reduce((acc, item) => {
        acc[String(item.cuenta_codigo || '').trim()] = roundMoney(item.saldo_disponible);
        return acc;
      }, {});
    });

    const bolsasCards = computed(() => ([
      {
        titulo: 'Caja Operativa', //Caja Menor
        cuenta: '110510',
        saldo: saldoByCuenta.value['110510'] || 0,
        tone: 'border-amber-200 bg-amber-50 text-amber-900'
      },
      {
        titulo: 'Bancos (Cta Ahorros)',
        cuenta: '111005',
        saldo: saldoByCuenta.value['111005'] || 0,
        tone: 'border-blue-200 bg-blue-50 text-blue-900'
      },
      {
        titulo: 'Ahorros (Reserva)',
        cuenta: '110515',
        saldo: saldoByCuenta.value['110515'] || 0,
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-900'
      },
      {
        titulo: 'Caja Punto de Venta', //Caja General
        cuenta: '110505',
        saldo: saldoByCuenta.value['110505'] || 0,
        tone: 'border-slate-200 bg-slate-50 text-slate-900'
      }
    ]));

    const totalDistribuido = computed(() => roundMoney(
      Number(form.value.caja_menor)
      + Number(form.value.bancos)
      + Number(form.value.ahorros)
      + Number(form.value.caja_general)
    ));

    const differenceValue = computed(() => {
      const efectivoReal = roundMoney(Number(selectedArqueo.value?.efectivo_real_reportado || 0));
      return roundMoney(Number(efectivoReal) - Number(totalDistribuido.value));
    });

    const resetForm = () => {
      const baseCajaMenor = Number(parametrosTesoreria.value?.find(p => p.nombre_parametro === 'base_caja_menor')?.valor_parametro || 0);
      const ahorroReserva = Number(parametrosTesoreria.value?.find(p => p.nombre_parametro === 'ahorro_reserva')?.valor_parametro || 0);

      form.value = {
        caja_menor: baseCajaMenor,
        bancos: 0,
        ahorros: ahorroReserva,
        caja_general: 0
      };
    };

    const loadData = async () => {
      loading.value = true;
      try {
        const [saldosData, arqueosData, parametrosTesoreriaData] = await Promise.all([
          tesoreriaService.getSaldos(),
          tesoreriaService.getArqueosPendientes(),
          tesoreriaService.getParametrosTesoreria()
        ]);
        saldos.value = Array.isArray(saldosData) ? saldosData : [];
        arqueosPendientes.value = Array.isArray(arqueosData) ? arqueosData : [];
        parametrosTesoreria.value = Array.isArray(parametrosTesoreriaData) ? parametrosTesoreriaData : [];

        if (selectedArqueo.value) {
          const stillExists = arqueosPendientes.value.find((item) => item.id === selectedArqueo.value.id);
          if (!stillExists) {
            selectedArqueo.value = null;
            resetForm();
          }
        }
      } catch (error) {
        alert(error.message || 'No se pudo cargar información de tesoreria.');
      } finally {
        loading.value = false;
      }
    };

    const selectArqueo = (row) => {
      selectedArqueo.value = row;
      const baseCajaMenor = Number(parametrosTesoreria.value?.find(p => p.nombre_parametro === 'base_caja_menor')?.valor_parametro || 0);
      const ahorroReserva = Number(parametrosTesoreria.value?.find(p => p.nombre_parametro === 'ahorro_reserva')?.valor_parametro || 0);
      const efectivo = Number(row.efectivo_real_reportado || 0);

      form.value = {
        caja_menor: baseCajaMenor,
        bancos: 0,
        ahorros: ahorroReserva,
        caja_general: Math.max(0, efectivo - (baseCajaMenor + ahorroReserva))
      };
    };

    const submitTraslado = async () => {
      if (!selectedArqueo.value) return;
      if (differenceValue.value !== 0) {
        alert('La distribución debe cuadrar exactamente con el efectivo real reportado.');
        return;
      }

      submitting.value = true;
      try {
        await tesoreriaService.trasladarArqueo({
          arqueo_id: selectedArqueo.value.id,
          distribucion: {
            '110510': roundMoney(form.value.caja_menor),
            '111005': roundMoney(form.value.bancos),
            '110515': roundMoney(form.value.ahorros),
            '110505': roundMoney(form.value.caja_general)
          }
        });

        selectedArqueo.value = null;
        resetForm();
        await loadData();
      } catch (error) {
        alert(error.message || 'No se pudo procesar el traslado a tesoreria.');
      } finally {
        submitting.value = false;
      }
    };

    onMounted(() => {
      loadData();
    });

    return {
      loading,
      submitting,
      saldos,
      arqueosPendientes,
      selectedArqueo,
      form,
      bolsasCards,
      totalDistribuido,
      differenceValue,
      formatMoney,
      formatDateTime,
      loadData,
      selectArqueo,
      submitTraslado
    };
  }
};
</script>

<style scoped>
.tesoreria-shell {
  background:
    radial-gradient(circle at 8% 8%, rgba(14, 116, 144, 0.14) 0, transparent 26%),
    radial-gradient(circle at 92% 10%, rgba(30, 64, 175, 0.1) 0, transparent 28%),
    linear-gradient(180deg, #f8fafc, #f1f5f9);
}

.field-label {
  display: block;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 900;
  color: #64748b;
}

.field-input {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 0.9rem;
  padding: 0.72rem 0.85rem;
  outline: none;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
  background: #fff;
}

.field-input:focus {
  border-color: #0f766e;
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.18);
}

.num-value {
  font-variant-numeric: tabular-nums;
}
</style>

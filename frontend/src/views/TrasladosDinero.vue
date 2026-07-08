<template>
  <div v-if="open" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" @click.self="closeModal">
    <div class="w-full max-w-4xl h-auto max-h-[90vh] overflow-y-auto rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.22)] flex flex-col">
      <div class="border-b border-slate-200 bg-[linear-gradient(135deg,#ecfeff,#f8fafc)] px-5 py-4 md:px-6 md:py-5 flex items-start justify-between gap-4">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.22em] text-teal-600">Finanzas · Traslados</p>
          <h3 class="mt-1 text-2xl font-black italic tracking-tight text-slate-900">Traslados de Dinero</h3>
          <p class="mt-2 text-sm font-medium text-slate-600">Formulario para distribuir efectivo entre cuentas operativas.</p>
        </div>
        <button @click="closeModal" class="h-10 w-10 shrink-0 rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <form @submit.prevent="submitTraslado" class="flex flex-col p-4 md:p-6">
        <div class="traslados-dinero-view p-4 md:p-6 max-w-6xl mx-auto w-full">
          <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

            <div class="space-y-6">
              <div class="grid grid-cols-1 gap-4">
                <div v-for="card in bolsasCards" :key="card.key" class="relative">
                  <label class="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {{ card.label }}
                  </label>
                  <div class="relative">
                    <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      v-model.number="form[card.key]"
                      type="number"
                      step="0.01"
                      :readonly="card.key === 'caja_punto_venta_inicial'"
                      :class="[
                        'w-full rounded-2xl border border-slate-200 py-3 pl-8 pr-4 text-sm font-bold outline-none transition focus:ring-4',
                        card.key === 'caja_punto_venta_inicial' 
                          ? 'bg-slate-100 text-slate-500 cursor-not-allowed' 
                          : 'bg-slate-50/50 focus:border-teal-500 focus:ring-teal-50'
                      ]"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div class="rounded-2xl bg-slate-900 p-5 text-white">
                <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div class="space-y-1">
                    <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Distribuido</p>
                    <p class="text-2xl font-black">{{ formatMoney(totalDistribuido) }}</p>
                  </div>
                  
                  <div class="h-px w-full bg-slate-800 sm:h-10 sm:w-px"></div>

                  <div class="space-y-1">
                    <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Diferencia</p>
                    <p :class="['text-2xl font-black', differenceValue === 0 ? 'text-teal-400' : 'text-rose-400']">
                      {{ formatMoney(differenceValue) }}
                    </p>
                  </div>

                  <button
                    type="submit"
                    :disabled="submitting || differenceValue !== 0 || !selectedArqueo"
                    class="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-teal-600 disabled:opacity-30 disabled:grayscale"
                  >
                    <i :class="submitting ? 'fas fa-circle-notch fa-spin' : 'fas fa-exchange-alt'"></i>
                    <span>{{ submitting ? 'Procesando...' : 'Procesar Traslado' }}</span>
                  </button>
                </div>
                <p v-if="differenceValue !== 0" class="mt-3 text-center text-[9px] font-bold uppercase tracking-widest text-rose-300">
                  * El total distribuido debe coincidir exactamente con el efectivo real
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-white/95 px-4 pb-4 pt-4 backdrop-blur md:-mx-6 md:px-6">
          <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-sm font-semibold text-slate-500">Asegúrate que el total coincida antes de procesar.</p>
            <div class="flex items-center justify-end gap-3">
              <button type="button" @click="closeModal" class="px-5 py-2 text-xs font-bold uppercase text-slate-500 hover:text-slate-700">Cancelar</button>

            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { ref, computed, toRefs, toRef, watch } from 'vue';
import { getSaldoCajaGeneral, getBaseCajaVenta, getBaseAhorro } from '../services/trasladosDinerosServices';
import { tesoreriaService } from '../services/tesoreriaService.js';

export default {
  name: 'TrasladosDinero',
  props: {
    open: { type: Boolean, default: false },
    selectedArqueoProp: {
      type: Object,
      default: () => ({ id: null, efectivo_real: 0 })
    }
  },
  emits: ['close', 'processed'],
  setup(props, { emit }) {
    const { selectedArqueoProp } = toRefs(props);
    const open = toRef(props, 'open');

    const selectedArqueo = ref(selectedArqueoProp.value || { id: null, efectivo_real: 0 });
    const submitting = ref(false);

    const form = ref({
      caja_punto_venta_inicial: 0,
      caja_operativa: 0,
      bancos: 0,
      ahorros: 0
    });

    // Secuencia Vertical Solicitada
    const bolsasCards = [
      { key: 'caja_punto_venta_inicial', label: 'Caja Punto de Venta - Inicial' }, // (110505)
      { key: 'caja_operativa', label: 'Caja Operativa ' }, //(110510)
      { key: 'bancos', label: 'Bancos (Cta Ahorros)' }, //(111005)
      { key: 'ahorros', label: 'Ahorros (Reserva)' },  // (110515)
      { key: 'caja_punto_venta_final', label: 'Caja Punto de Venta - Final' } // (110505)
    ];

    const cargarSaldoBase = async () => {
      try {
        console.log("🚀 [Traslados] Iniciando carga de saldos y parámetros...");

        // Ejecutamos las tres llamadas en paralelo para mayor velocidad
        const [saldo, basePuntoVenta, baseAhorro] = await Promise.all([
          getSaldoCajaGeneral(),
          getBaseCajaVenta(),
          getBaseAhorro()
        ]);

        // Logs de depuración para verificar los valores recibidos
        console.log("📊 [Traslados] Datos recibidos:", {
          saldoCajaGeneral: saldo,
          parametroBaseVenta: basePuntoVenta,
          parametroBaseAhorro: baseAhorro 
        });


      // --- Asignación lógica al formulario ---
      //| Cuenta | Nombre                   |
      //| ------ | ------------------------ |
      //| 110505 | Caja Punto de Venta      |
      //| 110510 | Caja Principal Operativa |
      // 1. Asignación directa del saldo inicial
      form.value.caja_punto_venta_inicial = saldo; 

      // 2. Lógica condicional para Caja Operativa
      if ((saldo - basePuntoVenta - baseAhorro) >= 0) {
          // Caso ideal: el saldo cubre ambas bases
          form.value.caja_operativa = (saldo - basePuntoVenta - baseAhorro);
      } else if ((saldo - basePuntoVenta) >= 0) {
          // Caso parcial: el saldo solo cubre la base del punto de venta
          form.value.caja_operativa = (saldo - basePuntoVenta);
      } else {
          // Caso crítico: el saldo no alcanza a cubrir ni la base mínima
          form.value.caja_operativa = 0;
      }

      // 3. Asignación de Ahorros
      form.value.ahorros = baseAhorro;

      // 4. Asignación de Caja Final (Base establecida)
      form.value.caja_punto_venta_final = basePuntoVenta;

      // Console.log para verificar el resultado de la lógica en el navegador
      console.log("⚖️ [Lógica] Distribución calculada:", {
          inicial: form.value.caja_punto_venta_inicial,
          calculo_operativa: form.value.caja_operativa,
          ahorros: form.value.ahorros,
          final_base: form.value.caja_punto_venta_final
      });

        console.log("✅ [Traslados] Formulario actualizado correctamente.");
        
      } catch (error) {
        console.error("❌ [Traslados] Error crítico al cargar datos base:", error);
      }
    };

    // Observar apertura del modal para actualizar datos
    watch(open, (isOpen) => {
      if (isOpen) {
        // Reiniciar campos de distribución para evitar errores de suma
        form.value.caja_operativa = 0;
        form.value.bancos = 0;
        form.value.ahorros = 0;

        cargarSaldoBase();
      }
    });

    watch(selectedArqueoProp, (val) => {
      selectedArqueo.value = val || { id: null, efectivo_real: 0 };
    });

    const formatMoney = (val) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(val || 0);
    };

    // El total distribuido ahora SOLO suma las bolsas donde el usuario ingresa dinero
    const totalDistribuido = computed(() => {
      return (form.value.caja_operativa || 0) +
            (form.value.bancos || 0) +
            (form.value.ahorros || 0) +
            (form.value.caja_punto_venta_final);
    });

    const differenceValue = computed(() => {
      const del_saldo_inicial = form.value.caja_punto_venta_inicial || 0;
      const diferencia = del_saldo_inicial - totalDistribuido.value;

      console.log("⚖️ [Computed] Cálculo de Diferencia:", {
        del_saldo_inicial: del_saldo_inicial,
        menos_distribuido: totalDistribuido.value,
        resultado_diferencia: diferencia
      });

      return diferencia;
    });

    const closeModal = () => {
      emit('close');
    };

    const submitTraslado = async () => {
    if (differenceValue.value !== 0) return;
    // ELIMINADO: if (!selectedArqueo.value?.id) ... (Ya no es necesario)
    
    submitting.value = true;
    try {
      const payload = {
        descripcion: "Traslado interno de saldos de caja",
        distribucion: {
          '110510': Number(form.value.caja_operativa || 0),
          '111005': Number(form.value.bancos || 0),
          '110515': Number(form.value.ahorros || 0),
          '110505': Number(form.value.caja_punto_venta_inicial || 0)
        }
      };

      // Ahora la función ya existirá en el servicio
      await tesoreriaService.ejecutarTrasladoContable(payload);

      // 2. Mensaje de éxito para el usuario
      alert('✅ Traslado de dinero realizado con éxito');

      console.log("✅ Traslado contable ejecutado");

      emit('processed', { distribucion: { ...form.value } });
      emit('close');

    } catch (error) {
      console.error('Error:', error);
      alert(error?.message || 'Error al procesar el traslado');
    } finally {
      submitting.value = false;
    }
  };
    return {
      open,
      selectedArqueo,
      form,
      bolsasCards,
      submitting,
      totalDistribuido,
      differenceValue,
      formatMoney,
      submitTraslado,
      closeModal
    };
  }
};
</script>
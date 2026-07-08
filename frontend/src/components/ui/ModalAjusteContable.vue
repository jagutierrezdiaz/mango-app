<template>
  <div class="modal-backdrop fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div class="modal-card bg-white rounded-lg p-4 w-full max-w-2xl">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-bold">Registrar Ajuste — {{ data?.title }}</h3>
        <button @click="$emit('close')">✕</button>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-bold">Cuenta Débito (PUC)</label>
          <div class="relative">
            <input v-model="cuentaDebito" @input="onInputDebito" class="input" placeholder="Ej: 143501" autocomplete="off" />
            <ul v-if="suggestionsDebito && suggestionsDebito.length" class="absolute left-0 right-0 bg-white border mt-1 max-h-44 overflow-auto z-40">
              <li v-for="(s, idx) in suggestionsDebito" :key="'d-'+idx" class="px-3 py-2 hover:bg-slate-50 cursor-pointer" @click="selectDebito(s)">{{ s.etiqueta }}</li>
            </ul>
          </div>
        </div>
        <div>
          <label class="block text-xs font-bold">Cuenta Crédito (PUC)</label>
          <div class="relative">
            <input v-model="cuentaCredito" @input="onInputCredito" class="input" placeholder="Ej: 110505" autocomplete="off" />
            <ul v-if="suggestionsCredito && suggestionsCredito.length" class="absolute left-0 right-0 bg-white border mt-1 max-h-44 overflow-auto z-40">
              <li v-for="(s, idx) in suggestionsCredito" :key="'c-'+idx" class="px-3 py-2 hover:bg-slate-50 cursor-pointer" @click="selectCredito(s)">{{ s.etiqueta }}</li>
            </ul>
          </div>
        </div>
        <div>
          <label class="block text-xs font-bold">Monto</label>
          <input v-model.number="monto" type="number" class="input" />
        </div>
        <div>
          <label class="block text-xs font-bold">Descripción</label>
          <input v-model="descripcion" class="input" />
        </div>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button class="btn" @click="$emit('close')">Cancelar</button>
        <button class="primary-btn" @click="registrar" :disabled="processing">Registrar</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { ajustesContablesService } from '../../services/ajustesContablesService.js';

export default {
  name: 'ModalAjusteContable',
  props: ['moduleKey', 'data'],
  setup(props, { emit }) {
    const cuentaDebito = ref('');
    const cuentaCredito = ref('');
    const monto = ref(0);
    const descripcion = ref('Ajuste manual');
    const processing = ref(false);
    const suggestionsDebito = ref([]);
    const suggestionsCredito = ref([]);
    let debounceTimerD = null;
    let debounceTimerC = null;

    const getSuggestedDefaults = () => {
      const diff = Number(props.data?.diferencia || 0);
      const positive = diff > 0;
      switch (props.moduleKey) {
        case 'inventarios':
          return positive ? { debito: '143501', credito: '429580' } : { debito: '539595', credito: '143501' };
        case 'cajaOperativa':
          return positive ? { debito: '110505', credito: '429580' } : { debito: '539595', credito: '110505' };
        case 'cajaGeneral':
          return positive ? { debito: '110510', credito: '429580' } : { debito: '539595', credito: '110510' };
        case 'bancos':
          return positive ? { debito: '111005', credito: '429580' } : { debito: '539595', credito: '111005' };
        default:
          return positive ? { debito: '110505', credito: '429580' } : { debito: '539595', credito: '110505' };
      }
    };

    onMounted(() => {
      // prefill monto and suggested cuentas when modal opens
      const diff = Number(props.data?.diferencia || 0);
      if (Math.abs(diff) > 0.01) monto.value = Math.abs(diff);
      const suggested = getSuggestedDefaults();
      cuentaDebito.value = suggested.debito || '';
      cuentaCredito.value = suggested.credito || '';
    });

    const registrar = async () => {
      processing.value = true;
      try {
        await ajustesContablesService.registrarAjuste({
          cuentaDebito: cuentaDebito.value,
          cuentaCredito: cuentaCredito.value,
          monto: monto.value,
          descripcion: descripcion.value
        });
        alert('Ajuste registrado');
        emit('saved');
      } catch (e) {
        console.error(e);
        alert(e?.response?.data?.message || e.message || 'Error');
      } finally { processing.value = false; }
    };

    const doSearchDebito = async (q) => {
      if (!q || String(q || '').trim().length < 1) { suggestionsDebito.value = []; return; }
      try {
        const res = await ajustesContablesService.searchPuc(q);
        suggestionsDebito.value = res || [];
      } catch (e) { suggestionsDebito.value = []; }
    };

    const doSearchCredito = async (q) => {
      if (!q || String(q || '').trim().length < 1) { suggestionsCredito.value = []; return; }
      try {
        const res = await ajustesContablesService.searchPuc(q);
        suggestionsCredito.value = res || [];
      } catch (e) { suggestionsCredito.value = []; }
    };

    const onInputDebito = (e) => {
      clearTimeout(debounceTimerD);
      const q = e.target.value || '';
      debounceTimerD = setTimeout(() => doSearchDebito(q), 300);
    };

    const onInputCredito = (e) => {
      clearTimeout(debounceTimerC);
      const q = e.target.value || '';
      debounceTimerC = setTimeout(() => doSearchCredito(q), 300);
    };

    const selectDebito = (s) => {
      cuentaDebito.value = s.codigo;
      suggestionsDebito.value = [];
    };

    const selectCredito = (s) => {
      cuentaCredito.value = s.codigo;
      suggestionsCredito.value = [];
    };

    return { cuentaDebito, cuentaCredito, monto, descripcion, processing, registrar,
      suggestionsDebito, suggestionsCredito, onInputDebito, onInputCredito, selectDebito, selectCredito };
  }
};
</script>

<style scoped>
.modal-backdrop{ }
.modal-card{ box-shadow:0 10px 30px rgba(2,6,23,0.2) }
.input{ width:100%; padding:0.5rem; border:1px solid #e2e8f0; border-radius:0.5rem }
.btn{ padding:0.5rem 0.9rem; border-radius:0.5rem; background:#e6eef2 }
.primary-btn{ padding:0.5rem 0.9rem; border-radius:0.5rem; background:linear-gradient(135deg,#0f766e,#115e59); color:#fff }
</style>

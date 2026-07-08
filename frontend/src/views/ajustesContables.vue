<template>
  <div class="ajustes-view admin-crud-shell min-h-screen w-full max-w-7xl p-4 md:p-6 mx-auto">
    <div class="mb-6 border-b border-slate-200 pb-4">
      <h1 class="admin-crud-title text-3xl font-black text-teal-700 italic uppercase tracking-tighter">AJUSTES CONTABLES</h1>
      <p class="admin-crud-subtitle text-[10px] uppercase tracking-widest font-black">Patio Bohemio / Monitor de Ajustes Operativos</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="conc-card" v-for="(item, key) in modules" :key="key">
        <div class="flex items-start justify-between">
          <div>
            <p class="conc-title">{{ item.title }}</p>
            <p class="conc-subtitle">{{ item.subtitle }}</p>
          </div>
          <span class="conc-badge" :class="badgeClass(item.diferencia)">{{ badgeText(item.diferencia) }}</span>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-3">
          <div class="conc-kpi">
            <p class="conc-kpi-label">Saldo Operativo</p>
            <p class="conc-kpi-value">{{ formatMoney(item.operativo) }}</p>
          </div>
          <div class="conc-kpi">
            <p class="conc-kpi-label">Saldo Contable</p>
            <p class="conc-kpi-value">{{ formatMoney(item.contable) }}</p>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-2">
          <div class="conc-kpi">
            <p class="conc-kpi-label">Diferencia</p>
            <p class="conc-kpi-value" :class="Math.abs(item.diferencia) < 0.01 ? 'text-emerald-700' : 'text-rose-700'">{{ formatMoney(item.diferencia) }}</p>
          </div>
        </div>

        <div class="mt-4 flex justify-end">
          <button class="primary-btn" @click="openModal(key)" :disabled="Math.abs(item.diferencia) < 0.01">
            <i class="fas fa-adjust"></i>
            <span>Registrar Ajuste</span>
          </button>
        </div>
      </div>
    </div>

    <ModalAjusteContable v-if="showModal" :module-key="activeKey" :data="modules[activeKey]" @close="closeModal" @saved="onSaved" />
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import ModalAjusteContable from '../components/ui/ModalAjusteContable.vue';
import { ajustesContablesService } from '../services/ajustesContablesService.js';

export default {
  name: 'AjustesContables',
  components: { ModalAjusteContable },
  setup() {
    const modules = ref({
      inventarios: { title: 'Inventarios', subtitle: 'Valor operativo vs contable', operativo: 0, contable: 0, diferencia: 0 },
      cajaOperativa: { title: 'Caja Operativa', subtitle: 'Saldo físico vs contable', operativo: 0, contable: 0, diferencia: 0 },
      cajaGeneral: { title: 'Caja General', subtitle: 'Saldo operativo vs contable', operativo: 0, contable: 0, diferencia: 0 },
      bancos: { title: 'Bancos', subtitle: 'Saldo banco vs contable', operativo: 0, contable: 0, diferencia: 0 }
    });

    const showModal = ref(false);
    const activeKey = ref(null);

    const loadResumen = async () => {
      try {
        const res = await ajustesContablesService.getResumen();
        if (res && res.data) {
          modules.value.inventarios.operativo = res.data.inventarios.operativo;
          modules.value.inventarios.contable = res.data.inventarios.contable;
          modules.value.inventarios.diferencia = res.data.inventarios.diferencia;

          modules.value.cajaOperativa.operativo = res.data.cajaOperativa.operativo;
          modules.value.cajaOperativa.contable = res.data.cajaOperativa.contable;
          modules.value.cajaOperativa.diferencia = res.data.cajaOperativa.diferencia;

          modules.value.cajaGeneral.operativo = res.data.cajaGeneral.operativo;
          modules.value.cajaGeneral.contable = res.data.cajaGeneral.contable;
          modules.value.cajaGeneral.diferencia = res.data.cajaGeneral.diferencia;

          modules.value.bancos.operativo = res.data.bancos.operativo;
          modules.value.bancos.contable = res.data.bancos.contable;
          modules.value.bancos.diferencia = res.data.bancos.diferencia;
        }
      } catch (e) {
        console.error('Error loading resumen ajustes', e);
      }
    };

    onMounted(loadResumen);

    const formatMoney = (v) => Number(v || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const badgeText = (d) => Math.abs(d) < 0.01 ? 'OK' : 'DIFERENCIA';
    const badgeClass = (d) => Math.abs(d) < 0.01 ? 'border-emerald-300 bg-emerald-100 text-emerald-700' : 'border-rose-300 bg-rose-100 text-rose-700';

    const openModal = (key) => { activeKey.value = key; showModal.value = true; };
    const closeModal = () => { showModal.value = false; activeKey.value = null; };

    const onSaved = () => { closeModal(); loadResumen(); };

    return { modules, showModal, activeKey, openModal, closeModal, onSaved, formatMoney, badgeText, badgeClass };
  }
};
</script>

<style scoped>
.conc-card { border-width:1px; border-style:solid; border-radius:1.2rem; padding:1rem; background:#fff; box-shadow:0 8px 20px rgba(15,23,42,0.06);} 
.conc-title{font-weight:900}
.conc-subtitle{font-weight:700;color:#475569}
.conc-badge{display:inline-flex;padding:0.25rem 0.6rem;border-radius:999px;font-weight:900;font-size:0.65rem}
.conc-kpi{border:1px solid #e6eef2;border-radius:0.9rem;padding:0.6rem;background:#fff}
.primary-btn{border:1px solid #0f766e;background:linear-gradient(135deg,#0f766e,#115e59);color:#fff;padding:0.6rem 1rem;border-radius:999px}
</style>

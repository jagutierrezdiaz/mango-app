<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn px-4">
    <div class="bg-white rounded-[2.25rem] shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-white/20">
      <div class="bg-teal-700 p-6 text-white flex justify-between items-center sticky top-0 z-20">
        <div>
          <h3 class="text-xs font-black uppercase tracking-[0.2em] italic">{{ isEdit ? 'Editar' : 'Nuevo' }} Movimiento</h3>
          <p class="text-[10px] uppercase tracking-[0.16em] mt-1 text-teal-50/90">Inventario manual de Patio Bohemio</p>
        </div>
        <button @click="emitClose" class="pb-btn pb-btn-secondary btn-icon-text px-3 py-1.5 text-[10px]">
          <i class="fas fa-times"></i>
          <span>Cerrar</span>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="p-8 space-y-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Tipo de Movimiento</label>
            <select v-model="form.tipo" @change="onTipoChange" required class="field-control">
              <option v-for="option in movementTypes" :key="option.value" :value="option.value" :disabled="option.value === 'ENTRADA' && articuloTieneMovimientos">{{ option.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Sucursal</label>
            <select v-model="form.sucursal_id" required class="field-control">
              <option v-for="option in branchOptions" :key="option.id" :value="String(option.id)">{{ option.nombre }}</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Artículo</label>
            <select v-model="form.articulo_id" @change="onArticuloChange" required class="field-control">
              <option value="">Seleccione artículo</option>
              <option v-for="articulo in articulos" :key="articulo.id" :value="String(articulo.id)">{{ articulo.nombre }}</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Fecha y Hora</label>
            <input v-model="form.fecha_movimiento" type="datetime-local" required class="field-control">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Cantidad</label>
            <input v-model="form.cantidad" type="number" min="0" step="1" required class="field-control text-right">
          </div>
          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Costo Unitario</label>
            <input
              v-model="form.costo_unitario"
              type="number"
              min="0"
              step="1"
              :readonly="!requiresCost"
              :class="['field-control text-right', !requiresCost ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : '']"
            >
          </div>
          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Unidad</label>
            <input :value="selectedArticle?.unidad_medida || '---'" type="text" readonly class="field-control bg-slate-100 text-slate-500 uppercase">
          </div>
        </div>

        <div>
          <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Documento Referencia</label>
          <input v-model="form.documento_referencia" type="text" maxlength="40" class="field-control" placeholder="Ej: Inventario inicial abril">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p class="text-[9px] uppercase font-black tracking-widest text-slate-500">Stock Actual</p>
            <p class="mt-2 text-lg font-black text-slate-800">{{ formatQuantity(selectedArticle?.stock_actual) }} {{ selectedArticle?.unidad_medida || '' }}</p>
          </div>
          <div class="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3">
            <p class="text-[9px] uppercase font-black tracking-widest text-cyan-700">Costo Promedio Vigente</p>
            <p class="mt-2 text-lg font-black text-cyan-800">{{ formatMoney(selectedArticle?.costo_unitario) }}</p>
          </div>
        </div>

        <div class="rounded-2xl border px-4 py-3 text-sm font-semibold" :class="requiresCost ? 'border-teal-200 bg-teal-50 text-teal-800' : 'border-amber-200 bg-amber-50 text-amber-800'">
          {{ helperText }}
        </div>

        <div v-if="errorMessage" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {{ errorMessage }}
        </div>

        <div class="flex gap-3 pt-4">
          <button type="button" @click="emitClose" class="btn-modal-cancel pb-btn-unified flex-1 py-3 text-[10px]">
            <i class="fas fa-times"></i>
            <span>Cancelar</span>
          </button>
          <button type="submit" :disabled="saving" class="btn-modal-save pb-btn-unified flex-1 py-3 text-[10px] disabled:opacity-50">
            <i :class="saving ? 'fas fa-circle-notch fa-spin' : 'fas fa-save'"></i>
            <span>{{ saving ? 'Guardando...' : 'Guardar' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { computed, onUnmounted, ref, watch } from 'vue';
import { articuloService } from '../services/articuloService.js';
import { kardexArticulosService } from '../services/kardexArticulosService.js';

const movementTypes = [
  { value: 'ENTRADA', label: 'Inicial' },
  { value: 'AJUSTE', label: 'Ajuste' },
  { value: 'DEVOLUCION', label: 'Devolución' }
];

const toDateTimeLocal = (value) => {
  if (!value) {
    const now = new Date();
    const local = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    return local.toISOString().slice(0, 16);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return local.toISOString().slice(0, 16);
};

export default {
  name: 'MovimientoKardexArticulos',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    movimiento: {
      type: Object,
      default: null
    },
    sucursales: {
      type: Array,
      default: () => []
    },
    movimientos: {
      type: Array,
      default: () => []
    }
  },
  emits: ['close', 'saved'],
  setup(props, { emit }) {
    const articulos = ref([]);
    const saving = ref(false);
    const errorMessage = ref('');
    const isDisposed = ref(false);

    const getDefaultSucursalId = () => {
      const ids = [1];
      for (const item of props.sucursales || []) {
        const id = Number(item?.id || item?.sucursal_id);
        if (Number.isInteger(id) && id > 0) ids.push(id);
      }
      return String(Math.min(...ids));
    };

    const getInitialForm = (overrides = {}) => ({
      articulo_id: '',
      sucursal_id: getDefaultSucursalId(),
      tipo: 'ENTRADA',
      fecha_movimiento: toDateTimeLocal(),
      cantidad: '0',
      costo_unitario: '0.00',
      documento_referencia: '',
      ...overrides
    });

    const form = ref(getInitialForm());

    const branchOptions = computed(() => {
      const map = new Map();
      map.set(1, { id: 1, nombre: 'Sucursal 1' });
      for (const item of props.sucursales || []) {
        const id = Number(item.id || item.sucursal_id);
        if (!Number.isInteger(id) || id <= 0) continue;
        map.set(id, {
          id,
          nombre: item.nombre || `Sucursal ${id}`
        });
      }
      return Array.from(map.values()).sort((a, b) => a.id - b.id);
    });

    const isEdit = computed(() => !!props.movimiento?.id);
    const requiresCost = computed(() => form.value.tipo === 'ENTRADA');

    const articuloTieneMovimientos = computed(() => {
      if (!form.value.articulo_id || isEdit.value) return false;
      return props.movimientos.some(
        (m) => Number(m.articulo_id) === Number(form.value.articulo_id)
      );
    });

    const selectedArticle = computed(() => articulos.value.find(
      (item) => Number(item.id) === Number(form.value.articulo_id)
    ) || null);

    const helperText = computed(() => {
      if (requiresCost.value) {
        return 'Las entradas iniciales crean stock y valorización. El costo unitario define el nuevo saldo promedio.';
      }
      return 'Los ajustes y devoluciones descuentan existencias usando el costo promedio vigente. El sistema bloqueará saldos negativos.';
    });

    const formatMoney = (value) => Number(value || 0).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    const formatQuantity = (value) => Number(value || 0).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    const resetForm = () => {
      form.value = getInitialForm();
      errorMessage.value = '';
    };

    const resetFormOnSelectorChange = (overrides = {}) => {
      // Reinicia el formulario completo y conserva el selector que disparo el cambio.
      form.value = getInitialForm({
        sucursal_id: form.value.sucursal_id,
        ...overrides
      });
      errorMessage.value = '';
    };

    const onArticuloChange = () => {
      if (isEdit.value) return;
      resetFormOnSelectorChange({
        articulo_id: String(form.value.articulo_id || ''),
        tipo: String(form.value.tipo || 'ENTRADA')
      });
    };

    const onTipoChange = () => {
      if (isEdit.value) return;
      resetFormOnSelectorChange({
        tipo: String(form.value.tipo || 'ENTRADA'),
        articulo_id: String(form.value.articulo_id || '')
      });
    };

    const hydrateForm = () => {
      if (!props.movimiento) {
        resetForm();
        return;
      }

      form.value = {
        articulo_id: String(props.movimiento.articulo_id || ''),
        sucursal_id: String(props.movimiento.sucursal_id || 1),
        tipo: props.movimiento.tipo_movimiento || 'ENTRADA',
        fecha_movimiento: toDateTimeLocal(props.movimiento.fecha_movimiento),
        cantidad: String(props.movimiento.tipo_movimiento === 'ENTRADA' ? props.movimiento.cant_entrada : props.movimiento.cant_salida || 0),
        costo_unitario: String(props.movimiento.costo_entrada || props.movimiento.saldo_costo_unitario || 0),
        documento_referencia: props.movimiento.documento_referencia_visible || ''
      };
      errorMessage.value = '';
    };

    const loadArticulos = async () => {
      try {
        const data = await articuloService.getAll();
        if (isDisposed.value) return;
        articulos.value = data;
      } catch (error) {
        if (isDisposed.value) return;
        console.error(error);
        articulos.value = [];
        errorMessage.value = error.message || 'No fue posible cargar los artículos.';
      }
    };

    const emitClose = () => {
      errorMessage.value = '';
      emit('close');
    };

    const handleSubmit = async () => {
      errorMessage.value = '';
      saving.value = true;

      try {
        const payload = {
          articulo_id: Number(form.value.articulo_id),
          sucursal_id: Number(form.value.sucursal_id || 1),
          tipo_movimiento: form.value.tipo,
          fecha_movimiento: form.value.fecha_movimiento,
          documento_referencia: form.value.documento_referencia,
          cantidad: Number(form.value.cantidad),
          costo_unitario: requiresCost.value ? Number(form.value.costo_unitario) : 0
        };

        await kardexArticulosService.saveManualMovimiento(payload, props.movimiento?.id);
        emit('saved');
      } catch (error) {
        errorMessage.value = error.message || 'No se pudo guardar el movimiento.';
      } finally {
        saving.value = false;
      }
    };

    watch(() => props.visible, async (value) => {
      if (!value) return;
      if (!articulos.value.length) {
        await loadArticulos();
      }
      if (isDisposed.value) return;
      hydrateForm();
    });

    watch(requiresCost, (value) => {
      if (!value) {
        form.value.costo_unitario = selectedArticle.value?.costo_unitario
          ? String(selectedArticle.value.costo_unitario)
          : '0.00';
      }
    });

    watch(selectedArticle, (article) => {
      if (!article || requiresCost.value || isEdit.value) return;
      form.value.costo_unitario = String(article.costo_unitario || 0);
    });

    onUnmounted(() => {
      isDisposed.value = true;
    });

    return {
      articulos,
      articuloTieneMovimientos,
      branchOptions,
      errorMessage,
      form,
      formatMoney,
      formatQuantity,
      handleSubmit,
      helperText,
      isEdit,
      movementTypes,
      emitClose,
      onArticuloChange,
      onTipoChange,
      requiresCost,
      saving,
      selectedArticle
    };
  }
};
</script>

<style scoped>
.field-control {
  width: 100%;
  padding: 0.85rem 1rem;
  background: rgb(248 250 252 / 1);
  border: 1px solid rgb(226 232 240 / 1);
  border-radius: 1rem;
  outline: none;
  transition: border-color 120ms ease, box-shadow 120ms ease, background 120ms ease;
  font-size: 0.95rem;
  font-weight: 600;
  color: rgb(30 41 59 / 1);
}

.field-control:focus {
  border-color: rgb(13 148 136 / 1);
  box-shadow: 0 0 0 3px rgb(204 251 241 / 1);
  background: white;
}
</style>
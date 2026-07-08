<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn px-4">
    <div class="bg-white rounded-[2.25rem] shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto border border-white/20">
      <div class="bg-slate-900 p-6 text-white flex justify-between items-center sticky top-0 z-20">
        <div>
          <h3 class="text-xs font-black uppercase tracking-[0.2em] italic">Detalle de Compra</h3>
          <p class="text-[10px] uppercase tracking-[0.16em] mt-1 text-slate-300">Trazabilidad documental del movimiento</p>
        </div>
        <button @click="$emit('close')" class="pb-btn pb-btn-secondary btn-icon-text px-3 py-1.5 text-[10px]">
          <i class="fas fa-times"></i>
          <span>Cerrar</span>
        </button>
      </div>

      <div class="p-6 md:p-8">
        <div v-if="loading" class="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-12 text-center text-[11px] uppercase tracking-[0.18em] font-black text-slate-400">
          Cargando compra...
        </div>

        <div v-else-if="errorMessage" class="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
          {{ errorMessage }}
        </div>

        <div v-else-if="compra" class="space-y-5">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div class="summary-card md:col-span-2">
              <p class="summary-label">Proveedor</p>
              <p class="summary-value text-slate-800">{{ compra.proveedor_razon_social || 'Sin proveedor' }}</p>
            </div>
            <div class="summary-card">
              <p class="summary-label">Factura / Documento</p>
              <p class="summary-value">{{ compra.numero_documento || '---' }}</p>
            </div>
            <div class="summary-card">
              <p class="summary-label">Estado</p>
              <p class="summary-value" :class="estadoClass">{{ compra.estado_pago || 'Pendiente' }}</p>
            </div>
            <div class="summary-card">
              <p class="summary-label">Fecha Compra y Hora</p>
              <p class="summary-value">{{ formatDate(compra.fecha_compra) }}</p>
            </div>
            <div class="summary-card">
              <p class="summary-label">Forma de Pago</p>
              <p class="summary-value">{{ compra.forma_pago || 'Contado' }}</p>
            </div>
            <div class="summary-card">
              <p class="summary-label">Subtotal</p>
              <p class="summary-value">{{ formatMoney(compra.subtotal) }}</p>
            </div>
            <div class="summary-card">
              <p class="summary-label">Total a Pagar</p>
              <p class="summary-value text-teal-700">{{ formatMoney(compra.total_pagar) }}</p>
            </div>
          </div>

          <div class="rounded-[1.9rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div class="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h4 class="text-[11px] uppercase tracking-[0.18em] font-black text-slate-500">Artículos de la Compra</h4>
                <p class="text-sm font-semibold text-slate-700 mt-1">{{ compra.detalles?.length || 0 }} items registrados</p>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="min-w-full audit-table">
                <thead>
                  <tr>
                    <th>Artículo</th>
                    <th>Cantidad</th>
                    <th>Costo Unitario</th>
                    <th>IVA</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="detalle in compra.detalles || []" :key="detalle.id">
                    <td>
                      <div class="font-black text-slate-800">{{ detalle.articulo_nombre }}</div>
                      <div class="text-[11px] font-semibold text-slate-500 uppercase">{{ detalle.unidad_abreviatura || 'UND' }}</div>
                    </td>
                    <td>{{ formatQuantity(detalle.cantidad) }}</td>
                    <td class="num-entero">{{ formatMoney(detalle.costo_unitario) }}</td>
                    <td>{{ formatPercent(detalle.iva_porcentaje) }}</td>
                    <td class="font-black text-slate-800 num-entero">{{ formatMoney(detalle.valor_subtotal) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-700">
            {{ compra.observaciones || 'Sin observaciones registradas para esta compra.' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, watch } from 'vue';
import { compraService } from '../services/compraService.js';

export default {
  name: 'CompraKardexDetalleModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    compraId: {
      type: Number,
      default: null
    }
  },
  emits: ['close'],
  setup(props) {
    const loading = ref(false);
    const compra = ref(null);
    const errorMessage = ref('');

    const parseNumber = (value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const formatMoney = (value) => parseNumber(value).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    const formatQuantity = (value) => parseNumber(value).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    const formatPercent = (value) => `${parseNumber(value).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}%`;

    const formatDate = (value) => {
      if (!value) return '---';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        const raw = String(value).trim().replace('T', ' ').slice(0, 16);
        const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2})$/);
        if (!match) return raw;
        const [, year, month, day, hour, minute] = match;
        return `${day}/${month}/${year} ${hour}:${minute}`;
      }

      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hour}:${minute}`;
    };

    const estadoClass = computed(() => {
      const estado = String(compra.value?.estado_pago || '').toUpperCase();
      if (estado === 'ANULADO') return 'text-rose-700';
      if (estado === 'PAGADO') return 'text-emerald-700';
      return 'text-amber-700';
    });

    const loadCompra = async () => {
      if (!props.compraId || !props.visible) return;

      loading.value = true;
      errorMessage.value = '';

      try {
        compra.value = await compraService.getById(props.compraId);
      } catch (error) {
        compra.value = null;
        errorMessage.value = error.message || 'No se pudo cargar la compra referenciada.';
      } finally {
        loading.value = false;
      }
    };

    watch(() => [props.visible, props.compraId], loadCompra, { immediate: true });

    return {
      compra,
      errorMessage,
      estadoClass,
      formatDate,
      formatMoney,
      formatPercent,
      formatQuantity,
      loading
    };
  }
};
</script>

<style scoped>
.summary-card {
  border: 1px solid rgb(226 232 240 / 1);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.95), rgba(255, 255, 255, 1));
  border-radius: 1.35rem;
  padding: 1rem 1.1rem;
}

.summary-label {
  font-size: 9px;
  line-height: 1.1;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-weight: 900;
  color: rgb(100 116 139 / 1);
}

.summary-value {
  margin-top: 0.55rem;
  font-size: 0.95rem;
  line-height: 1.35;
  font-weight: 900;
  color: rgb(15 23 42 / 1);
}

.audit-table {
  border-collapse: separate;
  border-spacing: 0;
}

.audit-table th {
  text-align: left;
  padding: 0.9rem 1rem;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-weight: 900;
  color: rgb(100 116 139 / 1);
  background: rgb(248 250 252 / 1);
  border-bottom: 1px solid rgb(226 232 240 / 1);
}

.audit-table td {
  padding: 1rem;
  font-size: 0.9rem;
  color: rgb(51 65 85 / 1);
  border-bottom: 1px solid rgb(241 245 249 / 1);
  vertical-align: top;
}
</style>
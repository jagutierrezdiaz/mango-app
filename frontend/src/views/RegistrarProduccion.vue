<template>
  <div class="programa-view admin-crud-shell min-h-screen w-full max-w-7xl overflow-x-hidden p-4 md:p-6 mx-auto">
    <div class="mb-7 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 border-b border-slate-200 pb-6">
      <div>
        <h1 class="admin-crud-title text-3xl font-black text-teal-700 italic uppercase tracking-tighter">Registrar Produccion</h1>
        <p class="admin-crud-subtitle text-[10px] uppercase tracking-widest font-black">Patio Bohemio / Registro de Produccion</p>
      </div>

      <div class="w-full xl:w-auto grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Fecha Inicio</label>
          <input v-model="filters.fechaInicio" type="date" class="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-teal-500 focus:ring-2 focus:ring-cyan-100 text-sm font-medium">
        </div>
        <div>
          <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Fecha Final</label>
          <input v-model="filters.fechaFinal" type="date" class="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-teal-500 focus:ring-2 focus:ring-cyan-100 text-sm font-medium">
        </div>
        <div class="flex items-end">
          <button @click="consultarOrdenes" :disabled="loading" class="w-full pb-btn pb-btn-consult px-4 py-3 disabled:opacity-50">
            <i :class="loading ? 'fas fa-circle-notch fa-spin' : 'fas fa-filter'"></i>
            <span>{{ loading ? 'Consultando...' : 'Consultar' }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="mb-5 grid grid-cols-1 md:grid-cols-3 gap-3">
      <div class="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">Ordenes Abiertas</p>
        <p class="text-2xl font-black text-slate-800 mt-2">{{ ordenes.length }}</p>
      </div>
      <div class="rounded-[1.6rem] border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">Produccion Registrada</p>
        <p class="text-2xl font-black text-emerald-700 mt-2">{{ cantidadProducidaTotal }}</p>
      </div>
      <div class="rounded-[1.6rem] border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">Defectuosa</p>
        <p class="text-2xl font-black text-amber-700 mt-2">{{ cantidadDefectuosaTotal }}</p>
      </div>
    </div>

    <section class="rounded-3xl border border-slate-200 bg-white p-3 md:p-4 shadow-sm space-y-4">
      <div v-if="loading" class="flex items-center justify-center p-20 bg-slate-50 rounded-[1.9rem] border border-slate-200 shadow-inner">
        <p class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Cargando ordenes abiertas...</p>
      </div>

      <div v-else-if="ordenes.length === 0" class="flex items-center justify-center p-20 bg-slate-50 rounded-[1.9rem] border border-dashed border-slate-200 shadow-inner">
        <div class="text-center">
          <i class="fas fa-industry text-4xl text-slate-300 mb-4 block"></i>
          <p class="text-slate-400 font-bold text-lg">No hay ordenes abiertas para los filtros seleccionados</p>
        </div>
      </div>

      <article
        v-for="orden in ordenes"
        :key="orden.id"
        class="relative overflow-hidden rounded-[1.8rem] border bg-white shadow-sm transition-all border-slate-200"
      >
        <div class="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>

        <div class="p-5 grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div class="xl:col-span-4 flex items-start gap-3 min-w-0">
            <div class="w-16 h-16 rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
              <img v-if="orden.producto_url_foto" :src="orden.producto_url_foto" class="w-full h-full object-cover" @error="handleImageError">
              <i v-else class="fas fa-box-open text-slate-300 text-xl"></i>
            </div>
            <div class="min-w-0">
              <p class="text-[8px] uppercase font-black admin-card-title">Producto</p>
              <p class="text-sm font-black text-slate-800 uppercase break-words">{{ orden.producto_nombre }}</p>
              <p class="text-[10px] text-slate-500 font-bold mt-1">Programada: {{ formatQuantity(orden.cantidad_programada) }}</p>
            </div>
          </div>

          <div class="xl:col-span-4 space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-200 bg-emerald-50 text-emerald-700">
                {{ estadoUi(orden.estado) }}
              </span>
              <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200 bg-slate-50 text-slate-600">
                {{ orden.turno }}
              </span>
              <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-cyan-200 bg-cyan-50 text-cyan-700">
                {{ formatDateTime(orden.fecha_programada) }}
              </span>
            </div>
            <p class="text-[11px] font-bold text-slate-600">Producida {{ formatQuantity(orden.cantidad_producida) }} / Defectuosa {{ formatQuantity(orden.cantidad_defectuosa) }}</p>
          </div>

          <div class="xl:col-span-2 flex items-center gap-2 min-w-0">
            <div class="w-12 h-12 rounded-full overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
              <img v-if="orden.personal_url_foto" :src="orden.personal_url_foto" class="w-full h-full object-cover" @error="handleImageError">
              <i v-else class="fas fa-user text-slate-300"></i>
            </div>
            <div class="min-w-0">
              <p class="text-[8px] uppercase font-black admin-card-title">Operario</p>
              <p class="text-xs font-black text-slate-800 truncate">{{ orden.personal_nombre }}</p>
              <p class="text-[10px] text-slate-500 font-bold truncate">{{ orden.personal_cargo || 'Sin cargo' }}</p>
            </div>
          </div>

          <div class="xl:col-span-2 flex xl:justify-end items-start">
            <button @click.stop="abrirModalRegistro(orden)" class="pb-btn pb-btn-warn btn-icon-text text-xs px-3 py-1.5">
              <i class="fas fa-check-circle text-[11px]"></i>
              <span>Cerrar Ordenes</span>
            </button>
          </div>
        </div>
      </article>
    </section>

    <teleport to="body">
      <div v-show="showModal" class="fixed inset-0 bg-slate-900/35 backdrop-blur-[1px] flex justify-center items-center p-4" style="z-index: 5000;" @click.self="cerrarModal" tabindex="-1">
        <div class="w-full max-w-5xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 class="text-xl font-black text-slate-800 uppercase tracking-tight">Cerrar Ordenes de Produccion</h2>
              <p class="text-[10px] uppercase tracking-widest font-black text-slate-500">Orden #{{ editingId || '-' }}</p>
            </div>
            <button @click="cerrarModal" class="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <form @submit.prevent="guardarRegistro" class="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[76vh] overflow-y-auto">
            <div>
              <label class="form-label">Producto</label>
              <input :value="form.producto_nombre" type="text" class="form-input form-input-disabled" disabled>
            </div>

            <div>
              <label class="form-label">Operario</label>
              <input :value="form.personal_nombre" type="text" class="form-input form-input-disabled" disabled>
            </div>

            <div>
              <label class="form-label">Fecha Programada</label>
              <input :value="form.fecha_programada" type="datetime-local" class="form-input form-input-disabled" disabled>
            </div>

            <div>
              <label class="form-label">Turno</label>
              <input :value="form.turno" type="text" class="form-input form-input-disabled" disabled>
            </div>

            <div>
              <label class="form-label">Cantidad Programada</label>
              <input :value="form.cantidad_programada" type="number" class="form-input form-input-disabled" disabled>
            </div>

            <div>
              <label class="form-label">Fecha Producida</label>
              <input v-model="form.fecha_producida" type="datetime-local" class="form-input">
            </div>

            <div>
              <label class="form-label">Cantidad Producida</label>
              <input v-model="form.cantidad_producida" type="number" min="0" step="1" class="form-input">
            </div>

            <div>
              <label class="form-label">Cantidad Defectuosa</label>
              <input v-model="form.cantidad_defectuosa" type="number" min="0" step="1" class="form-input">
            </div>

            <div class="md:col-span-2 xl:col-span-3 rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div class="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span class="form-label mb-0">Consumo de Articulos</span>
                <span class="text-[10px] font-bold text-slate-500">
                  Base: {{ formatDecimal(resolveCantidadOrden()) }} uds (producida o programada)
                </span>
              </div>
              <div class="pb-table-wrap">
                <table class="pb-data-table text-left text-xs min-w-[720px]">
                  <thead class="bg-slate-50 border-b border-slate-200">
                    <tr class="text-[9px] uppercase admin-card-title font-black">
                      <th class="px-4 py-3">Articulo</th>
                      <th class="px-4 py-3 text-right whitespace-nowrap">Cantidad</th>
                      <th class="px-4 py-3 whitespace-nowrap">Unidad</th>
                      <th class="px-4 py-3 text-right whitespace-nowrap">Stock</th>
                      <th class="px-4 py-3 text-center whitespace-nowrap">Disponible</th>
                      <th class="px-4 py-3 text-right whitespace-nowrap">Deficit</th>
                      <th class="px-4 py-3 text-right whitespace-nowrap">Costo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="loadingConsumo">
                      <td colspan="7" class="text-center py-8 text-slate-400 text-[10px] uppercase font-black">Cargando consumo de articulos...</td>
                    </tr>
                    <tr v-else-if="errorConsumo">
                      <td colspan="7" class="text-center py-8 text-rose-600 text-[10px] uppercase font-black">{{ errorConsumo }}</td>
                    </tr>
                    <tr v-else-if="consumoArticulos.length === 0">
                      <td colspan="7" class="text-center py-8 text-slate-400 text-[10px] uppercase font-black">Sin articulos en la ficha tecnica</td>
                    </tr>
                    <tr
                      v-else
                      v-for="item in consumoArticulos"
                      :key="item.articulo_id"
                      class="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td class="px-4 py-3 font-bold text-slate-700 break-words min-w-[160px]">{{ item.articulo }}</td>
                      <td class="px-4 py-3 text-right font-mono text-blue-700 whitespace-nowrap">{{ formatDecimal(item.cantidad, 3) }}</td>
                      <td class="px-4 py-3 text-slate-600 font-bold uppercase whitespace-nowrap">{{ item.unidad || '---' }}</td>
                      <td class="px-4 py-3 text-right font-mono whitespace-nowrap">{{ formatDecimal(item.stock, 3) }}</td>
                      <td class="px-4 py-3 text-center whitespace-nowrap">
                        <span
                          class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border"
                          :class="item.disponible === 'SI' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'"
                        >
                          {{ item.disponible }}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-right font-mono whitespace-nowrap" :class="parseNumber(item.deficit) > 0 ? 'text-rose-700 font-bold' : 'text-slate-600'">
                        {{ formatDecimal(item.deficit, 3) }}
                      </td>
                      <td class="px-4 py-3 text-right font-mono whitespace-nowrap text-slate-800">{{ formatMoney(item.costo) }}</td>
                    </tr>
                    <tr v-if="!loadingConsumo && !errorConsumo && consumoArticulos.length > 0" class="bg-slate-50 border-t border-slate-200">
                      <td colspan="6" class="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Total costo</td>
                      <td class="px-4 py-3 text-right font-mono font-black text-slate-800 whitespace-nowrap">{{ formatMoney(consumoCostoTotal) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="md:col-span-2 xl:col-span-3">
              <label class="form-label">Observaciones Operario</label>
              <textarea v-model="form.observaciones_operario" rows="3" class="form-input"></textarea>
            </div>

            <div class="md:col-span-2 xl:col-span-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-black uppercase tracking-widest text-slate-500">Estado:</span>
                <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border" :class="form.estado_ui === 'CUMPLIDA' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-700'">
                  {{ form.estado_ui }}
                </span>
              </div>
              <button type="button" @click="toggleEstadoCierre" class="pb-btn pb-btn-warn text-[11px] px-3 py-1.5">
                <i class="fas fa-check-circle"></i>
                <span>{{ form.estado_ui === 'ABIERTA' ? 'Cambiar a CUMPLIDA' : 'Volver a ABIERTA' }}</span>
              </button>
            </div>

            <div class="md:col-span-2 xl:col-span-3 flex justify-end gap-3 pt-2">
              <button type="button" @click="cerrarModal" class="pb-btn pb-btn-secondary px-5 py-3 text-[11px]">Cancelar</button>
              <button type="submit" :disabled="saving" class="pb-btn pb-btn-new px-5 py-3 text-[11px] disabled:opacity-60">
                <i :class="saving ? 'fas fa-circle-notch fa-spin' : 'fas fa-save'"></i>
                <span>{{ saving ? 'Guardando...' : 'Cerrar Ordenes' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script>
import { computed, onMounted, ref, watch } from 'vue';
import { registrarProduccionService } from '../services/registrarProduccionService.js';

const toDateInput = (date) => date.toISOString().slice(0, 10);
const toDateTimeLocal = (date = new Date()) => {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
};

const currentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { fechaInicio: toDateInput(start), fechaFinal: toDateInput(end) };
};

export default {
  name: 'RegistrarProduccion',
  setup() {
    const defaults = currentMonthRange();
    const loading = ref(true);
    const saving = ref(false);
    const showModal = ref(false);
    const editingId = ref(null);
    const consumoArticulos = ref([]);
    const loadingConsumo = ref(false);
    const errorConsumo = ref('');

    const filters = ref({
      fechaInicio: defaults.fechaInicio,
      fechaFinal: defaults.fechaFinal
    });

    const ordenes = ref([]);

    const resetForm = () => ({
      producto_id: null,
      producto_nombre: '',
      personal_nombre: '',
      fecha_programada: '',
      turno: '',
      cantidad_programada: '0.000',
      fecha_producida: toDateTimeLocal(),
      cantidad_producida: '0.000',
      cantidad_defectuosa: '0.000',
      observaciones_operario: '',
      estado_ui: 'CUMPLIDA'
    });

    const form = ref(resetForm());

    const parseNumber = (value, fallback = 0) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const toUiEstado = (estado) => {
      const key = String(estado || '').toLowerCase();
      if (key === 'completada' || key === 'cumplida') return 'CUMPLIDA';
      return 'ABIERTA';
    };

    const toDbEstado = (estadoUi) => (estadoUi === 'CUMPLIDA' ? 'completada' : 'abierta');

    const formatQuantity = (value) => parseNumber(value).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    const formatDecimal = (value, decimals = 3) => parseNumber(value).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });

    const formatMoney = (value) => parseNumber(value).toLocaleString('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    const resolveCantidadOrden = () => {
      const producida = parseNumber(form.value.cantidad_producida);
      const programada = parseNumber(form.value.cantidad_programada);
      return producida > 0 ? producida : programada;
    };

    const resetConsumo = () => {
      consumoArticulos.value = [];
      loadingConsumo.value = false;
      errorConsumo.value = '';
    };

    const cargarConsumoArticulos = async () => {
      const productoId = parseNumber(form.value.producto_id);
      if (!productoId) {
        resetConsumo();
        return;
      }

      loadingConsumo.value = true;
      errorConsumo.value = '';
      try {
        consumoArticulos.value = await registrarProduccionService.getConsumoArticulos(
          productoId,
          resolveCantidadOrden()
        );
      } catch (error) {
        console.error(error);
        consumoArticulos.value = [];
        errorConsumo.value = error.message || 'Error al cargar consumo de articulos';
      } finally {
        loadingConsumo.value = false;
      }
    };

    const formatDateTime = (value) => {
      if (!value) return '---';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value).slice(0, 16).replace('T', ' ');
      return date.toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    };

    const estadoUi = (estado) => toUiEstado(estado);

    const consultarOrdenes = async () => {
      loading.value = true;
      try {
        ordenes.value = await registrarProduccionService.getAbiertas(filters.value);
      } catch (error) {
        console.error(error);
        ordenes.value = [];
        alert(error.message || 'Error al consultar ordenes abiertas');
      } finally {
        loading.value = false;
      }
    };

    const abrirModalRegistro = async (orden) => {
      const estadoActual = toUiEstado(orden.estado);
      if (estadoActual === 'CUMPLIDA') {
        alert('La orden esta CUMPLIDA y no se puede editar.');
        return;
      }

      editingId.value = orden.id;
      form.value = {
        producto_id: orden.producto_id ? Number(orden.producto_id) : null,
        producto_nombre: orden.producto_nombre || '',
        personal_nombre: orden.personal_nombre || '',
        fecha_programada: orden.fecha_programada ? String(orden.fecha_programada).replace(' ', 'T').slice(0, 16) : '',
        turno: orden.turno || '',
        cantidad_programada: String(parseNumber(orden.cantidad_programada).toFixed(3)),
        fecha_producida: orden.fecha_producida ? String(orden.fecha_producida).replace(' ', 'T').slice(0, 16) : toDateTimeLocal(),
        cantidad_producida: String(parseNumber(orden.cantidad_producida).toFixed(3)),
        cantidad_defectuosa: String(parseNumber(orden.cantidad_defectuosa).toFixed(3)),
        observaciones_operario: orden.observaciones_operario || '',
        estado_ui: 'CUMPLIDA'
      };

      showModal.value = true;
      await cargarConsumoArticulos();
    };

    const toggleEstadoCierre = () => {
      form.value.estado_ui = form.value.estado_ui === 'ABIERTA' ? 'CUMPLIDA' : 'ABIERTA';
    };

    const cerrarModal = () => {
      showModal.value = false;
      editingId.value = null;
      resetConsumo();
      form.value = resetForm();
    };

    const guardarRegistro = async () => {
      if (!editingId.value) return;
      saving.value = true;
      try {
        const payload = {
          fecha_producida: form.value.fecha_producida || null,
          cantidad_producida: parseNumber(form.value.cantidad_producida),
          cantidad_defectuosa: parseNumber(form.value.cantidad_defectuosa),
          observaciones_operario: form.value.observaciones_operario || null,
          estado: toDbEstado(form.value.estado_ui)
        };

        await registrarProduccionService.registrar(editingId.value, payload);
        await registrarProduccionService.cerrar(editingId.value);

        await consultarOrdenes();
        cerrarModal();
      } catch (error) {
        console.error(error);
        alert(error.message || 'Error al guardar registro de produccion');
      } finally {
        saving.value = false;
      }
    };

    const handleImageError = (event) => {
      event.target.style.display = 'none';
    };

    const cantidadProducidaTotal = computed(() => {
      const total = ordenes.value.reduce((acc, orden) => acc + parseNumber(orden.cantidad_producida), 0);
      return formatQuantity(total);
    });

    const cantidadDefectuosaTotal = computed(() => {
      const total = ordenes.value.reduce((acc, orden) => acc + parseNumber(orden.cantidad_defectuosa), 0);
      return formatQuantity(total);
    });

    const consumoCostoTotal = computed(() => {
      return consumoArticulos.value.reduce((acc, item) => acc + parseNumber(item.costo), 0);
    });

    watch(
      () => [form.value.cantidad_producida, form.value.cantidad_programada],
      () => {
        if (!showModal.value || !form.value.producto_id) return;
        cargarConsumoArticulos();
      }
    );

    onMounted(async () => {
      await consultarOrdenes();
    });

    return {
      loading,
      saving,
      showModal,
      editingId,
      filters,
      ordenes,
      form,
      consumoArticulos,
      loadingConsumo,
      errorConsumo,
      consumoCostoTotal,
      cantidadProducidaTotal,
      cantidadDefectuosaTotal,
      formatQuantity,
      formatDecimal,
      formatMoney,
      resolveCantidadOrden,
      parseNumber,
      formatDateTime,
      estadoUi,
      consultarOrdenes,
      abrirModalRegistro,
      toggleEstadoCierre,
      guardarRegistro,
      cerrarModal,
      handleImageError
    };
  }
};
</script>

<style scoped>
.form-label {
  display: block;
  margin-bottom: 0.4rem;
  font-size: 10px;
  text-transform: uppercase;
  font-weight: 900;
  letter-spacing: 0.14em;
  color: rgb(71 85 105 / 1);
}

.form-input {
  width: 100%;
  border: 1px solid rgb(226 232 240 / 1);
  border-radius: 0.85rem;
  padding: 0.72rem 0.85rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: rgb(15 23 42 / 1);
  background: white;
  outline: none;
}

.form-input:focus {
  border-color: rgb(20 184 166 / 1);
  box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.2);
}

.form-input-disabled {
  background: rgb(248 250 252 / 1);
  color: rgb(100 116 139 / 1);
  cursor: not-allowed;
}
</style>


<template>
  <div class="programa-view admin-crud-shell min-h-screen w-full max-w-7xl overflow-x-hidden p-4 md:p-6 mx-auto">
    <div class="mb-7 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 border-b border-slate-200 pb-6">
      <div>
        <h1 class="admin-crud-title text-3xl font-black text-teal-700 italic uppercase tracking-tighter">Produccion</h1>
        <p class="admin-crud-subtitle text-[10px] uppercase tracking-widest font-black">Programacion de Produccion</p>
      </div>

      <div class="w-full xl:w-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Fecha Inicio</label>
          <input v-model="filters.fechaInicio" type="date" class="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-teal-500 focus:ring-2 focus:ring-cyan-100 text-sm font-medium">
        </div>
        <div>
          <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Fecha Final</label>
          <input v-model="filters.fechaFinal" type="date" class="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-teal-500 focus:ring-2 focus:ring-cyan-100 text-sm font-medium">
        </div>
        <div>
          <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Estado</label>
          <select v-model="filters.estado" class="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-teal-500 focus:ring-2 focus:ring-cyan-100 text-sm font-medium appearance-none">
            <option value="TODOS">Todos</option>
            <option v-for="estado in estados" :key="estado.value" :value="estado.value">{{ estado.label }}</option>
          </select>
        </div>
        <div class="flex items-end">
          <button @click="consultarOrdenes" :disabled="loading" class="w-full pb-btn pb-btn-consult px-4 py-3 disabled:opacity-50">
            <i :class="loading ? 'fas fa-circle-notch fa-spin' : 'fas fa-filter'"></i>
            <span>{{ loading ? 'Consultando...' : 'Consultar' }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="mb-5 grid grid-cols-1 md:grid-cols-4 gap-3">
      <div class="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">Ordenes</p>
        <p class="text-2xl font-black text-slate-800 mt-2">{{ ordenes.length }}</p>
      </div>
      <div class="rounded-[1.6rem] border border-blue-200 bg-blue-50 p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">En Proceso</p>
        <p class="text-2xl font-black text-blue-700 mt-2">{{ countByEstado('en_proceso') }}</p>
      </div>
      <div class="rounded-[1.6rem] border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">Completadas</p>
        <p class="text-2xl font-black text-emerald-700 mt-2">{{ countByEstado('completada') }}</p>
      </div>
      <div class="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-[9px] uppercase font-black admin-card-title">Avance Promedio</p>
        <p class="text-2xl font-black text-slate-800 mt-2">{{ `${avancePromedio}%` }}</p>
      </div>
    </div>

    <div class="tabs-modern rounded-3xl border border-slate-200 bg-white p-3 md:p-4 shadow-sm">
      <div class="grid grid-cols-2 gap-2 bg-slate-100 rounded-2xl p-1 mb-5">
        <button
          @click="activeTab = 'lista'"
          class="tab-btn"
          :class="activeTab === 'lista' ? 'tab-btn-active' : 'tab-btn-idle'"
        >
          <i class="fas fa-list-ul"></i>
          <span>Lista de Ordenes</span>
        </button>
        <button
          @click="activeTab = 'calendario'"
          class="tab-btn"
          :class="activeTab === 'calendario' ? 'tab-btn-active' : 'tab-btn-idle'"
        >
          <i class="fas fa-calendar-alt"></i>
          <span>Programacion</span>
        </button>
      </div>

      <transition name="fade-slide" mode="out-in">
        <section v-if="activeTab === 'lista'" key="tab-lista" class="space-y-4">
          <div class="flex flex-wrap items-center gap-2">
            <button @click="abrirNuevo" class="pb-btn pb-btn-new px-5 py-2.5 text-[11px]">
              <i class="fas fa-plus"></i>
              <span>Nueva Orden</span>
            </button>
          </div>

          <div v-if="loading" class="flex items-center justify-center p-20 bg-slate-50 rounded-[1.9rem] border border-slate-200 shadow-inner">
            <p class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Cargando ordenes de produccion...</p>
          </div>

          <div v-else-if="ordenes.length === 0" class="flex items-center justify-center p-20 bg-slate-50 rounded-[1.9rem] border border-dashed border-slate-200 shadow-inner">
            <div class="text-center">
              <i class="fas fa-industry text-4xl text-slate-300 mb-4 block"></i>
              <p class="text-slate-400 font-bold text-lg">No hay ordenes para los filtros seleccionados</p>
            </div>
          </div>

          <article
            v-for="orden in ordenes"
            :key="orden.id"
            class="relative overflow-hidden rounded-[1.8rem] border bg-white shadow-sm transition-all"
            :class="selectedOrderId === orden.id ? 'border-teal-300 ring-2 ring-teal-100' : 'border-slate-200'"
          >
            <div class="absolute left-0 top-0 bottom-0 w-1" :class="estadoBorderClass(orden.estado)"></div>

            <!-- Header (visible siempre) - conserva la información actual -->
            <div class="p-5 grid grid-cols-1 xl:grid-cols-12 gap-4 cursor-pointer" @click="toggleOrder(orden)">
              <div class="xl:col-span-4 flex items-start gap-3 min-w-0">
                <div class="w-16 h-16 rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                  <img v-if="orden.producto_url_foto" :src="orden.producto_url_foto" class="w-full h-full object-cover" @error="handleImageError">
                  <i v-else class="fas fa-box-open text-slate-300 text-xl"></i>
                </div>

                <div class="min-w-0 flex-1 flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-[8px] uppercase font-black admin-card-title">Producto</p>
                    <p class="text-sm font-black text-slate-800 uppercase break-words">{{ orden.producto_nombre }}</p>
                    <p class="text-[10px] text-slate-500 font-bold mt-1">Programada: {{ formatQuantity(orden.cantidad_programada) }}</p>
                  </div>

                  <button
                    type="button"
                    @click.stop="toggleOrder(orden)"
                    :aria-expanded="selectedOrderId === orden.id"
                    class="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-teal-100 text-slate-700 hover:text-teal-700 font-bold rounded-lg transition-all border border-slate-300 hover:border-teal-300 ml-2"
                  >
                    <i :class="['fas fa-chevron-down transition-transform text-[13px]', selectedOrderId === orden.id ? 'rotate-180' : '']"></i>
                  </button>
                </div>
              </div>

              <div class="xl:col-span-4">
                <div class="flex flex-wrap items-center gap-2 mb-3">
                  <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border" :class="estadoBadgeClass(orden.estado)">
                    {{ orden.estado }}
                  </span>
                  <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200 bg-slate-50 text-slate-600">
                    {{ orden.turno }}
                  </span>
                  <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-cyan-200 bg-cyan-50 text-cyan-700">
                    {{ formatDateTime(orden.fecha_programada) }}
                  </span>
                </div>

                <div class="progress-wrap">
                  <div class="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                    <span>Produccion</span>
                    <span>{{ `${progressPct(orden)}%` }}</span>
                  </div>
                  <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div class="h-full rounded-full transition-all duration-300" :class="progressBarClass(orden.estado)" :style="{ width: `${progressPct(orden)}%` }"></div>
                  </div>
                  <p class="mt-1 text-[11px] font-bold text-slate-600">Producida {{ formatQuantity(orden.cantidad_producida) }} / Defectuosa {{ formatQuantity(orden.cantidad_defectuosa) }}</p>
                </div>
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

              <div class="xl:col-span-2 flex xl:justify-end items-start gap-2">
                <button @click.stop="editar(orden)" class="pb-btn pb-btn-edit btn-icon-text text-xs px-3 py-1.5" :disabled="String(orden.estado || '').trim().toLowerCase() === 'completada'" :class="{ 'opacity-50 pointer-events-none': String(orden.estado || '').trim().toLowerCase() === 'completada' }">
                  <i class="fas fa-pen-to-square text-[11px]"></i>
                  <span>Editar</span>
                </button>
                <button @click.stop="eliminar(orden)" class="pb-btn pb-btn-danger btn-icon-text text-xs px-3 py-1.5" :disabled="String(orden.estado || '').trim().toLowerCase() === 'completada'" :class="{ 'opacity-50 pointer-events-none': String(orden.estado || '').trim().toLowerCase() === 'completada' }">
                  <i class="fas fa-trash-can text-[11px]"></i>
                  <span>Borrar</span>
                </button>
              </div>
            </div>

            <!-- Expanded area (vacío por ahora) -->
            <div v-show="selectedOrderId === orden.id" class="p-5 bg-white border-t border-slate-100">
              <h3 class="font-black text-sm mb-3">Inventario para realizar la orden de producción</h3>

              <div v-if="inventoryLoading" class="text-sm text-slate-500 mb-3">Cargando inventario...</div>

              <table v-else class="w-full text-sm border-collapse">
                <thead>
                  <tr class="text-left text-xs text-slate-500">
                    <th class="pb-2">Artículo</th>
                    <th class="pb-2">Cantidad Necesaria</th>
                    <th class="pb-2">Saldo Actual</th>
                    <th class="pb-2">Faltante</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in inventoryItems" :key="item.articulo_id" class="border-t border-slate-100">
                    <td class="py-2">{{ item.articulo_nombre }}</td>
                    <td class="py-2">{{ item.cantidad_necesaria_total }}</td>
                    <td class="py-2">{{ item.saldo_cantidad }}</td>
                    <td class="py-2">
                      <span v-if="item.cantidad_faltante === 'No falta'">No falta</span>
                      <span v-else>{{ item.cantidad_faltante }}</span>
                    </td>
                  </tr>
                  <tr v-if="inventoryItems.length === 0">
                    <td colspan="4" class="py-2 text-slate-500">No hay artículos en la ficha técnica para este producto.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <section v-else key="tab-calendario" class="space-y-4">
          <div class="rounded-2xl border border-slate-200 p-3 md:p-4 bg-white">
            <div v-if="calendarLoading" class="flex items-center justify-center p-16">
              <p class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Cargando calendario...</p>
            </div>
            <FullCalendar
              v-else-if="calendarReady"
              :options="calendarOptions"
            />
            <div v-else class="flex items-center justify-center p-16">
              <p class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Abre de nuevo la pestaña para cargar calendario.</p>
            </div>
          </div>
          <p class="text-[11px] text-slate-500 font-semibold">
            Puedes arrastrar una orden en el calendario para reprogramarla. Esto actualiza <code>fecha_programada</code> en el backend.
          </p>
        </section>
      </transition>
    </div>

    <teleport to="body">
      <div v-show="showModal" class="fixed inset-0 bg-slate-900/35 backdrop-blur-[1px] flex justify-center items-center p-4" style="z-index: 5000;" @click.self="cerrarModal" @keydown.esc="cerrarModal" tabindex="-1">
        <div class="w-full max-w-5xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 class="text-xl font-black text-slate-800 uppercase tracking-tight">{{ editingId ? 'Editar Orden de Produccion' : 'Nueva Orden de Produccion' }}</h2>
              <p class="text-[10px] uppercase tracking-widest font-black text-slate-500">Gestion de programacion</p>
            </div>
            <button @click="cerrarModal" class="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <form @submit.prevent="guardar" class="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[76vh] overflow-y-auto">
          <div>
            <label class="form-label">Producto</label>
            <select v-model="form.producto_id" required class="form-input">
              <option value="">Selecciona...</option>
              <option v-for="item in productos" :key="item.id" :value="String(item.id)">{{ item.nombre }}</option>
            </select>
          </div>

          <div>
            <label class="form-label">Operario</label>
            <select v-model="form.personal_id" required class="form-input">
              <option value="">Selecciona...</option>
              <option v-for="item in personal" :key="item.id" :value="String(item.id)">{{ `${item.nombres} ${item.apellidos}` }}</option>
            </select>
          </div>

          <div>
            <label class="form-label">Fecha Programada</label>
            <input v-model="form.fecha_programada" type="datetime-local" required class="form-input">
          </div>

          <div>
            <label class="form-label">Turno</label>
            <select v-model="form.turno" required class="form-input">
              <option value="manana">Manana</option>
              <option value="tarde">Tarde</option>
              <option value="noche">Noche</option>
            </select>
          </div>

          <div>
            <label class="form-label">Cantidad Programada</label>
            <input v-model="form.cantidad_programada" type="number" min="0" step="1" required class="form-input">
          </div>

          <div class="md:col-span-2 xl:col-span-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-black uppercase tracking-widest text-slate-500">Estado:</span>
              <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border" :class="estadoBadgeClass(form.estado)">
                {{ estadoLabel(form.estado) }}
              </span>
            </div>
            <button
              v-if="editingId"
              type="button"
              @click="toggleEstadoEdicion"
              class="pb-btn pb-btn-warn text-[11px] px-3 py-1.5"
            >
              <i class="fas fa-pause-circle"></i>
              <span>{{ form.estado === 'abierta' ? 'Cambiar a PAUSADA' : 'Cambiar a ABIERTA' }}</span>
            </button>
          </div>

            <div class="md:col-span-2 xl:col-span-3 flex justify-end gap-3 pt-2">
              <button type="button" @click="cerrarModal" class="pb-btn pb-btn-secondary px-5 py-3 text-[11px]">Cancelar</button>
              <button type="submit" :disabled="saving" class="pb-btn pb-btn-new px-5 py-3 text-[11px] disabled:opacity-60">
                <i :class="saving ? 'fas fa-circle-notch fa-spin' : 'fas fa-save'"></i>
                <span>{{ saving ? 'Guardando...' : 'Guardar Orden' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script>
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue';
import { ordenesProduccionService } from '../services/ordenesProduccionService.js';
import { productoService } from '../services/productoService.js';
import { personalService } from '../services/personalService.js';
import { getFullCalendarDeps } from '../utils/lazyVendors.js';

const FullCalendar = defineAsyncComponent(() => import('@fullcalendar/vue3'));

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
  name: 'ProgramaProduccion',
  components: { FullCalendar },
  setup() {
    const defaults = currentMonthRange();
    const loading = ref(true);
    const saving = ref(false);
    const showModal = ref(false);
    const editingId = ref(null);
    const selectedOrderId = ref(null);
    const activeTab = ref('lista');
    const calendarLoading = ref(false);
    const calendarPlugins = ref([]);
    const calendarLocale = ref(null);

    const filtros = {
      fechaInicio: defaults.fechaInicio,
      fechaFinal: defaults.fechaFinal,
      estado: 'TODOS'
    };

    const filters = ref({ ...filtros });
    const ordenes = ref([]);
    const productos = ref([]);
    const personal = ref([]);

    const estados = [
      { value: 'abierta', label: 'Abierta' },
      { value: 'pausada', label: 'Pausada' },
      { value: 'en_proceso', label: 'En Proceso' },
      { value: 'espera_insumos', label: 'Espera Insumos' },
      { value: 'completada', label: 'Completada' },
      { value: 'cancelada', label: 'Cancelada' }
    ];

    const normalizeEstado = (estado) => String(estado || 'abierta').toLowerCase();
    const estadoLabel = (estado) => normalizeEstado(estado).toUpperCase();

    const resetForm = () => ({
      programa_id: '',
      producto_id: '',
      personal_id: '',
      cantidad_programada: '0.000',
      cantidad_producida: '0.000',
      cantidad_defectuosa: '0.000',
      fecha_programada: toDateTimeLocal(),
      fecha_producida: '',
      turno: 'manana',
      estado: 'abierta',
      observaciones_operario: '',
      costo_mano_obra: '0.00',
      costo_materia_prima: '0.00',
      costo_insumos: '0.00',
      costo_indirectos: '0.00',
      observaciones_costos_indirectos: ''
    });

    const form = ref(resetForm());

    const parseNumber = (value, fallback = 0) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const formatQuantity = (value) => parseNumber(value).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

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

    const normalizePersonal = (payload) => {
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
      return [];
    };

    const estadoBadgeClass = (estado) => {
      const key = normalizeEstado(estado);
      const map = {
        abierta: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        pausada: 'border-amber-200 bg-amber-50 text-amber-700',
        en_proceso: 'border-blue-200 bg-blue-50 text-blue-700',
        espera_insumos: 'border-amber-200 bg-amber-50 text-amber-700',
        completada: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        cancelada: 'border-rose-200 bg-rose-50 text-rose-700'
      };
      return map[key] || map.abierta;
    };

    const estadoBorderClass = (estado) => {
      const key = normalizeEstado(estado);
      const map = {
        abierta: 'bg-emerald-500',
        pausada: 'bg-amber-500',
        en_proceso: 'bg-blue-500',
        espera_insumos: 'bg-amber-500',
        completada: 'bg-emerald-500',
        cancelada: 'bg-rose-500'
      };
      return map[key] || map.abierta;
    };

    const progressPct = (orden) => {
      const prog = parseNumber(orden.cantidad_programada);
      if (prog <= 0) return 0;
      const done = parseNumber(orden.cantidad_producida);
      return Math.max(0, Math.min(100, Math.round((done / prog) * 100)));
    };

    const progressBarClass = (estado) => {
      const key = normalizeEstado(estado);
      if (key === 'completada') return 'bg-emerald-500';
      if (key === 'abierta') return 'bg-emerald-500';
      if (key === 'pausada') return 'bg-amber-500';
      if (key === 'en_proceso') return 'bg-blue-500';
      if (key === 'cancelada') return 'bg-rose-500';
      if (key === 'espera_insumos') return 'bg-amber-500';
      return 'bg-slate-400';
    };

    const countByEstado = (estado) => ordenes.value.filter((item) => item.estado === estado).length;

    const calendarReady = computed(() => calendarPlugins.value.length > 0 && !!calendarLocale.value);

    const ensureCalendarDeps = async () => {
      if (calendarReady.value || calendarLoading.value) return;
      calendarLoading.value = true;
      try {
        const deps = await getFullCalendarDeps();
        calendarPlugins.value = deps.plugins;
        calendarLocale.value = deps.locale;
      } catch (error) {
        console.error(error);
        alert('No fue posible cargar el calendario en este momento.');
      } finally {
        calendarLoading.value = false;
      }
    };

    const avancePromedio = computed(() => {
      if (!ordenes.value.length) return 0;
      const total = ordenes.value.reduce((acc, item) => acc + progressPct(item), 0);
      return Math.round(total / ordenes.value.length);
    });

    const calendarEvents = computed(() => ordenes.value.map((item) => {
      const estado = normalizeEstado(item.estado);
      return {
        id: String(item.id),
        title: `${item.producto_nombre} (${formatQuantity(item.cantidad_programada)})`,
        start: String(item.fecha_programada).replace(' ', 'T'),
        allDay: false,
        backgroundColor: estado === 'abierta' ? '#16a34a' : estado === 'pausada' ? '#eab308' : '#64748b',
        borderColor: 'transparent',
        extendedProps: {
          estado,
          personal: item.personal_nombre
        }
      };
    }));

    const consultarOrdenes = async () => {
      loading.value = true;
      try {
        ordenes.value = await ordenesProduccionService.getAll(filters.value);
      } catch (error) {
        console.error(error);
        ordenes.value = [];
        alert(error.message || 'Error al consultar ordenes de produccion');
      } finally {
        loading.value = false;
      }
    };

    const inventoryItems = ref([]);
    const inventoryLoading = ref(false);

    const loadInventario = async (ordenId) => {
      inventoryLoading.value = true;
      inventoryItems.value = [];
      try {
        inventoryItems.value = await ordenesProduccionService.getInventario(ordenId);
      } catch (error) {
        console.error('Error cargando inventario:', error);
        inventoryItems.value = [];
      } finally {
        inventoryLoading.value = false;
      }
    };

    const toggleOrder = async (orden) => {
      const next = selectedOrderId.value === orden.id ? null : orden.id;
      selectedOrderId.value = next;
      if (next === orden.id) {
        await loadInventario(orden.id);
      }
    };

    const cargarCatalogos = async () => {
      try {
        const [productosData, personalData] = await Promise.all([
          productoService.getAll(),
          personalService.getAll()
        ]);
        productos.value = Array.isArray(productosData) ? productosData : [];
        personal.value = normalizePersonal(personalData);
      } catch (error) {
        console.error(error);
        productos.value = [];
        personal.value = [];
      }
    };

    const abrirNuevo = () => {
      editingId.value = null;
      form.value = resetForm();
      form.value.estado = 'abierta';
      showModal.value = true;
    };

    const editar = (orden) => {
      if (normalizeEstado(orden?.estado) === 'completada') {
        alert('No se puede editar una orden completada.');
        return;
      }
      editingId.value = orden.id;
      selectedOrderId.value = orden.id;
      const estadoActual = String(orden.estado || 'abierta').toLowerCase();
      form.value = {
        programa_id: orden.programa_id ? String(orden.programa_id) : '',
        producto_id: orden.producto_id ? String(orden.producto_id) : '',
        personal_id: orden.personal_id ? String(orden.personal_id) : '',
        cantidad_programada: String(parseNumber(orden.cantidad_programada).toFixed(3)),
        cantidad_producida: String(parseNumber(orden.cantidad_producida).toFixed(3)),
        cantidad_defectuosa: String(parseNumber(orden.cantidad_defectuosa).toFixed(3)),
        fecha_programada: orden.fecha_programada ? String(orden.fecha_programada).replace(' ', 'T').slice(0, 16) : toDateTimeLocal(),
        fecha_producida: orden.fecha_producida ? String(orden.fecha_producida).replace(' ', 'T').slice(0, 16) : '',
        turno: orden.turno || 'manana',
        estado: estadoActual,
        observaciones_operario: orden.observaciones_operario || '',
        costo_mano_obra: String(parseNumber(orden.costo_mano_obra).toFixed(2)),
        costo_materia_prima: String(parseNumber(orden.costo_materia_prima).toFixed(2)),
        costo_insumos: String(parseNumber(orden.costo_insumos).toFixed(2)),
        costo_indirectos: String(parseNumber(orden.costo_indirectos).toFixed(2)),
        observaciones_costos_indirectos: orden.observaciones_costos_indirectos || ''
      };
      showModal.value = true;
    };

    const toggleEstadoEdicion = () => {
      if (!editingId.value) return;
      form.value.estado = form.value.estado === 'abierta' ? 'pausada' : 'abierta';
    };

    const cerrarModal = () => {
      showModal.value = false;
      editingId.value = null;
      form.value = resetForm();
    };

    const guardar = async () => {
      saving.value = true;
      try {
        const payload = {
          programa_id: form.value.programa_id || null,
          producto_id: Number(form.value.producto_id),
          personal_id: Number(form.value.personal_id),
          cantidad_programada: parseNumber(form.value.cantidad_programada),
          cantidad_producida: parseNumber(form.value.cantidad_producida),
          cantidad_defectuosa: parseNumber(form.value.cantidad_defectuosa),
          fecha_programada: form.value.fecha_programada,
          fecha_producida: form.value.fecha_producida || null,
          turno: form.value.turno,
          estado: form.value.estado,
          observaciones_operario: form.value.observaciones_operario || null,
          costo_mano_obra: parseNumber(form.value.costo_mano_obra),
          costo_materia_prima: parseNumber(form.value.costo_materia_prima),
          costo_insumos: parseNumber(form.value.costo_insumos),
          costo_indirectos: parseNumber(form.value.costo_indirectos),
          observaciones_costos_indirectos: form.value.observaciones_costos_indirectos || null
        };

        await ordenesProduccionService.save(payload, editingId.value);
        await consultarOrdenes();
        cerrarModal();
      } catch (error) {
        console.error(error);
        alert(error.message || 'Error al guardar la orden de produccion');
      } finally {
        saving.value = false;
      }
    };

    const eliminar = async (orden) => {
      if (normalizeEstado(orden?.estado) === 'completada') {
        alert('No se puede eliminar una orden completada.');
        return;
      }
      if (!window.confirm(`Deseas eliminar la orden #${orden.id}?`)) return;
      try {
        await ordenesProduccionService.delete(orden.id);
        if (selectedOrderId.value === orden.id) selectedOrderId.value = null;
        await consultarOrdenes();
      } catch (error) {
        console.error(error);
        alert(error.message || 'Error al eliminar la orden');
      }
    };

    const handleCalendarDrop = async (dropInfo) => {
      const event = dropInfo.event;
      try {
        await ordenesProduccionService.updateFechaProgramada(event.id, event.startStr);
        await consultarOrdenes();
      } catch (error) {
        console.error(error);
        dropInfo.revert();
        alert(error.message || 'No se pudo reprogramar la orden');
      }
    };

    const handleCalendarClick = (clickInfo) => {
      const target = ordenes.value.find((item) => String(item.id) === String(clickInfo.event.id));
      if (!target) return;
      selectedOrderId.value = target.id;
      editar(target);
    };

    const handleImageError = (event) => {
      event.target.style.display = 'none';
    };

    const calendarOptions = computed(() => ({
      plugins: calendarPlugins.value,
      locale: calendarLocale.value,
      initialView: 'dayGridMonth',
      height: 'auto',
      editable: true,
      events: calendarEvents.value,
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      eventDrop: handleCalendarDrop,
      eventClick: handleCalendarClick,
      eventTimeFormat: {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }
    }));

    onMounted(async () => {
      await Promise.all([cargarCatalogos(), consultarOrdenes()]);
    });

    watch(activeTab, async (nextTab) => {
      if (nextTab === 'calendario') {
        await ensureCalendarDeps();
      }
    });

    return {
      loading,
      saving,
      showModal,
      editingId,
      selectedOrderId,
      activeTab,
      filters,
      estados,
      ordenes,
      productos,
      personal,
      form,
      calendarOptions,
      calendarLoading,
      calendarReady,
      formatDateTime,
      formatQuantity,
      estadoLabel,
      estadoBadgeClass,
      estadoBorderClass,
      progressPct,
      progressBarClass,
      countByEstado,
      avancePromedio,
      consultarOrdenes,
      abrirNuevo,
      editar,
      toggleOrder,
      inventoryItems,
      inventoryLoading,
      toggleEstadoEdicion,
      eliminar,
      guardar,
      cerrarModal,
      handleImageError
    };
  }
};
</script>

<style scoped>
.tab-btn {
  border-radius: 0.9rem;
  height: 2.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  text-transform: uppercase;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  transition: all 0.2s ease;
}

.tab-btn-idle {
  color: rgb(100 116 139 / 1);
}

.tab-btn-idle:hover {
  color: rgb(15 23 42 / 1);
}

.tab-btn-active {
  background: linear-gradient(135deg, rgb(20 184 166 / 1), rgb(8 145 178 / 1));
  color: white;
  box-shadow: 0 10px 25px rgba(13, 148, 136, 0.24);
}

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

.progress-wrap {
  border: 1px solid rgb(226 232 240 / 1);
  border-radius: 0.9rem;
  padding: 0.7rem 0.8rem;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.95), rgba(255, 255, 255, 1));
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.24s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>


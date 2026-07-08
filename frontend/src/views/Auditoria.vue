<template>
  <div class="auditoria-view admin-crud-shell min-h-screen w-full max-w-full overflow-x-hidden p-4 md:p-6">
    <!-- HEADER -->
    <section class="mb-5 rounded-3xl border border-cyan-100 bg-gradient-to-r from-cyan-50 via-white to-amber-50 p-5 md:p-6 shadow-sm">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="admin-crud-title text-3xl font-black uppercase italic tracking-tighter text-teal-700">Auditoria BD</h1>
          <p class="admin-crud-subtitle mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Registro de cambios en la base de datos
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="pb-btn pb-btn-secondary pb-btn-unified px-4 py-2 text-[10px]"
            :disabled="loading"
            @click="recargar"
          >
            <i class="fas fa-rotate-right"></i>
            <span>Recargar</span>
          </button>
        </div>
      </div>

      <!-- FILTROS -->
      <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label class="field-wrap">
          <span class="field-label text-xs">Filtro por tabla</span>
          <input
            v-model="filters.tabla"
            type="text"
            placeholder="Ej: personal, auditoria"
            class="field-input text-sm"
            @input="filtrar"
          />
        </label>

        <label class="field-wrap">
          <span class="field-label text-xs">Operación</span>
          <select v-model="filters.operacion" class="field-input text-sm" @change="filtrar">
            <option value="">Todas</option>
            <option value="INSERT">AGREGADO</option>
            <option value="UPDATE">ACTUALIZADO</option>
            <option value="DELETE">BORRADO</option>
          </select>
        </label>

        <label class="field-wrap">
          <span class="field-label text-xs">Desde</span>
          <input
            v-model="filters.fechaDesde"
            type="date"
            class="field-input text-sm"
            @change="filtrar"
          />
        </label>

        <label class="field-wrap">
          <span class="field-label text-xs">Hasta</span>
          <input
            v-model="filters.fechaHasta"
            type="date"
            class="field-input text-sm"
            @change="filtrar"
          />
        </label>
      </div>

      <!-- STATS -->
      <div class="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        <span class="rounded-full border border-slate-200 bg-white px-3 py-1">{{ pagination.total }} registros</span>
        <span class="rounded-full border border-slate-200 bg-white px-3 py-1">Pagina {{ pagination.offset / pagination.limit + 1 }} de {{ pagination.totalPages }}</span>
      </div>
    </section>

    <!-- LOADING STATE -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="h-10 w-10 animate-spin rounded-full border-2 border-teal-600 border-t-transparent"></div>
    </div>

    <!-- EMPTY STATE -->
    <div v-else-if="!registros.length" class="admin-crud-panel rounded-3xl p-14 text-center">
      <i class="fas fa-history mb-4 block text-4xl text-gray-300"></i>
      <p class="text-lg font-semibold text-gray-400">No hay registros de auditoría</p>
    </div>

    <!-- TABLE VIEW -->
    <div v-else class="admin-crud-panel rounded-3xl overflow-hidden">
      <div class="pb-table-wrap">
        <table class="pb-data-table text-sm">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50">
              <th class="whitespace-nowrap px-4 py-3 text-left font-bold text-gray-700">Fecha</th>
              <th class="whitespace-nowrap px-4 py-3 text-left font-bold text-gray-700">Tabla</th>
              <th class="whitespace-nowrap px-4 py-3 text-left font-bold text-gray-700">Operación</th>
              <th class="whitespace-nowrap px-4 py-3 text-left font-bold text-gray-700">ID Registro</th>
              <th class="whitespace-nowrap px-4 py-3 text-left font-bold text-gray-700">Usuario</th>
              <th class="min-w-[320px] px-4 py-3 text-left font-bold text-gray-700">Detalles</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in registros" :key="item.id" class="border-b border-gray-100 hover:bg-cyan-50/50 transition-colors">
              <td class="whitespace-nowrap px-4 py-3 text-gray-700">{{ formatDateTime(item.fecha) }}</td>
              <td class="px-4 py-3">
                <span class="inline-block whitespace-nowrap rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">
                  {{ item.tabla_nombre }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span :class="{
                  'rounded-md px-2 py-1 font-bold text-xs whitespace-nowrap': true,
                  'bg-green-100 text-green-700': item.operacion === 'INSERT',
                  'bg-blue-100 text-blue-700': item.operacion === 'UPDATE',
                  'bg-red-100 text-red-700': item.operacion === 'DELETE'
                }">
                  {{ item.operacion_texto }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-gray-700">{{ item.registro_id || '-' }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-gray-700">{{ item.usuario_nombre || 'N/A' }}</td>
              <td class="px-4 py-3 text-gray-700">
                <button
                  type="button"
                  class="text-teal-600 hover:text-teal-800 font-semibold text-xs underline whitespace-nowrap"
                  @click="toggleDetalle(item.id)"
                >
                  {{ expandedId === item.id ? 'Ocultar' : 'Ver' }}
                </button>
                <div v-if="expandedId === item.id" class="mt-2 max-w-[34rem] overflow-hidden rounded bg-gray-50 p-3 text-xs font-mono break-words whitespace-pre-wrap">
                  {{ item.detalles }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- PAGINATION -->
      <div class="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-xs text-gray-600">
          Mostrando {{ (pagination.offset + 1) }} a {{ Math.min(pagination.offset + pagination.limit, pagination.total) }} de {{ pagination.total }}
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            class="pb-btn pb-btn-secondary px-3 py-1 text-xs"
            :disabled="loading || pagination.offset === 0"
            @click="paginaAnterior"
          >
            <i class="fas fa-chevron-left"></i> Anterior
          </button>
          <button
            type="button"
            class="pb-btn pb-btn-secondary px-3 py-1 text-xs"
            :disabled="loading || pagination.offset + pagination.limit >= pagination.total"
            @click="paginaSiguiente"
          >
            Siguiente <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { auditoriaService } from '../services/auditoriaService.js';

export default {
  name: 'Auditoria',
  setup() {
    const loading = ref(true);
    const registros = ref([]);
    const expandedId = ref(null);
    const filters = ref({
      tabla: '',
      operacion: '',
      fechaDesde: '',
      fechaHasta: ''
    });
    const pagination = ref({
      total: 0,
      limit: 50,
      offset: 0,
      totalPages: 0
    });

    const formatDateTime = (value) => {
      if (!value) return '-';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    };

    const toggleDetalle = (id) => {
      expandedId.value = expandedId.value === id ? null : id;
    };

    const cargar = async () => {
      loading.value = true;
      try {
        const resultado = await auditoriaService.getAll({
          tabla: filters.value.tabla,
          operacion: filters.value.operacion,
          fechaDesde: filters.value.fechaDesde,
          fechaHasta: filters.value.fechaHasta,
          limit: pagination.value.limit,
          offset: pagination.value.offset
        });
        registros.value = resultado.data;
        pagination.value = resultado.pagination;
      } catch (error) {
        alert(error.message || 'No se pudieron cargar los registros de auditoría.');
        registros.value = [];
      } finally {
        loading.value = false;
      }
    };

    const filtrar = async () => {
      pagination.value.offset = 0;
      await cargar();
    };

    const recargar = async () => {
      if (loading.value) return;
      await cargar();
    };

    const paginaAnterior = async () => {
      if (pagination.value.offset > 0) {
        pagination.value.offset = Math.max(0, pagination.value.offset - pagination.value.limit);
        await cargar();
      }
    };

    const paginaSiguiente = async () => {
      if (pagination.value.offset + pagination.value.limit < pagination.value.total) {
        pagination.value.offset += pagination.value.limit;
        await cargar();
      }
    };

    onMounted(() => {
      cargar();
    });

    return {
      loading,
      registros,
      expandedId,
      filters,
      pagination,
      formatDateTime,
      toggleDetalle,
      recargar,
      filtrar,
      paginaAnterior,
      paginaSiguiente
    };
  }
};
</script>

<style scoped>
.auditoria-view {
  background:
    radial-gradient(circle at 8% 10%, rgba(20, 184, 166, 0.1) 0, transparent 36%),
    radial-gradient(circle at 92% 8%, rgba(251, 191, 36, 0.1) 0, transparent 34%),
    linear-gradient(180deg, #f8fafc, #fdfdfd);
}

.field-wrap {
  @apply flex flex-col gap-1;
}

.field-label {
  @apply font-bold uppercase tracking-wider text-slate-600;
}

.field-input {
  @apply rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal text-slate-700 placeholder-slate-400 transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200;
}

.admin-crud-panel {
  @apply border border-slate-200 bg-white;
}
</style>

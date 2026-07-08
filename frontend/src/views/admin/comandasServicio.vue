<template>
  <div class="auditoria-view admin-crud-shell min-h-screen w-full max-w-full overflow-x-hidden p-4 md:p-6">
    <section class="mb-5 rounded-3xl border border-cyan-100 bg-gradient-to-r from-cyan-50 via-white to-amber-50 p-5 md:p-6 shadow-sm">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="admin-crud-title text-3xl font-black uppercase italic tracking-tighter text-teal-700">Servicios Salon</h1>
          <p class="admin-crud-subtitle mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Vista por mesa con comandas activas y recientes
          </p>
        </div>

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

      <div class="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
        <label class="field-wrap lg:col-span-2">
          <span class="field-label text-xs">Buscar por mesa o mesero</span>
          <div class="relative">
            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input
              v-model.trim="search"
              type="text"
              placeholder="Mesa #, nombre de mesa, nombres o apellidos del mesero"
              class="field-input text-sm pl-9"
            />
          </div>
        </label>

        <label class="field-wrap">
          <span class="field-label text-xs">Dias recientes</span>
          <select v-model.number="dias" class="field-input text-sm" @change="cargar">
            <option :value="7">Ultimos 7 dias</option>
            <option :value="14">Ultimos 14 dias</option>
            <option :value="30">Ultimos 30 dias</option>
          </select>
        </label>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        <span class="rounded-full border border-slate-200 bg-white px-3 py-1">{{ filteredMesas.length }} mesas</span>
        <span class="rounded-full border border-slate-200 bg-white px-3 py-1">{{ totalComandas }} comandas</span>
      </div>
    </section>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="h-10 w-10 animate-spin rounded-full border-2 border-teal-600 border-t-transparent"></div>
    </div>

    <div v-else-if="!filteredMesas.length" class="admin-crud-panel rounded-3xl p-14 text-center">
      <i class="fas fa-concierge-bell mb-4 block text-4xl text-gray-300"></i>
      <p class="text-lg font-semibold text-gray-400">No hay datos para el filtro actual</p>
    </div>

    <div v-else class="space-y-3">
      <article
        v-for="mesa in filteredMesas"
        :key="mesa.mesa_id"
        class="admin-crud-panel overflow-hidden rounded-2xl border border-slate-200 bg-white"
      >
        <button
          type="button"
          :class="[
            'w-full px-4 py-3 md:px-5 md:py-4 flex items-center gap-3 transition-colors text-white',
            mesaHeaderClass(mesa)
          ]"
          @click="toggleMesa(mesa.mesa_id)"
        >
          <i class="fas fa-chair text-white text-sm"></i>
          <div class="min-w-0 flex-1 text-left">
            <p class="text-sm md:text-base font-black uppercase tracking-wide flex items-center gap-2 text-white">
              <span>Mesa {{ mesa.mesa_numero }} - {{ mesa.mesa_nombre }}</span>
              <i
                class="fas fa-chevron-down text-[11px] text-white/90 transition-transform"
                :class="isMesaOpen(mesa.mesa_id) ? 'rotate-180' : ''"
              ></i>
            </p>
            <p class="text-[11px] text-white/90 font-semibold mt-0.5">
              {{ mesa.comandas.length }} comandas visibles
            </p>
          </div>

          <span :class="['rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest', mesaBadgeClass(mesa)]">
            {{ mesaEstadoTexto(mesa) }}
          </span>
        </button>

        <div v-show="isMesaOpen(mesa.mesa_id)" class="border-t border-slate-100 px-3 py-3 md:px-4 md:py-4">
          <div v-if="!mesa.comandas.length" class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500 font-semibold">
            Esta mesa no tiene comandas activas o recientes en el rango seleccionado.
          </div>

          <div v-else class="pb-table-wrap">
            <table class="pb-data-table text-sm">
              <thead>
                <tr class="border-b border-gray-200 bg-gray-50">
                  <th class="whitespace-nowrap px-4 py-3 text-left font-bold text-gray-700">Mesero</th>
                  <th class="whitespace-nowrap px-4 py-3 text-left font-bold text-gray-700">Comanda</th>
                  <th class="whitespace-nowrap px-4 py-3 text-right font-bold text-gray-700">Total sin servicio</th>
                  <th class="whitespace-nowrap px-4 py-3 text-right font-bold text-gray-700">Servicio voluntario</th>
                  <th class="whitespace-nowrap px-4 py-3 text-left font-bold text-gray-700">Estado / Pago</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="comanda in mesa.comandas"
                  :key="comanda.comanda_id"
                  :class="[
                    'border-b border-gray-100 transition-colors',
                    comanda.estado_comanda === 'Abierta' ? 'bg-amber-50/60 hover:bg-amber-100/60' : 'hover:bg-cyan-50/50'
                  ]"
                >
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2.5 min-w-[180px]">
                      <img
                        v-if="comanda.personal_foto_url"
                        :src="resolvePhoto(comanda.personal_foto_url)"
                        alt="Mesero"
                        class="h-9 w-9 rounded-full object-cover border border-slate-200"
                        @error="onPhotoError"
                      />
                      <div v-else class="h-9 w-9 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400">
                        <i class="fas fa-user text-xs"></i>
                      </div>
                      <div class="min-w-0">
                        <p class="font-bold text-slate-700 leading-tight truncate">{{ fullName(comanda) || 'Mesero no asignado' }}</p>
                        <p class="text-[11px] text-slate-500">ID {{ comanda.personal_id || '-' }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                      <p :class="['font-bold', comanda.estado_comanda === 'Abierta' ? 'text-amber-700' : 'text-slate-700']">#{{ comanda.comanda_id }}</p>
                      <span
                        v-if="comanda.estado_comanda === 'Abierta'"
                        class="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700"
                      >
                        <i class="fas fa-circle text-[7px] mr-1"></i>
                        Activa
                      </span>
                    </div>
                    <p class="text-[11px] text-slate-500">{{ formatDateTime(comanda.fecha_hora) }}</p>
                  </td>
                  <td class="px-4 py-3 text-right font-bold text-slate-700 num-entero">{{ formatMoney(comanda.total_sin_servicio) }}</td>
                  <td class="px-4 py-3 text-right font-bold text-rose-700 num-entero">{{ formatMoney(comanda.servicio_voluntario) }}</td>
                  <td class="px-4 py-3">
                    <div class="flex flex-wrap items-center gap-1.5">
                      <span :class="['rounded-md px-2 py-1 text-xs font-bold whitespace-nowrap', comandaEstadoClass(comanda.estado_comanda)]">
                        {{ comanda.estado_comanda }}
                      </span>
                      <span class="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700 whitespace-nowrap">
                        {{ comanda.forma_pago || 'Pendiente' }}
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue';
import { comandasService } from '../../services/comandasService.js';

export default {
  name: 'ComandasServicioAdmin',
  setup() {
    const loading = ref(true);
    const search = ref('');
    const dias = ref(14);
    const mesas = ref([]);
    const openMesas = ref(new Set());

    const formatMoney = (value) => {
      const amount = Number(value) || 0;
      return amount.toLocaleString('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    };

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
        hour12: false
      });
    };

    const fullName = (comanda) => {
      return [comanda.personal_nombres, comanda.personal_apellidos]
        .filter(Boolean)
        .join(' ')
        .trim();
    };

    const resolvePhoto = (url) => {
      const raw = String(url || '').trim();
      if (!raw) return '';
      if (/^https?:\/\//i.test(raw)) return raw;
      return raw.startsWith('/') ? raw : `/${raw}`;
    };

    const onPhotoError = (event) => {
      event.target.style.display = 'none';
    };

    const mesaEstadoTexto = (mesa) => {
      const comandas = Array.isArray(mesa?.comandas) ? mesa.comandas : [];
      const hasAbierta = comandas.some((comanda) => String(comanda?.estado_comanda || '') === 'Abierta');
      return hasAbierta ? 'OCUPADA' : 'LIBRE';
    };

    const mesaHeaderClass = (mesa) => {
      return mesaEstadoTexto(mesa) === 'OCUPADA' ? 'mesa-head-ocupada' : 'mesa-head-libre';
    };

    const mesaBadgeClass = (mesa) => {
      return mesaEstadoTexto(mesa) === 'OCUPADA'
        ? 'border-orange-200/80 bg-white/20 text-white'
        : 'border-emerald-200/80 bg-white/20 text-white';
    };

    const comandaEstadoClass = (estado) => {
      if (estado === 'Abierta') return 'bg-amber-100 text-amber-700';
      if (estado === 'Cerrada') return 'bg-blue-100 text-blue-700';
      if (estado === 'Pagada') return 'bg-emerald-100 text-emerald-700';
      if (estado === 'Anulada') return 'bg-rose-100 text-rose-700';
      return 'bg-slate-100 text-slate-700';
    };

    const filteredMesas = computed(() => {
      const q = String(search.value || '').toLowerCase().trim();
      if (!q) return mesas.value;

      return mesas.value.filter((mesa) => {
        const mesaText = `${mesa.mesa_numero} ${mesa.mesa_nombre}`.toLowerCase();
        if (mesaText.includes(q)) return true;

        return mesa.comandas.some((comanda) => {
          const meseroText = `${comanda.personal_nombres || ''} ${comanda.personal_apellidos || ''}`.toLowerCase();
          return meseroText.includes(q);
        });
      });
    });

    const totalComandas = computed(() => {
      return filteredMesas.value.reduce((acc, mesa) => acc + mesa.comandas.length, 0);
    });

    const isMesaOpen = (mesaId) => openMesas.value.has(mesaId);

    const toggleMesa = (mesaId) => {
      const next = new Set(openMesas.value);
      if (next.has(mesaId)) next.delete(mesaId);
      else next.add(mesaId);
      openMesas.value = next;
    };

    const cargar = async () => {
      loading.value = true;
      try {
        const data = await comandasService.getServiciosPorMesa({ dias: dias.value, limitPorMesa: 8 });
        mesas.value = data;
        openMesas.value = new Set(data.slice(0, 1).map((mesa) => mesa.mesa_id));
      } catch (error) {
        mesas.value = [];
        alert(error.message || 'No se pudo cargar la vista de servicios por mesa.');
      } finally {
        loading.value = false;
      }
    };

    const recargar = async () => {
      if (loading.value) return;
      await cargar();
    };

    onMounted(() => {
      cargar();
    });

    return {
      loading,
      search,
      dias,
      filteredMesas,
      totalComandas,
      formatMoney,
      formatDateTime,
      fullName,
      resolvePhoto,
      onPhotoError,
      mesaEstadoTexto,
      mesaHeaderClass,
      mesaBadgeClass,
      comandaEstadoClass,
      isMesaOpen,
      toggleMesa,
      cargar,
      recargar
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
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field-label {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #475569;
}

.field-input {
  border-radius: 0.5rem;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  padding: 0.5rem 0.75rem;
  font-weight: 400;
  color: #334155;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field-input::placeholder {
  color: #94a3b8;
}

.field-input:focus {
  border-color: #14b8a6;
  outline: none;
  box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.25);
}

.admin-crud-panel {
  border: 1px solid #e2e8f0;
  background: #ffffff;
}

.mesa-head-ocupada {
  background: linear-gradient(135deg, var(--pb-soft-edit-a), var(--pb-soft-edit-b));
}

.mesa-head-libre {
  background: linear-gradient(135deg, var(--pb-soft-new-a), var(--pb-soft-new-b));
}
</style>

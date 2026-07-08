<template>
  <div class="mesas-view admin-crud-shell min-h-screen w-full max-w-full overflow-x-hidden p-4 md:p-6">
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
      <div>
        <h1 class="admin-crud-title text-3xl font-black uppercase italic text-teal-700 tracking-tighter">Mesas</h1>
        <p class="admin-crud-subtitle text-[10px] uppercase font-bold tracking-widest ml-1">Gestion de mesas del salon</p>
      </div>
      <button @click="nuevaMesa" class="pb-btn pb-btn-new px-4 py-2 text-[11px]">
        <i class="fas fa-plus"></i>
        <span>Nueva Mesa</span>
      </button>
    </div>

    <p class="text-gray-400 text-xs uppercase font-bold tracking-widest mb-4">
      {{ mesas.length }} mesa{{ mesas.length !== 1 ? 's' : '' }}
    </p>

    <div v-if="loading" class="flex justify-center items-center py-20">
      <div class="animate-spin rounded-full h-10 w-10 border-2 border-teal-600 border-t-transparent"></div>
    </div>

    <div v-else-if="mesas.length === 0" class="admin-crud-panel rounded-3xl p-14 text-center">
      <i class="fas fa-chair text-4xl text-gray-300 mb-4 block"></i>
      <p class="text-gray-400 font-semibold text-lg">No hay mesas registradas</p>
    </div>

    <div v-else class="space-y-3 w-full max-w-full">
      <article v-for="mesa in mesasOrdenadas" :key="mesa.id" class="category-row-card w-full max-w-full rounded-[1.7rem] overflow-hidden px-4 py-3 sm:px-5 sm:py-4 bg-white/95 border border-slate-200">
        <div class="flex flex-wrap lg:flex-nowrap items-start gap-4 w-full">
          <div class="category-photo-box shrink-0 w-full sm:w-[170px] rounded-2xl p-2.5 flex items-start gap-3 border">
            <div class="w-12 h-12 rounded-xl bg-cyan-50 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
              <i :class="mesaIconClass(mesa.nombre)" class="text-cyan-700 text-lg"></i>
            </div>
            <div>
              <p class="text-[8px] font-black admin-card-title uppercase">Icono</p>
              <p class="text-[11px] font-bold admin-card-title mt-1">Mesa {{ mesa.numero }}</p>
            </div>
          </div>

          <div class="flex-1 min-w-0 flex flex-row flex-wrap gap-6 items-start">
            <div class="w-44 shrink-0">
              <p class="text-[9px] font-black admin-card-title uppercase mb-1">Nombre</p>
              <p class="font-bold text-gray-800 text-sm uppercase break-words">{{ mesa.nombre || `Mesa ${mesa.numero}` }}</p>
            </div>
            <div class="w-40 shrink-0">
              <p class="text-[9px] font-black admin-card-title uppercase mb-1">Ubicacion</p>
              <p class="font-bold text-gray-700 text-sm break-words">{{ mesa.ubicacion }}</p>
            </div>
            <div class="w-32 shrink-0">
              <p class="text-[9px] font-black admin-card-title uppercase mb-1">Puestos</p>
              <p class="font-bold text-gray-700 text-sm">{{ mesa.puestos }}</p>
            </div>
            <div class="w-36 shrink-0">
              <p class="text-[9px] font-black admin-card-title uppercase mb-1">Estado</p>
              <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border" :class="estadoBadgeClass(mesa.estado)">
                {{ mesa.estado }}
              </span>
            </div>
          </div>

          <div class="flex items-start gap-2 shrink-0 w-full sm:w-auto sm:ml-auto justify-end pt-0.5">
            <button
              @click="editarMesa(mesa.id)"
              class="pb-btn pb-btn-edit btn-icon-text text-xs px-4 py-2"
            >
              <i class="fas fa-pen-to-square text-[11px]"></i>
              <span>Editar</span>
            </button>
            <button
              @click="eliminarMesa(mesa.id, mesa.numero)"
              class="pb-btn pb-btn-danger btn-icon-text text-xs px-4 py-2"
            >
              <i class="fas fa-trash-can text-[11px]"></i>
              <span>Borrar</span>
            </button>
          </div>
        </div>
      </article>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
        <div class="bg-teal-700 p-6 text-white flex justify-between items-center">
          <h3 class="text-xs font-black uppercase tracking-[0.2em] italic">{{ isEdit ? 'Editar' : 'Nueva' }} Mesa</h3>
          <button @click="closeModal" class="pb-btn pb-btn-secondary btn-icon-text px-3 py-1.5 text-[10px]">
            <i class="fas fa-times"></i>
            <span>Cerrar</span>
          </button>
        </div>

        <form @submit.prevent="guardarMesa" class="p-8 space-y-5">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Numero</label>
              <input v-model.number="form.numero" type="number" min="1" step="1" required class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium">
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Puestos</label>
              <input v-model.number="form.puestos" type="number" min="1" step="1" required class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium">
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Nombre</label>
            <input v-model="form.nombre" type="text" maxlength="50" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium">
          </div>

          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Ubicacion</label>
            <select v-model="form.ubicacion" required class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium">
              <option v-for="item in ubicaciones" :key="item" :value="item">{{ item }}</option>
            </select>
          </div>

          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Estado</label>
            <select v-model="form.estado" required class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium">
              <option v-for="item in estados" :key="item" :value="item">{{ item }}</option>
            </select>
          </div>

          <div class="flex gap-3 pt-4">
            <button type="button" @click="closeModal" class="btn-modal-cancel flex-1 py-3 text-[10px]">
              <i class="fas fa-times"></i>
              <span>Cancelar</span>
            </button>
            <button type="submit" :disabled="saving" class="btn-modal-save flex-1 py-3 text-[10px] disabled:opacity-50">
              <i :class="saving ? 'fas fa-circle-notch fa-spin' : 'fas fa-save'"></i>
              <span>{{ saving ? 'Guardando...' : 'Guardar' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { mesasService } from '../services/mesaService.js';
import { useDeleteSecurity } from '../composables/useDeleteSecurity.js';

export default {
  name: 'Mesas',
  setup() {
    const requestDeleteSecurity = useDeleteSecurity();
    const mesas = ref([]);
    const loading = ref(true);
    const showModal = ref(false);
    const isEdit = ref(false);
    const saving = ref(false);

    const ubicaciones = ['Salón Principal', 'Terraza', 'Bar', 'VIP'];
    const estados = ['Libre', 'Ocupada', 'Sucia', 'Reservada'];

    const form = ref({
      id: null,
      numero: '',
      nombre: '',
      puestos: 2,
      ubicacion: 'Salón Principal',
      estado: 'Libre'
    });

    const estadoBadgeClass = (estado) => {
      if (estado === 'Libre') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      if (estado === 'Ocupada') return 'border-rose-200 bg-rose-50 text-rose-700';
      if (estado === 'Sucia') return 'border-amber-200 bg-amber-50 text-amber-700';
      if (estado === 'Reservada') return 'border-cyan-200 bg-cyan-50 text-cyan-700';
      return 'border-slate-200 bg-slate-50 text-slate-700';
    };

    const mesasOrdenadas = computed(() => {
      return [...(mesas.value || [])].sort((a, b) => {
        const nombreA = String(a?.nombre || '').trim();
        const nombreB = String(b?.nombre || '').trim();
        const byNombre = nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
        if (byNombre !== 0) return byNombre;
        return Number(a?.numero || 0) - Number(b?.numero || 0);
      });
    });

    const mesaIconClass = (nombre) => {
      const text = String(nombre || '').toLowerCase();
      if (text.includes('bar')) return 'fas fa-martini-glass-citrus';
      if (text.includes('vip')) return 'fas fa-crown';
      if (text.includes('terraza')) return 'fas fa-umbrella-beach';
      return 'fas fa-chair';
    };

    const resetForm = () => {
      form.value = {
        id: null,
        numero: '',
        nombre: '',
        puestos: 2,
        ubicacion: 'Salón Principal',
        estado: 'Libre'
      };
    };

    const fetchMesas = async () => {
      loading.value = true;
      try {
        mesas.value = await mesasService.getAll();
      } catch (error) {
        console.error('Error cargando mesas:', error);
        mesas.value = [];
        alert(error.message || 'Error al cargar mesas');
      } finally {
        loading.value = false;
      }
    };

    const nuevaMesa = () => {
      resetForm();
      isEdit.value = false;
      showModal.value = true;
    };

    const editarMesa = async (id) => {
      try {
        const mesa = await mesasService.getById(id);
        if (!mesa) {
          alert('Mesa no encontrada');
          return;
        }

        form.value = {
          id: mesa.id,
          numero: mesa.numero,
          nombre: mesa.nombre || '',
          puestos: mesa.puestos,
          ubicacion: mesa.ubicacion,
          estado: mesa.estado
        };

        isEdit.value = true;
        showModal.value = true;
      } catch (error) {
        alert(error.message || 'Error al cargar mesa');
      }
    };

    const guardarMesa = async () => {
      const duplicate = mesas.value.some((mesa) => mesa.id !== form.value.id && Number(mesa.numero) === Number(form.value.numero));
      if (duplicate) {
        alert(`La mesa #${form.value.numero} ya existe`);
        return;
      }

      saving.value = true;
      try {
        const payload = {
          numero: Number(form.value.numero),
          nombre: form.value.nombre || null,
          puestos: Number(form.value.puestos),
          ubicacion: form.value.ubicacion,
          estado: form.value.estado
        };

        await mesasService.save(payload, form.value.id);
        closeModal();
        await fetchMesas();
      } catch (error) {
        alert(error.message || 'Error al guardar mesa');
      } finally {
        saving.value = false;
      }
    };

    const eliminarMesa = async (id, numero) => {
      await requestDeleteSecurity({
        execute: async () => {
          const result = await mesasService.delete(id);
          if (result?.success === false) {
            throw new Error(result.message || 'No se pudo eliminar la mesa.');
          }
          await fetchMesas();
        },
        successMessage: `Mesa #${numero} eliminada correctamente.`,
        errorMessage: `Error al eliminar la mesa #${numero}.`
      });
    };

    const closeModal = () => {
      showModal.value = false;
      resetForm();
    };

    const handleComandaPagada = (payload = {}) => {
      const mesaId = Number(payload?.id_mesa || payload?.mesa_id || 0);
      if (!mesaId) return;

      mesas.value = (mesas.value || []).map((mesa) => {
        if (Number(mesa.id) !== mesaId) return mesa;
        return {
          ...mesa,
          estado: 'Libre'
        };
      });
    };

    onMounted(() => {
      fetchMesas();
      if (window.socket) {
        window.socket.on('comanda-pagada', handleComandaPagada);
      }
    });

    onUnmounted(() => {
      if (window.socket) {
        window.socket.off('comanda-pagada', handleComandaPagada);
      }
    });

    return {
      mesas,
      loading,
      showModal,
      isEdit,
      saving,
      mesasOrdenadas,
      form,
      ubicaciones,
      estados,
      estadoBadgeClass,
      mesaIconClass,
      fetchMesas,
      nuevaMesa,
      editarMesa,
      guardarMesa,
      eliminarMesa,
      closeModal
    };
  }
};
</script>

<style scoped>
.animate-fadeIn {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}
</style>

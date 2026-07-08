<template>
  <!--
    TEMPLATE: Vista de Unidades.
    - Header con botón Nuevo.
    - Tabla de unidades con nombre, abreviatura, acciones.
    - Modal para crear/editar.
  -->
  <div class="unidades-view admin-crud-shell min-h-screen w-full max-w-full overflow-x-hidden p-4 md:p-6">
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
      <div>
        <h1 class="admin-crud-title text-3xl font-black text-teal-700 uppercase italic tracking-tighter">Unidades</h1>
        <p class="admin-crud-subtitle text-[11px] uppercase font-bold tracking-[0.2em] mt-1">Gestión de unidades y nomenclaturas</p>
      </div>
      <button @click="nuevaUnidad" class="pb-btn pb-btn-new px-6 py-3 text-[11px]">
        <i class="fas fa-plus"></i> Nueva Unidad
      </button>
    </div>

    <!-- Lista de unidades tipo tarjetas -->
    <p class="text-gray-400 text-xs uppercase font-bold tracking-widest mb-4">
      {{ unidades.length }} unidad{{ unidades.length !== 1 ? 'es' : '' }}
    </p>

    <div v-if="loading" class="flex justify-center items-center py-20">
      <div class="animate-spin rounded-full h-10 w-10 border-2 border-teal-600 border-t-transparent"></div>
    </div>

    <div v-else-if="unidades.length === 0" class="admin-crud-panel rounded-3xl p-14 text-center">
      <i class="fas fa-ruler-combined text-4xl text-gray-300 mb-4 block"></i>
      <p class="text-gray-400 font-semibold text-lg">No hay unidades configuradas</p>
    </div>

    <div v-else class="space-y-3 w-full max-w-full">
      <article v-for="u in unidades" :key="u.id" class="category-row-card w-full max-w-full rounded-[1.7rem] overflow-hidden px-4 py-3 sm:px-5 sm:py-4 bg-white/95 border border-slate-200">
        <div class="flex flex-wrap lg:flex-nowrap items-start gap-4 w-full">

          <!-- Ícono (tratado como la foto en Categorias) -->
          <div class="category-photo-box shrink-0 w-full sm:w-[170px] rounded-2xl p-2.5 flex items-start gap-3 border">
            <div class="w-12 h-12 rounded-xl bg-cyan-50 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center text-teal-700">
              <component :is="getUnidadIcon(u.nombre, u.abreviatura)" class="w-6 h-6" />
            </div>
            <div>
              <p class="text-[8px] font-black admin-card-title uppercase">Ícono</p>
              <p class="text-[11px] font-bold admin-card-title mt-1">Unidad</p>
            </div>
          </div>

          <!-- Nombre y Abreviatura -->
          <div class="flex-1 min-w-0 flex flex-row flex-wrap gap-6 items-start">
            <div class="w-44 shrink-0">
              <p class="text-[9px] font-black admin-card-title uppercase mb-1">Nombre</p>
              <p class="font-bold text-gray-800 text-sm uppercase break-words">{{ u.nombre }}</p>
            </div>
            <div class="flex-1 min-w-[140px]">
              <p class="text-[9px] font-black admin-card-title uppercase mb-1">Abreviatura</p>
              <p class="font-bold text-gray-700 text-sm uppercase break-words">{{ u.abreviatura }}</p>
            </div>
          </div>

          <!-- Botones -->
          <div class="flex items-start gap-2 shrink-0 w-full sm:w-auto sm:ml-auto justify-end pt-0.5">
            <button
              @click="editarUnidad(u)"
              title="Editar"
              class="pb-btn pb-btn-edit btn-icon-text text-xs px-4 py-2"
            >
              <i class="fas fa-pen-to-square text-[11px]"></i>
              <span>Editar</span>
            </button>
            <button
              @click="eliminarUnidad(u.id, u.nombre)"
              title="Eliminar"
              class="pb-btn pb-btn-danger btn-icon-text text-xs px-4 py-2"
            >
              <i class="fas fa-trash-can text-[11px]"></i>
              <span>Borrar</span>
            </button>
          </div>
        </div>
      </article>
    </div>

    <!-- Modal para Crear/Editar -->
    <div v-if="showModal" id="modal-unidad" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20 animate-fadeIn">
        <div class="bg-teal-700 p-6 text-white flex justify-between items-center">
          <h2 class="text-lg font-bold">{{ isEdit ? 'Editar Unidad' : 'Nueva Unidad' }}</h2>
          <button @click="closeModal" class="text-white hover:bg-red-500 rounded-lg p-1.5 transition">
            <i class="fas fa-times text-[18px]"></i>
          </button>
        </div>

        <form @submit.prevent="guardarUnidad" class="p-6 space-y-4">
          <div>
            <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Nombre de Unidad</label>
            <input v-model="form.nombre" type="text" required placeholder="EJ: KILOGRAMOS"
                     @input="form.nombre = form.nombre.toUpperCase()"
                     class="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all font-bold text-sm uppercase">
          </div>
          <div>
            <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Nomenclatura (Abreviatura)</label>
            <input v-model="form.abreviatura" type="text" required placeholder="ej: kg, und, lt"
                     class="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all font-bold text-sm">
          </div>

          <div class="flex gap-3">
            <button type="button" @click="closeModal" class="btn-modal-cancel flex-1 py-4 text-[10px]">
              <i class="fas fa-times"></i>
              <span>Cancelar</span>
            </button>
            <button type="submit" :disabled="saving" class="btn-modal-save flex-[2] py-4 text-[10px] tracking-[0.2em] disabled:opacity-50">
              <i :class="saving ? 'fas fa-circle-notch fa-spin' : 'fas fa-save'"></i>
              <span>{{ saving ? 'Procesando...' : 'Guardar' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
/*
  SCRIPT: Lógica del componente Unidades.
  - Imports: Servicios, stores, Composition API.
  - Estado Reactivo: unidades, loading, modal, form.
  - Métodos: fetchUnidades, nuevaUnidad, editarUnidad, etc.
  - Validación de duplicados.
  - Lifecycle: onMounted para cargar datos iniciales.
*/
import { ref, onMounted } from 'vue'
import { unidadService } from '../services/unidadService.js' // Servicio actualizado
import { useAuthStore } from '../stores'
import {
  Scale,
  Ruler,
  FlaskConical,
  Droplets,
  Package,
  Box,
  Leaf,
  Wheat,
  Beaker,
  Soup,
  Drumstick,
  Milk,
  CookingPot,
  CircleDot
} from 'lucide-vue-next'
import { useDeleteSecurity } from '../composables/useDeleteSecurity.js'

export default {
  name: 'Unidades',
  setup() {
    // Estado Reactivo
    const unidades = ref([])
    const loading = ref(true)
    const showModal = ref(false)
    const isEdit = ref(false)
    const saving = ref(false)
    const form = ref({
      id: null,
      nombre: '',
      abreviatura: ''
    })

    // Stores
    const authStore = useAuthStore()
    const requestDeleteSecurity = useDeleteSecurity()

    // Métodos
    const fetchUnidades = async () => {
      try {
        const result = await unidadService.getAll()
        // unidadService.getAll() devuelve { data: backendResponse, success }
        // backendResponse = { success, data: rows[] }
        unidades.value = result.data?.data || result.data || []
      } catch (error) {
        console.error('Error cargando unidades:', error)
      } finally {
        loading.value = false
      }
    }

    const nuevaUnidad = () => {
      form.value = { id: null, nombre: '', abreviatura: '' }
      isEdit.value = false
      showModal.value = true
    }

    const editarUnidad = (unidad) => {
      form.value = { ...unidad }
      isEdit.value = true
      showModal.value = true
    }

    const guardarUnidad = async () => {
      // Validación de duplicados
      const existeDuplicado = unidades.value.some(u =>
        u.id !== form.value.id && (
          u.nombre.toLowerCase() === form.value.nombre.toLowerCase() ||
          u.abreviatura.toLowerCase() === form.value.abreviatura.toLowerCase()
        )
      )

      if (existeDuplicado) {
        alert(`El nombre "${form.value.nombre}" o la nomenclatura "${form.value.abreviatura}" ya están registrados.`)
        return
      }

      saving.value = true
      try {
        let response
        if (form.value.id) {
          response = await unidadService.update(form.value.id, form.value)
        } else {
          response = await unidadService.create(form.value)
        }

        if (response.success) {
          alert(form.value.id ? 'Unidad actualizada' : 'Unidad creada')
          closeModal()
          fetchUnidades()
        }
      } catch (error) {
        alert(error.message || 'Error al guardar')
      } finally {
        saving.value = false
      }
    }

    const eliminarUnidad = async (id, nombre) => {
      const nombreUnidad = String(nombre || '').toUpperCase()

      await requestDeleteSecurity({
        execute: async () => {
          const result = await unidadService.delete(id)
          if (result?.success === false) {
            throw new Error(result.message || 'No se pudo eliminar la unidad.')
          }
          await fetchUnidades()
        },
        successMessage: `Unidad "${nombreUnidad}" eliminada correctamente.`,
        errorMessage: `No se pudo eliminar la unidad "${nombreUnidad}".`
      })
    }

    const closeModal = () => {
      showModal.value = false
    }

    const normalizeUnit = (value = '') =>
      String(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()

    const getUnidadIcon = (nombre = '', abreviatura = '') => {
      const nameKey = normalizeUnit(nombre)
      const abbrKey = normalizeUnit(abreviatura)
      const key = `${nameKey} ${abbrKey}`.trim()

      // Mapeo exacto para unidades comunes (nombre/abreviatura)
      const exactMap = {
        kg: Scale,
        kilo: Scale,
        kilogramo: Scale,
        kilogramos: Scale,
        gr: Scale,
        g: Scale,
        gramo: Scale,
        gramos: Scale,
        mg: FlaskConical,
        miligramo: FlaskConical,
        lb: Scale,
        libra: Scale,
        libras: Scale,
        lt: Beaker,
        l: Beaker,
        litro: Beaker,
        litros: Beaker,
        ml: Beaker,
        mililitro: Beaker,
        mililitros: Beaker,
        und: CircleDot,
        un: CircleDot,
        unidad: CircleDot,
        unidades: CircleDot,
        pieza: CircleDot,
        piezas: CircleDot,
        porcion: CookingPot,
        porciones: CookingPot,
        taza: Soup,
        tazas: Soup,
        cucharada: Soup,
        cucharadas: Soup,
        cucharadita: Soup,
        cucharaditas: Soup,
        oz: FlaskConical,
        onza: FlaskConical,
        onzas: FlaskConical,
        cm: Ruler,
        mm: Ruler,
        m: Ruler,
        metro: Ruler,
        metros: Ruler,
        caja: Package,
        cajas: Package,
        paquete: Package,
        paquetes: Package,
        bolsa: Box,
        bolsas: Box,
        hoja: Leaf,
        hojas: Leaf,
        ramo: Leaf,
        grano: Wheat,
        granos: Wheat,
        leche: Milk,
        carne: Drumstick,
        pechuga: Drumstick
      }

      if (exactMap[abbrKey]) return exactMap[abbrKey]
      if (exactMap[nameKey]) return exactMap[nameKey]

      // Fallback semantico si el nombre no coincide exacto
      if (/(kg|kilo|gram|libra|lb)/.test(key)) return Scale
      if (/(lt|litro|ml|mililitro)/.test(key)) return Beaker
      if (/(cm|mm|metro|longitud)/.test(key)) return Ruler
      if (/(unidad|und|pieza)/.test(key)) return CircleDot
      if (/(caja|paquete|pack)/.test(key)) return Package
      if (/(bolsa|saco)/.test(key)) return Box
      if (/(hoja|rama)/.test(key)) return Leaf
      if (/(grano|arroz|trigo)/.test(key)) return Wheat
      if (/(onza|oz|miligramo|mg)/.test(key)) return FlaskConical
      if (/(gota)/.test(key)) return Droplets
      if (/(taza|cuchar)/.test(key)) return Soup
      if (/(porcion|racion)/.test(key)) return CookingPot
      if (/(pechuga|carne|pollo)/.test(key)) return Drumstick
      if (/(leche|lacteo)/.test(key)) return Milk

      return Scale
    }

    // Lifecycle
    onMounted(fetchUnidades)

    // Retornar estado y métodos
    return {
      unidades,
      loading,
      showModal,
      isEdit,
      saving,
      form,
      fetchUnidades,
      nuevaUnidad,
      editarUnidad,
      guardarUnidad,
      eliminarUnidad,
      closeModal,
      getUnidadIcon
    }
  }
}
</script>

<style scoped>
/*
  STYLE: Estilos específicos para Unidades.
  - Scoped para evitar conflictos.
  - Animaciones.
*/
.animate-fadeIn {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
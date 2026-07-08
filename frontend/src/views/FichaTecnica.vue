<template>
  <!--
    TEMPLATE: Componente FichaTecnica.
    - Tabla de articulos en la ficha tecnica.
    - Modal para agregar/editar articulos.
  -->
  <div class="ficha-tecnica">
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="flex justify-between items-center px-4 py-3 border-b bg-gray-50">
        <span class="text-[9px] font-black uppercase admin-card-title tracking-widest">Ficha Tecnica</span>
        <button @click="abrirModal" class="btn-icon-text text-[10px] bg-slate-900 text-white px-3 py-1.5 rounded-lg font-black hover:bg-orange-600 transition-all whitespace-nowrap">
          <i class="fas fa-plus"></i>
          <span>Nuevo Articulo</span>
        </button>
      </div>
      <div class="pb-table-wrap">
        <table class="pb-data-table text-left text-xs min-w-[640px]">
          <thead class="bg-gray-50 border-b">
            <tr class="text-[9px] uppercase admin-card-title font-black">
              <th class="px-4 py-3">Articulo</th>
              <th class="whitespace-nowrap px-4 py-3">Cantidad</th>
              <th class="whitespace-nowrap px-4 py-3 text-right">Accion</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="3" class="text-center py-8 text-gray-400 text-[10px] uppercase font-black">Cargando...</td>
            </tr>
            <tr v-else-if="items.length === 0">
              <td colspan="3" class="text-center py-8 text-gray-400 text-[10px] uppercase font-black">Sin articulos en la ficha tecnica</td>
            </tr>
            <tr v-else v-for="item in items" :key="item.id" class="border-b last:border-0 hover:bg-slate-50">
              <td class="min-w-[220px] px-4 py-3 font-bold text-gray-700 break-words">{{ item.articulo_nombre }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-blue-600 font-mono">
                {{ parseFloat(item.cantidad_necesaria).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }}
                <span class="text-[10px] text-gray-400">{{ item.unidad_medida || '' }}</span>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex justify-end gap-2 whitespace-nowrap">
                  <button @click="editarItem(item)" class="pb-btn pb-btn-edit btn-icon-text text-xs px-3 py-1.5">
                    <i class="fas fa-pen-to-square text-[11px]"></i>
                    <span>Editar</span>
                  </button>
                  <button @click="eliminarItem(item.id)" class="pb-btn pb-btn-danger btn-icon-text text-xs px-3 py-1.5">
                    <i class="fas fa-trash-can text-[11px]"></i>
                    <span>Borrar</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal para Agregar/Editar Articulo -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
        <div class="bg-teal-700 p-6 text-white flex justify-between items-center">
          <h3 class="text-xs font-black uppercase tracking-[0.2em] italic">{{ isEdit ? 'Editar' : 'Nuevo' }} Articulo</h3>
          <button @click="cerrarModal" class="pb-btn pb-btn-secondary btn-icon-text px-3 py-1.5 text-[10px]">
            <i class="fas fa-times"></i>
            <span>Cerrar</span>
          </button>
        </div>
        <form @submit.prevent="guardarItem" class="p-8 space-y-5">
          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Articulo</label>
            <select v-model="form.articulo_id" required class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium appearance-none">
              <option value="">Seleccione articulo</option>
              <option v-for="art in articulos" :key="art.id" :value="art.id">{{ art.nombre }}</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3 items-end">
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Cantidad</label>
              <input
                v-model="form.cantidad_necesaria"
                type="text"
                @input="formatearCantidad"
                @blur="asegurarDosDecimales"
                required
                class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium text-right"
              >
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Unidad</label>
              <input
                :value="unidadSeleccionada || '---'"
                type="text"
                readonly
                class="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-2xl text-sm font-bold text-slate-600 uppercase"
              >
            </div>
          </div>

          <div class="flex gap-3 pt-4">
            <button type="button" @click="cerrarModal" class="btn-modal-cancel flex-1 py-3 text-[10px]">
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
/*
  SCRIPT: Logica del componente FichaTecnica.
  - Props: productoId.
  - Estado Reactivo: items, articulos, unidades, loading, modal, form.
  - Metodos: fetchItems, cargarArticulos, cargarUnidades, abrirModal, editarItem, etc.
  - API calls para CRUD de items en ficha tecnica.
  - Lifecycle: onMounted y watch para productoId.
*/
import { ref, onMounted, watch, computed } from 'vue'
import { articuloService } from '../services/articuloService.js' // Servicio actualizado
import { fichaTecnicaService } from '../services/fichaTecnicaService.js' // Servicio actualizado

export default {
  name: 'FichaTecnica',
  props: {
    productoId: {
      type: Number,
      required: true
    }
  },
  setup(props) {
    // Estado Reactivo
    const items = ref([])
    const articulos = ref([])
    const loading = ref(true)
    const showModal = ref(false)
    const isEdit = ref(false)
    const saving = ref(false)
    const form = ref({
      id: null,
      articulo_id: '',
      unidad_id: '',
      cantidad_necesaria: ''
    })

    // Metodos
    const fetchItems = async () => {
      try {
        const data = await fichaTecnicaService.getByProducto(props.productoId)
        items.value = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
      } catch (error) {
        console.error('Error cargando ficha tecnica:', error)
      } finally {
        loading.value = false
      }
    }

    const cargarArticulos = async () => {
      try {
        const data = await articuloService.getAll()
        articulos.value = Array.isArray(data) ? data : []
      } catch (error) {
        console.error('Error cargando articulos:', error)
      }
    }

    const abrirModal = async () => {
      await cargarArticulos()
      form.value = { id: null, articulo_id: '', unidad_id: '', cantidad_necesaria: '' }
      isEdit.value = false
      showModal.value = true
    }

    const editarItem = async (item) => {
      await cargarArticulos()
      form.value = {
        id: item.id,
        articulo_id: item.articulo_id,
        unidad_id: item.unidad_id,
        cantidad_necesaria: parseFloat(item.cantidad_necesaria).toLocaleString('es-CO', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })
      }
      isEdit.value = true
      showModal.value = true
    }

    const articuloSeleccionado = computed(() => {
      const articuloId = Number(form.value.articulo_id)
      if (!articuloId) return null
      return articulos.value.find(art => Number(art.id) === articuloId) || null
    })

    const unidadSeleccionada = computed(() => {
      const art = articuloSeleccionado.value
      return art?.unidad_medida || ''
    })

    const actualizarUnidadSegunArticulo = () => {
      const art = articuloSeleccionado.value
      form.value.unidad_id = art?.unidad_id || ''
    }

    const parseCantidad = (value) => {
      if (!value) return null
      const normalized = String(value).replace(/\./g, '').replace(',', '.')
      const numeric = Number(normalized)
      return Number.isFinite(numeric) ? numeric : null
    }

    const formatearMilesConDosDecimales = (value) => {
      const numeric = Number(value)
      if (!Number.isFinite(numeric)) return ''
      return numeric.toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })
    }

    const guardarItem = async () => {
      saving.value = true
      const cantidad = parseCantidad(form.value.cantidad_necesaria)

      if (cantidad === null) {
        alert('Ingrese una cantidad valida')
        saving.value = false
        return
      }

      const payload = {
        producto_id: props.productoId,
        articulo_id: form.value.articulo_id,
        cantidad_necesaria: cantidad.toFixed(2)
      }

      console.log('[ficha-tecnica:frontend] payload a guardar:', payload)

      try {
        const url = form.value.id ? `/api/fichas-tecnicas/${form.value.id}` : `/api/fichas-tecnicas`
        const method = form.value.id ? 'PUT' : 'POST'

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(payload)
        })

        const data = await response.json()
        if (data.success) {
          alert(form.value.id ? 'Articulo actualizado' : 'Articulo agregado')
          cerrarModal()
          fetchItems()
        } else {
          alert(data.message || 'Error al guardar')
        }
      } catch (error) {
        alert('Error de conexion')
      } finally {
        saving.value = false
      }
    }

    const eliminarItem = async (id) => {
      if (!confirm('Eliminar insumo de la ficha tecnica?')) return
      try {
        const result = await fichaTecnicaService.deleteItem(id)
        if (result.success) {
          alert('Insumo eliminado')
          fetchItems()
        } else {
          alert(result.message || 'Error al eliminar')
        }
      } catch (error) {
        alert('Error al eliminar')
      }
    }

    const cerrarModal = () => {
      showModal.value = false
    }

    const formatearCantidad = (event) => {
      const rawValue = event.target.value.replace(/[^\d,]/g, '')

      if (!rawValue) {
        form.value.cantidad_necesaria = ''
        return
      }

      const commaIndex = rawValue.indexOf(',')
      const integerRaw = commaIndex === -1 ? rawValue : rawValue.slice(0, commaIndex)
      const decimalRaw = commaIndex === -1 ? '' : rawValue.slice(commaIndex + 1).replace(/,/g, '')

      const integerNormalized = integerRaw.replace(/^0+(?=\d)/, '') || '0'
      const integerFormatted = integerNormalized.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      const decimalFormatted = decimalRaw.slice(0, 2)

      form.value.cantidad_necesaria = commaIndex === -1
        ? integerFormatted
        : `${integerFormatted},${decimalFormatted}`
    }

    const asegurarDosDecimales = () => {
      const cantidad = parseCantidad(form.value.cantidad_necesaria)
      if (cantidad === null) return
      form.value.cantidad_necesaria = formatearMilesConDosDecimales(cantidad)
    }

    // Lifecycle
    onMounted(() => {
      fetchItems()
    })

    watch(() => props.productoId, () => {
      fetchItems()
    })

    watch(() => form.value.articulo_id, () => {
      actualizarUnidadSegunArticulo()
    })

    // Retornar estado y metodos
    return {
      items,
      articulos,
      loading,
      showModal,
      isEdit,
      saving,
      form,
      unidadSeleccionada,
      fetchItems,
      cargarArticulos,
      abrirModal,
      editarItem,
      guardarItem,
      eliminarItem,
      cerrarModal,
      formatearCantidad,
      asegurarDosDecimales
    }
  }
}
</script>

<style scoped lang="postcss">
/*
  STYLE: Estilos especificos para FichaTecnica.
  - Scoped para evitar conflictos.
  - Animaciones.
*/
.btn-modal-cancel {
  @apply bg-cyan-50 text-teal-700 border border-cyan-200 px-6 py-3 rounded-xl font-bold hover:bg-cyan-100 transition-all;
}

.btn-modal-save {
  @apply bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-500 shadow-md shadow-teal-200 transition-all active:scale-95 disabled:opacity-50;
}

.animate-scaleIn {
  animation: scaleIn 0.3s ease-out;
}

@keyframes scaleIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>

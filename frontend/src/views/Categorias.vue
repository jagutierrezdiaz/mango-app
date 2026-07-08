<template>
  <!--
    TEMPLATE: Vista de Categorías.
    - Header con botón Nuevo.
    - Tabla de categorías con foto, nombre, descripción, acciones.
    - Modal para crear/editar con preview de imagen.
  -->
  <div class="categorias-view admin-crud-shell min-h-screen w-full max-w-full overflow-x-hidden p-4 md:p-6">
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
      <div>
        <h1 class="admin-crud-title text-3xl font-black uppercase italic text-teal-700 tracking-tighter">Categorías</h1>
        <p class="admin-crud-subtitle text-[10px] uppercase font-bold tracking-widest ml-1">Gestión de familias de productos</p>
      </div>
      <button @click="nuevaCategoria" class="pb-btn pb-btn-new px-4 py-2 text-[11px]">
        <i class="fas fa-plus"></i> Nueva Categoría
      </button>
    </div>

    <!-- Lista de categorías tipo tarjetas -->
    <p class="text-gray-400 text-xs uppercase font-bold tracking-widest mb-4">
      {{ categorias.length }} categoría{{ categorias.length !== 1 ? 's' : '' }}
    </p>

    <div v-if="loading" class="flex justify-center items-center py-20">
      <div class="animate-spin rounded-full h-10 w-10 border-2 border-teal-600 border-t-transparent"></div>
    </div>

    <div v-else-if="categorias.length === 0" class="admin-crud-panel rounded-3xl p-14 text-center">
      <i class="fas fa-tags text-4xl text-gray-300 mb-4 block"></i>
      <p class="text-gray-400 font-semibold text-lg">No hay categorías registradas</p>
    </div>

    <div v-else class="space-y-3 w-full max-w-full">
      <article v-for="cat in categorias" :key="cat.id" class="category-row-card w-full max-w-full rounded-[1.7rem] overflow-hidden px-4 py-3 sm:px-5 sm:py-4 bg-white/95 border border-slate-200">
        <div class="flex flex-wrap lg:flex-nowrap items-start gap-4 w-full">
          <div class="category-photo-box shrink-0 w-full sm:w-[170px] rounded-2xl p-2.5 flex items-start gap-3 border">
            <div class="w-12 h-12 rounded-xl bg-cyan-50 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
              <img
                :src="getCategoriaImageUrl(cat.url_foto)"
                @error="handleImageError($event, cat.nombre)"
                @load="event => { event.target.style.display = '' }"
                class="w-full h-full object-cover"
              >
            </div>
            <div>
              <p class="text-[8px] font-black admin-card-title uppercase">Foto</p>
              <p class="text-[11px] font-bold admin-card-title mt-1">Categoria</p>
            </div>
          </div>

          <div class="flex-1 min-w-0 flex flex-row flex-wrap gap-6 items-start">
            <div class="w-44 shrink-0">
              <p class="text-[9px] font-black admin-card-title uppercase mb-1">Categoria</p>
              <p class="font-bold text-gray-800 text-sm uppercase break-words">{{ cat.nombre }}</p>
            </div>
            <div class="flex-1 min-w-[140px]">
              <p class="text-[9px] font-black admin-card-title uppercase mb-1">Descripcion</p>
              <p class="font-bold text-gray-700 text-sm break-words">{{ cat.descripcion || 'Sin descripción' }}</p>
            </div>
          </div>

          <div class="flex items-start gap-2 shrink-0 w-full sm:w-auto sm:ml-auto justify-end pt-0.5">
            <button
              @click="editarCategoria(cat.id)"
              title="Editar"
              class="pb-btn pb-btn-edit btn-icon-text text-xs px-4 py-2"
            >
              <i class="fas fa-pen-to-square text-[11px]"></i>
              <span>Editar</span>
            </button>
            <button
              @click="eliminarCategoria(cat.id, cat.nombre)"
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
    <div v-if="showModal" id="modal-categoria" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
        <div class="bg-teal-700 p-6 text-white flex justify-between items-center">
          <h3 class="text-xs font-black uppercase tracking-[0.2em] italic">{{ isEdit ? 'Editar' : 'Nueva' }} Categoría</h3>
          <button @click="closeModal" class="pb-btn pb-btn-secondary btn-icon-text px-3 py-1.5 text-[10px]">
            <i class="fas fa-times"></i>
            <span>Cerrar</span>
          </button>
        </div>
        <form @submit.prevent="guardarCategoria" class="p-8 space-y-5">
          <input type="hidden" v-model="form.id">

          <div class="flex flex-col items-center mb-4">
            <div class="w-32 h-32 rounded-3xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 transition-all">
              <i v-if="!form.fotoPreview" class="fas fa-camera text-2xl text-gray-300"></i>
              <img v-else :src="form.fotoPreview" class="w-full h-full object-cover">
            </div>
            <button type="button" @click="$refs.fotoInput.click()" class="pb-btn pb-btn-secondary mt-3 px-3 py-1.5 text-[9px]">
              <i class="fas fa-upload mr-1"></i> Seleccionar Foto
            </button>
            <input ref="fotoInput" type="file" accept="image/*" @change="previewImage" class="hidden">
          </div>

          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Nombre</label>
            <input v-model="form.nombre" type="text" required maxlength="100" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium">
          </div>

          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Descripción</label>
            <textarea v-model="form.descripcion" rows="3" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium resize-none"></textarea>
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
/*
  SCRIPT: Lógica del componente Categorias.
  - Imports: Servicios, stores, Composition API.
  - Estado Reactivo: categorias, loading, modal, form.
  - Métodos: fetchCategorias, nuevaCategoria, editarCategoria, etc.
  - Validación de duplicados.
  - Lifecycle: onMounted para cargar datos iniciales.
*/
import { ref, onMounted, onUnmounted } from 'vue'
import { categoriasService } from '../services/categoriaService.js' // Servicio actualizado
import { useAuthStore } from '../stores'
import { API_BASE_URL } from '../config/api.js'
import { useDeleteSecurity } from '../composables/useDeleteSecurity.js'

const API_BASE = API_BASE_URL
const UPLOADS_BASE = (process.env.VUE_APP_UPLOADS_BASE_URL || API_BASE.replace(/\/api\/?$/, '')).replace(/\/$/, '')

export default {
  name: 'Categorias',
  setup() {
    // Estado Reactivo
    const categorias = ref([])
    const loading = ref(true)
    const showModal = ref(false)
    const isEdit = ref(false)
    const saving = ref(false)
    const form = ref({
      id: null,
      nombre: '',
      descripcion: '',
      foto: null,
      fotoPreview: null
    })

    // Stores
    const authStore = useAuthStore()
    const requestDeleteSecurity = useDeleteSecurity()

    // Métodos
    const fetchCategorias = async () => {
      try {
        const result = await categoriasService.getAll()
        categorias.value = Array.isArray(result) ? result : []
      } catch (error) {
        console.error('Error cargando categorías:', error)
        categorias.value = []
      } finally {
        loading.value = false
      }
    }

    const nuevaCategoria = () => {
      form.value = { id: null, nombre: '', descripcion: '', foto: null, fotoPreview: null }
      isEdit.value = false
      showModal.value = true
    }

    const editarCategoria = async (id) => {
      try {
        const cat = await categoriasService.getById(id)
        if (!cat) {
          alert('Categoría no encontrada')
          return
        }

        form.value = {
          id: cat.id,
          nombre: cat.nombre,
          descripcion: cat.descripcion,
          foto: null,
          fotoPreview: getCategoriaImageUrl(cat.url_foto)
        }
        isEdit.value = true
        showModal.value = true
      } catch (error) {
        alert('Error al cargar datos')
      }
    }

    const guardarCategoria = async () => {
      // Validación de duplicados
      const existeDuplicado = categorias.value.some(cat =>
        cat.id !== form.value.id && cat.nombre.toLowerCase() === form.value.nombre.toLowerCase()
      )
      if (existeDuplicado) {
        const notify = window.notifyUi || (() => {})
        notify({
          message: `La categoría "${form.value.nombre}" ya está registrada`,
          type: 'warning',
          duration: 5000
        })
        return
      }

      saving.value = true
      const formData = new FormData()
      formData.append('id', form.value.id || '')
      formData.append('nombre', form.value.nombre)
      formData.append('descripcion', form.value.descripcion)
      if (form.value.foto) formData.append('foto', form.value.foto)

      try {
        const result = await categoriasService.save(formData, form.value.id)
        if (result.success) {
          const notify = window.notifyUi || (() => {})
          notify({
            message: form.value.id ? 'Categoría actualizada correctamente' : 'Categoría creada correctamente',
            type: 'success',
            duration: 5000
          })
          closeModal()
          fetchCategorias()
        } else {
          const notify = window.notifyUi || (() => {})
          notify({
            message: result.message || 'Error al procesar la categoría',
            type: 'error',
            duration: 6000
          })
        }
      } catch (error) {
        const notify = window.notifyUi || (() => {})
        notify({
          message: 'Error crítico de comunicación',
          type: 'error',
          duration: 7000
        })
      } finally {
        saving.value = false
      }
    }

    const eliminarCategoria = async (id, nombre) => {
      await requestDeleteSecurity({
        execute: async () => {
          const result = await categoriasService.delete(id)
          if (result?.success === false) {
            throw new Error(result.message || 'No se pudo eliminar la categoria.')
          }
          await fetchCategorias()
        },
        mensajeAdvertencia: 'Al eliminar esta categoría, se borrarán TODOS los productos asociados y sus respectivas recetas. Esta acción es irreversible.',
        successMessage: `Categoria "${nombre}" eliminada correctamente.`,
        errorMessage: `No se pudo eliminar la categoria "${nombre}".`
      })
    }

    const closeModal = () => {
      showModal.value = false
    }

    const previewImage = (event) => {
      const file = event.target.files[0]
      if (file) {
        form.value.foto = file
        const reader = new FileReader()
        reader.onload = () => {
          form.value.fotoPreview = reader.result
        }
        reader.readAsDataURL(file)
      }
    }

    const getCategoriaImageUrl = (filename) => {
      const defaultPath = '/uploads/categorias/default.png'

      if (!filename) return `${UPLOADS_BASE}${defaultPath}`
      if (filename.startsWith('http://') || filename.startsWith('https://')) return filename
      if (filename.startsWith('/uploads/')) return `${UPLOADS_BASE}${filename}?t=${new Date().getTime()}`

      return `${UPLOADS_BASE}/uploads/categorias/${filename}?t=${new Date().getTime()}`
    }

    const handleImageError = (event, nombre) => {
      if (event.target.dataset.fallbackApplied !== '1') {
        event.target.dataset.fallbackApplied = '1'
        event.target.src = `${UPLOADS_BASE}/uploads/categorias/default.png`
        return
      }

      event.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=f1f5f9&color=64748b`
    }

    const handleCategoriasActualizadas = async (payload = {}) => {
      const play = window.playNotification || (() => Promise.resolve(false))
      const notify = window.notifyUi || (() => {})

      if (!payload?.__pbSoundHandled) await play('system_update.mp3')
      notify({
        message: 'Sistema Actualizado: Categorías',
        type: 'info',
        duration: 2600
      })
      await fetchCategorias()
    }

    const handleProductosActualizados = async () => {
      const notify = window.notifyUi || (() => {})
      notify({
        message: 'Sistema Actualizado: Productos',
        type: 'info',
        duration: 2200
      })
      await fetchCategorias()
    }

    // Handlers para eventos de admin (nuevos nombres de eventos)
    const handleAdminEvent = async (eventName, payload = {}) => {
      const notify = window.notifyUi || (() => {})
      const play = window.playNotification || (() => Promise.resolve(false))

      if (!payload?.__pbSoundHandled) await play('system_update.mp3')
      notify({
        message: 'Sistema Actualizado',
        type: 'info',
        duration: 2600
      })
      await fetchCategorias()
    }

    // Lifecycle
    onMounted(() => {
      fetchCategorias()
      if (window.socket) {
        // Listeners antiguos (mantener para compatibilidad)
        window.socket.on('categorias-actualizadas', handleCategoriasActualizadas)
        window.socket.on('productos-actualizados', handleProductosActualizados)
        
        // Listeners nuevos para eventos de admin
        window.socket.on('CONFIG_CAMBIO', (payload) => handleAdminEvent('CONFIG_CAMBIO', payload))
        window.socket.on('ALERTA_ADMIN', (payload) => handleAdminEvent('ALERTA_ADMIN', payload))
        window.socket.on('NUEVO_PRODUCTO', (payload) => handleAdminEvent('NUEVO_PRODUCTO', payload))
        window.socket.on('ESTADO_CAMBIO', (payload) => handleAdminEvent('ESTADO_CAMBIO', payload))
      }
    })

    onUnmounted(() => {
      if (window.socket) {
        window.socket.off('categorias-actualizadas', handleCategoriasActualizadas)
        window.socket.off('productos-actualizados', handleProductosActualizados)
        window.socket.off('CONFIG_CAMBIO')
        window.socket.off('ALERTA_ADMIN')
        window.socket.off('NUEVO_PRODUCTO')
        window.socket.off('ESTADO_CAMBIO')
      }
    })

    // Retornar estado y métodos
    return {
      categorias,
      loading,
      showModal,
      isEdit,
      saving,
      form,
      fetchCategorias,
      nuevaCategoria,
      editarCategoria,
      guardarCategoria,
      eliminarCategoria,
      closeModal,
      previewImage,
      getCategoriaImageUrl,
      handleImageError
    }
  }
}
</script>

<style scoped lang="postcss">
/*
  STYLE: Estilos específicos para Categorias.
  - Scoped para evitar conflictos.
  - Animaciones y botones personalizados.
*/
.btn-primary-action {
  @apply bg-amber-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-amber-600 transition-colors;
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
<template>
  <!--
    TEMPLATE: Vista de Proveedores.
    - Header con botón Nuevo.
    - Lista de tarjetas expandibles con detalles.
    - Modal para crear/editar con logo.
  -->
  <div class="proveedores-view admin-crud-shell animate-fadeIn min-h-screen w-full max-w-7xl overflow-x-hidden p-4 md:p-6 mx-auto">
    <!-- HEADER -->
    <div class="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b pb-4">
      <div>
        <h1 class="admin-crud-title text-3xl font-black text-teal-700 italic uppercase tracking-tighter">Proveedores</h1>
        <p class="admin-crud-subtitle text-[10px] uppercase tracking-widest font-bold">Gestión de Compras</p>
      </div>
      <button @click="nuevoProveedor" class="pb-btn pb-btn-new px-4 py-2 text-[11px]">
        <i class="fas fa-plus"></i> Nuevo Proveedor
      </button>
    </div>

    <!-- LISTA -->
    <div v-if="loading" class="text-center p-10 text-gray-400 italic">Cargando proveedores...</div>
    <div v-else-if="proveedores.length === 0" class="text-center p-10 text-gray-400 italic">No hay proveedores registrados</div>
    <div v-else class="space-y-3 w-full max-w-full">
      <div v-for="p in proveedores" :key="p.id" class="admin-crud-panel rounded-2xl overflow-hidden mb-3">
        <!-- Header de la Tarjeta -->
        <div class="w-full flex flex-wrap lg:flex-nowrap items-stretch p-0 hover:bg-slate-50/50 transition-colors text-left group">
          <div class="w-full sm:w-[220px] lg:w-48 bg-slate-50/70 border-b lg:border-b-0 lg:border-r border-slate-200 p-3 flex items-center gap-3 self-stretch cursor-pointer" @click="toggleAcordeon(p.id)">
            <div class="w-12 h-12 rounded-lg overflow-hidden bg-white shadow-inner border border-gray-200 flex-shrink-0">
              <img :src="getImageUrl('proveedores', p.url_logo)" @error="handleProveedorImageError" class="w-full h-full object-cover">
            </div>
            <div>
              <p class="text-[8px] font-black admin-card-title uppercase">Creado</p>
              <p class="text-[11px] font-bold text-gray-600 mt-1">{{ formatDate(p.fecha_creacion) }}</p>
            </div>
            <i class="fas fa-chevron-down text-gray-300 ml-auto pr-2"></i>
          </div>

          <div class="w-full lg:flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-4 sm:p-5 cursor-pointer" @click="toggleAcordeon(p.id)">
            <div>
              <p class="text-[9px] font-black admin-card-title uppercase mb-1">NIT</p>
              <p class="font-mono font-bold text-gray-700 text-sm">{{ p.nit || '---' }}</p>
            </div>
            <div>
              <p class="text-[9px] font-black admin-card-title uppercase mb-1">Razón Social</p>
              <p class="font-bold text-gray-800 text-sm break-words">{{ p.razon_social || '---' }}</p>
            </div>
            <div class="flex justify-end gap-2 w-full sm:w-auto sm:ml-auto">
              <button
                @click.stop="editarProveedor(p.id)"
                class="pb-btn pb-btn-edit btn-icon-text text-xs px-3 py-1.5"
              >
                <i class="fas fa-pen-to-square text-[11px]"></i>
                <span class="hidden sm:inline">Editar</span>
              </button>
              <button
                @click.stop="eliminarProveedor(p.id)"
                class="pb-btn pb-btn-danger btn-icon-text text-xs px-3 py-1.5"
              >
                <i class="fas fa-trash-can text-[11px]"></i>
                <span class="hidden sm:inline">Borrar</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Detalles Expandidos -->
        <div v-show="expanded.includes(p.id)" class="border-t border-slate-200 bg-slate-50/60 p-6 animate-fadeIn">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="space-y-2">
              <h4 class="text-[10px] font-black admin-card-title uppercase tracking-widest border-b border-teal-200 pb-1 mb-2">Contacto</h4>
              <p class="text-xs"><b>Nombre:</b> {{ p.contacto_nombre || '---' }}</p>
              <p class="text-xs"><b>Teléfono:</b> {{ p.telefono || '---' }}</p>
              <p class="text-xs"><b>Correo:</b> {{ p.correo || '---' }}</p>
            </div>
            <div class="space-y-2">
              <h4 class="text-[10px] font-black admin-card-title uppercase tracking-widest border-b border-teal-200 pb-1 mb-2">Ubicación</h4>
              <p class="text-xs"><b>Dirección:</b> {{ p.direccion || '---' }}</p>
              <p class="text-xs"><b>Ciudad:</b> {{ p.ciudad || '---' }}</p>
            </div>
            <div class="space-y-2">
              <h4 class="text-[10px] font-black admin-card-title uppercase tracking-widest border-b border-teal-200 pb-1 mb-2">Información Fiscal</h4>
              <p class="text-xs"><b>Régimen:</b> {{ p.regimen_fiscal || '---' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL -->
    <div v-if="showModal" id="modal-proveedor" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/20">
        <!-- HEADER MODAL -->
        <div class="bg-teal-700 p-6 text-white flex justify-between items-center sticky top-0 z-20">
          <h3 class="text-xs font-black uppercase tracking-[0.2em] italic">{{ isEdit ? 'Editar' : 'Nuevo' }} Proveedor</h3>
          <button @click="closeModal" class="pb-btn pb-btn-secondary btn-icon-text px-3 py-1.5 text-[10px]">
            <i class="fas fa-times"></i>
            <span>Cerrar</span>
          </button>
        </div>

        <!-- FORMULARIO -->
        <form @submit.prevent="guardarProveedor" class="p-8 space-y-5">
          <input type="hidden" v-model="form.id">

          <!-- PREVIEW DE LOGO -->
          <div class="flex flex-col items-center mb-4">
            <div class="w-32 h-32 rounded-3xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 transition-all">
              <i v-if="!form.logoPreview" class="fas fa-building text-2xl text-gray-300"></i>
              <img v-else :src="form.logoPreview" class="w-full h-full object-cover">
            </div>
            <button type="button" @click="$refs.logoInput.click()" class="pb-btn pb-btn-secondary mt-3 px-3 py-1.5 text-[9px]">
              <i class="fas fa-upload mr-1"></i> Seleccionar Logo
            </button>
            <input ref="logoInput" type="file" accept="image/*" @change="previewLogo" class="hidden">
          </div>

          <!-- NIT Y RAZON SOCIAL -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">NIT</label>
              <input v-model="form.nit" type="text" required class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium">
            </div>
            <div class="sm:col-span-2">
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Razón Social</label>
              <input v-model="form.razon_social" @input="form.razon_social = form.razon_social.toUpperCase()" type="text" required class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium uppercase">
            </div>
          </div>

          <!-- CONTACTO Y TELEFONO -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Contacto</label>
              <input v-model="form.contacto_nombre" @input="form.contacto_nombre = form.contacto_nombre.toUpperCase()" type="text" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium uppercase">
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Teléfono</label>
              <input v-model="form.telefono" type="text" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium">
            </div>
          </div>

          <!-- CORREO Y CIUDAD -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Correo</label>
              <input v-model="form.correo" type="email" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium">
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Ciudad</label>
              <input v-model="form.ciudad" @input="form.ciudad = form.ciudad.toUpperCase()" type="text" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium uppercase">
            </div>
          </div>

          <!-- DIRECCION -->
          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Dirección</label>
            <input v-model="form.direccion" type="text" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium">
          </div>

          <!-- REGIMEN FISCAL -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Régimen Fiscal</label>
              <select v-model="form.regimen_fiscal" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium appearance-none">
                <option value="Responsable de IVA">Responsable de IVA</option>
                <option value="No Responsable de IVA">No Responsable de IVA</option>
              </select>
            </div>
            <div></div>
          </div>

          <!-- BOTONES -->
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
  SCRIPT: Lógica del componente Proveedores.
  - Imports: Servicios, stores, Composition API.
  - Estado Reactivo: proveedores, loading, modal, form, expanded.
  - Métodos: fetchProveedores, nuevoProveedor, editarProveedor, etc.
  - Manejo de imágenes con getImageUrl.
  - Lifecycle: onMounted para cargar datos iniciales.
*/
import { ref, onMounted } from 'vue'
import { proveedoresService } from '../services/proveedoresService.js' // Servicio actualizado
import { useAuthStore } from '../stores'
import { API_BASE_URL } from '../config/api.js'
import { useDeleteSecurity } from '../composables/useDeleteSecurity.js'

const API_BASE = API_BASE_URL
const UPLOADS_BASE = (process.env.VUE_APP_UPLOADS_BASE_URL || API_BASE.replace(/\/api\/?$/, '')).replace(/\/$/, '')

export default {
  name: 'Proveedores',
  setup() {
    // Estado Reactivo
    const proveedores = ref([])
    const loading = ref(true)
    const showModal = ref(false)
    const isEdit = ref(false)
    const saving = ref(false)
    const expanded = ref([])
    const form = ref({
      id: null,
      nit: '',
      razon_social: '',
      contacto_nombre: '',
      telefono: '',
      correo: '',
      ciudad: 'MANIZALES',
      direccion: '',
      regimen_fiscal: 'Responsable de IVA',
      url_logo: null,
      logoPreview: null
    })

    // Stores
    const authStore = useAuthStore()
    const requestDeleteSecurity = useDeleteSecurity()

    // Métodos
    const fetchProveedores = async () => {
      try {
        const data = await proveedoresService.getAll()
        proveedores.value = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : []
      } catch (error) {
        console.error('Error cargando proveedores:', error)
      } finally {
        loading.value = false
      }
    }

    const toggleAcordeon = (id) => {
      const index = expanded.value.indexOf(id)
      if (index > -1) {
        expanded.value.splice(index, 1)
      } else {
        expanded.value.push(id)
      }
    }

    const nuevoProveedor = () => {
      form.value = {
        id: null,
        nit: '',
        razon_social: '',
        contacto_nombre: '',
        telefono: '',
        correo: '',
        ciudad: 'MANIZALES',
        direccion: '',
        regimen_fiscal: 'Responsable de IVA',
        url_logo: null,
        logoPreview: null
      }
      isEdit.value = false
      showModal.value = true
    }

    const editarProveedor = async (id) => {
      try {
        const prov = await proveedoresService.getById(id)
        form.value = {
          ...prov,
          url_logo: prov.url_logo,
          logoPreview: prov.url_logo ? getImageUrl('proveedores', prov.url_logo) : null
        }
        isEdit.value = true
        showModal.value = true
      } catch (error) {
        alert('Error cargando proveedor')
      }
    }

    const guardarProveedor = async () => {
      saving.value = true
      const formData = new FormData()
      Object.keys(form.value).forEach(key => {
        if (form.value[key] !== null && form.value[key] !== undefined) {
          formData.append(key, form.value[key])
        }
      })

      try {
        const result = await proveedoresService.save(formData, form.value.id)
        if (result.success) {
          alert(form.value.id ? 'Proveedor actualizado correctamente' : 'Proveedor guardado correctamente')
          closeModal()
          fetchProveedores()
        } else {
          alert(result.message || 'Error al guardar proveedor')
        }
      } catch (error) {
        alert('Error de conexión con el servidor')
      } finally {
        saving.value = false
      }
    }

    const eliminarProveedor = async (id) => {
      await requestDeleteSecurity({
        execute: async () => {
          const result = await proveedoresService.delete(id)
          if (result?.success === false) {
            throw new Error(result.message || 'No se pudo eliminar el proveedor.')
          }
          await fetchProveedores()
        },
        successMessage: 'Proveedor eliminado correctamente.',
        errorMessage: 'Error de conexión al eliminar proveedor.'
      })
    }

    const closeModal = () => {
      showModal.value = false
    }

    const previewLogo = (event) => {
      const file = event.target.files[0]
      if (file) {
        form.value.url_logo = file
        const reader = new FileReader()
        reader.onload = () => {
          form.value.logoPreview = reader.result
        }
        reader.readAsDataURL(file)
      }
    }

    const getImageUrl = (folder, filename) => {
      const defaultPath = '/uploads/proveedores/default.png'

      if (!filename) return `${UPLOADS_BASE}${defaultPath}`
      if (filename.startsWith('http://') || filename.startsWith('https://')) return filename
      if (filename.startsWith('/uploads/')) return `${UPLOADS_BASE}${filename}?t=${new Date().getTime()}`

      return `${UPLOADS_BASE}/uploads/${folder}/${filename}?t=${new Date().getTime()}`
    }

    const handleProveedorImageError = (event) => {
      event.target.src = `${UPLOADS_BASE}/uploads/proveedores/default.png`
    }

    const formatDate = (dateString) => {
      if (!dateString) return '---'
      return new Date(dateString).toLocaleDateString('es-CO')
    }

    // Lifecycle
    onMounted(fetchProveedores)

    // Retornar estado y métodos
    return {
      proveedores,
      loading,
      showModal,
      isEdit,
      saving,
      expanded,
      form,
      fetchProveedores,
      toggleAcordeon,
      nuevoProveedor,
      editarProveedor,
      guardarProveedor,
      eliminarProveedor,
      closeModal,
      previewLogo,
      getImageUrl,
      handleProveedorImageError,
      formatDate
    }
  }
}
</script>

<style scoped lang="postcss">
/*
  STYLE: Estilos específicos para Proveedores.
  - Scoped para evitar conflictos.
  - Animaciones y botones personalizados.
*/
.btn-primary-action {
  @apply bg-amber-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-amber-600 transition-colors;
}

.btn-upload-file {
  @apply bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg border border-dashed border-gray-400 text-sm font-bold flex items-center gap-2;
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
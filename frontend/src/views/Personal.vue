<template>
  <!--
    TEMPLATE: Vista de Personal.
    - Header con contador y botón Nuevo.
    - Lista de tarjetas expandibles con detalles.
    - Modal grande para crear/editar con secciones.
  -->
  <div class="personal-view admin-crud-shell animate-fadeIn min-h-screen w-full max-w-7xl overflow-x-hidden p-4 md:p-6 mx-auto">
    <div class="mb-8 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 border-b pb-4">
      <div>
        <h1 class="admin-crud-title text-3xl font-black text-teal-700 italic uppercase tracking-tighter">Lista de Personal</h1>
        <p class="admin-crud-subtitle text-[10px] uppercase tracking-widest font-bold">Patio Bohemio - Gestión de RRHH</p>
      </div>
      <div class="flex items-center gap-4 sm:gap-6 w-full lg:w-auto justify-between lg:justify-end">
        <div class="text-right border-r pr-6">
          <span class="text-2xl font-black text-amber-500">{{ personal.length }}</span>
          <p class="text-[9px] text-gray-400 uppercase font-bold">Registros</p>
        </div>
        <button @click="nuevoPersonal" class="pb-btn pb-btn-new px-5 py-2.5 text-xs">
          <i class="fas fa-user-plus"></i> Nuevo Personal
        </button>
      </div>
    </div>

    <!-- Lista de Personal -->
    <div v-if="loading" class="text-center p-10 text-gray-400 italic">Cargando personal...</div>
    <div v-else-if="personal.length === 0" class="text-center p-10 text-gray-400 italic">No hay registros de personal.</div>
    <div v-else class="space-y-3 w-full max-w-full">
      <div v-for="emp in personal" :key="emp.id" class="admin-crud-panel rounded-2xl overflow-hidden mb-3">
        <!-- Header de la Tarjeta -->
        <div class="w-full flex flex-wrap lg:flex-nowrap items-stretch p-0 hover:bg-slate-50/50 transition-colors text-left group">
          <div class="w-full sm:w-[220px] lg:w-48 bg-slate-50/70 border-b lg:border-b-0 lg:border-r border-slate-200 p-3 flex items-center gap-3 self-stretch cursor-pointer" @click="toggleAcordeon(emp.id)">
            <div class="w-12 h-12 rounded-lg overflow-hidden bg-white shadow-inner border border-gray-200 flex-shrink-0">
              <img :src="getPersonalImageUrl(emp.url_foto, emp.nombres)" @error="handlePersonalImageError($event, emp.nombres)" class="w-full h-full object-cover">
            </div>
            <div>
              <p class="text-[8px] font-black admin-card-title uppercase">Ingreso</p>
              <p class="text-[11px] font-bold text-gray-600 mt-1">{{ formatDate(emp.fecha_ingreso) }}</p>
            </div>
            <i class="fas fa-chevron-down text-gray-300 ml-auto pr-2"></i>
          </div>

          <div class="w-full lg:flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 sm:gap-4 p-4 sm:p-5 cursor-pointer" @click="toggleAcordeon(emp.id)">
            <div>
              <p class="text-[9px] font-black admin-card-title uppercase mb-1">Identificación</p>
              <p class="font-mono font-bold text-gray-700 text-sm">{{ emp.numero_identificacion || '---' }}</p>
            </div>
            <div>
              <p class="text-[9px] font-black admin-card-title uppercase mb-1">Personal</p>
              <p class="font-bold text-gray-800 text-sm capitalize break-words">{{ emp.nombres?.toLowerCase() }} {{ emp.apellidos?.toLowerCase() }}</p>
            </div>
            <div>
              <p class="text-[9px] font-black admin-card-title uppercase mb-1">Rol</p>
              <p class="font-bold text-gray-700 text-sm break-words">{{ emp.rol || 'Sin asignar' }}</p>
            </div>
            <div>
              <p class="text-[9px] font-black admin-card-title uppercase mb-1">Estado</p>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase"
                :class="emp.estado?.toLowerCase() === 'activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
              >
                <i :class="emp.estado?.toLowerCase() === 'activo' ? 'fas fa-circle-check' : 'fas fa-circle-xmark'"></i>
                <span class="ml-1">{{ emp.estado || 'Activo' }}</span>
              </span>
            </div>
            <div class="text-right flex items-center justify-end gap-2 shrink-0">
              <button
                @click.stop="editarPersonal(emp.id)"
                class="pb-btn pb-btn-edit btn-icon-text text-xs px-3 py-1.5 whitespace-nowrap"
              >
                <i class="fas fa-pen-to-square text-[11px]"></i>
                <span>Editar</span>
              </button>
              <button
                @click.stop="eliminarPersonal(emp.id, emp.nombres)"
                class="pb-btn pb-btn-danger btn-icon-text text-xs px-3 py-1.5 whitespace-nowrap"
              >
                <i class="fas fa-trash-can text-[11px]"></i>
                <span>Borrar</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Detalles Expandidos -->
        <div v-show="expanded.includes(emp.id)" class="border-t border-slate-200 bg-slate-50/60 p-6 animate-fadeIn">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="space-y-2">
              <h4 class="text-[10px] font-black admin-card-title uppercase tracking-widest border-b border-teal-200 pb-1 mb-2">Contacto y Ubicación</h4>
              <p class="text-xs"><b>Correo:</b> {{ emp.correo || 'No registrado' }}</p>
              <p class="text-xs"><b>Teléfono:</b> {{ emp.telefono || 'n/a' }}</p>
              <p class="text-xs"><b>Dirección:</b> {{ emp.direccion || '---' }}</p>
              <p class="text-xs"><b>Ciudad:</b> {{ emp.ciudad || 'Sabaneta' }}</p>
            </div>
            <div class="space-y-2">
              <h4 class="text-[10px] font-black admin-card-title uppercase tracking-widest border-b border-teal-200 pb-1 mb-2">Seguridad y Emergencia</h4>
              <p class="text-xs"><b>Contacto:</b> {{ emp.contacto_emergencia_nombre || 'No asignado' }}</p>
              <p class="text-xs"><b>Tel. Emergencia:</b> {{ emp.contacto_emergencia_telefono || 'n/a' }}</p>
            </div>
            <div class="space-y-2">
              <h4 class="text-[10px] font-black admin-card-title uppercase tracking-widest border-b border-teal-200 pb-1 mb-2">Información Laboral</h4>
              <p class="text-xs"><b>Usuario:</b> <span class="bg-gray-200 px-1.5 py-0.5 rounded text-[10px] font-mono">{{ emp.usuario || 'n/a' }}</span></p>
              <p class="text-xs"><b>Rol:</b> <span class="font-black">{{ emp.rol || 'Sin asignar' }}</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para Crear/Editar -->
    <div v-if="showModal" id="modal-personal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-white/20">
        <div class="bg-teal-700 p-6 text-white flex justify-between items-center sticky top-0 z-20">
          <h3 class="font-bold uppercase tracking-widest italic text-lg">{{ isEdit ? 'Editar Personal' : 'Nuevo Personal' }}</h3>
          <button @click="closeModal" class="pb-btn pb-btn-secondary btn-icon-text px-3 py-1.5 text-[10px]">
            <i class="fas fa-times"></i>
            <span>Cerrar</span>
          </button>
        </div>
        <form @submit.prevent="guardarPersonal" class="p-8">
          <input type="hidden" v-model="form.id">

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="md:col-span-3 border-b pb-2">
              <span class="text-[10px] font-black text-amber-600 uppercase tracking-widest">I. Información de Identidad</span>
            </div>

            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-500 uppercase">Tipo Documento</label>
              <select v-model="form.tipo_documento" class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
                <option value="CC">Cédula de Ciudadanía (CC)</option>
                <option value="CE">Cédula de Extranjería (CE)</option>
                <option value="PPT">Permiso Temporal (PPT)</option>
                <option value="PA">Pasaporte (PA)</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-500 uppercase">Identificación</label>
              <input v-model="form.numero_identificacion" type="text" required class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-500 uppercase">Nombres</label>
              <input v-model="form.nombres" type="text" required class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-500 uppercase">Apellidos</label>
              <input v-model="form.apellidos" type="text" required class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
            </div>
            <div class="space-y-1 md:col-span-2">
              <label class="text-[10px] font-bold text-gray-500 uppercase">Fecha Ingreso</label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <input v-model="form.fecha_ingreso" type="date" class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
                <button
                  type="button"
                  @click="toggleEstadoEnModal"
                  class="pb-btn pb-btn-modal-toggle btn-icon-text font-bold text-xs px-3 py-2 w-full justify-center"
                  :class="form.estado?.toLowerCase() === 'activo' ? 'pb-btn-warn' : 'pb-btn-new'"
                >
                  <i :class="form.estado?.toLowerCase() === 'activo' ? 'fas fa-toggle-off text-[11px]' : 'fas fa-toggle-on text-[11px]' "></i>
                  <span>{{ form.estado?.toLowerCase() === 'activo' ? 'Inactivar' : 'Activar' }}</span>
                </button>
              </div>
            </div>

            <div class="md:col-span-3 border-b pb-2 mt-4">
              <span class="text-[10px] font-black text-amber-600 uppercase tracking-widest">II. Acceso y Rol</span>
            </div>

            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-500 uppercase">Usuario</label>
              <input v-model="form.usuario" type="text" class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
            </div>
            <div class="space-y-1 md:col-span-2">
              <label class="text-[10px] font-bold text-gray-500 uppercase">Rol</label>
              <select v-model="form.rol" class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
                <option value="Administrador">Administrador</option>
                <option value="Cocinero">Cocinero</option>
                <option value="Mesero">Mesero</option>
                <option value="Cajero">Cajero</option>
                <option value="Barista">Barista</option>
                <option value="Bartender">Bartender</option>
              </select>
            </div>

            <div class="md:col-span-3 border-b pb-2 mt-4">
              <span class="text-[10px] font-black text-amber-600 uppercase tracking-widest">III. Contacto y Ubicación</span>
            </div>

            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-500 uppercase">Ciudad</label>
              <input v-model="form.ciudad" type="text" class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-500 uppercase">Correo</label>
              <input v-model="form.correo" type="email" class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-500 uppercase">Teléfono</label>
              <input v-model="form.telefono" type="text" class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
            </div>
          </div>

          <div class="modal-footer-btns">
            <div class="flex items-center gap-3">
              <input ref="fotoInput" type="file" accept="image/*" @change="previewFoto" class="hidden">
              <button type="button" @click="$refs.fotoInput.click()" class="btn-upload-file pb-btn-modal">
                <i class="fas fa-camera"></i> Subir Foto
              </button>
              <div v-if="form.fotoPreview" class="flex items-center gap-2">
                <img :src="form.fotoPreview" class="w-10 h-10 object-cover rounded shadow-sm">
              </div>
              <button
                v-if="isEdit"
                type="button"
                @click="borrarContrasena"
                class="pb-btn btn-modal-danger btn-icon-text px-4 py-2 text-[10px]"
              >
                <i class="fas fa-key"></i>
                <span>Borrar Contraseña</span>
              </button>
            </div>
            <div class="modal-footer-right">
              <button type="button" @click="closeModal" class="btn-modal-cancel pb-btn-modal px-5 py-2.5 text-[10px]">
                <i class="fas fa-times"></i>
                <span>Cancelar</span>
              </button>
              <button type="submit" :disabled="saving" class="btn-modal-save pb-btn-modal px-5 py-2.5 text-[10px] disabled:opacity-50">
                <i class="fas fa-save"></i> {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
/*
  SCRIPT: Lógica del componente Personal.
  - Imports: Servicios, stores, Composition API.
  - Estado Reactivo: personal, loading, modal, form, expanded.
  - Métodos: fetchPersonal, nuevoPersonal, editarPersonal, etc.
  - Validación y manejo de archivos.
  - Lifecycle: onMounted para cargar datos iniciales.
*/
import { ref, onMounted } from 'vue'
import { personalService } from '../services/personalService.js' // Servicio actualizado
import { useAuthStore } from '../stores'
import { API_BASE_URL } from '../config/api.js'
import { useDeleteSecurity } from '../composables/useDeleteSecurity.js'

const API_BASE = API_BASE_URL
const UPLOADS_BASE = (process.env.VUE_APP_UPLOADS_BASE_URL || API_BASE.replace(/\/api\/?$/, '')).replace(/\/$/, '')

export default {
  name: 'Personal',
  setup() {
    // Estado Reactivo
    const personal = ref([])
    const loading = ref(true)
    const showModal = ref(false)
    const isEdit = ref(false)
    const saving = ref(false)
    const expanded = ref([])
    const form = ref({
      id: null,
      tipo_documento: 'CC',
      numero_identificacion: '',
      nombres: '',
      apellidos: '',
      fecha_ingreso: '',
      estado: 'Activo',
      usuario: '',
      rol: 'Mesero',
      ciudad: 'Manizales',
      correo: '',
      telefono: '',
      foto: null,
      fotoPreview: null
    })

    // Stores
    const authStore = useAuthStore()
    const requestDeleteSecurity = useDeleteSecurity()

    // Métodos
    const fetchPersonal = async () => {
      try {
        const data = await personalService.getAll()
        personal.value = Array.isArray(data) ? data : []
      } catch (error) {
        console.error('Error cargando personal:', error)
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

    const nuevoPersonal = () => {
      form.value = {
        id: null,
        tipo_documento: 'CC',
        numero_identificacion: '',
        nombres: '',
        apellidos: '',
        fecha_ingreso: '',
        estado: 'Activo',
        usuario: '',
        rol: 'Mesero',
        ciudad: 'Manizales',
        correo: '',
        telefono: '',
        foto: null,
        fotoPreview: null
      }
      isEdit.value = false
      showModal.value = true
    }

    const editarPersonal = async (id) => {
      try {
        let emp = await personalService.getById(id)

        // Fallback local: si el endpoint devuelve vacío, usa los datos ya cargados en la lista.
        if (!emp) {
          emp = personal.value.find(item => Number(item.id) === Number(id)) || null
        }

        if (!emp) {
          throw new Error('No se encontraron datos del personal seleccionado')
        }

        const fechaIngreso = emp.fecha_ingreso
          ? String(emp.fecha_ingreso).slice(0, 10)
          : ''

        form.value = {
          ...form.value,
          ...emp,
          fecha_ingreso: fechaIngreso,
          foto: null,
          fotoPreview: getPersonalImageUrl(emp.url_foto, emp.nombres)
        }

        isEdit.value = true
        showModal.value = true
      } catch (error) {
        alert(error?.message || 'Error cargando datos del personal')
      }
    }

    const guardarPersonal = async () => {
      saving.value = true
      const formData = new FormData()
      Object.keys(form.value).forEach(key => {
        if (key === 'fotoPreview') return
        if (form.value[key] !== null && form.value[key] !== undefined) {
          // Formatear fecha_ingreso al formato YYYY-MM-DD
          if (key === 'fecha_ingreso' && form.value[key]) {
            const date = new Date(form.value[key])
            const formattedDate = date.toISOString().split('T')[0]
            formData.append(key, formattedDate)
          } else {
            formData.append(key, form.value[key])
          }
        }
      })

      try {
        await personalService.save(formData, form.value.id)
        alert('Datos guardados con éxito')
        closeModal()
        fetchPersonal()
      } catch (error) {
        alert(error.message || 'Error al guardar')
      } finally {
        saving.value = false
      }
    }

    const eliminarPersonal = async (id, nombres) => {
      await requestDeleteSecurity({
        execute: async () => {
          const result = await personalService.delete(id)
          if (result?.success === false) {
            throw new Error(result.message || 'No se pudo eliminar el registro de personal.')
          }
          await fetchPersonal()
        },
        mensajeAdvertencia: 'Al eliminar este usuario, se perderá su perfil, pero sus acciones quedarán registradas en la auditoría como anónimas.',
        successMessage: `Registro de ${nombres} eliminado correctamente.`,
        errorMessage: `No se pudo eliminar a ${nombres}.`
      })
    }

    const toggleEstado = async (id, estadoActual) => {
      const nuevoEstado = estadoActual?.toLowerCase() === 'activo' ? 'inactivo' : 'activo'
      try {
        await personalService.updateEstado(id, nuevoEstado)
        await fetchPersonal()
      } catch (error) {
        alert('Error cambiando estado')
      }
    }

    const toggleEstadoEnModal = async () => {
      const estadoActual = form.value.estado || 'Activo'
      const nuevoEstado = estadoActual.toLowerCase() === 'activo' ? 'Inactivo' : 'Activo'

      if (!form.value.id) {
        form.value.estado = nuevoEstado
        return
      }

      try {
        await personalService.updateEstado(form.value.id, nuevoEstado.toLowerCase())
        form.value.estado = nuevoEstado
        await fetchPersonal()
      } catch (error) {
        alert('Error cambiando estado')
      }
    }

    const borrarContrasena = async () => {
      await requestDeleteSecurity({
        execute: async () => {
          const result = await personalService.clearPassword(form.value.id)
          if (result?.success === false) {
            throw new Error(result.message || 'No se pudo borrar la contrasena del empleado.')
          }
        },
        successMessage: 'Contrasena eliminada correctamente.',
        errorMessage: 'Error al borrar contrasena.'
      })
    }

    const closeModal = () => {
      showModal.value = false
    }

    const previewFoto = (event) => {
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

    const getPersonalImageUrl = (filename, nombres = 'Usuario') => {
      if (!filename) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(nombres)}&background=f1f5f9&color=64748b`
      }

      if (filename.startsWith('http://') || filename.startsWith('https://')) return filename
      if (filename.startsWith('/uploads/')) return `${UPLOADS_BASE}${filename}?t=${new Date().getTime()}`

      return `${UPLOADS_BASE}/uploads/personal/${filename}`
    }

    const handlePersonalImageError = (event, nombres = 'Usuario') => {
      event.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombres)}&background=f1f5f9&color=64748b`
    }

    const formatDate = (dateString) => {
      if (!dateString) return '---'
      return new Date(dateString).toLocaleDateString('es-ES')
    }

    // Lifecycle
    onMounted(fetchPersonal)

    // Retornar estado y métodos
    return {
      personal,
      loading,
      showModal,
      isEdit,
      saving,
      expanded,
      form,
      fetchPersonal,
      toggleAcordeon,
      nuevoPersonal,
      editarPersonal,
      guardarPersonal,
      eliminarPersonal,
      toggleEstado,
      toggleEstadoEnModal,
      borrarContrasena,
      closeModal,
      previewFoto,
      getPersonalImageUrl,
      handlePersonalImageError,
      formatDate
    }
  }
}
</script>

<style scoped>
/*
  STYLE: Estilos específicos para Personal.
  - Scoped para evitar conflictos.
  - Animaciones y transiciones.
*/
.animate-fadeIn {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
<template>
  <div class="articulos-shell admin-crud-shell min-h-screen w-full max-w-full overflow-x-hidden p-4 md:p-6">

    <!-- Barra de acciones -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <!-- Búsqueda -->
      <div class="relative flex-1 max-w-sm">
          <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
        <input
          v-model="busqueda"
          type="text"
          placeholder="Buscar artículo..."
            class="w-full bg-white/90 border border-slate-200 text-slate-700 placeholder-slate-400 rounded-2xl pl-11 pr-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-cyan-100 shadow-sm transition-all"
        />
      </div>
      <!-- Nuevo Artículo -->
        <button @click="nuevoArticulo" class="pb-btn pb-btn-new px-5 py-3 whitespace-nowrap text-[11px]">
        <i class="fas fa-plus text-sm"></i>
        Nuevo Artículo
      </button>
    </div>

    <!-- Contador -->
    <p class="text-gray-400 text-xs uppercase font-bold tracking-widest mb-4">
      {{ articulosFiltrados.length }} artículo{{ articulosFiltrados.length !== 1 ? 's' : '' }}
    </p>

    <!-- Estado: cargando -->
    <div v-if="loading" class="flex justify-center items-center py-24">
      <div class="animate-spin rounded-full h-10 w-10 border-2 border-teal-600 border-t-transparent"></div>
    </div>

    <!-- Estado: vacío -->
    <div v-else-if="articulosFiltrados.length === 0" class="panel-soft rounded-3xl p-16 text-center">
      <i class="fas fa-box-open text-4xl text-gray-300 mb-4 block"></i>
      <p class="text-gray-400 font-semibold text-lg">No hay artículos{{ busqueda ? ' con esa búsqueda' : ' registrados' }}</p>
    </div>

    <!-- Lista de artículos -->
    <div v-else class="space-y-3 w-full max-w-full">
      <article
        v-for="art in articulosFiltrados"
        :key="art.id"
        class="inventory-card w-full max-w-full rounded-[1.7rem] transition-all overflow-hidden px-4 py-3 sm:px-5 sm:py-4"
      >
        <div class="flex flex-wrap lg:flex-nowrap items-center gap-4 w-full">
          <div class="article-photo-box shrink-0 w-full sm:w-[170px] rounded-2xl p-2.5 flex items-center gap-3 border">
            <div class="w-12 h-12 rounded-xl bg-cyan-50 border border-slate-200 overflow-hidden flex items-center justify-center">
              <img v-if="art.url_foto" :src="getImageUrl(art.url_foto)" class="object-cover w-full h-full" @error="handleImageError" @load="event => { event.target.style.display = '' }" />
              <i v-else class="fas fa-utensils text-gray-300 text-base"></i>
            </div>
            <div>
              <p class="text-[8px] font-black admin-card-title uppercase">Foto</p>
              <p class="text-[11px] font-bold admin-card-title mt-1">Articulo</p>
            </div>
          </div>

          <div class="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <div>
              <p class="text-[9px] font-black admin-card-title uppercase mb-1">Artículo</p>
              <p class="font-bold text-gray-800 text-sm uppercase break-words">{{ art.nombre }}</p>
            </div>
            <div>
              <p class="text-[9px] font-black admin-card-title uppercase mb-1">Tipo</p>
              <p class="font-bold text-gray-700 text-sm uppercase break-words">{{ art.tipo || '---' }}</p>
            </div>
            <div>
              <p class="text-[9px] font-black admin-card-title uppercase mb-1">Stock Actual</p>
              <p class="font-bold text-sm leading-tight" :class="isPorAgotar(art) ? 'text-rose-700' : 'text-teal-800'">
                {{ parseFloat(art.stock_actual || 0).toFixed(2) }} {{ art.unidad_abreviatura || '' }}
              </p>
              <span
                v-if="isPorAgotar(art)"
                class="inline-flex mt-2 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-300 bg-amber-100 text-amber-800"
              >
                POR AGOTAR
              </span>
            </div>
            <div>
              <p class="text-[9px] font-black admin-card-title uppercase mb-1">Stock Mínimo</p>
              <p class="font-bold text-gray-700 text-sm leading-tight">
                {{ parseFloat(art.stock_minimo || 0).toFixed(2) }} {{ art.unidad_abreviatura || '' }}
              </p>
            </div>
            <div>
              <p class="text-[9px] font-black admin-card-title uppercase mb-1">Costo Unitario</p>
              <p class="font-bold text-gray-800 text-sm leading-tight">{{ formatMoney(art.costo_unitario || 0) }}</p>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0 w-full sm:w-auto sm:ml-auto justify-end">
            <button
              @click="editarArticulo(art.id)"
              title="Editar"
              class="pb-btn pb-btn-edit btn-icon-text text-xs px-4 py-2"
            >
              <i class="fas fa-pen-to-square text-[11px]"></i>
              <span>Editar</span>
            </button>
            <button
              @click="eliminarArticulo(art.id)"
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

    <!-- ══════════ MODAL CREAR / EDITAR ══════════ -->
    <transition name="modal-fade">
      
        <div v-if="showModal" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden border border-white/20">
          
          <div class="bg-teal-700 p-6 text-white flex justify-between items-center">
            <h3 class="text-xs font-black uppercase tracking-[0.2em] italic">{{ isEdit ? 'Editar' : 'Nuevo' }} Artículo</h3>
            <button @click="closeModal" class="pb-btn pb-btn-secondary btn-icon-text px-3 py-1.5 text-[10px]">
              <i class="fas fa-times"></i>
              <span>Cerrar</span>
            </button>
          </div>

          <form @submit.prevent="guardarArticulo" class="p-8 space-y-5">
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Nombre del Artículo</label>
              <input
                v-model="form.nombre"
                type="text"
                required
                placeholder="Ej: HARINA DE TRIGO ESPECIAL"
                @input="form.nombre = form.nombre.toUpperCase()"
                class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium uppercase"
              >
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Tipo</label>
                <select v-model="form.tipo" required class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium appearance-none">
                  <option value="" disabled>Seleccionar...</option>
                  <option value="insumo">INSUMO</option>
                  <option value="materia_prima">MATERIA PRIMA</option>
                  <option value="empaque">EMPAQUE</option>
                  <option value="producto_procesado">PRODUCTO PROCESADO</option>
                </select>
              </div>

              <div>
                <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Unidad de Medida</label>
                <select v-model="form.unidad_id" required class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium appearance-none">
                  <option value="" disabled>Seleccionar...</option>
                  <option v-for="u in unidades" :key="u.id" :value="u.id">{{ u.nombre }} ({{ u.abreviatura }})</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Stock Actual</label>
                <input v-model.number="form.stock_actual" type="number" step="1" min="0" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium" />
              </div>

              <div>
                <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Stock Mínimo</label>
                <input v-model.number="form.stock_minimo" type="number" step="1" min="0" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Costo Unitario ($)</label>
                <input
                  v-model="form.costo_unitario"
                  type="text"
                  required
                  @blur="onBlurMoney('costo_unitario')"
                  class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium text-right"
                />
              </div>
              <div></div>
            </div>

            <div class="flex flex-col items-center mb-4">
              <div class="w-32 h-32 rounded-3xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 transition-all">
                <i v-if="!form.fotoPreview" class="fas fa-image text-2xl text-gray-300"></i>
                <img v-else :src="form.fotoPreview" class="w-full h-full object-cover">
              </div>
              <button type="button" @click="$refs.fotoInput.click()" class="pb-btn pb-btn-secondary mt-3 px-3 py-1.5 text-[9px]">
                <i class="fas fa-upload mr-1"></i> Seleccionar Foto
              </button>
              <input ref="fotoInput" type="file" accept="image/*" @change="handleFileChange" class="hidden">
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
    </transition>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { articuloService } from '../services/articuloService.js'
import { unidadService } from '../services/unidadService.js'
import { useDeleteSecurity } from '../composables/useDeleteSecurity.js'

export default {
  name: 'Articulos',
  setup() {
    const requestDeleteSecurity = useDeleteSecurity()
    const articulos = ref([])
    const unidades = ref([])
    const loading = ref(true)
    const showModal = ref(false)
    const isEdit = ref(false)
    const saving = ref(false)
    const busqueda = ref('')
    const archivoImagen = ref(null)

    const form = ref({
      id: null,
      nombre: '',
      tipo: '',
      unidad_id: '',
      stock_actual: 0,
      stock_minimo: 0,
      costo_unitario: '0,00',
      fotoPreview: null
    })

    const localeParts = new Intl.NumberFormat(undefined).formatToParts(12345.6)
    const localeGroup = localeParts.find((p) => p.type === 'group')?.value || ','
    const localeDecimal = localeParts.find((p) => p.type === 'decimal')?.value || '.'

    const parseLocaleNumber = (value) => {
      if (value === null || value === undefined || value === '') return 0;
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      const raw = String(value).trim().replace(/\s+/g, '').replace(/[\$€£¥₱₡₲₴₦₵R$]/g, '')
      const normalized = raw
        .replace(new RegExp(`\\${localeGroup}`, 'g'), '')
        .replace(new RegExp(`\\${localeDecimal}`, 'g'), '.')
        .replace(/,/g, '.')
        .replace(/[^\d.-]/g, '')
      const n = Number(normalized);
      return Number.isFinite(n) ? n : 0;
    };

    const systemMoneyFormatter = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })

    const formatNumber = (value) => systemMoneyFormatter.format(parseLocaleNumber(value));

    const formatMoney = (value) => parseLocaleNumber(value).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    const onBlurMoney = (field) => {
      form.value[field] = formatNumber(parseLocaleNumber(form.value[field]));
    };

    const articulosFiltrados = computed(() => {
      if (!busqueda.value.trim()) return articulos.value
      const q = busqueda.value.toLowerCase()
      return articulos.value.filter(a =>
        a.nombre?.toLowerCase().includes(q) ||
        a.tipo?.toLowerCase().includes(q)
      )
    })

    const tipoBadgeClass = (tipo) => {
      const normalized = String(tipo || '').toUpperCase().replace(/_/g, ' ').trim()
      const map = {
        'INSUMO': 'bg-teal-100 text-teal-800 border-teal-200',
        'MATERIA PRIMA': 'bg-cyan-100 text-cyan-800 border-cyan-200',
        'EMPAQUE': 'bg-slate-200 text-slate-700 border-slate-300',
        'LIMPIEZA': 'bg-sky-100 text-sky-700 border-sky-200',
        'OTRO': 'bg-zinc-100 text-zinc-700 border-zinc-200',
        'PRODUCTO PROCESADO': 'bg-amber-100 text-amber-800 border-amber-200'
      }
      return map[normalized] || 'bg-zinc-100 text-zinc-700 border-zinc-200'
    }

    const isPorAgotar = (articulo) => Number(articulo?.stock_actual || 0) <= Number(articulo?.stock_minimo || 0)

    const fetchArticulos = async () => {
      try {
        const data = await articuloService.getAll()
        // DEBUG: respuesta cruda del endpoint de artículos
        console.log('DEBUG fetchArticulos - raw response:', data)
        const arr = Array.isArray(data) ? data : []
        // Asegurar que costo_unitario sea numérico (Number) para evitar errores de parseo
        articulos.value = arr.map(a => ({
          ...a,
          costo_unitario: Number(a?.costo_unitario ?? 0)
        }))
        // DEBUG: articulos mapeados
        console.log('DEBUG fetchArticulos - mapped articulos (sample):', articulos.value.slice(0, 10))
      } catch (error) {
        console.error('Error cargando artículos:', error)
      } finally {
        loading.value = false
      }
    }

    const fetchUnidades = async () => {
      try {
        const res = await unidadService.getAll()
        // unidadService wraps: { data: apiResponse, success } where apiResponse = { success, data: rows }
        const arr = Array.isArray(res) ? res
                  : Array.isArray(res?.data) ? res.data
                  : Array.isArray(res?.data?.data) ? res.data.data
                  : []
        unidades.value = arr
      } catch (error) {
        console.error('Error cargando unidades:', error)
      }
    }

    const nuevoArticulo = () => {
      form.value = { id: null, nombre: '', tipo: '', unidad_id: '', stock_actual: 0, stock_minimo: 0, costo_unitario: formatMoney(0), fotoPreview: null }
      archivoImagen.value = null
      isEdit.value = false
      showModal.value = true
    }

    const editarArticulo = async (id) => {
      try {
        const art = await articuloService.getById(id)
        // DEBUG: mostrar valor recibido del API para diagnosticar formato de costo_unitario
        console.log('DEBUG editarArticulo - art.costo_unitario =', art.costo_unitario)
        console.log('DEBUG editarArticulo - typeof art.costo_unitario =', typeof art.costo_unitario)
        console.log('DEBUG editarArticulo - articulo completo =', art)
      form.value = {
          id: art.id,
          nombre: art.nombre || '',
          tipo: art.tipo || '',
          unidad_id: art.unidad_id || '',
          stock_actual: art.stock_actual || 0,
          stock_minimo: art.stock_minimo || 0,
        costo_unitario: formatMoney(parseLocaleNumber(art.costo_unitario || 0)),
          fotoPreview: art.url_foto || null
        }
        archivoImagen.value = null
        isEdit.value = true
        showModal.value = true
      } catch (error) {
        alert('Error cargando artículo')
      }
    }

    const handleFileChange = (e) => {
      const file = e.target.files[0]
      archivoImagen.value = file || null
      if (file) {
        const reader = new FileReader()
        reader.onload = (evt) => {
          form.value.fotoPreview = evt.target.result
        }
        reader.readAsDataURL(file)
      }
    }

    const guardarArticulo = async () => {
      saving.value = true
      try {
        const fd = new FormData()
        fd.append('nombre', form.value.nombre)
        fd.append('tipo', form.value.tipo)
        fd.append('unidad_id', form.value.unidad_id)
        fd.append('stock_actual', form.value.stock_actual)
        fd.append('stock_minimo', form.value.stock_minimo)
        fd.append('costo_unitario', parseLocaleNumber(form.value.costo_unitario))
        if (archivoImagen.value) fd.append('foto', archivoImagen.value)

        await articuloService.save(fd, form.value.id)
        await fetchArticulos()
        closeModal()
      } catch (error) {
        alert('Error guardando artículo: ' + error.message)
      } finally {
        saving.value = false
      }
    }

    const eliminarArticulo = async (id) => {
      await requestDeleteSecurity({
        execute: async () => {
          const result = await articuloService.delete(id)
          if (result?.success === false) {
            throw new Error(result.message || 'No se pudo eliminar el articulo.')
          }
          await fetchArticulos()
        },
        mensajeAdvertencia: 'Al eliminar este artículo/insumo, se borrará de todas las fichas técnicas y compras donde aparezca.',
        successMessage: 'Articulo eliminado correctamente.',
        errorMessage: 'Error eliminando articulo.'
      })
    }

    const closeModal = () => { showModal.value = false }

    const handleImageError = (event) => {
      event.target.style.display = 'none'
    }

    const getImageUrl = (url) => {
      if (!url) return null
      // Añadir timestamp para evitar caché del navegador
      return `${url}?t=${new Date().getTime()}`
    }

    onMounted(() => {
      fetchArticulos()
      fetchUnidades()
    })

    return {
      articulos, unidades, loading, showModal, isEdit, saving,
      busqueda, form, articulosFiltrados,
      tipoBadgeClass, fetchArticulos,
      isPorAgotar,
      nuevoArticulo, editarArticulo, guardarArticulo,
      eliminarArticulo, closeModal, handleImageError, handleFileChange,
      formatMoney, onBlurMoney, getImageUrl
    }
  }
}
</script>

<style scoped lang="postcss">
.articulos-shell {
  --bg-a: var(--pb-bg-a);
  --bg-b: var(--pb-bg-b);
  --panel: var(--pb-panel);
  font-family: var(--pb-font-ui);
  background:
    radial-gradient(circle at 5% 5%, rgba(var(--pb-rgb-teal-700), 0.16) 0, transparent 36%),
    radial-gradient(circle at 90% 10%, rgba(var(--pb-rgb-cyan-500), 0.18) 0, transparent 30%),
    linear-gradient(180deg, var(--bg-a), var(--bg-b));
  border-radius: 2rem;
}

.inventory-card {
  background: var(--panel);
  border: 1px solid var(--pb-border-soft);
  box-shadow: var(--pb-shadow-soft);
}

.panel-soft {
  background: var(--pb-panel);
  border: 1px solid var(--pb-border-soft);
  box-shadow: var(--pb-shadow-soft);
}

.tipo-badge {
  @apply inline-block px-2 py-0.5 text-[9px] font-black uppercase rounded-md border tracking-widest;
}

/* Modal */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
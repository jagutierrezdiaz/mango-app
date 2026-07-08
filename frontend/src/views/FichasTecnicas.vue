<template>
	<!--
		TEMPLATE: Vista de Fichas Técnicas (antes Productos).
		- Header con botón Nuevo.
		- Lista de productos con detalles expandibles (ficha técnica).
		- Modal para crear/editar con foto.
	-->
	<div class="productos-view admin-crud-shell animate-fadeIn min-h-screen w-full max-w-7xl overflow-x-hidden p-4 md:p-6 mx-auto">
		<div class="mb-8 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 border-b pb-6">
			<div>
				<h1 class="admin-crud-title text-3xl font-black text-teal-700 italic uppercase tracking-tighter">Fichas Técnicas</h1>
				<p class="admin-crud-subtitle text-[10px] uppercase tracking-widest font-black">Patio Bohemio / Gestión de Menú</p>
			</div>
			<div class="w-full lg:w-auto flex flex-col sm:flex-row sm:items-center gap-3">
				<div class="relative w-full sm:w-80">
					<i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
					<input
						v-model="busqueda"
						type="text"
						placeholder="Buscar producto..."
						class="w-full bg-white/90 border border-slate-200 text-slate-700 placeholder-slate-400 rounded-2xl pl-11 pr-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-cyan-100 shadow-sm transition-all"
					/>
				</div>
				<button @click="nuevoProducto" class="pb-btn pb-btn-new px-4 py-2 text-[11px] whitespace-nowrap">
					<i class="fas fa-plus"></i> Nuevo Producto
				</button>
			</div>
		</div>

		<!-- Lista de Productos -->
		<div v-if="loading" class="flex items-center justify-center p-32 bg-white/50 rounded-[40px] border-2 border-dashed border-gray-100 shadow-inner animate-fadeIn">
			<p class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Cargando productos...</p>
		</div>
		<div v-else-if="Object.keys(productosAgrupados).length === 0" class="flex items-center justify-center p-32 bg-white/50 rounded-[40px] border-2 border-dashed border-gray-100 shadow-inner animate-fadeIn">
			<p class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic">No hay productos{{ busqueda ? ' con esa búsqueda' : ' registrados' }}</p>
		</div>
		<div v-else class="space-y-4 w-full max-w-full">
			<section
				v-for="(productosPorCategoria, categoria) in productosAgrupados"
				:key="categoria"
				class="mb-10"
			>
				<div class="sticky top-0 z-10 mb-4 rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-emerald-50/80 px-4 py-3 shadow-sm backdrop-blur-sm">
					<div class="flex items-center justify-between gap-3">
						<div class="flex items-center gap-3 min-w-0">
							<div class="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-emerald-700">
								<i :class="getCategoriaIcon(categoria)"></i>
							</div>
							<p class="text-xs sm:text-sm font-black uppercase tracking-[0.18em] text-slate-700 truncate">
								{{ categoria }} ({{ productosPorCategoria.length }})
							</p>
						</div>
					</div>
				</div>

				<article v-for="p in productosPorCategoria" :key="p.id" class="admin-crud-panel rounded-2xl overflow-hidden mb-3 border border-slate-200 bg-white/95">
					<div class="flex flex-wrap lg:flex-nowrap items-center gap-3 p-4 sm:p-5 hover:bg-slate-50/70 transition-colors">
						<div class="flex-1 min-w-0">
							<div class="flex flex-wrap lg:flex-nowrap items-center gap-4">
								<div class="w-full sm:w-[220px] lg:w-52 bg-slate-50/80 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
									<div class="flex items-center gap-3 flex-1 min-w-0">
										<div class="w-12 h-12 rounded-lg overflow-hidden bg-white shadow-inner border border-gray-200 flex-shrink-0">
											<img :src="getProductoImageUrl(p.url_foto)" @error="handleProductImageError" class="w-full h-full object-cover"    @load="event => { event.target.style.display = '' }">
										</div>
										<div>
											<p class="text-[8px] font-black admin-card-title uppercase">Foto</p>
											<p class="text-[11px] font-bold admin-card-title mt-1">Producto</p>
										</div>
									</div>
									<button
										type="button"
										:aria-expanded="expanded.includes(p.id)"
										@click.stop="toggleDetalle(p.id)"
										class="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-teal-100 text-slate-700 hover:text-teal-700 font-bold rounded-lg transition-all border border-slate-300 hover:border-teal-300"
									>
										<i :class="['fas fa-chevron-down transition-transform text-[13px]', expanded.includes(p.id) ? 'rotate-180' : '']"></i>
									</button>
								</div>

								<div class="w-full lg:flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-3">
									<div>
										<p class="text-[9px] font-black admin-card-title uppercase mb-1">Producto</p>
										<p class="font-bold text-gray-800 text-sm uppercase break-words">{{ p.nombre }}</p>
									</div>
									<div>
										<p class="text-[9px] font-black admin-card-title uppercase mb-1">Categoría</p>
										<p class="font-bold text-gray-700 text-sm uppercase break-words">{{ p.categoria_nombre || 'SIN CATEGORÍA' }}</p>
									</div>
									<div>
										<p class="text-[9px] font-black admin-card-title uppercase mb-1">Estado</p>
										<span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border" :class="estadoBadgeClass(p.estado)">
											{{ p.estado || 'Activo' }}
										</span>
									</div>
								</div>
							</div>
						</div>

						<div class="w-full sm:w-auto flex items-center justify-end gap-2 lg:ml-auto">
							<button
								@click.stop="editarProducto(p.id)"
								class="pb-btn pb-btn-edit btn-icon-text text-xs px-3 py-1.5"
							>
								<i class="fas fa-pen-to-square text-[11px]"></i>
								<span class="hidden sm:inline">Editar</span>
							</button>
							<button
								@click.stop="eliminarProducto(p.id)"
								class="pb-btn pb-btn-danger btn-icon-text text-xs px-3 py-1.5"
							>
								<i class="fas fa-trash-can text-[11px]"></i>
								<span class="hidden sm:inline">Borrar</span>
							</button>
						</div>
					</div>

					<div v-show="expanded.includes(p.id)" class="border-t border-slate-200 bg-slate-50/60 p-6 animate-fadeIn">
						<FichaTecnica :productoId="p.id" />
					</div>
				</article>
			</section>
		</div>

		<!-- Modal para Crear/Editar -->
		<div v-if="showModal" id="modal-producto" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
			<div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
				<div class="bg-teal-700 p-6 text-white flex justify-between items-center">
					<h3 class="text-xs font-black uppercase tracking-[0.2em] italic">{{ isEdit ? 'Editar' : 'Nuevo' }} Producto</h3>
					<button @click="closeModal" class="pb-btn pb-btn-secondary btn-icon-text px-3 py-1.5 text-[10px]">
						<i class="fas fa-times"></i>
						<span>Cerrar</span>
					</button>
				</div>
				<form @submit.prevent="guardarProducto" class="p-8 space-y-5">
					<input type="hidden" v-model="form.id">

					<div class="flex flex-col items-center mb-4">
						<div class="w-32 h-32 rounded-3xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 transition-all">
							<i v-if="!form.fotoPreview" class="fas fa-camera text-2xl text-gray-300"></i>
							<img v-else :src="form.fotoPreview" class="w-full h-full object-cover">
						</div>
						<button type="button" @click="$refs.fotoInput.click()" class="pb-btn pb-btn-secondary mt-3 px-3 py-1.5 text-[9px]">
							<i class="fas fa-upload mr-1"></i> Seleccionar Foto
						</button>
						<input ref="fotoInput" type="file" accept="image/*" @change="previewImagen" class="hidden">
					</div>

					<div>
						<label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Nombre del Producto</label>
						<input v-model="form.nombre" type="text" required @input="form.nombre = form.nombre.toUpperCase()" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium">
					</div>

					<div>
						<label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Categoría</label>
						<select v-model="form.categoria_id" required class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium appearance-none">
							<option value="">Seleccione Categoría</option>
							<option v-for="cat in categorias" :key="cat.id" :value="cat.id">{{ cat.nombre }}</option>
						</select>
					</div>

					<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between gap-3">
						<div class="flex items-center gap-2">
							<span class="text-[10px] font-black uppercase tracking-widest text-slate-500">Estado:</span>
							<span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border" :class="estadoBadgeClass(form.estado)">
								{{ form.estado }}
							</span>
						</div>
						<button
							v-if="isEdit"
							type="button"
							@click="toggleEstado"
							class="pb-btn pb-btn-warn btn-icon-text px-3 py-1.5 text-[11px]"
						>
							<i class="fas fa-repeat"></i>
							<span>{{ form.estado === 'Activo' ? 'Cambiar a Inactivo' : 'Cambiar a Activo' }}</span>
						</button>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { productoService } from '../services/productoService.js'
import { categoriasService } from '../services/categoriaService.js'
import FichaTecnica from './FichaTecnica.vue'
import { API_BASE_URL, BACKEND_ORIGIN } from '../config/api.js'
import { useDeleteSecurity } from '../composables/useDeleteSecurity.js'
import swal from 'sweetalert2'

const API_BASE = API_BASE_URL
const UPLOADS_BASE = (
	(typeof process !== 'undefined' && process.env && process.env.VUE_APP_UPLOADS_BASE_URL) ||
	API_BASE.replace(/\/api\/?$/, '') ||
	BACKEND_ORIGIN
).replace(/\/$/, '')

export default {
	name: 'FichasTecnicas',
	components: {
		FichaTecnica
	},
	setup() {
		const requestDeleteSecurity = useDeleteSecurity()
		// Estado Reactivo
		const productos = ref([])
		const categorias = ref([])
		const loading = ref(true)
		const showModal = ref(false)
		const isEdit = ref(false)
		const saving = ref(false)
		const expanded = ref([])
		const busqueda = ref('')
		const form = ref({
			id: null,
			nombre: '',
			categoria_id: '',
			estado: 'Activo',
			imagen_url: null,
			fotoPreview: null
		})

		const productosFiltrados = computed(() => {
			const q = busqueda.value.trim().toLowerCase()
			if (!q) return productos.value

			return productos.value.filter((p) => (
				String(p.nombre || '').toLowerCase().includes(q)
				|| String(p.categoria?.nombre || '').toLowerCase().includes(q)
				|| String(p.categoria_nombre || '').toLowerCase().includes(q)
				|| String(p.estado || '').toLowerCase().includes(q)
			))
		})

		const obtenerNombreCategoria = (producto) => {
			const categoriaNombre = producto?.categoria?.nombre || producto?.categoria_nombre || 'SIN CATEGORÍA'
			return String(categoriaNombre).trim().toUpperCase()
		}

		const productosAgrupados = computed(() => {
			const grupos = {}
			for (const producto of productosFiltrados.value) {
				const categoriaNombre = obtenerNombreCategoria(producto)
				if (!categoriaNombre) continue
				if (!grupos[categoriaNombre]) grupos[categoriaNombre] = []
				grupos[categoriaNombre].push(producto)
			}
			return grupos
		})

		const getCategoriaIcon = (categoria) => {
			const nombre = String(categoria || '').toUpperCase()
			if (nombre.includes('CAF')) return 'fas fa-mug-hot'
			if (nombre.includes('BEBIDA') || nombre.includes('JUGO') || nombre.includes('REFRESCO')) return 'fas fa-glass-water'
			if (nombre.includes('POSTRE') || nombre.includes('DULCE')) return 'fas fa-cookie-bite'
			if (nombre.includes('ENTRADA') || nombre.includes('SNACK')) return 'fas fa-bowl-food'
			if (nombre.includes('COCTEL') || nombre.includes('LICOR') || nombre.includes('BAR')) return 'fas fa-martini-glass-citrus'
			if (nombre.includes('PLATO') || nombre.includes('ALMUERZO') || nombre.includes('CENA')) return 'fas fa-utensils'
			return 'fas fa-layer-group'
		}

		const estadoBadgeClass = (estado) => {
			if (estado === 'Inactivo') return 'border-rose-200 bg-rose-50 text-rose-700'
			return 'border-emerald-200 bg-emerald-50 text-emerald-700'
		}

		// Métodos
		const fetchProductos = async () => {
			loading.value = true
			try {
				console.log('🔵 Iniciando carga de productos...')
				const data = await productoService.getAll()
				console.log('✅ Productos recibidos:', data)
        
				productos.value = Array.isArray(data) ? data : []
				console.log('✅ Productos cargados:', productos.value.length, 'items')
			} catch (error) {
				console.error('❌ Error cargando productos:', error)
				productos.value = []
			} finally {
				loading.value = false
			}
		}

		const cargarCategorias = async () => {
			try {
				console.log('🔵 Cargando categorías...')
				const result = await categoriasService.getAll()
				console.log('✅ Categorías recibidas:', result)
        
				categorias.value = Array.isArray(result) ? result : []
				console.log('✅ Categorías cargadas:', categorias.value.length, 'items')
			} catch (error) {
				console.error('❌ Error cargando categorías:', error)
				categorias.value = []
			}
		}

		const toggleDetalle = (id) => {
			const index = expanded.value.indexOf(id)
			if (index > -1) {
				expanded.value.splice(index, 1)
			} else {
				// Cerrar otros
				expanded.value.splice(0, expanded.value.length, id)
			}
		}

		const nuevoProducto = async () => {
			await cargarCategorias()
			form.value = { id: null, nombre: '', categoria_id: '', estado: 'Activo', imagen_url: null, fotoPreview: null }
			isEdit.value = false
			showModal.value = true
		}

		const editarProducto = async (id) => {
			try {
				const prod = await productoService.getById(id)
				await cargarCategorias()
				form.value = {
					id: prod.id,
					nombre: prod.nombre,
					categoria_id: prod.categoria_id,
					estado: prod.estado || 'Activo',
					imagen_url: null,
					fotoPreview: getProductoImageUrl(prod.url_foto)
				}
				isEdit.value = true
				showModal.value = true
			} catch (error) {
				alert('Error cargando producto')
			}
		}

		const guardarProducto = async () => {
			saving.value = true
			const formData = new FormData()
			formData.append('id', form.value.id || '')
			formData.append('nombre', form.value.nombre)
			formData.append('categoria_id', form.value.categoria_id)
			formData.append('estado', form.value.estado || 'Activo')
			if (form.value.imagen_url) formData.append('imagen_url', form.value.imagen_url)

			try {
				const result = await productoService.save(formData, form.value.id)
				if (result.success) {
					swal.fire({
						title: 'Éxito',
						text: form.value.id ? 'Producto actualizado correctamente' : 'Producto guardado correctamente',
						icon: 'success',
						confirmButtonText: 'Aceptar'
					})
					closeModal()
					fetchProductos()
				} else {
					alert(result.message || 'Error al guardar producto')
				}
			} catch (error) {
				swal.fire({
					title: 'Error',
					text: error.message || 'Error de conexión con el servidor',
					icon: 'error',
					confirmButtonText: 'Aceptar'
				})
			} finally {
				saving.value = false
			}
		}

		const eliminarProducto = async (id) => {
			await requestDeleteSecurity({
				execute: async () => {
					const result = await productoService.delete(id)
					if (result?.success === false) {
						throw new Error(result.message || 'No se pudo eliminar el producto.')
					}
					await fetchProductos()
				},
				mensajeAdvertencia: 'Al eliminar este producto, se borrará también su ficha técnica, movimientos de inventario y detalles en comandas. Esta acción es irreversible.',
				successMessage: 'Producto eliminado correctamente.',
				errorMessage: 'Error de conexión al eliminar producto.'
			})
		}

		const closeModal = () => {
			showModal.value = false
		}

		const toggleEstado = () => {
			if (!isEdit.value) return
			form.value.estado = form.value.estado === 'Activo' ? 'Inactivo' : 'Activo'
		}

		const previewImagen = (event) => {
			const file = event.target.files[0]
			if (file) {
				form.value.imagen_url = file
				const reader = new FileReader()
				reader.onload = () => {
					form.value.fotoPreview = reader.result
				}
				reader.readAsDataURL(file)
			}
		}

		const getProductoImageUrl = (filename) => {
			const defaultPath = '/uploads/productos/default.png'

			if (!filename) return `${UPLOADS_BASE}${defaultPath}`
			if (filename.startsWith('http://') || filename.startsWith('https://')) return filename
			if (filename.startsWith('/uploads/')) return `${UPLOADS_BASE}${filename}?t=${new Date().getTime()}`

			return `${UPLOADS_BASE}/uploads/productos/${filename}?t=${new Date().getTime()}`
		}

		const handleProductImageError = (event) => {
			event.target.src = `${UPLOADS_BASE}/uploads/productos/default.png`
		}

		const handleCategoriasActualizadas = async () => {
			const notify = window.notifyUi || (() => {})
			notify({
				message: 'Sistema Actualizado: Categorías',
				type: 'info',
				duration: 2400
			})
			await cargarCategorias()
			await fetchProductos()
		}

		const handleProductosActualizados = async (payload = {}) => {
			const play = window.playNotification || (() => Promise.resolve(false))
			const notify = window.notifyUi || (() => {})

			if (!payload?.__pbSoundHandled) await play('system_update.mp3')
			notify({
				message: 'Sistema Actualizado: Productos',
				type: 'info',
				duration: 2600
			})
			await fetchProductos()
		}

		// Handlers para eventos de admin (nuevos nombres de eventos)
		const handleAdminEvent = async (eventName, payload = {}) => {
			const play = window.playNotification || (() => Promise.resolve(false))
			const notify = window.notifyUi || (() => {})

			if (!payload?.__pbSoundHandled) await play('system_update.mp3')
			notify({
				message: 'Sistema Actualizado',
				type: 'info',
				duration: 2600
			})
			await cargarCategorias()
			await fetchProductos()
		}

		// Lifecycle
		onMounted(() => {
			fetchProductos()
			cargarCategorias()
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
			productos,
			categorias,
			loading,
			showModal,
			isEdit,
			saving,
			busqueda,
			expanded,
			productosFiltrados,
			productosAgrupados,
			form,
			fetchProductos,
			cargarCategorias,
			toggleDetalle,
			nuevoProducto,
			editarProducto,
			guardarProducto,
			eliminarProducto,
			closeModal,
			previewImagen,
			getProductoImageUrl,
			getCategoriaIcon,
			handleProductImageError,
			estadoBadgeClass,
			toggleEstado
		}
	}
}
</script>

<style scoped lang="postcss">
/*
	STYLE: Estilos específicos para Fichas Técnicas.
	- Scoped para evitar conflictos.
	- Animaciones y botones personalizados.
*/

.btn-upload-file {
	@apply bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg border border-dashed border-gray-400 text-sm font-bold flex items-center gap-2;
}

.animate-fadeIn {
	animation: fadeIn 0.3s ease-in;
}

.animate-scaleIn {
	animation: scaleIn 0.3s ease-out;
}

@keyframes fadeIn {
	from { opacity: 0; }
	to { opacity: 1; }
}

@keyframes scaleIn {
	from { transform: scale(0.9); opacity: 0; }
	to { transform: scale(1); opacity: 1; }
}

.rotate-180 {
	transform: rotate(180deg);
}
</style>
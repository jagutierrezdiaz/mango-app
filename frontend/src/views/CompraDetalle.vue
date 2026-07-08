<template>
  <div class="ficha-tecnica">
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="flex justify-between items-center px-4 py-3 border-b bg-gray-50">
        <span class="text-[9px] font-black uppercase admin-card-title tracking-widest">Detalle de Compra</span>
        <button @click="abrirModal" class="btn-icon-text text-[10px] bg-slate-900 text-white px-3 py-1.5 rounded-lg font-black hover:bg-orange-600 transition-all">
          <i class="fas fa-plus"></i>
          <span>Nuevo Articulo</span>
        </button>
      </div>

      <div v-if="loading" class="p-5 text-center text-[10px] font-black uppercase text-gray-400">Cargando detalle...</div>
      <div v-else-if="items.length === 0" class="p-5 text-center text-[10px] font-black uppercase text-gray-400">No hay articulos en esta compra</div>
      <div v-else class="space-y-3 p-4 bg-slate-50/40">
        <article v-for="item in items" :key="item.id" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="flex flex-wrap xl:flex-nowrap items-center gap-3 text-xs">
            <div class="min-w-[180px] flex-1">
              <p class="text-[9px] uppercase font-black admin-card-title">Articulo</p>
              <p class="text-sm font-bold text-slate-700 break-words">{{ item.articulo_nombre }}</p>
            </div>

            <div class="min-w-[120px]">
              <p class="text-[9px] uppercase font-black admin-card-title">Cantidad</p>
              <p class="font-semibold text-slate-700">{{ formatNumber(item.cantidad) }} {{ item.unidad_abreviatura || '' }}</p>
            </div>

            <div class="min-w-[130px]">
              <p class="text-[9px] uppercase font-black admin-card-title">Costo Unitario</p>
              <p class="font-semibold text-slate-700">{{ formatMoney(item.costo_unitario) }}</p>
            </div>

            <div class="min-w-[90px]">
              <p class="text-[9px] uppercase font-black admin-card-title">IVA</p>
              <p class="font-semibold text-slate-700">{{ formatPercent(item.iva_porcentaje) }}</p>
            </div>

            <div class="min-w-[130px]">
              <p class="text-[9px] uppercase font-black admin-card-title">Sub Total</p>
              <p class="font-semibold text-slate-700">{{ formatMoney(item.valor_subtotal) }}</p>
            </div>

            <div class="flex gap-2 xl:ml-auto w-full xl:w-auto justify-end">
              <button @click="editarItem(item)" class="pb-btn pb-btn-edit btn-icon-text text-xs px-3 py-1.5 whitespace-nowrap">
                <i class="fas fa-pen-to-square text-[11px]"></i>
                <span>Editar</span>
              </button>
              <button @click="eliminarItem(item.id)" class="pb-btn pb-btn-danger btn-icon-text text-xs px-3 py-1.5 whitespace-nowrap">
                <i class="fas fa-trash-can text-[11px]"></i>
                <span>Borrar</span>
              </button>
            </div>
          </div>
        </article>

        <div class="flex justify-end border-t border-slate-200 pt-4">
          <div class="min-w-[220px] rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-right shadow-sm">
            <p class="text-[9px] uppercase font-black admin-card-title">Total Valor Compra</p>
            <p class="text-base font-black text-teal-700 mt-1">{{ formatMoney(totalDetalleCompra) }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20">
        <div class="bg-teal-700 p-6 text-white flex justify-between items-center">
          <h3 class="text-xs font-black uppercase tracking-[0.2em] italic">{{ isEdit ? 'Editar' : 'Nuevo' }} Articulo</h3>
          <button @click="cerrarModal" class="pb-btn pb-btn-secondary btn-icon-text px-3 py-1.5 text-[10px]">
            <i class="fas fa-times"></i>
            <span>Cerrar</span>
          </button>
        </div>

        <form @submit.prevent="guardarItem" class="p-8 space-y-5">
          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Lista de Articulos</label>
            <div class="relative">
              <input
                ref="inputBusqueda"
                v-model="busquedaArticulo"
                type="text"
                autocomplete="off"
                placeholder="Escribe para buscar el insumo..."
                class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium"
                :class="form.articulo_id ? 'border-amber-400' : ''"
                @input="onInputBusqueda"
                @keydown="onKeydownBusqueda"
                @focus="mostrarDropdown = true"
                @blur="onBlurBusqueda"
              />
              <span v-if="form.articulo_id" class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-amber-500">
                <i class="fas fa-check-circle text-xs"></i>
              </span>
              <ul
                v-if="mostrarDropdown && articulosFiltrados.length > 0"
                class="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto"
              >
                <li
                  v-for="(art, idx) in articulosFiltrados"
                  :key="art.id"
                  class="px-4 py-2 text-sm font-medium cursor-pointer select-none transition-colors"
                  :class="idx === indiceActivo ? 'bg-amber-50 text-amber-700 font-bold' : 'hover:bg-slate-50 text-slate-700'"
                  @mousedown.prevent="seleccionarArticulo(art)"
                >
                  {{ art.nombre }}
                </li>
              </ul>
              <div
                v-else-if="mostrarDropdown && busquedaArticulo.length >= 1 && articulosFiltrados.length === 0"
                class="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-xl px-4 py-3 text-sm text-slate-400 text-center"
              >
                Sin resultados para "{{ busquedaArticulo }}"
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Und</label>
              <input :value="unidadSeleccionada || '---'" readonly class="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-2xl text-sm font-bold text-slate-600 uppercase">
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">IVA</label>
              <input v-model="form.iva_porcentaje" type="text" readonly class="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-2xl text-sm font-bold text-slate-700 text-right">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Cantidad</label>
              <input v-model="form.cantidad" type="text" required @blur="onBlurMoney('cantidad')" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium text-right">
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Costo Unitario</label>
              <input v-model="form.costo_unitario" type="text" required @blur="onBlurMoney('costo_unitario')" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium text-right">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Sub Total</label>
              <input :value="subtotalCalculado" readonly class="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-2xl text-sm font-bold text-slate-700 text-right">
            </div>
            <div></div>
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
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { compraService } from '../services/compraService.js';
import { articuloService } from '../services/articuloService.js';

export default {
  name: 'CompraDetalle',
  props: {
    compraId: {
      type: Number,
      required: true
    }
  },
  emits: ['updated'],
  setup(props, { emit }) {
    const loading = ref(true);
    const saving = ref(false);
    const showModal = ref(false);
    const isEdit = ref(false);
    const items = ref([]);
    const articulos = ref([]);

    // ── Autocomplete ──────────────────────────────────────────────────────────
    const inputBusqueda = ref(null);
    const busquedaArticulo = ref('');
    const mostrarDropdown = ref(false);
    const indiceActivo = ref(-1);

    const normalizarTexto = (str) =>
      String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

    const articulosFiltrados = computed(() => {
      const q = normalizarTexto(busquedaArticulo.value);
      if (!q) return articulos.value.slice(0, 50);
      return articulos.value.filter((a) => normalizarTexto(a.nombre).includes(q)).slice(0, 50);
    });

    const seleccionarArticulo = (art) => {
      form.value.articulo_id = art.id;
      busquedaArticulo.value = art.nombre;
      mostrarDropdown.value = false;
      indiceActivo.value = -1;
      // Sugerir el último costo registrado si existe
      if (art.costo_unitario && Number(art.costo_unitario) > 0) {
        form.value.costo_unitario = formatNumber(art.costo_unitario);
      }
    };

    const onInputBusqueda = () => {
      // Si el usuario edita el texto manualmente, borramos el artículo seleccionado
      form.value.articulo_id = '';
      indiceActivo.value = -1;
      mostrarDropdown.value = true;
    };

    const onKeydownBusqueda = (e) => {
      if (!mostrarDropdown.value) return;
      const len = articulosFiltrados.value.length;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        indiceActivo.value = (indiceActivo.value + 1) % len;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        indiceActivo.value = (indiceActivo.value - 1 + len) % len;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (indiceActivo.value >= 0 && indiceActivo.value < len) {
          seleccionarArticulo(articulosFiltrados.value[indiceActivo.value]);
        }
      } else if (e.key === 'Escape') {
        mostrarDropdown.value = false;
      }
    };

    const onBlurBusqueda = () => {
      // Delay para que el click en un item del dropdown pueda ejecutarse primero
      setTimeout(() => { mostrarDropdown.value = false; }, 180);
    };
    // ──────────────────────────────────────────────────────────────────────────

    const form = ref({
      id: null,
      articulo_id: '',
      cantidad: '',
      costo_unitario: '',
      iva_porcentaje: '19,00'
    });

    const parseLocaleNumber = (value) => {
      if (value === null || value === undefined || value === '') return 0;
      if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
      }

      const raw = String(value).trim().replace(/\s+/g, '').replace(/[\$€£¥₱₡₲₴₦₵R$]/g, '');
      if (!raw) return 0;

      const sanitized = raw.replace(/[^\d,.-]/g, '');
      const hasComma = sanitized.includes(',');
      const hasDot = sanitized.includes('.');

      let normalized = sanitized;

      if (hasComma && hasDot) {
        const lastComma = sanitized.lastIndexOf(',');
        const lastDot = sanitized.lastIndexOf('.');
        const decimalSeparator = lastComma > lastDot ? ',' : '.';
        const groupSeparator = decimalSeparator === ',' ? '.' : ',';

        normalized = sanitized
          .replace(new RegExp(`\\${groupSeparator}`, 'g'), '')
          .replace(decimalSeparator, '.');
      } else if (hasComma) {
        normalized = /^-?\d{1,3}(,\d{3})+$/.test(sanitized)
          ? sanitized.replace(/,/g, '')
          : sanitized.replace(/,/g, '.');
      } else if (hasDot) {
        normalized = /^-?\d{1,3}(\.\d{3})+$/.test(sanitized)
          ? sanitized.replace(/\./g, '')
          : sanitized;
      }

      const n = Number(normalized);
      return Number.isFinite(n) ? n : 0;
    };

    const systemMoneyFormatter = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    const formatNumber = (value) => systemMoneyFormatter.format(Number(value || 0));

    const formatMoney = (value) => Math.round(parseLocaleNumber(value)).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    const formatPercent = (value) => `${formatNumber(value)}%`;

    const subtotalCalculado = computed(() => {
      const cantidad = parseLocaleNumber(form.value.cantidad);
      const costoUnitario = parseLocaleNumber(form.value.costo_unitario);
      return formatMoney(cantidad * costoUnitario);
    });

    const totalDetalleCompra = computed(() => items.value.reduce(
      (accumulator, item) => accumulator + parseLocaleNumber(item.valor_subtotal),
      0
    ));

    const articuloSeleccionado = computed(() => {
      const id = Number(form.value.articulo_id);
      if (!id) return null;
      return articulos.value.find((a) => Number(a.id) === id) || null;
    });

    const unidadSeleccionada = computed(() => articuloSeleccionado.value?.unidad_medida || '');

    const onBlurMoney = (field) => {
      const value = parseLocaleNumber(form.value[field]);
      form.value[field] = formatNumber(value);
    };

    const fetchItems = async () => {
      loading.value = true;
      try {
        items.value = await compraService.getDetalles(props.compraId);
      } catch (error) {
        console.error(error);
        items.value = [];
      } finally {
        loading.value = false;
      }
    };

    const cargarArticulos = async () => {
      const data = await articuloService.getAll();
      articulos.value = Array.isArray(data) ? data : [];
    };

    const abrirModal = async () => {
      await cargarArticulos();
      isEdit.value = false;
      busquedaArticulo.value = '';
      mostrarDropdown.value = false;
      indiceActivo.value = -1;
      form.value = {
        id: null,
        articulo_id: '',
        cantidad: '0,00',
        costo_unitario: '0,00',
        iva_porcentaje: '19,00'
      };
      showModal.value = true;
      await nextTick();
      inputBusqueda.value?.focus();
    };

    const editarItem = async (item) => {
      await cargarArticulos();
      isEdit.value = true;
      // Pre-cargar nombre del artículo en el buscador
      const art = articulos.value.find((a) => Number(a.id) === Number(item.articulo_id));
      busquedaArticulo.value = art?.nombre || '';
      mostrarDropdown.value = false;
      indiceActivo.value = -1;
      form.value = {
        id: item.id,
        articulo_id: item.articulo_id,
        cantidad: formatNumber(item.cantidad),
        costo_unitario: formatNumber(item.costo_unitario),
        iva_porcentaje: formatNumber(item.iva_porcentaje || 19)
      };
      showModal.value = true;
      await nextTick();
      inputBusqueda.value?.focus();
    };

    const guardarItem = async () => {
      if (!form.value.articulo_id) {
        alert('Debe seleccionar un artículo de la lista.');
        inputBusqueda.value?.focus();
        return;
      }
      saving.value = true;
      const payload = {
        articulo_id: Number(form.value.articulo_id),
        cantidad: parseLocaleNumber(form.value.cantidad),
        costo_unitario: parseLocaleNumber(form.value.costo_unitario),
        iva_porcentaje: parseLocaleNumber(form.value.iva_porcentaje),
        valor_subtotal: parseLocaleNumber(form.value.cantidad) * parseLocaleNumber(form.value.costo_unitario)
      };

      try {
        if (form.value.id) {
          await compraService.updateDetalle(form.value.id, payload);
        } else {
          await compraService.createDetalle(props.compraId, payload);
        }
        await fetchItems();
        emit('updated');
        cerrarModal();
      } catch (error) {
        alert(error.message || 'Error al guardar articulo');
      } finally {
        saving.value = false;
      }
    };

    const eliminarItem = async (id) => {
      if (!confirm('Desea eliminar este articulo del detalle?')) return;
      try {
        await compraService.deleteDetalle(id);
        await fetchItems();
        emit('updated');
      } catch (error) {
        alert(error.message || 'Error al eliminar articulo');
      }
    };

    const cerrarModal = () => {
      showModal.value = false;
      busquedaArticulo.value = '';
      mostrarDropdown.value = false;
      indiceActivo.value = -1;
    };

    onMounted(fetchItems);

    watch(() => props.compraId, () => {
      fetchItems();
    });

    return {
      loading,
      saving,
      showModal,
      isEdit,
      items,
      articulos,
      form,
      // autocomplete
      inputBusqueda,
      busquedaArticulo,
      mostrarDropdown,
      indiceActivo,
      articulosFiltrados,
      seleccionarArticulo,
      onInputBusqueda,
      onKeydownBusqueda,
      onBlurBusqueda,
      // form helpers
      unidadSeleccionada,
      subtotalCalculado,
      totalDetalleCompra,
      formatNumber,
      formatMoney,
      formatPercent,
      onBlurMoney,
      abrirModal,
      editarItem,
      guardarItem,
      eliminarItem,
      cerrarModal
    };
  }
};
</script>


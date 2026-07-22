<template>
  <div class="lista-precios-view admin-crud-shell min-h-screen w-full max-w-full overflow-x-hidden p-4 md:p-6">
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
      <div>
        <h1 class="admin-crud-title lp-page-title text-3xl font-black uppercase italic text-teal-700 tracking-tighter">Lista de Precios</h1>
        <p class="admin-crud-subtitle text-[10px] uppercase font-bold tracking-widest ml-1">Gestion de historial de precios por producto</p>
      </div>
      <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:items-center">
        <div class="relative w-full sm:w-80">
          <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <input
            v-model="busqueda"
            type="text"
            placeholder="Buscar producto..."
            class="w-full bg-white/90 border border-slate-200 text-slate-700 placeholder-slate-400 rounded-2xl pl-11 pr-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-cyan-100 shadow-sm transition-all"
          />
        </div>
        <button
          @click="imprimirCatalogo"
          :disabled="loading || Object.keys(productosAgrupados).length === 0"
          class="pb-btn pb-btn-print pb-btn-unified px-5 py-3 text-[11px] whitespace-nowrap disabled:opacity-50"
        >
          <i class="fas fa-print"></i>
          <span>Imprimir</span>
        </button>
      </div>
    </div>

    <p class="text-gray-400 text-xs uppercase font-bold tracking-widest mb-4">
      {{ productosFiltrados.length }} producto{{ productosFiltrados.length !== 1 ? 's' : '' }} activo{{ productosFiltrados.length !== 1 ? 's' : '' }}
    </p>

    <div v-if="loading" class="flex justify-center items-center py-20">
      <div class="animate-spin rounded-full h-10 w-10 border-2 border-teal-600 border-t-transparent"></div>
    </div>

    <div v-else-if="Object.keys(productosAgrupados).length === 0" class="admin-crud-panel rounded-3xl p-14 text-center">
      <i class="fas fa-money-bill-wave text-4xl text-gray-300 mb-4 block"></i>
      <p class="text-gray-400 font-semibold text-lg">No hay productos{{ busqueda ? ' con esa busqueda' : ' activos para lista de precios' }}</p>
    </div>

    <div v-else class="space-y-3 w-full max-w-full">
      <section
        v-for="(productosPorCategoria, categoria) in productosAgrupados"
        :key="categoria"
        class="mb-8"
      >
        <div class="sticky top-0 z-10 mb-3 rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-emerald-50/80 px-4 py-3 shadow-sm backdrop-blur-sm">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-emerald-700">
              <i :class="getCategoriaIcon(categoria)"></i>
            </div>
            <p class="text-xs sm:text-sm font-black uppercase tracking-[0.16em] text-slate-700 truncate">
              {{ categoria }} ({{ productosPorCategoria.length }})
            </p>
          </div>
        </div>

      <article
        v-for="producto in productosPorCategoria"
        :key="producto.id"
        class="lp-product-card overflow-hidden mb-3"
      >
        <div class="lp-card-header w-full px-3 py-3 sm:px-5 sm:py-4 flex flex-col lg:flex-row lg:items-center gap-3">
          <button
            @click="toggleAcordeon(producto.id)"
            class="shrink-0 rounded-2xl border border-slate-300 bg-slate-100/90 px-3 py-2 flex items-center gap-3 min-w-[190px]"
            :aria-label="isOpen(producto.id) ? 'Ocultar historial de precios' : 'Mostrar historial de precios'"
          >
            <div class="min-w-0 text-left leading-tight">
              <p class="text-[8px] uppercase font-black tracking-widest text-teal-700">Foto</p>
              <p class="text-[11px] font-bold text-teal-700">Producto</p>
            </div>

            <i class="fas fa-chevron-down text-slate-500 text-xs transition-transform ml-auto" :class="isOpen(producto.id) ? 'rotate-180' : ''"></i>
          </button>

          <button
            @click="toggleAcordeon(producto.id)"
            class="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-left"
            :aria-label="isOpen(producto.id) ? 'Ocultar historial de precios' : 'Mostrar historial de precios'"
          >
            <div class="min-w-0">
              <p class="lp-field-label">Producto</p>
              <p class="lp-product-name text-gray-800 text-sm whitespace-normal break-words">{{ producto.nombre }}</p>
            </div>

            <div class="min-w-0">
              <p class="lp-field-label">Categoria</p>
              <p class="lp-product-name text-gray-700 text-sm truncate">{{ producto.categoria_nombre || 'Sin categoria' }}</p>
            </div>

            <div class="min-w-0">
              <p class="lp-field-label">Precio Actual</p>
              <p class="lp-price-value text-gray-800 text-sm truncate">{{ getPrecioActual(producto) }}</p>
            </div>

            <div class="min-w-0">
              <p class="lp-field-label">Estado Precio</p>
              <span
                class="inline-flex mt-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border"
                :class="getEstadoPrecioClass(getEstadoPrecio(producto))"
              >
                {{ getEstadoPrecio(producto) }}
              </span>
            </div>
          </button>

          <div class="lg:ml-auto flex items-center justify-end">
            <button
              @click.stop="abrirNuevoPrecio(producto)"
              class="pb-btn pb-btn-new btn-icon-text text-xs px-4 py-2.5"
            >
              <i class="fas fa-plus-circle text-[11px]"></i>
              <span>Nuevo Precio</span>
            </button>
          </div>
        </div>

        <transition name="fade-collapse">
          <div v-if="isOpen(producto.id)" class="px-4 pb-4 sm:px-5 sm:pb-5">
            <div v-if="!producto.historial_precios?.length" class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <p class="text-[11px] uppercase tracking-widest text-slate-400 font-black">Sin historial de precios para este producto</p>
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="precio in producto.historial_precios"
                :key="precio.id"
                class="lp-price-row p-3"
              >
                <div class="flex flex-wrap items-center gap-3">
                  <div>
                    <p class="lp-field-label">Precio Unitario</p>
                    <p class="lp-price-value text-emerald-700 text-sm">{{ formatCurrency(precio.precio_unitario) }}</p>
                  </div>

                  <div>
                    <p class="lp-field-label">Estado</p>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase border border-cyan-200 bg-cyan-50 text-cyan-700">{{ precio.estado }}</span>
                  </div>

                  <div>
                    <p class="lp-field-label">Fecha Registro</p>
                    <p class="text-xs font-semibold text-slate-600">{{ formatDateTime(precio.fecha_registro) }}</p>
                  </div>

                  <div class="ml-auto flex gap-2">
                    <button
                      @click="editarPrecio(producto, precio)"
                      class="pb-btn pb-btn-edit btn-icon-text text-xs px-3 py-1.5"
                    >
                      <i class="fas fa-pen-to-square text-[11px]"></i>
                      <span>Editar</span>
                    </button>
                    <button
                      @click="borrarPrecio(producto, precio)"
                      class="pb-btn pb-btn-danger btn-icon-text text-xs px-3 py-1.5"
                    >
                      <i class="fas fa-trash-can text-[11px]"></i>
                      <span>Borrar</span>
                    </button>
                  </div>
                </div>

                <p class="text-xs text-slate-600 mt-2" v-if="precio.observaciones">
                  <span class="font-black uppercase text-[10px] text-slate-500 tracking-widest">Observaciones:</span>
                  {{ precio.observaciones }}
                </p>
              </div>
            </div>
          </div>
        </transition>
      </article>
      </section>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
        <div class="bg-teal-700 p-6 text-white flex justify-between items-center">
          <h3 class="text-xs font-black uppercase tracking-[0.2em] italic">{{ isEdit ? 'Editar' : 'Nuevo' }} Precio Producto</h3>
          <button @click="closeModal" class="pb-btn pb-btn-secondary btn-icon-text px-3 py-1.5 text-[10px]">
            <i class="fas fa-times"></i>
            <span>Cerrar</span>
          </button>
        </div>

        <form @submit.prevent="guardarPrecio" class="p-8 space-y-5">
          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Producto</label>
            <input :value="form.producto_nombre" type="text" readonly class="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-2xl text-sm font-bold text-slate-600">
          </div>

          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Precio Unitario</label>
            <input v-model="form.precio_unitario" type="text" inputmode="decimal" required @blur="onBlurMoney('precio_unitario')" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium text-right">
          </div>

          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Observaciones</label>
            <textarea v-model="form.observaciones" rows="3" maxlength="255" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-amber-500 outline-none transition-all text-sm font-medium resize-none"></textarea>
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
import { computed, onMounted, ref } from 'vue';
import { listaPreciosService } from '../services/listaPreciosService.js';
import { useDeleteSecurity } from '../composables/useDeleteSecurity.js';

import { API_BASE_URL } from '../config/api.js';
const API_BASE = API_BASE_URL;
const UPLOADS_BASE = (process.env.VUE_APP_UPLOADS_BASE_URL || API_BASE.replace(/\/api\/?$/, '')).replace(/\/$/, '');

export default {
  name: 'ListaPrecios',
  setup() {
    const productos = ref([]);
    const loading = ref(true);
    const saving = ref(false);
    const showModal = ref(false);
    const isEdit = ref(false);
    const openIds = ref([]);
    const busqueda = ref('');

    const requestDeleteSecurity = useDeleteSecurity();

    const form = ref({
      id: null,
      producto_id: null,
      producto_nombre: '',
      precio_unitario: '',
      observaciones: ''
    });

    const isOpen = (productoId) => openIds.value.includes(Number(productoId));

    const productosFiltrados = computed(() => {
      const q = busqueda.value.trim().toLowerCase();
      if (!q) return productos.value;

      return productos.value.filter((producto) => (
        String(producto.nombre || '').toLowerCase().includes(q)
        || String(producto.categoria_nombre || '').toLowerCase().includes(q)
        || String(getEstadoPrecio(producto) || '').toLowerCase().includes(q)
      ));
    });

    const obtenerNombreCategoria = (producto) => {
      const categoriaNombre = producto?.categoria?.nombre || producto?.categoria_nombre || 'SIN CATEGORIA';
      return String(categoriaNombre).trim().toUpperCase();
    };

    const productosAgrupados = computed(() => {
      const grupos = {};
      for (const producto of productosFiltrados.value) {
        const categoriaNombre = obtenerNombreCategoria(producto);
        if (!categoriaNombre) continue;
        if (!grupos[categoriaNombre]) grupos[categoriaNombre] = [];
        grupos[categoriaNombre].push(producto);
      }
      return grupos;
    });

    const getCategoriaIcon = (categoria) => {
      const nombre = String(categoria || '').toUpperCase();
      if (nombre.includes('CAF')) return 'fas fa-mug-hot';
      if (nombre.includes('BEBIDA') || nombre.includes('JUGO') || nombre.includes('REFRESCO')) return 'fas fa-glass-water';
      if (nombre.includes('POSTRE') || nombre.includes('DULCE')) return 'fas fa-cookie-bite';
      if (nombre.includes('ENTRADA') || nombre.includes('SNACK')) return 'fas fa-bowl-food';
      if (nombre.includes('COCTEL') || nombre.includes('LICOR') || nombre.includes('BAR')) return 'fas fa-martini-glass-citrus';
      if (nombre.includes('PLATO') || nombre.includes('ALMUERZO') || nombre.includes('CENA')) return 'fas fa-utensils';
      return 'fas fa-layer-group';
    };

    const localeParts = new Intl.NumberFormat(undefined).formatToParts(12345.6);
    const localeGroup = localeParts.find((p) => p.type === 'group')?.value || ',';
    const localeDecimal = localeParts.find((p) => p.type === 'decimal')?.value || '.';

    const parseLocaleNumber = (value) => {
      if (value === null || value === undefined || value === '') return 0;
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      const raw = String(value).trim().replace(/\s+/g, '').replace(/[\$€£¥₱₡₲₴₦₵R$]/g, '');
      const normalized = raw
        .replace(new RegExp(`\\${localeGroup}`, 'g'), '')
        .replace(new RegExp(`\\${localeDecimal}`, 'g'), '.')
        .replace(/,/g, '.')
        .replace(/[^\d.-]/g, '');
      const n = Number(normalized);
      return Number.isFinite(n) ? n : 0;
    };

    const systemMoneyFormatter = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    const formatNumber = (value) => systemMoneyFormatter.format(parseLocaleNumber(value));

    const onBlurMoney = (field) => {
      form.value[field] = formatNumber(parseLocaleNumber(form.value[field]));
    };

    const toggleAcordeon = (productoId) => {
      const id = Number(productoId);
      if (isOpen(id)) {
        openIds.value = openIds.value.filter((item) => item !== id);
      } else {
        openIds.value.push(id);
      }
    };

    const fetchLista = async () => {
      loading.value = true;
      try {
        productos.value = await listaPreciosService.getAll();
        openIds.value = productos.value.slice(0, 3).map((item) => Number(item.id));
      } catch (error) {
        console.error('Error al cargar lista de precios:', error);
        productos.value = [];
        alert(error.message || 'Error al cargar lista de precios');
      } finally {
        loading.value = false;
      }
    };

    const abrirNuevoPrecio = (producto) => {
      form.value = {
        id: null,
        producto_id: producto.id,
        producto_nombre: producto.nombre,
        precio_unitario: '0,00',
        observaciones: ''
      };
      isEdit.value = false;
      showModal.value = true;
    };

    const editarPrecio = (producto, precio) => {
      form.value = {
        id: precio.id,
        producto_id: producto.id,
        producto_nombre: producto.nombre,
        precio_unitario: formatNumber(precio.precio_unitario),
        observaciones: precio.observaciones || ''
      };
      isEdit.value = true;
      showModal.value = true;
    };

    const guardarPrecio = async () => {
      saving.value = true;
      try {
        const payload = {
          precio_unitario: parseLocaleNumber(form.value.precio_unitario),
          observaciones: form.value.observaciones || null
        };

        if (isEdit.value) {
          await listaPreciosService.updatePrecio(form.value.id, payload);
        } else {
          await listaPreciosService.createPrecio(form.value.producto_id, payload);
        }

        await fetchLista();
        closeModal();
      } catch (error) {
        alert(error.message || 'Error al guardar precio');
      } finally {
        saving.value = false;
      }
    };

    const borrarPrecio = async (producto, precio) => {
      await requestDeleteSecurity({
        execute: async () => {
          const result = await listaPreciosService.deletePrecio(precio.id);
          if (result?.success === false) {
            throw new Error(result.message || 'No se pudo eliminar el registro de precio.');
          }
          await fetchLista();
        },
        successMessage: `Registro de precio de ${producto.nombre} eliminado correctamente.`,
        errorMessage: `Error al eliminar el registro de precio de ${producto.nombre}.`
      });
    };

    const closeModal = () => {
      showModal.value = false;
      isEdit.value = false;
      form.value = {
        id: null,
        producto_id: null,
        producto_nombre: '',
        precio_unitario: '0,00',
        observaciones: ''
      };
    };

    const formatCurrency = (value) => Number(value || 0).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    const formatDateTime = (value) => {
      if (!value) return '---';
      const date = new Date(String(value).replace(' ', 'T'));
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

    const getProductoImageUrl = (filename) => {
      if (!filename) return `${UPLOADS_BASE}/uploads/productos/default.png`;
      if (/^https?:\/\//i.test(filename)) return filename;
      if (filename.startsWith('/uploads/')) return `${UPLOADS_BASE}${filename}`;
      return `${UPLOADS_BASE}/uploads/productos/${filename}`;
    };

    const handleImageError = (event) => {
      event.target.src = `${UPLOADS_BASE}/uploads/productos/default.png`;
    };

    const getPrecioActual = (producto) => {
      const ultimoPrecio = producto?.historial_precios?.[0];
      if (!ultimoPrecio) return 'Sin precio';
      return formatCurrency(ultimoPrecio.precio_unitario);
    };

    const getEstadoPrecio = (producto) => {
      const ultimoPrecio = producto?.historial_precios?.[0];
      if (!ultimoPrecio?.estado) return 'Sin registro';
      return String(ultimoPrecio.estado);
    };

    const getEstadoPrecioClass = (estado) => {
      const normalized = String(estado || '').toUpperCase();
      if (normalized === 'ACTIVO') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      if (normalized === 'INACTIVO') return 'border-rose-200 bg-rose-50 text-rose-700';
      return 'border-slate-200 bg-slate-100 text-slate-600';
    };

    const COMPANY_LOGO_URL = '/img/logo.png';

    const formatFechaEmision = () => new Date().toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const imprimirCatalogo = () => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Por favor, permite las ventanas emergentes para imprimir');
        return;
      }

      const grupos = productosAgrupados.value;

      const categoriasHtml = Object.entries(grupos).map(([categoria, prods]) => {
        const filas = prods.map((producto) => {
          const precio = producto?.historial_precios?.[0];
          const precioTexto = precio
            ? Number(precio.precio_unitario).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 })
            : 'Sin precio';
          return `
            <tr>
              <td class="col-producto">${producto.nombre}</td>
              <td class="col-precio">${precioTexto}</td>
            </tr>`;
        }).join('');

        return `
          <div class="categoria-bloque">
            <div class="categoria-titulo">${categoria} (${prods.length})</div>
            <table>
              <thead>
                <tr>
                  <th class="col-producto">Producto</th>
                  <th class="col-precio">Precio de Venta</th>
                </tr>
              </thead>
              <tbody>${filas}</tbody>
            </table>
          </div>`;
      }).join('');

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Catálogo de Precios Vigentes</title>
            <style>
              @page { margin: 12mm; }
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                color: #333;
                width: 100%;
                box-sizing: border-box;
              }
              .report-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                margin-bottom: 18px;
                border-bottom: 2px solid #115e59;
                padding-bottom: 10px;
              }
              .logo-wrap img {
                max-width: 140px;
                max-height: 48px;
                object-fit: contain;
              }
              .report-head-center {
                flex: 1;
                text-align: center;
              }
              .report-head-center h1 {
                margin: 0 0 4px 0;
                color: #115e59;
                font-size: 18px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.04em;
              }
              .report-head-center p {
                margin: 0;
                font-size: 11px;
                color: #64748b;
              }
              .report-head-date {
                min-width: 150px;
                text-align: right;
                font-size: 11px;
                color: #64748b;
                font-weight: 700;
              }
              .categoria-bloque {
                margin-bottom: 22px;
                page-break-inside: avoid;
              }
              .categoria-titulo {
                background-color: #115e59;
                color: #ffffff;
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.12em;
                padding: 7px 12px;
                border-radius: 4px 4px 0 0;
              }
              table {
                width: 100%;
                border-collapse: collapse;
              }
              th {
                background-color: #f0fdf4;
                color: #115e59;
                padding: 7px 10px;
                font-size: 11px;
                font-weight: 800;
                border-bottom: 1px solid #d1fae5;
              }
              td {
                border-bottom: 1px solid #e2e8f0;
                padding: 7px 10px;
                font-size: 12px;
              }
              tr:last-child td { border-bottom: none; }
              tr:nth-child(even) td { background-color: #f8fafc; }
              .col-producto { text-align: left; }
              .col-precio { text-align: right; font-weight: 700; color: #115e59; }
              th.col-precio { text-align: right; }
              @media print {
                body { margin: 0; padding: 0; }
              }
            </style>
          </head>
          <body onload="window.print(); setTimeout(() => window.close(), 300);">
            <div class="report-head">
              <div class="logo-wrap">
                <img src="${COMPANY_LOGO_URL}" alt="Logo">
              </div>
              <div class="report-head-center">
                <h1>Catálogo de Precios Vigentes</h1>
                <p>Productos activos</p>
              </div>
              <div class="report-head-date">Generado:<br>${formatFechaEmision()}</div>
            </div>
            ${categoriasHtml}
          </body>
        </html>`;

      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
    };

    onMounted(fetchLista);

    return {
      productos,
      productosFiltrados,
      productosAgrupados,
      loading,
      saving,
      showModal,
      isEdit,
      busqueda,
      form,
      isOpen,
      toggleAcordeon,
      abrirNuevoPrecio,
      editarPrecio,
      guardarPrecio,
      borrarPrecio,
      closeModal,
      formatCurrency,
      formatDateTime,
      getProductoImageUrl,
      handleImageError,
      getPrecioActual,
      getEstadoPrecio,
      getEstadoPrecioClass,
      getCategoriaIcon,
      onBlurMoney,
      imprimirCatalogo
    };
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap');

/* -----------------------------------------
   LISTA DE PRECIOS — Soft UI / Material 3
   Prueba de rediseño con Montserrat
----------------------------------------- */

/* Título de la vista */
.lp-page-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  letter-spacing: -0.3px;
}

/* Tarjeta de producto */
.lp-product-card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.7);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
  transition: box-shadow 200ms ease, transform 200ms ease;
}
.lp-product-card:hover {
  box-shadow: 0 16px 32px -6px rgba(0, 0, 0, 0.09);
  transform: translateY(-1px);
}

/* Cabecera de la tarjeta */
.lp-card-header {
  background: rgba(248, 250, 252, 0.92);
  border-bottom: 1px solid rgba(226, 232, 240, 0.65);
}

/* Etiqueta de campo */
.lp-field-label {
  font-family: 'Montserrat', sans-serif;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #0f766e;
  margin-bottom: 2px;
}

/* Nombre de producto / categoría */
.lp-product-name {
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  line-height: 1.3;
}

/* Valor de precio */
.lp-price-value {
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  letter-spacing: 0.3px;
}

/* Fila de historial de precio */
.lp-price-row {
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.04);
  transition: box-shadow 150ms ease;
}
.lp-price-row:hover {
  box-shadow: 0 4px 14px -3px rgba(0, 0, 0, 0.08);
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-in;
}

.fade-collapse-enter-active,
.fade-collapse-leave-active {
  transition: all 0.2s ease;
}

.fade-collapse-enter-from,
.fade-collapse-leave-to {
  opacity: 0;
  transform: translateY(-4px);
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


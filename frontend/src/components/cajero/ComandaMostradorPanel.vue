<template>
  <div class="cmp-panel">
    <header class="cmp-header">
      <div class="cmp-header-top">
        <p class="cmp-kicker">Comanda Mostrador</p>
        <label class="cmp-mesa-label" for="cmp-mesa-select">Mesa</label>
      </div>
      <select
        id="cmp-mesa-select"
        v-model.number="mesaSeleccionadaId"
        class="cmp-mesa-select"
        :disabled="saving || Boolean(comandaIdGuardada)"
      >
        <option v-for="mesa in mesas" :key="mesa.id" :value="Number(mesa.id)">
          {{ mesa.nombre }}
        </option>
      </select>
    </header>

    <div class="nc-search-wrap">
      <i class="fas fa-search nc-search-icon"></i>
      <input
        ref="inputRef"
        v-model="busqueda"
        type="text"
        class="nc-search-input"
        placeholder="Buscar producto o categoría…"
        autocomplete="off"
      >
      <button v-if="busqueda" type="button" class="nc-clear-btn" @click="busqueda = ''">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="nc-body">
      <template v-if="busqueda.trim()">
        <p v-if="!productosFiltrados.length" class="nc-empty-msg">
          Sin resultados para "{{ busqueda }}"
        </p>
        <article
          v-for="p in productosFiltrados"
          :key="p.id"
          class="nc-producto-card"
        >
          <img
            class="nc-producto-img"
            :src="getImgUrl(p.url_foto)"
            :alt="p.nombre"
            @error="onImgError"
          >
          <div class="nc-producto-info">
            <strong class="nc-producto-nombre">{{ p.nombre }}</strong>
            <span class="nc-producto-precio">{{ formatCurrency(p.precio_unitario || 0) }}</span>
          </div>
          <div class="nc-stepper">
            <button type="button" class="nc-stepper-btn" @click="decrementar(p)">
              <i class="fas fa-minus"></i>
            </button>
            <strong class="nc-stepper-qty">{{ getCantidad(p.id) }}</strong>
            <button type="button" class="nc-stepper-btn" @click="incrementar(p)">
              <i class="fas fa-plus"></i>
            </button>
          </div>
        </article>
      </template>

      <div v-else class="nc-hint">
        <i class="fas fa-search"></i>
        <p>Escribe para buscar productos</p>
      </div>

      <p class="nc-section-label">Productos en la comanda</p>
      <div v-if="!productosSeleccionados.length" class="nc-empty-msg">Sin productos aún.</div>
      <article
        v-for="entry in productosSeleccionados"
        :key="`sel-${entry.producto_id}`"
        class="nc-selected-card"
      >
        <img
          class="nc-producto-img"
          :src="getImgUrl(entry.producto.url_foto)"
          :alt="entry.producto.nombre"
          @error="onImgError"
        >
        <div class="nc-selected-grid">
          <div class="nc-producto-copy nc-producto-copy--truncate">
            <strong class="nc-producto-nombre">{{ entry.producto.nombre }}</strong>
            <span class="nc-producto-precio">{{ entry.item.cantidad }} × {{ formatCurrency(entry.item.precio_unitario || 0) }}</span>
          </div>
          <div class="nc-stepper nc-stepper--grid">
            <button type="button" class="nc-stepper-btn" @click="decrementar(entry.producto)">
              <i class="fas fa-minus"></i>
            </button>
            <strong class="nc-stepper-qty">{{ getCantidad(entry.producto_id) }}</strong>
            <button type="button" class="nc-stepper-btn" @click="incrementar(entry.producto)">
              <i class="fas fa-plus"></i>
            </button>
          </div>
          <div class="nc-obs-wrap">
            <label class="nc-obs-label">Observaciones</label>
            <textarea
              v-model="entry.item.observaciones_mesero"
              class="nc-obs-input"
              rows="1"
              maxlength="255"
              placeholder="Ej: sin azucar, leche deslactosada"
            ></textarea>
          </div>
        </div>
      </article>
    </div>

    <div class="nc-totales">
      <div class="nc-total-row nc-total-box">
        <span>Subtotal</span>
        <span>{{ formatCurrency(subtotal) }}</span>
      </div>
      <div class="nc-total-row nc-total-box">
        <span>{{ aporteLabel }}</span>
        <span>{{ formatCurrency(propina) }}</span>
      </div>
      <div class="nc-total-row nc-total-row--final nc-total-box">
        <span>Total Final</span>
        <span>{{ formatCurrency(totalFinal) }}</span>
      </div>
    </div>

    <div class="cmp-footer">
      <button
        type="button"
        class="btn-modal-save cmp-footer-btn"
        :disabled="saving || !hayProductos || !mesaSeleccionadaId"
        @click="onGuardar"
      >
        <i v-if="saving" class="fas fa-circle-notch fa-spin"></i>
        <i v-else class="fas fa-check"></i>
        <span>{{ saveButtonLabel }}</span>
      </button>
    </div>
  </div>
</template>

<script>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { API_BASE_URL } from '../../config/api.js';

const UPLOADS_BASE = (process.env.VUE_APP_UPLOADS_BASE_URL || API_BASE_URL.replace(/\/api\/?$/, '')).replace(/\/$/, '');

export default {
  name: 'ComandaMostradorPanel',
  props: {
    mesas: { type: Array, default: () => [] },
    productosActivos: { type: Array, default: () => [] },
    categoriasConProductos: { type: Array, default: () => [] },
    aporteServicio: { type: [Number, Object], default: () => ({ valor_parametro: 0, tipo_dato: 'porcentaje' }) },
    guardarHandler: { type: Function, default: null }
  },
  emits: ['comanda-guardada'],
  setup(props, { emit }) {
    const busqueda = ref('');
    const productosTemp = ref({});
    const saving = ref(false);
    const comandaIdGuardada = ref(0);
    const guardadoExitoso = ref(false);
    const inputRef = ref(null);
    const mesaSeleccionadaId = ref(1);

    const syncMesaDefault = (mesas = []) => {
      const list = Array.isArray(mesas) ? mesas : [];
      if (!list.length) return;
      const mesaUno = list.find((mesa) => Number(mesa.id) === 1);
      mesaSeleccionadaId.value = Number((mesaUno || list[0]).id);
    };

    watch(() => props.mesas, (mesas) => {
      if (!comandaIdGuardada.value) syncMesaDefault(mesas);
    }, { immediate: true });

    onMounted(() => {
      syncMesaDefault(props.mesas);
      nextTick(() => { if (inputRef.value) inputRef.value.focus(); });
    });

    const catNombreMap = computed(() => {
      const map = {};
      (props.categoriasConProductos || []).forEach((c) => {
        map[c.id] = String(c.nombre || '').toLowerCase();
      });
      return map;
    });

    const productosFiltrados = computed(() => {
      const q = busqueda.value.trim().toLowerCase();
      if (!q) return [];
      return (props.productosActivos || []).filter((p) => {
        const byNombre = String(p.nombre || '').toLowerCase().includes(q);
        const byCat = catNombreMap.value[p.categoria_id]?.includes(q) || false;
        return byNombre || byCat;
      });
    });

    const productosById = computed(() => {
      const map = {};
      (props.productosActivos || []).forEach((p) => {
        map[Number(p.id)] = p;
      });
      return map;
    });

    const productosSeleccionados = computed(() =>
      Object.entries(productosTemp.value)
        .map(([productoId, item]) => ({
          producto_id: Number(productoId),
          item,
          producto: productosById.value[Number(productoId)] || {
            id: Number(productoId),
            nombre: item.nombre || 'Producto',
            url_foto: null
          }
        }))
        .sort((a, b) => String(a.producto.nombre || '').localeCompare(String(b.producto.nombre || ''), 'es', { sensitivity: 'base' }))
    );

    const hayProductos = computed(() => productosSeleccionados.value.length > 0);

    const subtotal = computed(() =>
      Object.values(productosTemp.value).reduce((s, item) => {
        return s + Number(item.cantidad || 0) * Number(item.precio_unitario || 0);
      }, 0)
    );

    const aporteConfig = computed(() => {
      if (typeof props.aporteServicio === 'number') {
        return { valor_parametro: Number(props.aporteServicio) || 0, tipo_dato: 'porcentaje' };
      }
      const row = props.aporteServicio || {};
      return {
        valor_parametro: Number(row.valor_parametro ?? 0) || 0,
        tipo_dato: String(row.tipo_dato || 'porcentaje').toLowerCase()
      };
    });

    const aportePct = computed(() => {
      const value = Number(aporteConfig.value.valor_parametro || 0);
      if (aporteConfig.value.tipo_dato === 'porcentaje') {
        if (value > 0 && value <= 1) return value * 100;
        return value;
      }
      return 0;
    });

    const aporteMoneda = computed(() => {
      if (aporteConfig.value.tipo_dato !== 'moneda') return 0;
      return Number(aporteConfig.value.valor_parametro || 0);
    });

    const propina = computed(() => {
      const tipoDato = aporteConfig.value.tipo_dato;
      const subtotalValue = Number(subtotal.value || 0);
      return Math.round(tipoDato === 'moneda'
        ? aporteMoneda.value
        : subtotalValue * (aportePct.value / 100));
    });

    const aporteLabel = computed(() => {
      if (aporteConfig.value.tipo_dato === 'porcentaje') {
        return `Propina Voluntaria ${aportePct.value}%`;
      }
      return 'Propina Voluntaria';
    });

    const totalFinal = computed(() => subtotal.value + propina.value);

    const saveButtonLabel = computed(() => {
      if (saving.value) return 'GUARDANDO...';
      return guardadoExitoso.value ? 'ACTUALIZAR OBSERVACIONES' : 'GUARDAR';
    });

    const getCantidad = (productoId) => Number(productosTemp.value[productoId]?.cantidad || 0);

    const incrementar = (producto) => {
      const cur = getCantidad(producto.id);
      productosTemp.value = {
        ...productosTemp.value,
        [producto.id]: {
          cantidad: cur + 1,
          precio_unitario: Number(producto.precio_unitario || 0),
          nombre: producto.nombre,
          detalle_id: Number(productosTemp.value[producto.id]?.detalle_id || 0) || null,
          observaciones_mesero: cur > 0
            ? String(productosTemp.value[producto.id]?.observaciones_mesero || '')
            : ''
        }
      };
    };

    const decrementar = (producto) => {
      const cur = getCantidad(producto.id);
      if (cur <= 0) return;
      if (cur === 1) {
        const clone = { ...productosTemp.value };
        delete clone[producto.id];
        productosTemp.value = clone;
        return;
      }
      productosTemp.value = {
        ...productosTemp.value,
        [producto.id]: {
          cantidad: cur - 1,
          precio_unitario: Number(producto.precio_unitario || 0),
          nombre: producto.nombre,
          detalle_id: Number(productosTemp.value[producto.id]?.detalle_id || 0) || null,
          observaciones_mesero: String(productosTemp.value[producto.id]?.observaciones_mesero || '')
        }
      };
    };

    const onGuardar = async () => {
      if (saving.value || !hayProductos.value || typeof props.guardarHandler !== 'function') return;

      saving.value = true;
      try {
        const items = Object.entries(productosTemp.value)
          .map(([productoId, item]) => ({
            detalle_id: Number(item.detalle_id || 0) || null,
            producto_id: Number(productoId),
            cantidad: Number(item.cantidad || 0),
            observaciones_mesero: String(item.observaciones_mesero || '').trim() || null
          }))
          .filter((i) => i.cantidad > 0);

        const persistResult = await props.guardarHandler({
          comanda_id: Number(comandaIdGuardada.value || 0) || null,
          mesa_id: Number(mesaSeleccionadaId.value || 0),
          estado_comanda: 'En Proceso',
          prioridad: 'Media',
          detalles: items,
          propina: propina.value
        });

        const persistedComandaId = Number(persistResult?.comanda_id || 0);
        if (persistedComandaId) {
          comandaIdGuardada.value = persistedComandaId;
        }

        const persistedDetalles = Array.isArray(persistResult?.detallesPersistidos)
          ? persistResult.detallesPersistidos
          : [];

        if (persistedDetalles.length) {
          const clone = { ...productosTemp.value };
          persistedDetalles.forEach((d) => {
            const productoId = Number(d.producto_id || 0);
            if (!productoId || !clone[productoId]) return;

            clone[productoId] = {
              ...clone[productoId],
              detalle_id: Number(d.detalle_id || 0) || null,
              observaciones_mesero: d.observaciones_mesero === null || d.observaciones_mesero === undefined
                ? String(clone[productoId].observaciones_mesero || '')
                : String(d.observaciones_mesero)
            };
          });
          productosTemp.value = clone;
        }

        guardadoExitoso.value = true;

        if (persistedComandaId) {
          emit('comanda-guardada', persistedComandaId);
        }
      } finally {
        saving.value = false;
      }
    };

    const getImgUrl = (filename) => {
      if (!filename) return `${UPLOADS_BASE}/uploads/productos/default.png`;
      if (/^https?:\/\//i.test(filename)) return filename;
      if (filename.startsWith('/uploads/')) return `${UPLOADS_BASE}${filename}`;
      return `${UPLOADS_BASE}/uploads/productos/${filename}`;
    };

    const onImgError = (e) => { e.target.src = `${UPLOADS_BASE}/uploads/productos/default.png`; };

    const formatCurrency = (value) =>
      Number(Math.round(value || 0)).toLocaleString('es-CO', {
        style: 'currency', currency: 'COP',
        minimumFractionDigits: 0, maximumFractionDigits: 0
      });

    return {
      busqueda,
      saving,
      inputRef,
      mesaSeleccionadaId,
      comandaIdGuardada,
      saveButtonLabel,
      productosFiltrados,
      productosSeleccionados,
      hayProductos,
      subtotal,
      propina,
      totalFinal,
      aporteLabel,
      getCantidad,
      incrementar,
      decrementar,
      onGuardar,
      getImgUrl,
      onImgError,
      formatCurrency
    };
  }
};
</script>

<style scoped>
.cmp-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: 70vh;
  background: #fff;
  border-radius: 1.25rem;
  overflow: hidden;
}

.cmp-header {
  padding: 0.75rem 0.9rem 0.65rem;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
  flex-shrink: 0;
}

.cmp-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.45rem;
}

.cmp-kicker {
  margin: 0;
  font-size: 0.62rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: #c2410c;
}

.cmp-mesa-label {
  font-size: 0.62rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #9a3412;
}

.cmp-mesa-select {
  width: 100%;
  border: 1px solid #fdba74;
  border-radius: 0.85rem;
  padding: 0.55rem 0.7rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: #7c2d12;
  background: #fff;
  outline: none;
}

.cmp-mesa-select:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  background: #fff7ed;
}

.nc-search-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.7rem 0.85rem 0;
  padding: 0.42rem 0.75rem;
  border-radius: 1.5rem;
  background: #ffedd5;
  flex-shrink: 0;
}

.nc-search-icon { color: #ea580c; font-size: 0.9rem; }
.nc-search-input {
  flex: 1;
  border: 0;
  background: transparent;
  font-size: 0.84rem;
  color: #0f172a;
  outline: none;
}
.nc-clear-btn {
  border: 0;
  background: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
}

.nc-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.35rem 0.85rem 0.5rem;
}

.nc-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 2rem 1rem;
  color: #94a3b8;
  font-size: 0.84rem;
  text-align: center;
}

.nc-empty-msg {
  text-align: center;
  color: #94a3b8;
  font-size: 0.84rem;
  padding: 1rem;
}

.nc-producto-card,
.nc-selected-card {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid #f1f5f9;
}

.nc-producto-img {
  width: 44px;
  height: 44px;
  border-radius: 0.55rem;
  object-fit: cover;
  background: #f1f5f9;
  flex-shrink: 0;
}

.nc-producto-info { flex: 1; min-width: 0; }
.nc-producto-nombre {
  display: block;
  font-size: 0.88rem;
  font-weight: 700;
  color: #0f172a;
}
.nc-producto-precio {
  font-size: 0.78rem;
  font-weight: 700;
  color: #ea580c;
}

.nc-section-label {
  margin: 0.7rem 0 0.35rem;
  font-size: 0.66rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #c2410c;
}

.nc-selected-grid {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  grid-template-areas: 'copy stepper' 'obs obs';
  column-gap: 0.7rem;
  row-gap: 0.18rem;
}

.nc-producto-copy { grid-area: copy; min-width: 0; }
.nc-obs-wrap { grid-area: obs; width: 100%; }
.nc-obs-label {
  display: block;
  margin-bottom: 0.14rem;
  font-size: 0.62rem;
  font-weight: 900;
  text-transform: uppercase;
  color: #475569;
}
.nc-obs-input {
  width: 100%;
  resize: none;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  padding: 0.36rem 0.5rem;
  font-size: 0.72rem;
}

.nc-stepper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}
.nc-stepper--grid { grid-area: stepper; justify-self: end; }
.nc-stepper-btn {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: 1px solid #fdba74;
  background: #fff7ed;
  color: #c2410c;
  cursor: pointer;
}
.nc-stepper-qty {
  min-width: 1.2rem;
  text-align: center;
  font-size: 0.9rem;
}

.nc-totales {
  padding: 0.55rem 0.85rem;
  border-top: 1px solid #e2e8f0;
  background: #fff7ed;
  flex-shrink: 0;
}
.nc-total-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  font-weight: 700;
  color: #334155;
  padding: 0.2rem 0;
}
.nc-total-row--final {
  font-size: 0.92rem;
  color: #c2410c;
  border-top: 1px dashed #fdba74;
  margin-top: 0.25rem;
  padding-top: 0.35rem;
}

.cmp-footer {
  padding: 0.65rem 0.85rem 0.85rem;
  border-top: 1px solid #e2e8f0;
  flex-shrink: 0;
}
.cmp-footer-btn {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 0;
  border-radius: 0.9rem;
  padding: 0.75rem 1rem;
  font-size: 0.72rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #fff;
  background: linear-gradient(135deg, #f97316, #ea580c);
  cursor: pointer;
}
.cmp-footer-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

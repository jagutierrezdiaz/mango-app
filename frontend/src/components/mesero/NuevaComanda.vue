<template>
  <div class="nc-overlay" @click.self="onCancelar">
    <div class="nc-sheet" @click.stop>

      <!-- ── Encabezado ── -->
      <header class="modal-header-custom" :style="headerGradientStyle">
        <div class="header-left">
          <span class="mesa-badge">{{ headerClienteNombre }}</span>
        </div>
        <div class="header-right">
          <span class="label-editar">Nueva Comanda</span>
        </div>
      </header>

      <!-- ── Buscador ── -->
      <div class="nc-search-wrap">
        <i class="fas fa-search nc-search-icon"></i>
        <input
          ref="inputRef"
          v-model="busqueda"
          type="text"
          class="nc-search-input"
          placeholder="Buscar producto o categoría…"
          autocomplete="off"
        />
        <button v-if="busqueda" type="button" class="nc-clear-btn" @click="busqueda = ''">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- ── Contenido scrolleable ── -->
      <div class="nc-body">

        <!-- Resultados de búsqueda -->
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
            />
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

        <!-- Estado vacío cuando no hay búsqueda -->
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
          />
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

      <!-- ── Totales ── -->
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

      <div class="modal-footer-btns nc-footer" style="display: flex !important; flex-wrap: nowrap !important; gap: 0.5rem !important;">
        <div class="modal-footer-left"></div>
        <div class="modal-footer-right" style="display: flex !important; flex-wrap: nowrap !important; gap: 0.5rem !important; width: 100% !important;">
          <button
            type="button"
            class="btn-modal-cancel nc-footer-btn"
            style="flex: 1;"
            :disabled="saving"
            @click="onCancelar"
          >
            <i class="fas fa-arrow-left"></i>
            <span>Regresar</span>
          </button>
          <button
            type="button"
            class="btn-modal-save nc-footer-btn"
            style="flex: 1;"
            :disabled="saving || !hayProductos"
            @click="onAceptar"
          >
            <i v-if="saving" class="fas fa-circle-notch fa-spin"></i>
            <i v-else class="fas fa-check"></i>
            <span>{{ saveButtonLabel }}</span>
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
import { computed, nextTick, onMounted, ref } from 'vue'
import { API_BASE_URL } from '../../config/api.js'

const UPLOADS_BASE = (process.env.VUE_APP_UPLOADS_BASE_URL || API_BASE_URL.replace(/\/api\/?$/, '')).replace(/\/$/, '')

const getMesaGradient = (nombre) => {
  const nombreNormalizado = String(nombre || 'DEFAULT').trim().toUpperCase()

  const paletas = {
    ROJA: '#ffd9e2',
    ANTORCHAS: '#ffd7a8',
    COMEDOR: '#d9d4ff',
    SALA: '#d9f7c8',
    AVION: '#d8ecff',
    'MAQUINA 1': '#dfe6eb',
    'MAQUINA 2': '#dfe6eb',
    GRIS: '#c8d0d6',
    TRONCOS: '#ece2d8',
    RUSTICO: '#eadbcc',
    ASTROS: '#b9c8ff',
    BAUL: '#e8d5cd',
    VITRINA: '#e6f4ff',
    EVENTO: '#ffe0a8',
    DEFAULT: '#e7edf5'
  }

  const color = paletas[nombreNormalizado] || paletas.DEFAULT
  return {
    background: `linear-gradient(135deg, ${color} 0%, ${color} 100%)`
  }
}

export default {
  name: 'NuevaComanda',
  props: {
    mesa: { type: Object, required: true },
    productosActivos: { type: Array, default: () => [] },
    categoriasConProductos: { type: Array, default: () => [] },
    aporteServicio: { type: [Number, Object], default: () => ({ valor_parametro: 0, tipo_dato: 'porcentaje' }) },
    guardarHandler: { type: Function, default: null }
  },
  emits: ['cerrar'],
  setup (props, { emit }) {
    const busqueda = ref('')
    const productosTemp = ref({})
    const saving = ref(false)
    const comandaIdGuardada = ref(0)
    const guardadoExitoso = ref(false)
    const inputRef = ref(null)
    const headerClienteNombre = computed(() =>
      String(props.mesa?.cliente?.nombre || props.mesa?.nombre || props.mesa?.numero || 'Mesa')
    )
    const headerGradientStyle = computed(() =>
      getMesaGradient(props.mesa?.nombre || headerClienteNombre.value)
    )

    onMounted(() => {
      nextTick(() => { if (inputRef.value) inputRef.value.focus() })
    })

    // ── Mapa categoria_id → nombre para búsqueda
    const catNombreMap = computed(() => {
      const map = {}
      ;(props.categoriasConProductos || []).forEach((c) => { map[c.id] = String(c.nombre || '').toLowerCase() })
      return map
    })

    const productosFiltrados = computed(() => {
      const q = busqueda.value.trim().toLowerCase()
      if (!q) return []
      return (props.productosActivos || []).filter((p) => {
        const byNombre = String(p.nombre || '').toLowerCase().includes(q)
        const byCat = catNombreMap.value[p.categoria_id]?.includes(q) || false
        return byNombre || byCat
      })
    })

    const productosById = computed(() => {
      const map = {}
      ;(props.productosActivos || []).forEach((p) => {
        map[Number(p.id)] = p
      })
      return map
    })

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
    )

    const hayProductos = computed(() => productosSeleccionados.value.length > 0)

    const subtotal = computed(() =>
      Object.values(productosTemp.value).reduce((s, item) => {
        return s + Number(item.cantidad || 0) * Number(item.precio_unitario || 0)
      }, 0)
    )

    const aporteConfig = computed(() => {
      if (typeof props.aporteServicio === 'number') {
        return { valor_parametro: Number(props.aporteServicio) || 0, tipo_dato: 'porcentaje' }
      }
      const row = props.aporteServicio || {}
      return {
        valor_parametro: Number(row.valor_parametro ?? 0) || 0,
        tipo_dato: String(row.tipo_dato || 'porcentaje').toLowerCase()
      }
    })

    const aportePct = computed(() => {
      const value = Number(aporteConfig.value.valor_parametro || 0)
      if (aporteConfig.value.tipo_dato === 'porcentaje') {
        if (value > 0 && value <= 1) return value * 100
        return value
      }
      return 0
    })

    const aporteMoneda = computed(() => {
      if (aporteConfig.value.tipo_dato !== 'moneda') return 0
      return Number(aporteConfig.value.valor_parametro || 0)
    })

    const propina = computed(() => {
      const tipoDato = aporteConfig.value.tipo_dato
      const subtotalValue = Number(subtotal.value || 0)
      return Math.round(tipoDato === 'moneda'
        ? aporteMoneda.value
        : subtotalValue * (aportePct.value / 100))
    })

    const aporteLabel = computed(() => {
      if (aporteConfig.value.tipo_dato === 'porcentaje') {
        return `Propina Voluntaria ${aportePct.value}%`
      }
      return 'Propina Voluntaria'
    })
    const totalFinal = computed(() => subtotal.value + propina.value)
    const saveButtonLabel = computed(() => {
      if (saving.value) return 'GUARDANDO...'
      return guardadoExitoso.value ? 'ACTUALIZAR OBSERVACIONES' : 'GUARDAR'
    })

    const getCantidad = (productoId) => Number(productosTemp.value[productoId]?.cantidad || 0)

    const incrementar = (producto) => {
      const cur = getCantidad(producto.id)
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
      }
    }

    const decrementar = (producto) => {
      const cur = getCantidad(producto.id)
      if (cur <= 0) return
      if (cur === 1) {
        const clone = { ...productosTemp.value }
        delete clone[producto.id]
        productosTemp.value = clone
        return
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
      }
    }

    const onCancelar = () => { if (!saving.value) emit('cerrar') }

    const onAceptar = async () => {
      if (saving.value || !hayProductos.value || typeof props.guardarHandler !== 'function') return
      saving.value = true
      try {
        const items = Object.entries(productosTemp.value)
          .map(([productoId, item]) => ({
            detalle_id: Number(item.detalle_id || 0) || null,
            producto_id: Number(productoId),
            cantidad: Number(item.cantidad || 0),
            observaciones_mesero: String(item.observaciones_mesero || '').trim() || null
          }))
          .filter((i) => i.cantidad > 0)

        const persistResult = await props.guardarHandler({
          comanda_id: Number(comandaIdGuardada.value || 0) || null,
          mesa_id: props.mesa.id,
          estado_comanda: 'En Proceso',
          prioridad: 'Media',
          detalles: items,
          propina: propina.value
        })

        const persistedComandaId = Number(persistResult?.comanda_id || 0)
        if (persistedComandaId) {
          comandaIdGuardada.value = persistedComandaId
        }

        if (persistResult?.createdNow) {
          emit('cerrar')
          return
        }

        const persistedDetalles = Array.isArray(persistResult?.detallesPersistidos)
          ? persistResult.detallesPersistidos
          : []

        if (persistedDetalles.length) {
          const clone = { ...productosTemp.value }
          persistedDetalles.forEach((d) => {
            const productoId = Number(d.producto_id || 0)
            if (!productoId || !clone[productoId]) return

            clone[productoId] = {
              ...clone[productoId],
              detalle_id: Number(d.detalle_id || 0) || null,
              observaciones_mesero: d.observaciones_mesero === null || d.observaciones_mesero === undefined
                ? String(clone[productoId].observaciones_mesero || '')
                : String(d.observaciones_mesero)
            }
          })
          productosTemp.value = clone
        }

        guardadoExitoso.value = true
      } finally {
        saving.value = false
      }
    }

    const getImgUrl = (filename) => {
      if (!filename) return `${UPLOADS_BASE}/uploads/productos/default.png`
      if (/^https?:\/\//i.test(filename)) return filename
      if (filename.startsWith('/uploads/')) return `${UPLOADS_BASE}${filename}`
      return `${UPLOADS_BASE}/uploads/productos/${filename}`
    }

    const onImgError = (e) => { e.target.src = `${UPLOADS_BASE}/uploads/productos/default.png` }

    const formatCurrency = (value) =>
      Number(Math.round(value || 0)).toLocaleString('es-CO', {
        style: 'currency', currency: 'COP',
        minimumFractionDigits: 0, maximumFractionDigits: 0
      })

    return {
      busqueda, productosTemp, saving, inputRef, headerClienteNombre, headerGradientStyle,
      comandaIdGuardada, guardadoExitoso, saveButtonLabel,
      productosFiltrados, productosSeleccionados, hayProductos,
      subtotal, propina, totalFinal, aportePct, aporteLabel,
      getCantidad, incrementar, decrementar,
      onCancelar, onAceptar,
      getImgUrl, onImgError, formatCurrency
    }
  }
}
</script>

<style scoped>
.nc-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: stretch;
  justify-content: stretch;
}

.nc-sheet {
  width: 100vw;
  height: 100dvh;
  max-height: 100dvh;
  background: #fff;
  border-radius: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 -8px 32px rgba(15, 23, 42, 0.22);
}

/* ── Header ── */
.modal-header-custom {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem;
  padding: 10px 15px;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
  position: relative;
  border-top-left-radius: 1.25rem;
  border-top-right-radius: 1.25rem;
  overflow: hidden;
}
.modal-header-custom::after {
  content: '';
  position: absolute;
  left: 1.2rem;
  right: 1.2rem;
  bottom: 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(13, 148, 136, 0.35), rgba(251, 191, 36, 0.18), rgba(148, 163, 184, 0.05));
}
.header-left {
  display: flex;
  align-items: center;
  min-width: 0;
  width: 100%;
}
.header-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: max-content;
  justify-self: end;
  align-self: center;
  text-align: right;
  background: transparent;
  padding: 0;
  border-radius: 0;
  backdrop-filter: none;
  box-shadow: none;
}
.mesa-badge {
  font-size: 1.2rem;
  font-weight: 900;
  color: #1d3d3d;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.label-editar {
  font-size: 0.9rem;
  color: #7f8c8d;
  white-space: nowrap;
}
.id-comanda {
  font-size: 1rem;
  font-weight: 900;
  color: #2c3e50;
  white-space: nowrap;
}

/* ── Search ── */
.nc-search-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1rem 0.8rem;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
  background: #fff;
}
.nc-search-wrap {
  margin: 0.7rem 1rem 0;
  padding: 0.42rem 0.75rem;
  border: 0;
  border-bottom: 0;
  border-radius: 1.5rem;
  background: #e3f2fd;
  box-shadow: none;
  min-height: 2rem;
}
.nc-search-icon { color: #94a3b8; font-size: 0.9rem; }
.nc-search-input {
  flex: 1;
  border: 0;
  background: transparent;
  font-size: 0.84rem;
  line-height: 1.2;
  color: #0f172a;
  outline: none;
  font-family: inherit;
}
.nc-clear-btn {
  border: 0;
  background: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  font-size: 0.8rem;
}

/* ── Body ── */
.nc-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.35rem 1rem 0.5rem;
}
.nc-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 2.5rem 1rem;
  color: #94a3b8;
  font-size: 0.84rem;
  text-align: center;
}
.nc-hint i { font-size: 2rem; }
.nc-empty-msg {
  text-align: center;
  color: #94a3b8;
  font-size: 0.84rem;
  padding: 1.5rem;
}

/* ── Producto card ── */
.nc-producto-card {
  display: flex;
  align-items: center;
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
.nc-producto-info {
  flex: 1;
  min-width: 0;
}
.nc-producto-nombre {
  display: block;
  font-size: 0.88rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}
.nc-producto-precio {
  font-size: 0.78rem;
  font-weight: 700;
  color: #0f766e;
}
.nc-section-label {
  margin: 0.7rem 0 0.35rem;
  font-size: 0.66rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #0f766e;
}
.nc-selected-card {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f5f9;
}
.nc-selected-grid {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  grid-template-areas:
    'copy stepper'
    'obs obs';
  column-gap: 0.7rem;
  row-gap: 0.18rem;
  align-items: start;
}
.nc-producto-copy {
  grid-area: copy;
  min-width: 0;
  width: 100%;
}
.nc-producto-copy--truncate {
  min-width: 0;
  width: 100%;
}
.nc-obs-wrap {
  grid-area: obs;
  min-width: 0;
  width: 100%;
  padding-right: 0;
}
.nc-obs-label {
  display: block;
  margin-top: 0.24rem;
  margin-bottom: 0.14rem;
  font-size: 0.62rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #475569;
}
.nc-obs-input {
  width: 100%;
  box-sizing: border-box;
  resize: none;
  overflow-y: auto;
  min-height: 40px;
  max-height: 78px;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  padding: 0.36rem 0.5rem;
  line-height: 1.28;
  font-size: 0.72rem;
  font-weight: 600;
  color: #0f172a;
  background: #fff;
  transition: min-height 140ms ease;
}
.nc-obs-input:focus {
  outline: none;
  min-height: 56px;
  border-color: #0ea5e9;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
}

/* ── Stepper ── */
.nc-stepper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}
.nc-stepper--grid {
  grid-area: stepper;
  min-width: max-content;
  justify-self: end;
}
.nc-stepper-btn {
  width: 32px;
  height: 32px;
  border: 1.5px solid #cbd5e1;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: #334155;
}
.nc-stepper-qty {
  min-width: 1.4rem;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 800;
  color: #0f172a;
}

/* ── Totales ── */
.nc-totales {
  border-top: 1px solid #e2e8f0;
  padding: 0.7rem 1rem;
  background: #fff;
  flex-shrink: 0;
}
.nc-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.7rem;
  font-size: 0.84rem;
  color: #334155;
}
.nc-total-box {
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #f8fafc;
  margin-bottom: 0.45rem;
}
.nc-total-row--final {
  font-size: 0.94rem;
  font-weight: 900;
  color: #0f172a;
  border-color: #cbd5e1;
  margin-bottom: 0;
}

.nc-footer {
  margin-top: 0 !important;
  padding: 0.65rem 1rem 0.85rem !important;
  border-top: 1px solid #e2e8f0 !important;
  background: #fff;
}

.nc-footer-btn {
  width: auto !important;
  min-width: 0;
  min-height: 2.5rem !important;
  padding: 0.5rem 0.75rem !important;
  font-size: 0.75rem !important;
  text-transform: uppercase !important;
  font-weight: 700 !important;
}

.nc-footer-btn i {
  margin-right: 4px !important;
}

@media (max-width: 520px) {
  .modal-header-custom {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.75rem;
    padding: 0.95rem 1rem 0.85rem;
  }
  .header-left { min-width: 0; }
  .header-right {
    justify-self: end;
    justify-content: flex-end;
    text-align: right;
    min-width: max-content;
    padding: 4px 10px;
    gap: 6px;
  }
  .mesa-badge { font-size: 1.05rem; }
  .label-editar { font-size: 0.82rem; }
  .id-comanda { font-size: 0.92rem; }
  .nc-footer {
    padding: 0.6rem 0.75rem 0.75rem !important;
  }
  .nc-search-wrap {
    margin: 0.8rem 0.75rem 0;
  }
  .nc-footer .modal-footer-right {
    width: 100%;
    justify-content: flex-end;
    gap: 0.5rem !important;
    flex-wrap: nowrap !important;
  }
}

@media (min-width: 1025px) {
  .nc-overlay { align-items: center; justify-content: center; }
  .nc-sheet {
    width: min(480px, 96vw);
    height: auto;
    max-height: 88dvh;
    border-radius: 1.25rem;
  }
}
</style>

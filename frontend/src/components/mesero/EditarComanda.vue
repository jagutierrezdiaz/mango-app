<template>
  <div class="ec-overlay" @click.self="onCerrar">
    <div class="ec-sheet" @click.stop>

      <!-- ── Encabezado ── -->
      <header class="modal-header-custom" :style="headerGradientStyle">
        <div class="header-left">
          <span class="mesa-badge">{{ headerClienteNombre }}</span>
        </div>
        <div class="header-right">
          <button
            v-if="isPrinterConnected"
            type="button"
            class="btn-precuenta-bluetooth mr-2"
            :disabled="!!saving"
            @click="onImprimirPrecuentaBluetooth"
            title="Imprimir pre-cuenta en la impresora portatil Bluetooth"
          >
            <i class="fas fa-print"></i>
            <span>Precuenta</span>
          </button>
          <button
            type="button"
            class="btn-cambio-mesa"
            :disabled="!!saving"
            @click="onAbrirCambioMesa"
          >
            <i class="fas fa-exchange-alt"></i>
            <span>Cambio Mesa</span>
          </button>
          <span class="label-editar">Editar Comanda</span>
          <span v-if="comandaId" class="id-comanda"># {{ comandaId }}</span>
        </div>
      </header>

      <!-- ── Buscador ── -->
      <div class="ec-search-wrap">
        <i class="fas fa-search ec-search-icon"></i>
        <input
          v-model="busqueda"
          type="text"
          class="ec-search-input"
          placeholder="Buscar producto o categoría…"
          autocomplete="off"
        />
        <button v-if="busqueda" type="button" class="ec-clear-btn" @click="busqueda = ''">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="ec-toast-wrap pointer-events-none" aria-live="polite" aria-atomic="true">
        <transition name="ec-toast-fade">
          <article
            v-if="modalToast"
            class="ec-toast pointer-events-auto"
            :class="`ec-toast-${modalToast.type || 'info'}`"
          >
            <p class="ec-toast-message">{{ modalToast.message }}</p>
          </article>
        </transition>
      </div>

      <!-- ── Cuerpo scrolleable ── -->
      <div class="ec-body">

        <!-- Resultados de búsqueda (SOLO si hay texto) -->
        <template v-if="busqueda.trim()">
          <p class="ec-section-label">Resultados de búsqueda</p>
          <p v-if="!productosFiltrados.length" class="ec-empty-msg">
            Sin resultados para "{{ busqueda }}"
          </p>
          <article
            v-for="p in productosFiltrados"
            :key="`search-${p.id}`"
            class="ec-producto-card"
          >
            <img class="ec-producto-img" :src="getImgUrl(p.url_foto)" :alt="p.nombre" @error="onImgError" />
            <div class="ec-producto-info">
              <strong>{{ p.nombre }}</strong>
              <span class="ec-producto-precio">{{ formatCurrency(p.precio_unitario || 0) }}</span>
            </div>
            <div class="ec-stepper">
              <button type="button" class="ec-stepper-btn" @click="decrementar(p)">
                <i class="fas fa-minus"></i>
              </button>
              <strong class="ec-stepper-qty">{{ getCantidad(p.id) }}</strong>
              <button type="button" class="ec-stepper-btn" @click="incrementar(p)">
                <i class="fas fa-plus"></i>
              </button>
            </div>
          </article>
        </template>

        <!-- Productos ya en la comanda (detalles de BD) -->
        <p class="ec-section-label">Productos en la comanda</p>
        <div v-if="!detalles.length" class="ec-empty-msg">Sin productos aún.</div>
        <article
          v-for="d in detalles"
          :key="`detalle-${d.id}`"
          class="ec-detalle-card"
        >
          <img class="ec-producto-img" :src="getImgUrl(d.url_foto)" :alt="d.producto_nombre" @error="onImgError" />
          <div class="ec-detalle-grid">
            <div class="ec-producto-copy ec-producto-copy--truncate">
              <strong class="ec-detalle-nombre">{{ d.producto_nombre }}</strong>
              <span class="ec-producto-precio">
              {{ d.cantidad }} × {{ formatCurrency(d.precio_unitario) }}
              </span>
            </div>
            <div class="ec-detalle-actions ec-detalle-actions--row">
              <span
                class="ec-badge"
                :class="esDetalleProcesado(d) ? 'ec-badge--procesado' : 'ec-badge--ordenado'"
              >
                {{ d.estado_producto || 'Ordenado' }}
              </span>
              <button
                type="button"
                class="ec-btn-borrar"
                :disabled="!!saving"
                @click="onBorrarDetalle(d)"
              >
                Borrar
              </button>
            </div>
            <div class="ec-obs-wrap">
              <label class="ec-obs-label">Observaciones</label>
              <textarea
                v-model="observacionesDetalle[d.id]"
                class="ec-obs-input"
                rows="1"
                maxlength="255"
                :disabled="!!saving"
                placeholder="Ej: sin azucar, leche deslactosada"
              ></textarea>
            </div>
          </div>
        </article>

        <template v-if="productosNuevosSeleccionados.length">
          <p class="ec-section-label">Nuevos por guardar</p>
          <article
            v-for="entry in productosNuevosSeleccionados"
            :key="`nuevo-${entry.producto_id}`"
            class="ec-detalle-card"
          >
            <img
              class="ec-producto-img"
              :src="getImgUrl(entry.producto.url_foto)"
              :alt="entry.producto.nombre || 'Producto'"
              @error="onImgError"
            />
            <div class="ec-detalle-grid">
              <div class="ec-producto-copy ec-producto-copy--truncate">
                <strong class="ec-detalle-nombre">{{ entry.producto.nombre || `Producto #${entry.producto_id}` }}</strong>
                <span class="ec-producto-precio">{{ entry.item.cantidad }} × {{ formatCurrency(entry.item.precio_unitario) }}</span>
              </div>
              <div class="ec-detalle-actions ec-detalle-actions--row">
                <span class="ec-badge ec-badge--ordenado">Ordenado</span>
              </div>
              <div class="ec-obs-wrap">
                <label class="ec-obs-label">Observaciones</label>
                <textarea
                  v-model="entry.item.observaciones_mesero"
                  class="ec-obs-input"
                  rows="1"
                  maxlength="255"
                  :disabled="!!saving"
                  placeholder="Ej: sin azucar, leche deslactosada"
                ></textarea>
              </div>
            </div>
          </article>
        </template>

      </div>

      <!-- ── Totales ── -->
      <div class="ec-totales">
        <div class="ec-total-row ec-total-box">
          <span>Subtotal</span>
          <span>{{ formatCurrency(subtotal) }}</span>
        </div>
        <div class="ec-total-row ec-total-box">
          <span>{{ aporteLabel }}</span>
          <span>{{ formatCurrency(propina) }}</span>
        </div>
        <div class="ec-total-row ec-total-row--final ec-total-box">
          <span>Total Final</span>
          <span>{{ formatCurrency(totalFinal) }}</span>
        </div>
      </div>

      <div class="modal-footer-btns ec-footer" style="display: flex !important; flex-wrap: nowrap !important; gap: 0.5rem !important;">
        <div class="modal-footer-left"></div>
        <div class="modal-footer-right" style="display: flex !important; flex-wrap: nowrap !important; gap: 0.5rem !important; width: 100% !important;">
          <button
            type="button"
            class="btn-modal-cancel ec-footer-btn"
            style="flex: 1;"
            :disabled="!!saving"
            @click="onCerrar"
          >
            <i class="fas fa-arrow-left"></i>
            <span>Regresar</span>
          </button>
          <button
            type="button"
            class="btn-modal-save ec-footer-btn"
            style="flex: 1;"
            :disabled="saving || (!hayNuevosProductos && !hayCambiosObservaciones)"
            @click="onGuardar"
          >
            <i v-if="saving === 'guardar'" class="fas fa-circle-notch fa-spin"></i>
            <i v-else class="fas fa-check"></i>
            <span>{{ saving === 'guardar' ? 'GUARDANDO...' : 'GUARDAR' }}</span>
          </button>
          <button
            type="button"
            class="btn-modal-save pb-btn-warn ec-footer-btn"
            style="flex: 1;"
            :disabled="!!saving"
            :title="motivoBloqueoACaja || ''"
            @click="onACaja"
          >
            <i v-if="saving === 'caja'" class="fas fa-circle-notch fa-spin"></i>
            <i v-else class="fas fa-cash-register"></i>
            <span>{{ saving === 'caja' ? 'ENVIANDO...' : 'A CAJA' }}</span>
          </button>
        </div>
      </div>

    </div>

    <!-- ── Sub-modal: Cambio de Mesa ── -->
    <transition name="cm-fade">
      <div v-if="showCambioMesa" class="cm-overlay" @click.self="showCambioMesa = false">
        <div class="cm-card" @click.stop>
          <header class="cm-header">
            <span class="cm-title">Mesas Disponibles</span>
            <button type="button" class="cm-close-btn" @click="showCambioMesa = false">
              <i class="fas fa-times"></i>
            </button>
          </header>
          <div class="cm-body">
            <div v-if="loadingMesas" class="cm-loading">
              <i class="fas fa-circle-notch fa-spin"></i> Cargando mesas...
            </div>
            <div v-else-if="!mesasDisponibles.length" class="cm-empty">
              No hay mesas disponibles en este momento.
            </div>
            <ul v-else class="cm-lista">
              <li
                v-for="m in mesasDisponibles"
                :key="m.id"
                class="cm-mesa-item"
                :class="{ 'cm-mesa-item--saving': saving === 'cambio-mesa' }"
                @click="onCambiarMesa(m)"
              >
                <i class="fas fa-chair cm-mesa-icon"></i>
                <span class="cm-mesa-nombre">{{ m.nombre }}</span>
                <i class="fas fa-chevron-right cm-mesa-arrow"></i>
              </li>
            </ul>
          </div>
          <footer class="cm-footer">
            <button type="button" class="btn-modal-cancel" @click="showCambioMesa = false">
              Cancelar
            </button>
          </footer>
        </div>
      </div>
    </transition>

  </div>
</template>

<script>
import { computed, onUnmounted, ref, watch } from 'vue'
import { API_BASE_URL } from '../../config/api.js'
import { comandasService } from '../../services/comandasService.js'
import { mesasService } from '../../services/mesaService.js'
import { bluetoothPrinterService } from '../../services/bluetoothPrinterService.js'
import Swal from 'sweetalert2'

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
  name: 'EditarComanda',
  props: {
    mesa: { type: Object, required: true },
    comanda: { type: Object, required: true },
    productosActivos: { type: Array, default: () => [] },
    categoriasConProductos: { type: Array, default: () => [] },
    aporteServicio: { type: [Number, Object], default: () => ({ valor_parametro: 0, tipo_dato: 'porcentaje' }) }
  },
  emits: ['cerrar', 'actualizada', 'aCaja', 'cancelada'],
  setup (props, { emit }) {
    const busqueda = ref('')
    const productosNuevosTemp = ref({})
    const saving = ref('')  // '', 'guardar', 'caja', 'borrar'
    const modalToast = ref(null)
    const comandaId = computed(() => Number(props.comanda?.id || 0))
    const MENSAJE_PENDIENTES_COCINA = 'NO SE PUEDE CERRAR LA COMANDA: HAY PRODUCTOS PENDIENTES DE COCINA.'
    let modalToastTimer = null
    const mesaNombreLocal = ref(String(props.mesa?.nombre || props.mesa?.numero || ''))
    const headerClienteNombre = computed(() =>
      String(
        props.comanda?.cliente?.nombre
        || mesaNombreLocal.value
        || 'Mesa'
      )
    )
    const headerGradientStyle = computed(() =>
      getMesaGradient(props.comanda?.mesa?.nombre || mesaNombreLocal.value || headerClienteNombre.value)
    )

    const detalles = computed(() => Array.isArray(props.comanda?.detalles) ? props.comanda.detalles : [])
    const observacionesDetalle = ref({})

    const syncObservacionesDetalle = () => {
      const next = {}
      for (const d of detalles.value) {
        next[d.id] = String(d.observaciones_mesero || '')
      }
      observacionesDetalle.value = next
    }

    watch(() => comandaId.value, syncObservacionesDetalle, { immediate: true })
    watch(() => detalles.value.length, syncObservacionesDetalle)

    const catNombreMap = computed(() => {
      const map = {}
      ;(props.categoriasConProductos || []).forEach((c) => { map[c.id] = String(c.nombre || '').toLowerCase() })
      return map
    })

    const productosById = computed(() => {
      const map = {}
      ;(props.productosActivos || []).forEach((p) => {
        map[Number(p.id)] = p
      })
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

    const productosNuevosSeleccionados = computed(() =>
      Object.entries(productosNuevosTemp.value)
        .map(([productoId, item]) => ({
          producto_id: Number(productoId),
          item,
          producto: productosById.value[Number(productoId)] || {
            id: Number(productoId),
            nombre: 'Producto',
            url_foto: null
          }
        }))
        .filter((entry) => Number(entry.item?.cantidad || 0) > 0)
        .sort((a, b) => String(a.producto.nombre || '').localeCompare(String(b.producto.nombre || ''), 'es', { sensitivity: 'base' }))
    )

    const hayNuevosProductos = computed(() => productosNuevosSeleccionados.value.length > 0)

    const observacionesActualizadas = computed(() =>
      detalles.value
        .map((d) => ({
          detalle_id: Number(d.id),
          observaciones_mesero: String(observacionesDetalle.value[d.id] || '').trim() || null,
          original: String(d.observaciones_mesero || '').trim() || null
        }))
        .filter((row) => row.observaciones_mesero !== row.original)
        .map(({ detalle_id, observaciones_mesero }) => ({ detalle_id, observaciones_mesero }))
    )

    const hayCambiosObservaciones = computed(() => observacionesActualizadas.value.length > 0)

    // Subtotal = detalles existentes + nuevos pendientes
    const subtotalExistentes = computed(() =>
      detalles.value.reduce((s, d) => s + Number(d.valor_subtotal || 0), 0)
    )
    const subtotalNuevos = computed(() =>
      Object.values(productosNuevosTemp.value).reduce(
        (s, item) => s + Number(item.cantidad || 0) * Number(item.precio_unitario || 0),
        0
      )
    )
    const subtotal = computed(() => subtotalExistentes.value + subtotalNuevos.value)

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

    const propina = computed(() => {
      const tipoDato = aporteConfig.value.tipo_dato
      const valorParametro = Number(aporteConfig.value.valor_parametro || 0)
      const subtotalValue = Number(subtotal.value || 0)
      return Math.round(tipoDato === 'moneda'
        ? valorParametro
        : subtotalValue * (aportePct.value / 100))
    })

    const aporteLabel = computed(() => {
      if (aporteConfig.value.tipo_dato === 'porcentaje') {
        return `Propina Voluntaria ${aportePct.value}%`
      }
      return 'Propina Voluntaria'
    })

    const totalFinal = computed(() => subtotal.value + propina.value)

    const esDetalleProcesado = (d) => String(d?.estado_producto || '').toUpperCase() === 'PROCESADO'

    const totalDetalles = computed(() => detalles.value.length)

    const todosLosProcesados = computed(() =>
      totalDetalles.value > 0 && detalles.value.every(esDetalleProcesado)
    )

    const motivoBloqueoACaja = computed(() => {
      if (totalDetalles.value === 0) return ''
      if (!todosLosProcesados.value) return MENSAJE_PENDIENTES_COCINA
      return ''
    })

    const puedeIrACaja = computed(() => !motivoBloqueoACaja.value)

    const showModalToast = (message, type = 'error', duration = 10000) => {
      const normalizedMessage = String(message || '').trim()
      if (!normalizedMessage) return

      if (modalToastTimer) {
        clearTimeout(modalToastTimer)
        modalToastTimer = null
      }

      modalToast.value = {
        id: Date.now() + Math.random(),
        message: normalizedMessage,
        type
      }

      modalToastTimer = setTimeout(() => {
        modalToast.value = null
        modalToastTimer = null
      }, Math.max(1200, Number(duration) || 10000))
    }

    const getCantidad = (productoId) => Number(productosNuevosTemp.value[productoId]?.cantidad || 0)

    const incrementar = (producto) => {
      const cur = getCantidad(producto.id)
      productosNuevosTemp.value = {
        ...productosNuevosTemp.value,
        [producto.id]: {
          cantidad: cur + 1,
          precio_unitario: Number(producto.precio_unitario || 0),
          observaciones_mesero: cur > 0
            ? String(productosNuevosTemp.value[producto.id]?.observaciones_mesero || '')
            : null
        }
      }
    }

    const decrementar = (producto) => {
      const cur = getCantidad(producto.id)
      if (cur <= 0) return
      if (cur === 1) {
        const clone = { ...productosNuevosTemp.value }
        delete clone[producto.id]
        productosNuevosTemp.value = clone
        return
      }
      productosNuevosTemp.value = {
        ...productosNuevosTemp.value,
        [producto.id]: {
          ...productosNuevosTemp.value[producto.id],
          cantidad: cur - 1
        }
      }
    }

    const buildDetallesNuevosPayload = () => {
      return Object.entries(productosNuevosTemp.value)
        .map(([productoId, item]) => ({
          producto_id: Number(productoId),
          cantidad: Number(item.cantidad || 0),
          observaciones_mesero: String(item.observaciones_mesero || '').trim() || null,
          estado_producto: 'Ordenado'
        }))
        .filter((i) => i.producto_id > 0 && i.cantidad > 0)
    }

    const resetNuevos = () => {
      productosNuevosTemp.value = {}
      busqueda.value = ''
    }

    const onCerrar = () => {
      if (!saving.value) {
        resetNuevos()
        emit('cerrar')
      }
    }

    const onGuardar = async () => {
      if (saving.value) return
      if (!hayNuevosProductos.value && !hayCambiosObservaciones.value) return
      saving.value = 'guardar'
      try {
        const items = buildDetallesNuevosPayload()
        emit('actualizada', {
          comanda_id: props.comanda.id,
          detallesNuevos: items,
          observacionesActualizadas: observacionesActualizadas.value
        })
        resetNuevos()
        syncObservacionesDetalle()
      } finally {
        saving.value = ''
      }
    }

    const onACaja = async () => {
      if (saving.value) return

      // Comanda vacía: ofrecer cancelarla
      if (totalDetalles.value === 0) {
        const confirmCancel = await Swal.fire({
          title: 'No se puede enviar a caja una comanda sin productos, ¿desea cancelar la comanda?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, cancelar',
          cancelButtonText: 'No',
          confirmButtonColor: '#d33',
          cancelButtonColor: '#6b7280'
        })
        if (!confirmCancel.isConfirmed) return
        saving.value = 'cancelar'
        try {
          await comandasService.deleteComanda(props.comanda.id)
          emit('cancelada', {
            comanda_id: props.comanda.id,
            mesa_id: Number(props.mesa?.id || props.comanda?.mesa_id || 0)
          })
        } catch (error) {
          showModalToast(error?.message || 'Error al cancelar la comanda', 'error', 10000)
        } finally {
          saving.value = ''
        }
        return
      }

      if (!puedeIrACaja.value) {
        showModalToast(motivoBloqueoACaja.value, 'error', 10000)
        return
      }

      const confirm = await Swal.fire({
        title: '¿Estás seguro de enviar a caja?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Aceptar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33'
      })

      if (!confirm.isConfirmed) return

      saving.value = 'caja'
      try {
        await comandasService.updateComanda(props.comanda.id, { estado_comanda: 'Cerrada' })
        emit('aCaja', { comanda_id: props.comanda.id })
      } catch (error) {
        showModalToast(error?.message || 'Error al enviar a caja', 'error', 10000)
      } finally {
        saving.value = ''
      }
    }

    onUnmounted(() => {
      if (modalToastTimer) {
        clearTimeout(modalToastTimer)
        modalToastTimer = null
      }
    })

    const onBorrarDetalle = (detalle) => {
      if (saving.value) return
      emit('actualizada', { comanda_id: props.comanda.id, borrarDetalleId: detalle.id })
    }

    // ── Cambio de Mesa ──
    const showCambioMesa = ref(false)
    const mesasDisponibles = ref([])
    const loadingMesas = ref(false)

    const onAbrirCambioMesa = async () => {
      if (saving.value) return
      loadingMesas.value = true
      showCambioMesa.value = true
      try {
        const todas = await mesasService.getAll()
        mesasDisponibles.value = todas
          .filter((m) => String(m.estado || '').toLowerCase() === 'libre')
          .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'))
      } catch (error) {
        showModalToast(error?.message || 'Error al cargar mesas disponibles', 'error', 8000)
        showCambioMesa.value = false
      } finally {
        loadingMesas.value = false
      }
    }

    const onCambiarMesa = async (mesa) => {
      if (saving.value) return
      saving.value = 'cambio-mesa'
      try {
        await comandasService.updateComanda(props.comanda.id, { mesa_id: Number(mesa.id) })
        mesaNombreLocal.value = String(mesa.nombre || '')
        showCambioMesa.value = false
        emit('actualizada', { comanda_id: props.comanda.id, mesa_id: Number(mesa.id), mesa_nombre: mesa.nombre })
      } catch (error) {
        showModalToast(error?.message || 'Error al cambiar la mesa', 'error', 8000)
      } finally {
        saving.value = ''
      }
    }

    // --- Servicío De Precuenta Bluetooth ---
    const isPrinterConnected = computed(() => bluetoothPrinterService.isPrinterConnected.value);

    const debugLog = async (titulo, dato = null) => {
      console.log(titulo, dato);

      await Swal.fire({
        title: titulo,
        text:
          typeof dato === 'object'
            ? JSON.stringify(dato, null, 2)
            : String(dato ?? ''),
        width: '90%',
        confirmButtonText: 'Continuar'
      });
    };

    /* impresion */
    const onImprimirPrecuentaBluetooth = async () => {
      if (!props.comanda?.id) return;

      saving.value = 'guardar';

      /* debugger */
      /*
      await debugLog(
        'Entró a onImprimirPrecuentaBluetooth'
      );
      */

      try {
        // Combinar detalles de base de datos y productos nuevos por guardar
        const itemsUnificados = [...detalles.value];

        // Mapear productos provisionales agregados por el mesero
        Object.entries(productosNuevosTemp.value || {}).forEach(([productoId, nuevo]) => {
          const itemCatalogo = productosById.value[Number(productoId)]
          const cantidad = Number(nuevo.cantidad || 0)
          if (cantidad <= 0) return

          itemsUnificados.push({
            id: null,
            cantidad,
            producto_nombre: itemCatalogo?.nombre || 'Producto',
            precio_unitario: Number(nuevo.precio_unitario || 0),
            valor_subtotal: cantidad * Number(nuevo.precio_unitario || 0)
          })
        })

        // Construir ticket
        const ticketPayload = {
          id: props.comanda.id,
          mesa_nombre: headerClienteNombre.value,
          mesero_nombre:
            props.comanda?.mesero_nombre ||
            props.comanda?.personal_nombres ||
            'Mesero',
          detalles: itemsUnificados
        };

        /* debugger */
        /*
        await debugLog(
          'Ticket generado',
          ticketPayload
        );
        */

        console.log('==============================');
        console.log('🖨️ INICIO IMPRESIÓN PRECUENTA');
        console.log('==============================');

        console.log('Comanda ID:', props.comanda.id);

        console.log(
          'Estado impresora:',
          bluetoothPrinterService.isPrinterConnected.value
        );
        
        /* debugger */
        /*
        await debugLog(
          'Estado impresora',
          bluetoothPrinterService.isPrinterConnected.value
        );
        */

        console.log('Mesa:', headerClienteNombre.value);

        console.log(
          'Mesero:',
          props.comanda?.mesero_nombre ||
          props.comanda?.personal_nombres ||
          'Mesero'
        );

        console.log(
          'Cantidad items:',
          itemsUnificados.length
        );

        console.log(
          'Ticket completo:',
          JSON.stringify(ticketPayload, null, 2)
        );

        itemsUnificados.forEach((item, index) => {
          console.log(`ITEM ${index + 1}:`, {
            producto: item.producto_nombre,
            cantidad: item.cantidad,
            precio: item.precio_unitario,
            subtotal: item.valor_subtotal
          });
        });

        /* debugger */
        /*
        await debugLog(
          'Voy a llamar imprimirPrecuenta()'
        );
        */

        await bluetoothPrinterService.imprimirPrecuenta(
          ticketPayload
        );

        /* debugger */
        /*
        await debugLog(
          'imprimirPrecuenta() terminó correctamente'
        );
        */

        showModalToast(
          'Precuenta enviada a imprimir',
          'success',
          3000
        );

      } catch (err) {

        await debugLog(
          'ERROR DETECTADO',
          {
            mensaje: err?.message,
            stack: err?.stack
          }
        );

        console.error('====================================');
        console.error('❌ ERROR IMPRESIÓN PRECUENTA');
        console.error('====================================');

        console.error('Mensaje:', err?.message);
        console.error('Error completo:', err);

        if (err?.stack) {
          console.error('Stack:', err.stack);
        }

        console.error(
          'Fecha/Hora:',
          new Date().toISOString()
        );

        Swal.fire({
          icon: 'error',
          title: 'Error de impresión',
          text:
            err?.message ||
            'No se pudo completar la impresión de la precuenta.'
        });

      } finally {
        saving.value = '';
      }
    };

    const getImgUrl = (filename) => {
      if (!filename) return `${UPLOADS_BASE}/uploads/productos/default.png`
      if (/^https?:\/\//i.test(filename)) return filename
      if (filename.startsWith('/uploads/')) return `${UPLOADS_BASE}${filename}`
      return `${UPLOADS_BASE}/uploads/productos/${filename}`
    }

    const onImgError = (e) => { e.target.src = `${UPLOADS_BASE}/uploads/productos/default.png` }

    const formatCurrency = (v) =>
      Number(Math.round(v || 0)).toLocaleString('es-CO', {
        style: 'currency', currency: 'COP',
        minimumFractionDigits: 0, maximumFractionDigits: 0
      })

    return {
      busqueda, productosNuevosSeleccionados, saving, comandaId, mesaNombreLocal, headerClienteNombre, headerGradientStyle,
      detalles, observacionesDetalle, productosById, productosFiltrados,
      hayNuevosProductos, hayCambiosObservaciones, puedeIrACaja, motivoBloqueoACaja,
      subtotal, propina, totalFinal, aportePct, aporteLabel,
      esDetalleProcesado,
      modalToast,
      getCantidad, incrementar, decrementar,
      onCerrar, onGuardar, onACaja, onBorrarDetalle,
      getImgUrl, onImgError, formatCurrency,
      showCambioMesa, mesasDisponibles, loadingMesas,
      onAbrirCambioMesa, onCambiarMesa,
      isPrinterConnected, onImprimirPrecuentaBluetooth
    }
  }
}
</script>

<style scoped>
.ec-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: stretch;
  justify-content: stretch;
}

.ec-sheet {
  width: 100vw;
  height: 100dvh;
  max-height: 100dvh;
  background: #fff;
  border-radius: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 -8px 32px rgba(15, 23, 42, 0.22);
}

.ec-toast-wrap {
  position: absolute;
  top: 5.6rem;
  left: 1rem;
  right: 1rem;
  z-index: 10000 !important;
}

.ec-toast {
  border-radius: 0.9rem;
  border: 1px solid #dbeafe;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
  padding: 0.75rem 0.85rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
}

.ec-toast-message {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #1e293b;
}

.ec-toast-info {
  border-color: #bae6fd;
}

.ec-toast-success {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.ec-toast-warning {
  border-color: #fed7aa;
  background: #fff7ed;
}

.ec-toast-error {
  border-color: #fecaca;
  background: #fef2f2;
}

.ec-toast-fade-enter-active,
.ec-toast-fade-leave-active {
  transition: all 0.2s ease;
}

.ec-toast-fade-enter-from,
.ec-toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
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
  left: 1.25rem;
  right: 1.25rem;
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
.ec-search-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.42rem 0.75rem;
  margin: 0.7rem 1rem 0;
  border: 0;
  border-bottom: 0;
  border-radius: 1.5rem;
  background: #e3f2fd;
  flex-shrink: 0;
  box-shadow: none;
  min-height: 2rem;
}
.ec-search-icon { color: #94a3b8; font-size: 0.9rem; }
.ec-search-input {
  flex: 1;
  border: 0;
  background: transparent;
  font-size: 0.84rem;
  line-height: 1.2;
  color: #0f172a;
  outline: none;
  font-family: inherit;
}
.ec-clear-btn { border: 0; background: none; color: #94a3b8; cursor: pointer; padding: 4px; font-size: 0.8rem; }

/* ── Body ── */
.ec-body { flex: 1; overflow-y: auto; padding: 0.35rem 1rem 0.5rem; }

.ec-section-label {
  font-size: 0.7rem;
  font-weight: 800;
  color: #0f766e;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin: 0.7rem 0 0.35rem;
}
.ec-empty-msg { font-size: 0.83rem; color: #94a3b8; padding: 0.4rem 0 0.8rem; }

/* ── Producto card (búsqueda) ── */
.ec-producto-card {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid #f1f5f9;
}
/* ── Detalle card (comanda) ── */
.ec-detalle-card {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f5f9;
}
.ec-detalle-grid {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  grid-template-areas:
    'copy actions'
    'obs obs';
  column-gap: 0.7rem;
  row-gap: 0.18rem;
  align-items: start;
}
.ec-producto-img {
  width: 44px;
  height: 44px;
  border-radius: 0.55rem;
  object-fit: cover;
  background: #f1f5f9;
  flex-shrink: 0;
}
.ec-producto-copy {
  grid-area: copy;
  min-width: 0;
  width: 100%;
}
.ec-producto-copy--truncate {
  min-width: 0;
}
.ec-producto-copy strong {
  display: block;
  font-size: 0.88rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}
.ec-obs-wrap {
  grid-area: obs;
  min-width: 0;
  width: 100%;
  padding-right: 0;
}
.ec-detalle-nombre {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ec-producto-precio {
  font-size: 0.78rem;
  font-weight: 700;
  color: #0f766e;
}
.ec-obs-label {
  display: block;
  margin-top: 0.24rem;
  margin-bottom: 0.14rem;
  font-size: 0.62rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #475569;
}
.ec-obs-input {
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
.ec-obs-input:focus {
  outline: none;
  min-height: 56px;
  border-color: #0ea5e9;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
}

/* ── Stepper ── */
.ec-stepper { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
.ec-stepper-btn {
  width: 32px; height: 32px;
  border: 1.5px solid #cbd5e1;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.7rem; color: #334155;
}
.ec-stepper-qty { min-width: 1.4rem; text-align: center; font-size: 0.9rem; font-weight: 800; color: #0f172a; }

/* ── Detalle acciones ── */
.ec-detalle-actions {
  grid-area: actions;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.3rem;
  flex-shrink: 0;
  justify-self: end;
}
.ec-detalle-actions--row {
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 0.28rem;
  min-width: max-content;
  width: max-content;
}
.ec-badge {
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  border-radius: 999px;
  padding: 0.18rem 0.55rem;
}
.ec-badge--ordenado { background: #fef9c3; color: #92400e; }
.ec-badge--procesado { background: #dcfce7; color: #166534; }
.ec-btn-borrar {
  border: 0;
  border-radius: 0.45rem;
  background: #fee2e2;
  color: #be123c;
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 0.2rem 0.55rem;
  cursor: pointer;
  font-family: inherit;
  letter-spacing: 0.06em;
}
.ec-btn-borrar:disabled { opacity: 0.45; cursor: not-allowed; }

/* ── Totales ── */
.ec-totales {
  border-top: 1px solid #e2e8f0;
  padding: 0.7rem 1rem;
  background: #fff;
  flex-shrink: 0;
}
.ec-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.7rem;
  font-size: 0.84rem;
  color: #334155;
}
.ec-total-box {
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #f8fafc;
  margin-bottom: 0.45rem;
}
.ec-total-row--final {
  font-size: 0.94rem;
  font-weight: 900;
  color: #0f172a;
  border-color: #cbd5e1;
  margin-bottom: 0;
}

.ec-footer {
  margin-top: 0 !important;
  padding: 0.65rem 1rem 0.85rem !important;
  border-top: 1px solid #e2e8f0 !important;
  background: #fff;
}

.ec-footer-btn {
  width: auto !important;
  min-width: 0;
  min-height: 2.5rem !important;
  padding: 0.5rem 0.7rem !important;
  font-size: 0.75rem !important;
  text-transform: uppercase !important;
  font-weight: 700 !important;
}

.ec-footer-btn i {
  margin-right: 4px !important;
}

@media (max-width: 600px) {
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
  .ec-footer {
    padding: 0.6rem 0.75rem 0.75rem !important;
  }
  .ec-search-wrap {
    margin: 0.8rem 0.75rem 0;
  }
  .ec-footer .modal-footer-right {
    width: 100%;
    justify-content: flex-end;
    flex-wrap: nowrap !important;
    gap: 0.5rem !important;
  }
  .ec-detalle-main-row {
    gap: 0.45rem;
  }
  .ec-detalle-actions--row {
    gap: 0.35rem;
  }
}

@media (min-width: 1025px) {
  .ec-overlay { align-items: center; justify-content: center; }
  .ec-sheet {
    width: min(520px, 96vw);
    height: auto;
    max-height: 88dvh;
    border-radius: 1.25rem;
  }
}

/* ── Botón Cambio Mesa ── */
.btn-precuenta-bluetooth {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #1e1b4b;
  background: rgba(30, 27, 75, 0.08);
  border: 1px solid rgba(30, 27, 75, 0.28);
  border-radius: 0.5rem;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s;
}
.btn-precuenta-bluetooth:hover:not(:disabled) {
  background: rgba(30, 27, 75, 0.15);
  border-color: rgba(30, 27, 75, 0.5);
}
.btn-precuenta-bluetooth:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-cambio-mesa {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #0f766e;
  background: rgba(13, 148, 136, 0.1);
  border: 1px solid rgba(13, 148, 136, 0.35);
  border-radius: 0.5rem;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s;
}
.btn-cambio-mesa:hover:not(:disabled) {
  background: rgba(13, 148, 136, 0.18);
  border-color: rgba(13, 148, 136, 0.6);
}
.btn-cambio-mesa:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ── Sub-modal Cambio de Mesa ── */
.cm-overlay {
  position: absolute;
  inset: 0;
  z-index: 500;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}
.cm-card {
  background: #fff;
  border-radius: 1rem;
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
  overflow: hidden;
  max-height: 75dvh;
}
.cm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1.1rem;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}
.cm-title {
  font-size: 1rem;
  font-weight: 800;
  color: #1e293b;
  letter-spacing: 0.02em;
}
.cm-close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  font-size: 1rem;
  padding: 0.25rem;
  line-height: 1;
  transition: color 0.15s;
}
.cm-close-btn:hover { color: #1e293b; }
.cm-body {
  overflow-y: auto;
  flex: 1;
  padding: 0.5rem 0;
}
.cm-loading,
.cm-empty {
  padding: 2rem 1.25rem;
  text-align: center;
  color: #64748b;
  font-size: 0.875rem;
}
.cm-lista {
  list-style: none;
  margin: 0;
  padding: 0;
}
.cm-mesa-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.8rem 1.1rem;
  cursor: pointer;
  transition: background 0.12s;
  border-bottom: 1px solid #f1f5f9;
}
.cm-mesa-item:last-child { border-bottom: none; }
.cm-mesa-item:hover:not(.cm-mesa-item--saving) { background: #f0fdfa; }
.cm-mesa-item--saving { opacity: 0.5; cursor: wait; pointer-events: none; }
.cm-mesa-icon {
  color: #0d9488;
  font-size: 0.95rem;
  width: 1.1rem;
  text-align: center;
  flex-shrink: 0;
}
.cm-mesa-nombre {
  flex: 1;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1e293b;
}
.cm-mesa-arrow {
  color: #cbd5e1;
  font-size: 0.75rem;
}
.cm-footer {
  padding: 0.75rem 1.1rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}
.cm-fade-enter-active,
.cm-fade-leave-active { transition: opacity 0.18s ease; }
.cm-fade-enter-from,
.cm-fade-leave-to { opacity: 0; }
</style>

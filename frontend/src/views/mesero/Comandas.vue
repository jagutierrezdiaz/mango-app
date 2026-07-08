<template>
  <div class="mesero-comandas-view">

    <button
      v-if="showAudioAlert"
      type="button"
      class="audio-alert-btn"
      :disabled="activatingAudio"
      @click="desbloquearAudio"
    >
      🔔 Haga clic aqui para activar sonidos
    </button>

    <header class="view-header">
      <div class="header-left-side">
        <h1>Gestión de Comandas</h1>
        <span class="view-counter">{{ mesasOcupadas.length }} Mesas Ocupadas</span>
      </div>
      <div class="header-right-side flex items-center gap-2">
        <button
          type="button"
          class="bluetooth-indicator"
          :class="{
            'is-connected': isPrinterConnected,
            'is-connecting': isConnecting
          }"
          :disabled="isConnecting"
          @click="togglePrinter"
          :title="isPrinterConnected ? 'Conectado a ' + printerName + '. Clic para desconectar' : 'Impresora desconectada. Clic para conectar'"
        >
          <i class="fas" :class="isPrinterConnected ? 'fa-print' : 'fa-unlink'"></i>
          <span class="bt-text">{{ isPrinterConnected ? 'Impresora OK' : (isConnecting ? 'Conectando...' : 'Impresora') }}</span>
        </button>
      </div>
    </header>

    <section class="mesas-section">
      <div v-if="loading" class="loading-wrap">
        <div class="spinner"></div>
      </div>

      <div v-else class="mesas-grid">
        <button
          v-for="mesa in orderedMesas"
          :key="mesa.id"
          type="button"
          class="mesa-card touch-target"
          :class="{
            'is-occupied': !!mesaComandaActiva(mesa.id),
            'is-ready': mesaListaParaCaja(mesa.id),
            'has-ready-items': mesaTieneListos(mesa.id),
            'is-swipeable': canSwipeDeleteMesaComanda(mesa.id)
          }"
          :style="mesaCardStyle(mesa.id)"
          @click="onMesaCardClick(mesa)"
          @touchstart="onMesaTouchStart(mesa, $event)"
          @touchmove="onMesaTouchMove(mesa, $event)"
          @touchend="onMesaTouchEnd(mesa, $event)"
          @touchcancel="onMesaTouchCancel(mesa)"
        >
          <span v-if="mesaTieneListos(mesa.id)" class="mesa-ready-badge">Listo!</span>

          <div class="mesa-top-row">
            <span class="mesa-nombre">{{ mesa.nombre || `Mesa ${mesa.numero || mesa.id}` }}</span>
            <span class="mesa-ocupacion-badge" :class="mesaComandaActiva(mesa.id) ? 'ocupada' : 'libre'">
              {{ mesaComandaActiva(mesa.id) ? 'Ocupada' : 'Libre' }}
            </span>
          </div>

          <div class="mesa-bottom-row">
            <template v-if="mesaComandaActiva(mesa.id)">
              <span class="mesa-comanda-id"># {{ mesaComandaActiva(mesa.id).id }}</span>
              <div class="mesa-actions">
                <span class="mesa-estado" :class="mesaListaParaCaja(mesa.id) ? 'estado-caja' : 'estado-proceso'">
                  {{ mesaListaParaCaja(mesa.id) ? 'A Caja' : (mesaComandaActiva(mesa.id).estado_comanda || 'En Proceso') }}
                </span>
              </div>
            </template>
            <template v-else>
              <span class="mesa-sin-comanda">Sin Comanda</span>
              <span class="mesa-prod-count">0 prod.</span>
            </template>
          </div>
        </button>
      </div>
    </section>

    <!-- Modal: Nueva Comanda -->
    <Transition name="fade-soft">
      <NuevaComanda
        v-if="showNuevaComanda && mesaSeleccionada"
        :mesa="mesaSeleccionada"
        :productos-activos="productosActivos"
        :categorias-con-productos="categoriasConProductos"
        :aporte-servicio="aporteServicio"
        :guardar-handler="guardarNuevaComanda"
        @cerrar="cerrarModales"
      />
    </Transition>

    <!-- Modal: Editar Comanda -->
    <Transition name="fade-soft">
      <EditarComanda
        v-if="showEditarComanda && mesaSeleccionada && comandaSeleccionada"
        :mesa="mesaSeleccionada"
        :comanda="comandaSeleccionada"
        :productos-activos="productosActivos"
        :categorias-con-productos="categoriasConProductos"
        :aporte-servicio="aporteServicio"
        @cerrar="cerrarEditarComanda"
        @actualizada="onComandaActualizada"
        @a-caja="onACaja"
        @cancelada="onComandaCancelada"
      />
    </Transition>

  </div>
</template>

<script>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { comandasService, agruparDetallesPorProducto } from '../../services/comandasService.js';
import { useAuthStore } from '../../stores';
import { createSocketDeduper } from '../../utils/socketEventDedup.js';
import { SOCKET_EVENTS } from '../../constants/socketEvents.js';
import { bluetoothPrinterService } from '../../services/bluetoothPrinterService.js';
import NuevaComanda from '../../components/mesero/NuevaComanda.vue';
import EditarComanda from '../../components/mesero/EditarComanda.vue';

const ESTADOS_ACTIVOS = ['abierta', 'en proceso'];

export default {
  name: 'Comandas',
  components: { NuevaComanda, EditarComanda },
  setup () {
    const authStore = useAuthStore();
    const shouldProcessSocketEvent = createSocketDeduper(2200);

    const comandas = ref([]);
    const mesas = ref([]);
    const productosActivos = ref([]);
    const categoriasConProductos = ref([]);
    const aporteServicio = ref({ valor_parametro: 0, tipo_dato: 'porcentaje' });
    const loading = ref(true);

    const showNuevaComanda = ref(false);
    const showEditarComanda = ref(false);
    const mesaSeleccionada = ref(null);
    const comandaSeleccionada = ref(null);

    const readyMesaMap = ref({});
    const deletingComandaIds = ref({});
    const mesaSwipeOffsets = ref({});
    const mesaTouchMeta = ref({});
    const suppressOpenMesaId = ref(0);
    const swipeWarningLock = ref({});
    const showAudioAlert = ref(false);
    const activatingAudio = ref(false);

    let socketRef = null;

    const normEstado = (v) => String(v || '').trim().toLowerCase();

    const mesaComandaActiva = (mesaId) =>
      comandas.value.find((c) =>
        Number(c.mesa_id) === Number(mesaId) &&
        ESTADOS_ACTIVOS.includes(normEstado(c.estado_comanda))
      ) || null;

    const mesasOcupadas = computed(() =>
      (mesas.value || []).filter((mesa) => !!mesaComandaActiva(mesa.id))
    );

    const orderedMesas = computed(() => {
      const rows = Array.isArray(mesas.value) ? [...mesas.value] : [];
      return rows.sort((left, right) => {
        const leftOccupied = mesaComandaActiva(left.id) ? 0 : 1;
        const rightOccupied = mesaComandaActiva(right.id) ? 0 : 1;

        if (leftOccupied !== rightOccupied) return leftOccupied - rightOccupied;

        const leftNum = Number(left.numero || left.id || 0);
        const rightNum = Number(right.numero || right.id || 0);
        if (leftNum !== rightNum) return leftNum - rightNum;

        return String(left.nombre || '').localeCompare(String(right.nombre || ''), 'es', { sensitivity: 'base' });
      });
    });

    const mesaListaParaCaja = (mesaId) => {
      const comanda = mesaComandaActiva(mesaId);
      if (!comanda) return false;
      const detalles = Array.isArray(comanda.detalles) ? comanda.detalles : [];
      return detalles.length > 0 && detalles.every((d) => {
        const estadoDetalle = normEstado(d.estado_producto);
        return estadoDetalle === 'entregado' || estadoDetalle === 'procesado';
      });
    };

    const getActiveComandaForMesa = (mesaId) => mesaComandaActiva(mesaId);

    const hasEmptyComandaDetalle = (comanda) => {
      const detalles = Array.isArray(comanda?.detalles) ? comanda.detalles : [];
      return detalles.length === 0;
    };

    const canSwipeDeleteMesaComanda = (mesaId) => {
      const comanda = getActiveComandaForMesa(mesaId);
      return Boolean(comanda && hasEmptyComandaDetalle(comanda));
    };

    const notifyUi = (message, type = 'error') => {
      if (!message) return;
      window.dispatchEvent(new CustomEvent('pb:notify-ui', {
        detail: { message, type }
      }));
    };

    const notifySwipeBlocked = (mesaId) => {
      const key = String(mesaId || '');
      if (!key || swipeWarningLock.value[key]) return;
      swipeWarningLock.value = { ...swipeWarningLock.value, [key]: true };
      notifyUi('Esta comanda tiene productos registrados. Para eliminarla, primero debes borrar los productos.');
      setTimeout(() => {
        const clone = { ...swipeWarningLock.value };
        delete clone[key];
        swipeWarningLock.value = clone;
      }, 1200);
    };

    const getMesaSwipeOffset = (mesaId) => Number(mesaSwipeOffsets.value[String(mesaId)] || 0);

    const setMesaSwipeOffset = (mesaId, offset) => {
      const key = String(mesaId);
      mesaSwipeOffsets.value = { ...mesaSwipeOffsets.value, [key]: Math.max(0, Math.min(150, Number(offset || 0))) };
    };

    const clearMesaSwipeOffset = (mesaId) => {
      const key = String(mesaId);
      if (!(key in mesaSwipeOffsets.value)) return;
      const clone = { ...mesaSwipeOffsets.value };
      delete clone[key];
      mesaSwipeOffsets.value = clone;
    };

    const mesaCardStyle = (mesaId) => {
      const offset = getMesaSwipeOffset(mesaId);
      if (!offset) return null;
      return {
        transform: `translateX(${offset}px)`
      };
    };

    const clearMesaTouchMeta = (mesaId) => {
      const key = String(mesaId);
      if (!(key in mesaTouchMeta.value)) return;
      const clone = { ...mesaTouchMeta.value };
      delete clone[key];
      mesaTouchMeta.value = clone;
    };

    const onMesaTouchStart = (mesa, event) => {
      const comanda = getActiveComandaForMesa(mesa?.id);
      if (!comanda) return;
      const touch = event?.changedTouches?.[0];
      if (!touch) return;
      mesaTouchMeta.value = {
        ...mesaTouchMeta.value,
        [String(mesa.id)]: {
          x: Number(touch.clientX || 0),
          y: Number(touch.clientY || 0),
          moved: false,
          blocked: !hasEmptyComandaDetalle(comanda)
        }
      };
    };

    const onMesaTouchMove = (mesa, event) => {
      const key = String(mesa?.id || '');
      const meta = mesaTouchMeta.value[key];
      if (!meta || !canSwipeDeleteMesaComanda(mesa?.id)) return;

      const touch = event?.changedTouches?.[0];
      if (!touch) return;

      const deltaX = Number(touch.clientX || 0) - Number(meta.x || 0);
      const deltaY = Number(touch.clientY || 0) - Number(meta.y || 0);
      if (Math.abs(deltaX) <= Math.abs(deltaY)) return;

      if (meta.blocked) {
        if (deltaX > 35) {
          suppressOpenMesaId.value = Number(mesa?.id || 0);
          notifySwipeBlocked(mesa?.id);
        }
        setMesaSwipeOffset(mesa?.id, 0);
        return;
      }

      if (deltaX <= 0) {
        setMesaSwipeOffset(mesa.id, 0);
        return;
      }

      if (deltaX > 12) {
        suppressOpenMesaId.value = Number(mesa.id || 0);
      }

      meta.moved = true;
      setMesaSwipeOffset(mesa.id, deltaX);
    };

    const onMesaTouchCancel = (mesa) => {
      clearMesaTouchMeta(mesa?.id);
      clearMesaSwipeOffset(mesa?.id);
    };

    const onMesaTouchEnd = async (mesa, event) => {
      const key = String(mesa?.id || '');
      const meta = mesaTouchMeta.value[key];
      const offset = getMesaSwipeOffset(mesa?.id);
      clearMesaTouchMeta(mesa?.id);
      clearMesaSwipeOffset(mesa?.id);

      const touch = event?.changedTouches?.[0];
      const deltaX = touch ? Number(touch.clientX || 0) - Number(meta?.x || 0) : offset;

      if (meta?.blocked) {
        if (deltaX > 35) {
          suppressOpenMesaId.value = Number(mesa?.id || 0);
          notifySwipeBlocked(mesa?.id);
        }
        return;
      }

      if (!meta?.moved || deltaX < 95 || !canSwipeDeleteMesaComanda(mesa?.id)) return;

      suppressOpenMesaId.value = Number(mesa?.id || 0);
      await onDeleteMesaComanda(mesa);
    };

    const mesaTieneListos = (mesaId) => Boolean(readyMesaMap.value[String(mesaId)]);

    const setMesaLista = (mesaId, v = true) => {
      const k = String(Number(mesaId || 0));
      if (k === '0') return;
      readyMesaMap.value = { ...readyMesaMap.value, [k]: Boolean(v) };
    };

    const clearMesaLista = (mesaId) => {
      const k = String(Number(mesaId || 0));
      if (k === '0' || !readyMesaMap.value[k]) return;
      const clone = { ...readyMesaMap.value };
      delete clone[k];
      readyMesaMap.value = clone;
    };

    const resolveMesaIdFromComandaId = (comandaId) => {
      const match = comandas.value.find((c) => Number(c.id) === Number(comandaId));
      return Number(match?.mesa_id || 0);
    };

    const fetchComandas = async ({ preserveActive = true, silent = false, background = false } = {}) => {
      if (!background) loading.value = true;
      const activeId = preserveActive ? Number(comandaSeleccionada.value?.id || 0) : 0;

      try {
        const base = await comandasService.getComandas();
        const detallesResults = await Promise.allSettled(
          (base || []).map((c) => comandasService.getComandaById(c.id))
        );
        comandas.value = (base || []).map((c, i) => {
          const res = detallesResults[i];
          if (res?.status === 'fulfilled' && res.value) {
            return { ...c, ...res.value, detalles: Array.isArray(res.value.detalles) ? res.value.detalles : [] };
          }
          return { ...c, detalles: Array.isArray(c.detalles) ? c.detalles : [] };
        });

        if (activeId) {
          const refreshed = comandas.value.find((c) => Number(c.id) === activeId);
          if (refreshed) comandaSeleccionada.value = refreshed;
        }
      } catch (error) {
        if (!silent) window.dispatchEvent(new CustomEvent('pb:notify-ui', { detail: { message: error.message || 'Error al cargar comandas', type: 'error' } }));
      } finally {
        if (!background) loading.value = false;
      }
    };

    const fetchMesas = async () => {
      try { mesas.value = await comandasService.getMesas(); } catch (e) { console.error(e); }
    };

    const fetchProductos = async () => {
      try {
        const [p, c] = await Promise.all([
          comandasService.getProductosActivos(),
          comandasService.getCategoriasConProductos()
        ]);
        productosActivos.value = p || [];
        categoriasConProductos.value = c || [];
      } catch (e) { console.error(e); }
    };

    const fetchAporteServicio = async () => {
      try { aporteServicio.value = await comandasService.getAporteServicio(); } catch (e) { console.error(e); }
    };

    const refreshAll = async () => {
      await Promise.all([
        fetchComandas({ preserveActive: true, silent: true }),
        fetchMesas(),
        fetchProductos(),
        fetchAporteServicio()
      ]);
    };

    const emitSocketEvent = (eventName, payload = {}) => {
      return { eventName, payload };
    };

    const openMesaFlow = async (mesa) => {
      clearMesaLista(mesa?.id);
      mesaSeleccionada.value = mesa;

      await fetchAporteServicio();

      if (!productosActivos.value.length || !categoriasConProductos.value.length) {
        await fetchProductos();
      }

      const activa = mesaComandaActiva(mesa.id);
      if (activa) {
        try {
          const fresh = await comandasService.getComandaById(activa.id);
          const idx = comandas.value.findIndex((c) => Number(c.id) === Number(activa.id));
          if (idx >= 0) {
            comandas.value.splice(idx, 1, { ...comandas.value[idx], ...fresh, detalles: fresh.detalles || [] });
          }
          comandaSeleccionada.value = idx >= 0 ? comandas.value[idx] : activa;
        } catch {
          comandaSeleccionada.value = activa;
        }
        showEditarComanda.value = true;
      } else {
        comandaSeleccionada.value = null;
        showNuevaComanda.value = true;
      }
    };

    const onMesaCardClick = async (mesa) => {
      if (Number(suppressOpenMesaId.value || 0) === Number(mesa?.id || 0)) {
        suppressOpenMesaId.value = 0;
        return;
      }
      await openMesaFlow(mesa);
    };

    const cerrarModales = () => {
      showNuevaComanda.value = false;
      showEditarComanda.value = false;
      mesaSeleccionada.value = null;
      comandaSeleccionada.value = null;
    };

    const cerrarEditarComanda = () => {
      cerrarModales();
      /*
      window.location.reload();
      */
    };

    const guardarNuevaComanda = async ({ comanda_id, mesa_id, estado_comanda, prioridad, detalles }) => {
      try {
        let resolvedComandaId = Number(comanda_id || 0);
        let createdNow = false;

        if (!resolvedComandaId) {
          const created = await comandasService.createComanda({ mesa_id, estado_comanda, prioridad });
          resolvedComandaId = Number(created?.id || 0);
          createdNow = Boolean(resolvedComandaId);

          if (resolvedComandaId) {
            emitSocketEvent('nueva-comanda', {
              id: resolvedComandaId,
              id_comanda: resolvedComandaId,
              comanda_id: resolvedComandaId,
              mesa_id,
              id_mesa: mesa_id,
              id_mesero: Number(authStore.user?.id || 0),
              personal_id: Number(authStore.user?.id || 0),
              estado_comanda
            });
          }
        }

        if (!resolvedComandaId) {
          throw new Error('No se pudo resolver la comanda para guardar los productos.');
        }

        const detailRows = Array.isArray(detalles) ? detalles : [];
        const detallesPersistidos = [];
        let hadNewItems = false;
        let hadObsUpdates = false;

        const rowsToUpdate = detailRows.filter((d) => Number(d?.detalle_id || 0) > 0);
        const rowsToInsert = agruparDetallesPorProducto(
          detailRows.filter((d) => !Number(d?.detalle_id || 0))
        );

        for (const d of rowsToUpdate) {
          const detalleId = Number(d.detalle_id);
          const payload = {
            cantidad: Number(d?.cantidad || 0),
            observaciones_mesero: d?.observaciones_mesero ?? null
          };

          const updated = await comandasService.updateDetalleComanda(detalleId, payload);
          detallesPersistidos.push({
            detalle_id: Number(updated?.id || detalleId),
            producto_id: Number(updated?.producto_id || d?.producto_id || 0),
            observaciones_mesero: updated?.observaciones_mesero ?? payload.observaciones_mesero
          });
          hadObsUpdates = true;
        }

        for (const d of rowsToInsert) {
          const payload = {
            cantidad: Number(d?.cantidad || 0),
            observaciones_mesero: d?.observaciones_mesero ?? null
          };

          const createdDetalle = await comandasService.addProductoComanda(resolvedComandaId, {
            producto_id: Number(d?.producto_id || 0),
            cantidad: payload.cantidad,
            observaciones_mesero: payload.observaciones_mesero
          });

          detallesPersistidos.push({
            detalle_id: Number(createdDetalle?.id || 0),
            producto_id: Number(createdDetalle?.producto_id || d?.producto_id || 0),
            observaciones_mesero: createdDetalle?.observaciones_mesero ?? payload.observaciones_mesero
          });
          hadNewItems = true;
        }

        if (hadNewItems) {
          emitSocketEvent('nuevo-producto-comanda', {
            comanda_id: resolvedComandaId,
            id_comanda: resolvedComandaId,
            id_mesero: Number(authStore.user?.id || 0),
            personal_id: Number(authStore.user?.id || 0)
          });
        }
        if (hadObsUpdates && !hadNewItems) {
          emitSocketEvent('editar-comanda', {
            comanda_id: resolvedComandaId,
            id_comanda: resolvedComandaId,
            id_mesero: Number(authStore.user?.id || 0),
            personal_id: Number(authStore.user?.id || 0)
          });
        }

        await fetchComandas({ preserveActive: true, silent: true });

        window.dispatchEvent(new CustomEvent('pb:notify-ui', {
          detail: {
            message: createdNow
              ? 'Comanda creada correctamente.'
              : 'Observaciones actualizadas correctamente.',
            type: 'success'
          }
        }));

        return {
          comanda_id: resolvedComandaId,
          detallesPersistidos,
          createdNow
        };
      } catch (error) {
        window.dispatchEvent(new CustomEvent('pb:notify-ui', { detail: { message: error.message || 'Error al guardar comanda', type: 'error' } }));
        throw error;
      }
    };

    const onComandaActualizada = async ({ comanda_id, detallesNuevos, borrarDetalleId, observacionesActualizadas }) => {
      try {
        const hadDelete = Boolean(borrarDetalleId);
        const hadNewItems = Boolean(detallesNuevos && detallesNuevos.length);
        const hadObsUpdates = Boolean(observacionesActualizadas && observacionesActualizadas.length);

        if (borrarDetalleId) {
          await comandasService.deleteDetalleComanda(borrarDetalleId);
        }
        if (detallesNuevos && detallesNuevos.length) {
          const agrupados = agruparDetallesPorProducto(detallesNuevos);
          for (const d of agrupados) {
            await comandasService.addProductoComanda(comanda_id, d);
          }
        }
        if (observacionesActualizadas && observacionesActualizadas.length) {
          for (const item of observacionesActualizadas) {
            await comandasService.updateDetalleComanda(item.detalle_id, {
              observaciones_mesero: item.observaciones_mesero
            });
          }
        }

        if (hadDelete) {
          emitSocketEvent('borrar-producto-comanda', {
            comanda_id,
            id_comanda: comanda_id,
            id_mesero: Number(authStore.user?.id || 0),
            personal_id: Number(authStore.user?.id || 0)
          });
        }
        if (hadNewItems) {
          emitSocketEvent('nuevo-producto-comanda', {
            comanda_id,
            id_comanda: comanda_id,
            id_mesero: Number(authStore.user?.id || 0),
            personal_id: Number(authStore.user?.id || 0)
          });
        }
        if (hadObsUpdates && !hadDelete && !hadNewItems) {
          emitSocketEvent('editar-comanda', {
            comanda_id,
            id_comanda: comanda_id,
            id_mesero: Number(authStore.user?.id || 0),
            personal_id: Number(authStore.user?.id || 0)
          });
        }
        if (!hadDelete && !hadNewItems && !hadObsUpdates) {
          emitSocketEvent('editar-comanda', {
            comanda_id,
            id_comanda: comanda_id,
            id_mesero: Number(authStore.user?.id || 0),
            personal_id: Number(authStore.user?.id || 0)
          });
        }

        const fresh = await comandasService.getComandaById(comanda_id);
        const idx = comandas.value.findIndex((c) => Number(c.id) === Number(comanda_id));
        if (idx >= 0) {
          comandas.value.splice(idx, 1, { ...comandas.value[idx], ...fresh, detalles: fresh.detalles || [] });
          comandaSeleccionada.value = comandas.value[idx];
        }
      } catch (error) {
        window.dispatchEvent(new CustomEvent('pb:notify-ui', { detail: { message: error.message || 'Error al actualizar comanda', type: 'error' } }));
      }
    };

    const onComandaCancelada = async ({ comanda_id, mesa_id }) => {
      // Actualizar estado local optimista
      comandas.value = (comandas.value || []).filter((c) => Number(c.id) !== Number(comanda_id));
      mesas.value = (mesas.value || []).map((m) => {
        if (Number(m.id) !== Number(mesa_id)) return m;
        return { ...m, estado: 'Libre' };
      });
      cerrarModales();
      await Promise.all([
        fetchComandas({ preserveActive: false, silent: true }),
        fetchMesas()
      ]);
      window.dispatchEvent(new CustomEvent('pb:notify-ui', {
        detail: { message: `Comanda #${comanda_id} cancelada y mesa liberada.`, type: 'success' }
      }));
    };

    const onACaja = async ({ comanda_id }) => {
      try {
        emitSocketEvent('editar-comanda', {
          comanda_id,
          id_comanda: comanda_id,
          estado_comanda: 'Cerrada',
          id_mesero: Number(authStore.user?.id || 0),
          personal_id: Number(authStore.user?.id || 0)
        });
        const mesa = mesaSeleccionada.value;
        cerrarModales();
        if (mesa) clearMesaLista(mesa.id);
        await fetchComandas({ preserveActive: false, silent: true });
      } catch (error) {
        window.dispatchEvent(new CustomEvent('pb:notify-ui', { detail: { message: error.message || 'Error al enviar a caja', type: 'error' } }));
      }
    };

    const onDeleteMesaComanda = async (mesa) => {
      const comanda = mesaComandaActiva(mesa?.id);
      if (!comanda) return;

      if (!hasEmptyComandaDetalle(comanda)) {
        notifyUi('Esta comanda tiene productos registrados. Para eliminarla, primero debes borrar los productos.');
        clearMesaSwipeOffset(mesa?.id);
        return;
      }

      const ok = window.confirm('¿Estás seguro de eliminar la comanda de esta mesa? Esta acción dejará la mesa LIBRE.');
      if (!ok) {
        clearMesaSwipeOffset(mesa?.id);
        return;
      }

      deletingComandaIds.value = { ...deletingComandaIds.value, [comanda.id]: true };

      try {
        await comandasService.deleteComanda(comanda.id);
        clearMesaLista(mesa?.id);

        // Optimista: liberar mesa y quitar comanda local inmediatamente.
        comandas.value = (comandas.value || []).filter((row) => Number(row.id) !== Number(comanda.id));
        mesas.value = (mesas.value || []).map((row) => {
          if (Number(row.id) !== Number(mesa?.id)) return row;
          return { ...row, estado: 'Libre' };
        });

        if (Number(comandaSeleccionada.value?.id || 0) === Number(comanda.id)) {
          cerrarModales();
        }

        await Promise.all([
          fetchComandas({ preserveActive: false, silent: true }),
          fetchMesas()
        ]);
        window.dispatchEvent(new CustomEvent('pb:notify-ui', {
          detail: { message: `Comanda #${comanda.id} borrada`, type: 'success' }
        }));
      } catch (error) {
        window.dispatchEvent(new CustomEvent('pb:notify-ui', {
          detail: { message: error.message || 'Error al borrar comanda', type: 'error' }
        }));
      } finally {
        const clone = { ...deletingComandaIds.value };
        delete clone[comanda.id];
        deletingComandaIds.value = clone;
      }
    };

    const resolveSocketEventData = (data = {}) => {
      const envelope = (data && typeof data === 'object') ? data : {};
      const payload = (envelope.payload && typeof envelope.payload === 'object') ? envelope.payload : envelope;
      const sound = payload?.sonido || payload?.sound || envelope?.sonido || envelope?.sound || null;
      return { payload, sound };
    };

    const desbloquearAudio = async () => {
      if (activatingAudio.value) return;
      activatingAudio.value = true;

      try {
        const audio = new Audio('/sounds/new_order.mp3');
        audio.volume = 0;
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
        showAudioAlert.value = false;
      } catch (error) {
        showAudioAlert.value = true;
        console.warn('🔇 [Comandas] No fue posible desbloquear audio:', error?.message || error);
      } finally {
        activatingAudio.value = false;
      }
    };

    const isEventoParaMeseroActual = (payload) => {
      const me = Number(authStore.user && authStore.user.id || 0);
      const target = Number(payload && (payload.id_mesero || payload.personal_id) || 0);
      if (!target || !me) return false;
      return me === target;
    };

    const refrescarComandaPorId = async (comandaId) => {
      const idx = comandas.value.findIndex((c) => Number(c.id) === Number(comandaId));
      if (idx < 0) return;
      const fresh = await comandasService.getComandaById(comandaId);
      comandas.value.splice(idx, 1, { ...comandas.value[idx], ...fresh, detalles: Array.isArray(fresh.detalles) ? fresh.detalles : [] });
      if (Number(comandaSeleccionada.value && comandaSeleccionada.value.id) === Number(comandaId)) {
        comandaSeleccionada.value = comandas.value[idx];
      }
    };

    const handlePlatoListo = async (data) => {
      const { payload } = resolveSocketEventData(data);
      console.log('📢 [Comandas] Evento plato-procesado recibido para mesero', payload);
      if (!isEventoParaMeseroActual(payload)) return;
      const comandaId = Number(payload.comanda_id || 0);
      const mesaIdFromPayload = Number(payload.mesa_id || payload.id_mesa || 0);
      const mesaId = mesaIdFromPayload > 0 ? mesaIdFromPayload : resolveMesaIdFromComandaId(comandaId);
      if (mesaId > 0) setMesaLista(mesaId, true);

      if (!comandaId) { await fetchComandas({ preserveActive: true, silent: true }); return; }
      try {
        await refrescarComandaPorId(comandaId);
        if (mesaId <= 0) {
          const resolved = resolveMesaIdFromComandaId(comandaId);
          if (resolved > 0) setMesaLista(resolved, true);
        }
      } catch { await fetchComandas({ preserveActive: true, silent: true }); }
    };

    const handleComandaCerrada = async (payload) => {
      payload = payload || {};
      const comandaId = Number(payload.id_comanda || payload.comanda_id || payload.id || 0);
      const mesaId = Number(payload.mesa_id || payload.id_mesa || resolveMesaIdFromComandaId(comandaId) || 0);
      const dedupKey = 'cerrada:' + comandaId + ':' + Number(payload.notification_id || 0);
      if (!shouldProcessSocketEvent(SOCKET_EVENTS.COMANDA_CERRADA, payload, dedupKey)) return;
      if (mesaId > 0) clearMesaLista(mesaId);
      await fetchComandas({ preserveActive: true, silent: true });
    };

    const handleComandaPagada = async (payload) => {
      payload = payload || {};
      const comandaId = Number(payload.id_comanda || payload.comanda_id || payload.id || 0);
      const dedupKey = 'pagada:' + comandaId + ':' + Number(payload.notification_id || 0);
      if (!shouldProcessSocketEvent(SOCKET_EVENTS.COMANDA_PAGADA, payload, dedupKey)) return;
      if (comandaId > 0) {
        const idx = comandas.value.findIndex((c) => Number(c.id) === comandaId);
        if (idx >= 0) comandas.value[idx] = { ...comandas.value[idx], estado_comanda: 'Pagada' };
      }
      await fetchMesas();
    };

    const handleCategoriasActualizadas = async () => { await fetchProductos(); };
    const handleProductosActualizados = async () => { await fetchProductos(); };
    const handleAdminEvent = async () => { await fetchProductos(); };

    const handleSocketAnyEvent = (eventName, payload) => {
      console.log('🛰️ [Comandas] Socket evento recibido:', eventName, payload || {});
    };

    const bindSocketListeners = (candidate) => {
      const target = candidate || window.socket;
      if (!target || target === socketRef) return;
      if (socketRef) {
        socketRef.off(SOCKET_EVENTS.PLATO_LISTO, handlePlatoListo);
        socketRef.off(SOCKET_EVENTS.COMANDA_CERRADA, handleComandaCerrada);
        socketRef.off(SOCKET_EVENTS.COMANDA_PAGADA, handleComandaPagada);
        socketRef.off(SOCKET_EVENTS.CATEGORIAS_ACTUALIZADAS, handleCategoriasActualizadas);
        socketRef.off(SOCKET_EVENTS.PRODUCTOS_ACTUALIZADOS, handleProductosActualizados);
        socketRef.off(SOCKET_EVENTS.CONFIG_CAMBIO);
        socketRef.off(SOCKET_EVENTS.ALERTA_ADMIN);
        socketRef.off(SOCKET_EVENTS.NUEVO_PRODUCTO);
        socketRef.off(SOCKET_EVENTS.ESTADO_CAMBIO);
        if (typeof socketRef.offAny === 'function') {
          socketRef.offAny(handleSocketAnyEvent);
        }
      }
      socketRef = target;
      console.log('🔌 [Comandas] Suscribiendo listeners de notificaciones');
      if (typeof socketRef.onAny === 'function') {
        socketRef.onAny(handleSocketAnyEvent);
      }
      socketRef.on(SOCKET_EVENTS.PLATO_LISTO, handlePlatoListo);
      socketRef.on(SOCKET_EVENTS.COMANDA_CERRADA, handleComandaCerrada);
      socketRef.on(SOCKET_EVENTS.COMANDA_PAGADA, handleComandaPagada);
      socketRef.on(SOCKET_EVENTS.CATEGORIAS_ACTUALIZADAS, handleCategoriasActualizadas);
      socketRef.on(SOCKET_EVENTS.PRODUCTOS_ACTUALIZADOS, handleProductosActualizados);
      socketRef.on(SOCKET_EVENTS.CONFIG_CAMBIO, handleAdminEvent);
      socketRef.on(SOCKET_EVENTS.ALERTA_ADMIN, handleAdminEvent);
      socketRef.on(SOCKET_EVENTS.NUEVO_PRODUCTO, handleAdminEvent);
      socketRef.on(SOCKET_EVENTS.ESTADO_CAMBIO, handleAdminEvent);
    };

    const unbindSocketListeners = () => {
      if (!socketRef) return;
      socketRef.off(SOCKET_EVENTS.PLATO_LISTO, handlePlatoListo);
      socketRef.off(SOCKET_EVENTS.COMANDA_CERRADA, handleComandaCerrada);
      socketRef.off(SOCKET_EVENTS.COMANDA_PAGADA, handleComandaPagada);
      socketRef.off(SOCKET_EVENTS.CATEGORIAS_ACTUALIZADAS, handleCategoriasActualizadas);
      socketRef.off(SOCKET_EVENTS.PRODUCTOS_ACTUALIZADOS, handleProductosActualizados);
      socketRef.off(SOCKET_EVENTS.CONFIG_CAMBIO);
      socketRef.off(SOCKET_EVENTS.ALERTA_ADMIN);
      socketRef.off(SOCKET_EVENTS.NUEVO_PRODUCTO);
      socketRef.off(SOCKET_EVENTS.ESTADO_CAMBIO);
      if (typeof socketRef.offAny === 'function') {
        socketRef.offAny(handleSocketAnyEvent);
      }
      socketRef = null;
    };

    const isPrinterConnected = computed(() => bluetoothPrinterService.isPrinterConnected.value);
    const printerName = computed(() => bluetoothPrinterService.printerName.value);
    const isConnecting = computed(() => bluetoothPrinterService.isConnecting.value);

    const togglePrinter = async () => {
      if (isPrinterConnected.value) {
        await bluetoothPrinterService.disconnect();
      } else {
        try {
          await bluetoothPrinterService.connect();
        } catch (e) {
          window.dispatchEvent(new CustomEvent('pb:notify-ui', {
            detail: { message: 'No se pudo conectar la impresora: ' + (e.message || e), type: 'error' }
          }));
        }
      }
    };

    const handleSocketReady = () => { bindSocketListeners(window.socket); };

    onMounted(async () => {
      await refreshAll();
      bindSocketListeners(window.socket);
      window.addEventListener('pb:socket-ready', handleSocketReady);
      
      // Intentar reconectar automaticamente en segundo plano si ya habia un enlace previo aprobado
      try {
        await bluetoothPrinterService.autoconnect();
      } catch (err) {
        console.warn('Autoconnect fallido:', err);
      }
    });

    onUnmounted(() => {
      unbindSocketListeners();
      window.removeEventListener('pb:socket-ready', handleSocketReady);
    });

    return {
      mesas, mesasOcupadas, orderedMesas, loading,
      productosActivos, categoriasConProductos, aporteServicio,
      showNuevaComanda, showEditarComanda,
      mesaSeleccionada, comandaSeleccionada,
      mesaComandaActiva, mesaListaParaCaja, mesaTieneListos,
      deletingComandaIds, canSwipeDeleteMesaComanda, onDeleteMesaComanda,
      mesaCardStyle, onMesaCardClick, onMesaTouchStart, onMesaTouchMove, onMesaTouchEnd, onMesaTouchCancel,
      refreshAll, openMesaFlow, cerrarModales, cerrarEditarComanda,
      guardarNuevaComanda, onComandaActualizada, onACaja, onComandaCancelada,
      showAudioAlert, activatingAudio, desbloquearAudio,
      isPrinterConnected, printerName, isConnecting, togglePrinter
    };
  }
};
</script>

<style scoped>
.mesero-comandas-view {
  min-height: 100vh;
  padding: 4px 12px 10px;
  background: radial-gradient(circle at top, #ecfeff 0%, #f8fafc 28%, #f8fafc 100%);
}
.audio-alert-btn {
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 60;
  border: 1px solid #f59e0b;
  background: #fef3c7;
  color: #92400e;
  border-radius: 999px;
  padding: 0.45rem 0.75rem;
  font-size: 0.7rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}
.header-left-side {
  display: flex;
  flex-direction: column;
}
.bluetooth-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.8rem;
  font-size: 0.72rem;
  font-weight: 800;
  color: #64748b;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.bluetooth-indicator:hover:not(:disabled) {
  background: #e2e8f0;
  border-color: #94a3b8;
}
.bluetooth-indicator.is-connected {
  color: #0d9488;
  background: rgba(13, 148, 136, 0.1);
  border-color: rgba(13, 148, 136, 0.35);
}
.bluetooth-indicator.is-connected:hover:not(:disabled) {
  background: rgba(13, 148, 136, 0.18);
  border-color: rgba(13, 148, 136, 0.6);
}
.bluetooth-indicator.is-connecting {
  color: #d97706;
  background: rgba(217, 119, 6, 0.1);
  border-color: rgba(217, 119, 6, 0.35);
  animation: pulse 1.5s infinite;
}
@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}
.bt-text {
  font-family: 'Manrope', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.view-header h1 {
  font-size: 1.42rem;
  line-height: 1.1;
  font-weight: 900;
  color: #0f766e;
}
.view-counter {
  font-size: 0.78rem;
  font-weight: 900;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.notice {
  border: 1px solid #6ee7b7;
  background: #ecfdf5;
  color: #065f46;
  border-radius: 16px;
  padding: 10px 14px;
  margin-bottom: 8px;
  font-size: 0.86rem;
  font-weight: 800;
}
.loading-wrap { display: flex; justify-content: center; padding: 3rem 0; }
.mesas-section {
  padding-top: 0;
  margin-top: 0;
}
.spinner {
  width: 36px; height: 36px;
  border: 3px solid #e2e8f0;
  border-top-color: #0f766e;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.mesas-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
@media (min-width: 480px) { .mesas-grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 768px) { .mesas-grid { grid-template-columns: repeat(4, 1fr); } }
.mesa-card {
  position: relative;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
  padding: 10px 10px 8px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  box-shadow: 0 1px 4px rgba(15,23,42,0.06);
  min-height: 64px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-family: inherit;
}
.mesa-card:active { transform: scale(0.97); }
.mesa-card.is-occupied { border-color: #0d9488; background: #f0fdfa; }
.mesa-card.is-ready { border-color: #be123c; background: #fff1f2; }
.mesa-card.has-ready-items { border-color: #22c55e; box-shadow: 0 0 0 2px rgba(34,197,94,0.16); }
.mesa-top-row { display: flex; align-items: center; justify-content: space-between; gap: 5px; }
.mesa-nombre {
  font-size: 0.84rem; font-weight: 900; color: #0f172a;
  text-transform: uppercase; letter-spacing: 0.03em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.mesa-ocupacion-badge {
  font-size: 0.6rem; font-weight: 800; letter-spacing: 0.06em;
  text-transform: uppercase; border-radius: 999px; padding: 0.12rem 0.42rem; flex-shrink: 0;
}
.mesa-ocupacion-badge.libre { background: #f1f5f9; color: #475569; }
.mesa-ocupacion-badge.ocupada { background: #ccfbf1; color: #0f766e; }
.mesa-bottom-row { display: flex; align-items: center; justify-content: space-between; gap: 4px; }
.mesa-comanda-id { font-size: 0.76rem; font-weight: 800; color: #0f172a; border-radius: 999px; padding: 0.08rem 0.4rem; background: #f8fafc; }
.mesa-actions { display: flex; align-items: center; justify-content: flex-end; gap: 0.35rem; min-width: 0; flex: 1; }
.mesa-delete-btn {
  width: 1.7rem;
  height: 1.7rem;
  border: 1px solid #fed7d7;
  border-radius: 0.55rem;
  background: #fff1f2;
  color: #fda4af;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: not-allowed;
  flex-shrink: 0;
  transition: transform 0.15s ease, background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
.mesa-delete-btn.is-enabled {
  background: #fff1f2;
  color: #e11d48;
  border-color: #fecdd3;
  cursor: pointer;
}
.mesa-delete-btn.is-enabled:active {
  transform: scale(0.96);
}
.mesa-delete-btn:disabled {
  opacity: 0.75;
}
.mesa-delete-btn i {
  font-size: 0.7rem;
}
.mesa-estado {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.02em;
  border-radius: 999px;
  padding: 0.2rem 0.56rem;
  min-height: 1.58rem;
}
.mesa-estado.estado-proceso { background: #fef9c3; color: #92400e; }
.mesa-estado.estado-caja {
  background: #ffe4ea;
  color: #be123c;
  padding: 0.28rem 0.95rem;
  min-width: 5.2rem;
  font-size: 0.82rem;
  box-shadow: inset 0 0 0 1px rgba(190, 18, 60, 0.14);
}
.mesa-sin-comanda { font-size: 0.78rem; font-weight: 600; color: #94a3b8; }
.mesa-prod-count { font-size: 0.72rem; font-weight: 700; color: #cbd5e1; }
.mesa-ready-badge {
  position: absolute; top: 7px; right: 8px;
  background: #16a34a; color: #fff;
  font-size: 0.6rem; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase;
  border-radius: 999px; padding: 0.15rem 0.5rem;
  animation: readyPulse 1.2s ease-in-out infinite;
  z-index: 1;
}
@keyframes readyPulse {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34,197,94,0.45); }
  70% { transform: scale(1.04); box-shadow: 0 0 0 8px rgba(34,197,94,0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34,197,94,0); }
}
.btn-ghost {
  display: inline-flex; align-items: center; gap: 0.4rem;
  border: 1.5px solid #e2e8f0; background: #fff; border-radius: 10px;
  padding: 0.42rem 0.8rem; font-size: 0.72rem; font-weight: 800;
  color: #334155; cursor: pointer; font-family: inherit;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.touch-target { min-height: 40px; }
.fade-soft-enter-active, .fade-soft-leave-active { transition: opacity 0.18s ease; }
.fade-soft-enter-from, .fade-soft-leave-to { opacity: 0; }
</style>

<template>
  <div class="cash-shell flex h-full w-screen flex-col overflow-hidden px-0 ml-[calc(-50vw+50%)]">
    <button
      v-if="showAudioAlert"
      type="button"
      class="audio-alert-btn"
      :disabled="activatingAudio"
      @click="desbloquearAudio"
    >
      🔔 Haga clic aquí para activar sonidos
    </button>

    <section
      class="cash-banner shrink-0 mb-0 px-4 py-3 md:px-6 grid items-center gap-x-3 overflow-hidden"
      style="grid-template-columns: minmax(0, 1fr) minmax(0, 2.75fr) minmax(0, 1fr)"
      data-ui="CashBanner"
    >
      <!-- Izquierda: marca + contador -->
      <div class="flex items-center gap-2 min-w-0">
        <div class="flex items-center gap-2 shrink-0">
          <div class="shrink-0 flex items-center justify-center h-9 w-9 rounded-xl bg-white/15 border border-white/25">
            <i class="fas fa-cash-register text-white text-sm"></i>
          </div>
          <div class="hidden sm:block">
            <p class="text-[9px] uppercase tracking-[0.2em] font-black text-rose-200/80 leading-none">Patio Bohemio</p>
            <p class="text-xs font-black uppercase tracking-wide text-white leading-tight">Gestión de Caja</p>
          </div>
        </div>

        <span class="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-white/90 shrink-0">
          <i class="fas fa-receipt text-[9px]"></i>
          {{ comandas.length }} comanda(s)
        </span>
      </div>

      <!-- Centro: acciones -->
      <div class="cash-header-center min-w-0 overflow-hidden py-1">
        <!-- <h2 class="cash-title text-xl md:text-2xl text-white font-extrabold leading-none tracking-tight text-center whitespace-nowrap">
          Gestión de Caja
        </h2> -->

        <div class="cash-header-actions" data-ui="HeaderAccionesCaja">
          <button
            type="button"
            class="cash-hero-btn cash-hero-btn--compact"
            :class="activeTab === 'mesa' ? 'cash-hero-btn--tab-active' : 'cash-hero-btn--tab-inactive'"
            data-ui="TabSwitcher"
            @click="activeTab = 'mesa'"
          >
            <i class="fas fa-utensils"></i>
            <span>Servicio a la Mesa</span>
          </button>
          <button
            type="button"
            class="cash-hero-btn cash-hero-btn--compact"
            :class="activeTab === 'mostrador' ? 'cash-hero-btn--tab-active' : 'cash-hero-btn--tab-inactive'"
            data-ui="TabSwitcher"
            @click="activeTab = 'mostrador'"
          >
            <i class="fas fa-store"></i>
            <span>Atención Mostrador</span>
          </button>
          <button
            type="button"
            class="cash-hero-btn cash-hero-btn--compact cash-hero-btn--amber"
            @click="abrirGastoCaja"
          >
            <i class="fas fa-receipt"></i>
            <span>Registrar Gasto de Caja</span>
          </button>
          <button
            type="button"
            class="cash-hero-btn cash-hero-btn--compact cash-hero-btn--teal"
            @click="abrirRealizarArqueo"
          >
            <i class="fas fa-calculator"></i>
            <span>Realizar Arqueo de Caja</span>
          </button>
        </div>
      </div>

      <!-- Derecha: usuario + salir -->
      <div class="flex items-center justify-end gap-2">
        <div class="user-chip rounded-xl px-2.5 py-1.5 flex items-center gap-2 border border-white/20 bg-white/10 backdrop-blur-sm">
          <div class="h-8 w-8 rounded-lg overflow-hidden border border-rose-200/40 bg-slate-100 shrink-0">
            <img
              :src="getPersonalImageUrl(cashierProfile.url_foto, cashierDisplayName)"
              :alt="cashierDisplayName"
              class="h-full w-full object-cover"
              @error="handleImageError"
            >
          </div>
          <div>
            <p class="text-white font-black text-xs uppercase leading-none">{{ cashierDisplayName }}</p>
            <p class="text-[9px] font-bold uppercase tracking-wider text-rose-200/80 leading-tight mt-0.5">{{ cashierDisplayRole }}</p>
          </div>
          <button
            type="button"
            class="ml-1 inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/15 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white transition hover:bg-white/25"
            @click="logout"
          >
            <i class="fas fa-sign-out-alt text-[9px]"></i>
            <span>Salir</span>
          </button>
        </div>
      </div>
    </section>

    <!-- [SECCION] LayoutPrincipalCaja -->
    <section class="cash-content-area min-h-0 flex-1 overflow-hidden px-2 md:px-3 lg:px-2 xl:px-2 pt-4 pb-2">
      <div class="cash-layout-grid grid h-full min-h-0 grid-cols-1 gap-4 md:gap-5 xl:grid-cols-12" data-ui="LayoutPrincipalCaja">
      <!-- [SECCION] TabContentArea -->
      <div class="cash-tab-area min-h-0 overflow-hidden xl:col-span-9" data-ui="TabContentArea">
        <!-- [SECCION] TabServicioMesa -->
        <div v-show="activeTab === 'mesa'" class="cash-tab-pane h-full min-h-0" data-ui="TabServicioMesa">
          <h3 class="cash-title shrink-0 text-lg font-black uppercase tracking-wide text-slate-800 mb-4">Servicio a la Mesa</h3>

          <div class="cash-tab-body grid h-full min-h-0 grid-cols-1 gap-4 md:gap-5 xl:grid-cols-9" data-ui="GridTabMesa">
            <!-- [SECCION] ListaComandas (Columna izquierda) -->
            <aside class="cash-panel-scroll panel min-h-0 rounded-3xl p-3 md:p-4 xl:col-span-3" data-ui="ListaComandas">
        <div
          v-if="solicitudesPendientes.length"
          class="mb-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5"
        >
          <p class="text-[10px] uppercase tracking-widest font-black text-orange-700">Solicitudes de Cuenta</p>
          <div class="mt-2 space-y-1.5">
            <article
              v-for="item in solicitudesPendientes"
              :key="`sol-${item.id_comanda}`"
              class="flex items-center justify-between gap-2"
            >
              <p class="text-[11px] font-bold text-orange-900 truncate">{{ item.nombre_mesa || `Mesa ${item.id_mesa || ''}` }}</p>
              <button
                type="button"
                class="rounded-lg border border-orange-300 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wide text-orange-700"
                @click="abrirSolicitudCuenta(item)"
              >
                Abrir
              </button>
            </article>
          </div>
        </div>

        <div class="flex items-center justify-between mb-3 px-1">
          <h3 class="cash-title text-sm uppercase tracking-wide">Comandas por Cobrar</h3>
        </div>

        <div v-if="loading" class="py-10 flex justify-center">
          <div class="h-10 w-10 rounded-full border-2 border-rose-500 border-t-transparent animate-spin"></div>
        </div>

        <div v-else-if="!comandas.length" class="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 font-semibold">
          No hay comandas pendientes de cobro.
        </div>

        <div v-else class="timeline-wrap relative pl-6 md:pl-8 pr-1 md:pr-2">
          <div class="timeline-line absolute left-[9px] md:left-3 top-1 bottom-1"></div>

          <article v-for="comanda in comandas" :key="comanda.id" class="timeline-item relative mb-4">
            <span class="timeline-dot absolute -left-[20px] md:-left-[24px] top-6"></span>
            <button
              type="button"
              @click="seleccionarComanda(comanda.id)"
              class="w-full rounded-2xl border p-3 text-left transition-all"
              :class="[
                selectedComanda?.id === comanda.id ? 'bg-rose-100 border-rose-300 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50',
                isSolicitudPendiente(comanda.id) ? 'mesa-alerta-caja' : ''
              ]"
            >
              <div class="flex items-start gap-3">
                <div class="min-w-0 flex-1">
                  <p class="text-[9px] uppercase font-black tracking-widest text-rose-600">Nro {{ comanda.mesa_id }}</p>
                  <p class="text-sm font-black uppercase text-slate-800 truncate">{{ comanda.mesa_nombre || `Mesa ${comanda.mesa_numero || comanda.mesa_id}` }}</p>
                  <p class="text-[10px] font-semibold text-slate-500 mt-1">Comanda #{{ comanda.id }}</p>
                  <p class="text-[10px] font-semibold text-slate-500">{{ formatDateTime(comanda.fecha_hora) }}</p>
                </div>
                <div class="shrink-0 text-right">
                  <span class="badge border-sky-200 bg-sky-50 text-sky-700">{{ comanda.estado_comanda }}</span>
                  <p class="text-[11px] font-black text-rose-700 mt-2">{{ formatCurrency(comanda.total_final || comanda.total_sin_servicio) }}</p>
                </div>
              </div>
            </button>
          </article>
        </div>
            </aside>

            <!-- [SECCION] ContenedorPrincipalComanda (Seccion central) -->
            <main class="cash-panel-scroll panel flex min-h-0 flex-col rounded-3xl p-4 md:p-5 xl:col-span-6" data-ui="ContenedorPrincipalComanda">
        <template v-if="!selectedComanda">
          <div class="flex h-full min-h-0 flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center">
            <div>
              <i class="fas fa-cash-register text-4xl text-slate-300 mb-4"></i>
              <p class="text-sm font-bold uppercase tracking-widest text-slate-500">Selecciona una Comanda</p>
              <p class="text-xs font-semibold text-slate-400 mt-2">El resumen de pago aparecera aqui.</p>
            </div>
          </div>
        </template>

        <template v-else>
          <!-- [SECCION] GridInternoComandaSeleccionada -->
          <div class="grid h-full min-h-0 grid-cols-1 gap-4 xl:grid-cols-12 xl:grid-rows-1" style="align-items: start;" data-ui="GridInternoComandaSeleccionada">

            <!-- [SECCION] ColumnaIzquierdaComanda: EncabezadoCliente + DetalleProductos -->
            <div class="flex min-h-0 flex-col gap-4 xl:col-span-8" data-ui="DetalleComandaColumna">

              <!-- [SECCION] EncabezadoClienteComanda -->
              <header class="rounded-2xl border border-slate-200 bg-rose-50/80 p-3 md:p-4" data-ui="EncabezadoClienteComanda">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="h-14 w-14 rounded-xl overflow-hidden border border-rose-200 bg-slate-100 shrink-0">
                      <img
                        :src="getPersonalImageUrl(selectedComanda.personal_url_foto, getMeseroNombre(selectedComanda))"
                        :alt="getMeseroNombre(selectedComanda)"
                        class="h-full w-full object-cover"
                        @error="handleImageError"
                      >
                    </div>
                    <div class="min-w-0">
                      <p class="text-[10px] uppercase tracking-widest font-black text-rose-700">Mesero</p>
                      <h3 class="cash-title text-xl font-black uppercase text-slate-800 truncate">{{ getMeseroNombre(selectedComanda) }}</h3>
                      <p class="text-[11px] font-semibold text-slate-500 mt-1">{{ formatDateTime(selectedComanda.fecha_hora) }}</p>
                    </div>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="badge border-slate-200 bg-white text-slate-700">Comanda #{{ selectedComanda.id }}</span>
                    <span class="badge border-rose-200 bg-white text-rose-700">{{ selectedComanda.cliente_nombre || 'Consumidor final' }}</span>
                  </div>
                </div>
              </header>

              <!-- [SECCION] DetalleProductos -->
              <section class="cash-panel-scroll flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-4" data-ui="DetalleProductos">
                <div class="flex items-center justify-between gap-3 mb-3">
                  <p class="text-[10px] uppercase tracking-widest font-black text-slate-500">Detalle de Comanda</p>
                  <span class="badge border-slate-200 bg-slate-50 text-slate-700">{{ (selectedComanda.detalles || []).length }} item(s)</span>
                </div>

                <div v-if="!(selectedComanda.detalles || []).length" class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
                  Esta comanda no tiene productos para mostrar.
                </div>

                <div v-else class="space-y-3">
                  <article v-for="detalle in selectedComanda.detalles || []" :key="detalle.id" class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div class="flex items-start gap-3">
                      <div class="h-12 w-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                        <img
                          :src="getProductoImageUrl(detalle.producto_url_foto, detalle.producto_nombre)"
                          :alt="detalle.producto_nombre"
                          class="h-full w-full object-cover"
                          @error="handleImageError"
                        >
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="text-sm font-black uppercase text-slate-800">{{ detalle.producto_nombre }}</p>
                        <p class="text-xs text-slate-500 font-semibold mt-1 num-value">Cant. {{ detalle.cantidad }} x {{ formatCurrency(detalle.precio_unitario) }}</p>
                        <p v-if="detalle.observaciones_mesero" class="text-xs text-slate-500 mt-1">Obs: {{ detalle.observaciones_mesero }}</p>
                      </div>
                      <div class="text-right shrink-0">
                        <p class="text-[10px] uppercase font-black tracking-widest text-slate-500">Subtotal</p>
                        <p class="text-sm font-black text-rose-700">{{ formatCurrency(detalle.valor_subtotal) }}</p>
                      </div>
                    </div>
                  </article>
                </div>
              </section>
            </div>

            <!-- [SECCION] PanelAccionesPago (Subseccion derecha de la central) -->
            <aside class="shrink-0 rounded-2xl border border-slate-200 bg-white p-4 xl:col-span-4" data-ui="PanelAccionesPago">
              <!-- [ELEMENTO] LogoPanelPago -->
              <div class="flex justify-center mb-6">
                <img src="/img/logo.png" alt="Logo Patio Bohemio" class="h-14 w-auto object-contain panel-pago-logo" @error="handleImageError">
              </div>

              <!-- Totales -->
              <p class="text-[10px] uppercase tracking-widest font-black text-slate-500">Totales</p>
              <div class="mt-3 space-y-2 text-sm">
                <div class="flex items-center justify-between font-semibold text-slate-700">
                  <span>Subtotal</span>
                  <span class="num-value">{{ formatCurrency(selectedComanda.total_sin_servicio) }}</span>
                </div>
                <div class="flex items-center justify-between font-semibold text-slate-700">
                  <span>Servicio voluntario</span>
                  <span class="num-value">{{ formatCurrency(selectedComanda.servicio_voluntario) }}</span>
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-slate-200 text-base font-black text-rose-700">
                  <span>Total</span>
                  <span class="num-value">{{ formatCurrency(totalFinalPago) }}</span>
                </div>
              </div>

              <!-- Método sugerido -->
              <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p class="text-[10px] uppercase tracking-widest font-black text-slate-500">Metodo sugerido</p>
                <p class="mt-1 text-xl font-black text-slate-800">{{ selectedComanda.forma_pago || 'Efectivo' }}</p>
              </div>

              <!-- Botones -->
              <div class="mt-4 flex flex-col gap-3">
                <button type="button" class="btn-comanda-pdf btn-comanda-pay-cta w-full justify-center" @click="imprimirPrecuenta">
                  <i class="fas fa-money-bill-wave"></i>
                  <span>PRECUENTA</span>
                </button>
                <button type="button" class="btn-comanda-edit btn-comanda-pay-cta w-full justify-center" @click="abrirPago">
                  <i class="fas fa-money-bill-wave"></i>
                  <span>Pagar</span>
                </button>
              </div>
            </aside>

          </div>
        </template>

            </main>
          </div>
        </div>

        <!-- [SECCION] TabAtencionMostrador -->
        <div v-show="activeTab === 'mostrador'" class="cash-tab-pane h-full min-h-0" data-ui="TabAtencionMostrador">
          <h3 class="cash-title shrink-0 text-lg font-black uppercase tracking-wide text-slate-800 mb-4">Atención Mostrador</h3>

          <div v-if="!mostradorCatalogReady" class="flex flex-1 items-center justify-center py-10">
            <div class="h-10 w-10 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"></div>
          </div>

          <main v-else class="cash-tab-body panel flex min-h-0 flex-col rounded-3xl p-4 md:p-5" data-ui="ContenedorComandaMostrador">
            <div class="grid h-full min-h-0 grid-cols-1 gap-4 xl:grid-cols-12" style="align-items: start;">

              <!-- [SECCION] DetalleComandaMostrador -->
              <div class="flex h-full min-h-0 flex-col gap-4 overflow-hidden xl:col-span-8" data-ui="DetalleComandaMostrador">

                <!-- [SECCION] EncabezadoComandaMostrador + BuscadorProductosMostrador -->
                <header class="rounded-2xl border border-slate-200 bg-orange-50/80 p-2.5 md:p-3" data-ui="EncabezadoComandaMostrador">
                  <div class="mostrador-header-stack">
                    <div class="mostrador-header-meta">
                      <div class="mostrador-mesa-row">
                        <label class="text-[10px] uppercase tracking-widest font-black text-orange-800 shrink-0" for="mostrador-mesa-select">Mesa</label>
                        <select
                          id="mostrador-mesa-select"
                          v-model.number="mesaSeleccionadaMostrador"
                          class="mostrador-mesa-select mostrador-mesa-select--header"
                          :disabled="savingMostrador || Boolean(comandaIdMostradorGuardada)"
                        >
                          <option v-for="mesa in mesasMostrador" :key="mesa.id" :value="Number(mesa.id)">
                            {{ mesa.nombre }}
                          </option>
                        </select>
                      </div>
                      <span class="badge border-orange-200 bg-white text-orange-700 uppercase shrink-0">{{ comandaMostrador.cliente_nombre || 'Consumidor final' }}</span>
                      <span class="badge border-slate-200 bg-white text-slate-700 uppercase shrink-0">{{ comandaMostrador.id ? `Comanda #${comandaMostrador.id}` : 'Comanda Mostrador' }}</span>
                      <p v-if="comandaMostrador.fecha_hora" class="mostrador-header-fecha text-[11px] font-semibold text-slate-500 shrink-0">{{ formatDateTime(comandaMostrador.fecha_hora) }}</p>
                    </div>

                    <div class="mostrador-search-wrap" data-ui="BuscadorProductosMostrador">
                      <i class="fas fa-search mostrador-search-icon"></i>
                      <input
                        ref="mostradorSearchInputRef"
                        v-model="busquedaMostrador"
                        type="text"
                        class="mostrador-search-input"
                        placeholder="Buscar producto o categoría…"
                        autocomplete="off"
                      >
                      <button v-if="busquedaMostrador" type="button" class="mostrador-clear-btn" @click="busquedaMostrador = ''">
                        <i class="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                </header>

                <!-- [SECCION] DetalleProductosMostrador -->
                <section class="rounded-2xl border border-slate-200 bg-white p-4 flex-1 flex flex-col min-h-0" data-ui="DetalleProductosMostrador">
                  <div class="flex items-center justify-between gap-3 mb-3">
                    <p class="text-[10px] uppercase tracking-widest font-black text-slate-500">Detalle de Comanda</p>
                    <span class="badge border-slate-200 bg-slate-50 text-slate-700">{{ productosSeleccionadosMostrador.length }} item(s)</span>
                  </div>

                  <div class="mostrador-detalle-body flex-1 min-h-0 overflow-y-auto">
                    <template v-if="busquedaMostrador.trim()">
                      <p v-if="!productosFiltradosMostrador.length" class="mostrador-empty-msg">
                        Sin resultados para "{{ busquedaMostrador }}"
                      </p>
                      <article
                        v-for="p in productosFiltradosMostrador"
                        :key="`busq-${p.id}`"
                        class="mostrador-producto-card"
                      >
                        <img
                          class="mostrador-producto-img"
                          :src="getProductoImageUrl(p.url_foto, p.nombre)"
                          :alt="p.nombre"
                          @error="handleImageError"
                        >
                        <div class="mostrador-producto-info">
                          <strong class="mostrador-producto-nombre">{{ p.nombre }}</strong>
                          <span class="mostrador-producto-precio">{{ formatCurrency(p.precio_unitario || 0) }}</span>
                        </div>
                        <div class="mostrador-stepper">
                          <button type="button" class="mostrador-stepper-btn" @click="decrementarMostrador(p)">
                            <i class="fas fa-minus"></i>
                          </button>
                          <strong class="mostrador-stepper-qty">{{ getCantidadMostrador(p.id) }}</strong>
                          <button type="button" class="mostrador-stepper-btn" @click="incrementarMostrador(p)">
                            <i class="fas fa-plus"></i>
                          </button>
                        </div>
                      </article>
                    </template>

                    <p class="mostrador-section-label">Productos en la comanda</p>
                    <div v-if="!productosSeleccionadosMostrador.length" class="mostrador-empty-msg">
                      Busca productos y agrégalos con el botón +.
                    </div>
                    <article
                      v-for="entry in productosSeleccionadosMostrador"
                      :key="`sel-${entry.producto_id}`"
                      class="mostrador-selected-card"
                    >
                      <img
                        class="mostrador-producto-img"
                        :src="getProductoImageUrl(entry.producto.url_foto, entry.producto.nombre)"
                        :alt="entry.producto.nombre"
                        @error="handleImageError"
                      >
                      <div class="mostrador-selected-grid">
                        <div class="mostrador-producto-copy mostrador-producto-copy--truncate">
                          <strong class="mostrador-producto-nombre">{{ entry.producto.nombre }}</strong>
                          <span class="mostrador-producto-precio">{{ entry.item.cantidad }} × {{ formatCurrency(entry.item.precio_unitario || 0) }}</span>
                        </div>
                        <div class="mostrador-stepper mostrador-stepper--grid">
                          <button type="button" class="mostrador-stepper-btn" @click="decrementarMostrador(entry.producto)">
                            <i class="fas fa-minus"></i>
                          </button>
                          <strong class="mostrador-stepper-qty">{{ getCantidadMostrador(entry.producto_id) }}</strong>
                          <button type="button" class="mostrador-stepper-btn" @click="incrementarMostrador(entry.producto)">
                            <i class="fas fa-plus"></i>
                          </button>
                        </div>
                        <div class="mostrador-obs-wrap">
                          <label class="mostrador-obs-label">Observaciones</label>
                          <textarea
                            v-model="entry.item.observaciones_mesero"
                            class="mostrador-obs-input"
                            rows="1"
                            maxlength="255"
                            placeholder="Ej: sin azucar, leche deslactosada"
                          ></textarea>
                        </div>
                      </div>
                    </article>
                  </div>

                  <div class="mostrador-footer pt-4 mt-3 border-t border-slate-200">
                    <button
                      type="button"
                      class="mostrador-footer-btn"
                      :disabled="savingMostrador || !puedeGuardarMostrador"
                      @click="onGuardarMostrador"
                    >
                      <i v-if="savingMostrador" class="fas fa-circle-notch fa-spin"></i>
                      <i v-else class="fas fa-check"></i>
                      <span>{{ saveButtonLabelMostrador }}</span>
                    </button>
                  </div>
                </section>
              </div>

                <!-- [SECCION] PanelAccionesPagoMostrador -->
                <aside class="shrink-0 rounded-2xl border border-slate-200 bg-white p-4 xl:col-span-4" data-ui="PanelAccionesPagoMostrador">
                  <div class="flex justify-center mb-6">
                    <img src="/img/logo.png" alt="Logo Patio Bohemio" class="h-14 w-auto object-contain panel-pago-logo" @error="handleImageError">
                  </div>

                  <p class="text-[10px] uppercase tracking-widest font-black text-slate-500">Totales</p>
                  <div class="mt-3 space-y-2 text-sm">
                    <div class="flex items-center justify-between font-semibold text-slate-700">
                      <span>Subtotal</span>
                      <span class="num-value">{{ formatCurrency(comandaMostrador.total_sin_servicio) }}</span>
                    </div>
                    <div class="flex items-center justify-between font-semibold text-slate-700">
                      <span>Servicio voluntario</span>
                      <span class="num-value">{{ formatCurrency(comandaMostrador.servicio_voluntario) }}</span>
                    </div>
                    <div class="flex items-center justify-between pt-2 border-t border-slate-200 text-base font-black text-orange-700">
                      <span>Total</span>
                      <span class="num-value">{{ formatCurrency(totalFinalPagoMostrador) }}</span>
                    </div>
                  </div>

                  <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p class="text-[10px] uppercase tracking-widest font-black text-slate-500">Metodo sugerido</p>
                    <p class="mt-1 text-xl font-black text-slate-800">{{ comandaMostrador.forma_pago || 'Efectivo' }}</p>
                  </div>

                  <div class="mt-4 flex flex-col gap-3">
                    <button type="button" class="btn-comanda-pdf btn-comanda-pay-cta w-full justify-center" @click="imprimirPrecuenta">
                      <i class="fas fa-money-bill-wave"></i>
                      <span>PRECUENTA</span>
                    </button>
                    <button type="button" class="btn-comanda-edit btn-comanda-pay-cta w-full justify-center" @click="abrirPago">
                      <i class="fas fa-money-bill-wave"></i>
                      <span>Pagar</span>
                    </button>
                  </div>
                </aside>

            </div>
          </main>
        </div>
      </div>

      <!-- [SECCION] HistorialOperacion (Columna derecha independiente / Flujo de Caja Real) -->
      <aside class="cash-panel-scroll cash-historial-panel panel min-h-0 rounded-3xl p-4 md:p-5 xl:col-span-3" data-ui="HistorialOperacion">
        <div class="flex flex-col gap-3 mb-3">
          <div>
            <p class="text-[10px] uppercase tracking-widest font-black text-slate-500">Operacion diaria</p>
            <h4 class="cash-title text-lg font-black text-slate-800">Flujo de Caja Real</h4>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
            <div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-right">
              <p class="text-[10px] uppercase tracking-widest font-black text-emerald-700">Saldo Disponible en Caja</p>
              <p class="text-sm font-black num-value" :class="totalFlujoHoy >= 0 ? 'text-emerald-900' : 'text-rose-700'">
                {{ totalFlujoHoy >= 0 ? '+' : '-' }}{{ formatCurrency(Math.abs(totalFlujoHoy)) }}
              </p>
            </div>
            <div class="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-right">
              <p class="text-[10px] uppercase tracking-widest font-black text-amber-700">Salidas de Efectivo</p>
              <p class="text-sm font-black text-amber-900 num-value">{{ formatCurrency(totalEgresosHoy) }}</p>
            </div>
          </div>
          <button
            type="button"
            class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-700 transition hover:bg-slate-50"
            :disabled="loadingMovimientos"
            @click="cargarMovimientosHoy()"
          >
            {{ loadingMovimientos ? 'Cargando...' : 'Actualizar' }}
          </button>
        </div>

        <div v-if="loadingMovimientos" class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500 text-center">
          Cargando movimientos de caja...
        </div>

        <div v-else-if="!movimientosHoy.length" class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500 text-center">
          Aun no hay movimientos contables registrados hoy.
        </div>

        <div v-else class="space-y-2.5">
          <article
            v-for="movimiento in movimientosHoy"
            :key="movimiento.movimiento_id"
            class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"
          >
            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span
                    class="badge"
                    :class="movimientoEsDebito(movimiento)
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-rose-200 bg-rose-50 text-rose-700'"
                  >{{ movimiento.tipo_movimiento }}</span>
                  <span class="text-[10px] font-bold uppercase tracking-widest text-slate-500">{{ formatDateTime(movimiento.fecha) }}</span>
                </div>
                <p class="mt-2 text-sm font-bold text-slate-800 break-words">{{ movimiento.concepto || movimiento.detalle }}</p>
                <p class="text-[11px] font-semibold text-slate-500 mt-1">Responsable: {{ movimiento.usuario || movimiento.responsable_nombre || movimiento.ejecutado_by || 'Sistema' }}</p>
                <p class="text-[11px] font-semibold text-slate-400 mt-1">Ref: {{ movimiento.referencia_tabla || 'N/A' }} #{{ movimiento.referencia_id || 0 }}</p>
              </div>
              <div class="shrink-0 text-right">
                <p class="text-[10px] uppercase tracking-widest font-black text-slate-500">Monto</p>
                <p
                  class="text-sm font-black num-value"
                  :class="movimientoEsDebito(movimiento) ? 'text-emerald-700' : 'text-rose-700'"
                >{{ movimientoEsDebito(movimiento) ? '+' : '-' }}{{ formatCurrency(movimiento.monto) }}</p>
              </div>
            </div>
          </article>
        </div>
      </aside>
      </div>
    </section>

    <div v-if="showGastoModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn p-3 md:p-4">
      <div class="w-full max-w-xl rounded-[2rem] border border-white/30 bg-white shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between gap-3 bg-amber-500 px-4 py-4 text-slate-950">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-amber-950/80">Paso 1 · Operacion Diaria</p>
            <h3 class="cash-title text-lg font-black">Registrar Gasto de Caja</h3>
          </div>
          <button
            type="button"
            class="rounded-lg border border-amber-800/20 bg-white/70 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-amber-950 transition hover:bg-white"
            @click="cerrarGastoCaja"
          >
            Cerrar
          </button>
        </div>

        <div class="p-4 md:p-5 space-y-4">
          <div>
            <label class="label-mini block mb-2">Monto</label>
            <input
              v-model="gastoForm.monto"
              type="number"
              min="0"
              step="1"
              class="form-input"
              placeholder="0"
            >
          </div>

          <div>
            <label class="label-mini block mb-2">Concepto / Categoria</label>
            <select v-model="gastoForm.categoria" class="form-input">
              <option v-for="option in gastoCajaOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>

          <div>
            <label class="label-mini block mb-2">Descripcion / Detalle</label>
            <textarea
              v-model="gastoForm.descripcion"
              rows="3"
              class="form-input resize-none"
              placeholder="Ej. compra urgente de insumos para cocina"
            ></textarea>
          </div>

          <div>
            <label class="label-mini block mb-2">Nro. Factura o Recibo</label>
            <input
              v-model="gastoForm.numero_soporte"
              type="text"
              class="form-input"
              placeholder="Opcional"
            >
          </div>

          <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div class="flex items-center justify-between gap-3">
              <p class="text-[10px] uppercase tracking-widest font-black text-slate-500">Salida inmediata de caja</p>
              <p class="text-base font-black text-amber-700 num-value">{{ formatCurrency(parseLocaleNumber(gastoForm.monto)) }}</p>
            </div>
            <p class="text-xs font-semibold text-slate-500 mt-2">Este registro acredita caja punto de venta `110505` y queda disponible para el arqueo del dia.</p>
          </div>

          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wide text-slate-700 transition hover:bg-slate-50"
              :disabled="savingGasto"
              @click="cerrarGastoCaja"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="savingGasto"
              @click="registrarGastoCaja"
            >
              {{ savingGasto ? 'Guardando...' : 'Guardar Gasto' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showPagoModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn p-3 md:p-4">
      <div class="pago-modal bg-white rounded-[2.4rem] shadow-2xl w-full max-w-6xl border border-white/20 max-h-[calc(100vh-1.5rem)] md:max-h-[calc(100vh-2rem)] xl:max-h-[calc(100vh-2.5rem)] overflow-y-auto">
        <div class="bg-rose-700 p-4 md:p-5 text-white flex justify-between items-center sticky top-0 z-20">
          <div>
            <h3 class="text-sm font-black uppercase tracking-[0.2em] italic">Registrar Pago</h3>
            <p class="text-[11px] font-semibold text-rose-100 mt-1">Mesa {{ comandaEnCobro?.mesa_id }} · {{ comandaEnCobro?.cliente_nombre || 'Consumidor final' }}</p>
          </div>
          <button @click="cerrarPago" class="btn-icon-text text-rose-100 hover:text-white hover:bg-rose-600 rounded-lg px-2 py-1 transition-colors text-[10px] font-black uppercase tracking-wide">
            <i class="fas fa-times"></i>
            <span>Cerrar</span>
          </button>
        </div>

        <div class="p-3 md:p-4 pb-5 grid grid-cols-1 xl:grid-cols-12 gap-3">
          <section class="xl:col-span-5 space-y-3 pr-0 xl:pr-1">
            <article class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p class="label-mini">Mesa</p>
                  <p class="value-strong">{{ comandaEnCobro?.mesa_id }} - {{ comandaEnCobro?.mesa_nombre }}</p>
                </div>
                <div>
                  <p class="label-mini">Comanda</p>
                  <p class="value-strong">#{{ comandaEnCobro?.id }}</p>
                </div>
                <div>
                  <p class="label-mini">Cliente</p>
                  <p class="value-strong">{{ comandaEnCobro?.cliente_nombre || 'Consumidor final' }}</p>
                </div>
                <div>
                  <p class="label-mini">Fecha</p>
                  <p class="value-strong">{{ formatDateTime(comandaEnCobro?.fecha_hora) }}</p>
                </div>
              </div>
            </article>

            <article class="rounded-2xl border border-slate-200 bg-white p-3 space-y-3">
              <div>
                <label class="label-mini block mb-2">Subtotal</label>
                <div class="summary-box num-value">{{ formatCurrency(comandaEnCobro?.total_sin_servicio || 0) }}</div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="label-mini block mb-2">Aporte Voluntario</label>
                  <div class="form-input suffix-input-wrap montserrat-field" :class="focusedKeypadField === 'aporte_porcentaje' ? 'field-active' : ''" aria-label="APORTE VOLUNTARIO" @click="setKeypadFocus('aporte_porcentaje')">
                    <input
                      id="input-aporte-pct"
                      :value="aporteServicioPorcentaje"
                      type="text"
                      class="suffix-input text-right"
                      readonly
                    >
                    <span class="suffix-token">%</span>
                  </div>
                </div>
                <div>
                  <label class="label-mini block mb-2">Servicio Voluntario</label>
                  <input
                    id="input-servicio-pesos"
                    :value="formatCurrency(servicioVoluntarioEditable)"
                    type="text"
                    class="form-input text-right montserrat-field"
                    :class="focusedKeypadField === 'servicio_pesos' ? 'field-active' : ''"
                    readonly
                    @click="setKeypadFocus('servicio_pesos')"
                  >
                </div>
              </div>
              <div>
                <label class="label-mini block mb-2">Total Final</label>
                <div class="summary-box summary-box-strong num-value">{{ formatCurrency(totalFinalPago) }}</div>
              </div>
              <div>
                <label class="label-mini block mb-2">Metodo de Pago</label>
                <select v-model="payment.metodo_pago" class="form-input" @change="onMetodoPagoChange">
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Mixto">Mixto</option>
                </select>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="label-mini block mb-2">Efectivo Recibido</label>
                  <button
                    type="button"
                    class="amount-display"
                    :class="[focusedKeypadField === 'monto_efectivo' ? 'amount-display-active' : '', !montoEfectivoHabilitado ? 'amount-display-disabled' : '']"
                    :disabled="!montoEfectivoHabilitado"
                    @click="montoEfectivoHabilitado && setKeypadFocus('monto_efectivo')"
                    @focus="montoEfectivoHabilitado && setKeypadFocus('monto_efectivo')"
                  >
                    {{ formatCurrency(payment.monto_efectivo) }}
                  </button>
                </div>
                <div>
                  <label class="label-mini block mb-2">Transferencia Recibida</label>
                  <button
                    type="button"
                    class="amount-display"
                    :class="[focusedKeypadField === 'monto_transferencia' ? 'amount-display-active' : '', !montoTransferenciaHabilitado ? 'amount-display-disabled' : '']"
                    :disabled="!montoTransferenciaHabilitado"
                    @click="montoTransferenciaHabilitado && setKeypadFocus('monto_transferencia')"
                    @focus="montoTransferenciaHabilitado && setKeypadFocus('monto_transferencia')"
                  >
                    {{ formatCurrency(payment.monto_transferencia) }}
                  </button>
                </div>
              </div>
              <div>
                <label class="label-mini block mb-2">Total Recibido</label>
                <div class="summary-box num-value">{{ formatCurrency(totalRecibido) }}</div>
              </div>
            </article>
          </section>

          <section class="xl:col-span-7 space-y-3 pl-0 xl:pl-1">
            <article class="rounded-2xl border border-slate-200 bg-white p-3">
              <p class="text-[10px] uppercase tracking-widest font-black text-slate-500 mb-3">Teclado de Caja</p>
              <div class="grid grid-cols-3 gap-2.5">
                <button v-for="key in keypadKeys" :key="key" type="button" class="keypad-btn" @click="pressKey(key)">{{ key }}</button>
              </div>
            </article>

            <article class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p class="text-[10px] uppercase tracking-widest font-black text-slate-500 mb-3">Notas</p>
              <textarea v-model="payment.notas" rows="3" class="form-input resize-none" placeholder="Observaciones del pago"></textarea>
            </article>

            
            <article class="rounded-2xl border border-slate-200 bg-white p-3 space-y-3">
              <div class="rounded-2xl p-3 border" :class="devueltaPago < 0 ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-[11px] uppercase tracking-widest font-black">Devuelta</p>
                  <p class="text-2xl font-black num-value">{{ formatCurrency(totalRecibido >= totalFinalPago ? totalRecibido - totalFinalPago : 0) }}</p>
                </div>
                <p v-if="Math.round(totalRecibido) < Math.round(totalFinalPago)" class="text-xs font-semibold text-slate-500 mt-2"> No se puede registrar el pago, el dinero recibido por el cliente no es suficiente. </p>
              </div>

              <div class="text-center">
              
              <button
                type="button"
                class="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-wide px-7 py-2.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="savingPago || (Math.round(totalRecibido) < Math.round(totalFinalPago))"
                @click="registrarPago"
              >
                <i :class="savingPago ? 'fas fa-circle-notch fa-spin' : 'fas fa-cash-register'"></i>
                <span>{{ savingPago ? 'Registrando...' : 'Registrar Pago' }}</span>
              </button>

              <p v-if="!puedeRegistrarPago" class="text-xs font-semibold text-slate-500 mt-2">No se puede registrar el pago, el dinero recibido por el cliente no es suficiente.</p>
            </div>
            </article>

          </section>
        </div>
      </div>
    </div>

    <!-- Modal para realizar Arqueo de Caja -->
    <CrearArqueo
      v-if="showArqueoModal"
      :open="showArqueoModal"
      fecha=""
      :persona-id="currentUser?.id"
      @close="cerrarRealizarArqueo"
      @created="onArqueoCreated"
    />
  </div>
</template>

<script>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores';
import { API_BASE_URL as API_BASE, buildApiUrl } from '../../config/api.js';
import { businessInfo } from '../../config/businessInfo.js';
import { buildPrecuentaHtml, buildTicketHtml } from '../../utils/ticketTemplates.js';
import { cajaService } from '../../services/cajaService.js';
import { agruparDetallesPorProducto, comandasService } from '../../services/comandasService.js';
import { openCashDrawerBridge } from '../../services/cashDrawerBridge.js';
import { createSocketDeduper } from '../../utils/socketEventDedup.js';
import { SOCKET_EVENTS } from '../../constants/socketEvents.js';
import Swal from 'sweetalert2';
import CrearArqueo from '../CrearArqueo.vue';

const UPLOADS_BASE = (process.env.VUE_APP_UPLOADS_BASE_URL || API_BASE.replace(/\/api\/?$/, '')).replace(/\/$/, '');
const COMPANY_LOGO_URL = '/img/logo.png';
const keypadKeys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '00', '0', '←'];
const gastoCajaOptions = [
  { value: 'Insumos', label: 'Insumos (Alimentos/Bebidas)' },
  { value: 'Empaques', label: 'Empaques' },
  { value: 'Servicios', label: 'Servicios' },
  { value: 'Otros', label: 'Otros' }
];

export default {
  name: 'GestionCaja',
  components: {
    CrearArqueo
  },
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    const currentUser = computed(() => authStore.user || null);
    const cashierProfile = ref({
      nombres: authStore.user?.nombres || authStore.user?.nombre || '',
      apellidos: authStore.user?.apellidos || '',
      rol: authStore.user?.rol || '',
      url_foto: authStore.user?.url_foto || null
    });

    const loading = ref(false);
    const shouldProcessSocketEvent = createSocketDeduper(2200);
    const comandas = ref([]);
    const selectedComanda = ref(null);

    const showPagoModal = ref(false);
    const showGastoModal = ref(false);
    const showArqueoModal = ref(false);
    const savingPago = ref(false);
    const savingGasto = ref(false);
    const loadingMovimientos = ref(false);
    const activeField = ref('monto_efectivo');
    const focusedKeypadField = ref('monto_efectivo');
    const lastTicket = ref(null);
    const logoDataUrl = ref(null);
    const solicitudesPendientes = ref([]);
    const servicioVoluntarioOverride = ref(null); // null = usar calculado automatico
    const movimientosHoy = ref([]);
    const totalEgresosHoy = ref(0);
    const totalFlujoHoy = ref(0);
    const showAudioAlert = ref(false);
    const activatingAudio = ref(false);
    const activeTab = ref('mesa');
    const pagoOrigen = ref('mesa');
    const mesasMostrador = ref([]);
    const productosActivosMostrador = ref([]);
    const categoriasMostrador = ref([]);
    const aporteServicioMostrador = ref({ valor_parametro: 0, tipo_dato: 'porcentaje' });
    const mostradorCatalogReady = ref(false);
    const loadingMostradorCatalog = ref(false);
    const comandaMostrador = ref({
      id: null,
      fecha_hora: null,
      cliente_nombre: 'Consumidor Final',
      mesa_id: 1,
      mesa_nombre: null,
      detalles: [],
      total_sin_servicio: 0,
      servicio_voluntario: 0,
      total_final: 0,
      forma_pago: 'Efectivo',
      estado_comanda: null
    });

    const busquedaMostrador = ref('');
    const productosTempMostrador = ref({});
    const savingMostrador = ref(false);
    const comandaIdMostradorGuardada = ref(0);
    const guardadoExitosoMostrador = ref(false);
    const mostradorSearchInputRef = ref(null);
    const mesaSeleccionadaMostrador = ref(1);

    const syncMesaDefaultMostrador = (mesas = []) => {
      const list = Array.isArray(mesas) ? mesas : [];
      if (!list.length) return;
      const mesaUno = list.find((mesa) => Number(mesa.id) === 1);
      mesaSeleccionadaMostrador.value = Number((mesaUno || list[0]).id);
    };

    watch(mesasMostrador, (mesas) => {
      if (!comandaIdMostradorGuardada.value) syncMesaDefaultMostrador(mesas);
    });

    const catNombreMapMostrador = computed(() => {
      const map = {};
      (categoriasMostrador.value || []).forEach((c) => {
        map[c.id] = String(c.nombre || '').toLowerCase();
      });
      return map;
    });

    const productosFiltradosMostrador = computed(() => {
      const q = busquedaMostrador.value.trim().toLowerCase();
      if (!q) return [];
      return (productosActivosMostrador.value || []).filter((p) => {
        const byNombre = String(p.nombre || '').toLowerCase().includes(q);
        const byCat = catNombreMapMostrador.value[p.categoria_id]?.includes(q) || false;
        return byNombre || byCat;
      });
    });

    const productosByIdMostrador = computed(() => {
      const map = {};
      (productosActivosMostrador.value || []).forEach((p) => {
        map[Number(p.id)] = p;
      });
      return map;
    });

    const productosSeleccionadosMostrador = computed(() =>
      Object.entries(productosTempMostrador.value)
        .map(([productoId, item]) => ({
          producto_id: Number(productoId),
          item,
          producto: productosByIdMostrador.value[Number(productoId)] || {
            id: Number(productoId),
            nombre: item.nombre || 'Producto',
            url_foto: null
          }
        }))
        .sort((a, b) => String(a.producto.nombre || '').localeCompare(String(b.producto.nombre || ''), 'es', { sensitivity: 'base' }))
    );

    const hayProductosMostrador = computed(() => productosSeleccionadosMostrador.value.length > 0);

    const puedeGuardarMostrador = computed(() => {
      if (!mesaSeleccionadaMostrador.value) return false;
      if (hayProductosMostrador.value) return true;
      return Boolean(comandaIdMostradorGuardada.value);
    });

    const saveButtonLabelMostrador = computed(() => {
      if (savingMostrador.value) return 'GUARDANDO...';
      return guardadoExitosoMostrador.value ? 'ACTUALIZAR COMANDA' : 'CREAR COMANDA Y GUARDAR';
    });

    const getCantidadMostrador = (productoId) => Number(productosTempMostrador.value[productoId]?.cantidad || 0);

    const incrementarMostrador = (producto) => {
      const cur = getCantidadMostrador(producto.id);
      productosTempMostrador.value = {
        ...productosTempMostrador.value,
        [producto.id]: {
          cantidad: cur + 1,
          precio_unitario: Number(producto.precio_unitario || 0),
          nombre: producto.nombre,
          detalle_id: Number(productosTempMostrador.value[producto.id]?.detalle_id || 0) || null,
          observaciones_mesero: cur > 0
            ? String(productosTempMostrador.value[producto.id]?.observaciones_mesero || '')
            : ''
        }
      };
    };

    const decrementarMostrador = (producto) => {
      const cur = getCantidadMostrador(producto.id);
      if (cur <= 0) return;
      if (cur === 1) {
        const clone = { ...productosTempMostrador.value };
        delete clone[producto.id];
        productosTempMostrador.value = clone;
        return;
      }
      productosTempMostrador.value = {
        ...productosTempMostrador.value,
        [producto.id]: {
          cantidad: cur - 1,
          precio_unitario: Number(producto.precio_unitario || 0),
          nombre: producto.nombre,
          detalle_id: Number(productosTempMostrador.value[producto.id]?.detalle_id || 0) || null,
          observaciones_mesero: String(productosTempMostrador.value[producto.id]?.observaciones_mesero || '')
        }
      };
    };

    const onGuardarMostrador = async () => {
      if (savingMostrador.value || !puedeGuardarMostrador.value) return;

      savingMostrador.value = true;
      try {
        const items = Object.entries(productosTempMostrador.value)
          .map(([productoId, item]) => ({
            detalle_id: Number(item.detalle_id || 0) || null,
            producto_id: Number(productoId),
            cantidad: Number(item.cantidad || 0),
            observaciones_mesero: String(item.observaciones_mesero || '').trim() || null
          }))
          .filter((i) => i.cantidad > 0);

        const detalleIdsEnBorrador = new Set(
          items.map((i) => Number(i.detalle_id || 0)).filter(Boolean)
        );
        const detallesEliminar = (comandaMostrador.value.detalles || [])
          .map((d) => Number(d.id))
          .filter((id) => id > 0 && !detalleIdsEnBorrador.has(id));

        const persistResult = await guardarComandaMostrador({
          comanda_id: Number(comandaIdMostradorGuardada.value || 0) || null,
          mesa_id: Number(mesaSeleccionadaMostrador.value || 0),
          estado_comanda: 'En Proceso',
          prioridad: 'Media',
          detalles: items,
          detallesEliminar
        });

        const persistedComandaId = Number(persistResult?.comanda_id || 0);
        if (persistedComandaId) {
          comandaIdMostradorGuardada.value = persistedComandaId;
        }

        const persistedDetalles = Array.isArray(persistResult?.detallesPersistidos)
          ? persistResult.detallesPersistidos
          : [];

        if (persistedDetalles.length) {
          const clone = { ...productosTempMostrador.value };
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
          productosTempMostrador.value = clone;
        }

        guardadoExitosoMostrador.value = true;

        if (persistedComandaId) {
          await onComandaMostradorGuardada(persistedComandaId);
        }
      } catch (_error) {
        // guardarComandaMostrador ya notifica errores
      } finally {
        savingMostrador.value = false;
      }
    };

    const resetComandaMostrador = () => {
      comandaMostrador.value = {
        id: null,
        fecha_hora: null,
        cliente_nombre: 'Consumidor Final',
        mesa_id: 1,
        mesa_nombre: null,
        detalles: [],
        total_sin_servicio: 0,
        servicio_voluntario: 0,
        total_final: 0,
        forma_pago: 'Efectivo',
        estado_comanda: null
      };
      busquedaMostrador.value = '';
      productosTempMostrador.value = {};
      comandaIdMostradorGuardada.value = 0;
      guardadoExitosoMostrador.value = false;
      syncMesaDefaultMostrador(mesasMostrador.value);
    };

    const comandaActivaTab = computed(() => (
      activeTab.value === 'mostrador' ? comandaMostrador.value : selectedComanda.value
    ));

    const comandaEnCobro = computed(() => (
      pagoOrigen.value === 'mostrador' ? comandaMostrador.value : selectedComanda.value
    ));

    const gastoForm = ref({
      monto: '',
      categoria: gastoCajaOptions[0].value,
      descripcion: '',
      numero_soporte: ''
    });

    const payment = ref({
      metodo_pago: 'Efectivo',
      monto_efectivo: 0,
      monto_transferencia: 0,
      notas: ''
    });

    const cashierDisplayName = computed(() => {
      const fullName = [cashierProfile.value.nombres, cashierProfile.value.apellidos].filter(Boolean).join(' ').trim();
      return fullName || currentUser.value?.nombre || currentUser.value?.username || 'Usuario';
    });

    const cashierDisplayRole = computed(() => cashierProfile.value.rol || currentUser.value?.rol || 'Sin rol');

    const getFallbackAvatar = (name = 'Usuario') => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ffe4e6&color=9f1239`;

    const getPersonalImageUrl = (filename, name = 'Usuario') => {
      if (!filename) return getFallbackAvatar(name);
      if (/^https?:\/\//i.test(filename)) return filename;
      if (filename.startsWith('/uploads/')) return `${UPLOADS_BASE}${filename}`;
      return `${UPLOADS_BASE}/uploads/personal/${filename}`;
    };

    const getProductoImageUrl = (filename, name = 'Producto') => {
      if (!filename) return getFallbackAvatar(name);
      if (/^https?:\/\//i.test(filename)) return filename;
      if (filename.startsWith('/uploads/')) return `${UPLOADS_BASE}${filename}`;
      return `${UPLOADS_BASE}/uploads/productos/${filename}`;
    };

    const handleImageError = (event) => {
      event.target.src = getFallbackAvatar('PB');
    };

    const fetchCashierProfile = async () => {
      const userId = currentUser.value?.id;
      if (!userId) return;
      try {
        const response = await fetch(buildApiUrl(`/personal/${userId}`), {
          headers: {
            Authorization: `Bearer ${authStore.token}`
          }
        });
        const result = await response.json().catch(() => ({}));
        if (result?.success && result?.data) {
          cashierProfile.value = {
            nombres: result.data.nombres || currentUser.value?.nombres || currentUser.value?.nombre || '',
            apellidos: result.data.apellidos || currentUser.value?.apellidos || '',
            rol: result.data.rol || currentUser.value?.rol || '',
            url_foto: result.data.url_foto || currentUser.value?.url_foto || null
          };
        }
      } catch (error) {
        console.warn('No se pudo cargar el perfil del cajero:', error);
      }
    };

    const roundMoney = (value) => Number((Number(value) || 0).toFixed(0));
    const formatCurrency = (value) => Number(roundMoney(value)).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    const parseLocaleNumber = (value) => {
      if (value === null || value === undefined || value === '') return 0;
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      const raw = String(value).trim();
      let normalized = raw;
      if (raw.includes(',') && raw.includes('.')) {
        normalized = raw.replace(/\./g, '').replace(',', '.');
      } else if (raw.includes(',')) {
        normalized = raw.replace(',', '.');
      }
      const n = Number(normalized);
      return Number.isFinite(n) ? n : 0;
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
        const audio = new Audio('/sounds/cash_register.mp3');
        audio.volume = 0;
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
        showAudioAlert.value = false;
      } catch (error) {
        showAudioAlert.value = true;
        console.warn('🔇 [Caja] No fue posible desbloquear audio:', error?.message || error);
      } finally {
        activatingAudio.value = false;
      }
    };

    const formatDateTime = (value) => {
      if (!value) return 'Sin fecha';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return 'Sin fecha';
      return date.toLocaleString('es-CO', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      });
    };

    const movimientoEsDebito = (movimiento) => String(movimiento?.tipo_movimiento || '').toUpperCase() === 'DEBITO';

    const getMeseroNombre = (comanda) => [comanda?.personal_nombres, comanda?.personal_apellidos].filter(Boolean).join(' ').trim() || 'Mesero';

    const aporteServicioPorcentaje = ref(0); // editable via teclado

    const resolveComandaPago = () => (
      showPagoModal.value ? comandaEnCobro.value : selectedComanda.value
    );

    const servicioVoluntarioCalculado = computed(() => {
      const subtotal = Number(resolveComandaPago()?.total_sin_servicio) || 0;
      return roundMoney(subtotal * (aporteServicioPorcentaje.value / 100));
    });

    // Valor editable en pesos del servicio voluntario
    const servicioVoluntarioEditable = computed(() => {
      if (servicioVoluntarioOverride.value !== null) {
        const valor = Number(servicioVoluntarioOverride.value);
        return isNaN(valor) ? 0 : valor;
      }
      return servicioVoluntarioCalculado.value;
    });

    const totalFinalPago = computed(() => {
      const comanda = showPagoModal.value ? comandaEnCobro.value : selectedComanda.value;
      const subtotal = Number(comanda?.total_sin_servicio) || 0;
      const servicio = Number(servicioVoluntarioEditable.value) || 0;
      return Math.round(subtotal + servicio);
    });

    const totalFinalPagoMostrador = computed(() => {
      const subtotal = Number(comandaMostrador.value?.total_sin_servicio) || 0;
      const servicio = Number(comandaMostrador.value?.servicio_voluntario) || 0;
      const totalFromApi = Number(comandaMostrador.value?.total_final);
      if (Number.isFinite(totalFromApi) && totalFromApi > 0) return Math.round(totalFromApi);
      return Math.round(subtotal + servicio);
    });

    const cargarCatalogoMostrador = async () => {
      if (loadingMostradorCatalog.value) return;
      loadingMostradorCatalog.value = true;
      try {
        const [mesas, productos, categorias, aporte] = await Promise.all([
          cajaService.getMesasMostrador(),
          cajaService.getProductosActivosMostrador(),
          cajaService.getCategoriasMostrador(),
          comandasService.getAporteServicio()
        ]);
        mesasMostrador.value = Array.isArray(mesas) ? mesas : [];
        productosActivosMostrador.value = Array.isArray(productos) ? productos : [];
        categoriasMostrador.value = Array.isArray(categorias) ? categorias : [];
        aporteServicioMostrador.value = aporte || { valor_parametro: 0, tipo_dato: 'porcentaje' };
        if (!comandaIdMostradorGuardada.value) syncMesaDefaultMostrador(mesasMostrador.value);
        mostradorCatalogReady.value = true;
      } catch (error) {
        console.warn('No se pudo cargar el catalogo de mostrador:', error);
        window.dispatchEvent(new CustomEvent('pb:notify-ui', {
          detail: { message: error.message || 'No se pudo cargar el catalogo de mostrador.', type: 'error' }
        }));
      } finally {
        loadingMostradorCatalog.value = false;
      }
    };

    const guardarComandaMostrador = async ({ comanda_id, mesa_id, estado_comanda, prioridad, detalles, detallesEliminar = [] }) => {
      try {
        let resolvedComandaId = Number(comanda_id || 0);
        let createdNow = false;

        if (!resolvedComandaId) {
          const created = await cajaService.createComandaMostrador({
            mesa_id: Number(mesa_id || 1),
            cliente_nombre: 'Consumidor Final',
            datos_cliente: null,
            estado_comanda: estado_comanda || 'En Proceso',
            prioridad: prioridad || 'Media'
          });
          resolvedComandaId = Number(created?.id || 0);
          createdNow = Boolean(resolvedComandaId);
        }

        if (!resolvedComandaId) {
          throw new Error('No se pudo resolver la comanda para guardar los productos.');
        }

        const detailRows = Array.isArray(detalles) ? detalles : [];
        const detallesPersistidos = [];
        let hadNewItems = false;
        let hadDeletedItems = false;

        const idsEliminar = Array.isArray(detallesEliminar)
          ? [...new Set(detallesEliminar.map((id) => Number(id)).filter((id) => id > 0))]
          : [];

        for (const detalleId of idsEliminar) {
          await cajaService.deleteDetalleMostrador(detalleId);
          hadDeletedItems = true;
        }

        const rowsToUpdate = detailRows.filter((d) => Number(d?.detalle_id || 0) > 0);
        const rowsToInsert = agruparDetallesPorProducto(
          detailRows.filter((d) => !Number(d?.detalle_id || 0))
        );

        for (const d of rowsToUpdate) {
          const detalleId = Number(d.detalle_id);
          const updated = await cajaService.updateDetalleMostrador(detalleId, {
            cantidad: Number(d?.cantidad || 0),
            observaciones_mesero: d?.observaciones_mesero ?? null
          });
          detallesPersistidos.push({
            detalle_id: Number(updated?.id || detalleId),
            producto_id: Number(updated?.producto_id || d?.producto_id || 0),
            observaciones_mesero: updated?.observaciones_mesero ?? d?.observaciones_mesero
          });
        }

        for (const d of rowsToInsert) {
          const createdDetalle = await cajaService.addDetalleMostrador(resolvedComandaId, {
            producto_id: Number(d?.producto_id || 0),
            cantidad: Number(d?.cantidad || 0),
            observaciones_mesero: d?.observaciones_mesero ?? null
          });
          detallesPersistidos.push({
            detalle_id: Number(createdDetalle?.id || 0),
            producto_id: Number(createdDetalle?.producto_id || d?.producto_id || 0),
            observaciones_mesero: createdDetalle?.observaciones_mesero ?? d?.observaciones_mesero
          });
          hadNewItems = true;
        }

        const successMessage = createdNow
          ? 'Comanda de mostrador creada correctamente.'
          : hadNewItems
            ? 'Productos agregados a la comanda.'
            : hadDeletedItems
              ? 'Comanda de mostrador actualizada correctamente.'
              : 'Observaciones actualizadas correctamente.';

        window.dispatchEvent(new CustomEvent('pb:notify-ui', {
          detail: {
            message: successMessage,
            type: 'success'
          }
        }));

        return {
          comanda_id: resolvedComandaId,
          detallesPersistidos,
          createdNow
        };
      } catch (error) {
        window.dispatchEvent(new CustomEvent('pb:notify-ui', {
          detail: { message: error.message || 'Error al guardar comanda de mostrador', type: 'error' }
        }));
        throw error;
      }
    };

    const onComandaMostradorGuardada = async (comandaId) => {
      const fresh = await cajaService.getComandaMostradorById(comandaId);
      if (!fresh) return;
      comandaMostrador.value = {
        ...fresh,
        cliente_nombre: fresh.cliente_nombre || 'Consumidor Final',
        forma_pago: fresh.forma_pago || 'Efectivo',
        estado_comanda: fresh.estado_comanda || 'En Proceso'
      };
    };

    watch(activeTab, (tab) => {
      if (tab === 'mostrador' && !mostradorCatalogReady.value) {
        cargarCatalogoMostrador();
      }
      if (tab === 'mostrador' && mostradorCatalogReady.value) {
        nextTick(() => {
          if (mostradorSearchInputRef.value) mostradorSearchInputRef.value.focus();
        });
      }
    });

    // --- Habilita campos según el método de pago seleccionado ---
    const montoEfectivoHabilitado = computed(() => ['Efectivo', 'Mixto'].includes(payment.value.metodo_pago));
    const montoTransferenciaHabilitado = computed(() => ['Transferencia', 'Mixto'].includes(payment.value.metodo_pago));

    // --- TotalRecibido representa el dinero recibido: Efectivo + Transferencia ---
    
    const totalRecibido = computed(() => {
      const ef = montoEfectivoHabilitado.value ? Number(payment.value.monto_efectivo) : 0;
      const tr = montoTransferenciaHabilitado.value ? Number(payment.value.monto_transferencia) : 0;
      
      return Math.round((ef || 0) + (tr || 0));
    });

    // --- Devuelta: diferencia entre recibido y total a pagar ---
    const devueltaPago = computed(() => roundMoney(totalRecibido.value - totalFinalPago.value));

    const cargarCaja = async ({ silent = false } = {}) => {
      loading.value = true;
      try {
        const data = await cajaService.getComandasPendientes();
        comandas.value = Array.isArray(data) ? data : [];
        if (selectedComanda.value?.id) {
          const exists = comandas.value.some((item) => item.id === selectedComanda.value.id);
          if (!exists) selectedComanda.value = null;
        }
      } catch (error) {
        if (!silent) {
          alert(error.message || 'No se pudo cargar caja.');
        } else {
          console.warn('No se pudo refrescar caja en segundo plano:', error);
        }
      } finally {
        loading.value = false;
      }
    };

    const resetGastoForm = () => {
      gastoForm.value = {
        monto: '',
        categoria: gastoCajaOptions[0].value,
        descripcion: '',
        numero_soporte: ''
      };
    };

    const cargarMovimientosHoy = async ({ silent = false } = {}) => {
      loadingMovimientos.value = true;
      try {
        const data = await cajaService.getMovimientosHoy();
        movimientosHoy.value = Array.isArray(data?.movimientos) ? data.movimientos : [];
        totalEgresosHoy.value = roundMoney(data?.total_egresos_hoy || 0);
        totalFlujoHoy.value = roundMoney(data?.flujo_neto_hoy || 0);
      } catch (error) {
        if (!silent) {
          alert(error.message || 'No se pudieron cargar los movimientos de hoy.');
        } else {
          console.warn('No se pudieron refrescar los movimientos de caja:', error);
        }
      } finally {
        loadingMovimientos.value = false;
      }
    };

    const seleccionarComanda = async (id) => {
      try {
        const data = await cajaService.getComandaById(id);
        selectedComanda.value = data;
        solicitudesPendientes.value = solicitudesPendientes.value.filter((item) => Number(item.id_comanda) !== Number(id));
      } catch (error) {
        alert(error.message || 'No se pudo cargar la comanda.');
      }
    };

    const isSolicitudPendiente = (comandaId) => {
      return solicitudesPendientes.value.some((item) => Number(item.id_comanda) === Number(comandaId));
    };

    const abrirSolicitudCuenta = async (item) => {
      const comandaId = Number(item?.id_comanda || 0);
      if (!comandaId) return;
      await seleccionarComanda(comandaId);
    };

    const onMetodoPagoChange = () => {
      // Forzar el reinicio a cero de ambos campos en cualquier cambio de selección
      payment.value.monto_efectivo = 0;
      payment.value.monto_transferencia = 0;

      const metodo = payment.value.metodo_pago;
      if (metodo === 'Efectivo') {
        setKeypadFocus('monto_efectivo');
      } else if (metodo === 'Transferencia') {
        setKeypadFocus('monto_transferencia');
      } else {
        // Mixto: ambos habilitados, foco en efectivo
        setKeypadFocus('monto_efectivo');
      }
    };

    /* anterior*/
    /*
    const onMetodoPagoChange = () => {
      const metodo = payment.value.metodo_pago;
      if (metodo === 'Efectivo') {
        payment.value.monto_transferencia = 0;
        setKeypadFocus('monto_efectivo');
      } else if (metodo === 'Transferencia') {
        payment.value.monto_efectivo = 0;
        setKeypadFocus('monto_transferencia');
      } else {
        // Mixto: ambos habilitados, foco en efectivo
        setKeypadFocus('monto_efectivo');
      }
    };
    */

    const setKeypadFocus = (field) => {
      focusedKeypadField.value = field;
      activeField.value = field;
    };

    const abrirPago = async () => {
      const esMostrador = activeTab.value === 'mostrador';
      pagoOrigen.value = esMostrador ? 'mostrador' : 'mesa';

      const comanda = esMostrador ? comandaMostrador.value : selectedComanda.value;
      if (!comanda?.id) {
        window.dispatchEvent(new CustomEvent('pb:notify-ui', {
          detail: { message: 'Debes guardar la comanda antes de registrar el pago.', type: 'warning' }
        }));
        return;
      }

      if (!(comanda.detalles || []).length) {
        window.dispatchEvent(new CustomEvent('pb:notify-ui', {
          detail: { message: 'La comanda no tiene productos para cobrar.', type: 'warning' }
        }));
        return;
      }

      if (esMostrador && comanda.estado_comanda !== 'Cerrada') {
        try {
          const cerrada = await cajaService.cerrarComandaMostrador(comanda.id);
          comandaMostrador.value = {
            ...cerrada,
            cliente_nombre: cerrada?.cliente_nombre || 'Consumidor Final',
            forma_pago: cerrada?.forma_pago || 'Efectivo'
          };
        } catch (error) {
          window.dispatchEvent(new CustomEvent('pb:notify-ui', {
            detail: { message: error.message || 'No se pudo cerrar la comanda de mostrador.', type: 'error' }
          }));
          return;
        }
      }

      const comandaCobro = comandaEnCobro.value;
      const pct = Number(comandaCobro?.aporte_servicio_porcentaje)
        || Number(aporteServicioMostrador.value?.valor_parametro)
        || 0;
      aporteServicioPorcentaje.value = roundMoney(pct);
      servicioVoluntarioOverride.value = null;
      payment.value = {
        metodo_pago: comandaCobro?.forma_pago || 'Efectivo',
        monto_efectivo: 0,
        monto_transferencia: 0,
        notas: ''
      };
      setKeypadFocus('monto_efectivo');
      showPagoModal.value = true;
    };

    const abrirGastoCaja = () => {
      resetGastoForm();
      showGastoModal.value = true;
    };

    const cerrarGastoCaja = () => {
      showGastoModal.value = false;
      savingGasto.value = false;
    };

    const cerrarPago = () => {
      showPagoModal.value = false;
      savingPago.value = false;
      pagoOrigen.value = 'mesa';
    };

    const abrirRealizarArqueo = () => {
      showArqueoModal.value = true;
    };

    const cerrarRealizarArqueo = () => {
      showArqueoModal.value = false;
    };

    const onArqueoCreated = () => {
      cargarCaja({ silent: true });
      cargarMovimientosHoy({ silent: true });
      cerrarRealizarArqueo();
    };

    const logout = async () => {
      await authStore.logout();
      router.push('/login');
    };

    const parseFieldValue = (value) => {
      const sanitized = String(value ?? '0').replace(/[^\d.]/g, '');
      return Number(sanitized || '0');
    };

    const pressKey = (key) => {
      const field = focusedKeypadField.value;
      if (!field) return;

      // Campos de payment directo
      if (field === 'monto_efectivo' || field === 'monto_transferencia') {
        const current = String(payment.value[field] ?? '0');
        if (key === '←') {
          const trimmed = current.slice(0, -1);
          payment.value[field] = trimmed ? parseFieldValue(trimmed) : 0;
          return;
        }
        const next = current === '0' ? key : `${current}${key}`;
        payment.value[field] = parseFieldValue(next);
        return;
      }

      // Campo porcentaje de aporte voluntario
      if (field === 'aporte_porcentaje') {
        const current = String(aporteServicioPorcentaje.value ?? '0');
        if (key === '←') {
          const trimmed = current.slice(0, -1);
          aporteServicioPorcentaje.value = trimmed ? parseFieldValue(trimmed) : 0;
        } else {
          const next = current === '0' ? key : `${current}${key}`;
          aporteServicioPorcentaje.value = parseFieldValue(next);
        }
        // Limpiar override de pesos para que el porcentaje recalcule el servicio
        servicioVoluntarioOverride.value = null;
        return;
      }

      // Campo servicio voluntario en pesos
      if (field === 'servicio_pesos') {
        const rawCurrent = servicioVoluntarioOverride.value !== null
          ? String(servicioVoluntarioOverride.value)
          : '0';
        if (key === '←') {
          const trimmed = rawCurrent.slice(0, -1);
          servicioVoluntarioOverride.value = trimmed ? parseFieldValue(trimmed) : 0;
        } else {
          const next = rawCurrent === '0' ? key : `${rawCurrent}${key}`;
          servicioVoluntarioOverride.value = parseFieldValue(next);
        }
        // Recalcular porcentaje desde los pesos editados
        const subtotal = Number(comandaEnCobro.value?.total_sin_servicio) || 0;
        if (subtotal > 0) {
          aporteServicioPorcentaje.value = roundMoney((servicioVoluntarioOverride.value / subtotal) * 100);
        }
        return;
      }
    };

    const handleGlobalKeypadInput = (event) => {
      if (!showPagoModal.value) return;

      const targetTag = event?.target?.tagName;
      if (targetTag === 'TEXTAREA' || targetTag === 'SELECT') return;

      if (/^\d$/.test(event.key)) {
        pressKey(event.key);
        event.preventDefault();
        return;
      }

      if (event.key === 'Backspace') {
        pressKey('←');
        event.preventDefault();
      }
    };

    const preloadLogoDataUrl = async () => {
      try {
        const res = await fetch(COMPANY_LOGO_URL);
        if (!res.ok) return;
        const blob = await res.blob();
        logoDataUrl.value = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      } catch {
        // logo not critical — will fall back to URL
      }
    };


    const imprimirPrecuenta = () => {
      const comanda = comandaActivaTab.value;
      if (!comanda?.id || !(comanda.detalles || []).length) {
        window.dispatchEvent(new CustomEvent('pb:notify-ui', {
          detail: { message: 'No hay productos en la comanda para imprimir precuenta.', type: 'warning' }
        }));
        return;
      }

      const html = buildPrecuentaHtml(
        comanda,
        businessInfo,
        logoDataUrl.value || COMPANY_LOGO_URL,
        { getMeseroNombre, skipAutoPrint: true }
      );

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.zIndex = '-1000';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
      iframe.contentWindow.focus();

      setTimeout(() => {
        iframe.contentWindow.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 200);
    };

    const imprimirTicket = (ticket) => {
      const popup = window.open('', '_blank', 'width=420,height=720');
      if (!popup) return;
      popup.document.open();
      popup.document.write(buildTicketHtml(ticket, businessInfo, logoDataUrl.value || COMPANY_LOGO_URL));
      popup.document.close();
    };

    const registrarPago = async () => {
      const comanda = comandaEnCobro.value;
      if (!comanda?.id) return;
      if (totalRecibido.value < totalFinalPago.value) {
        await Swal.fire({
          icon: 'error',
          title: 'Pago insuficiente',
          text: 'El dinero recibido no alcanza para el total.'
        });
        return;
      }

      // Validaciones adicionales antes de guardar el pago
      const metodo = String(payment.value.metodo_pago || '');
      const efectivoRecibido = Number(payment.value.monto_efectivo || 0);
      const transferenciaRecibida = Number(payment.value.monto_transferencia || 0);

      if (metodo === 'Mixto') {
        if (!(efectivoRecibido > 0 && transferenciaRecibida > 0)) {
          await Swal.fire({
            icon: 'error',
            title: 'Método Mixto',
            text: 'Para Mixto ambos montos deben ser mayores a 0: Efectivo y Transferencia.'
          });
          return;
        }
      } else if (metodo === 'Efectivo') {
        if (efectivoRecibido <= 0) {
          await Swal.fire({
            icon: 'error',
            title: 'Efectivo requerido',
            text: 'Ingrese un monto de efectivo mayor a 0.'
          });
          return;
        }
      } else if (metodo === 'Transferencia') {
        if (transferenciaRecibida <= 0) {
          await Swal.fire({
            icon: 'error',
            title: 'Transferencia requerida',
            text: 'Ingrese un monto de transferencia mayor a 0.'
          });
          return;
        }
      }

      savingPago.value = true;
      try {
        const paidComandaId = Number(comanda.id);
        const data = await cajaService.registrarPago({
          comanda_id: paidComandaId,
          arqueo_id: null,
          aporte_servicio: servicioVoluntarioEditable.value,
          metodo_pago: payment.value.metodo_pago,
          monto_efectivo: montoEfectivoHabilitado.value ? payment.value.monto_efectivo : 0,
          monto_digital: montoTransferenciaHabilitado.value ? payment.value.monto_transferencia : 0,
          notas: payment.value.notas || null
        });

        lastTicket.value = data.venta;
        if (data?.venta) {
          imprimirTicket({
            ...data.venta,
            total_recibido: data.total_recibido,
            cambio: data.cambio
          });
        }

        if (pagoOrigen.value === 'mostrador') {
          resetComandaMostrador();
        } else {
          comandas.value = comandas.value.filter((item) => Number(item.id) !== paidComandaId);
          solicitudesPendientes.value = solicitudesPendientes.value.filter((item) => Number(item.id_comanda) !== paidComandaId);
          selectedComanda.value = null;
        }
        pagoOrigen.value = 'mesa';
        cerrarPago();

        // El pago ya fue registrado; si el refresco de lista falla, no se debe bloquear al cajero.
        await cargarCaja({ silent: true });
      } catch (error) {
        window.dispatchEvent(new CustomEvent('pb:notify-ui', { detail: { message: error.message || 'No se pudo registrar el pago.', type: 'error' } }));
      } finally {
        savingPago.value = false;
      }
    };

    const registrarGastoCaja = async () => {
      const monto = roundMoney(parseLocaleNumber(gastoForm.value.monto));
      const descripcion = String(gastoForm.value.descripcion || '').trim();

      if (monto <= 0) {
        alert('Debes ingresar un monto valido para el gasto de caja.');
        return;
      }

      if (!descripcion) {
        alert('Debes ingresar una descripcion para el gasto de caja.');
        return;
      }

      savingGasto.value = true;
      try {
        await cajaService.registrarGastoCaja({
          monto,
          categoria: gastoForm.value.categoria,
          descripcion,
          numero_soporte: gastoForm.value.numero_soporte || null
        });

        cerrarGastoCaja();
        await cargarMovimientosHoy({ silent: true });
      } catch (error) {
        alert(error.message || 'No se pudo registrar el gasto de caja.');
      } finally {
        savingGasto.value = false;
      }
    };

    const handleAbrirCajon = async (payload) => {
      try {
        await openCashDrawerBridge(payload);
      } catch (error) {
        console.warn('No se pudo notificar al bridge local del cajon:', error);
      }
    };

    const handleSolicitudCuenta = async (data = {}) => {
      const { payload } = resolveSocketEventData(data);
      const comandaId = Number(payload?.id_comanda || 0);
      if (!comandaId) return;
      const notificationId = Number(payload?.notification_id || 0);
      const dedupKey = `transition:cerrada:${comandaId}:${notificationId}`;
      if (!shouldProcessSocketEvent(SOCKET_EVENTS.SOLICITUD_CUENTA, payload, dedupKey)) return;

      // Agregar a solicitudes pendientes
      const alreadyExistsSolicitud = solicitudesPendientes.value.some((item) => Number(item.id_comanda) === comandaId);
      if (!alreadyExistsSolicitud) {
        solicitudesPendientes.value.unshift({
          id_comanda: comandaId,
          nombre_mesa: payload?.nombre_mesa || null,
          id_mesa: Number(payload?.id_mesa || 0),
          items: Array.isArray(payload?.items) ? payload.items : []
        });
      }

      // Verificar si comanda ya existe en lista
      const alreadyExistsInComandas = comandas.value.some((item) => Number(item.id) === comandaId);

      // Si NO existe, obtenerla del servidor y agregarla DIRECTAMENTE
      if (!alreadyExistsInComandas) {
        try {
          const comanda = await cajaService.getComandaById(comandaId);
          if (comanda) {
            // Agregar comanda directamente al inicio del array
            comandas.value.unshift(comanda);
          }
        } catch (error) {
          console.warn('Error obteniendo comanda para agregar a lista:', error);
          // Si falla, hacer reload en segundo plano
          await cargarCaja({ silent: true });
        }
      }

      // Reload en segundo plano para sincronizar totales y otros datos
      // (sin bloquear la UI)
      cargarCaja({ silent: true }).catch(() => {
        // Silenciar errores de sincronización
      });
    };

    const handleComandaPagada = async (payload = {}) => {
      const comandaId = Number(payload?.id_comanda || payload?.comanda_id || payload?.id || 0);
      const notificationId = Number(payload?.notification_id || 0);
      const dedupKey = `transition:pagada:${comandaId}:${notificationId}`;
      if (!shouldProcessSocketEvent(SOCKET_EVENTS.COMANDA_PAGADA, payload, dedupKey)) return;

      // Recargar lista de comandas y movimientos de caja en paralelo
      await Promise.all([
        cargarCaja({ silent: true }),
        cargarMovimientosHoy({ silent: true })
      ]).catch(() => {
        // Silenciar errores de sincronización
      });
    };

    const handleComandaCerrada = async (payload = {}) => {

      // Agregar inmediatamente a la lista (actualización optimista) para que aparezca sin delay
      const comandaId = Number(payload?.id_comanda || payload?.comanda_id || payload?.id || 0);
      if (comandaId && !comandas.value.some(c => Number(c.id) === comandaId)) {
        console.log('✅ [Caja] Agregando comanda a la lista:', comandaId);
        comandas.value.push(payload);
      }

      // Refrescar desde el servidor en segundo plano para sincronizar totales y otros datos
      console.log('🔄 [Caja] Refrescando lista desde servidor...');
      await cargarCaja({ silent: true }).catch((err) => {
        console.warn('⚠️ Error refrescando caja:', err);
      });
    };

    onMounted(async () => {
      await fetchCashierProfile();
      await cargarCaja({ silent: false });
      await cargarMovimientosHoy({ silent: true });
      preloadLogoDataUrl();
      window.addEventListener('keydown', handleGlobalKeypadInput);
      if (window.socket) {
        console.log('🔌 [Caja] Suscribiendo listeners de notificaciones');
        window.socket.on(SOCKET_EVENTS.SOLICITUD_CUENTA, handleSolicitudCuenta);
        window.socket.on(SOCKET_EVENTS.COMANDA_CERRADA, handleComandaCerrada);
        window.socket.on(SOCKET_EVENTS.ABRIR_CAJON, handleAbrirCajon);
        window.socket.on(SOCKET_EVENTS.COMANDA_PAGADA, handleComandaPagada);
      }
    });

    onUnmounted(() => {
      window.removeEventListener('keydown', handleGlobalKeypadInput);
      if (window.socket) {
        window.socket.off(SOCKET_EVENTS.SOLICITUD_CUENTA, handleSolicitudCuenta);
        window.socket.off(SOCKET_EVENTS.COMANDA_CERRADA, handleComandaCerrada);
        window.socket.off(SOCKET_EVENTS.ABRIR_CAJON, handleAbrirCajon);
        window.socket.off(SOCKET_EVENTS.COMANDA_PAGADA, handleComandaPagada);
      }
    });

    return {
      keypadKeys,
      gastoCajaOptions,
      currentUser,
      cashierProfile,
      cashierDisplayName,
      cashierDisplayRole,
      solicitudesPendientes,
      loading,
      comandas,
      selectedComanda,
      showPagoModal,
      showGastoModal,
      savingPago,
      savingGasto,
      loadingMovimientos,
      activeField,
      payment,
      gastoForm,
      aporteServicioPorcentaje,
      servicioVoluntarioCalculado,
      totalFinalPago,
      totalRecibido,
      devueltaPago,
      // puedeRegistrarPago eliminado del return, ya no existe
      movimientosHoy,
      totalEgresosHoy,
      totalFlujoHoy,
      showAudioAlert,
      activatingAudio,
      activeTab,
      mesasMostrador,
      productosActivosMostrador,
      categoriasMostrador,
      aporteServicioMostrador,
      mostradorCatalogReady,
      comandaMostrador,
      comandaEnCobro,
      mesaSeleccionadaMostrador,
      comandaIdMostradorGuardada,
      busquedaMostrador,
      productosFiltradosMostrador,
      productosSeleccionadosMostrador,
      hayProductosMostrador,
      puedeGuardarMostrador,
      saveButtonLabelMostrador,
      savingMostrador,
      getCantidadMostrador,
      incrementarMostrador,
      decrementarMostrador,
      onGuardarMostrador,
      totalFinalPagoMostrador,
      onComandaMostradorGuardada,
      cargarCaja,
      cargarMovimientosHoy,
      seleccionarComanda,
      abrirPago,
      abrirGastoCaja,
      cerrarGastoCaja,
      cerrarPago,
      isSolicitudPendiente,
      abrirSolicitudCuenta,
      pressKey,
      registrarPago,
      registrarGastoCaja,
      getMeseroNombre,
      getPersonalImageUrl,
      getProductoImageUrl,
      handleImageError,
      formatCurrency,
      formatDateTime,
      movimientoEsDebito,
      roundMoney,
      parseLocaleNumber,
      focusedKeypadField,
      setKeypadFocus,
      onMetodoPagoChange,
      aporteServicioPorcentaje,
      servicioVoluntarioEditable,
      servicioVoluntarioOverride,
      montoEfectivoHabilitado,
      montoTransferenciaHabilitado,
      desbloquearAudio,
      imprimirPrecuenta,
      showArqueoModal,
      abrirRealizarArqueo,
      cerrarRealizarArqueo,
      onArqueoCreated,
      logout
    };
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Montserrat:wght@600;700;800&family=Sora:wght@600;700;800&display=swap');
.cash-shell {
  --bg-a: #fff5f7;
  --bg-b: #fff1f2;
  --panel: rgba(255, 255, 255, 0.88);
  background:
    radial-gradient(circle at 8% 8%, rgba(190, 24, 93, 0.12) 0, transparent 34%),
    radial-gradient(circle at 88% 8%, rgba(244, 114, 182, 0.16) 0, transparent 28%),
    linear-gradient(180deg, var(--bg-a), var(--bg-b));
  font-family: 'Manrope', sans-serif;
}
.cash-content-area {
  flex: 1;
  min-height: 0;
}
.cash-layout-grid {
  grid-template-rows: minmax(0, 1fr) minmax(0, 28vh);
}
.cash-tab-area {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.cash-tab-pane {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.cash-tab-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  grid-template-rows: minmax(0, 34vh) minmax(0, 1fr);
}
.cash-panel-scroll {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.cash-historial-panel {
  min-height: 0;
}
@media (min-width: 1280px) {
  .cash-layout-grid {
    grid-template-rows: minmax(0, 1fr);
  }
  .cash-tab-body {
    grid-template-rows: minmax(0, 1fr);
  }
  .cash-historial-panel {
    max-height: none;
  }
}
[data-ui='ContenedorComandaMostrador'] > .grid {
  grid-template-rows: minmax(0, 1fr) auto;
}
@media (min-width: 1280px) {
  [data-ui='ContenedorComandaMostrador'] > .grid {
    grid-template-rows: minmax(0, 1fr);
  }
}
.audio-alert-btn {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 70;
  border: 1px solid #f59e0b;
  background: #fef3c7;
  color: #92400e;
  border-radius: 999px;
  padding: 0.45rem 0.75rem;
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.04em;
}
.cash-banner {
  background:
    linear-gradient(135deg, rgba(80, 7, 36, 0.96), rgba(190, 24, 93, 0.9)),
    radial-gradient(circle at 85% 22%, rgba(251, 207, 232, 0.35), transparent 48%);
  box-shadow: 0 4px 20px rgba(190, 24, 93, 0.28);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.cash-title { font-family: 'Sora', sans-serif; letter-spacing: -0.02em; }
.cash-header-center {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
  overflow: hidden;
}
.cash-header-actions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.35rem;
  width: 100%;
  min-width: 0;
  overflow: hidden;
}
.cash-hero-btn--compact {
  width: 100%;
  min-width: 0;
  min-height: 1.85rem;
  padding: 0.28rem 0.3rem;
  font-size: clamp(5px, 0.42vw + 4px, 8px);
  letter-spacing: 0.04em;
  border-radius: 0.625rem;
  text-align: center;
  line-height: 1.1;
  gap: 0.25rem;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);
}
.cash-hero-btn--compact span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.cash-hero-btn--compact i {
  font-size: clamp(7px, 0.5vw + 4px, 9px);
  flex-shrink: 0;
}
.cash-hero-btn--compact.cash-hero-btn--tab-active,
.cash-hero-btn--compact.cash-hero-btn--tab-inactive,
.cash-hero-btn--compact.cash-hero-btn--amber,
.cash-hero-btn--compact.cash-hero-btn--teal {
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.08);
}
.cash-hero-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 2.75rem;
  border-radius: 1rem;
  padding: 0.75rem 1rem;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  line-height: 1.2;
  border: 1px solid transparent;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}
.cash-hero-btn--tab-active {
  border-color: rgba(190, 24, 93, 0.35);
  background: linear-gradient(135deg, #fff1f2, #ffe4e6);
  color: #9f1239;
  box-shadow: 0 10px 24px rgba(190, 24, 93, 0.14);
}
.cash-hero-btn--tab-inactive {
  border-color: rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.72);
  color: #64748b;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}
.cash-hero-btn--tab-inactive:hover {
  background: #fff;
  color: #334155;
}
.cash-hero-btn--amber {
  border-color: rgba(251, 191, 36, 0.7);
  background: #fffbeb;
  color: #92400e;
  box-shadow: 0 18px 30px rgba(245, 158, 11, 0.22);
}
.cash-hero-btn--amber:hover {
  background: #fef3c7;
}
.cash-hero-btn--teal {
  border-color: rgb(153 246 228);
  background: #f0fdfa;
  color: #134e4a;
  box-shadow: 0 18px 30px rgba(13, 148, 136, 0.22);
}
.cash-hero-btn--teal:hover {
  background: #ccfbf1;
}
.panel {
  background: var(--panel);
  border: 1px solid rgba(148, 163, 184, 0.28);
  box-shadow: 0 18px 40px rgba(30, 41, 59, 0.08);
  backdrop-filter: blur(6px);
}
.panel-pago-logo {
  filter: drop-shadow(0 8px 16px rgba(15, 23, 42, 0.14));
}


.btn-comanda-pay-cta {
  background: linear-gradient(135deg, #f97316, #ea580c);
  color: #fff;
  border: 1px solid rgba(194, 65, 12, 0.45);
  box-shadow: 0 14px 28px rgba(234, 88, 12, 0.32);
  transform: translateZ(0);
}
.btn-comanda-pay-cta:hover {
  background: linear-gradient(135deg, #fb923c, #f97316);
  box-shadow: 0 16px 32px rgba(234, 88, 12, 0.4);
}
.btn-comanda-pay-cta:focus-visible {
  outline: 0;
  box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.32), 0 16px 32px rgba(234, 88, 12, 0.4);
}
.badge {
  display: inline-flex; align-items: center; border-width: 1px; border-style: solid;
  padding: 0.2rem 0.55rem; border-radius: 999px; font-size: 10px; font-weight: 800; text-transform: uppercase; line-height: 1.1;
}
.timeline-line { width: 2px; background: linear-gradient(180deg, #f9a8d4, #ffe4e6); }
.timeline-dot { width: 10px; height: 10px; border-radius: 999px; background: #e11d48; box-shadow: 0 0 0 4px rgba(225, 29, 72, 0.14); }
.label-mini { font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; font-weight: 900; color: rgb(100 116 139 / 1); }
.value-strong { font-size: 0.95rem; font-weight: 800; color: rgb(15 23 42 / 1); }
.summary-box { border: 1px solid rgb(226 232 240 / 1); background: rgb(248 250 252 / 1); border-radius: 1rem; padding: 0.9rem 1rem; font-weight: 800; color: rgb(15 23 42 / 1); }
.summary-box-strong { color: rgb(190 24 93 / 1); font-size: 1.1rem; }
.form-input {
  width: 100%; border: 1px solid rgb(226 232 240 / 1); border-radius: 1rem; padding: 0.85rem 1rem;
  font-size: 0.95rem; font-weight: 700; color: rgb(15 23 42 / 1); background: white; outline: none;
}
.form-input:focus { border-color: rgb(244 114 182 / 1); box-shadow: 0 0 0 3px rgba(244, 114, 182, 0.18); }
.montserrat-field { font-family: 'Montserrat', 'Manrope', sans-serif; }
.suffix-input-wrap {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
  border-radius: 12px;
}
.suffix-input {
  width: 100%;
  border: 0;
  outline: none;
  background: transparent;
  padding: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: rgb(15 23 42 / 1);
  font-variant-numeric: tabular-nums;
}
.suffix-token {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 900;
  color: rgb(71 85 105 / 1);
}
.amount-display {
  width: 100%; border: 1px solid rgb(226 232 240 / 1); border-radius: 1rem; padding: 1rem; background: white; font-size: 1rem; font-weight: 900; color: rgb(15 23 42 / 1); text-align: right;
}
.amount-display-active { border-color: rgb(244 114 182 / 1); box-shadow: 0 0 0 3px rgba(244, 114, 182, 0.18); }
.amount-display-disabled { opacity: 0.38; cursor: not-allowed; background: rgb(248 250 252 / 1); color: rgb(148 163 184 / 1); }
.field-active { border-color: rgb(244 114 182 / 1) !important; box-shadow: 0 0 0 3px rgba(244, 114, 182, 0.18); }
.num-value { text-align: right; font-variant-numeric: tabular-nums; }
.keypad-btn {
  border: 1px solid rgb(251 207 232 / 1); background: rgb(255 241 242 / 1); color: rgb(159 18 57 / 1); border-radius: 1rem; min-height: 76px; font-size: 1.4rem; font-weight: 900; transition: all 0.18s ease;
}
.keypad-btn:hover { background: rgb(255 228 230 / 1); transform: translateY(-1px); }
.animate-fadeIn { animation: fadeIn 0.25s ease-in; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

/* Compactacion especifica del modal de pago para evitar scroll vertical */
.pago-modal .label-mini { font-size: 9px; letter-spacing: 0.12em; }
.pago-modal .value-strong { font-size: 0.9rem; }
.pago-modal .summary-box { padding: 0.68rem 0.85rem; border-radius: 0.85rem; }
.pago-modal .summary-box-strong { font-size: 1rem; }
.pago-modal .form-input { padding: 0.68rem 0.85rem; border-radius: 0.85rem; font-size: 0.9rem; }
.pago-modal .amount-display { padding: 0.72rem 0.8rem; border-radius: 0.85rem; font-size: 0.95rem; }
.pago-modal .keypad-btn { min-height: 62px; border-radius: 0.85rem; font-size: 1.2rem; }

@media (max-height: 900px) {
  .pago-modal .keypad-btn { min-height: 54px; font-size: 1.05rem; }
  .pago-modal .summary-box { padding: 0.58rem 0.75rem; }
  .pago-modal .form-input,
  .pago-modal .amount-display { padding-top: 0.58rem; padding-bottom: 0.58rem; }
}

@media (max-width: 1280px) { .cash-shell { border-radius: 1.5rem; } }

/* Tab Atención Mostrador */
.mostrador-mesa-select {
  flex: 1;
  min-width: 0;
  border: 1px solid #fdba74;
  border-radius: 0.85rem;
  padding: 0.55rem 0.7rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: #7c2d12;
  background: #fff;
  outline: none;
}
.mostrador-mesa-select:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  background: #fff7ed;
}
.mostrador-header-stack {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}
.mostrador-header-meta {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  flex-wrap: wrap;
}
.mostrador-mesa-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  flex-shrink: 0;
}
.mostrador-mesa-select--header {
  width: auto;
  min-width: 5.5rem;
  max-width: 9rem;
}
.mostrador-header-fecha {
  margin: 0;
  white-space: nowrap;
}
.mostrador-search-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-width: 0;
  padding: 0.4rem 0.65rem;
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(254, 215, 170, 0.75);
}
.mostrador-search-icon { color: #ea580c; font-size: 0.9rem; }
.mostrador-search-input {
  flex: 1;
  border: 0;
  background: transparent;
  font-size: 0.84rem;
  color: #0f172a;
  outline: none;
}
.mostrador-clear-btn {
  border: 0;
  background: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
}
.mostrador-detalle-body {
  flex: 1;
  min-height: 0;
}
.mostrador-empty-msg {
  text-align: center;
  color: #94a3b8;
  font-size: 0.84rem;
  padding: 1rem;
}
.mostrador-section-label {
  margin: 0.7rem 0 0.35rem;
  font-size: 0.66rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #c2410c;
}
.mostrador-producto-card,
.mostrador-selected-card {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid #f1f5f9;
}
.mostrador-producto-img {
  width: 44px;
  height: 44px;
  border-radius: 0.55rem;
  object-fit: cover;
  background: #f1f5f9;
  flex-shrink: 0;
}
.mostrador-producto-info { flex: 1; min-width: 0; }
.mostrador-producto-nombre {
  display: block;
  font-size: 0.88rem;
  font-weight: 700;
  color: #0f172a;
}
.mostrador-producto-precio {
  font-size: 0.78rem;
  font-weight: 700;
  color: #ea580c;
}
.mostrador-selected-grid {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  grid-template-areas: 'copy stepper' 'obs obs';
  column-gap: 0.7rem;
  row-gap: 0.18rem;
}
.mostrador-producto-copy { grid-area: copy; min-width: 0; }
.mostrador-producto-copy--truncate .mostrador-producto-nombre {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mostrador-obs-wrap { grid-area: obs; width: 100%; }
.mostrador-obs-label {
  display: block;
  margin-bottom: 0.14rem;
  font-size: 0.62rem;
  font-weight: 900;
  text-transform: uppercase;
  color: #475569;
}
.mostrador-obs-input {
  width: 100%;
  resize: none;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  padding: 0.36rem 0.5rem;
  font-size: 0.72rem;
}
.mostrador-stepper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}
.mostrador-stepper--grid { grid-area: stepper; justify-self: end; }
.mostrador-stepper-btn {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: 1px solid #fdba74;
  background: #fff7ed;
  color: #c2410c;
  cursor: pointer;
}
.mostrador-stepper-qty {
  min-width: 1.2rem;
  text-align: center;
  font-size: 0.9rem;
}
.mostrador-footer-btn {
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
.mostrador-footer-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

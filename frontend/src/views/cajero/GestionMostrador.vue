<template>
  <div class="cash-shell min-h-[calc(100vh-2rem)] p-4 md:p-6 lg:p-8">
    <button
      v-if="showAudioAlert"
      type="button"
      class="audio-alert-btn"
      :disabled="activatingAudio"
      @click="desbloquearAudio"
    >
      🔔 Haga clic aquí para activar sonidos
    </button>

    <section class="cash-hero mb-6 rounded-3xl p-5 md:p-7">
      <div class="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div class="space-y-2">
          <p class="text-[10px] uppercase tracking-[0.22em] font-bold text-orange-100/80">Panel de mostrador</p>
          <h2 class="cash-title text-3xl md:text-4xl text-white font-extrabold leading-tight">Gestion de Mostrador</h2>
          <p class="text-sm text-orange-100/80 max-w-2xl">
            Selecciona una comanda lista para cobro, valida el pago y genera el ticket imprimible para 80 mm o PDF.
          </p>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
          <div class="flex flex-col gap-2 w-full sm:w-auto">
            <button
              type="button"
              class="quick-expense-btn inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-amber-900 transition hover:bg-amber-100"
              @click="abrirGastoCaja"
            >
              <i class="fas fa-receipt"></i>
              <span>Registrar Gasto de Caja</span>
            </button>

            <button
              type="button"
              class="quick-arqueo-btn inline-flex items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-teal-900 transition hover:bg-teal-100"
              @click="abrirRealizarArqueo"
            >
              <i class="fas fa-calculator"></i>
              <span>Realizar Arqueo de Caja</span>
            </button>
          </div>

          <div class="user-chip rounded-2xl p-3.5 flex items-center gap-3 border border-white/20 bg-white/10 backdrop-blur-sm">
            <div class="h-12 w-12 rounded-xl overflow-hidden border-2 border-orange-200/40 bg-slate-100 shrink-0">
              <img
                :src="getPersonalImageUrl(cashierProfile.url_foto, cashierDisplayName)"
                :alt="cashierDisplayName"
                class="h-full w-full object-cover"
                @error="handleImageError"
              >
            </div>
            <div>
              <p class="text-[10px] uppercase tracking-[0.18em] text-orange-100/80 font-bold">Turno activo</p>
              <p class="text-white font-black text-sm uppercase">{{ cashierDisplayName }}</p>
              <p class="text-[10px] font-bold uppercase tracking-wider text-orange-100">{{ cashierDisplayRole }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- [SECCION] LayoutPrincipalCaja -->
    <section class="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-5" data-ui="LayoutPrincipalCaja">
      <!-- [SECCION] ListaMesas (Columna izquierda) -->
      <aside class="xl:col-span-3 panel rounded-3xl p-3 md:p-4 max-h-[70vh] overflow-y-auto" data-ui="ListaMesas">
        <div class="flex items-center justify-between mb-3 px-1">
          <h3 class="cash-title text-sm uppercase tracking-wide">Mesas por Cobrar</h3>
        </div>

        <div v-if="loading" class="py-10 flex justify-center">
          <div class="h-10 w-10 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"></div>
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
              :class="selectedComanda?.id === comanda.id ? 'bg-orange-100 border-orange-300 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'"
            >
              <div class="flex items-start gap-3">
                <div class="min-w-0 flex-1">
                  <p class="text-[9px] uppercase font-black tracking-widest text-orange-600">Nro {{ comanda.mesa_id }}</p>
                  <p class="text-sm font-black uppercase text-slate-800 truncate">{{ comanda.mesa_nombre || `Mesa ${comanda.mesa_numero || comanda.mesa_id}` }}</p>
                  <p class="text-[10px] font-semibold text-slate-500 mt-1">Comanda #{{ comanda.id }}</p>
                  <p class="text-[10px] font-semibold text-slate-500">{{ formatDateTime(comanda.fecha_hora) }}</p>
                </div>
                <div class="shrink-0 text-right">
                  <span class="badge border-sky-200 bg-sky-50 text-sky-700">{{ comanda.estado_comanda }}</span>
                  <p class="text-[11px] font-black text-orange-700 mt-2">{{ formatCurrency(comanda.total_final || comanda.total_sin_servicio) }}</p>
                </div>
              </div>
            </button>
          </article>
        </div>
      </aside>

      <!-- [SECCION] ContenedorProductos (Seccion central) -->
      <main class="xl:col-span-6 panel rounded-3xl p-4 md:p-5 min-h-[70vh]" data-ui="ContenedorProductos">
        <template v-if="!selectedComanda">
          <div class="h-full min-h-[56vh] rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 flex items-center justify-center p-6 text-center">
            <div>
              <i class="fas fa-cash-register text-4xl text-slate-300 mb-4"></i>
              <p class="text-sm font-bold uppercase tracking-widest text-slate-500">Selecciona una Comanda</p>
              <p class="text-xs font-semibold text-slate-400 mt-2">El detalle de productos aparecera aqui.</p>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="flex flex-col gap-4" data-ui="DetalleComandaColumna">

            <!-- [SECCION] EncabezadoClienteComanda -->
            <header class="rounded-2xl border border-slate-200 bg-orange-50/80 p-3 md:p-4" data-ui="EncabezadoClienteComanda">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="h-14 w-14 rounded-xl overflow-hidden border border-orange-200 bg-slate-100 shrink-0">
                    <img
                      :src="getPersonalImageUrl(selectedComanda.personal_url_foto, getMeseroNombre(selectedComanda))"
                      :alt="getMeseroNombre(selectedComanda)"
                      class="h-full w-full object-cover"
                      @error="handleImageError"
                    >
                  </div>
                  <div class="min-w-0">
                    <p class="text-[10px] uppercase tracking-widest font-black text-orange-700">Mesero</p>
                    <h3 class="cash-title text-xl font-black uppercase text-slate-800 truncate">{{ getMeseroNombre(selectedComanda) }}</h3>
                    <p class="text-[11px] font-semibold text-slate-500 mt-1">{{ formatDateTime(selectedComanda.fecha_hora) }}</p>
                  </div>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class="badge border-slate-200 bg-white text-slate-700">Comanda #{{ selectedComanda.id }}</span>
                  <span class="badge border-orange-200 bg-white text-orange-700">{{ selectedComanda.cliente_nombre || 'Consumidor final' }}</span>
                </div>
              </div>
            </header>

            <!-- [SECCION] DetalleProductos -->
            <section class="rounded-2xl border border-slate-200 bg-white p-4 flex-1" data-ui="DetalleProductos">
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
                      <p class="text-sm font-black text-orange-700">{{ formatCurrency(detalle.valor_subtotal) }}</p>
                    </div>
                  </div>
                </article>
              </div>
            </section>
          </div>
        </template>

      </main>

      <!-- [SECCION] PanelAccionesPago (Columna derecha) -->
      <aside
        v-if="selectedComanda"
        class="xl:col-span-3 panel rounded-2xl border border-slate-200 bg-white p-4 self-start xl:sticky xl:top-4 max-h-[70vh] overflow-y-auto"
        data-ui="PanelAccionesPago"
      >
        <!-- [ELEMENTO] LogoPanelPago -->
        <div class="flex justify-center mb-6">
          <img src="/img/logo.png" alt="Logo" class="h-14 w-auto object-contain panel-pago-logo" @error="handleImageError">
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
          <div class="flex items-center justify-between pt-2 border-t border-slate-200 text-base font-black text-orange-700">
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
        <div class="bg-orange-700 p-4 md:p-5 text-white flex justify-between items-center sticky top-0 z-20">
          <div>
            <h3 class="text-sm font-black uppercase tracking-[0.2em] italic">Registrar Pago</h3>
            <p class="text-[11px] font-semibold text-orange-100 mt-1">Mesa {{ selectedComanda?.mesa_id }} · {{ selectedComanda?.cliente_nombre || 'Consumidor final' }}</p>
          </div>
          <button @click="cerrarPago" class="btn-icon-text text-orange-100 hover:text-white hover:bg-orange-600 rounded-lg px-2 py-1 transition-colors text-[10px] font-black uppercase tracking-wide">
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
                  <p class="value-strong">{{ selectedComanda?.mesa_id }} - {{ selectedComanda?.mesa_nombre }}</p>
                </div>
                <div>
                  <p class="label-mini">Comanda</p>
                  <p class="value-strong">#{{ selectedComanda?.id }}</p>
                </div>
                <div>
                  <p class="label-mini">Cliente</p>
                  <p class="value-strong">{{ selectedComanda?.cliente_nombre || 'Consumidor final' }}</p>
                </div>
                <div>
                  <p class="label-mini">Fecha</p>
                  <p class="value-strong">{{ formatDateTime(selectedComanda?.fecha_hora) }}</p>
                </div>
              </div>
            </article>

            <article class="rounded-2xl border border-slate-200 bg-white p-3 space-y-3">
              <div>
                <label class="label-mini block mb-2">Subtotal</label>
                <div class="summary-box num-value">{{ formatCurrency(selectedComanda?.total_sin_servicio || 0) }}</div>
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
                :disabled="savingPago || !puedeRegistrarPago"
                @click="registrarPago"
              >
                <i :class="savingPago ? 'fas fa-circle-notch fa-spin' : 'fas fa-cash-register'"></i>
                <span>{{ savingPago ? 'Registrando...' : 'Registrar Pago' }}</span>
              </button>

              <p v-if="Math.round(totalRecibido) < Math.round(totalFinalPago)" class="text-xs font-semibold text-slate-500 mt-2">No se puede registrar el pago, el dinero recibido por el cliente no es suficiente.</p>
              <p v-else-if="efectivoInsuficienteParaDevuelta" class="text-xs font-semibold text-slate-500 mt-2">La devuelta se entrega en efectivo. El efectivo recibido debe ser mayor o igual a la devuelta.</p>
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
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useAuthStore } from '../../stores';
import { API_BASE_URL as API_BASE, buildApiUrl } from '../../config/api.js';
import { businessInfo } from '../../config/businessInfo.js';
import { buildPrecuentaHtml, buildTicketHtml } from '../../utils/ticketTemplates.js';
import { cajaService } from '../../services/cajaService.js';
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
  name: 'GestionMostrador',
  components: {
    CrearArqueo
  },
  setup() {
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
    const activeField = ref('monto_efectivo');
    const focusedKeypadField = ref('monto_efectivo');
    const lastTicket = ref(null);
    const logoDataUrl = ref(null);
    const servicioVoluntarioOverride = ref(null); // null = usar calculado automatico
    const showAudioAlert = ref(false);
    const activatingAudio = ref(false);

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

    const getFallbackAvatar = (name = 'Usuario') => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ffedd5&color=c2410c`;

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

    const getMeseroNombre = (comanda) => [comanda?.personal_nombres, comanda?.personal_apellidos].filter(Boolean).join(' ').trim() || 'Mesero';

    const aporteServicioPorcentaje = ref(0); // editable via teclado

    const servicioVoluntarioCalculado = computed(() => {
      const subtotal = Number(selectedComanda.value?.total_sin_servicio) || 0;
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
      // Forzamos que el subtotal sea número
      const subtotal = Number(selectedComanda.value?.total_sin_servicio) || 0;
      
      // Forzamos que el servicio sea número, si es "" o null, será 0
      const servicio = Number(servicioVoluntarioEditable.value) || 0;
      
      // Retornamos el redondeo absoluto
      return Math.round(subtotal + servicio);
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

    const devueltaPositiva = computed(() => {
      if (totalRecibido.value < totalFinalPago.value) return 0;
      return Math.round(totalRecibido.value - totalFinalPago.value);
    });

    const montoEfectivoNeto = computed(() => {
      if (!montoEfectivoHabilitado.value) return 0;
      const bruto = Number(payment.value.monto_efectivo) || 0;
      if (devueltaPositiva.value > 0) {
        return Math.max(0, Math.round(bruto - devueltaPositiva.value));
      }
      return bruto;
    });

    const montoDigitalNeto = computed(() => (
      montoTransferenciaHabilitado.value ? Number(payment.value.monto_transferencia) || 0 : 0
    ));

    const efectivoInsuficienteParaDevuelta = computed(() => {
      if (devueltaPositiva.value <= 0) return false;
      const bruto = Number(payment.value.monto_efectivo) || 0;
      return bruto < devueltaPositiva.value;
    });

    const puedeRegistrarPago = computed(() => {
      if (Math.round(totalRecibido.value) < Math.round(totalFinalPago.value)) return false;
      if (efectivoInsuficienteParaDevuelta.value) return false;
      return true;
    });

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

    const seleccionarComanda = async (id) => {
      try {
        const data = await cajaService.getComandaById(id);
        selectedComanda.value = data;
      } catch (error) {
        alert(error.message || 'No se pudo cargar la comanda.');
      }
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

    const abrirPago = () => {
      // --- Inicializa los campos de pago en 0 al abrir la ventana modal de pago ---
      const pct = Number(selectedComanda.value?.aporte_servicio_porcentaje) || 0;
      aporteServicioPorcentaje.value = roundMoney(pct);
      servicioVoluntarioOverride.value = null;
      payment.value = {
        metodo_pago: 'Efectivo',
        monto_efectivo: 0,         // Siempre inicia en 0
        monto_transferencia: 0,    // Siempre inicia en 0
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
    };

    const abrirRealizarArqueo = () => {
      showArqueoModal.value = true;
    };

    const cerrarRealizarArqueo = () => {
      showArqueoModal.value = false;
    };

    const onArqueoCreated = () => {
      cargarCaja({ silent: true });
      cerrarRealizarArqueo();
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
        const subtotal = Number(selectedComanda.value?.total_sin_servicio) || 0;
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
      if (!selectedComanda.value) return;

      const html = buildPrecuentaHtml(
        selectedComanda.value,
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
      if (!selectedComanda.value?.id) return;
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

      if (devueltaPositiva.value > 0 && efectivoRecibido < devueltaPositiva.value) {
        await Swal.fire({
          icon: 'error',
          title: 'Devuelta en efectivo',
          text: 'La devuelta se entrega en efectivo. El efectivo recibido debe ser mayor o igual a la devuelta.'
        });
        return;
      }

      const ticketEfectivoBruto = Number(payment.value.monto_efectivo || 0);
      const ticketTransferencia = montoDigitalNeto.value;
      const ticketTotalRecibido = totalRecibido.value;
      const ticketDevuelta = devueltaPositiva.value;

      savingPago.value = true;
      try {
        const paidComandaId = Number(selectedComanda.value.id);
        const data = await cajaService.registrarPago({
          comanda_id: paidComandaId,
          arqueo_id: null,
          aporte_servicio: servicioVoluntarioEditable.value,
          metodo_pago: payment.value.metodo_pago,
          monto_efectivo: montoEfectivoNeto.value,
          monto_efectivo_bruto: ticketEfectivoBruto,
          monto_digital: montoDigitalNeto.value,
          notas: payment.value.notas || null
        });

        lastTicket.value = data.venta;
        if (data?.venta) {
          imprimirTicket({
            ...data.venta,
            monto_efectivo: ticketEfectivoBruto,
            monto_digital: ticketTransferencia,
            total_recibido: ticketTotalRecibido,
            cambio: ticketDevuelta
          });
        }

        comandas.value = comandas.value.filter((item) => Number(item.id) !== paidComandaId);
        selectedComanda.value = null;
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

    const handleComandaPagada = async (payload = {}) => {
      const comandaId = Number(payload?.id_comanda || payload?.comanda_id || payload?.id || 0);
      const notificationId = Number(payload?.notification_id || 0);
      const dedupKey = `transition:pagada:${comandaId}:${notificationId}`;
      if (!shouldProcessSocketEvent(SOCKET_EVENTS.COMANDA_PAGADA, payload, dedupKey)) return;

      await cargarCaja({ silent: true }).catch(() => {
        // Silenciar errores de sincronización
      });
    };

    const handleComandaCerrada = async (payload = {}) => {

      // Agregar inmediatamente a la lista (actualización optimista) para que aparezca sin delay
      const comandaId = Number(payload?.id_comanda || payload?.comanda_id || payload?.id || 0);
      if (comandaId && !comandas.value.some(c => Number(c.id) === comandaId)) {
        console.log('✅ [Mostrador] Agregando comanda a la lista:', comandaId);
        comandas.value.push(payload);
      }

      // Refrescar desde el servidor en segundo plano para sincronizar totales y otros datos
      console.log('🔄 [Mostrador] Refrescando lista desde servidor...');
      await cargarCaja({ silent: true }).catch((err) => {
        console.warn('⚠️ Error refrescando caja:', err);
      });
    };

    onMounted(async () => {
      await fetchCashierProfile();
      await cargarCaja({ silent: false });
      preloadLogoDataUrl();
      window.addEventListener('keydown', handleGlobalKeypadInput);
      if (window.socket) {
        console.log('🔌 [Mostrador] Suscribiendo listeners de notificaciones');
        window.socket.on(SOCKET_EVENTS.COMANDA_CERRADA, handleComandaCerrada);
        window.socket.on(SOCKET_EVENTS.ABRIR_CAJON, handleAbrirCajon);
        window.socket.on(SOCKET_EVENTS.COMANDA_PAGADA, handleComandaPagada);
      }
    });

    onUnmounted(() => {
      window.removeEventListener('keydown', handleGlobalKeypadInput);
      if (window.socket) {
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
      loading,
      comandas,
      selectedComanda,
      showPagoModal,
      showGastoModal,
      savingPago,
      savingGasto,
      activeField,
      payment,
      gastoForm,
      aporteServicioPorcentaje,
      servicioVoluntarioCalculado,
      totalFinalPago,
      totalRecibido,
      devueltaPago,
      puedeRegistrarPago,
      efectivoInsuficienteParaDevuelta,
      showAudioAlert,
      activatingAudio,
      cargarCaja,
      seleccionarComanda,
      abrirPago,
      abrirGastoCaja,
      cerrarGastoCaja,
      cerrarPago,
      pressKey,
      registrarPago,
      registrarGastoCaja,
      getMeseroNombre,
      getPersonalImageUrl,
      getProductoImageUrl,
      handleImageError,
      formatCurrency,
      formatDateTime,
      roundMoney,
      parseLocaleNumber,
      focusedKeypadField,
      setKeypadFocus,
      onMetodoPagoChange,
      servicioVoluntarioEditable,
      servicioVoluntarioOverride,
      montoEfectivoHabilitado,
      montoTransferenciaHabilitado,
      desbloquearAudio,
      imprimirPrecuenta,
      showArqueoModal,
      abrirRealizarArqueo,
      cerrarRealizarArqueo,
      onArqueoCreated
    };
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Montserrat:wght@600;700;800&family=Sora:wght@600;700;800&display=swap');
.cash-shell {
  --bg-a: #fff7ed;
  --bg-b: #ffedd5;
  --panel: rgba(255, 255, 255, 0.88);
  background:
    radial-gradient(circle at 8% 8%, rgba(234, 88, 12, 0.12) 0, transparent 34%),
    radial-gradient(circle at 88% 8%, rgba(251, 146, 60, 0.16) 0, transparent 28%),
    linear-gradient(180deg, var(--bg-a), var(--bg-b));
  border-radius: 2rem;
  font-family: 'Manrope', sans-serif;
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
.cash-hero {
  background:
    linear-gradient(135deg, rgba(124, 45, 18, 0.96), rgba(234, 88, 12, 0.9)),
    radial-gradient(circle at 85% 22%, rgba(254, 215, 170, 0.35), transparent 48%);
  box-shadow: 0 24px 60px rgba(234, 88, 12, 0.18);
}
.quick-expense-btn { box-shadow: 0 18px 30px rgba(245, 158, 11, 0.22); }
.quick-arqueo-btn { box-shadow: 0 18px 30px rgba(13, 148, 136, 0.22); }
.cash-title { font-family: 'Sora', sans-serif; letter-spacing: -0.02em; }
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
.timeline-line { width: 2px; background: linear-gradient(180deg, #fdba74, #ffedd5); }
.timeline-dot { width: 10px; height: 10px; border-radius: 999px; background: #ea580c; box-shadow: 0 0 0 4px rgba(234, 88, 12, 0.14); }
.label-mini { font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; font-weight: 900; color: rgb(100 116 139 / 1); }
.value-strong { font-size: 0.95rem; font-weight: 800; color: rgb(15 23 42 / 1); }
.summary-box { border: 1px solid rgb(226 232 240 / 1); background: rgb(248 250 252 / 1); border-radius: 1rem; padding: 0.9rem 1rem; font-weight: 800; color: rgb(15 23 42 / 1); }
.summary-box-strong { color: rgb(234 88 12 / 1); font-size: 1.1rem; }
.form-input {
  width: 100%; border: 1px solid rgb(226 232 240 / 1); border-radius: 1rem; padding: 0.85rem 1rem;
  font-size: 0.95rem; font-weight: 700; color: rgb(15 23 42 / 1); background: white; outline: none;
}
.form-input:focus { border-color: rgb(251 146 60 / 1); box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.18); }
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
.amount-display-active { border-color: rgb(251 146 60 / 1); box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.18); }
.amount-display-disabled { opacity: 0.38; cursor: not-allowed; background: rgb(248 250 252 / 1); color: rgb(148 163 184 / 1); }
.field-active { border-color: rgb(251 146 60 / 1) !important; box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.18); }
.num-value { text-align: right; font-variant-numeric: tabular-nums; }
.keypad-btn {
  border: 1px solid rgb(254 215 170 / 1); background: rgb(255 247 237 / 1); color: rgb(194 65 12 / 1); border-radius: 1rem; min-height: 76px; font-size: 1.4rem; font-weight: 900; transition: all 0.18s ease;
}
.keypad-btn:hover { background: rgb(255 237 213 / 1); transform: translateY(-1px); }
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
</style>

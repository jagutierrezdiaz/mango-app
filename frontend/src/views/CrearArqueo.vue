<template>
  <div class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
    @click.self="closeModal">
    <div
      class="w-full max-w-7xl h-auto max-h-[90vh] overflow-y-auto rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.22)] flex flex-col">
      <div
        class="border-b border-slate-200 bg-[linear-gradient(135deg,#ecfeff,#f8fafc)] px-5 py-4 md:px-6 md:py-5 flex items-start justify-between gap-4">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.22em] text-teal-600">Caja / Cierre de Turno</p>
          <h3 class="mt-1 text-2xl font-black italic tracking-tight text-slate-900">Cierre de Turno y Conteo</h3>
          <p class="mt-2 text-sm font-medium text-slate-600">Vista exclusiva para validar el efectivo real, cuadrar caja
            y finalizar el turno sin traslados ni gastos manuales.</p>
        </div>
        <button @click="closeModal"
          class="h-10 w-10 shrink-0 rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <form class="flex flex-col p-4 md:p-6" @submit.prevent="submitForm">
        <div class="flex flex-1 flex-col gap-5">
          <section class="panel-shell flex-1">

            <div class="section-head">
              <div>
                <p class="section-kicker">Lectura del Sistema</p>
                <h4 class="section-title">Resumen calculado automáticamente</h4>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right">
                <p class="mini-label mb-1">Fecha de corte</p>

                <el-date-picker v-model="selectedFecha" type="date" format="YYYY-MM-DD" value-format="YYYY-MM-DD"
                  placeholder="Seleccione Fecha" :default-value="new Date()" @change="onFechaChange"
                  style="width: 100%;" />

                <p v-if="selectedFecha" class="mt-2 text-[10px] font-bold uppercase tracking-wider text-red-500">
                </p>
                <p v-else class="mt-2 text-[10px] font-bold uppercase tracking-wider text-amber-500">
                  ⚠️ Esperando selección de fecha...
                </p>
              </div>
            </div>

            <div class="grid gap-3 box-container">

              <article class="metric-card col-base">
                <p class="mini-label">Base de Caja</p>
                <p class="metric-value text-slate-800">{{ formatMoney(form.base_inicial) }}</p>
              </article>

              <article class="metric-card col-te">
                <p class="mini-label ">Total Efectivo</p>
                <p class="metric-value text-emerald-700">{{ formatMoney(Number(form.propinas_efectivo) +
                  Number(form.efectivo_recibido)) }}</p>
              </article>

              <article class="metric-card col-tt">
                <p class="mini-label">Total Transferencia</p>
                <p class="metric-value text-emerald-700">{{ formatMoney(Number(form.propinas_transferencia) +
                  Number(form.digital_recibido)) }}</p>
              </article>

              <article class="metric-card col-tg">
                <p class="mini-label">Gastos Registrados en Turno</p>
                <p class="metric-value">{{ formatMoney(form.total_egresos) }}</p>
              </article>

              <article class="metric-card col-tpe">
                <p class="mini-label">Total Propinas Efectivo</p>
                <p class="metric-value text-amber-700">{{ formatMoney(form.propinas_efectivo) }}</p>
                <p class="metric-help">Cuenta contable 238505</p>
              </article>

              <article class="metric-card col-ve">
                <p class="mini-label">Ventas Efectivo</p>
                <p class="metric-value text-emerald-700">{{ formatMoney(form.efectivo_recibido) }}</p>
              </article>

              <article class="metric-card col-tpt">
                <p class="mini-label">Total Propinas Transferencia</p>
                <p class="metric-value text-amber-700">{{ formatMoney(form.propinas_transferencia) }}</p>
                <p class="metric-help">Cuenta contable 238505</p>
              </article>

              <article class="metric-card col-vt">
                <p class="mini-label">Ventas Transferencia</p>
                <p class="metric-value text-sky-700">{{ formatMoney(form.digital_recibido) }}</p>
              </article>

              <article class="metric-card metric-card-accent col-se">
                <p class="mini-label text-teal-700">Total Esperado = Efectivo + Transferencia</p>
                <p class="metric-value text-teal-700">{{ formatMoney(form.saldo_esperado) }}</p>
                <p class="metric-help text-teal-700/80">Base + ventas efectivo - gastos del turno</p>
              </article>

              <div class="result-card col-dc" :class="differenceTone.card">
                <p class="mini-label" :class="differenceTone.kicker">Diferencia en tiempo real</p>
                <p class="mt-3 text-2xl font-black tracking-tight num-value" :class="differenceTone.value">{{
                  formatMoney(diferenciaCaja) }}</p>
                <p class="mt-2 font-black t-md"" :class="differenceTone.value">{{ differenceTone.title }}</p>
                <p class="mt-2 font-medium t-sm" :class="differenceTone.help">{{ differenceTone.description }}
                </p>
              </div>

              <div class="space-y-4 col-er">
                <label class="block">
                  <span class="mini-label mb-2 block">Total Real = Efectivo + Trasferencias</span>
                  <input :value="efectivoRealInput" type="text" inputmode="decimal" class="cash-hero-input num-value"
                    @input="onEfectivoRealInput" @blur="onEfectivoRealBlur">
                </label>

                <div class="flex gap-2">
                  <div class="rounded-[0.8rem] border border-slate-200 bg-slate-50 px-4 py-3">
                    <p class="mini-label">Modo actual</p>
                    <p class="mt-1 t-sm font-bold text-slate-700">
                      Ingrese directamente el efectivo físico total contado en caja.
                    </p>
                  </div>

                  <div class="readonly-box">
                    <p class="mini-label">Estado final esperado</p>
                    <p class="mt-2 t-sm font-black text-slate-900">{{ Math.abs(diferenciaCaja) <= 0.009
                      ? 'Caja Cuadrada' : 'Requiere ajuste contable automatico' }}</p>
                  </div>
                </div>

              </div>


              <div class="space-y-3 col-obs">
                <div>
                  <label class="mini-label mb-2 block">Observaciones de cierre</label>
                  <textarea v-model="form.observaciones" rows="7" class="notes-input"
                    placeholder="Observaciones del cierre de turno"></textarea>
                </div>
              </div>
            </div>

          </section>
        </div>

        <div
          class="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-white/95 px-4 pb-1 pt-4 backdrop-blur md:-mx-6 md:px-6">
          <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-sm font-semibold text-slate-500">El arqueo relaciona solo las ventas de la fecha
              seleccionada, y se puede realizar varias veces en la misma fecha.</p>
            <div class="flex items-center justify-end gap-3">
              <button type="button" @click="closeModal" class="secondary-btn">Cancelar</button>


              <button type="submit" :disabled="saving"
                class="primary-btn disabled:opacity-50 disabled:cursor-not-allowed">
                <i :class="saving ? 'fas fa-circle-notch fa-spin' : 'fas fa-lock'"></i>
                <span>{{ saving ? 'Finalizando...' : 'Cerrar Arqueo' }}</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script>

import { computed, ref, watch } from 'vue';
import { arqueoCajaService } from '../services/arqueoCajaService.js';
import { getSaldoCajaGeneral } from '../services/trasladosDinerosServices.js';
import Swal from 'sweetalert2'; // Asegúrate de tenerlo instalado: npm install sweetalert2
import { getPdfTools } from '../utils/lazyVendors.js';



const parseNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (value) => Number(parseNumber(value).toFixed(2));

const getTodayDate = () => new Date().toISOString().slice(0, 10);

const MONEY_FORMATTER = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

const LOCALE_PARTS = MONEY_FORMATTER.formatToParts(12345.6);
const LOCALE_GROUP = LOCALE_PARTS.find((part) => part.type === 'group')?.value || '.';
const LOCALE_DECIMAL = LOCALE_PARTS.find((part) => part.type === 'decimal')?.value || ',';

const defaultFormState = () => ({
  fecha_apertura: '',
  fecha_cierre: '',
  base_inicial: 0,
  efectivo_recibido: 0,
  digital_recibido: 0,
  total_egresos: 0,
  efectivo_verificado: 0,
  comandas_aprobadas: 0,
  comandas_anuladas: 0,
  estado: 'Abierto',
  observaciones: ''
});

const sanitizeMoneyInput = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return 0;

  const normalized = raw
    .replace(/\s+/g, '')
    .replace(/[\$   ? ????R$]/g, '')
    .replace(new RegExp(`\\${LOCALE_GROUP}`, 'g'), '')
    .replace(new RegExp(`\\${LOCALE_DECIMAL}`, 'g'), '.')
    .replace(/,/g, '.')
    .replace(/[^\d.-]/g, '');

  return parseNumber(normalized);
};

export default {
  name: 'CrearArqueo',
  props: {
    open: {
      type: Boolean,
      default: false
    },
    fecha: {
      type: String,
      required: true
    },
    personaId: {
      type: [Number, String],
      default: null
    },
    arqueoId: {
      type: [Number, String],
      default: null
    }
  },
  emits: ['close', 'created'],


  setup(props, { emit }) {
    // 1. PRIMERO: Todas las variables (Refs)

    const loading = ref(false);
    const saving = ref(false);
    const form = ref(defaultFormState());

    // 2. ESTAS DOS DEBEN ESTAR AQUÍ ARRIBA
    const hoy = new Date();
    const selectedFecha = ref(
      `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
    );
    const efectivoRealInput = ref(MONEY_FORMATTER.format(0));
    const currentYear = new Date().getFullYear();
    

    const imprimirReporte = async (item) => {

      let jsPDF;
      try {
        const pdfTools = await getPdfTools();
        jsPDF = pdfTools.jsPDF;
      } catch (err) {
        alert('No fue posible cargar dependencias de PDF.');
        return;
      }

      const width = 48; // mm (ancho fijo requerido)
      const height = 300; // suficiente para contenido; el lector ajustará el zoom
      const margin = 0.5;

      const doc = new jsPDF({ unit: 'mm', format: [width, height] });
      let y = margin;
      y += 3;

      // Intentar cargar y dibujar el logo en la parte superior (si existe)
      const loadImage = (src) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      });

      try {
        const logoImg = await loadImage(COMPANY_LOGO_URL);
        if (logoImg) {
          const imgWidth = 30; // mm
          const imgHeight = (logoImg.height / logoImg.width) * imgWidth;
          const imgX = (width - imgWidth) / 2;
          // addImage acepta un HTMLImageElement
          doc.addImage(logoImg, 'PNG', imgX, y, imgWidth, imgHeight);
          y += imgHeight + 2;
        }
      } catch (e) {
        // Si falla la carga del logo, continuar sin él
      }


      y += 4;
      doc.setFontSize(7.5);
      doc.text('REPORTE DE ARQUEO', width / 2, y, { align: 'center' });
      y += 4;

      doc.setLineWidth(0.4);
      doc.setLineDash([2, 1], 0); // [dashLength, gapLength]
      doc.line(margin, y, width - margin, y);
      doc.setLineDash([], 0); // restaurar a sólido
      y += 4;

      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(`Arqueo ID: ${item.id}`, margin, y);
      doc.text(`Estado: ${item.estado || '---'}`, width - margin, y, { align: 'right' });
      y += 5;

      doc.text(`Cajero: ${item.personal_nombre || '---'}`, margin, y);
      y += 5;

      doc.text(`Fecha Arqueo: ${formatDateTime(item.fecha_cierre)}`, margin, y);
      y += 4;

      doc.setLineWidth(0.4);
      doc.setLineDash([2, 1], 0); // [dashLength, gapLength]
      doc.line(margin, y, width - margin, y);
      doc.setLineDash([], 0); // restaurar a sólido
      y += 4;

      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.text('CONSOLIDADO DE MOVIMIENTOS', width / 2, y, { align: 'center' });
      doc.setFont(undefined, 'normal');
      y += 6;

      const line = (label, value, opts = {}) => {
        doc.text(label, margin + (opts.indent || 0), y);
        doc.text(value, width - margin, y, { align: 'right' });
        y += 5;
      };

      line('(+) Base Inicial:', formatMoney(item.saldo_inicial));
      line('(+) Total Efectivo :', formatMoney(Number(item.ventas_efectivo) + Number(item.aporte_efectivo)));
      line('  (+) Ventas', formatMoney(item.ventas_efectivo), { indent: 1 });
      line('  (+) Propinas', formatMoney(item.aporte_efectivo), { indent: 1 });
      line('(+) Total Transf.:', formatMoney(Number(item.ventas_digital) + Number(item.aporte_digital)));
      line('  (+) Ventas', formatMoney(item.ventas_digital), { indent: 1 });
      line('  (+) Propinas', formatMoney(item.aporte_digital), { indent: 1 });
      line('(-) Gastos del Turno:', formatMoney(item.gastos_efectivo));

      doc.setLineWidth(0.4);
      doc.setLineDash([2, 1], 0); // [dashLength, gapLength]
      doc.line(margin, y, width - margin, y);
      doc.setLineDash([], 0); // restaurar a sólido
      y += 4;

      doc.setFont(undefined, 'bold');
      doc.text('VERIFICACION FISICA', width / 2, y, { align: 'center' });
      doc.setFont(undefined, 'normal');
      y += 4;

      line('Efectivo Esperado:', formatMoney(item.saldo_esperado));
      line('Efectivo real:', formatMoney(item.saldo_real));

      doc.setLineWidth(0.4);
      doc.setLineDash([2, 1], 0); // [dashLength, gapLength]
      doc.line(margin, y, width - margin, y);
      doc.setLineDash([], 0); // restaurar a sólido
      y += 4;

      doc.setFontSize(7);
      line('DIFERENCIA (FALTANTE):', formatMoney(item.diferencia));
      const hubo = Math.abs(Number(item.diferencia || 0)) > 0.009 ? 'SI' : 'NO';
      line('HUBO DESCUADRE:', hubo);


      doc.setLineWidth(0.4);
      doc.setLineDash([2, 1], 0); // [dashLength, gapLength]
      doc.line(margin, y, width - margin, y);
      doc.setLineDash([], 0); // restaurar a sólido
      y += 4;

      y += 5;
      doc.text('Firma Cajero: ____________________', margin, y);
      y += 5;
      doc.text('Firma Admin:  ____________________', margin, y);
      y += 5;

      doc.setFontSize(8);
      y += 3;
      doc.text('GRACIAS POR SU GESTION', width / 2, y, { align: 'center' });

      doc.save(`arqueo-${item.id}.pdf`);
    };


    const cargarDatosPrecarga = async (fechaConsultar) => {

      if (!fechaConsultar) return;
      let baseDesdeServicio = null;
      try {
        loading.value = true;
        const res = await arqueoCajaService.getPreload(fechaConsultar);
        console.log('Datos de precarga (raw):', res);
        if (res) { // Solo verifica que res exista
          form.value.base_inicial = Number(res.base_inicial ?? 0);
          form.value.efectivo_recibido = Number(res.efectivo_sistema ?? 0);
          form.value.digital_recibido = Number(res.digital_sistema ?? 0);
          form.value.propinas_efectivo = Number(res.propinas_efectivo ?? 0);
          form.value.propinas_transferencia = Number(res.propinas_transferencia ?? 0);
          form.value.total_egresos = Number(res.gastos ?? 0);
          form.value.saldo_esperado = Number(res.saldo_esperado ?? 0);
        }

        // Si la precarga no trajo una base válida, intentar obtenerla desde el servicio
        try {
          baseDesdeServicio = await getSaldoCajaGeneral();
          if (!res || Number(res.base_inicial ?? 0) === 0) {
            form.value.base_inicial = Number(baseDesdeServicio || 0);
          }
          console.log('Base de caja (service) cargada:', baseDesdeServicio);
        } catch (errBase) {
          console.error('Error al cargar base de caja desde servicio:', errBase);
        }

        // Log de depuración: estado final de precarga y form
        try {
          console.log('Precarga completa:', {
            precarga: res || null,
            baseDesdeServicio,
            form: { ...form.value }
          });
        } catch (errLog) {
          console.error('Error al serializar datos de precarga para log:', errLog);
        }
      } catch (error) {
        console.error("❌ Error en la precarga:", error);
      } finally {
        loading.value = false;
      }
    };

    // 3. UN SOLO WATCHER (Limpio y en el orden correcto)
    watch(() => selectedFecha.value, (newFecha) => {
      if (newFecha) {
        cargarDatosPrecarga(newFecha);
      }
    }, { immediate: true });

    // 4. EVENTO DEL CALENDARIO
    const onFechaChange = (val) => {
      if (!val) {
        form.value = defaultFormState();
        return;
      }

      cargarDatosPrecarga(val);
    };

    const formatMoney = (value) => Math.round(parseNumber(value)).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    const formatInputMoney = (value) => MONEY_FORMATTER.format(parseNumber(value));

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

    const efectivoRealCaja = computed(() => roundMoney(parseNumber(form.value.efectivo_verificado)));

    const diferenciaCaja = computed(() => roundMoney(efectivoRealCaja.value - parseNumber(form.value.saldo_esperado)));

    const differenceTone = computed(() => {
      if (Math.abs(diferenciaCaja.value) <= 0.009) {
        return {
          title: 'Caja Cuadrada',
          description: 'El efectivo físico coincide exactamente con el saldo esperado.',
          card: 'border-emerald-200 bg-emerald-50/80',
          kicker: 'text-emerald-700',
          value: 'text-emerald-700',
          help: 'text-emerald-700/80'
        };
      }
      if (diferenciaCaja.value < 0) {
        return {
          title: 'Faltante de Caja',
          description: 'El efectivo real está por debajo del saldo esperado.',
          card: 'border-rose-200 bg-rose-50/80',
          kicker: 'text-rose-700',
          value: 'text-rose-700',
          help: 'text-rose-700/80'
        };
      }
      return {
        title: 'Sobrante de Caja',
        description: 'El efectivo real supera el saldo esperado.',
        card: 'border-sky-200 bg-sky-50/80',
        kicker: 'text-sky-700',
        value: 'text-sky-700',
        help: 'text-sky-700/80'
      };
    });

    const onEfectivoRealInput = (event) => {
      const raw = String(event?.target?.value || '');
      form.value.efectivo_verificado = sanitizeMoneyInput(raw);
      efectivoRealInput.value = raw;
    };

    const onEfectivoRealBlur = () => {
      form.value.efectivo_verificado = sanitizeMoneyInput(efectivoRealInput.value);
      efectivoRealInput.value = formatInputMoney(form.value.efectivo_verificado);
    };

    const submitForm = async () => {
      if (saving.value) return;

      // 1. VALIDACIÓN CONTABLE: ¿Hay efectivo o transferencias en la fecha seleccionada?
      const totalEfectivo = Number(form.value.propinas_efectivo) + Number(form.value.efectivo_recibido);
      const totalTransferencia = Number(form.value.propinas_transferencia) + Number(form.value.digital_recibido);

      if (totalEfectivo <= 0 && totalTransferencia <= 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'Arqueo vacío',
          text: 'No hay valores de Efectivo y/o Transferencias en la fecha seleccionada, para realizar el arqueo.',
          confirmButtonColor: '#e11d48'
        });
        return;
      }

      // 2. CONFIRMACIÓN INTERACTIVA DEL CAJERO
      const { isConfirmed } = await Swal.fire({
        icon: 'question',
        title: 'Confirmación',
        text: '¿Están correctos los datos para realizar el arqueo?',
        showCancelButton: true,
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'No, cancelar',
        confirmButtonColor: '#006d64',
        cancelButtonColor: '#64748b'
      });

      if (!isConfirmed) return;

      saving.value = true;

      try {
        const payload = {
          fecha: selectedFecha.value,
          usuario_id: props.personaId,
          efectivo_verificado: efectivoRealCaja.value,
          observaciones: form.value.observaciones,
          base_inicial: form.value.base_inicial,
          efectivo_sistema: form.value.efectivo_recibido,
          digital_sistema: form.value.digital_recibido,
          propinas_efectivo: form.value.propinas_efectivo,
          propinas_transferencia: form.value.propinas_transferencia,
          gastos: form.value.total_egresos,
          saldo_esperado: form.value.saldo_esperado
        };

        const response = await arqueoCajaService.crearArqueo(payload);

        // Ahora response.success será true gracias al cambio en el servicio
        if (response.success) {
          // IMPORTANTE: desactivamos saving antes de la alerta para evitar errores de Vue
          saving.value = false;

          await Swal.fire({
            icon: 'success',
            title: 'Cierre de Caja Realizado',
            text: 'El arqueo se ha guardado y contabilizado correctamente.',
            confirmButtonColor: '#006d64'
          });

          imprimirReporte(response.data);

          emit('created', response.data);
          closeModal();
        }
      } catch (error) {
        saving.value = false;
        Swal.fire('Error', error.message || 'No se pudo finalizar el arqueo.', 'error');
      }
    };


    const closeModal = () => emit('close');

    const saldo_esperado = computed(() => roundMoney(parseNumber(form.value.saldo_esperado)));


    return {
      closeModal, diferenciaCaja, differenceTone, efectivoRealCaja,
      efectivoRealInput, form, formatDateTime, formatMoney,
      onEfectivoRealBlur, onEfectivoRealInput, personaId: props.personaId,
      saldo_esperado, saving, submitForm, onFechaChange,
      selectedFecha, currentYear, loading // No olvides devolver loading si lo usas
    };


  }

};


</script>

<style scoped>
.panel-shell {
  border: 1px solid #e2e8f0;
  border-radius: 1.4rem;
  background: linear-gradient(180deg, #ffffff, #fbfdff);
  padding: 1rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.section-kicker,
.mini-label {
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: #64748b;
}

.section-title {
  margin-top: 0.25rem;
  font-size: 1.15rem;
  font-weight: 900;
  color: #0f172a;
}

.metric-card {
  min-width: 180px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  padding: 0.5rem 0.5rem;
}

.metric-card-accent {
  background: linear-gradient(180deg, #ecfeff, #f0fdfa);
  border-color: #99f6e4;
}

.metric-value {
  margin-top: 0.2rem;
  font-size: 1rem;
  line-height: 1;
  font-weight: 900;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.metric-help {
  margin-top: 0.2rem;
  font-size: 0.6rem;
  font-weight: 700;
  color: #64748b;
}

.readonly-box {
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  background: #f8fafc;
  padding: 0.85rem 1rem;
}

.readonly-amount {
  margin-top: 0.45rem;
  font-size: 1.1rem;
  font-weight: 900;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
}

.cash-hero-input,
.notes-input {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 0.7rem;
  background: #fff;
  color: #0f172a;
}

.cash-hero-input {
  padding: 0.8rem;
  text-align: right;
  font-size: 1.2rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  box-shadow: 0 0 0 4px rgba(204, 251, 241, 0.45);
}

.notes-input {
  min-height: 92px;
  padding: 0.9rem 1rem;
  font-size: 0.95rem;
  font-weight: 600;
  resize: vertical;
}

.result-card {
  border-width: 1px;
  border-style: solid;
  border-radius: 1.35rem;
  padding: 1.15rem 1.2rem;
}

.secondary-chip,
.secondary-btn,
.primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  transition: all 160ms ease;
}

.secondary-chip,
.secondary-btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #475569;
}

.secondary-chip {
  padding: 0.75rem 1rem;
}

.secondary-btn {
  padding: 0.85rem 1.1rem;
}

.primary-btn {
  border: 1px solid #0f766e;
  background: linear-gradient(135deg, #0f766e, #115e59);
  color: #fff;
  padding: 0.9rem 1.25rem;
  box-shadow: 0 16px 30px rgba(15, 118, 110, 0.18);
}

.cash-hero-input:focus,
.notes-input:focus {
  outline: none;
  border-color: #14b8a6;
  box-shadow: 0 0 0 3px rgba(153, 246, 228, 0.55);
}

.num-value {
  font-variant-numeric: tabular-nums;
}

.t-md {
  font-size: 0.875rem;
}

.t-sm {
  font-size: 0.75rem;
}

.box-container {
  grid-template-areas:
    'col-base col-te col-te col-tt col-tt col-tg'
    'col-base col-tpe col-ve col-tpt col-vt col-se'
    'col-dc col-dc col-obs col-obs col-er col-er';
}

.col-base {
  grid-area: col-base;
}

.col-te {
  grid-area: col-te;
}

.col-tt {
  grid-area: col-tt;
}

.col-tg {
  grid-area: col-tg;
}

.col-tpe {
  grid-area: col-tpe;
}

.col-ve {
  grid-area: col-ve;
}

.col-tpt {
  grid-area: col-tpt;
}

.col-vt {
  grid-area: col-vt;
}

.col-se {
  grid-area: col-se;
}

.col-dc {
  grid-area: col-dc;
}

.col-er {
  grid-area: col-er;
}

.col-obs {
  grid-area: col-obs;
}

@media (max-width: 768px) {
  .section-head {
    flex-direction: column;
  }

  .panel-shell {
    padding: 0.9rem;
  }
}
</style>

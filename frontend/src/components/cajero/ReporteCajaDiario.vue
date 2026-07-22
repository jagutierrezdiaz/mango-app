<template>
  <div v-if="loading" class="hidden">Generando reporte...</div>
</template>

<script>
import { ref } from 'vue';
import { cajaService } from '../../services/cajaService.js';
import { businessInfo } from '../../config/businessInfo.js';
import { buildReporteCajaHtml } from '../../utils/ticketTemplates.js';

const COMPANY_LOGO_URL = '/img/logo.png';

export default {
  name: 'ReporteCajaDiario',
  props: {
    cajeroNombre: {
      type: String,
      default: 'Turno activo'
    },
    logoDataUrl: {
      type: String,
      default: null
    }
  },
  setup(props, { expose }) {
    const loading = ref(false);

    const imprimirHtml = (html) => {
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

    const generar = async () => {
      loading.value = true;
      try {
        const data = await cajaService.getReporteCajaHoy();
        const html = buildReporteCajaHtml(
          {
            ...data,
            cajero_nombre: props.cajeroNombre
          },
          businessInfo,
          props.logoDataUrl || COMPANY_LOGO_URL,
          { skipAutoPrint: true }
        );
        imprimirHtml(html);
      } catch (error) {
        alert(error.message || 'No se pudo generar el reporte de caja.');
      } finally {
        loading.value = false;
      }
    };

    expose({ generar });

    return { loading };
  }
};
</script>

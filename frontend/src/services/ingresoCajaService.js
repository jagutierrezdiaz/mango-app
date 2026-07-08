import { API_BASE_URL as API_BASE } from '../config/api.js';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

const parseResult = async (response, fallbackMessage) => {
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    const error = new Error(result.message || fallbackMessage);
    error.payload = result?.data;
    throw error;
  }
  return result;
};

const buildDateQuery = (filters = {}) => {
  const params = new URLSearchParams();
  const fechaInicio = filters.fecha_inicio || filters.fechaInicio || '';
  const fechaFinal = filters.fecha_final || filters.fechaFinal || '';

  if (fechaInicio) {
    params.append('fecha_inicio', fechaInicio);
  }

  if (fechaFinal) {
    params.append('fecha_final', fechaFinal);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
};

export const ingresoCajaService = {
  async getIngresos(filters = {}) {
    const response = await fetch(`${API_BASE}/caja/ingresos${buildDateQuery(filters)}`, {
      headers: authHeaders()
    });
    const result = await parseResult(response, 'No se pudo obtener ingresos.');
    return Array.isArray(result.data) ? result.data : [];
  },

  async getIngresoById(id) {
    const response = await fetch(`${API_BASE}/caja/ingresos/${id}`, {
      headers: authHeaders()
    });
    const result = await parseResult(response, 'No se pudo obtener el ingreso.');
    return result.data || null;
  },

  async getResumen(filters = {}) {
    const response = await fetch(`${API_BASE}/caja/resumen${buildDateQuery(filters)}`, {
      headers: authHeaders()
    });
    const result = await parseResult(response, 'No se pudo obtener el resumen.');
    // Expected backend shape: { success: true, data: { resumen: {...}, rows: [...] } }
    if (!result || !result.data) return { resumen: null, rows: [] };
    const resumen = result.data.resumen || null;
    const rows = Array.isArray(result.data.rows) ? result.data.rows : [];
    return { resumen, rows };
  }
,

  async getIngresosDesglosados(filters = {}) {
    const response = await fetch(`${API_BASE}/caja/ingresos-desglosados${buildDateQuery(filters)}`, {
      headers: authHeaders()
    });
    const result = await parseResult(response, 'No se pudo obtener los ingresos desglosados.');
    return Array.isArray(result.data) ? result.data : [];
  }
};

import { API_BASE_URL as API_BASE } from '../config/api.js';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

const parseResult = async (response, fallbackMessage) => {
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    throw new Error(result.message || fallbackMessage);
  }
  return result;
};

export const auditoriaService = {
  /**
   * Obtiene el listado de auditoría con filtros opcionales
   * @param {Object} filters - Filtros opcionales { tabla, operacion, fechaDesde, fechaHasta, limit, offset }
   * @returns {Promise<Object>} { data: Array, pagination: Object }
   */
  async getAll(filters = {}) {
    const queryParams = new URLSearchParams();
    
    if (filters.tabla) queryParams.append('tabla', filters.tabla);
    if (filters.operacion) queryParams.append('operacion', filters.operacion);
    if (filters.fechaDesde) queryParams.append('fechaDesde', filters.fechaDesde);
    if (filters.fechaHasta) queryParams.append('fechaHasta', filters.fechaHasta);
    if (filters.limit) queryParams.append('limit', filters.limit);
    if (filters.offset) queryParams.append('offset', filters.offset);

    const queryString = queryParams.toString();
    const url = queryString ? `${API_BASE}/auditoria?${queryString}` : `${API_BASE}/auditoria`;

    const response = await fetch(url, {
      method: 'GET',
      headers: authHeaders()
    });

    const result = await parseResult(response, 'No se pudieron cargar los registros de auditoría.');
    return {
      data: Array.isArray(result.data) ? result.data : [],
      pagination: result.pagination || { total: 0, limit: 100, offset: 0, totalPages: 0 }
    };
  },

  /**
   * Obtiene un resumen estadístico de las operaciones de auditoría
   * @returns {Promise<Array>} Array de resumen con conteos por operación
   */
  async getResumen() {
    const response = await fetch(`${API_BASE}/auditoria/resumen`, {
      method: 'GET',
      headers: authHeaders()
    });

    const result = await parseResult(response, 'No se pudo cargar el resumen de auditoría.');
    return Array.isArray(result.data) ? result.data : [];
  }
};

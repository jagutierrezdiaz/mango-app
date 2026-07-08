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
  const normalizedFilters = typeof filters === 'string'
    ? { fecha: filters }
    : (filters || {});

  const fecha = normalizedFilters.fecha || '';
  const fechaInicio = normalizedFilters.fecha_inicio || normalizedFilters.fechaInicio || '';
  const fechaFinal = normalizedFilters.fecha_final || normalizedFilters.fechaFinal || '';

  if (fecha) {
    params.append('fecha', fecha);
  } else {
    if (fechaInicio) {
      params.append('fecha_inicio', fechaInicio);
    }
    if (fechaFinal) {
      params.append('fecha_final', fechaFinal);
    }
  }
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const arqueoCajaService = {
  async getArqueosByFecha(filters = {}) {
    const response = await fetch(`${API_BASE}/caja/arqueos${buildDateQuery(filters)}`, {
      headers: authHeaders()
    });
    const result = await parseResult(response, 'No se pudo obtener arqueos de caja.');
    return Array.isArray(result.data) ? result.data : [];
  },

  async getPreload(fecha) {
    const response = await fetch(`${API_BASE}/caja/arqueos/preload${buildDateQuery(fecha)}`, {
      headers: authHeaders()
    });
    const result = await parseResult(response, 'No se pudo obtener datos base del arqueo.');
    return result.data || null;
  },


  async crearArqueo(payload) {
    const response = await fetch(`${API_BASE}/caja/arqueos`, {
      method: 'POST',
      headers: authHeaders(), // Asegúrate de que esto incluya el Token
      body: JSON.stringify(payload)
    });

  
    

    const result = await parseResult(response, 'No se pudo crear el arqueo.');
      console.log('Response status:', result);
    console.log(result.data);
    // RETORNO AJUSTADO: Pasamos tanto el éxito como los datos
    return { 
      success: result.success, 
      data: result.data 
    };
  },

  async cerrarArqueo(id) {
    const response = await fetch(`${API_BASE}/caja/arqueos/${id}/cerrar`, {
      method: 'PATCH',
      headers: authHeaders()
    });
    const result = await parseResult(response, 'No se pudo cerrar el arqueo.');
    return result.data || null;
  },

  async getTraslados(arqueoId) {
    const response = await fetch(`${API_BASE}/caja/arqueos/${arqueoId}/traslados`, {
      headers: authHeaders()
    });
    const result = await parseResult(response, 'No se pudo obtener traslados de tesorería.');
    return Array.isArray(result.data) ? result.data : [];
  },

  async createTraslado(arqueoId, payload) {
    const response = await fetch(`${API_BASE}/caja/arqueos/${arqueoId}/traslados`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    const result = await parseResult(response, 'No se pudo registrar traslado de tesorería.');
    return result.data || null;
  },

  async updateTraslado(arqueoId, trasladoId, payload) {
    const response = await fetch(`${API_BASE}/caja/arqueos/${arqueoId}/traslados/${trasladoId}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    const result = await parseResult(response, 'No se pudo actualizar traslado de tesorería.');
    return result.data || null;
  },

  async deleteTraslado(arqueoId, trasladoId) {
    const response = await fetch(`${API_BASE}/caja/arqueos/${arqueoId}/traslados/${trasladoId}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    const result = await parseResult(response, 'No se pudo eliminar traslado de tesorería.');
    return result.data || null;
  }
};

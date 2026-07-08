import { API_BASE_URL as API_BASE } from '../config/api.js';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

const parseResult = async (response, fallbackMessage = 'Error de solicitud') => {
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    throw new Error(result.message || fallbackMessage);
  }
  return result;
};

export const kardexArticulosService = {
  async getMovimientos(filters = {}) {
    const params = new URLSearchParams();

    if (filters.fechaInicio) params.set('fecha_inicio', filters.fechaInicio);
    if (filters.fechaFinal) params.set('fecha_final', filters.fechaFinal);
    if (filters.sucursalId && filters.sucursalId !== 'TODAS') params.set('sucursal_id', filters.sucursalId);
    if (filters.articuloId && filters.articuloId !== 'TODOS') params.set('articulo_id', filters.articuloId);
    if (filters.tipoMovimiento && filters.tipoMovimiento !== 'TODOS') params.set('tipo_movimiento', filters.tipoMovimiento);

    const query = params.toString();
    const response = await fetch(`${API_BASE}/kardex-articulos${query ? `?${query}` : ''}`, {
      headers: authHeaders()
    });

    const result = await parseResult(response, 'No se pudo consultar movimientos de kardex.');
    return Array.isArray(result.data) ? result.data : [];
  },

  async getSucursales() {
    const response = await fetch(`${API_BASE}/kardex-articulos/sucursales`, {
      headers: authHeaders()
    });

    const result = await parseResult(response, 'No se pudo consultar sucursales de kardex.');
    return Array.isArray(result.data) ? result.data : [];
  },

  async saveManualMovimiento(payload, id) {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/kardex-articulos/manual/${id}` : `${API_BASE}/kardex-articulos/manual`;
    const response = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    const result = await parseResult(response, 'No se pudo guardar el movimiento manual.');
    return result.data;
  },

  async deleteManualMovimiento(id) {
    const response = await fetch(`${API_BASE}/kardex-articulos/manual/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });

    return parseResult(response, 'No se pudo eliminar el movimiento manual.');
  }
};

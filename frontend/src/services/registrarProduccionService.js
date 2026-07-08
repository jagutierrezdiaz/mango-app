import { API_BASE_URL as API_BASE } from '../config/api.js';

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

const parseResult = async (response) => {
  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Error de solicitud');
  }
  return data;
};

export const registrarProduccionService = {
  async getAbiertas(filters = {}) {
    const params = new URLSearchParams();
    if (filters.fechaInicio) params.set('fecha_inicio', filters.fechaInicio);
    if (filters.fechaFinal) params.set('fecha_final', filters.fechaFinal);
    params.set('estado', 'abierta');

    const query = params.toString();
    const response = await fetch(`${API_BASE}/ordenes-produccion${query ? `?${query}` : ''}`, {
      headers: authHeader()
    });

    const result = await parseResult(response);
    return Array.isArray(result.data) ? result.data : [];
  },

  async registrar(id, payload) {
    const response = await fetch(`${API_BASE}/ordenes-produccion/${id}/registro`, {
      method: 'PUT',
      headers: authHeader(),
      body: JSON.stringify(payload)
    });

    const result = await parseResult(response);
    return result.data;
  },

  async cerrar(id) {
    const response = await fetch(`${API_BASE}/ordenes-produccion/${id}/cerrar`, {
      method: 'PUT',
      headers: authHeader(),
      body: JSON.stringify({})
    });

    const result = await parseResult(response);
    return result.data;
  },

  async getConsumoArticulos(productoId, cantidad) {
    const params = new URLSearchParams();
    params.set('cantidad', String(cantidad ?? 0));

    const response = await fetch(
      `${API_BASE}/fichas-tecnicas/producto/${productoId}/consumo?${params.toString()}`,
      { headers: authHeader() }
    );

    const result = await parseResult(response);
    return Array.isArray(result.data) ? result.data : [];
  }
};

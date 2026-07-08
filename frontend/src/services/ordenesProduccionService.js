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

export const ordenesProduccionService = {
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    if (filters.fechaInicio) params.set('fecha_inicio', filters.fechaInicio);
    if (filters.fechaFinal) params.set('fecha_final', filters.fechaFinal);
    if (filters.estado && filters.estado !== 'TODOS') params.set('estado', filters.estado);

    const query = params.toString();
    const response = await fetch(`${API_BASE}/ordenes-produccion${query ? `?${query}` : ''}`, {
      headers: authHeader()
    });

    const result = await parseResult(response);
    return Array.isArray(result.data) ? result.data : [];
  },

  async getById(id) {
    const response = await fetch(`${API_BASE}/ordenes-produccion/${id}`, {
      headers: authHeader()
    });
    const result = await parseResult(response);
    return result.data;
  },

  async save(payload, id) {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/ordenes-produccion/${id}` : `${API_BASE}/ordenes-produccion`;

    const response = await fetch(url, {
      method,
      headers: authHeader(),
      body: JSON.stringify(payload)
    });

    return parseResult(response);
  },

  async updateFechaProgramada(id, fechaProgramada) {
    const response = await fetch(`${API_BASE}/ordenes-produccion/${id}/fecha-programada`, {
      method: 'PUT',
      headers: authHeader(),
      body: JSON.stringify({ fecha_programada: fechaProgramada })
    });

    return parseResult(response);
  },

  async delete(id) {
    const response = await fetch(`${API_BASE}/ordenes-produccion/${id}`, {
      method: 'DELETE',
      headers: authHeader()
    });

    return parseResult(response);
  }
,

  async getInventario(id) {
    const response = await fetch(`${API_BASE}/ordenes-produccion/${id}/inventario`, {
      headers: authHeader()
    });
    const result = await parseResult(response);
    return Array.isArray(result.data) ? result.data : [];
  }
};

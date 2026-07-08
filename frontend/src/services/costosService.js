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

export const costosService = {
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    if (filters.fechaInicio) params.set('fecha_inicio', filters.fechaInicio);
    if (filters.fechaFinal) params.set('fecha_final', filters.fechaFinal);

    const query = params.toString();
    const response = await fetch(`${API_BASE}/costos${query ? `?${query}` : ''}`, {
      headers: authHeader()
    });

    const result = await parseResult(response);
    return Array.isArray(result.data) ? result.data : [];
  },

  async getById(id) {
    const response = await fetch(`${API_BASE}/costos/${id}`, {
      headers: authHeader()
    });
    const result = await parseResult(response);
    return result.data;
  },

  async save(payload, id) {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/costos/${id}` : `${API_BASE}/costos`;
    const response = await fetch(url, {
      method,
      headers: authHeader(),
      body: JSON.stringify(payload)
    });

    return parseResult(response);
  },

  async delete(id) {
    const response = await fetch(`${API_BASE}/costos/${id}`, {
      method: 'DELETE',
      headers: authHeader()
    });

    return parseResult(response);
  }
};
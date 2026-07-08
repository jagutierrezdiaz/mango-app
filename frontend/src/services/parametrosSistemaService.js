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

export const parametrosSistemaService = {
  async getAll() {
    const response = await fetch(`${API_BASE}/parametros-sistema`, {
      method: 'GET',
      headers: authHeaders()
    });

    const result = await parseResult(response, 'No se pudieron cargar los parametros del sistema.');
    return Array.isArray(result.data) ? result.data : [];
  },

  async update(id, payload) {
    const response = await fetch(`${API_BASE}/parametros-sistema/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    const result = await parseResult(response, 'No se pudo actualizar el parametro.');
    return result.data;
  }
};

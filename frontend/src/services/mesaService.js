import { API_BASE_URL as API_BASE } from '../config/api.js';

const getAuthHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

const handleUnauthorized = async (response) => {
  if (response.status !== 401) return;

  let message = 'Sesion expirada. Inicia sesion nuevamente.';
  try {
    const payload = await response.clone().json();
    if (payload?.message) message = payload.message;
  } catch (_error) {
    // Ignore parse errors and keep default message.
  }

  localStorage.removeItem('token');
  localStorage.removeItem('user');
  alert(message);
  window.location.href = '/login';
};

const parseResult = async (response) => {
  await handleUnauthorized(response);
  const result = await response.json();
  if (!response.ok || result.success === false) {
    throw new Error(result.message || 'Error en solicitud');
  }
  return result;
};

export const mesasService = {
  async getAll() {
    const response = await fetch(`${API_BASE}/mesas`, { headers: getAuthHeader() });
    const result = await parseResult(response);
    return Array.isArray(result.data) ? result.data : [];
  },

  async getById(id) {
    const response = await fetch(`${API_BASE}/mesas/${id}`, { headers: getAuthHeader() });
    const result = await parseResult(response);
    return result.data || null;
  },

  async save(payload, id) {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/mesas/${id}` : `${API_BASE}/mesas`;

    const response = await fetch(url, {
      method,
      headers: getAuthHeader(),
      body: JSON.stringify(payload)
    });

    const result = await parseResult(response);
    return result.data;
  },

  async delete(id) {
    const response = await fetch(`${API_BASE}/mesas/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });

    await parseResult(response);
    return true;
  }
};

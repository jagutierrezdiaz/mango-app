import { API_BASE_URL as API_BASE } from '../config/api.js';

const authHeaders = () => ({
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
    // keep default
  }

  localStorage.removeItem('token');
  localStorage.removeItem('user');
  alert(message);
  window.location.href = '/login';
};

const parseResult = async (response) => {
  await handleUnauthorized(response);
  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Error de solicitud');
  }
  return data;
};

export const listaPreciosService = {
  async getAll() {
    const response = await fetch(`${API_BASE}/lista-precios`, {
      headers: authHeaders()
    });
    const result = await parseResult(response);
    return Array.isArray(result.data) ? result.data : [];
  },

  async createPrecio(productoId, payload) {
    const response = await fetch(`${API_BASE}/lista-precios/${productoId}/precios`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    const result = await parseResult(response);
    return result.data;
  },

  async updatePrecio(id, payload) {
    const response = await fetch(`${API_BASE}/lista-precios/precios/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    const result = await parseResult(response);
    return result.data;
  },

  async deletePrecio(id) {
    const response = await fetch(`${API_BASE}/lista-precios/precios/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });

    await parseResult(response);
    return true;
  }
};

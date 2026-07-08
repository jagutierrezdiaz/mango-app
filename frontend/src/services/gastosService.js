import { API_BASE_URL as API_BASE } from '../config/api.js';

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
});

const parseResult = async (response) => {
  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Error de solicitud');
  }
  return data;
};

export const gastosService = {
  async getPucGrupos() {
    const response = await fetch(`${API_BASE}/gastos/puc/grupos`, {
      headers: authHeader()
    });

    const result = await parseResult(response);
    return Array.isArray(result.data) ? result.data : [];
  },

  async getPucSubcuentas(group = '') {
    const q = group ? `?group=${encodeURIComponent(group)}` : '';
    const response = await fetch(`${API_BASE}/gastos/puc/subcuentas${q}`, {
      headers: authHeader()
    });
    const result = await parseResult(response);
    return Array.isArray(result.data) ? result.data : [];
  },

  async getAll(filters = {}) {
    const params = new URLSearchParams();
    if (filters.fechaInicio) params.set('fecha_inicio', filters.fechaInicio);
    if (filters.fechaFinal) params.set('fecha_final', filters.fechaFinal);

    const query = params.toString();
    const response = await fetch(`${API_BASE}/gastos${query ? `?${query}` : ''}`, {
      headers: authHeader()
    });

    const result = await parseResult(response);
    return Array.isArray(result.data) ? result.data : [];
  },

  async getById(id) {
    const response = await fetch(`${API_BASE}/gastos/${id}`, {
      headers: authHeader()
    });
    const result = await parseResult(response);
    return result.data;
  },

  async save(formData, id) {
    const url = id ? `${API_BASE}/gastos/${id}` : `${API_BASE}/gastos`;
    const method = id ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: authHeader(),
      body: formData
    });

    return parseResult(response);
  },

  async delete(id) {
    const response = await fetch(`${API_BASE}/gastos/${id}`, {
      method: 'DELETE',
      headers: authHeader()
    });

    return parseResult(response);
  }
};
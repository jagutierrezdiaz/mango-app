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

export const ajustesContablesService = {
  async getResumen() {
    const response = await fetch(`${API_BASE}/ajustes-contables/resumen`, {
      headers: authHeaders()
    });
    return parseResult(response, 'No se pudo obtener resumen de ajustes.');
  },

  async registrarAjuste(payload = {}) {
    const response = await fetch(`${API_BASE}/ajustes-contables/registrar`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    return parseResult(response, 'No se pudo registrar ajuste contable.');
  },

  async searchPuc(q = '') {
    const query = encodeURIComponent(String(q || '').trim());
    const response = await fetch(`${API_BASE}/contabilidad/puc/search?q=${query}`, {
      headers: authHeaders()
    });
    const result = await parseResult(response, 'No se pudo buscar cuentas PUC.');
    return Array.isArray(result.data) ? result.data : [];
  }
};

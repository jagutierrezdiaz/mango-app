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

export const estadoResultadosService = {
  async getMeta() {
    const response = await fetch(`${API_BASE}/caja/estado-resultados/meta`, {
      headers: authHeaders()
    });

    const result = await parseResult(response, 'No se pudo obtener metadatos de Estado de Resultados.');
    return result.data || {};
  },

  async getReporte({ mes, anio } = {}) {
    const params = new URLSearchParams();
    if (mes) params.append('mes', String(mes));
    if (anio) params.append('anio', String(anio));

    const query = params.toString();
    const response = await fetch(`${API_BASE}/caja/estado-resultados${query ? `?${query}` : ''}`, {
      headers: authHeaders()
    });

    const result = await parseResult(response, 'No se pudo generar el Estado de Resultados.');
    return result.data || null;
  }
};

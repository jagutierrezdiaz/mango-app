import { API_BASE_URL as API_BASE } from '../config/api.js';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

const parseResult = async (response, fallbackMessage) => {
  let result = {};
  try {
    result = await response.json();
  } catch (_error) {
    result = {};
  }
  if (!response.ok || result.success === false) {
    const error = new Error(result.message || fallbackMessage);
    error.payload = result?.data;
    throw error;
  }
  return result;
};

const safeFetch = async (url, options, fallbackMessage) => {
  try {
    return await fetch(url, options);
  } catch (_error) {
    throw new Error(fallbackMessage);
  }
};

export const cajaService = {
  async getComandasPendientes() {
    const response = await safeFetch(`${API_BASE}/caja/comandas`, { headers: authHeaders() }, 'No se pudo conectar con caja.');
    const result = await parseResult(response, 'No se pudo cargar caja.');
    return Array.isArray(result.data) ? result.data : [];
  },

  async getComandaById(id) {
    const response = await safeFetch(`${API_BASE}/caja/comandas/${id}`, { headers: authHeaders() }, 'No se pudo conectar con la comanda.');
    const result = await parseResult(response, 'No se pudo cargar la comanda.');
    return result.data || null;
  },

  async registrarPago(payload) {
    const response = await safeFetch(`${API_BASE}/caja/pagos`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    }, 'No se pudo conectar para registrar el pago.');
    const result = await parseResult(response, 'No se pudo registrar el pago.');
    return result.data;
  },

  async getMovimientosHoy() {
    const response = await safeFetch(`${API_BASE}/caja/movimientos-hoy`, {
      headers: authHeaders()
    }, 'No se pudo conectar para cargar movimientos de caja.');
    const result = await parseResult(response, 'No se pudieron cargar los movimientos de hoy.');
    return result.data || { movimientos: [], total_egresos_hoy: 0, flujo_neto_hoy: 0 };
  },

  async registrarGastoCaja(payload) {
    const response = await safeFetch(`${API_BASE}/caja/gastos`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    }, 'No se pudo conectar para registrar el gasto de caja.');
    const result = await parseResult(response, 'No se pudo registrar el gasto de caja.');
    return result.data;
  }
};

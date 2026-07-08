import { API_BASE_URL as API_BASE } from '../config/api.js';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

const parseResult = async (response, fallbackMessage) => {
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    const error = new Error(result.message || fallbackMessage);
    error.payload = result?.data;
    throw error;
  }
  return result;
};

export const tesoreriaService = {
  async getSaldos() {
    const response = await fetch(`${API_BASE}/tesoreria/saldos`, {
      headers: authHeaders()
    });

    const result = await parseResult(response, 'No se pudieron consultar saldos de tesoreria.');
    return Array.isArray(result?.data?.cuentas) ? result.data.cuentas : [];
  },

  async getArqueosPendientes() {
    const response = await fetch(`${API_BASE}/tesoreria/arqueos-pendientes`, {
      headers: authHeaders()
    });

    const result = await parseResult(response, 'No se pudieron consultar arqueos pendientes de tesoreria.');
    return Array.isArray(result?.data) ? result.data : [];
  },

  async getParametrosTesoreria() {
    const response = await fetch(`${API_BASE}/tesoreria/parametros-tesoreria`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({})
    });

    const result = await parseResult(response, 'No se pudieron cargar parámetros de tesoreria.');
    return Array.isArray(result?.data) ? result.data : [];
  },

/**
   * Registra los asientos contables de distribución de saldos 
   * (Caja General -> Operativa, Bancos, Ahorros)
   * (Caja Punto de Venta -> Caja Operativa, Bancos, Ahorros)
   */
  async ejecutarTrasladoContable(payload) {
    const response = await fetch(`${API_BASE}/tesoreria/trasladar-contable`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    return await parseResult(response, 'No se pudo registrar el traslado contable.');
  },

  async trasladarArqueo(payload) {
    const response = await fetch(`${API_BASE}/tesoreria/trasladar`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    const result = await parseResult(response, 'No se pudo registrar el traslado de tesoreria.');
    return result.data || null;
  },

  async registrarPago(payload) {
    const response = await fetch(`${API_BASE}/tesoreria/registrar-pago`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    return parseResult(response, 'No se pudo registrar el pago.');
  }
};

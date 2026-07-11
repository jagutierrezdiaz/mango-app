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
  },

  async getMesasMostrador() {
    const response = await safeFetch(`${API_BASE}/caja/mostrador/mesas`, { headers: authHeaders() }, 'No se pudo conectar para cargar mesas.');
    const result = await parseResult(response, 'No se pudieron cargar las mesas.');
    return Array.isArray(result.data) ? result.data : [];
  },

  async getProductosActivosMostrador() {
    const response = await safeFetch(`${API_BASE}/caja/mostrador/productos-activos`, { headers: authHeaders() }, 'No se pudo conectar para cargar productos.');
    const result = await parseResult(response, 'No se pudieron cargar los productos.');
    return Array.isArray(result.data) ? result.data : [];
  },

  async getCategoriasMostrador() {
    const response = await safeFetch(`${API_BASE}/caja/mostrador/categorias`, { headers: authHeaders() }, 'No se pudo conectar para cargar categorias.');
    const result = await parseResult(response, 'No se pudieron cargar las categorias.');
    return Array.isArray(result.data) ? result.data : [];
  },

  async createComandaMostrador(payload) {
    const response = await safeFetch(`${API_BASE}/caja/mostrador/comandas`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    }, 'No se pudo conectar para crear la comanda.');
    const result = await parseResult(response, 'No se pudo crear la comanda de mostrador.');
    return result.data || null;
  },

  async getComandaMostradorById(id) {
    const response = await safeFetch(`${API_BASE}/caja/mostrador/comandas/${id}`, { headers: authHeaders() }, 'No se pudo conectar con la comanda.');
    const result = await parseResult(response, 'No se pudo cargar la comanda de mostrador.');
    return result.data || null;
  },

  async addDetalleMostrador(comandaId, detalle) {
    const response = await safeFetch(`${API_BASE}/caja/mostrador/comandas/${comandaId}/detalles`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(detalle)
    }, 'No se pudo conectar para agregar el producto.');
    const result = await parseResult(response, 'No se pudo agregar el producto.');
    return result.data || null;
  },

  async updateDetalleMostrador(detalleId, detalle) {
    const response = await safeFetch(`${API_BASE}/caja/mostrador/detalles/${detalleId}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(detalle)
    }, 'No se pudo conectar para actualizar el detalle.');
    const result = await parseResult(response, 'No se pudo actualizar el detalle.');
    return result.data || null;
  },

  async deleteDetalleMostrador(detalleId) {
    const response = await safeFetch(`${API_BASE}/caja/mostrador/detalles/${detalleId}`, {
      method: 'DELETE',
      headers: authHeaders()
    }, 'No se pudo conectar para eliminar el detalle.');
    const result = await parseResult(response, 'No se pudo eliminar el detalle.');
    return result.data || null;
  },

  async cerrarComandaMostrador(comandaId) {
    const response = await safeFetch(`${API_BASE}/caja/mostrador/comandas/${comandaId}/cerrar`, {
      method: 'PATCH',
      headers: authHeaders()
    }, 'No se pudo conectar para cerrar la comanda.');
    const result = await parseResult(response, 'No se pudo cerrar la comanda de mostrador.');
    return result.data || null;
  }
};

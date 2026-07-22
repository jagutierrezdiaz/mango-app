import { API_BASE_URL as API_BASE } from '../config/api.js';

const getHeaders = (json = true) => {
  const headers = {
    Authorization: `Bearer ${localStorage.getItem('token')}`
  };

  if (json) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
};

const parseResult = async (response) => {
  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Error de solicitud');
  }
  return data;
};

export const compraService = {
  async getAll(filters = {}) {
    const query = new URLSearchParams();
    if (filters?.fecha_inicio) query.set('fecha_inicio', filters.fecha_inicio);
    if (filters?.fecha_final) query.set('fecha_final', filters.fecha_final);
    // Evita respuestas cacheadas (especialmente detrás de proxy) para reflejar compras recién creadas.
    query.set('_ts', String(Date.now()));
    const qs = query.toString();
    const url = `${API_BASE}/compras${qs ? `?${qs}` : ''}`;

    const response = await fetch(url, {
      headers: getHeaders(false),
      cache: 'no-store'
    });
    const result = await parseResult(response);
    return Array.isArray(result.data) ? result.data : [];
  },

  async getById(id) {
    const response = await fetch(`${API_BASE}/compras/${id}`, { headers: getHeaders(false) });
    const result = await parseResult(response);
    return result.data;
  },

  async save(payload, id) {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/compras/${id}` : `${API_BASE}/compras`;

    const response = await fetch(url, {
      method,
      headers: getHeaders(true),
      body: JSON.stringify(payload)
    });

    return parseResult(response);
  },

  async delete(id) {
    const response = await fetch(`${API_BASE}/compras/${id}`, {
      method: 'DELETE',
      headers: getHeaders(true)
    });

    return parseResult(response);
  },

  async getDetalles(compraId) {
    const response = await fetch(`${API_BASE}/compras/${compraId}/detalles`, {
      headers: getHeaders(false)
    });

    const result = await parseResult(response);
    return Array.isArray(result.data) ? result.data : [];
  },

  async createDetalle(compraId, payload) {
    const response = await fetch(`${API_BASE}/compras/${compraId}/detalles`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(payload)
    });

    return parseResult(response);
  },

  async updateDetalle(id, payload) {
    const response = await fetch(`${API_BASE}/compras/detalles/${id}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(payload)
    });

    return parseResult(response);
  },

  async deleteDetalle(id) {
    const response = await fetch(`${API_BASE}/compras/detalles/${id}`, {
      method: 'DELETE',
      headers: getHeaders(true)
    });

    return parseResult(response);
  },

  async getCatalogos() {
    const response = await fetch(`${API_BASE}/compras/catalogos`, {
      headers: getHeaders(false),
      cache: 'no-store'
    });
    const result = await parseResult(response);
    const data = result.data || {};
    return {
      tipos_documento: Array.isArray(data.tipos_documento) ? data.tipos_documento : [],
      formas_pago: Array.isArray(data.formas_pago) ? data.formas_pago : [],
      estados_pago: Array.isArray(data.estados_pago) ? data.estados_pago : []
    };
  },

  async getCuentasPorPagar(filters = {}) {
    const query = new URLSearchParams();
    if (filters?.fecha_inicio) query.set('fecha_inicio', filters.fecha_inicio);
    if (filters?.fecha_final) query.set('fecha_final', filters.fecha_final);
    if (filters?.estado_pago) query.set('estado_pago', filters.estado_pago);
    query.set('_ts', String(Date.now()));
    const qs = query.toString();

    const response = await fetch(`${API_BASE}/compras/cuentas-por-pagar?${qs}`, {
      headers: getHeaders(false),
      cache: 'no-store'
    });
    const result = await parseResult(response);
    return Array.isArray(result.data) ? result.data : [];
  },

  async getSaldoCuentaPago(codigo) {
    const response = await fetch(`${API_BASE}/compras/saldo-cuenta/${encodeURIComponent(codigo)}`, {
      headers: getHeaders(false),
      cache: 'no-store'
    });
    return parseResult(response);
  },

  async pagar(compraId, payload) {
    const response = await fetch(`${API_BASE}/compras/${compraId}/pagar`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(payload)
    });
    return parseResult(response);
  }
};

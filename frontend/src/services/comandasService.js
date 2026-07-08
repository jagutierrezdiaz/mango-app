import { buildApiUrl } from '../config/api.js';

const API_BASE = buildApiUrl('/comandas');
const API_ADMIN_SALON = buildApiUrl('/admin/salon/servicios');

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
    // Ignorar
  }
  throw new Error(message);
};

const parseResponse = async (response) => {
  if (!response.ok) {
    await handleUnauthorized(response);
    const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
    const message = error.message || `Error ${response.status}`;
    const enrichedError = new Error(message);
    enrichedError.status = response.status;
    enrichedError.url = response.url;
    throw enrichedError;
  }
  return response.json();
};

const toNumericValue = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const raw = String(value).trim();
  if (!raw) return 0;

  let normalized = raw.replace(/%/g, '').trim();
  if (normalized.includes(',') && normalized.includes('.')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.');
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeParametroValue = (row) => {
  const tipoDato = String(row?.tipo_dato || '').trim().toLowerCase();
  const rawValue = row?.valor_parametro ?? row?.valor ?? 0;
  const numericValue = toNumericValue(rawValue);

  if (tipoDato === 'porcentaje') {
    // "10" => 10%; "0.10" => 10% y evita dividir dos veces entre 100.
    if (numericValue > 0 && numericValue <= 1) {
      return numericValue * 100;
    }
    return numericValue;
  }

  return numericValue;
};

const normalizeTipoDato = (value) => {
  const tipo = String(value || '').trim().toLowerCase();
  if (tipo === 'porcentaje' || tipo === 'moneda') return tipo;
  return 'porcentaje';
};

let aporteServicioCache = null;
let aporteServicioPromise = null;

const buildAporteServicioPayload = (row) => ({
  valor_parametro: normalizeParametroValue(row),
  tipo_dato: normalizeTipoDato(row?.tipo_dato)
});

/**
 * Agrupa líneas de detalle por producto_id sumando cantidades.
 * Útil antes de insertar para evitar N filas con cantidad=1.
 */
export const agruparDetallesPorProducto = (detalles = []) => {
  const map = new Map();

  for (const d of (Array.isArray(detalles) ? detalles : [])) {
    const productoId = Number(d?.producto_id || 0);
    if (!productoId) continue;

    const cantidad = Number(d?.cantidad || 0);
    if (!Number.isFinite(cantidad) || cantidad <= 0) continue;

    const observaciones = d?.observaciones_mesero ?? null;
    const prev = map.get(productoId);

    if (prev) {
      prev.cantidad += cantidad;
      if (!prev.observaciones_mesero && observaciones) {
        prev.observaciones_mesero = observaciones;
      }
      continue;
    }

    map.set(productoId, {
      producto_id: productoId,
      cantidad,
      observaciones_mesero: observaciones,
      ...(d?.estado_producto ? { estado_producto: d.estado_producto } : {})
    });
  }

  return Array.from(map.values());
};

export const comandasService = {
  // Comandas
  getComandas: async () => {
    try {
      const response = await fetch(API_BASE, {
        method: 'GET',
        headers: getAuthHeader()
      });
      const data = await parseResponse(response);
      return data.data || [];
    } catch (error) {
      console.error('Error en getComandas:', error);
      throw error;
    }
  },

  getComandaById: async (id) => {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'GET',
        headers: getAuthHeader()
      });
      const data = await parseResponse(response);
      return data.data;
    } catch (error) {
      console.error('Error en getComandaById:', error);
      throw error;
    }
  },

  createComanda: async (comanda) => {
    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(comanda)
      });
      const data = await parseResponse(response);
      return data.data;
    } catch (error) {
      console.error('Error en createComanda:', error);
      throw error;
    }
  },

  updateComanda: async (id, comanda) => {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify(comanda)
      });
      const data = await parseResponse(response);
      return data.data;
    } catch (error) {
      console.error('Error en updateComanda:', error);
      throw error;
    }
  },

  deleteComanda: async (id) => {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      const data = await parseResponse(response);
      return data;
    } catch (error) {
      console.error('Error en deleteComanda:', error);
      throw error;
    }
  },

  // Detalles (Productos en comanda)
  addProductoComanda: async (comanda_id, detalle) => {
    try {
      const response = await fetch(`${API_BASE}/${comanda_id}/detalles`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(detalle)
      });
      const data = await parseResponse(response);
      return data.data;
    } catch (error) {
      console.error('Error en addProductoComanda:', error);
      throw error;
    }
  },

  updateDetalleComanda: async (id, detalle) => {
    try {
      const response = await fetch(`${API_BASE}/detalles/${id}`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify(detalle)
      });
      const data = await parseResponse(response);
      return data.data;
    } catch (error) {
      console.error('Error en updateDetalleComanda:', error);
      throw error;
    }
  },

  deleteDetalleComanda: async (id) => {
    try {
      const response = await fetch(`${API_BASE}/detalles/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      const data = await parseResponse(response);
      return data;
    } catch (error) {
      console.error('Error en deleteDetalleComanda:', error);
      throw error;
    }
  },

  // Productos y categorías
  getProductosActivos: async () => {
    try {
      const response = await fetch(`${API_BASE}/productos/activos`, {
        method: 'GET',
        headers: getAuthHeader()
      });
      const data = await parseResponse(response);
      return data.data || [];
    } catch (error) {
      console.error('Error en getProductosActivos:', error);
      throw error;
    }
  },

  getCategoriasConProductos: async () => {
    try {
      const response = await fetch(`${API_BASE}/categorias/productos`, {
        method: 'GET',
        headers: getAuthHeader()
      });
      const data = await parseResponse(response);
      return data.data || [];
    } catch (error) {
      console.error('Error en getCategoriasConProductos:', error);
      throw error;
    }
  },

  getMesas: async () => {
    try {
      const response = await fetch(buildApiUrl('/mesas'), {
        method: 'GET',
        headers: getAuthHeader()
      });
      const data = await parseResponse(response);
      return data.data || [];
    } catch (error) {
      console.error('Error en getMesas:', error);
      throw error;
    }
  },

  getServiciosPorMesa: async ({ dias = 14, limitPorMesa = 8 } = {}) => {
    try {
      const params = new URLSearchParams({
        dias: String(dias),
        limitPorMesa: String(limitPorMesa)
      });

      const response = await fetch(`${API_ADMIN_SALON}?${params.toString()}`, {
        method: 'GET',
        headers: getAuthHeader()
      });

      const data = await parseResponse(response);
      return data.data || [];
    } catch (error) {
      console.error('Error en getServiciosPorMesa:', error);
      throw error;
    }
  },

  getAporteServicio: async () => {
    if (aporteServicioCache) {
      return { ...aporteServicioCache };
    }

    if (aporteServicioPromise) {
      const cached = await aporteServicioPromise;
      return { ...cached };
    }

    try {
      aporteServicioPromise = (async () => {
        const API_PARAMS = buildApiUrl('/parametros-sistema');
        const response = await fetch(API_PARAMS, {
          method: 'GET',
          headers: getAuthHeader()
        });
        const data = await parseResponse(response);
        const rows = Array.isArray(data.data) ? data.data : [];
        const row = rows.find((r) => String(r.nombre_parametro || '').toLowerCase() === 'aporte_servicio');
        aporteServicioCache = buildAporteServicioPayload(row);
        return aporteServicioCache;
      })();

      const cached = await aporteServicioPromise;
      return { ...cached };
    } catch (error) {
      console.error('Error en getAporteServicio:', error);
      return {
        valor_parametro: 0,
        tipo_dato: 'porcentaje'
      };
    } finally {
      aporteServicioPromise = null;
    }
  }
};

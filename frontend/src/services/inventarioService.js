import { API_BASE_URL as API_BASE } from '../config/api.js';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

const parseResult = async (response, fallbackMessage = 'Error de solicitud') => {
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    throw new Error(result.message || fallbackMessage);
  }
  return result;
};

export const inventarioService = {
  async sanearTotal(payload = {}) {
    const body = {
      articulo_id: payload?.articulo_id ?? null,
      sucursal_id: Number(payload?.sucursal_id || 1)
    };
    const response = await fetch(`${API_BASE}/inventario/sanear-total`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body)
    });
    const result = await parseResult(response, 'No se pudo ejecutar el saneamiento de inventario.');
    return result.data;
  }
};

import { API_BASE_URL as API_BASE } from '../config/api.js';
import { useAuthStore } from '../stores';

const getToken = () => {
  try {
    const authStore = useAuthStore();
    if (authStore?.token) return authStore.token;
  } catch (_error) {
    // Si Pinia aún no está disponible, usar fallback localStorage.
  }

  return localStorage.getItem('token') || '';
};

const getHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
  'Content-Type': 'application/json'
});

const parseResponse = async (response, fallbackMessage) => {
  const result = await response.json();
  if (!response.ok || result?.success === false) {
    const error = new Error(result?.message || fallbackMessage);
    error.statusCode = Number(response.status || 0);
    throw error;
  }
  return result;
};

export const cocinaService = {
  async getProgramacion() {
    const response = await fetch(`${API_BASE}/cocina/programacion`, {
      headers: getHeaders()
    });
    const result = await parseResponse(response, 'No se pudo cargar la programacion de cocina.');
    return Array.isArray(result.data) ? result.data : [];
  },

  async getComandaDetallesOrdenados(comandaId) {
    const response = await fetch(`${API_BASE}/cocina/comandas/${comandaId}/detalles`, {
      headers: getHeaders()
    });
    const result = await parseResponse(response, 'No se pudo cargar el detalle de la comanda.');
    return result.data;
  },

  async marcarDetalleListo(detalleId) {
    const response = await fetch(`${API_BASE}/cocina/detalles/${detalleId}/listo`, {
      method: 'PATCH',
      headers: getHeaders()
    });
    return parseResponse(response, 'No se pudo marcar el producto como listo.');
  }
};

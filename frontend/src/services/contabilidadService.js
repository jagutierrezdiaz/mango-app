import { API_BASE_URL as API_BASE } from '../config/api.js';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
});

const parseResult = async (response, fallbackMessage) => {
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    throw new Error(result.message || fallbackMessage);
  }
  return result;
};

export function obtenerTipoMovimientoPorCuenta(cuentaCodigo) {
  const grupo = String(cuentaCodigo || '').substring(0, 2);

  switch (grupo) {
    case '11':
      return 'TESORERIA';
    case '14':
      return 'INVENTARIO';
    case '15':
      return 'ACTIVO';
    case '31':
      return 'PATRIMONIO';
    case '51':
    case '52':
    case '53':
      return 'GASTO';
    case '61':
      return 'COSTO';
    default:
      return '';
  }
}

export const contabilidadService = {
  async getPucAccountsByGroup(groupCode = '1435') {
    const group = String(groupCode || '').trim();
    const response = await fetch(`${API_BASE}/contabilidad/puc/grupos/${encodeURIComponent(group)}`, {
      headers: authHeaders()
    });

    const result = await parseResult(response, 'No se pudo consultar balance PUC por grupo.');
    return Array.isArray(result.data) ? result.data : [];
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

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

/**
 * Llama al endpoint que ejecuta el cálculo SQL del saldo de Caja General = Caja Punto de Venta
 */
export const getSaldoCajaGeneral = async () => {
  try {
    console.log("=> [Service] Solicitando saldo a la API...");
    const response = await fetch(`${API_BASE}/contabilidad/saldo/110505`, {
      headers: authHeaders()
    });

    const result = await parseResult(response, 'No se pudo obtener el saldo de caja.');
    console.log("=> [Service] Saldo obtenido:", result.saldo);
    return Number(result.saldo || 0);
  } catch (error) {
    console.error("=> [Service] Error en getSaldoCajaGeneral:", error);
    return 0;
  }
};

/**
 * Obtiene el parámetro de Base Caja Venta (Caja Menor) desde el backend
 */
export const getBaseCajaVenta = async () => {
  try {
    console.log("=> [Service] Solicitando parámetro base_caja_menor...");
    const response = await fetch(`${API_BASE}/contabilidad/parametro/base-venta`, {
      headers: authHeaders()
    });

    const result = await parseResult(response, 'Error al obtener base caja venta');
    // Accedemos a result.data.valor_parametro según la estructura del controlador
    return Number(result.data?.valor_parametro || 0);
  } catch (error) {
    console.error("=> [Service] Error en getBaseCajaVenta:", error);
    return 0;
  }
};

/**
 * Obtiene el parámetro de Base Ahorro (Caja Venta en BD) desde el backend
 */
export const getBaseAhorro = async () => {
  try {
    console.log("=> [Service] Solicitando parámetro base_caja_venta...");
    const response = await fetch(`${API_BASE}/contabilidad/parametro/base-ahorro`, {
      headers: authHeaders()
    });

    const result = await parseResult(response, 'Error al obtener base ahorro');
    // Accedemos a result.data.valor_parametro según la estructura del controlador
    return Number(result.data?.valor_parametro || 0);
  } catch (error) {
    console.error("=> [Service] Error en getBaseAhorro:", error);
    return 0;
  }
};
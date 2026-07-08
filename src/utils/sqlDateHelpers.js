/**
 * HELPERS DE FECHAS PARA SQL
 * Exporta funciones útiles para normalizar fechas en toda la aplicación
 * Todas usan la función centralizada normalizeDateTimeForSQL
 */

import { normalizeDateTimeForSQL, normalizeDateOnly } from './dateFormatter.js';

/**
 * Normaliza fecha de inicio de día para filtros SQL (YYYY-MM-DD 00:00:00)
 * @param {Date|string|null} dateValue - Valor de fecha
 * @returns {string|null} Fecha al inicio del día o null si inválida
 */
export const normalizeDateStart = (dateValue) => {
  if (!dateValue) return null;
  try {
    const dateOnly = normalizeDateOnly(dateValue);
    return `${dateOnly} 00:00:00`;
  } catch {
    return null;
  }
};

/**
 * Normaliza fecha de final de día para filtros SQL (YYYY-MM-DD 23:59:59)
 * @param {Date|string|null} dateValue - Valor de fecha
 * @returns {string|null} Fecha al final del día o null si inválida
 */
export const normalizeDateEnd = (dateValue) => {
  if (!dateValue) return null;
  try {
    const dateOnly = normalizeDateOnly(dateValue);
    return `${dateOnly} 23:59:59`;
  } catch {
    return null;
  }
};

/**
 * Alias para normalizeDateTimeForSQL - normaliza a YYYY-MM-DD HH:mm:00
 * Los segundos siempre se establecen a :00
 * @param {Date|string|null} dateValue - Valor de fecha
 * @param {Date|string|null} fallback - Fallback alternativo
 * @returns {string} Fecha normalizada
 * @throws {Error} Si la fecha no es válida y no hay fallback
 */
export const toSqlDateTime = (dateValue, fallback = null) => {
  try {
    return normalizeDateTimeForSQL(dateValue, fallback);
  } catch (error) {
    if (fallback) {
      return normalizeDateTimeForSQL(fallback);
    }
    throw error;
  }
};

/**
 * Alias para normalizeDateOnly - normaliza a YYYY-MM-DD
 * @param {Date|string|null} dateValue - Valor de fecha
 * @param {Date|string|null} fallback - Fallback alternativo
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export const toDateOnly = (dateValue, fallback = null) => {
  try {
    return normalizeDateOnly(dateValue, fallback);
  } catch (error) {
    if (fallback) {
      return normalizeDateOnly(fallback);
    }
    throw error;
  }
};

/**
 * Obtiene fecha y hora actual local en formato SQL (YYYY-MM-DD HH:mm:00)
 * Ajusta por timezone del servidor
 * @returns {string}
 */
export const getCurrentLocalDateTime = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const localNow = new Date(now.getTime() - offset);
  return normalizeDateTimeForSQL(localNow);
};

/**
 * Obtiene solo la fecha actual en formato SQL (YYYY-MM-DD)
 * Ajusta por timezone del servidor
 * @returns {string}
 */
export const getTodayDateOnly = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const localNow = new Date(now.getTime() - offset);
  return normalizeDateOnly(localNow);
};

export default {
  normalizeDateStart,
  normalizeDateEnd,
  toSqlDateTime,
  toDateOnly,
  getCurrentLocalDateTime,
  getTodayDateOnly
};

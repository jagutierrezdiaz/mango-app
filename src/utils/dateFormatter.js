/**
 * UTILIDAD DE NORMALIZACIÓN DE FECHAS
 * Centraliza la lógica de conversión de fechas a formato SQL consistente
 * Garantiza que todas las fechas terminen en :00 (segundos forzados a cero)
 * Formato de salida: YYYY-MM-DD HH:mm:00
 */

/**
 * Limpia y normaliza una fecha a cualquier formato a YYYY-MM-DD HH:mm:00
 * Los segundos SIEMPRE se establecen a 00 para consistencia en la BD
 * 
 * Soporta:
 *   - Date objects (new Date())
 *   - ISO strings (2026-04-10T18:33:54.908Z)
 *   - SQL datetime (2026-04-10 18:33:54)
 *   - Date strings (2026-04-10, "Fri Apr 10 2026")
 *   - null/undefined (usa fecha actual)
 * 
 * @param {Date|string|null} dateValue - Valor de fecha a normalizar
 * @param {Date|string|null} fallback - Valor alternativo si dateValue es inválido
 * @returns {string} Fecha normalizada como YYYY-MM-DD HH:mm:00
 * @throws {Error} Si la fecha no es válida y no hay fallback
 */
export const normalizeDateTimeForSQL = (dateValue, fallback = null) => {
  // Si no hay valor, usar fallback o fecha actual
  if (!dateValue) {
    if (fallback) {
      return normalizeDateTimeForSQL(fallback);
    }
    const now = new Date();
    return formatDateToSQL(now);
  }

  // Si es un Date object, procesarlo directamente
  if (dateValue instanceof Date) {
    if (Number.isNaN(dateValue.getTime())) {
      if (fallback) return normalizeDateTimeForSQL(fallback);
      throw new Error('Fecha inválida: Date object con tiempo no válido.');
    }
    return formatDateToSQL(dateValue);
  }

  // Si es string, intentar parsear
  const stringValue = String(dateValue).trim();

  // Patrón YYYY-MM-DD (solo fecha, sin hora)
  if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
    return `${stringValue} 00:00:00`;
  }

  // Patrón YYYY-MM-DD HH:mm:ss (SQL datetime, posiblemente con segundos aleatorios)
  const sqlMatch = /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2})(?::\d{2})?/.exec(stringValue);
  if (sqlMatch) {
    const [, date, hours, minutes] = sqlMatch;
    return `${date} ${hours}:${minutes}:00`;
  }

  // Patrón ISO 8601 (2026-04-10T18:33:54.908Z o 2026-04-10T18:33:54)
  const isoMatch = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(stringValue);
  if (isoMatch) {
    const [, date, hours, minutes] = isoMatch;
    return `${date} ${hours}:${minutes}:00`;
  }

  // Intentar parsear con Date constructor (maneja formatos como "Fri Apr 10 2026", etc)
  const parsed = new Date(stringValue);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateToSQL(parsed);
  }

  // Si llega aquí, la fecha es inválida
  if (fallback) {
    return normalizeDateTimeForSQL(fallback);
  }

  throw new Error(`Fecha no válida: "${stringValue}". Formatos soportados: YYYY-MM-DD, YYYY-MM-DD HH:mm:ss, ISO 8601.`);
};

/**
 * Helper interno que formatea un Date object a YYYY-MM-DD HH:mm:00
 * @private
 * @param {Date} date - Date object válido
 * @returns {string} Fecha normalizada
 */
const formatDateToSQL = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:00`;
};

/**
 * Normaliza una fecha pero solo para la parte de fecha (YYYY-MM-DD)
 * Ignora la hora completamente
 * @param {Date|string|null} dateValue - Valor de fecha
 * @param {Date|string|null} fallback - Fallback alternativo
 * @returns {string} Fecha como YYYY-MM-DD
 */
export const normalizeDateOnly = (dateValue, fallback = null) => {
  if (!dateValue) {
    if (fallback) {
      return normalizeDateOnly(fallback);
    }
    const now = new Date();
    return formatDateOnly(now);
  }

  if (dateValue instanceof Date) {
    if (Number.isNaN(dateValue.getTime())) {
      if (fallback) return normalizeDateOnly(fallback);
      throw new Error('Fecha inválida: Date object con tiempo no válido.');
    }
    return formatDateOnly(dateValue);
  }

  const stringValue = String(dateValue).trim();

  // Ya está en formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(stringValue)) {
    return stringValue.substring(0, 10);
  }

  // ISO 8601 o SQL datetime
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(stringValue);
  if (match) {
    return match[1];
  }

  // Intentar parsear como Date
  const parsed = new Date(stringValue);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateOnly(parsed);
  }

  if (fallback) {
    return normalizeDateOnly(fallback);
  }

  throw new Error(`Fecha no válida: "${stringValue}"`);
};

/**
 * Helper interno para formato YYYY-MM-DD
 * @private
 */
const formatDateOnly = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default {
  normalizeDateTimeForSQL,
  normalizeDateOnly
};

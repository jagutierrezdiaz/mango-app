import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGS_AUDIT_DIR = path.join(__dirname, '..', '..', 'logs_audit');
const LOG_INGRESOS_PATH = path.join(LOGS_AUDIT_DIR, 'log_ingresos.txt');

const formatFechaHora = () =>
  new Date().toISOString().replace('T', ' ').slice(0, 19);

export const getClientIp = (req) => {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req?.ip || req?.socket?.remoteAddress || 'desconocida';
};

/**
 * Registra en logs_audit/log_ingresos.txt cada intento de acceso desde /login.
 * Falla silenciosamente para no interrumpir la respuesta HTTP.
 *
 * @param {import('express').Request} req
 * @param {object} payload
 * @param {'OK'|'FALLO'|'SETUP'|'SETUP_PASSWORD'} payload.estado
 * @param {string} [payload.usuario]
 * @param {number|string} [payload.userId]
 * @param {string} [payload.rol]
 * @param {string} [payload.motivo]
 */
export const registrarLogIngreso = (req, payload = {}) => {
  try {
    const estado = String(payload.estado || 'FALLO').trim();
    const usuario = String(payload.usuario || 'desconocido').trim() || 'desconocido';
    const ip = getClientIp(req);
    const partes = [
      `[${formatFechaHora()}]`,
      `ESTADO: ${estado}`,
      `USUARIO: ${usuario}`
    ];

    if (payload.userId != null && payload.userId !== '') {
      partes.push(`ID: ${payload.userId}`);
    }
    if (payload.rol) {
      partes.push(`ROL: ${String(payload.rol).trim()}`);
    }
    if (payload.motivo) {
      partes.push(`MOTIVO: ${String(payload.motivo).trim()}`);
    }
    partes.push(`IP: ${ip}`);

    const linea = `${partes.join(' | ')}\n`;

    if (!fs.existsSync(LOGS_AUDIT_DIR)) {
      fs.mkdirSync(LOGS_AUDIT_DIR, { recursive: true });
    }

    fs.appendFile(LOG_INGRESOS_PATH, linea, (err) => {
      if (err) {
        console.error('⚠️  No se pudo escribir log_ingresos.txt:', err.message);
      }
    });
  } catch (error) {
    console.error('⚠️  Error en registrarLogIngreso:', error.message);
  }
};

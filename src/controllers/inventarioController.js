import db from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { obtenerDiagnosticoInventarioContable, sanearTodo } from '../services/inventarioService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGS_AUDIT_DIR = path.join(__dirname, '..', '..', 'logs_audit');
const LOG_SANEO_INVENTARIO_PATH = path.join(LOGS_AUDIT_DIR, 'log_saneo_inventario.txt');

const logBackendError = (functionName, error) => {
  console.error(`\n${'='.repeat(50)}`);
  console.error(`❌ ERROR DETECTADO EN: ${functionName}`);
  console.error('MENSAJE:', error?.message);
  if (error?.sql) console.error('SQL FALLIDO:', error.sql);
  if (error?.sqlMessage) console.error('ERROR MYSQL:', error.sqlMessage);
  console.error('='.repeat(50));
  console.error('');
};

/**
 * Registra en /logs_audit/log_saneo_inventario.txt una línea por cada saneamiento ejecutado.
 * Usa appendFile para no borrar entradas anteriores.
 * Falla silenciosamente para no interrumpir la respuesta HTTP.
 *
 * @param {object} usuario  - Payload del JWT ({ id, usuario, rol })
 * @param {object} resumen  - { totalArticulos, difPrevia }
 */
const registrarLogSaneo = (usuario, resumen) => {
  try {
    const fechaHora = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const nombre = String(usuario?.usuario || 'desconocido').trim();
    const totalArticulos = resumen?.totalArticulos ?? 0;
    const difPrevia = Number(resumen?.difPrevia ?? 0).toFixed(2);

    const linea =
      `[${fechaHora}] | USUARIO: ${nombre} | ACCIÓN: Saneo de Inventario` +
      ` | RESULTADO: ${totalArticulos} procesados | DIF_PREVIA: ${difPrevia}\n`;

    if (!fs.existsSync(LOGS_AUDIT_DIR)) {
      fs.mkdirSync(LOGS_AUDIT_DIR, { recursive: true });
    }

    fs.appendFile(LOG_SANEO_INVENTARIO_PATH, linea, (err) => {
      if (err) console.error('⚠️  No se pudo escribir log_saneo_inventario.txt:', err.message);
    });
  } catch (error) {
    console.error('⚠️  Error en registrarLogSaneo:', error.message);
  }
};

export const sanearInventarioTotal = async (req, res) => {
  const articuloId = Number(req.body?.articulo_id || 0) || null;
  const sucursalId = Number(req.body?.sucursal_id || 1) || 1;

  // Capturar la diferencia ANTES del saneamiento para dejar trazabilidad en el log.
  let difPrevia = 0;
  try {
    const estadoAnterior = await obtenerDiagnosticoInventarioContable(db);
    difPrevia = estadoAnterior?.diferencia ?? 0;
  } catch (_) {
    // No bloquear el saneamiento si la lectura previa falla.
  }

  try {
    const data = await sanearTodo({ articuloId, sucursalId });

    registrarLogSaneo(req.user, {
      totalArticulos: data?.totalArticulos ?? 0,
      difPrevia
    });

    return res.json({ success: true, data });
  } catch (error) {
    logBackendError('sanearInventarioTotal', error);
    return res.status(error?.statusCode || 500).json({
      success: false,
      message: error.message || 'Error al ejecutar saneamiento total de inventario.'
    });
  }
};

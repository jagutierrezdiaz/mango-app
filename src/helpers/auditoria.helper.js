import db from '../config/db.js';

const OPERACIONES_VALIDAS = new Set(['INSERT', 'UPDATE', 'DELETE']);

const serializarDetalles = (detalles) => {
  if (detalles === undefined) {
    return null;
  }

  if (detalles === null) {
    return 'null';
  }

  if (typeof detalles === 'string') {
    return detalles;
  }

  try {
    return JSON.stringify(detalles);
  } catch (_error) {
    return JSON.stringify({ detalle_serializacion: 'No fue posible serializar los detalles.' });
  }
};

export const registrarAccion = async ({
  tabla,
  operacion,
  registroId,
  personalId,
  detalles
}) => {
  if (!tabla || !OPERACIONES_VALIDAS.has(operacion)) {
    return;
  }

  try {
    await db.query(
      `INSERT INTO auditoria (
        tabla_nombre,
        operacion,
        registro_id,
        personal_id,
        detalles
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        String(tabla).trim(),
        operacion,
        registroId ?? null,
        personalId != null ? parseInt(personalId, 10) : null,
        serializarDetalles(detalles)
      ]
    );
  } catch (error) {
    console.error('[auditoria] No se pudo registrar la accion:', error.message);
  }
};
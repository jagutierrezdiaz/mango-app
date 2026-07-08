import db from '../config/db.js';
import { registrarAccion } from '../helpers/auditoria.helper.js';

const TIPOS_DATO = ['porcentaje', 'texto', 'moneda', 'numero'];

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return NaN;
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;

  const raw = String(value).trim();
  if (!raw) return NaN;

  let normalized = raw;
  if (raw.includes(',') && raw.includes('.')) {
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else if (raw.includes(',')) {
    normalized = raw.replace(',', '.');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const normalizeByType = (value, tipoDato) => {
  if (tipoDato === 'texto') {
    const text = String(value ?? '').trim();
    if (!text) {
      throw new Error('El valor de texto no puede estar vacio.');
    }
    if (text.length > 255) {
      throw new Error('El valor de texto excede 255 caracteres.');
    }
    return text;
  }

  const numeric = toNumber(value);
  if (!Number.isFinite(numeric)) {
    throw new Error('El valor numerico no es valido.');
  }

  if (tipoDato === 'porcentaje') {
    if (numeric < 0 || numeric > 100) {
      throw new Error('El porcentaje debe estar entre 0 y 100.');
    }
    return String(Number(numeric.toFixed(4)));
  }

  if (tipoDato === 'moneda') {
    if (numeric < 0) {
      throw new Error('El valor de moneda no puede ser negativo.');
    }
    return String(Number(numeric.toFixed(2)));
  }

  // numero
  return String(Number(numeric));
};

export const getParametrosSistema = async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        id,
        nombre_parametro,
        valor_parametro,
        tipo_dato,
        descripcion,
        ultima_actualizacion
      FROM parametros_sistema
      ORDER BY id ASC`
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error en getParametrosSistema:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener parametros del sistema.' });
  }
};

export const updateParametroSistema = async (req, res) => {
  try {
    const parametroId = Number(req.params.id);
    const personalId = req.user?.id ?? null;
    if (!parametroId) {
      return res.status(400).json({ success: false, message: 'Parametro invalido.' });
    }

    const [existingRows] = await db.query(
      `SELECT
        id,
        nombre_parametro,
        valor_parametro,
        tipo_dato,
        descripcion,
        ultima_actualizacion
      FROM parametros_sistema
      WHERE id = ?
      LIMIT 1`,
      [parametroId]
    );

    if (!existingRows.length) {
      return res.status(404).json({ success: false, message: 'Parametro no encontrado.' });
    }

    const current = existingRows[0];
    const nextTipoDato = String(req.body?.tipo_dato || current.tipo_dato || 'texto').trim().toLowerCase();

    if (!TIPOS_DATO.includes(nextTipoDato)) {
      return res.status(400).json({
        success: false,
        message: `tipo_dato invalido. Permitidos: ${TIPOS_DATO.join(', ')}`
      });
    }

    if (req.body?.valor_parametro === undefined) {
      return res.status(400).json({ success: false, message: 'valor_parametro es obligatorio.' });
    }

    let normalizedValue;
    try {
      normalizedValue = normalizeByType(req.body.valor_parametro, nextTipoDato);
    } catch (validationError) {
      return res.status(400).json({ success: false, message: validationError.message });
    }

    const nextDescripcion = req.body?.descripcion !== undefined
      ? (req.body.descripcion === null ? null : String(req.body.descripcion).trim())
      : current.descripcion;

    await db.query(
      `UPDATE parametros_sistema
       SET valor_parametro = ?,
           tipo_dato = ?,
           descripcion = ?
       WHERE id = ?`,
      [normalizedValue, nextTipoDato, nextDescripcion, parametroId]
    );

    await registrarAccion({
      tabla: 'parametros_sistema',
      operacion: 'UPDATE',
      registroId: parametroId,
      personalId,
      detalles: {
        nombre_parametro: current.nombre_parametro,
        valor_parametro: normalizedValue,
        tipo_dato: nextTipoDato,
        descripcion: nextDescripcion
      }
    });

    const [updatedRows] = await db.query(
      `SELECT
        id,
        nombre_parametro,
        valor_parametro,
        tipo_dato,
        descripcion,
        ultima_actualizacion
      FROM parametros_sistema
      WHERE id = ?
      LIMIT 1`,
      [parametroId]
    );

    return res.json({
      success: true,
      message: 'Parametro actualizado correctamente.',
      data: updatedRows[0]
    });
  } catch (error) {
    console.error('Error en updateParametroSistema:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar parametro del sistema.' });
  }
};

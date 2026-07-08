import db from '../config/db.js';
import { registrarAccion } from '../helpers/auditoria.helper.js';
import {
  mapClasePucToCuentaCosto,
  registrarCausacionCosto,
  registrarPagoCosto,
  revertirAsientosCosto
} from '../services/contabilidadService.js';

const allowedEstado = ['CAUSADO', 'PAGADO', 'ANULADO'];

const allowedClasePuc = [
  '61 - Costo de Ventas - Alimentos',
  '71 - Costos de Producción/Operación'
];

const allowedTipoCosto = ['MATERIA_PRIMA', 'MANO_OBRA_DIRECTA', 'COSTO_MERCANCIA', 'COSTO_INDIRECTO'];
const allowedFuentePago = ['CAJA_MENOR', 'BANCO', 'CAJA_GENERAL'];

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toSqlDatetimeNoSeconds = (value) => {
  if (!value) return null;
  const raw = String(value).trim().replace('T', ' ');
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return `${raw} 00:00:00`;
  }

  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(raw)) {
    return `${raw}:00`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:00`;
};

const getCurrentLocalDateTime = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 19).replace('T', ' ');
};

const validateChronologicalDate = async (connection, value, currentId = null) => {
  const normalizedValue = toSqlDatetimeNoSeconds(value);
  if (!normalizedValue) {
    return 'La fecha de costo no es válida';
  }

  if (normalizedValue > getCurrentLocalDateTime()) {
    return 'La fecha de costo no puede ser superior a la fecha actual';
  }

  const params = [];
  let exclusionClause = '';

  if (currentId) {
    exclusionClause = ' AND id <> ?';
    params.push(Number(currentId));
  }

  const [rows] = await connection.query(
    `SELECT ${'fecha_costo'} AS fecha_referencia
     FROM costos
     WHERE ${'fecha_costo'} IS NOT NULL${exclusionClause}
     ORDER BY ${'fecha_costo'} DESC, id DESC
     LIMIT 1`,
    params
  );

  const lastDate = rows?.[0]?.fecha_referencia ? toSqlDatetimeNoSeconds(rows[0].fecha_referencia) : null;
  if (lastDate && normalizedValue < lastDate) {
    return 'La fecha de costo no puede ser inferior al último costo registrado';
  }

  return null;
};

const buildArticuloImageUrl = (req, urlFoto) => {
  if (!urlFoto) return null;
  if (/^https?:\/\//i.test(urlFoto)) return urlFoto;
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  if (String(urlFoto).startsWith('/uploads/')) return `${baseUrl}${urlFoto}`;
  return `${baseUrl}/uploads/articulos/${urlFoto}`;
};

const mapRow = (req, row) => ({
  ...row,
  articulo_url_foto: buildArticuloImageUrl(req, row.articulo_url_foto)
});

const validatePayload = (payload = {}) => {
  if (!payload.clase_puc || !allowedClasePuc.includes(payload.clase_puc)) {
    return 'Debe seleccionar una clase PUC válida';
  }

  if (!payload.tipo_costo || !allowedTipoCosto.includes(payload.tipo_costo)) {
    return 'Debe seleccionar un tipo de costo válido';
  }

  if (!payload.descripcion || !String(payload.descripcion).trim()) {
    return 'La descripción es obligatoria';
  }

  if (!payload.fecha_costo || !toSqlDatetimeNoSeconds(payload.fecha_costo)) {
    return 'La fecha de costo no es válida';
  }

  if (payload.fuente_pago && !allowedFuentePago.includes(String(payload.fuente_pago).toUpperCase())) {
    return 'La fuente de pago no es válida';
  }

  return null;
};

export const getCostos = async (req, res) => {
  try {
    const { fecha_inicio: fechaInicio, fecha_final: fechaFinal } = req.query;

    const filters = [];
    const params = [];

    if (fechaInicio) {
      filters.push('c.fecha_costo >= ?');
      params.push(`${fechaInicio} 00:00:00`);
    }

    if (fechaFinal) {
      filters.push('c.fecha_costo <= ?');
      params.push(`${fechaFinal} 23:59:59`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const [rows] = await db.query(
      `
        SELECT
          c.*,
          a.nombre AS articulo_nombre,
          a.tipo AS articulo_tipo,
          a.url_foto AS articulo_url_foto,
          u.abreviatura AS unidad_abreviatura,
          DATE_FORMAT(c.fecha_costo, '%Y-%m-%d %H:%i') AS fecha_costo,
          DATE_FORMAT(c.fecha_registro, '%Y-%m-%d %H:%i') AS fecha_registro
        FROM costos c
        LEFT JOIN articulos a ON a.id = c.articulo_id
        LEFT JOIN unidades u ON u.id = a.unidad_id
        ${whereClause}
        ORDER BY c.fecha_costo DESC, c.id DESC
      `,
      params
    );

    res.json({ success: true, data: rows.map((row) => mapRow(req, row)) });
  } catch (error) {
    console.error('Error en getCostos:', error);
    res.status(500).json({ success: false, message: 'Error al obtener costos' });
  }
};

export const getCostoById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `
        SELECT
          c.*,
          a.nombre AS articulo_nombre,
          a.tipo AS articulo_tipo,
          a.url_foto AS articulo_url_foto,
          u.abreviatura AS unidad_abreviatura,
          DATE_FORMAT(c.fecha_costo, '%Y-%m-%d %H:%i') AS fecha_costo,
          DATE_FORMAT(c.fecha_registro, '%Y-%m-%d %H:%i') AS fecha_registro
        FROM costos c
        LEFT JOIN articulos a ON a.id = c.articulo_id
        LEFT JOIN unidades u ON u.id = a.unidad_id
        WHERE c.id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Costo no encontrado' });
    }

    res.json({ success: true, data: mapRow(req, rows[0]) });
  } catch (error) {
    console.error('Error en getCostoById:', error);
    res.status(500).json({ success: false, message: 'Error al obtener costo' });
  }
};

export const createCosto = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const payload = req.body || {};
    const personalId = req.user?.id ?? null;
    const validationError = validatePayload(payload);
    if (validationError) {
      connection.release();
      return res.status(400).json({ success: false, message: validationError });
    }

    const cantidad = toNumber(payload.cantidad);
    const valorUnitario = toNumber(payload.valor_unitario);
    const totalCosto = payload.total_costo !== undefined && payload.total_costo !== null && payload.total_costo !== ''
      ? toNumber(payload.total_costo)
      : (cantidad * valorUnitario);
    const fuentePagoFinal = String(payload.fuente_pago || 'CAJA_GENERAL').toUpperCase();

    await connection.beginTransaction();

    const chronologicalError = await validateChronologicalDate(connection, payload.fecha_costo);
    if (chronologicalError) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: chronologicalError });
    }

    const [result] = await connection.query(
      `
        INSERT INTO costos (
          articulo_id,
          sucursal_id,
          clase_puc,
          fecha_costo,
          fecha_registro,
          tipo_costo,
          descripcion,
          cantidad,
          valor_unitario,
          total_costo,
          id_documento_origen,
          fuente_pago,
          estado
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CAUSADO')
      `,
      [
        payload.articulo_id ? Number(payload.articulo_id) : null,
        Number(payload.sucursal_id || 1),
        payload.clase_puc,
        toSqlDatetimeNoSeconds(payload.fecha_costo),
        payload.fecha_registro ? toSqlDatetimeNoSeconds(payload.fecha_registro) : toSqlDatetimeNoSeconds(new Date()),
        payload.tipo_costo,
        String(payload.descripcion || '').trim(),
        cantidad,
        valorUnitario,
        totalCosto,
        payload.id_documento_origen ? Number(payload.id_documento_origen) : null,
        fuentePagoFinal
      ]
    );

    const costoId = result.insertId;
    if (!costoId) {
      await connection.rollback();
      connection.release();
      return res.status(500).json({ success: false, message: 'Error al obtener ID del costo insertado.' });
    }

    const cuentaPuc = mapClasePucToCuentaCosto(payload.clase_puc);
    await registrarCausacionCosto(connection, {
      monto: totalCosto,
      cuenta_puc: cuentaPuc,
      costo_id: costoId,
      descripcion: String(payload.descripcion || '').trim()
    });

    await connection.commit();

    await registrarAccion({
      tabla: 'costos',
      operacion: 'INSERT',
      registroId: costoId,
      personalId,
      detalles: {
        articulo_id: payload.articulo_id ? Number(payload.articulo_id) : null,
        clase_puc: payload.clase_puc,
        tipo_costo: payload.tipo_costo,
        descripcion: String(payload.descripcion || '').trim(),
        total_costo: totalCosto,
        fuente_pago: fuentePagoFinal,
        estado: 'CAUSADO'
      }
    });

    req.params.id = costoId;
    connection.release();
    return getCostoById(req, res);
  } catch (error) {
    await connection.rollback().catch(() => {});
    connection.release();
    console.error('Error en createCosto:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al crear costo', detail: error.sqlMessage });
  }
};

export const updateCosto = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params;
    const payload = req.body || {};
    const personalId = req.user?.id ?? null;

    const [existingRows] = await connection.query(
      'SELECT id, estado, total_costo, clase_puc, descripcion, fuente_pago FROM costos WHERE id = ? LIMIT 1',
      [Number(id)]
    );
    if (!existingRows.length) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Costo no encontrado' });
    }
    const costoActual = existingRows[0];

    // --- PATH 1: Solo transición de estado (solo llega { estado: 'ANULADO' }) ---
    const isSoloEstado = Object.keys(payload).length === 1 && payload.estado !== undefined;
    if (isSoloEstado) {
      const nuevoEstado = String(payload.estado || '').toUpperCase();
      const fuentePago = String(costoActual.fuente_pago || 'CAJA_GENERAL').toUpperCase();
      if (!allowedEstado.includes(nuevoEstado)) {
        connection.release();
        return res.status(400).json({ success: false, message: `Estado inválido: ${nuevoEstado}` });
      }
      if (costoActual.estado === 'ANULADO') {
        connection.release();
        return res.status(409).json({ success: false, message: 'El costo ya está ANULADO. No se puede modificar.' });
      }

      await connection.beginTransaction();

      if (nuevoEstado === 'ANULADO') {
        await revertirAsientosCosto(connection, {
          costo_id: Number(id),
          descripcion: String(costoActual.descripcion || '').trim()
        });
      }

      if (nuevoEstado === 'PAGADO' && String(costoActual.estado || '').toUpperCase() !== 'PAGADO') {
        await registrarPagoCosto(connection, {
          monto: toNumber(costoActual.total_costo),
          costo_id: Number(id),
          descripcion: String(costoActual.descripcion || '').trim(),
          fuente_pago: fuentePago
        });
      }

      await connection.query('UPDATE costos SET estado = ? WHERE id = ?', [nuevoEstado, Number(id)]);
      await connection.commit();

      await registrarAccion({
        tabla: 'costos',
        operacion: 'UPDATE',
        registroId: Number(id),
        personalId,
        detalles: { estado_previo: costoActual.estado, estado_nuevo: nuevoEstado }
      });

      connection.release();
      return getCostoById(req, res);
    }

    // --- PATH 2: Edición completa ---
    if (costoActual.estado === 'ANULADO') {
      connection.release();
      return res.status(409).json({ success: false, message: 'No se puede editar un costo ANULADO.' });
    }

    const validationError = validatePayload(payload);
    if (validationError) {
      connection.release();
      return res.status(400).json({ success: false, message: validationError });
    }

    const cantidad = toNumber(payload.cantidad);
    const valorUnitario = toNumber(payload.valor_unitario);
    const totalCosto = payload.total_costo !== undefined && payload.total_costo !== null && payload.total_costo !== ''
      ? toNumber(payload.total_costo)
      : (cantidad * valorUnitario);
    const fuentePago = String(payload.fuente_pago || costoActual.fuente_pago || 'CAJA_GENERAL').toUpperCase();

    await connection.beginTransaction();

    const chronologicalError = await validateChronologicalDate(connection, payload.fecha_costo, id);
    if (chronologicalError) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: chronologicalError });
    }

    await connection.query(
      `
        UPDATE costos
        SET articulo_id = ?,
            sucursal_id = ?,
            clase_puc = ?,
            fecha_costo = ?,
            fecha_registro = ?,
            tipo_costo = ?,
            descripcion = ?,
            cantidad = ?,
            valor_unitario = ?,
            total_costo = ?,
            id_documento_origen = ?,
            fuente_pago = ?
        WHERE id = ?
      `,
      [
        payload.articulo_id ? Number(payload.articulo_id) : null,
        Number(payload.sucursal_id || 1),
        payload.clase_puc,
        toSqlDatetimeNoSeconds(payload.fecha_costo),
        payload.fecha_registro ? toSqlDatetimeNoSeconds(payload.fecha_registro) : toSqlDatetimeNoSeconds(new Date()),
        payload.tipo_costo,
        String(payload.descripcion || '').trim(),
        cantidad,
        valorUnitario,
        totalCosto,
        payload.id_documento_origen ? Number(payload.id_documento_origen) : null,
        fuentePago,
        Number(id)
      ]
    );

    if (String(costoActual.estado || '').toUpperCase() !== 'PAGADO' && String(payload.estado || '').toUpperCase() === 'PAGADO') {
      await registrarPagoCosto(connection, {
        monto: totalCosto,
        costo_id: Number(id),
        descripcion: String(payload.descripcion || '').trim(),
        fuente_pago: fuentePago
      });
    }

    await connection.commit();

    await registrarAccion({
      tabla: 'costos',
      operacion: 'UPDATE',
      registroId: Number(id),
      personalId,
      detalles: {
        articulo_id: payload.articulo_id ? Number(payload.articulo_id) : null,
        clase_puc: payload.clase_puc,
        tipo_costo: payload.tipo_costo,
        descripcion: String(payload.descripcion || '').trim(),
        total_costo: totalCosto,
        fuente_pago: fuentePago
      }
    });

    connection.release();
    return getCostoById(req, res);
  } catch (error) {
    await connection.rollback().catch(() => {});
    connection.release();
    console.error('Error en updateCosto:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al actualizar costo', detail: error.sqlMessage });
  }
};

export const deleteCosto = async (_req, res) => {
  return res.status(405).json({
    success: false,
    message: 'Operación no permitida: los costos no se eliminan físicamente. Use ANULAR.'
  });
};
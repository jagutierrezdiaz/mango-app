import db from '../config/db.js';
import { registrarAccion } from '../helpers/auditoria.helper.js';

const allowedTurnos = ['mañana', 'tarde', 'noche'];
const allowedEstados = ['abierta', 'pausada', 'en_proceso', 'espera_insumos', 'completada', 'cancelada'];

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeDecimal = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeEstadoInput = (estado) => {
  const key = String(estado || 'abierta').trim().toLowerCase();
  if (key === 'cumplida') return 'completada';
  return key;
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

const validatePayload = (payload = {}, partial = false) => {
  if (!partial || payload.producto_id !== undefined) {
    if (!payload.producto_id || Number(payload.producto_id) <= 0) {
      return 'Debe seleccionar un producto';
    }
  }

  if (!partial || payload.personal_id !== undefined) {
    if (!payload.personal_id || Number(payload.personal_id) <= 0) {
      return 'Debe seleccionar un operario';
    }
  }

  if (!partial || payload.cantidad_programada !== undefined) {
    if (toNumber(payload.cantidad_programada, -1) < 0) {
      return 'La cantidad programada no es valida';
    }
  }

  if (!partial || payload.turno !== undefined) {
    if (!payload.turno || !allowedTurnos.includes(payload.turno)) {
      return 'Debe seleccionar un turno valido';
    }
  }

  if (!partial || payload.estado !== undefined) {
    const estado = normalizeEstadoInput(payload.estado || 'abierta');
    if (!allowedEstados.includes(estado)) {
      return 'Debe seleccionar un estado valido';
    }
  }

  if (!partial || payload.fecha_programada !== undefined) {
    if (!payload.fecha_programada || !toSqlDatetimeNoSeconds(payload.fecha_programada)) {
      return 'La fecha programada no es valida';
    }
  }

  return null;
};

const buildUploadsUrl = (req, relativePath, folder) => {
  if (!relativePath) return null;
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  if (String(relativePath).startsWith('/uploads/')) return `${baseUrl}${relativePath}`;
  return `${baseUrl}/uploads/${folder}/${relativePath}`;
};

const mapRow = (req, row) => ({
  ...row,
  producto_url_foto: buildUploadsUrl(req, row.producto_url_foto, 'productos'),
  personal_url_foto: buildUploadsUrl(req, row.personal_url_foto, 'personal')
});

export const getOrdenesProduccion = async (req, res) => {
  try {
    const { fecha_inicio: fechaInicio, fecha_final: fechaFinal, estado } = req.query;

    const filters = [];
    const params = [];

    if (fechaInicio) {
      filters.push('op.fecha_programada >= ?');
      params.push(`${fechaInicio} 00:00:00`);
    }

    if (fechaFinal) {
      filters.push('op.fecha_programada <= ?');
      params.push(`${fechaFinal} 23:59:59`);
    }

    if (estado) {
      filters.push('op.estado = ?');
      params.push(estado);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const [rows] = await db.query(
      `
        SELECT
          op.*,
          p.nombre AS producto_nombre,
          p.url_foto AS producto_url_foto,
          CONCAT(per.nombres, ' ', per.apellidos) AS personal_nombre,
          per.rol AS personal_cargo,
          per.url_foto AS personal_url_foto,
          DATE_FORMAT(op.fecha_programada, '%Y-%m-%d %H:%i') AS fecha_programada,
          DATE_FORMAT(op.fecha_producida, '%Y-%m-%d %H:%i') AS fecha_producida
        FROM ordenes_produccion op
        INNER JOIN productos p ON p.id = op.producto_id
        INNER JOIN personal per ON per.id = op.personal_id
        ${whereClause}
        ORDER BY op.fecha_programada DESC, op.id DESC
      `,
      params
    );

    res.json({ success: true, data: rows.map((row) => mapRow(req, row)) });
  } catch (error) {
    console.error('Error en getOrdenesProduccion:', error);
    res.status(500).json({ success: false, message: 'Error al obtener ordenes de produccion' });
  }
};

export const getOrdenProduccionById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `
        SELECT
          op.*,
          p.nombre AS producto_nombre,
          p.url_foto AS producto_url_foto,
          CONCAT(per.nombres, ' ', per.apellidos) AS personal_nombre,
          per.rol AS personal_cargo,
          per.url_foto AS personal_url_foto,
          DATE_FORMAT(op.fecha_programada, '%Y-%m-%d %H:%i') AS fecha_programada,
          DATE_FORMAT(op.fecha_producida, '%Y-%m-%d %H:%i') AS fecha_producida
        FROM ordenes_produccion op
        INNER JOIN productos p ON p.id = op.producto_id
        INNER JOIN personal per ON per.id = op.personal_id
        WHERE op.id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Orden de produccion no encontrada' });
    }

    res.json({ success: true, data: mapRow(req, rows[0]) });
  } catch (error) {
    console.error('Error en getOrdenProduccionById:', error);
    res.status(500).json({ success: false, message: 'Error al obtener orden de produccion' });
  }
};

export const createOrdenProduccion = async (req, res) => {
  try {
    const payload = req.body || {};
    const personalId = req.user?.id ?? null;
    const validationError = validatePayload(payload);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const [result] = await db.query(
      `
        INSERT INTO ordenes_produccion (
          programa_id,
          producto_id,
          personal_id,
          cantidad_programada,
          cantidad_producida,
          cantidad_defectuosa,
          fecha_programada,
          fecha_producida,
          turno,
          estado,
          observaciones_operario,
          costo_mano_obra,
          costo_materia_prima,
          costo_insumos,
          costo_indirectos,
          observaciones_costos_indirectos
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        payload.programa_id ? Number(payload.programa_id) : null,
        Number(payload.producto_id),
        Number(payload.personal_id),
        toNumber(payload.cantidad_programada),
        toNumber(payload.cantidad_producida),
        toNumber(payload.cantidad_defectuosa),
        toSqlDatetimeNoSeconds(payload.fecha_programada),
        payload.fecha_producida ? toSqlDatetimeNoSeconds(payload.fecha_producida) : null,
        payload.turno,
        normalizeEstadoInput(payload.estado || 'abierta'),
        payload.observaciones_operario ? String(payload.observaciones_operario).trim() : null,
        toNumber(payload.costo_mano_obra),
        toNumber(payload.costo_materia_prima),
        toNumber(payload.costo_insumos),
        toNumber(payload.costo_indirectos),
        payload.observaciones_costos_indirectos ? String(payload.observaciones_costos_indirectos).trim() : null
      ]
    );

    await registrarAccion({
      tabla: 'ordenes_produccion',
      operacion: 'INSERT',
      registroId: result.insertId,
      personalId,
      detalles: {
        producto_id: Number(payload.producto_id),
        personal_id: Number(payload.personal_id),
        cantidad_programada: toNumber(payload.cantidad_programada),
        turno: payload.turno,
        estado: normalizeEstadoInput(payload.estado || 'abierta')
      }
    });

    req.params.id = result.insertId;
    return getOrdenProduccionById(req, res);
  } catch (error) {
    console.error('Error en createOrdenProduccion:', error);
    if (error?.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ success: false, message: 'Producto o personal no valido' });
    }
    res.status(500).json({ success: false, message: 'Error al crear orden de produccion' });
  }
};

export const updateOrdenProduccion = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};
    const personalId = req.user?.id ?? null;

    const [existing] = await db.query('SELECT id FROM ordenes_produccion WHERE id = ? LIMIT 1', [id]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Orden de produccion no encontrada' });
    }

    const validationError = validatePayload(payload);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    await db.query(
      `
        UPDATE ordenes_produccion
        SET programa_id = ?,
            producto_id = ?,
            personal_id = ?,
            cantidad_programada = ?,
            cantidad_producida = ?,
            cantidad_defectuosa = ?,
            fecha_programada = ?,
            fecha_producida = ?,
            turno = ?,
            estado = ?,
            observaciones_operario = ?,
            costo_mano_obra = ?,
            costo_materia_prima = ?,
            costo_insumos = ?,
            costo_indirectos = ?,
            observaciones_costos_indirectos = ?
        WHERE id = ?
      `,
      [
        payload.programa_id ? Number(payload.programa_id) : null,
        Number(payload.producto_id),
        Number(payload.personal_id),
        toNumber(payload.cantidad_programada),
        toNumber(payload.cantidad_producida),
        toNumber(payload.cantidad_defectuosa),
        toSqlDatetimeNoSeconds(payload.fecha_programada),
        payload.fecha_producida ? toSqlDatetimeNoSeconds(payload.fecha_producida) : null,
        payload.turno,
        normalizeEstadoInput(payload.estado || 'abierta'),
        payload.observaciones_operario ? String(payload.observaciones_operario).trim() : null,
        toNumber(payload.costo_mano_obra),
        toNumber(payload.costo_materia_prima),
        toNumber(payload.costo_insumos),
        toNumber(payload.costo_indirectos),
        payload.observaciones_costos_indirectos ? String(payload.observaciones_costos_indirectos).trim() : null,
        Number(id)
      ]
    );

    await registrarAccion({
      tabla: 'ordenes_produccion',
      operacion: 'UPDATE',
      registroId: Number(id),
      personalId,
      detalles: {
        producto_id: Number(payload.producto_id),
        personal_id: Number(payload.personal_id),
        cantidad_programada: toNumber(payload.cantidad_programada),
        cantidad_producida: toNumber(payload.cantidad_producida),
        estado: normalizeEstadoInput(payload.estado || 'abierta')
      }
    });

    return getOrdenProduccionById(req, res);
  } catch (error) {
    console.error('Error en updateOrdenProduccion:', error);
    if (error?.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ success: false, message: 'Producto o personal no valido' });
    }
    res.status(500).json({ success: false, message: 'Error al actualizar orden de produccion' });
  }
};

export const updateFechaProgramada = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_programada: fechaProgramada } = req.body || {};
    const personalId = req.user?.id ?? null;

    const sqlDateTime = toSqlDatetimeNoSeconds(fechaProgramada);
    if (!sqlDateTime) {
      return res.status(400).json({ success: false, message: 'La fecha programada no es valida' });
    }

    const [result] = await db.query(
      'UPDATE ordenes_produccion SET fecha_programada = ? WHERE id = ?',
      [sqlDateTime, Number(id)]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Orden de produccion no encontrada' });
    }

    await registrarAccion({
      tabla: 'ordenes_produccion',
      operacion: 'UPDATE',
      registroId: Number(id),
      personalId,
      detalles: { fecha_programada: sqlDateTime }
    });

    return getOrdenProduccionById(req, res);
  } catch (error) {
    console.error('Error en updateFechaProgramada:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar fecha programada' });
  }
};

export const updateRegistroProduccion = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};
    const personalId = req.user?.id ?? null;

    const [rows] = await db.query('SELECT id, estado FROM ordenes_produccion WHERE id = ? LIMIT 1', [Number(id)]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Orden de produccion no encontrada' });
    }

    const estadoActual = normalizeEstadoInput(rows[0].estado);
    if (estadoActual === 'completada') {
      return res.status(400).json({ success: false, message: 'La orden ya esta CUMPLIDA y no se puede editar' });
    }

    const fechaProducida = payload.fecha_producida ? toSqlDatetimeNoSeconds(payload.fecha_producida) : null;
    if (payload.fecha_producida && !fechaProducida) {
      return res.status(400).json({ success: false, message: 'La fecha producida no es valida' });
    }

    await db.query(
      `
        UPDATE ordenes_produccion
        SET fecha_producida = ?,
            cantidad_producida = ?,
            cantidad_defectuosa = ?,
            observaciones_operario = ?,
            estado = ?
        WHERE id = ?
      `,
      [
        fechaProducida,
        toNumber(payload.cantidad_producida),
        toNumber(payload.cantidad_defectuosa),
        payload.observaciones_operario ? String(payload.observaciones_operario).trim() : null,
        normalizeEstadoInput(payload.estado || estadoActual),
        Number(id)
      ]
    );

    await registrarAccion({
      tabla: 'ordenes_produccion',
      operacion: 'UPDATE',
      registroId: Number(id),
      personalId,
      detalles: {
        fecha_producida: fechaProducida,
        cantidad_producida: toNumber(payload.cantidad_producida),
        cantidad_defectuosa: toNumber(payload.cantidad_defectuosa),
        estado: normalizeEstadoInput(payload.estado || estadoActual)
      }
    });

    return getOrdenProduccionById(req, res);
  } catch (error) {
    console.error('Error en updateRegistroProduccion:', error);
    res.status(500).json({ success: false, message: 'Error al registrar produccion' });
  }
};

export const cerrarOrdenProduccion = async (req, res) => {
  try {
    const { id } = req.params;
    const personalId = req.user?.id ?? null;

    const [rows] = await db.query('SELECT id, estado FROM ordenes_produccion WHERE id = ? LIMIT 1', [Number(id)]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Orden de produccion no encontrada' });
    }

    const estadoActual = normalizeEstadoInput(rows[0].estado);
    if (estadoActual === 'completada') {
      return res.status(400).json({ success: false, message: 'La orden ya esta CUMPLIDA' });
    }

    await db.query(
      'UPDATE ordenes_produccion SET estado = ?, fecha_producida = COALESCE(fecha_producida, NOW()) WHERE id = ?',
      ['completada', Number(id)]
    );

    await registrarAccion({
      tabla: 'ordenes_produccion',
      operacion: 'UPDATE',
      registroId: Number(id),
      personalId,
      detalles: { estado: 'completada' }
    });

    return getOrdenProduccionById(req, res);
  } catch (error) {
    console.error('Error en cerrarOrdenProduccion:', error);
    res.status(500).json({ success: false, message: 'Error al cerrar orden de produccion' });
  }
};

export const deleteOrdenProduccion = async (req, res) => {
  try {
    const { id } = req.params;
    const personalId = req.user?.id ?? null;

    const [ordenRows] = await db.query('SELECT * FROM ordenes_produccion WHERE id = ? LIMIT 1', [Number(id)]);
    const ordenEliminada = ordenRows[0];

    if (!ordenEliminada) {
      return res.status(404).json({ success: false, message: 'Orden de produccion no encontrada' });
    }

    const [result] = await db.query('DELETE FROM ordenes_produccion WHERE id = ?', [id]);

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Orden de produccion no encontrada' });
    }

    await registrarAccion({
      tabla: 'ordenes_produccion',
      operacion: 'DELETE',
      registroId: Number(id),
      personalId,
      detalles: ordenEliminada
    });

    res.json({ success: true, message: 'Orden de produccion eliminada' });
  } catch (error) {
    console.error('Error en deleteOrdenProduccion:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar orden de produccion' });
  }
};

export const inventarioParaOrden = async (req, res) => {
  try {
    const { id } = req.params;
    const ordenId = Number(id);

    const sql = `
    SELECT 
        a.id as articulo_id,
        a.nombre AS articulo_nombre,
        (f.cantidad_necesaria * COALESCE(op.cantidad_programada, 0)) AS cantidad_necesaria_total,
        COALESCE(k.saldo_cantidad, 0) AS saldo_cantidad,
        CASE 
            WHEN (COALESCE(k.saldo_cantidad, 0) - (f.cantidad_necesaria * COALESCE(op.cantidad_programada, 0))) < 0 
            THEN CAST((COALESCE(k.saldo_cantidad, 0) - (f.cantidad_necesaria * COALESCE(op.cantidad_programada, 0))) AS CHAR)
            ELSE 'No falta'
        END AS cantidad_faltante
    FROM ordenes_produccion op
    INNER JOIN ficha_tecnica f ON f.producto_id = op.producto_id
    LEFT JOIN articulos a ON a.id = f.articulo_id
    LEFT JOIN (
        SELECT ka.articulo_id, ka.saldo_cantidad
        FROM kardex_articulos ka
        INNER JOIN (
            SELECT articulo_id, MAX(id) AS max_id
            FROM kardex_articulos
            GROUP BY articulo_id
        ) max_k ON ka.id = max_k.max_id
    ) k ON k.articulo_id = f.articulo_id
    WHERE op.id = ?
    ORDER BY a.nombre ASC
    `;

    console.log('inventarioParaOrden SQL:', sql, 'ordenId:', ordenId);

    const [rows] = await db.query(sql, [ordenId]);
    console.log('inventarioParaOrden rows:', rows);
    const rowsNorm = rows.map(r => ({
      ...r,
      cantidad_necesaria_total: normalizeDecimal(r.cantidad_necesaria_total),
      saldo_cantidad: normalizeDecimal(r.saldo_cantidad),
      cantidad_faltante: String(r.cantidad_faltante) === 'No falta' ? 'No falta' : normalizeDecimal(r.cantidad_faltante)
    }));

    return res.json({ success: true, data: rowsNorm });
  } catch (error) {
    console.error('Error en inventarioParaOrden:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener inventario para la orden' });
  }
};

import db from '../config/db.js';
import { registrarAccion } from '../helpers/auditoria.helper.js';
import { COMANDA_ESTADOS, DETALLE_ESTADOS, MESA_ESTADOS } from '../constants/domainConstants.js';
import { canAccessComanda, canAccessDetalleComandaById } from '../services/comandaAccessService.js';

const roundMoney = (value) => Number((Number(value) || 0).toFixed(2));

const getAuthenticatedPersonalId = (req) => Number(req?.user?.id || 0);

const recalcularTotalesComanda = async (comandaId) => {
  const [rows] = await db.query(
    `SELECT COALESCE(SUM(valor_subtotal), 0) AS total_sin_servicio
     FROM comandas_detalle
     WHERE comanda_id = ?`,
    [Number(comandaId)]
  );

  const totalSinServicio = Number(rows?.[0]?.total_sin_servicio || 0);

  await db.query(
    `UPDATE comandas
     SET total_sin_servicio = ?,
         total_final = ? + COALESCE(servicio_voluntario, 0)
     WHERE id = ?`,
    [totalSinServicio, totalSinServicio, Number(comandaId)]
  );
};

const emitRefreshCocina = async (req, comandaId) => {
  const numericComandaId = Number(comandaId || 0);
  if (!numericComandaId) return;

  const io = req?.app?.get?.('socketio');
  if (io && typeof io.to === 'function') {
    io.to('role:COCINA').emit('refresh-cocina', { comanda_id: numericComandaId });
  }
};

const emitMeseroActualizoParaCocina = async (req, comandaId, options = {}) => {
  const id = Number(comandaId || 0);
  if (!id) return;

  await emitRefreshCocina(req, id);

  const io = req?.app?.get?.('socketio');
  if (!io || typeof io.emit !== 'function') return;

  const tipo = options.kind === 'detalle' ? 'detalle' : 'cabecera';
  const payload = {
    comanda_id: id,
    tipo,
    ...(options.detalle_id ? { detalle_id: Number(options.detalle_id) } : {})
  };

  if (typeof io.to === 'function') {
    io.to('role:COCINA').emit('cocina-comanda-actualizada', payload);
  }
};

const getAporteServicioPorcentaje = async () => {
  const [rows] = await db.query(
    `SELECT valor_parametro
     FROM parametros_sistema
     WHERE nombre_parametro = 'aporte_servicio'
     LIMIT 1`
  );

  const parsed = Number(rows?.[0]?.valor_parametro);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return roundMoney(parsed);
};

const fetchComandaMostradorRow = async (comandaId, personalId) => {
  const [comandas] = await db.query(
    `SELECT
      c.id,
      c.mesa_id,
      c.personal_id,
      c.cliente_nombre,
      c.datos_cliente,
      c.fecha_hora,
      c.total_sin_servicio,
      c.servicio_voluntario,
      c.total_final,
      c.forma_pago,
      c.estado_comanda,
      c.prioridad,
      m.nombre AS mesa_nombre,
      m.numero AS mesa_numero
    FROM comandas c
    LEFT JOIN mesas m ON c.mesa_id = m.id
    WHERE c.id = ? AND c.personal_id = ?`,
    [Number(comandaId), Number(personalId)]
  );

  if (!comandas.length) return null;

  const [detalles] = await db.query(
    `SELECT
      cd.id,
      cd.comanda_id,
      cd.producto_id,
      cd.cantidad,
      cd.estado_producto,
      cd.precio_unitario,
      cd.valor_subtotal,
      cd.observaciones_cocina,
      cd.observaciones_mesero,
      p.nombre AS producto_nombre,
      p.url_foto AS producto_url_foto
    FROM comandas_detalle cd
    LEFT JOIN productos p ON cd.producto_id = p.id
    WHERE cd.comanda_id = ?
    ORDER BY cd.id DESC`,
    [Number(comandaId)]
  );

  const aporteServicioPorcentaje = await getAporteServicioPorcentaje();
  const subtotalDetalle = (detalles || []).reduce(
    (sum, item) => sum + roundMoney(item.valor_subtotal),
    0
  );
  const servicio = roundMoney(subtotalDetalle * (aporteServicioPorcentaje / 100));

  return {
    ...comandas[0],
    total_sin_servicio: roundMoney(subtotalDetalle),
    aporte_servicio_porcentaje: aporteServicioPorcentaje,
    servicio_voluntario: servicio,
    total_final: roundMoney(subtotalDetalle + servicio),
    detalles: (detalles || []).map((item) => ({
      ...item,
      precio_unitario: roundMoney(item.precio_unitario),
      valor_subtotal: roundMoney(item.valor_subtotal)
    }))
  };
};

export const getMesasMostrador = async (_req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, numero, estado, ubicacion FROM mesas ORDER BY nombre ASC'
    );
    return res.json({ success: true, data: rows || [] });
  } catch (error) {
    console.error('Error en getMesasMostrador:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener mesas para mostrador.' });
  }
};

export const getProductosActivosMostrador = async (_req, res) => {
  try {
    const [productos] = await db.query(
      `SELECT
        p.id,
        p.nombre,
        p.categoria_id,
        p.url_foto,
        p.estado,
        c.nombre AS categoria_nombre,
        hp.precio_unitario,
        hp.id AS precio_id
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN (
        SELECT hp1.producto_id, hp1.precio_unitario, hp1.id
        FROM historial_precios hp1
        INNER JOIN (
          SELECT producto_id, MAX(id) AS max_id
          FROM historial_precios
          WHERE UPPER(TRIM(estado)) = 'ACTIVO'
          GROUP BY producto_id
        ) hp_last ON hp_last.max_id = hp1.id
      ) hp ON p.id = hp.producto_id
      WHERE UPPER(TRIM(p.estado)) = 'ACTIVO'
      ORDER BY c.nombre ASC, p.nombre ASC`
    );

    return res.json({ success: true, data: productos || [] });
  } catch (error) {
    console.error('Error en getProductosActivosMostrador:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener productos activos.' });
  }
};

export const getCategoriasMostrador = async (_req, res) => {
  try {
    const [categorias] = await db.query(
      `SELECT DISTINCT c.id, c.nombre
       FROM categorias c
       JOIN productos p ON c.id = p.categoria_id
       WHERE p.estado = 'Activo'
       ORDER BY c.nombre ASC`
    );

    return res.json({ success: true, data: categorias || [] });
  } catch (error) {
    console.error('Error en getCategoriasMostrador:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener categorias.' });
  }
};

export const createComandaMostrador = async (req, res) => {
  try {
    const { mesa_id, cliente_nombre, datos_cliente, estado_comanda, prioridad } = req.body;
    const personalId = getAuthenticatedPersonalId(req);

    if (!mesa_id || !personalId) {
      return res.status(400).json({ success: false, message: 'Faltan datos requeridos.' });
    }

    const [result] = await db.query(
      `INSERT INTO comandas (mesa_id, personal_id, cliente_nombre, datos_cliente, estado_comanda, prioridad)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        Number(mesa_id),
        personalId,
        cliente_nombre || 'Consumidor Final',
        datos_cliente ?? null,
        estado_comanda || COMANDA_ESTADOS.EN_PROCESO,
        prioridad || 'Media'
      ]
    );

    const comandaId = result.insertId;

    await db.query(
      'UPDATE mesas SET estado = ? WHERE id = ?',
      [MESA_ESTADOS.OCUPADA, Number(mesa_id)]
    );

    await registrarAccion({
      tabla: 'comandas',
      operacion: 'INSERT',
      registroId: comandaId,
      personalId,
      detalles: {
        mesa_id: Number(mesa_id),
        cliente_nombre: cliente_nombre || 'Consumidor Final',
        datos_cliente: datos_cliente ?? null,
        estado_comanda: estado_comanda || COMANDA_ESTADOS.EN_PROCESO,
        prioridad: prioridad || 'Media',
        origen: 'mostrador-caja'
      }
    });

    const io = req.app.get('socketio');
    if (io && typeof io.emit === 'function') {
      io.emit('flash-comanda', { id: Number(comandaId), mesa: Number(mesa_id) });
    }

    await emitRefreshCocina(req, comandaId);

    const comanda = await fetchComandaMostradorRow(comandaId, personalId);

    return res.status(201).json({
      success: true,
      message: 'Comanda de mostrador creada correctamente.',
      data: comanda
    });
  } catch (error) {
    console.error('Error en createComandaMostrador:', error);
    return res.status(500).json({ success: false, message: 'Error al crear comanda de mostrador.' });
  }
};

export const getComandaMostradorById = async (req, res) => {
  try {
    const comandaId = Number(req.params.id);
    const personalId = getAuthenticatedPersonalId(req);

    if (!comandaId || !personalId) {
      return res.status(400).json({ success: false, message: 'Comanda invalida.' });
    }

    const comanda = await fetchComandaMostradorRow(comandaId, personalId);
    if (!comanda) {
      return res.status(404).json({ success: false, message: 'Comanda no encontrada.' });
    }

    return res.json({ success: true, data: comanda });
  } catch (error) {
    console.error('Error en getComandaMostradorById:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener comanda de mostrador.' });
  }
};

export const addDetalleMostrador = async (req, res) => {
  try {
    const comandaId = Number(req.params.id);
    const productoId = Number(req.body.producto_id);
    const cantidad = Number(req.body.cantidad);
    const observacionesMeseroRaw = req.body.observaciones_mesero;
    const observacionesMesero = String(observacionesMeseroRaw || '').trim().slice(0, 255) || null;
    const personalId = getAuthenticatedPersonalId(req);

    if (!personalId) {
      return res.status(401).json({ success: false, message: 'No autorizado.' });
    }

    if (!comandaId || !productoId || !cantidad || Number.isNaN(cantidad) || cantidad <= 0) {
      return res.status(400).json({ success: false, message: 'Faltan datos requeridos.' });
    }

    const [comandas] = await db.query('SELECT id FROM comandas WHERE id = ?', [comandaId]);
    if (!comandas.length || !(await canAccessComanda(db, comandaId, personalId))) {
      return res.status(404).json({ success: false, message: 'Comanda no encontrada.' });
    }

    const [precios] = await db.query(
      `SELECT hp.precio_unitario
       FROM historial_precios hp
       WHERE hp.producto_id = ?
         AND UPPER(TRIM(hp.estado)) = 'ACTIVO'
       ORDER BY hp.fecha_registro DESC, hp.id DESC
       LIMIT 1`,
      [productoId]
    );

    if (!precios.length) {
      return res.status(404).json({ success: false, message: 'Producto sin precio activo.' });
    }

    const precioUnitario = precios[0].precio_unitario;

    const [existentesOrdenados] = await db.query(
      `SELECT id, cantidad, precio_unitario, observaciones_mesero
       FROM comandas_detalle
       WHERE comanda_id = ? AND producto_id = ?
         AND UPPER(TRIM(estado_producto)) = UPPER(?)
       ORDER BY id ASC
       LIMIT 1`,
      [comandaId, productoId, DETALLE_ESTADOS.ORDENADO]
    );

    let detalleId;

    if (existentesOrdenados.length) {
      const existente = existentesOrdenados[0];
      detalleId = Number(existente.id);
      const cantidadActual = Number(existente.cantidad || 0);
      const nuevaCantidad = cantidadActual + cantidad;
      const precioDetalle = Number(existente.precio_unitario || precioUnitario);
      const valorSubtotalMerge = nuevaCantidad * precioDetalle;
      const observacionesFinal = observacionesMesero ?? existente.observaciones_mesero ?? null;

      await db.query(
        `UPDATE comandas_detalle
         SET cantidad = ?, valor_subtotal = ?, observaciones_mesero = ?
         WHERE id = ?`,
        [nuevaCantidad, valorSubtotalMerge, observacionesFinal, detalleId]
      );
    } else {
      const valorSubtotal = Number(cantidad) * Number(precioUnitario);
      const [result] = await db.query(
        `INSERT INTO comandas_detalle (
          comanda_id, producto_id, cantidad, precio_unitario, valor_subtotal, estado_producto, observaciones_mesero
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          comandaId,
          productoId,
          cantidad,
          precioUnitario,
          valorSubtotal,
          DETALLE_ESTADOS.ORDENADO,
          observacionesMesero
        ]
      );
      detalleId = Number(result.insertId);
    }

    await recalcularTotalesComanda(comandaId);
    await emitMeseroActualizoParaCocina(req, comandaId, { kind: 'detalle', detalle_id: detalleId });

    const [detalles] = await db.query(
      `SELECT
        cd.id,
        cd.comanda_id,
        cd.producto_id,
        cd.cantidad,
        cd.precio_unitario,
        cd.valor_subtotal,
        cd.observaciones_mesero,
        p.nombre AS producto_nombre,
        p.url_foto AS producto_url_foto
      FROM comandas_detalle cd
      LEFT JOIN productos p ON cd.producto_id = p.id
      WHERE cd.id = ?`,
      [detalleId]
    );

    return res.status(201).json({
      success: true,
      message: 'Producto agregado a la comanda.',
      data: detalles[0] || null
    });
  } catch (error) {
    console.error('Error en addDetalleMostrador:', error);
    return res.status(500).json({ success: false, message: 'Error al agregar producto.' });
  }
};

export const updateDetalleMostrador = async (req, res) => {
  try {
    const detalleId = Number(req.params.id);
    const { cantidad, observaciones_mesero: observacionesMeseroRaw } = req.body;
    const cantidadNormalizada = cantidad === undefined ? undefined : Number(cantidad);
    const observaciones_mesero = observacionesMeseroRaw === undefined
      ? undefined
      : (String(observacionesMeseroRaw || '').trim().slice(0, 255) || null);
    const personalId = getAuthenticatedPersonalId(req);

    if (!personalId) {
      return res.status(401).json({ success: false, message: 'No autorizado.' });
    }

    const [detalles] = await db.query(
      'SELECT * FROM comandas_detalle WHERE id = ?',
      [detalleId]
    );

    if (!detalles.length) {
      return res.status(404).json({ success: false, message: 'Detalle no encontrado.' });
    }

    const hasAccess = await canAccessDetalleComandaById(db, detalleId, personalId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'No autorizado para modificar esta comanda.' });
    }

    if (cantidadNormalizada === undefined && observaciones_mesero === undefined) {
      return res.status(400).json({ success: false, message: 'No hay cambios para actualizar.' });
    }

    if (cantidadNormalizada !== undefined && (!Number.isFinite(cantidadNormalizada) || cantidadNormalizada <= 0)) {
      return res.status(400).json({ success: false, message: 'La cantidad debe ser mayor a cero.' });
    }

    const precioUnitario = Number(detalles[0].precio_unitario || 0);
    const valorSubtotal = cantidadNormalizada === undefined
      ? null
      : Number(cantidadNormalizada) * precioUnitario;

    let updateQuery = 'UPDATE comandas_detalle SET ';
    const params = [];

    if (cantidadNormalizada !== undefined) {
      updateQuery += 'cantidad = ?, valor_subtotal = ?, ';
      params.push(cantidadNormalizada, valorSubtotal);
    }
    if (observaciones_mesero !== undefined) {
      updateQuery += 'observaciones_mesero = ?, ';
      params.push(observaciones_mesero);
    }

    updateQuery = updateQuery.slice(0, -2);
    updateQuery += ' WHERE id = ?';
    params.push(detalleId);

    await db.query(updateQuery, params);
    await recalcularTotalesComanda(detalles[0].comanda_id);
    await emitMeseroActualizoParaCocina(req, Number(detalles[0].comanda_id), {
      kind: 'detalle',
      detalle_id: detalleId
    });

    const [updated] = await db.query(
      `SELECT
        cd.id,
        cd.comanda_id,
        cd.producto_id,
        cd.cantidad,
        cd.precio_unitario,
        cd.valor_subtotal,
        cd.observaciones_mesero,
        p.nombre AS producto_nombre,
        p.url_foto AS producto_url_foto
      FROM comandas_detalle cd
      LEFT JOIN productos p ON cd.producto_id = p.id
      WHERE cd.id = ?`,
      [detalleId]
    );

    return res.json({
      success: true,
      message: 'Detalle actualizado correctamente.',
      data: updated[0] || null
    });
  } catch (error) {
    console.error('Error en updateDetalleMostrador:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar detalle.' });
  }
};

export const deleteDetalleMostrador = async (req, res) => {
  try {
    const detalleId = Number(req.params.id);
    const personalId = getAuthenticatedPersonalId(req);

    if (!personalId) {
      return res.status(401).json({ success: false, message: 'No autorizado.' });
    }

    const [detalles] = await db.query(
      'SELECT * FROM comandas_detalle WHERE id = ?',
      [detalleId]
    );

    if (!detalles.length) {
      return res.status(404).json({ success: false, message: 'Detalle no encontrado.' });
    }

    const hasAccess = await canAccessDetalleComandaById(db, detalleId, personalId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'No autorizado para modificar esta comanda.' });
    }

    const comandaId = Number(detalles[0].comanda_id || 0);

    await db.query('DELETE FROM comandas_detalle WHERE id = ?', [detalleId]);
    await recalcularTotalesComanda(comandaId);
    await emitMeseroActualizoParaCocina(req, comandaId, {
      kind: 'detalle',
      detalle_id: detalleId
    });

    await registrarAccion({
      tabla: 'comandas_detalle',
      operacion: 'DELETE',
      registroId: detalleId,
      personalId,
      detalles: detalles[0]
    });

    return res.json({
      success: true,
      message: 'Detalle eliminado correctamente.',
      data: { id: detalleId, comanda_id: comandaId }
    });
  } catch (error) {
    console.error('Error en deleteDetalleMostrador:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar detalle.' });
  }
};

const emitComandaCerradaMostrador = async (req, comandaData = {}) => {
  const io = req?.app?.get?.('socketio');
  if (!io || typeof io.emit !== 'function') return;

  const payload = {
    id_comanda: Number(comandaData?.id || 0),
    comanda_id: Number(comandaData?.id || 0),
    id: Number(comandaData?.id || 0),
    mesa_id: Number(comandaData?.mesa_id || 0),
    mesa_nombre: comandaData?.mesa_nombre || null,
    cliente_nombre: comandaData?.cliente_nombre || null,
    total_sin_servicio: Number(comandaData?.total_sin_servicio || 0),
    total_final: Number(comandaData?.total_final || 0),
    forma_pago: comandaData?.forma_pago || null,
    estado_comanda: COMANDA_ESTADOS.CERRADA,
    fecha_hora: comandaData?.fecha_hora || new Date().toISOString()
  };

  if (typeof io.to === 'function') {
    io.to('role:CAJA').emit('comanda-cerrada', payload);
    io.to('role:COCINA').emit('comanda-cerrada', payload);
    io.to('role:ADMIN').emit('comanda-cerrada', payload);
  } else {
    io.emit('comanda-cerrada', payload);
  }
};

export const cerrarComandaMostrador = async (req, res) => {
  try {
    const comandaId = Number(req.params.id);
    const personalId = getAuthenticatedPersonalId(req);

    if (!comandaId || !personalId) {
      return res.status(400).json({ success: false, message: 'Comanda invalida.' });
    }

    const [comandas] = await db.query(
      `SELECT id, estado_comanda, mesa_id
       FROM comandas
       WHERE id = ? AND personal_id = ?`,
      [comandaId, personalId]
    );

    if (!comandas.length) {
      return res.status(404).json({ success: false, message: 'Comanda no encontrada.' });
    }

    const comandaActual = comandas[0];
    const estadoActual = String(comandaActual.estado_comanda || '').trim();

    if (estadoActual === COMANDA_ESTADOS.CERRADA) {
      const comanda = await fetchComandaMostradorRow(comandaId, personalId);
      return res.json({ success: true, message: 'La comanda ya esta cerrada.', data: comanda });
    }

    if (estadoActual !== COMANDA_ESTADOS.EN_PROCESO && estadoActual !== COMANDA_ESTADOS.ABIERTA) {
      return res.status(400).json({
        success: false,
        message: `La comanda en estado ${estadoActual} no puede cerrarse para pago.`
      });
    }

    const [detalleResumen] = await db.query(
      'SELECT COUNT(*) AS total_detalles FROM comandas_detalle WHERE comanda_id = ?',
      [comandaId]
    );

    if (!Number(detalleResumen?.[0]?.total_detalles || 0)) {
      return res.status(400).json({
        success: false,
        message: 'No se puede cerrar una comanda sin productos.'
      });
    }

    await db.query(
      `UPDATE comandas_detalle
       SET estado_producto = ?
       WHERE comanda_id = ?`,
      [DETALLE_ESTADOS.PROCESADO, comandaId]
    );

    await recalcularTotalesComanda(comandaId);

    await db.query(
      'UPDATE comandas SET estado_comanda = ? WHERE id = ?',
      [COMANDA_ESTADOS.CERRADA, comandaId]
    );

    await registrarAccion({
      tabla: 'comandas',
      operacion: 'UPDATE',
      registroId: comandaId,
      personalId,
      detalles: { estado_comanda: COMANDA_ESTADOS.CERRADA, origen: 'mostrador-caja' }
    });

    const comanda = await fetchComandaMostradorRow(comandaId, personalId);
    await emitComandaCerradaMostrador(req, comanda);

    return res.json({
      success: true,
      message: 'Comanda de mostrador cerrada correctamente.',
      data: comanda
    });
  } catch (error) {
    console.error('Error en cerrarComandaMostrador:', error);
    return res.status(500).json({ success: false, message: 'Error al cerrar comanda de mostrador.' });
  }
};

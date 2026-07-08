import db from '../config/db.js';
import { registrarAccion } from '../helpers/auditoria.helper.js';
import { COMANDA_ESTADOS, DETALLE_ESTADOS, MESA_ESTADOS } from '../constants/domainConstants.js';
import { canAccessComanda, canAccessDetalleComandaById } from '../services/comandaAccessService.js';

const ESTADOS_BLOQUEADOS_MESERO = [COMANDA_ESTADOS.CERRADA, COMANDA_ESTADOS.PAGADA, COMANDA_ESTADOS.ANULADA, 'Cancelada'];

const normalizarEstado = (estado) => String(estado || '').trim().toLowerCase();

const getAuthenticatedPersonalId = (req) => Number(req?.user?.id || 0);

const emitRefreshCocina = async (req, comandaId) => {
  const numericComandaId = Number(comandaId || 0);
  if (!numericComandaId) return;

  const io = req?.app?.get?.('socketio');
  if (io && typeof io.to === 'function') {
    // Enviar solo a la sala de cocina
    io.to('role:COCINA').emit('refresh-cocina', {
      comanda_id: numericComandaId
    });
  }
};

/**
 * Tras un cambio del mesero: broadcast refresh + evento dedicado para cocina.
 * (io.to(sala) con el shim WS nativo no replica bien todas las salas; el broadcast
 * `refresh-cocina` recarga el KDS; `cocina-comanda-actualizada` dispara toast/sonido en listeners globales.)
 * @param {{ kind?: 'header' | 'detalle', detalle_id?: number }} options
 */
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
    ...(options.detalle_id ? { detalle_id: Number(options.detalle_id) } : {}),
  };
  // Emitir solo a cocina (evitar broadcast global)
  if (io && typeof io.to === 'function') {
    io.to('role:COCINA').emit('cocina-comanda-actualizada', payload);
  }
  console.log('📡 [SOCKET] cocina-comanda-actualizada', payload);
};

const emitComandaCerrada = async (req, comandaData = {}) => {
  const io = req?.app?.get?.('socketio');
  if (!io || typeof io.emit !== 'function') return;

  const comandaCerradaPayload = {
    id_comanda: Number(comandaData?.id || 0),
    comanda_id: Number(comandaData?.id || 0),
    id: Number(comandaData?.id || 0),
    mesa_id: Number(comandaData?.mesa_id || 0),
    mesa_nombre: comandaData?.mesa_nombre || null,
    cliente_nombre: comandaData?.cliente_nombre || null,
    total_sin_servicio: Number(comandaData?.total_sin_servicio || 0),
    total_final: Number(comandaData?.total_final || 0),
    forma_pago: comandaData?.forma_pago || null,
    estado_comanda: 'Cerrada',
    fecha_hora: comandaData?.fecha_hora || new Date().toISOString()
  };

  // Emitir a roles relevantes en lugar de broadcast global
  if (io && typeof io.to === 'function') {
    io.to('role:CAJA').emit('comanda-cerrada', comandaCerradaPayload);
    io.to('role:COCINA').emit('comanda-cerrada', comandaCerradaPayload);
    io.to('role:ADMIN').emit('comanda-cerrada', comandaCerradaPayload);
  } else if (io && typeof io.emit === 'function') {
    io.emit('comanda-cerrada', comandaCerradaPayload);
  }

  console.log('📡 [SOCKET] Evento comanda-cerrada emitido:', { comanda_id: comandaCerradaPayload.id_comanda, mesa: comandaCerradaPayload.mesa_nombre });
};

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

// GET: Obtener todas las comandas del mesero actual
export const getComandas = async (req, res) => {
  try {
    const personalId = req.user?.id;
    if (!personalId) {
      return res.status(401).json({ message: 'No autorizado', status: false });
    }

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
        m.nombre as mesa_nombre,
        m.numero as mesa_numero
      FROM comandas c
      LEFT JOIN mesas m ON c.mesa_id = m.id
      INNER JOIN personal p ON p.id = c.personal_id
      WHERE c.personal_id = ?
        AND p.rol = 'Mesero'
        AND c.estado_comanda IN (?, ?)
      ORDER BY c.fecha_hora DESC`,
      [personalId, COMANDA_ESTADOS.ABIERTA, COMANDA_ESTADOS.EN_PROCESO]
    );

    return res.status(200).json({
      message: 'Comandas obtenidas correctamente',
      status: true,
      data: comandas || []
    });
  } catch (error) {
    console.error('Error en getComandas:', error);
    return res.status(500).json({ message: 'Error interno del servidor', status: false });
  }
};

// GET: Obtener una comanda específica con su detalle
export const getComandaById = async (req, res) => {
  try {
    const { id } = req.params;
    const personalId = getAuthenticatedPersonalId(req);

    if (!personalId) {
      return res.status(401).json({ message: 'No autorizado', status: false });
    }

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
        m.nombre as mesa_nombre,
        m.numero as mesa_numero
      FROM comandas c
      LEFT JOIN mesas m ON c.mesa_id = m.id
      WHERE c.id = ? AND c.personal_id = ?`,
      [id, personalId]
    );

    if (!comandas.length) {
      return res.status(404).json({ message: 'Comanda no encontrada', status: false });
    }

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
        p.nombre as producto_nombre,
        p.url_foto,
        p.categoria_id
      FROM comandas_detalle cd
      LEFT JOIN productos p ON cd.producto_id = p.id
      WHERE cd.comanda_id = ?
      ORDER BY cd.id DESC`,
      [id]
    );

    const comanda = comandas[0];
    comanda.detalles = detalles || [];

    return res.status(200).json({
      message: 'Comanda obtenida correctamente',
      status: true,
      data: comanda
    });
  } catch (error) {
    console.error('Error en getComandaById:', error);
    return res.status(500).json({ message: 'Error interno del servidor', status: false });
  }
};

// POST: Crear nueva comanda
export const createComanda = async (req, res) => {
  try {
    const { mesa_id, cliente_nombre, datos_cliente, estado_comanda, prioridad } = req.body;
    const personalId = req.user?.id;

    if (!mesa_id || !personalId) {
      return res.status(400).json({ message: 'Faltan datos requeridos', status: false });
    }

    const [result] = await db.query(
      `INSERT INTO comandas (mesa_id, personal_id, cliente_nombre, datos_cliente, estado_comanda, prioridad)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        mesa_id,
        personalId,
        cliente_nombre || null,
        datos_cliente || null,
        estado_comanda || COMANDA_ESTADOS.ABIERTA,
        prioridad || 'Media'
      ]
    );

    const comandaId = result.insertId;

    await db.query(
      'UPDATE mesas SET estado = ? WHERE id = ?',
      [MESA_ESTADOS.OCUPADA, mesa_id]
    );

    await registrarAccion({
      tabla: 'comandas',
      operacion: 'INSERT',
      registroId: comandaId,
      personalId,
      detalles: {
        mesa_id: Number(mesa_id),
        cliente_nombre: cliente_nombre || null,
        datos_cliente: datos_cliente || null,
        estado_comanda: estado_comanda || COMANDA_ESTADOS.ABIERTA,
        prioridad: prioridad || 'Media'
      }
    });

    // Obtener la comanda creada
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
        m.nombre as mesa_nombre,
        m.numero as mesa_numero
      FROM comandas c
      LEFT JOIN mesas m ON c.mesa_id = m.id
      WHERE c.id = ?`,
      [comandaId]
    );

    const createdComanda = comandas[0];

    if (req.app.get('socketio') && typeof req.app.get('socketio').emit === 'function') {
      console.log('📡 [SOCKET SERVER] Enviando señal flash a todos los dispositivos');
      req.app.get('socketio').emit('flash-comanda', {
        id: Number(createdComanda?.id || comandaId),
        mesa: createdComanda?.mesa_nombre || null
      });
      console.log('⚡ FLASH emitido por puente socket estilo chat', {
        id: Number(createdComanda?.id || comandaId),
        mesa: createdComanda?.mesa_nombre || null
      });
    }

    await emitRefreshCocina(req, comandaId);

    return res.status(201).json({
      message: 'Comanda creada correctamente',
      status: true,
      data: createdComanda
    });
    
  } catch (error) {
    console.error('Error en createComanda:', error);
    return res.status(500).json({ message: 'Error interno del servidor', status: false });
  }
};

// PUT: Actualizar comanda
export const updateComanda = async (req, res) => {
  try {
    const { id } = req.params;
    const { cliente_nombre, datos_cliente, estado_comanda, forma_pago, prioridad, mesa_id } = req.body;
    const personalId = getAuthenticatedPersonalId(req);

    if (!personalId) {
      return res.status(401).json({ message: 'No autorizado', status: false });
    }

    const [comandas] = await db.query(
      'SELECT id, estado_comanda, mesa_id FROM comandas WHERE id = ?',
      [id]
    );

    if (!comandas.length || !(await canAccessComanda(db, id, personalId))) {
      return res.status(404).json({ message: 'Comanda no encontrada', status: false });
    }

    const comandaActual = comandas[0];
    const estadoActual = String(comandaActual.estado_comanda || COMANDA_ESTADOS.ABIERTA);
    const estadoActualNormalizado = normalizarEstado(estadoActual);
    const estadoSolicitado = estado_comanda !== undefined ? String(estado_comanda || '').trim() : null;
    const estadoSolicitadoNormalizado = normalizarEstado(estadoSolicitado);

    if (estadoSolicitado && ESTADOS_BLOQUEADOS_MESERO.includes(estadoActual) && estadoSolicitado !== estadoActual) {
      return res.status(400).json({
        message: `La comanda ya esta ${estadoActual} y no admite cambios del mesero.`,
        status: false
      });
    }

    if (estadoSolicitadoNormalizado === COMANDA_ESTADOS.CERRADA.toLowerCase()) {
      const estadosFinalesBloqueados = [
        COMANDA_ESTADOS.CERRADA.toLowerCase(),
        COMANDA_ESTADOS.ANULADA.toLowerCase(),
        'cancelada'
      ];

      if (estadosFinalesBloqueados.includes(estadoActualNormalizado)) {
        return res.status(400).json({
          message: `La comanda esta ${estadoActual} y su estado no puede ser modificado.`,
          status: false
        });
      }

      const estadosPermitidosParaCerrar = [
        COMANDA_ESTADOS.ABIERTA.toLowerCase(),
        COMANDA_ESTADOS.EN_PROCESO.toLowerCase()
      ];

      if (!estadosPermitidosParaCerrar.includes(estadoActualNormalizado)) {
        return res.status(400).json({
          message: `La comanda en estado ${estadoActual} no puede enviarse a caja.`,
          status: false
        });
      }

      const [detalleResumen] = await db.query(
        `SELECT
          COUNT(*) AS total_detalles,
          SUM(CASE WHEN estado_producto = ? THEN 1 ELSE 0 END) AS total_ordenados,
          SUM(CASE WHEN estado_producto IS NULL OR estado_producto <> ? THEN 1 ELSE 0 END) AS total_no_procesados
         FROM comandas_detalle
         WHERE comanda_id = ?`,
        [DETALLE_ESTADOS.ORDENADO, DETALLE_ESTADOS.PROCESADO, id]
      );

      const totalDetalles = Number(detalleResumen?.[0]?.total_detalles || 0);
      const totalOrdenados = Number(detalleResumen?.[0]?.total_ordenados || 0);
      const totalNoProcesados = Number(detalleResumen?.[0]?.total_no_procesados || 0);

      if (!totalDetalles) {
        return res.status(400).json({
          message: 'No se puede enviar a caja una comanda sin productos.',
          status: false
        });
      }

      if (totalOrdenados > 0 || totalNoProcesados > 0) {
        return res.status(400).json({
          message: 'No se puede cerrar la comanda: hay productos pendientes de cocina.',
          status: false
        });
      }

      // Garantiza que el encabezado de comanda quede sincronizado con su detalle
      // antes de enviarla a caja.
      await recalcularTotalesComanda(id);
    }

    let updateQuery = 'UPDATE comandas SET ';
    const params = [];

    if (cliente_nombre !== undefined) {
      updateQuery += 'cliente_nombre = ?, ';
      params.push(cliente_nombre);
    }
    if (datos_cliente !== undefined) {
      updateQuery += 'datos_cliente = ?, ';
      params.push(datos_cliente);
    }
    if (estado_comanda !== undefined) {
      updateQuery += 'estado_comanda = ?, ';
      params.push(estado_comanda);
    }
    if (forma_pago !== undefined) {
      updateQuery += 'forma_pago = ?, ';
      params.push(forma_pago);
    }
    if (prioridad !== undefined) {
      updateQuery += 'prioridad = ?, ';
      params.push(prioridad);
    }
    if (mesa_id !== undefined) {
      updateQuery += 'mesa_id = ?, ';
      params.push(Number(mesa_id));
    }

    // Remover última coma
    updateQuery = updateQuery.slice(0, -2);
    updateQuery += ' WHERE id = ?';
    params.push(id);

    await db.query(updateQuery, params);

    // Si se cambió la mesa, liberar la mesa anterior y marcar la nueva como Ocupada
    if (mesa_id !== undefined) {
      const mesaAnteriorId = Number(comandaActual.mesa_id || 0);
      const mesaNuevaId = Number(mesa_id);
      if (mesaAnteriorId && mesaAnteriorId !== mesaNuevaId) {
        await db.query('UPDATE mesas SET estado = ? WHERE id = ?', [MESA_ESTADOS.LIBRE, mesaAnteriorId]);
      }
      if (mesaNuevaId) {
        await db.query('UPDATE mesas SET estado = ? WHERE id = ?', [MESA_ESTADOS.OCUPADA, mesaNuevaId]);
      }
    }

    await registrarAccion({
      tabla: 'comandas',
      operacion: 'UPDATE',
      registroId: Number(id),
      personalId,
      detalles: { cliente_nombre, datos_cliente, estado_comanda, forma_pago, prioridad, mesa_id }
    });

    // Obtener comanda actualizada
    const [updated] = await db.query(
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
        m.nombre as mesa_nombre,
        m.numero as mesa_numero
      FROM comandas c
      LEFT JOIN mesas m ON c.mesa_id = m.id
      WHERE c.id = ?`,
      [id]
    );

    // Emitir evento si la comanda fue cerrada (enviada a caja)
    if (estado_comanda && normalizarEstado(estado_comanda) === COMANDA_ESTADOS.CERRADA.toLowerCase() && updated[0]) {
      await emitComandaCerrada(req, updated[0]);
    } else if (updated[0]) {
      await emitMeseroActualizoParaCocina(req, Number(id));
    }

    return res.status(200).json({
      message: 'Comanda actualizada correctamente',
      status: true,
      data: updated[0]
    });
  } catch (error) {
    console.error('Error en updateComanda:', error);
    return res.status(500).json({ message: 'Error interno del servidor', status: false });
  }
};

// DELETE: Eliminar comanda
export const deleteComanda = async (req, res) => {
  try {
    const { id } = req.params;
    const personalId = getAuthenticatedPersonalId(req);

    if (!personalId) {
      return res.status(401).json({ message: 'No autorizado', status: false });
    }

    const [comandas] = await db.query(
      `SELECT c.*, m.nombre AS nombre_mesa
       FROM comandas c
       LEFT JOIN mesas m ON m.id = c.mesa_id
       WHERE c.id = ? AND c.personal_id = ?`,
      [id, personalId]
    );

    if (!comandas.length) {
      return res.status(404).json({ message: 'Comanda no encontrada', status: false });
    }

    // Eliminar detalles (cascada)
    await db.query('DELETE FROM comandas_detalle WHERE comanda_id = ?', [id]);

    // Garantiza que la mesa asociada vuelva a estado LIBRE en servidor.
    await db.query('UPDATE mesas SET estado = ? WHERE id = ?', [
      MESA_ESTADOS.LIBRE,
      Number(comandas[0]?.mesa_id || 0)
    ]);

    // Eliminar comanda
    await db.query('DELETE FROM comandas WHERE id = ?', [id]);

    await emitRefreshCocina(req, id);

    await registrarAccion({
      tabla: 'comandas',
      operacion: 'DELETE',
      registroId: Number(id),
      personalId,
      detalles: comandas[0]
    });

    return res.status(200).json({
      message: 'Comanda eliminada correctamente',
      status: true
    });
  } catch (error) {
    console.error('Error en deleteComanda:', error);
    return res.status(500).json({ message: 'Error interno del servidor', status: false });
  }
};

// POST: Agregar producto a comanda
export const addProductoComanda = async (req, res) => {
  try {
    const comandaId = Number(req.params.id || req.body.comanda_id);
    const productoId = Number(req.body.producto_id);
    const cantidad = Number(req.body.cantidad);
    const observacionesMeseroRaw = req.body.observaciones_mesero;
    const observacionesMesero = String(observacionesMeseroRaw || '').trim().slice(0, 255) || null;
    const personalId = getAuthenticatedPersonalId(req);

    if (!personalId) {
      return res.status(401).json({ message: 'No autorizado', status: false });
    }

    if (!comandaId || !productoId || !cantidad || Number.isNaN(cantidad) || cantidad <= 0) {
      return res.status(400).json({ message: 'Faltan datos requeridos', status: false });
    }

    // Verificar que la comanda existe
    const [comandas] = await db.query(
      'SELECT id FROM comandas WHERE id = ?',
      [comandaId]
    );

    if (!comandas.length || !(await canAccessComanda(db, comandaId, personalId))) {
      return res.status(404).json({ message: 'Comanda no encontrada', status: false });
    }

    // Obtener el precio unitario del historial activo
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
      return res.status(404).json({ message: 'Producto sin precio activo', status: false });
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

    if (existentesOrdenados.length) {
      const existente = existentesOrdenados[0];
      const detalleId = Number(existente.id);
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

      await registrarAccion({
        tabla: 'comandas_detalle',
        operacion: 'UPDATE',
        registroId: detalleId,
        personalId,
        detalles: {
          comanda_id: comandaId,
          producto_id: productoId,
          cantidad_anterior: cantidadActual,
          cantidad_agregada: cantidad,
          cantidad: nuevaCantidad,
          precio_unitario: precioDetalle,
          valor_subtotal: valorSubtotalMerge,
          observaciones_mesero: observacionesFinal
        }
      });

      await recalcularTotalesComanda(comandaId);

      await emitMeseroActualizoParaCocina(req, comandaId, {
        kind: 'detalle',
        detalle_id: detalleId,
      });

      const [detallesMerge] = await db.query(
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
          p.nombre as producto_nombre,
          p.url_foto
        FROM comandas_detalle cd
        LEFT JOIN productos p ON cd.producto_id = p.id
        WHERE cd.id = ?`,
        [detalleId]
      );

      return res.status(200).json({
        message: 'Cantidad actualizada en detalle existente',
        status: true,
        data: detallesMerge[0]
      });
    }

    const valorSubtotal = Number(cantidad) * Number(precioUnitario);

    const [result] = await db.query(
      `INSERT INTO comandas_detalle (
        comanda_id,
        producto_id,
        cantidad,
        precio_unitario,
        valor_subtotal,
        estado_producto,
        observaciones_mesero
      )
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
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

    await registrarAccion({
      tabla: 'comandas_detalle',
      operacion: 'INSERT',
      registroId: result.insertId,
      personalId,
      detalles: {
        comanda_id: comandaId,
        producto_id: productoId,
        cantidad,
        precio_unitario: Number(precioUnitario),
        valor_subtotal: valorSubtotal,
        observaciones_mesero: observacionesMesero
      }
    });

    await recalcularTotalesComanda(comandaId);

    await emitMeseroActualizoParaCocina(req, comandaId, {
      kind: 'detalle',
      detalle_id: Number(result.insertId),
    });

    // Obtener el detalle creado
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
        p.nombre as producto_nombre,
        p.url_foto
      FROM comandas_detalle cd
      LEFT JOIN productos p ON cd.producto_id = p.id
      WHERE cd.id = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      message: 'Producto agregado a comanda',
      status: true,
      data: detalles[0]
    });
  } catch (error) {
    console.error('Error en addProductoComanda:', error);
    return res.status(500).json({ message: 'Error interno del servidor', status: false });
  }
};

// PUT: Actualizar detalle de comanda
export const updateDetalleComanda = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, observaciones_mesero: observacionesMeseroRaw } = req.body;
    const cantidadNormalizada = cantidad === undefined ? undefined : Number(cantidad);
    const observaciones_mesero = observacionesMeseroRaw === undefined
      ? undefined
      : (String(observacionesMeseroRaw || '').trim().slice(0, 255) || null);
    const personalId = getAuthenticatedPersonalId(req);

    if (!personalId) {
      return res.status(401).json({ message: 'No autorizado', status: false });
    }

    const [detalles] = await db.query(
      `SELECT cd.id, cd.comanda_id, cd.precio_unitario
       FROM comandas_detalle cd
       INNER JOIN comandas c ON c.id = cd.comanda_id
       WHERE cd.id = ?`,
      [id]
    );

    if (!detalles.length) {
      return res.status(404).json({ message: 'Detalle no encontrado', status: false });
    }

    const hasAccess = await canAccessDetalleComandaById(db, id, personalId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'No autorizado para modificar esta comanda', status: false });
    }

    if (cantidadNormalizada === undefined && observaciones_mesero === undefined) {
      return res.status(400).json({
        message: 'No hay cambios para actualizar en el detalle',
        status: false
      });
    }

    if (cantidadNormalizada !== undefined && (!Number.isFinite(cantidadNormalizada) || cantidadNormalizada <= 0)) {
      return res.status(400).json({
        message: 'La cantidad debe ser un numero mayor a cero',
        status: false
      });
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
    params.push(id);

    await db.query(updateQuery, params);
    await recalcularTotalesComanda(detalles[0].comanda_id);

    await registrarAccion({
      tabla: 'comandas_detalle',
      operacion: 'UPDATE',
      registroId: Number(id),
      personalId,
      detalles: {
        comanda_id: Number(detalles[0].comanda_id),
        cantidad: cantidadNormalizada,
        observaciones_mesero,
        valor_subtotal: valorSubtotal
      }
    });

    // Obtener detalle actualizado
    const [updated] = await db.query(
      `SELECT 
        cd.id,
        cd.comanda_id,
        cd.producto_id,
        cd.cantidad,
        cd.precio_unitario,
        cd.valor_subtotal,
        cd.observaciones_cocina,
        cd.observaciones_mesero,
        p.nombre as producto_nombre,
        p.url_foto
      FROM comandas_detalle cd
      LEFT JOIN productos p ON cd.producto_id = p.id
      WHERE cd.id = ?`,
      [id]
    );

    await emitMeseroActualizoParaCocina(req, Number(detalles[0].comanda_id), {
      kind: 'detalle',
      detalle_id: Number(id),
    });

    return res.status(200).json({
      message: 'Detalle actualizado correctamente',
      status: true,
      data: updated[0]
    });
  } catch (error) {
    console.error('Error en updateDetalleComanda:', error);
    return res.status(500).json({ message: 'Error interno del servidor', status: false });
  }
};

// DELETE: Eliminar producto de comanda
export const deleteDetalleComanda = async (req, res) => {
  try {
    const { id } = req.params;
    const personalId = getAuthenticatedPersonalId(req);

    if (!personalId) {
      return res.status(401).json({ message: 'No autorizado', status: false });
    }

    const [detalles] = await db.query(
      `SELECT *
       FROM comandas_detalle cd
       WHERE cd.id = ?`,
      [id]
    );

    if (!detalles.length) {
      return res.status(404).json({ message: 'Detalle no encontrado', status: false });
    }

    const hasAccess = await canAccessDetalleComandaById(db, id, personalId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'No autorizado para modificar esta comanda', status: false });
    }

    await db.query('DELETE FROM comandas_detalle WHERE id = ?', [id]);
    await recalcularTotalesComanda(detalles[0].comanda_id);

    await emitMeseroActualizoParaCocina(req, Number(detalles[0].comanda_id), {
      kind: 'detalle',
      detalle_id: Number(id),
    });

    await registrarAccion({
      tabla: 'comandas_detalle',
      operacion: 'DELETE',
      registroId: Number(id),
      personalId,
      detalles: detalles[0]
    });

    return res.status(200).json({
      message: 'Producto eliminado de comanda',
      status: true
    });
  } catch (error) {
    console.error('Error en deleteDetalleComanda:', error);
    return res.status(500).json({ message: 'Error interno del servidor', status: false });
  }
};

// GET: Obtener productos activos agrupados por categoría
export const getProductosActivos = async (req, res) => {
  try {
    const [productos] = await db.query(
      `SELECT 
        p.id,
        p.nombre,
        p.categoria_id,
        p.url_foto,
        p.estado,
        c.nombre as categoria_nombre,
        hp.precio_unitario,
        hp.id as precio_id
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

    return res.status(200).json({
      message: 'Productos obtenidos correctamente',
      status: true,
      data: productos || []
    });
  } catch (error) {
    console.error('Error en getProductosActivos:', error);
    return res.status(500).json({ message: 'Error interno del servidor', status: false });
  }
};

// GET: Obtener categorías con productos activos
export const getCategoriasConProductos = async (req, res) => {
  try {
    const [categorias] = await db.query(
      `SELECT DISTINCT c.id, c.nombre
       FROM categorias c
       JOIN productos p ON c.id = p.categoria_id
       WHERE p.estado = 'Activo'
       ORDER BY c.nombre ASC`
    );

    return res.status(200).json({
      message: 'Categorías obtenidas correctamente',
      status: true,
      data: categorias || []
    });
  } catch (error) {
    console.error('Error en getCategoriasConProductos:', error);
    return res.status(500).json({ message: 'Error interno del servidor', status: false });
  }
};

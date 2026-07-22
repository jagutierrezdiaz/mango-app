import fs from 'fs/promises';
import path from 'path';
import db from '../config/db.js';
import { registrarAccion } from '../helpers/auditoria.helper.js';
import { eliminarMovimientosCompra, sincronizarCompraDerivados as syncCompraDerivadosInventario } from '../services/inventarioService.js';
import { registrarAsientoPagoFacturaCompra } from '../services/contabilidadService.js';

const TIPOS_DOCUMENTO = ['Factura Electrónica', 'Documento Soporte', 'Recibo de Caja', 'Remisión'];
const ESTADOS_PAGO = ['Pendiente', 'Pagado', 'Pagada', 'Parcial', 'Anulado'];
const COMPRA_EDITABLE_ESTADO = 'Pendiente';
const FORMAS_PAGO = ['Contado', 'Crédito', 'Crédito 15 días', 'Crédito 30 días'];
const CUENTAS_PAGO_COMPRAS = ['110510', '110515', '111005'];

const LEGACY_FORMA_PAGO_ALIASES = {
  Credito: 'Crédito'
};

const DETALLE_COMPRA_ERROR_LOG = path.join(process.cwd(), 'logs', 'backend-detalle-compra-errors.txt');

const normalizeFormaPago = (value, fallback = 'Contado') => {
  const trimmed = String(value ?? fallback).trim();
  return LEGACY_FORMA_PAGO_ALIASES[trimmed] || trimmed;
};

const mensajeCompraNoEditable = (estadoPago) =>
  `No se puede modificar una compra con estado "${estadoPago}". Solo se permiten compras en estado ${COMPRA_EDITABLE_ESTADO}.`;

const assertCompraPendiente = (compra) => {
  if (!compra) {
    return { ok: false, status: 404, message: 'Compra no encontrada' };
  }
  if (compra.estado_pago !== COMPRA_EDITABLE_ESTADO) {
    return { ok: false, status: 400, message: mensajeCompraNoEditable(compra.estado_pago) };
  }
  return { ok: true, compra };
};

const logBackendError = (functionName, error) => {
  console.error(`\n${'='.repeat(50)}`);
  console.error(`❌ ERROR DETECTADO EN: ${functionName}`);
  console.error('MENSAJE:', error?.message);
  if (error?.sql) console.error('SQL FALLIDO:', error.sql);
  if (error?.sqlMessage) console.error('ERROR MYSQL:', error.sqlMessage);
  console.error('='.repeat(50));
  console.error('');
};

const buildDetalleCompraContextLine = (context = {}) => Object.entries(context)
  .filter(([, value]) => value !== undefined)
  .map(([key, value]) => `${key}=${value}`)
  .join(' | ');

const traceDetalleCompraStage = (operation, stage, context = {}) => {
  const contextLine = buildDetalleCompraContextLine(context);
  console.log(`[detalle-compra][${operation}] etapa=${stage}${contextLine ? ` | ${contextLine}` : ''}`);
};

const persistDetalleCompraErrorLog = async ({
  operation,
  stage,
  compraId,
  detalleId,
  articuloId,
  error
}) => {
  const timestamp = new Date().toISOString();
  const stack = String(error?.stack || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
    .join(' | ');

  const lines = [
    `[${timestamp}] operation=${operation}`,
    `stage=${stage}`,
    `compraId=${compraId ?? 'n/a'}`,
    `detalleId=${detalleId ?? 'n/a'}`,
    `articuloId=${articuloId ?? 'n/a'}`,
    `message=${error?.message || 'Sin mensaje'}`,
    `sqlMessage=${error?.sqlMessage || 'n/a'}`,
    `sql=${error?.sql || 'n/a'}`,
    `stack=${stack || 'n/a'}`,
    `${'-'.repeat(80)}`
  ];

  try {
    await fs.mkdir(path.dirname(DETALLE_COMPRA_ERROR_LOG), { recursive: true });
    await fs.appendFile(DETALLE_COMPRA_ERROR_LOG, `${lines.join('\n')}\n`, 'utf8');
  } catch (fileError) {
    console.error('[detalle-compra] No se pudo escribir el log en archivo:', fileError?.message);
  }
};

const normalizeDecimal = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundMoney = (value) => Number((Number(value) || 0).toFixed(2));

const saldoContablePorCuenta = async (executor, cuentaCodigo) => {
  const [rows] = await executor.query(
    `SELECT COALESCE(SUM(CASE WHEN tipo_movimiento = 'Debito' THEN monto ELSE -monto END), 0) AS saldo
     FROM movimientos_contables
     WHERE cuenta_codigo = ?`,
    [cuentaCodigo]
  );
  return roundMoney(rows?.[0]?.saldo || 0);
};

const normalizeDetalle = (detalle = {}) => ({
  id: detalle.id ? Number(detalle.id) : null,
  articulo_id: Number(detalle.articulo_id),
  cantidad: normalizeDecimal(detalle.cantidad),
  costo_unitario: normalizeDecimal(detalle.costo_unitario),
  iva_porcentaje: normalizeDecimal(detalle.iva_porcentaje, 0),
  valor_subtotal: normalizeDecimal(detalle.valor_subtotal)
});

const validateCompraPayload = (payload = {}) => {
  if (!payload.proveedor_id || Number(payload.proveedor_id) <= 0) {
    return 'Debe seleccionar un proveedor válido';
  }

  if (!TIPOS_DOCUMENTO.includes(payload.tipo_documento)) {
    return 'Tipo de documento no válido';
  }

  if (!payload.numero_documento || !String(payload.numero_documento).trim()) {
    return 'Debe ingresar el número de documento';
  }

  if (!payload.fecha_compra) {
    return 'Debe ingresar la fecha de compra';
  }

  if (payload.estado_pago && !ESTADOS_PAGO.includes(payload.estado_pago)) {
    return 'Estado de pago no válido';
  }

  if (payload.forma_pago) {
    const formaPagoNormalizada = normalizeFormaPago(payload.forma_pago);
    if (!FORMAS_PAGO.includes(formaPagoNormalizada)) {
      return 'Forma de pago no válida';
    }
    payload.forma_pago = formaPagoNormalizada;
  }

  return null;
};

const normalizeCompraDateTime = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error('Fecha de compra inválida.');
    }
    return value;
  }

  const raw = String(value).trim().replace('T', ' ');
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (match) {
    const [, yyyy, mm, dd, hh = '00', min = '00', ss = '00'] = match;
    const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(ss), 0);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const fallback = new Date(raw);
  if (!Number.isNaN(fallback.getTime())) return fallback;

  throw new Error('Fecha de compra inválida.');
};

const toSqlDateTimeString = (value) => {
  if (!value) return null;

  const raw = String(value).trim().replace('T', ' ');
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)) {
    return raw;
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(raw)) {
    return `${raw}:00`;
  }

  const date = normalizeCompraDateTime(value);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
};

const getCompraByIdInternal = async (compraId, executor = db) => {
  const [comprasRows] = await executor.query(
    `
      SELECT
        c.id,
        c.proveedor_id,
        c.tipo_documento,
        c.numero_documento,
        c.fecha_compra,
        c.fecha_pagada,
        c.subtotal,
        c.iva_total,
        c.retefuente_total,
        c.reteica_total,
        c.total_pagar,
        c.estado_pago,
        c.forma_pago,
        c.observaciones,
        p.razon_social AS proveedor_razon_social,
        p.url_logo AS proveedor_url_logo
      FROM compras c
      INNER JOIN proveedores p ON p.id = c.proveedor_id
      WHERE c.id = ?
      LIMIT 1
    `,
    [compraId]
  );

  if (!comprasRows.length) {
    return null;
  }

  const [detalleRows] = await executor.query(
    `
      SELECT
        cd.id,
        cd.compra_id,
        cd.articulo_id,
        cd.cantidad,
        cd.costo_unitario,
        cd.iva_porcentaje,
        cd.valor_subtotal,
        a.nombre AS articulo_nombre,
        a.tipo AS articulo_tipo,
        u.abreviatura AS unidad_abreviatura
      FROM compras_detalle cd
      INNER JOIN articulos a ON a.id = cd.articulo_id
      LEFT JOIN unidades u ON u.id = a.unidad_id
      WHERE cd.compra_id = ?
      ORDER BY cd.id DESC
    `,
    [compraId]
  );

  // Convertir valores DECIMAL (strings) a Number usando normalizeDecimal
  const detalles = detalleRows.map(item => ({
    ...item,
    cantidad: normalizeDecimal(item.cantidad),
    costo_unitario: normalizeDecimal(item.costo_unitario),
    iva_porcentaje: normalizeDecimal(item.iva_porcentaje, 0),
    valor_subtotal: normalizeDecimal(item.valor_subtotal)
  }));

  const compraRow = comprasRows[0];
  // Normalizar campos numéricos de la compra
  const compraNormalized = {
    ...compraRow,
    subtotal: normalizeDecimal(compraRow.subtotal),
    iva_total: normalizeDecimal(compraRow.iva_total, 0),
    retefuente_total: normalizeDecimal(compraRow.retefuente_total, 0),
    reteica_total: normalizeDecimal(compraRow.reteica_total, 0),
    total_pagar: normalizeDecimal(compraRow.total_pagar)
  };

  return {
    ...compraNormalized,
    estado: compraRow.estado_pago,
    detalles
  };
};

const sincronizarCompraDerivados = async (connection, compraId, options = {}) => {
  const compra = await getCompraByIdInternal(compraId, connection);

  if (!compra) {
    throw new Error('Compra no encontrada para sincronización.');
  }

  return syncCompraDerivadosInventario(connection, compra, options);
};

export const getComprasCatalogos = async (_req, res) => {
  try {
    return res.json({
      success: true,
      data: {
        tipos_documento: TIPOS_DOCUMENTO,
        formas_pago: FORMAS_PAGO,
        estados_pago: ESTADOS_PAGO
      }
    });
  } catch (error) {
    logBackendError('getComprasCatalogos', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener catálogos de compras.'
    });
  }
};

export const getCompras = async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');

    const fechaInicio = String(req.query?.fecha_inicio || '').trim();
    const fechaFinal = String(req.query?.fecha_final || '').trim();
    const where = [];
    const params = [];

    if (fechaInicio && /^\d{4}-\d{2}-\d{2}$/.test(fechaInicio)) {
      where.push('DATE(c.fecha_compra) >= ?');
      params.push(fechaInicio);
    }

    if (fechaFinal && /^\d{4}-\d{2}-\d{2}$/.test(fechaFinal)) {
      where.push('DATE(c.fecha_compra) <= ?');
      params.push(fechaFinal);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await db.query(
      `
        SELECT
          c.id,
          c.proveedor_id,
          c.tipo_documento,
          c.numero_documento,
          c.fecha_compra,
          c.fecha_pagada,
          c.subtotal,
          c.iva_total,
          c.retefuente_total,
          c.reteica_total,
          c.total_pagar,
          c.estado_pago,
          c.forma_pago,
          c.observaciones,
          p.razon_social AS proveedor_razon_social,
          p.url_logo AS proveedor_url_logo
        FROM compras c
        INNER JOIN proveedores p ON p.id = c.proveedor_id
        ${whereClause}
        ORDER BY c.fecha_compra DESC, c.id DESC
      `,
      params
    );

    const [detalles] = await db.query(
      `
        SELECT
          cd.id,
          cd.compra_id,
          cd.articulo_id,
          cd.cantidad,
          cd.costo_unitario,
          cd.iva_porcentaje,
          cd.valor_subtotal,
          a.nombre AS articulo_nombre,
          u.abreviatura AS unidad_abreviatura
        FROM compras_detalle cd
        INNER JOIN articulos a ON a.id = cd.articulo_id
        LEFT JOIN unidades u ON u.id = a.unidad_id
        ORDER BY cd.id DESC
      `
    );

    // Normalizar valores DECIMAL (strings) a Number antes de agrupar
    const detallesNorm = detalles.map(item => ({
      ...item,
      cantidad: normalizeDecimal(item.cantidad),
      costo_unitario: normalizeDecimal(item.costo_unitario),
      iva_porcentaje: normalizeDecimal(item.iva_porcentaje, 0),
      valor_subtotal: normalizeDecimal(item.valor_subtotal)
    }));

    const detallesPorCompra = detallesNorm.reduce((acc, detalle) => {
      if (!acc[detalle.compra_id]) acc[detalle.compra_id] = [];
      acc[detalle.compra_id].push(detalle);
      return acc;
    }, {});

    const data = rows.map((compraRow) => {
      const compra = {
        ...compraRow,
        subtotal: normalizeDecimal(compraRow.subtotal),
        iva_total: normalizeDecimal(compraRow.iva_total, 0),
        retefuente_total: normalizeDecimal(compraRow.retefuente_total, 0),
        reteica_total: normalizeDecimal(compraRow.reteica_total, 0),
        total_pagar: normalizeDecimal(compraRow.total_pagar)
      };

      return {
        ...compra,
        estado: compraRow.estado_pago,
        detalles: detallesPorCompra[compraRow.id] || []
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    logBackendError('getCompras', error);
    res.status(500).json({ success: false, message: 'Error al obtener compras' });
  }
};

export const getCompraById = async (req, res) => {
  try {
    const { id } = req.params;
    const compra = await getCompraByIdInternal(id);

    if (!compra) {
      return res.status(404).json({ success: false, message: 'Compra no encontrada' });
    }

    res.json({ success: true, data: compra });
  } catch (error) {
    logBackendError('getCompraById', error);
    res.status(500).json({ success: false, message: 'Error al obtener compra' });
  }
};

export const createCompra = async (req, res) => {
  const payload = req.body || {};
  const personalId = req.user?.id ?? null;
  const errorMessage = validateCompraPayload(payload);

  if (errorMessage) {
    return res.status(400).json({ success: false, message: errorMessage });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const fechaCompra = toSqlDateTimeString(payload.fecha_compra);
    const fechaPagada = toSqlDateTimeString(payload.fecha_pagada);

    const detalles = Array.isArray(payload.detalles) ? payload.detalles.map(normalizeDetalle) : [];

    const [result] = await connection.query(
      `
        INSERT INTO compras (
          proveedor_id,
          tipo_documento,
          numero_documento,
          fecha_compra,
          fecha_pagada,
          subtotal,
          iva_total,
          retefuente_total,
          reteica_total,
          total_pagar,
          estado_pago,
          forma_pago,
          observaciones
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        Number(payload.proveedor_id),
        payload.tipo_documento,
        String(payload.numero_documento).trim(),
        fechaCompra,
        fechaPagada,
        normalizeDecimal(payload.subtotal),
        normalizeDecimal(payload.iva_total, 0),
        normalizeDecimal(payload.retefuente_total, 0),
        normalizeDecimal(payload.reteica_total, 0),
        normalizeDecimal(payload.total_pagar),
        payload.estado_pago || 'Pendiente',
        normalizeFormaPago(payload.forma_pago),
        payload.observaciones || null
      ]
    );

    for (const detalle of detalles) {
      await connection.query(
        `
          INSERT INTO compras_detalle (
            compra_id,
            articulo_id,
            cantidad,
            costo_unitario,
            iva_porcentaje,
            valor_subtotal
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          result.insertId,
          detalle.articulo_id,
          detalle.cantidad,
          detalle.costo_unitario,
          detalle.iva_porcentaje,
          detalle.valor_subtotal
        ]
      );
    }

    await sincronizarCompraDerivados(connection, result.insertId, {
      fechaMovimiento: fechaCompra
    });

    await connection.commit();

    await registrarAccion({
      tabla: 'compras',
      operacion: 'INSERT',
      registroId: result.insertId,
      personalId,
      detalles: {
        proveedor_id: Number(payload.proveedor_id),
        tipo_documento: payload.tipo_documento,
        numero_documento: String(payload.numero_documento).trim(),
        total_pagar: normalizeDecimal(payload.total_pagar),
        total_detalles: detalles.length
      }
    });

    const compraCreada = await getCompraByIdInternal(result.insertId);
    res.status(201).json({ success: true, data: compraCreada, message: 'Compra creada correctamente' });
  } catch (error) {
    await connection.rollback();
    logBackendError('createCompra', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'El número de documento ya existe' });
    }

    res.status(500).json({ success: false, message: 'Error al crear compra' });
  } finally {
    connection.release();
  }
};

export const updateCompra = async (req, res) => {
  const payload = req.body || {};
  const personalId = req.user?.id ?? null;
  const errorMessage = validateCompraPayload(payload);

  if (errorMessage) {
    return res.status(400).json({ success: false, message: errorMessage });
  }

  const { id } = req.params;

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const fechaCompra = toSqlDateTimeString(payload.fecha_compra);
    const fechaPagada = toSqlDateTimeString(payload.fecha_pagada);

    const [existing] = await connection.query('SELECT id, estado_pago FROM compras WHERE id = ? LIMIT 1 FOR UPDATE', [id]);
    if (!existing.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Compra no encontrada' });
    }

    const validacionEstado = assertCompraPendiente(existing[0]);
    if (!validacionEstado.ok) {
      await connection.rollback();
      return res.status(validacionEstado.status).json({ success: false, message: validacionEstado.message });
    }

    await connection.query(
      `
        UPDATE compras
        SET proveedor_id = ?,
            tipo_documento = ?,
            numero_documento = ?,
            fecha_compra = ?,
            fecha_pagada = ?,
            subtotal = ?,
            iva_total = ?,
            retefuente_total = ?,
            reteica_total = ?,
            total_pagar = ?,
            estado_pago = ?,
            forma_pago = ?,
            observaciones = ?
        WHERE id = ?
      `,
      [
        Number(payload.proveedor_id),
        payload.tipo_documento,
        String(payload.numero_documento).trim(),
        fechaCompra,
        fechaPagada,
        normalizeDecimal(payload.subtotal),
        normalizeDecimal(payload.iva_total, 0),
        normalizeDecimal(payload.retefuente_total, 0),
        normalizeDecimal(payload.reteica_total, 0),
        normalizeDecimal(payload.total_pagar),
        payload.estado_pago || 'Pendiente',
        normalizeFormaPago(payload.forma_pago),
        payload.observaciones || null,
        id
      ]
    );

    if (Array.isArray(payload.detalles)) {
      const detalles = payload.detalles.map(normalizeDetalle);
      await connection.query('DELETE FROM compras_detalle WHERE compra_id = ?', [id]);

      for (const detalle of detalles) {
        await connection.query(
          `
            INSERT INTO compras_detalle (
              compra_id,
              articulo_id,
              cantidad,
              costo_unitario,
              iva_porcentaje,
              valor_subtotal
            )
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            id,
            detalle.articulo_id,
            detalle.cantidad,
            detalle.costo_unitario,
            detalle.iva_porcentaje,
            detalle.valor_subtotal
          ]
        );
      }
    }

    await sincronizarCompraDerivados(connection, id, {
      fechaMovimiento: fechaCompra
    });

    await connection.commit();

    await registrarAccion({
      tabla: 'compras',
      operacion: 'UPDATE',
      registroId: Number(id),
      personalId,
      detalles: {
        proveedor_id: Number(payload.proveedor_id),
        tipo_documento: payload.tipo_documento,
        numero_documento: String(payload.numero_documento).trim(),
        total_pagar: normalizeDecimal(payload.total_pagar),
        total_detalles: Array.isArray(payload.detalles) ? payload.detalles.length : undefined
      }
    });

    const compraActualizada = await getCompraByIdInternal(id);
    res.json({ success: true, data: compraActualizada, message: 'Compra actualizada correctamente' });
  } catch (error) {
    await connection.rollback();
    logBackendError('updateCompra', error);
    res.status(500).json({ success: false, message: 'Error al actualizar compra' });
  } finally {
    connection.release();
  }
};

export const deleteCompra = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;
    const personalId = req.user?.id ?? null;

    await connection.beginTransaction();

    const [compraRows] = await connection.query('SELECT * FROM compras WHERE id = ? LIMIT 1 FOR UPDATE', [Number(id)]);
    const compraEliminada = compraRows[0];

    if (!compraEliminada) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Compra no encontrada' });
    }

    const validacionEstado = assertCompraPendiente(compraEliminada);
    if (!validacionEstado.ok) {
      await connection.rollback();
      return res.status(validacionEstado.status).json({ success: false, message: validacionEstado.message });
    }

    await eliminarMovimientosCompra(connection, Number(id));
    await connection.query('DELETE FROM movimientos_contables WHERE referencia_tabla = ? AND referencia_id = ?', ['compras', Number(id)]);
    await connection.query('DELETE FROM movimientos_contables WHERE referencia_tabla = ? AND referencia_id = ?', ['compras_anulacion', Number(id)]);

    const [result] = await connection.query('DELETE FROM compras WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Compra no encontrada' });
    }

    await connection.commit();

    await registrarAccion({
      tabla: 'compras',
      operacion: 'DELETE',
      registroId: Number(id),
      personalId,
      detalles: compraEliminada
    });

    res.json({ success: true, message: 'Compra eliminada correctamente' });
  } catch (error) {
    await connection.rollback();
    logBackendError('deleteCompra', error);
    res.status(500).json({ success: false, message: 'Error al eliminar compra' });
  } finally {
    connection.release();
  }
};

export const getDetallesByCompra = async (req, res) => {
  try {
    const { compraId } = req.params;
    const [rows] = await db.query(
      `
        SELECT
          cd.id,
          cd.compra_id,
          cd.articulo_id,
          cd.cantidad,
          cd.costo_unitario,
          cd.iva_porcentaje,
          cd.valor_subtotal,
          a.nombre AS articulo_nombre,
          u.abreviatura AS unidad_abreviatura
        FROM compras_detalle cd
        INNER JOIN articulos a ON a.id = cd.articulo_id
        LEFT JOIN unidades u ON u.id = a.unidad_id
        WHERE cd.compra_id = ?
        ORDER BY cd.id DESC
      `,
      [compraId]
    );

    // Normalizar antes de responder
    const rowsNorm = rows.map(item => ({
      ...item,
      cantidad: normalizeDecimal(item.cantidad),
      costo_unitario: normalizeDecimal(item.costo_unitario),
      iva_porcentaje: normalizeDecimal(item.iva_porcentaje, 0),
      valor_subtotal: normalizeDecimal(item.valor_subtotal)
    }));

    res.json({ success: true, data: rowsNorm });
  } catch (error) {
    logBackendError('getDetallesByCompra', error);
    res.status(500).json({ success: false, message: 'Error al obtener detalle de compra' });
  }
};

export const createDetalleCompra = async (req, res) => {
  const connection = await db.getConnection();
  let stage = 'init';

  try {
    const { compraId } = req.params;
    const personalId = req.user?.id ?? null;
    const detalle = normalizeDetalle(req.body || {});

    stage = 'begin_transaction';
    traceDetalleCompraStage('createDetalleCompra', stage, { compraId, articuloId: detalle.articulo_id });
    await connection.beginTransaction();

    const [compraRows] = await connection.query(
      'SELECT id, estado_pago FROM compras WHERE id = ? LIMIT 1 FOR UPDATE',
      [Number(compraId)]
    );
    const validacionEstado = assertCompraPendiente(compraRows[0]);
    if (!validacionEstado.ok) {
      await connection.rollback();
      return res.status(validacionEstado.status).json({ success: false, message: validacionEstado.message });
    }

    if (!Number.isInteger(detalle.articulo_id) || detalle.articulo_id <= 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Debe seleccionar un artículo válido' });
    }

    stage = 'insert_compras_detalle';
    traceDetalleCompraStage('createDetalleCompra', stage, { compraId, articuloId: detalle.articulo_id });
    const [result] = await connection.query(
      `
        INSERT INTO compras_detalle (
          compra_id,
          articulo_id,
          cantidad,
          costo_unitario,
          iva_porcentaje,
          valor_subtotal
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        compraId,
        detalle.articulo_id,
        detalle.cantidad,
        detalle.costo_unitario,
        detalle.iva_porcentaje,
        detalle.valor_subtotal
      ]
    );

    stage = 'sincronizar_compra_derivados';
    traceDetalleCompraStage('createDetalleCompra', stage, { compraId, detalleId: result.insertId, articuloId: detalle.articulo_id });
    await sincronizarCompraDerivados(connection, compraId);

    // ---- actualizar totales en tabla compras (subtotal, iva_total, total_pagar)
    // Calculamos el subtotal y el IVA sumando los valores actuales en compras_detalle
    // y luego actualizamos la fila correspondiente en compras dentro de la misma
    // transacción para mantener la consistencia.
    const compraIdToUpdate = Number(compraId);

    stage = 'select_sumas_detalle';
    traceDetalleCompraStage('createDetalleCompra', stage, { compraId: compraIdToUpdate, detalleId: result.insertId });
    const [sumsRows] = await connection.query(
      `
        SELECT
          COALESCE(SUM(cantidad * costo_unitario), 0) AS subtotal,
          COALESCE(SUM(cantidad * costo_unitario * (iva_porcentaje / 100)), 0) AS iva_total
        FROM compras_detalle
        WHERE compra_id = ?
      `,
      [compraIdToUpdate]
    );

    const subtotal = Number(sumsRows[0]?.subtotal || 0);
    const iva_total = Number(sumsRows[0]?.iva_total || 0);

    // Leemos las retenciones almacenadas en la cabecera de compra con FOR UPDATE
    // para evitar condiciones de carrera si otro proceso modifica esas columnas.
    stage = 'select_compra_for_update';
    traceDetalleCompraStage('createDetalleCompra', stage, { compraId: compraIdToUpdate, detalleId: result.insertId });
    const [compRows] = await connection.query(
      'SELECT retefuente_total, reteica_total FROM compras WHERE id = ? LIMIT 1 FOR UPDATE',
      [compraIdToUpdate]
    );

    const retefuente_total = Number(compRows[0]?.retefuente_total || 0);
    const reteica_total = Number(compRows[0]?.reteica_total || 0);

    // total_pagar = subtotal + iva_total - retenciones
    const total_pagar = Number((subtotal + iva_total - retefuente_total - reteica_total).toFixed(2));

    stage = 'update_compra_totales';
    traceDetalleCompraStage('createDetalleCompra', stage, { compraId: compraIdToUpdate, detalleId: result.insertId });
    await connection.query(
      'UPDATE compras SET subtotal = ?, iva_total = ?, total_pagar = ? WHERE id = ?',
      [subtotal, iva_total, total_pagar, compraIdToUpdate]
    );
    // ---- fin actualización compras

    stage = 'commit';
    traceDetalleCompraStage('createDetalleCompra', stage, { compraId: compraIdToUpdate, detalleId: result.insertId });
    await connection.commit();

    stage = 'registrar_auditoria';
    traceDetalleCompraStage('createDetalleCompra', stage, { compraId: compraIdToUpdate, detalleId: result.insertId });
    await registrarAccion({
      tabla: 'compras_detalle',
      operacion: 'INSERT',
      registroId: result.insertId,
      personalId,
      detalles: {
        compra_id: Number(compraId),
        articulo_id: detalle.articulo_id,
        cantidad: detalle.cantidad,
        costo_unitario: detalle.costo_unitario,
        iva_porcentaje: detalle.iva_porcentaje,
        valor_subtotal: detalle.valor_subtotal
      }
    });

    stage = 'select_detalle_respuesta';
    traceDetalleCompraStage('createDetalleCompra', stage, { compraId: compraIdToUpdate, detalleId: result.insertId });
    const [rows] = await db.query(
      `
        SELECT
          cd.id,
          cd.compra_id,
          cd.articulo_id,
          cd.cantidad,
          cd.costo_unitario,
          cd.iva_porcentaje,
          cd.valor_subtotal,
          a.nombre AS articulo_nombre,
          u.abreviatura AS unidad_abreviatura
        FROM compras_detalle cd
        INNER JOIN articulos a ON a.id = cd.articulo_id
        LEFT JOIN unidades u ON u.id = a.unidad_id
        WHERE cd.id = ?
      `,
      [result.insertId]
    );

    const normalized = rows[0] ? {
      ...rows[0],
      cantidad: normalizeDecimal(rows[0].cantidad),
      costo_unitario: normalizeDecimal(rows[0].costo_unitario),
      iva_porcentaje: normalizeDecimal(rows[0].iva_porcentaje, 0),
      valor_subtotal: normalizeDecimal(rows[0].valor_subtotal)
    } : rows[0];

    res.status(201).json({ success: true, data: normalized, message: 'Detalle agregado correctamente' });
  } catch (error) {
    await connection.rollback();
    console.error(`[detalle-compra][createDetalleCompra] 500 en etapa=${stage}`);
    logBackendError('createDetalleCompra', error);
    await persistDetalleCompraErrorLog({
      operation: 'createDetalleCompra',
      stage,
      compraId: req.params?.compraId,
      articuloId: req.body?.articulo_id,
      error
    });
    res.status(500).json({ success: false, message: 'Error al agregar detalle de compra' });
  } finally {
    connection.release();
  }
};

export const updateDetalleCompra = async (req, res) => {
  const connection = await db.getConnection();
  let stage = 'init';

  try {
    const { id } = req.params;
    const personalId = req.user?.id ?? null;
    const detalle = normalizeDetalle(req.body || {});

    stage = 'begin_transaction';
    traceDetalleCompraStage('updateDetalleCompra', stage, { detalleId: id, articuloId: detalle.articulo_id });
    await connection.beginTransaction();

    if (!Number.isInteger(detalle.articulo_id) || detalle.articulo_id <= 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Debe seleccionar un artículo válido' });
    }

    stage = 'select_detalle_for_update';
    traceDetalleCompraStage('updateDetalleCompra', stage, { detalleId: id, articuloId: detalle.articulo_id });
    const [detalleRows] = await connection.query('SELECT compra_id FROM compras_detalle WHERE id = ? LIMIT 1 FOR UPDATE', [id]);
    const detalleActual = detalleRows[0];

    if (!detalleActual) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Detalle no encontrado' });
    }

    const [compraRows] = await connection.query(
      'SELECT id, estado_pago FROM compras WHERE id = ? LIMIT 1 FOR UPDATE',
      [Number(detalleActual.compra_id)]
    );
    const validacionEstado = assertCompraPendiente(compraRows[0]);
    if (!validacionEstado.ok) {
      await connection.rollback();
      return res.status(validacionEstado.status).json({ success: false, message: validacionEstado.message });
    }

    stage = 'update_compras_detalle';
    traceDetalleCompraStage('updateDetalleCompra', stage, { compraId: detalleActual.compra_id, detalleId: id, articuloId: detalle.articulo_id });
    const [result] = await connection.query(
      `
        UPDATE compras_detalle
        SET articulo_id = ?,
            cantidad = ?,
            costo_unitario = ?,
            iva_porcentaje = ?,
            valor_subtotal = ?
        WHERE id = ?
      `,
      [
        detalle.articulo_id,
        detalle.cantidad,
        detalle.costo_unitario,
        detalle.iva_porcentaje,
        detalle.valor_subtotal,
        id
      ]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Detalle no encontrado' });
    }

    stage = 'sincronizar_compra_derivados';
    traceDetalleCompraStage('updateDetalleCompra', stage, { compraId: detalleActual.compra_id, detalleId: id, articuloId: detalle.articulo_id });
    await sincronizarCompraDerivados(connection, detalleActual.compra_id);

    // ---- actualizar totales en tabla compras (subtotal, iva_total, total_pagar)
    // Calculamos el subtotal y el IVA sumando los valores actuales en compras_detalle
    // y luego actualizamos la fila correspondiente en compras dentro de la misma
    // transacción para mantener la consistencia.
    const compraIdToUpdate = Number(detalleActual.compra_id);

    stage = 'select_sumas_detalle';
    traceDetalleCompraStage('updateDetalleCompra', stage, { compraId: compraIdToUpdate, detalleId: id });
    const [sumsRows] = await connection.query(
      `
        SELECT
          COALESCE(SUM(cantidad * costo_unitario), 0) AS subtotal,
          COALESCE(SUM(cantidad * costo_unitario * (iva_porcentaje / 100)), 0) AS iva_total
        FROM compras_detalle
        WHERE compra_id = ?
      `,
      [compraIdToUpdate]
    );

    const subtotal = Number(sumsRows[0]?.subtotal || 0);
    const iva_total = Number(sumsRows[0]?.iva_total || 0);

    // Leemos las retenciones almacenadas en la cabecera de compra con FOR UPDATE
    // para evitar condiciones de carrera si otro proceso modifica esas columnas.
    stage = 'select_compra_for_update';
    traceDetalleCompraStage('updateDetalleCompra', stage, { compraId: compraIdToUpdate, detalleId: id });
    const [compRows] = await connection.query(
      'SELECT retefuente_total, reteica_total FROM compras WHERE id = ? LIMIT 1 FOR UPDATE',
      [compraIdToUpdate]
    );

    const retefuente_total = Number(compRows[0]?.retefuente_total || 0);
    const reteica_total = Number(compRows[0]?.reteica_total || 0);

    // total_pagar = subtotal + iva_total - retenciones
    const total_pagar = Number((subtotal + iva_total - retefuente_total - reteica_total).toFixed(2));

    stage = 'update_compra_totales';
    traceDetalleCompraStage('updateDetalleCompra', stage, { compraId: compraIdToUpdate, detalleId: id });
    await connection.query(
      'UPDATE compras SET subtotal = ?, iva_total = ?, total_pagar = ? WHERE id = ?',
      [subtotal, iva_total, total_pagar, compraIdToUpdate]
    );
    // ---- fin actualización compras

    stage = 'commit';
    traceDetalleCompraStage('updateDetalleCompra', stage, { compraId: compraIdToUpdate, detalleId: id });
    await connection.commit();

    stage = 'registrar_auditoria';
    traceDetalleCompraStage('updateDetalleCompra', stage, { compraId: compraIdToUpdate, detalleId: id });
    await registrarAccion({
      tabla: 'compras_detalle',
      operacion: 'UPDATE',
      registroId: Number(id),
      personalId,
      detalles: {
        articulo_id: detalle.articulo_id,
        cantidad: detalle.cantidad,
        costo_unitario: detalle.costo_unitario,
        iva_porcentaje: detalle.iva_porcentaje,
        valor_subtotal: detalle.valor_subtotal
      }
    });

    stage = 'select_detalle_respuesta';
    traceDetalleCompraStage('updateDetalleCompra', stage, { compraId: compraIdToUpdate, detalleId: id });
    const [rows] = await db.query(
      `
        SELECT
          cd.id,
          cd.compra_id,
          cd.articulo_id,
          cd.cantidad,
          cd.costo_unitario,
          cd.iva_porcentaje,
          cd.valor_subtotal,
          a.nombre AS articulo_nombre,
          u.abreviatura AS unidad_abreviatura
        FROM compras_detalle cd
        INNER JOIN articulos a ON a.id = cd.articulo_id
        LEFT JOIN unidades u ON u.id = a.unidad_id
        WHERE cd.id = ?
      `,
      [id]
    );

    const normalized = rows[0] ? {
      ...rows[0],
      cantidad: normalizeDecimal(rows[0].cantidad),
      costo_unitario: normalizeDecimal(rows[0].costo_unitario),
      iva_porcentaje: normalizeDecimal(rows[0].iva_porcentaje, 0),
      valor_subtotal: normalizeDecimal(rows[0].valor_subtotal)
    } : rows[0];

    res.json({ success: true, data: normalized, message: 'Detalle actualizado correctamente' });
  } catch (error) {
    await connection.rollback();
    console.error(`[detalle-compra][updateDetalleCompra] 500 en etapa=${stage}`);
    logBackendError('updateDetalleCompra', error);
    await persistDetalleCompraErrorLog({
      operation: 'updateDetalleCompra',
      stage,
      compraId: req.body?.compra_id,
      detalleId: req.params?.id,
      articuloId: req.body?.articulo_id,
      error
    });
    res.status(500).json({ success: false, message: 'Error al actualizar detalle de compra' });
  } finally {
    connection.release();
  }
};

export const deleteDetalleCompra = async (req, res) => {
  const connection = await db.getConnection();
  let stage = 'init';

  try {
    const { id } = req.params;
    const personalId = req.user?.id ?? null;

    stage = 'begin_transaction';
    traceDetalleCompraStage('deleteDetalleCompra', stage, { detalleId: id });
    await connection.beginTransaction();

    stage = 'select_detalle_for_update';
    traceDetalleCompraStage('deleteDetalleCompra', stage, { detalleId: id });
    const [detalleRows] = await connection.query('SELECT * FROM compras_detalle WHERE id = ? LIMIT 1 FOR UPDATE', [Number(id)]);
    const detalleEliminado = detalleRows[0];

    if (!detalleEliminado) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Detalle no encontrado' });
    }

    const [compraRows] = await connection.query(
      'SELECT id, estado_pago FROM compras WHERE id = ? LIMIT 1 FOR UPDATE',
      [Number(detalleEliminado.compra_id)]
    );
    const validacionEstado = assertCompraPendiente(compraRows[0]);
    if (!validacionEstado.ok) {
      await connection.rollback();
      return res.status(validacionEstado.status).json({ success: false, message: validacionEstado.message });
    }

    stage = 'delete_compras_detalle';
    traceDetalleCompraStage('deleteDetalleCompra', stage, { compraId: detalleEliminado.compra_id, detalleId: id, articuloId: detalleEliminado.articulo_id });
    const [result] = await connection.query('DELETE FROM compras_detalle WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Detalle no encontrado' });
    }

    stage = 'sincronizar_compra_derivados';
    traceDetalleCompraStage('deleteDetalleCompra', stage, { compraId: detalleEliminado.compra_id, detalleId: id, articuloId: detalleEliminado.articulo_id });
    await sincronizarCompraDerivados(connection, detalleEliminado.compra_id);

    // ---- actualizar totales en tabla compras (subtotal, iva_total, total_pagar)
    // Calculamos el subtotal y el IVA sumando los valores actuales en compras_detalle
    // y luego actualizamos la fila correspondiente en compras dentro de la misma
    // transacción para mantener la consistencia.
    const compraIdToUpdate = Number(detalleEliminado.compra_id);

    stage = 'select_sumas_detalle';
    traceDetalleCompraStage('deleteDetalleCompra', stage, { compraId: compraIdToUpdate, detalleId: id });
    const [sumsRowsDel] = await connection.query(
      `
        SELECT
          COALESCE(SUM(cantidad * costo_unitario), 0) AS subtotal,
          COALESCE(SUM(cantidad * costo_unitario * (iva_porcentaje / 100)), 0) AS iva_total
        FROM compras_detalle
        WHERE compra_id = ?
      `,
      [compraIdToUpdate]
    );

    const subtotalDel = Number(sumsRowsDel[0]?.subtotal || 0);
    const iva_totalDel = Number(sumsRowsDel[0]?.iva_total || 0);

    // Leemos las retenciones almacenadas en la cabecera de compra con FOR UPDATE
    // para evitar condiciones de carrera si otro proceso modifica esas columnas.
    stage = 'select_compra_for_update';
    traceDetalleCompraStage('deleteDetalleCompra', stage, { compraId: compraIdToUpdate, detalleId: id });
    const [compRowsDel] = await connection.query(
      'SELECT retefuente_total, reteica_total FROM compras WHERE id = ? LIMIT 1 FOR UPDATE',
      [compraIdToUpdate]
    );

    const retefuente_totalDel = Number(compRowsDel[0]?.retefuente_total || 0);
    const reteica_totalDel = Number(compRowsDel[0]?.reteica_total || 0);

    // total_pagar = subtotal + iva_total - retenciones
    const total_pagarDel = Number((subtotalDel + iva_totalDel - retefuente_totalDel - reteica_totalDel).toFixed(2));

    stage = 'update_compra_totales';
    traceDetalleCompraStage('deleteDetalleCompra', stage, { compraId: compraIdToUpdate, detalleId: id });
    await connection.query(
      'UPDATE compras SET subtotal = ?, iva_total = ?, total_pagar = ? WHERE id = ?',
      [subtotalDel, iva_totalDel, total_pagarDel, compraIdToUpdate]
    );
    // ---- fin actualización compras

    stage = 'commit';
    traceDetalleCompraStage('deleteDetalleCompra', stage, { compraId: compraIdToUpdate, detalleId: id });
    await connection.commit();

    stage = 'registrar_auditoria';
    traceDetalleCompraStage('deleteDetalleCompra', stage, { compraId: compraIdToUpdate, detalleId: id });
    await registrarAccion({
      tabla: 'compras_detalle',
      operacion: 'DELETE',
      registroId: Number(id),
      personalId,
      detalles: detalleEliminado
    });

    res.json({ success: true, message: 'Detalle eliminado correctamente' });
  } catch (error) {
    await connection.rollback();
    console.error(`[detalle-compra][deleteDetalleCompra] 500 en etapa=${stage}`);
    logBackendError('deleteDetalleCompra', error);
    await persistDetalleCompraErrorLog({
      operation: 'deleteDetalleCompra',
      stage,
      compraId: req.body?.compra_id,
      detalleId: req.params?.id,
      articuloId: req.body?.articulo_id,
      error
    });
    res.status(500).json({ success: false, message: 'Error al eliminar detalle de compra' });
  } finally {
    connection.release();
  }
};

export const getCuentasPorPagar = async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');

    const fechaInicio = String(req.query?.fecha_inicio || '').trim();
    const fechaFinal = String(req.query?.fecha_final || '').trim();
    const estadoPago = String(req.query?.estado_pago || 'Pendiente').trim();

    const where = [];
    const params = [];

    if (fechaInicio && /^\d{4}-\d{2}-\d{2}$/.test(fechaInicio)) {
      where.push('DATE(c.fecha_compra) >= ?');
      params.push(fechaInicio);
    }

    if (fechaFinal && /^\d{4}-\d{2}-\d{2}$/.test(fechaFinal)) {
      where.push('DATE(c.fecha_compra) <= ?');
      params.push(fechaFinal);
    }

    if (estadoPago === 'Pagada') {
      where.push("c.estado_pago IN ('Pagada', 'Pagado')");
    } else if (estadoPago === 'Todos') {
      where.push("c.estado_pago NOT IN ('Anulado')");
    } else {
      where.push("c.estado_pago IN ('Pendiente', 'Parcial')");
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await db.query(
      `SELECT
         c.id,
         c.proveedor_id,
         c.tipo_documento,
         c.numero_documento,
         c.fecha_compra,
         c.fecha_pagada,
         c.total_pagar,
         c.estado_pago,
         c.forma_pago,
         c.observaciones,
         p.razon_social AS proveedor_razon_social,
         COALESCE((
           SELECT SUM(mc.monto)
           FROM movimientos_contables mc
           WHERE mc.referencia_tabla = 'compras'
             AND mc.referencia_id = c.id
             AND mc.cuenta_codigo = '233505'
             AND mc.tipo_movimiento = 'Debito'
         ), 0) AS total_pagado
       FROM compras c
       INNER JOIN proveedores p ON p.id = c.proveedor_id
       ${whereClause}
       ORDER BY c.fecha_compra ASC`,
      params
    );

    const data = rows.map((row) => {
      const total_pagar = normalizeDecimal(row.total_pagar);
      const total_pagado = normalizeDecimal(row.total_pagado);
      return {
        ...row,
        total_pagar,
        total_pagado,
        saldo_pendiente: Number((total_pagar - total_pagado).toFixed(2))
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    logBackendError('getCuentasPorPagar', error);
    res.status(500).json({ success: false, message: 'Error al obtener cuentas por pagar.' });
  }
};

export const getSaldoCuentaPagoCompra = async (req, res) => {
  try {
    const codigo = String(req.params.codigo || '').trim();
    if (!CUENTAS_PAGO_COMPRAS.includes(codigo)) {
      return res.status(400).json({ success: false, message: 'Código de cuenta no permitido para pago de compras.' });
    }

    const saldo = await saldoContablePorCuenta(db, codigo);
    return res.json({ success: true, codigo, saldo });
  } catch (error) {
    logBackendError('getSaldoCuentaPagoCompra', error);
    return res.status(500).json({ success: false, message: 'Error al obtener saldo de la cuenta.' });
  }
};

export const pagarFacturaCompra = async (req, res) => {
  const { id } = req.params;
  const { monto, cuenta_pago = '110510' } = req.body || {};
  const personalId = req.user?.id ?? null;
  const cuentaPago = String(cuenta_pago).trim();

  if (!CUENTAS_PAGO_COMPRAS.includes(cuentaPago)) {
    return res.status(400).json({
      success: false,
      message: 'Medio de pago inválido. Use 110510 (Caja Operativa), 110515 (Ahorros Reserva) o 111005 (Bancos).'
    });
  }

  const montoPago = Number(monto);
  if (!Number.isFinite(montoPago) || montoPago <= 0) {
    return res.status(400).json({ success: false, message: 'El monto del pago debe ser mayor a 0.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [compraRows] = await connection.query(
      'SELECT * FROM compras WHERE id = ? LIMIT 1 FOR UPDATE',
      [Number(id)]
    );

    if (!compraRows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Compra no encontrada.' });
    }

    const compra = compraRows[0];
    if (!['Pendiente', 'Parcial'].includes(compra.estado_pago)) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: `La compra no está pendiente de pago (estado: ${compra.estado_pago}).` });
    }

    const [[{ total_pagado }]] = await connection.query(
      `SELECT COALESCE(SUM(monto), 0) AS total_pagado
       FROM movimientos_contables
       WHERE referencia_tabla = 'compras'
         AND referencia_id = ?
         AND cuenta_codigo = '233505'
         AND tipo_movimiento = 'Debito'`,
      [Number(id)]
    );

    const saldoActual = roundMoney(Number(compra.total_pagar) - Number(total_pagado));

    if (saldoActual <= 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Esta compra ya está completamente pagada.' });
    }

    const montoPagoFinal = Math.min(roundMoney(montoPago), saldoActual);
    const saldoCuenta = await saldoContablePorCuenta(connection, cuentaPago);

    if (saldoCuenta < montoPagoFinal) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'El saldo de la cuenta no es suficiente para realizar el pago.'
      });
    }

    await registrarAsientoPagoFacturaCompra(connection, {
      compra_id: Number(id),
      monto: montoPagoFinal,
      cuenta_pago: cuentaPago,
      numero_documento: compra.numero_documento
    });

    const saldoRestante = roundMoney(saldoActual - montoPagoFinal);
    const nuevoEstado = saldoRestante <= 0 ? 'Pagada' : 'Parcial';
    const fechaPagada = saldoRestante <= 0 ? new Date() : compra.fecha_pagada;

    await connection.query(
      'UPDATE compras SET estado_pago = ?, fecha_pagada = ? WHERE id = ?',
      [nuevoEstado, fechaPagada, Number(id)]
    );

    await connection.commit();

    await registrarAccion({
      tabla: 'compras',
      operacion: 'UPDATE',
      registroId: Number(id),
      personalId,
      detalles: {
        accion: 'pago_factura',
        monto: montoPagoFinal,
        cuenta_pago: cuentaPago,
        nuevo_estado: nuevoEstado,
        saldo_restante: saldoRestante
      }
    });

    const mensaje = nuevoEstado === 'Pagada'
      ? 'Factura pagada completamente.'
      : `Abono registrado. Saldo pendiente: ${saldoRestante}`;

    res.json({
      success: true,
      message: mensaje,
      data: { nuevo_estado: nuevoEstado, saldo_restante: saldoRestante, monto_pagado: montoPagoFinal }
    });
  } catch (error) {
    await connection.rollback();
    logBackendError('pagarFacturaCompra', error);
    res.status(500).json({ success: false, message: 'Error al registrar el pago.' });
  } finally {
    connection.release();
  }
};

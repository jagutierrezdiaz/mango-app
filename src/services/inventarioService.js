import db from '../config/db.js';
import {
  eliminarAsientoMovimientoInventario,
  mapTipoArticuloToCuentaInventario,
  registrarAsientoCompra,
  registrarReversionAsientoCompra,
  sincronizarAsientoMovimientoInventario
} from './contabilidadService.js';

const TIPOS_MOVIMIENTO = ['ENTRADA', 'SALIDA', 'AJUSTE', 'DEVOLUCION'];
const TIPOS_SALIDA = new Set(['SALIDA', 'AJUSTE']);
const TIPOS_ENTRADA = new Set(['ENTRADA', 'DEVOLUCION']);
const REF_MANUAL_PREFIX = 'MANUAL';
const REF_COMPRA_PREFIX = 'COMPRA';
const REF_COMPRA_REVERSA_PREFIX = 'COMPRA_REVERSA';

const roundQuantity = (value) => Number((Number(value) || 0).toFixed(3));
const roundMoney = (value) => Number((Number(value) || 0).toFixed(2));
const INVENTARIO_INSUFICIENTE_MESSAGE = 'Inventario insuficiente para completar el movimiento.';

const normalizeMovementType = (value) => String(value || '').trim().toUpperCase();

const toSqlDateTime = (value, fallback = null) => {
  try {
    const source = value || fallback || new Date();
    const raw = String(source).trim().replace('T', ' ');

    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)) {
      return raw;
    }

    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(raw)) {
      return `${raw}:00`;
    }

    const date = source instanceof Date ? source : new Date(String(source).replace(' ', 'T'));

    if (Number.isNaN(date.getTime())) {
      throw new Error(`Fecha no válida: ${source}`);
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    throw new Error(`Fecha de movimiento no válida: ${error.message}`);
  }
};

const truncateReference = (value) => String(value || '').trim().slice(0, 50);

const isInventorySignalError = (error) => (
  error?.code === 'ER_SIGNAL_EXCEPTION'
  && /Inventario insuficiente/i.test(String(error?.sqlMessage || error?.message || ''))
);

const throwFriendlyInventoryError = (error) => {
  if (isInventorySignalError(error)) {
    const friendlyError = new Error(INVENTARIO_INSUFICIENTE_MESSAGE);
    friendlyError.code = 'INVENTARIO_INSUFICIENTE';
    friendlyError.statusCode = 400;
    throw friendlyError;
  }

  throw error;
};

const sanitizeReferenceChunk = (value) => String(value || '')
  .replace(/\|/g, '-')
  .replace(/\s+/g, ' ')
  .trim();

export const isManualReference = (reference = '') => String(reference || '').startsWith(`${REF_MANUAL_PREFIX}|`);
export const isCompraReference = (reference = '') => String(reference || '').startsWith(`${REF_COMPRA_PREFIX}|`);
export const isCompraReversalReference = (reference = '') => String(reference || '').startsWith(`${REF_COMPRA_REVERSA_PREFIX}|`);

export const parseInternalReference = (reference = '') => {
  const value = String(reference || '').trim();
  if (!value.includes('|')) {
    return {
      raw: value,
      visible: value,
      source: null,
      subtype: null,
      compraId: null,
      isCompra: false,
      isCompraReversion: false
    };
  }

  const [source, subtype, ...rest] = value.split('|');
  if ([REF_COMPRA_PREFIX, REF_COMPRA_REVERSA_PREFIX].includes(source)) {
    return {
      raw: value,
      visible: rest.join('|') || subtype || '',
      source: source || null,
      subtype: source === REF_COMPRA_REVERSA_PREFIX ? 'ANULACION' : null,
      compraId: Number(subtype) || null,
      isCompra: source === REF_COMPRA_PREFIX,
      isCompraReversion: source === REF_COMPRA_REVERSA_PREFIX
    };
  }

  return {
    raw: value,
    visible: rest.join('|') || subtype || '',
    source: source || null,
    subtype: source === REF_MANUAL_PREFIX ? subtype || null : null,
    compraId: null,
    isCompra: false,
    isCompraReversion: false
  };
};

export const buildManualReference = ({ subtype, documentReference }) => truncateReference([
  REF_MANUAL_PREFIX,
  sanitizeReferenceChunk(subtype || 'MOVIMIENTO'),
  sanitizeReferenceChunk(documentReference || 'Sin referencia')
].join('|'));

export const buildCompraReference = ({ compraId, numeroDocumento }) => truncateReference([
  REF_COMPRA_PREFIX,
  sanitizeReferenceChunk(compraId),
  sanitizeReferenceChunk(numeroDocumento || `Compra ${compraId}`)
].join('|'));

export const buildCompraReversalReference = ({ compraId, numeroDocumento }) => truncateReference([
  REF_COMPRA_REVERSA_PREFIX,
  sanitizeReferenceChunk(compraId),
  sanitizeReferenceChunk(`Anulacion ${numeroDocumento || `Compra ${compraId}`}`)
].join('|'));

const deleteMovimientosByReferencePrefix = async (connection, prefix) => {
  const [rows] = await connection.query(
    'SELECT DISTINCT articulo_id, sucursal_id FROM kardex_articulos WHERE documento_referencia LIKE ?',
    [`${prefix}%`]
  );

  await connection.query(
    'DELETE FROM kardex_articulos WHERE documento_referencia LIKE ?',
    [`${prefix}%`]
  );

  for (const row of rows) {
    await recalcularKardexArticulo(connection, Number(row.articulo_id), Number(row.sucursal_id));
  }
};

const validateMovementPayload = (payload = {}, { allowOutgoing = true } = {}) => {
  const articuloId = Number(payload.articulo_id);
  const sucursalId = Number(payload.sucursal_id || 1);
  const tipoMovimiento = normalizeMovementType(payload.tipo_movimiento);
  const cantidad = roundQuantity(payload.cantidad);
  const costoUnitario = roundMoney(payload.costo_unitario);

  if (!Number.isInteger(articuloId) || articuloId <= 0) {
    throw new Error('Debe seleccionar un artículo válido.');
  }

  if (!Number.isInteger(sucursalId) || sucursalId <= 0) {
    throw new Error('Debe indicar una sucursal válida.');
  }

  if (!TIPOS_MOVIMIENTO.includes(tipoMovimiento)) {
    throw new Error(`Tipo de movimiento no válido: ${payload.tipo_movimiento}`);
  }

  if (!allowOutgoing && TIPOS_SALIDA.has(tipoMovimiento)) {
    throw new Error('Este tipo de movimiento no está permitido en esta operación.');
  }

  if (cantidad <= 0) {
    throw new Error('La cantidad debe ser mayor a cero.');
  }

  if (TIPOS_ENTRADA.has(tipoMovimiento) && costoUnitario < 0) {
    throw new Error('El costo unitario de la entrada no puede ser negativo.');
  }

  return {
    articuloId,
    sucursalId,
    tipoMovimiento,
    cantidad,
    costoUnitario,
    fechaMovimiento: toSqlDateTime(payload.fecha_movimiento),
    documentoReferencia: truncateReference(payload.documento_referencia)
  };
};

const updateArticuloSnapshot = async (connection, articuloId) => {
  const [rows] = await connection.query(
    `
      SELECT sucursal_id, saldo_cantidad, saldo_costo_unitario, fecha_movimiento, id
      FROM kardex_articulos
      WHERE articulo_id = ?
      ORDER BY fecha_movimiento DESC, id DESC
    `,
    [articuloId]
  );

  if (!rows.length) {
    await connection.query(
      'UPDATE articulos SET stock_actual = 0.000, costo_unitario = 0.00 WHERE id = ?',
      [articuloId]
    );
    return;
  }

  const seenBranches = new Set();
  let stockActual = 0;

  for (const row of rows) {
    const branchKey = Number(row.sucursal_id);
    if (seenBranches.has(branchKey)) continue;
    seenBranches.add(branchKey);
    stockActual = roundQuantity(stockActual + Number(row.saldo_cantidad || 0));
  }

  const costoUnitario = roundMoney(rows[0]?.saldo_costo_unitario || 0);

  await connection.query(
    'UPDATE articulos SET stock_actual = ?, costo_unitario = ? WHERE id = ?',
    [stockActual, costoUnitario, articuloId]
  );
};

export const recalcularKardexArticulo = async (connection, articuloId, sucursalId = 1) => {
  const [rows] = await connection.query(
    `
      SELECT id, tipo_movimiento, cant_entrada, costo_entrada, total_entrada, cant_salida, fecha_movimiento
      FROM kardex_articulos
      WHERE articulo_id = ? AND sucursal_id = ?
      ORDER BY fecha_movimiento ASC, id ASC
      FOR UPDATE
    `,
    [articuloId, sucursalId]
  );

  let saldoCantidad = 0;
  let saldoTotal = 0;
  let saldoCostoUnitario = 0;

  for (const row of rows) {
    const tipoMovimiento = normalizeMovementType(row.tipo_movimiento);
    let cantEntrada = 0;
    let costoEntrada = 0;
    let totalEntrada = 0;
    let cantSalida = 0;
    let costoSalida = 0;
    let totalSalida = 0;

    if (TIPOS_ENTRADA.has(tipoMovimiento)) {
      cantEntrada = roundQuantity(row.cant_entrada);
      costoEntrada = roundMoney(row.costo_entrada);
      totalEntrada = roundMoney(cantEntrada * costoEntrada);
      saldoCantidad = roundQuantity(saldoCantidad + cantEntrada);
      saldoTotal = roundMoney(saldoTotal + totalEntrada);
      saldoCostoUnitario = saldoCantidad > 0 ? roundMoney(saldoTotal / saldoCantidad) : 0;
    } else {
      cantSalida = roundQuantity(row.cant_salida);
      if (cantSalida > saldoCantidad + 0.0009) {
        throw new Error(`El movimiento ${row.id} dejaría saldo negativo para el artículo ${articuloId}.`);
      }

      costoSalida = roundMoney(saldoCostoUnitario);
      totalSalida = roundMoney(cantSalida * costoSalida);
      saldoCantidad = roundQuantity(saldoCantidad - cantSalida);
      saldoTotal = roundMoney(saldoTotal - totalSalida);

      if (saldoCantidad <= 0.0009) {
        saldoCantidad = 0;
        saldoTotal = 0;
        saldoCostoUnitario = 0;
      } else {
        saldoCostoUnitario = roundMoney(saldoTotal / saldoCantidad);
      }
    }

    await connection.query(
      `
        UPDATE kardex_articulos
        SET cant_entrada = ?,
            costo_entrada = ?,
            total_entrada = ?,
            cant_salida = ?,
            costo_salida = ?,
            total_salida = ?,
            saldo_cantidad = ?,
            saldo_costo_unitario = ?,
            saldo_total = ?
        WHERE id = ?
      `,
      [
        cantEntrada,
        costoEntrada,
        totalEntrada,
        cantSalida,
        costoSalida,
        totalSalida,
        saldoCantidad,
        saldoCostoUnitario,
        saldoTotal,
        row.id
      ]
    );
  }

  await updateArticuloSnapshot(connection, articuloId);
};

export const getMovimientoKardexById = async (connection, id) => {
  const [rows] = await connection.query(
    `
      SELECT
        k.id,
        k.articulo_id,
        k.sucursal_id,
        k.fecha_movimiento,
        k.tipo_movimiento,
        k.documento_referencia,
        k.cant_entrada,
        k.costo_entrada,
        k.total_entrada,
        k.cant_salida,
        k.costo_salida,
        k.total_salida,
        k.saldo_cantidad,
        k.saldo_costo_unitario,
        k.saldo_total,
        a.nombre AS articulo_nombre,
        a.tipo AS articulo_tipo,
        a.url_foto AS articulo_url_foto,
        u.abreviatura AS unidad_abreviatura
      FROM kardex_articulos k
      INNER JOIN articulos a ON a.id = k.articulo_id
      LEFT JOIN unidades u ON u.id = a.unidad_id
      WHERE k.id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
};

const getCuentaInventarioByArticulo = async (connection, articuloId) => {
  const [rows] = await connection.query(
    `
      SELECT tipo
      FROM articulos
      WHERE id = ?
      LIMIT 1
    `,
    [articuloId]
  );

  if (!rows.length) {
    throw new Error(`Artículo no encontrado: ${articuloId}`);
  }

  return mapTipoArticuloToCuentaInventario(rows[0]?.tipo);
};

const getStockActualArticulo = async (connection, articuloId) => {
  const [rows] = await connection.query(
    `
      SELECT stock_actual
      FROM articulos
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [articuloId]
  );

  if (!rows.length) {
    throw new Error(`Artículo no encontrado: ${articuloId}`);
  }

  return Number(rows[0]?.stock_actual || 0);
};

const insertMovimientoContableInventario = async (connection, {
  fecha,
  cuentaCodigo,
  tipoMovimiento,
  monto,
  referenciaId,
  descripcion
}) => {
  await connection.query(
    `
      INSERT INTO movimientos_contables (
        fecha,
        cuenta_codigo,
        tipo_movimiento,
        monto,
        descripcion,
        referencia_tabla,
        referencia_id
      ) VALUES (?, ?, ?, ?, ?, 'kardex_articulos', ?)
    `,
    [
      fecha,
      cuentaCodigo,
      tipoMovimiento,
      roundMoney(monto),
      String(descripcion || '').trim().slice(0, 255),
      Number(referenciaId)
    ]
  );
};

const buildKardexInsertValues = (movement) => {
  if (TIPOS_ENTRADA.has(movement.tipoMovimiento)) {
    return {
      cantEntrada: movement.cantidad,
      costoEntrada: movement.costoUnitario,
      cantSalida: 0
    };
  }

  return {
    cantEntrada: 0,
    costoEntrada: 0,
    cantSalida: movement.cantidad
  };
};

const insertMovimientoKardex = async (connection, movement) => {
  const insertValues = buildKardexInsertValues(movement);

  try {
    const [result] = await connection.query(
      `
        INSERT INTO kardex_articulos (
          articulo_id,
          sucursal_id,
          fecha_movimiento,
          tipo_movimiento,
          documento_referencia,
          cant_entrada,
          costo_entrada,
          cant_salida
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        movement.articuloId,
        movement.sucursalId,
        movement.fechaMovimiento,
        movement.tipoMovimiento,
        movement.documentoReferencia,
        insertValues.cantEntrada,
        insertValues.costoEntrada,
        insertValues.cantSalida
      ]
    );

    return Number(result.insertId);
  } catch (error) {
    throwFriendlyInventoryError(error);
  }
};

const syncAsientoMovimientoKardex = async (connection, movimiento, documentoReferencia = null) => {
  if (!movimiento?.id) return;

  const documentoRef = String(
    documentoReferencia ?? movimiento.documento_referencia ?? ''
  ).trim();

  if (isCompraReference(documentoRef) || isCompraReversalReference(documentoRef)) {
    return;
  }

  await sincronizarAsientoMovimientoInventario(connection, {
    movimiento_id: movimiento.id,
    tipo_movimiento: movimiento.tipo_movimiento,
    articulo_tipo: movimiento.articulo_tipo,
    total_entrada: movimiento.total_entrada,
    total_salida: movimiento.total_salida,
    fecha: movimiento.fecha_movimiento,
    documento_referencia: documentoRef
  });
};

export const registrarMovimiento = async (datos = {}, externalConnection = null) => {
  const movement = validateMovementPayload(datos);
  const connection = externalConnection || await db.getConnection();
  const managesTransaction = !externalConnection;

  try {
    if (managesTransaction) {
      await connection.beginTransaction();
    }

    if (TIPOS_SALIDA.has(movement.tipoMovimiento)) {
      const stockActual = await getStockActualArticulo(connection, movement.articuloId);
      if (movement.cantidad > stockActual + 0.0009) {
        const error = new Error('Inventario insuficiente');
        error.code = 'INVENTARIO_INSUFICIENTE';
        error.statusCode = 400;
        throw error;
      }
    }

    const kardexId = await insertMovimientoKardex(connection, movement);
    const movimientoCreado = await getMovimientoKardexById(connection, kardexId);

    if (!movimientoCreado) {
      throw new Error('No se pudo recuperar el movimiento insertado en kardex.');
    }

    const documentoRef = String(movimientoCreado.documento_referencia || '').trim();
    await syncAsientoMovimientoKardex(connection, movimientoCreado, documentoRef);

    await updateArticuloSnapshot(connection, movement.articuloId);
    if (managesTransaction) {
      await connection.commit();
    }

    return movimientoCreado;
  } catch (error) {
    if (managesTransaction) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (managesTransaction) {
      connection.release();
    }
  }
};

export const registrarMovimientoInventario = async (connection, payload) => {
  const movement = validateMovementPayload(payload);
  const kardexId = await insertMovimientoKardex(connection, movement);

  await updateArticuloSnapshot(connection, movement.articuloId);
  return getMovimientoKardexById(connection, kardexId);
};

export const actualizarMovimientoManual = async (connection, id, payload) => {
  const [rows] = await connection.query(
    'SELECT id, articulo_id, sucursal_id, documento_referencia FROM kardex_articulos WHERE id = ? LIMIT 1 FOR UPDATE',
    [id]
  );

  const existing = rows[0];
  if (!existing) {
    throw new Error('Movimiento no encontrado.');
  }

  if (!isManualReference(existing.documento_referencia)) {
    throw new Error('Solo se pueden editar movimientos manuales.');
  }

  const movement = validateMovementPayload(payload);
  const insertValues = movement.tipoMovimiento === 'ENTRADA'
    ? [movement.cantidad, movement.costoUnitario, roundMoney(movement.cantidad * movement.costoUnitario), 0, 0, 0]
    : [0, 0, 0, movement.cantidad, 0, 0];

  await connection.query(
    `
      UPDATE kardex_articulos
      SET articulo_id = ?,
          sucursal_id = ?,
          fecha_movimiento = ?,
          tipo_movimiento = ?,
          documento_referencia = ?,
          cant_entrada = ?,
          costo_entrada = ?,
          total_entrada = ?,
          cant_salida = ?,
          costo_salida = ?,
          total_salida = ?
      WHERE id = ?
    `,
    [
      movement.articuloId,
      movement.sucursalId,
      movement.fechaMovimiento,
      movement.tipoMovimiento,
      movement.documentoReferencia,
      ...insertValues,
      id
    ]
  );

  if (Number(existing.articulo_id) !== movement.articuloId || Number(existing.sucursal_id) !== movement.sucursalId) {
    await recalcularKardexArticulo(connection, Number(existing.articulo_id), Number(existing.sucursal_id));
  }

  await recalcularKardexArticulo(connection, movement.articuloId, movement.sucursalId);
  return getMovimientoKardexById(connection, id);
};

export const actualizarMovimientoManualCompleto = async (connection, id, payload) => {
  const movimiento = await actualizarMovimientoManual(connection, id, payload);
  await syncAsientoMovimientoKardex(
    connection,
    movimiento,
    payload?.documento_referencia ?? movimiento.documento_referencia
  );
  return movimiento;
};

export const eliminarMovimientoManual = async (connection, id) => {
  const [rows] = await connection.query(
    'SELECT id, articulo_id, sucursal_id, documento_referencia FROM kardex_articulos WHERE id = ? LIMIT 1 FOR UPDATE',
    [id]
  );

  const existing = rows[0];
  if (!existing) {
    throw new Error('Movimiento no encontrado.');
  }

  if (!isManualReference(existing.documento_referencia)) {
    throw new Error('Solo se pueden eliminar movimientos manuales.');
  }

  await connection.query('DELETE FROM kardex_articulos WHERE id = ?', [id]);
  await recalcularKardexArticulo(connection, Number(existing.articulo_id), Number(existing.sucursal_id));
};

export const eliminarMovimientoManualCompleto = async (connection, id) => {
  const movimiento = await getMovimientoKardexById(connection, id);
  if (!movimiento) {
    throw new Error('Movimiento no encontrado.');
  }

  await eliminarMovimientoManual(connection, id);
  await eliminarAsientoMovimientoInventario(connection, id);
  return movimiento;
};

export const eliminarMovimientosCompra = async (connection, compraId) => {
  await deleteMovimientosByReferencePrefix(connection, `${REF_COMPRA_REVERSA_PREFIX}|${compraId}|`);
  await deleteMovimientosByReferencePrefix(connection, `${REF_COMPRA_PREFIX}|${compraId}|`);
};

export const eliminarReversionesCompra = async (connection, compraId) => {
  await deleteMovimientosByReferencePrefix(connection, `${REF_COMPRA_REVERSA_PREFIX}|${compraId}|`);
};

export const registrarReversionCompraInventario = async (connection, compra = {}) => {
  const compraId = Number(compra.id);
  if (!compraId) {
    throw new Error('Se requiere una compra válida para registrar su anulación en inventario.');
  }

  await eliminarReversionesCompra(connection, compraId);

  const [rows] = await connection.query(
    `
      SELECT articulo_id, sucursal_id, cant_entrada, fecha_movimiento
      FROM kardex_articulos
      WHERE documento_referencia LIKE ?
      ORDER BY fecha_movimiento ASC, id ASC
    `,
    [`${REF_COMPRA_PREFIX}|${compraId}|%`]
  );

  if (!rows.length) {
    return [];
  }

  const movimientos = [];
  const fechaMovimiento = toSqlDateTime(compra.fecha_pagada || compra.fecha_compra || new Date());

  for (const row of rows) {
    const movimiento = await registrarMovimientoInventario(connection, {
      articulo_id: Number(row.articulo_id),
      sucursal_id: Number(row.sucursal_id || 1),
      fecha_movimiento: fechaMovimiento,
      tipo_movimiento: 'AJUSTE',
      documento_referencia: buildCompraReversalReference({
        compraId,
        numeroDocumento: compra.numero_documento
      }),
      cantidad: row.cant_entrada,
      costo_unitario: 0
    });
    movimientos.push(movimiento);
  }

  return movimientos;
};

export const sincronizarCompraInventario = async (connection, compra = {}) => {
  const compraId = Number(compra.id);
  if (!compraId) {
    throw new Error('Se requiere una compra válida para sincronizar inventario.');
  }

  const estadoPago = String(compra.estado_pago || '').trim().toUpperCase();

  if (estadoPago === 'ANULADO') {
    return registrarReversionCompraInventario(connection, compra);
  }

  await eliminarMovimientosCompra(connection, compraId);

  const detalles = Array.isArray(compra.detalles) ? compra.detalles : [];
  const inserted = [];
  const fechaMovimiento = toSqlDateTime(compra.fecha_compra);

  for (const detalle of detalles) {
    const articuloId = Number(detalle.articulo_id);
    if (!Number.isInteger(articuloId) || articuloId <= 0) continue;

    const movimiento = await registrarMovimientoInventario(connection, {
      articulo_id: articuloId,
      sucursal_id: Number(detalle.sucursal_id || 1),
      fecha_movimiento: fechaMovimiento,
      tipo_movimiento: 'ENTRADA',
      documento_referencia: buildCompraReference({
        compraId,
        numeroDocumento: compra.numero_documento
      }),
      cantidad: detalle.cantidad,
      costo_unitario: detalle.costo_unitario
    });

    inserted.push(movimiento);
  }

  return inserted;
};

export const sincronizarCompraDerivados = async (connection, compra = {}, options = {}) => {
  const compraId = Number(compra.id);
  if (!compraId) {
    throw new Error('Se requiere una compra válida para sincronizar inventario y contabilidad.');
  }

  await eliminarMovimientosCompra(connection, compraId);

  const estadoPago = String(compra.estado_pago || '').trim().toUpperCase();
  const fechaMovimiento = toSqlDateTime(options.fechaMovimiento || compra.fecha_compra);
  const detalles = Array.isArray(compra.detalles) ? compra.detalles : [];

  if (estadoPago !== 'ANULADO') {
    for (const detalle of detalles) {
      const articuloId = Number(detalle.articulo_id);
      if (!Number.isInteger(articuloId) || articuloId <= 0) continue;

      await registrarMovimiento({
        articulo_id: articuloId,
        sucursal_id: Number(detalle.sucursal_id || 1),
        fecha_movimiento: fechaMovimiento,
        tipo_movimiento: 'ENTRADA',
        documento_referencia: buildCompraReference({
          compraId,
          numeroDocumento: compra.numero_documento
        }),
        cantidad: Number(detalle.cantidad || 0),
        costo_unitario: Number(detalle.costo_unitario || 0)
      }, connection);
    }
  }

  await connection.query(
    'DELETE FROM movimientos_contables WHERE referencia_tabla IN (?, ?) AND referencia_id = ?',
    ['compras', 'compras_anulacion', compraId]
  );

  const montoCompra = roundMoney(detalles.reduce(
    (acc, item) => acc + Number(item.valor_subtotal || 0),
    0
  ));

  if (montoCompra > 0) {
    await registrarAsientoCompra(connection, {
      compra_id: compraId,
      monto: montoCompra,
      forma_pago: compra.forma_pago,
      fecha: compra.fecha_pagada || compra.fecha_compra,
      numero_documento: compra.numero_documento,
      detalles
    });

    if (estadoPago === 'ANULADO') {
      await registrarReversionAsientoCompra(connection, {
        compra_id: compraId,
        numero_documento: compra.numero_documento,
        fecha: compra.fecha_pagada || compra.fecha_compra
      });
    }
  }

  return compra;
};

export const obtenerDiagnosticoInventarioContable = async (executor) => {
  const [articulosRows] = await executor.query(
    `
      SELECT COALESCE(SUM(a.stock_actual * a.costo_unitario), 0) AS total_inventario
      FROM articulos a
    `
  );

  const [contableRows] = await executor.query(
    `
      SELECT
        COALESCE(SUM(CASE WHEN tipo_movimiento = 'Debito' THEN monto ELSE 0 END), 0) AS total_debito,
        COALESCE(SUM(CASE WHEN tipo_movimiento = 'Credito' THEN monto ELSE 0 END), 0) AS total_credito
      FROM movimientos_contables
      WHERE cuenta_codigo IN ('143501', '143502', '143503')
    `
  );

  const valorA = roundMoney(articulosRows?.[0]?.total_inventario || 0);
  const totalDebito = roundMoney(contableRows?.[0]?.total_debito || 0);
  const totalCredito = roundMoney(contableRows?.[0]?.total_credito || 0);
  const valorB = roundMoney(totalDebito - totalCredito);
  const diferencia = roundMoney(valorA - valorB);

  return {
    valorA,
    valorB,
    diferencia,
    estado: Math.abs(diferencia) < 0.01 ? 'OK' : 'ERROR',
    cuentas: ['143501', '143502', '143503']
  };
};

const limpiarDuplicadosKardexCompra = async (connection) => {
  const [result] = await connection.query(
    `
      DELETE k1
      FROM kardex_articulos k1
      INNER JOIN kardex_articulos k2
        ON k1.id > k2.id
       AND k1.articulo_id = k2.articulo_id
       AND k1.sucursal_id = k2.sucursal_id
       AND k1.fecha_movimiento = k2.fecha_movimiento
       AND k1.tipo_movimiento = k2.tipo_movimiento
       AND COALESCE(k1.documento_referencia, '') = COALESCE(k2.documento_referencia, '')
       AND COALESCE(k1.cant_entrada, 0) = COALESCE(k2.cant_entrada, 0)
       AND COALESCE(k1.costo_entrada, 0) = COALESCE(k2.costo_entrada, 0)
       AND COALESCE(k1.cant_salida, 0) = COALESCE(k2.cant_salida, 0)
      WHERE COALESCE(k1.documento_referencia, '') LIKE 'COMPRA|ENTRADA|%'
    `
  );

  return Number(result?.affectedRows || 0);
};

export const sanearTodo = async (options = {}, externalConnection = null) => {
  const connection = externalConnection || await db.getConnection();
  const managesTransaction = !externalConnection;
  const articuloIdFiltro = Number(options?.articuloId || 0) || null;
  const sucursalIdFiltro = Number(options?.sucursalId || 1) || 1;

  try {
    if (managesTransaction) {
      await connection.beginTransaction();
    }

    // Paso 1: limpia registros duplicados antes del recálculo por procedimiento.
    const duplicadosEliminados = await limpiarDuplicadosKardexCompra(connection);

    let kardexPairs = [];
    if (articuloIdFiltro) {
      kardexPairs = [{ articulo_id: articuloIdFiltro, sucursal_id: sucursalIdFiltro }];
    } else {
      const [rows] = await connection.query(
        `
          SELECT DISTINCT articulo_id, sucursal_id
          FROM kardex_articulos
          ORDER BY articulo_id ASC, sucursal_id ASC
        `
      );
      kardexPairs = rows;
    }

    const articulosUnicos = new Set();
    const errores = [];
    let totalCombinaciones = 0;

    for (const row of kardexPairs) {
      const articuloId = Number(row.articulo_id);
      const sucursalId = Number(row.sucursal_id || 1);
      articulosUnicos.add(articuloId);

      try {
        await connection.query('CALL sp_recalcular_kardex(?, ?)', [articuloId, sucursalId]);
        totalCombinaciones += 1;
      } catch (error) {
        errores.push({
          articuloId,
          sucursalId,
          mensaje: error?.sqlMessage || error?.message || 'Error desconocido al recalcular kardex'
        });
      }
    }

    const estadoSalud = await obtenerDiagnosticoInventarioContable(connection);

    if (managesTransaction) {
      await connection.commit();
    }

    return {
      totalCombinaciones,
      totalArticulos: articulosUnicos.size,
      estadoSalud,
      mensaje: 'Saneamiento completado: se recalcularon los saldos del kardex',
      duplicadosEliminados,
      errores
    };
  } catch (error) {
    if (managesTransaction) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (managesTransaction) {
      connection.release();
    }
  }
};

export default {
  buildCompraReference,
  buildCompraReversalReference,
  buildManualReference,
  actualizarMovimientoManual,
  actualizarMovimientoManualCompleto,
  eliminarMovimientoManual,
  eliminarMovimientoManualCompleto,
  eliminarMovimientosCompra,
  eliminarReversionesCompra,
  getMovimientoKardexById,
  isCompraReference,
  isCompraReversalReference,
  isManualReference,
  parseInternalReference,
  obtenerDiagnosticoInventarioContable,
  sanearTodo,
  recalcularKardexArticulo,
  registrarReversionCompraInventario,
  registrarMovimiento,
  registrarMovimientoInventario,
  roundMoney,
  roundQuantity,
  sincronizarCompraDerivados,
  sincronizarCompraInventario
};
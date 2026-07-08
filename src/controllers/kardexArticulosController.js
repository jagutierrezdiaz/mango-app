import db from '../config/db.js';
import { registrarAccion } from '../helpers/auditoria.helper.js';
import {
  actualizarMovimientoManualCompleto,
  buildManualReference,
  eliminarMovimientoManualCompleto,
  getMovimientoKardexById,
  isManualReference,
  parseInternalReference,
  registrarMovimiento
} from '../services/inventarioService.js';

const logBackendError = (functionName, error) => {
  console.error(`\n${'='.repeat(50)}`);
  console.error(`❌ ERROR DETECTADO EN: ${functionName}`);
  console.error('MENSAJE:', error?.message);
  if (error?.sql) console.error('SQL FALLIDO:', error.sql);
  if (error?.sqlMessage) console.error('ERROR MYSQL:', error.sqlMessage);
  console.error('='.repeat(50));
  console.error('');
};

const buildArticuloImageUrl = (req, urlFoto) => {
  if (!urlFoto) return null;
  if (/^https?:\/\//i.test(urlFoto)) return urlFoto;
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  if (String(urlFoto).startsWith('/uploads/')) {
    return `${baseUrl}${urlFoto}`;
  }
  return `${baseUrl}/uploads/articulos/${urlFoto}`;
};

const normalizeDateStart = (value) => {
  if (!value) return null;
  return `${value} 00:00:00`;
};

const normalizeDateEnd = (value) => {
  if (!value) return null;
  return `${value} 23:59:59`;
};

export const getKardexArticulos = async (req, res) => {
  try {
    const {
      fecha_inicio: fechaInicio,
      fecha_final: fechaFinal,
      sucursal_id: sucursalId,
      articulo_id: articuloId,
      tipo_movimiento: tipoMovimiento
    } = req.query;

    const filters = [];
    const params = [];

    if (fechaInicio) {
      filters.push('k.fecha_movimiento >= ?');
      params.push(normalizeDateStart(fechaInicio));
    }

    if (fechaFinal) {
      filters.push('k.fecha_movimiento <= ?');
      params.push(normalizeDateEnd(fechaFinal));
    }

    if (sucursalId && sucursalId !== 'TODAS') {
      filters.push('k.sucursal_id = ?');
      params.push(Number(sucursalId));
    }

    if (articuloId && articuloId !== 'TODOS') {
      filters.push('k.articulo_id = ?');
      params.push(Number(articuloId));
    }

    if (tipoMovimiento && tipoMovimiento !== 'TODOS') {
      filters.push('k.tipo_movimiento = ?');
      params.push(String(tipoMovimiento).toUpperCase());
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const [rows] = await db.query(
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
        ${whereClause}
        ORDER BY k.fecha_movimiento DESC, k.id DESC
      `,
      params
    );

    const data = rows.map((row) => {
      const parsedReference = parseInternalReference(row.documento_referencia);
      return {
        ...row,
        articulo_url_foto: buildArticuloImageUrl(req, row.articulo_url_foto),
        documento_referencia_visible: parsedReference.visible,
        es_manual: isManualReference(row.documento_referencia),
        es_compra: parsedReference.isCompra,
        es_compra_reversion: parsedReference.isCompraReversion,
        compra_id: parsedReference.compraId,
        referencia_fuente: parsedReference.source,
        referencia_subtipo: parsedReference.subtype
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    logBackendError('getKardexArticulos', error);
    res.status(500).json({ success: false, message: 'Error al obtener movimientos de kardex' });
  }
};

export const getKardexSucursales = async (_req, res) => {
  try {
    const [rows] = await db.query(
      `
        SELECT DISTINCT sucursal_id
        FROM kardex_articulos
        ORDER BY sucursal_id ASC
      `
    );

    const data = rows.map((row) => ({
      id: row.sucursal_id,
      nombre: `Sucursal ${row.sucursal_id}`
    }));

    res.json({ success: true, data });
  } catch (error) {
    logBackendError('getKardexSucursales', error);
    res.status(500).json({ success: false, message: 'Error al obtener sucursales de kardex' });
  }
};

const buildMovimientoResponse = async (req, connection, id) => {
  const movimiento = await getMovimientoKardexById(connection, id);
  if (!movimiento) return null;

  const parsedReference = parseInternalReference(movimiento.documento_referencia);

  return {
    ...movimiento,
    articulo_url_foto: buildArticuloImageUrl(req, movimiento.articulo_url_foto),
    documento_referencia_visible: parsedReference.visible,
    es_manual: isManualReference(movimiento.documento_referencia),
    es_compra: parsedReference.isCompra,
    es_compra_reversion: parsedReference.isCompraReversion,
    compra_id: parsedReference.compraId,
    referencia_fuente: parsedReference.source,
    referencia_subtipo: parsedReference.subtype
  };
};

export const createMovimientoManualKardex = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const payload = {
      ...req.body,
      documento_referencia: buildManualReference({
        subtype: req.body?.tipo_movimiento,
        documentReference: req.body?.documento_referencia
      })
    };

    const movimiento = await registrarMovimiento(payload, connection);
    await connection.commit();

    await registrarAccion({
      tabla: 'kardex_articulos',
      operacion: 'INSERT',
      registroId: movimiento.id,
      personalId: req.user?.id ?? null,
      detalles: {
        articulo_id: movimiento.articulo_id,
        sucursal_id: movimiento.sucursal_id,
        tipo_movimiento: movimiento.tipo_movimiento,
        documento_referencia: payload.documento_referencia
      }
    });

    res.status(201).json({
      success: true,
      data: await buildMovimientoResponse(req, connection, movimiento.id),
      message: 'Movimiento manual registrado correctamente'
    });
  } catch (error) {
    await connection.rollback();
    logBackendError('createMovimientoManualKardex', error);
    res.status(400).json({ success: false, message: error.message || 'Error al registrar movimiento manual' });
  } finally {
    connection.release();
  }
};

export const updateMovimientoManualKardex = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const payload = {
      ...req.body,
      documento_referencia: buildManualReference({
        subtype: req.body?.tipo_movimiento,
        documentReference: req.body?.documento_referencia
      })
    };

    const movimiento = await actualizarMovimientoManualCompleto(connection, Number(req.params.id), payload);
    await connection.commit();

    await registrarAccion({
      tabla: 'kardex_articulos',
      operacion: 'UPDATE',
      registroId: Number(req.params.id),
      personalId: req.user?.id ?? null,
      detalles: {
        articulo_id: movimiento.articulo_id,
        sucursal_id: movimiento.sucursal_id,
        tipo_movimiento: movimiento.tipo_movimiento,
        documento_referencia: payload.documento_referencia
      }
    });

    res.json({
      success: true,
      data: await buildMovimientoResponse(req, connection, Number(req.params.id)),
      message: 'Movimiento manual actualizado correctamente'
    });
  } catch (error) {
    await connection.rollback();
    logBackendError('updateMovimientoManualKardex', error);
    res.status(400).json({ success: false, message: error.message || 'Error al actualizar movimiento manual' });
  } finally {
    connection.release();
  }
};

export const deleteMovimientoManualKardex = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const movimiento = await getMovimientoKardexById(connection, Number(req.params.id));
    if (!movimiento) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Movimiento no encontrado' });
    }

    await eliminarMovimientoManualCompleto(connection, Number(req.params.id));
    await connection.commit();

    await registrarAccion({
      tabla: 'kardex_articulos',
      operacion: 'DELETE',
      registroId: Number(req.params.id),
      personalId: req.user?.id ?? null,
      detalles: movimiento
    });

    res.json({ success: true, message: 'Movimiento manual eliminado correctamente' });
  } catch (error) {
    await connection.rollback();
    logBackendError('deleteMovimientoManualKardex', error);
    res.status(400).json({ success: false, message: error.message || 'Error al eliminar movimiento manual' });
  } finally {
    connection.release();
  }
};
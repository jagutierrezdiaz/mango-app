import db from '../config/db.js';
import { registrarAccion } from '../helpers/auditoria.helper.js';
import {
  registrarCausacionGasto,
  registrarPagoGasto,
  revertirAsientosGasto,
  mapGrupoPucToCuentaGasto,
  getPucGroupsCatalog,
  getPucSubaccountsCatalog
} from '../services/contabilidadService.js';
import { IMAGE_FOLDERS } from '../config/imageFolders.js';

const DEFAULT_COMPROBANTE = 'default.png';

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

const toMoney = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getCurrentLocalDateTime = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 19).replace('T', ' ');
};

const validateChronologicalDate = async (connection, value, currentId = null) => {
  const normalizedValue = toSqlDatetimeNoSeconds(value);
  if (!normalizedValue) {
    return 'La fecha de gasto no es válida';
  }

  if (normalizedValue > getCurrentLocalDateTime()) {
    return 'La fecha de gasto no puede ser superior a la fecha actual';
  }

  const params = [];
  let exclusionClause = '';

  if (currentId) {
    exclusionClause = ' AND id <> ?';
    params.push(Number(currentId));
  }

  const [rows] = await connection.query(
    `SELECT ${'fecha_gasto'} AS fecha_referencia
     FROM gastos
     WHERE ${'fecha_gasto'} IS NOT NULL${exclusionClause}
     ORDER BY ${'fecha_gasto'} DESC, id DESC
     LIMIT 1`,
    params
  );

  const lastDate = rows?.[0]?.fecha_referencia ? toSqlDatetimeNoSeconds(rows[0].fecha_referencia) : null;
  if (lastDate && normalizedValue < lastDate) {
    return 'La fecha de gasto no puede ser inferior al último gasto registrado';
  }

  return null;
};

const allowedGrupoPucCodes = getPucGroupsCatalog().map((item) => item.codigo);

const normalizeGroupCode = (value = '') => {
  const match = String(value || '').match(/^(\d{2})/);
  return match ? match[1] : '';
};

const buildGrupoPucEtiqueta = (groupCode) => {
  const item = getPucGroupsCatalog().find((entry) => entry.codigo === groupCode);
  return item ? item.etiqueta : `${groupCode} - Grupo PUC`;
};

const allowedTipoDocumento = ['FACTURA_ELECTRONICA', 'DOCUMENTO_SOPORTE', 'CUENTA_COBRO'];
const allowedEstado = ['CAUSADO', 'PAGADO', 'ANULADO', 'PENDIENTE'];
const allowedFuentePago = ['CAJA_MENOR', 'BANCO', 'CAJA_GENERAL', 'MIXTO'];
const allowedTipoMovimiento = ['GASTO','COSTO','ACTIVO','INVENTARIO','PATRIMONIO','TESORERIA'];

const buildUploadsUrl = (req, folder, fileName) => {
  if (!fileName) return null;
  if (/^https?:\/\//i.test(fileName)) return fileName;
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  if (String(fileName).startsWith('/uploads/')) return `${baseUrl}${fileName}`;
  const folderName = folder === 'gastos' ? IMAGE_FOLDERS.GASTOS : (folder === 'proveedores' ? IMAGE_FOLDERS.PROVEEDORES : folder);
  return `${baseUrl}/uploads/${folderName}/${fileName}`;
};

const mapRow = (req, row) => {
  const groupCode = normalizeGroupCode(row?.grupo_puc);
  return {
    ...row,
    grupo_puc: groupCode ? buildGrupoPucEtiqueta(groupCode) : (row.grupo_puc || ''),
    proveedor_nombre: row.proveedor_nombre || row.proveedor_razon_social || null,
    proveedor_url_logo: buildUploadsUrl(req, 'proveedores', row.proveedor_url_logo),
    url_comprobante: buildUploadsUrl(req, 'gastos', row.url_comprobante)
  };
};

const validatePayload = (payload = {}) => {
  const groupCode = normalizeGroupCode(payload.grupo_puc);
  if (!groupCode || !allowedGrupoPucCodes.includes(groupCode)) {
    return 'Debe seleccionar un grupo PUC válido';
  }

  if (!payload.descripcion || !String(payload.descripcion).trim()) {
    return 'La descripción del gasto es obligatoria';
  }

  if (!payload.fecha_gasto || !toSqlDatetimeNoSeconds(payload.fecha_gasto)) {
    return 'La fecha de gasto no es válida';
  }

  if (!payload.tipo_documento || !allowedTipoDocumento.includes(payload.tipo_documento)) {
    return 'Debe seleccionar un tipo de documento válido';
  }

  if (payload.estado && !allowedEstado.includes(payload.estado)) {
    return 'Estado no válido';
  }

  if (payload.subcuenta_puc && !/^\d{6}$/.test(String(payload.subcuenta_puc))) {
    return 'Subcuenta PUC inválida';
  }

  if (payload.tipo_movimiento && !allowedTipoMovimiento.includes(String(payload.tipo_movimiento).toUpperCase())) {
    return 'Tipo de movimiento inválido';
  }

  if (payload.fuente_pago && !allowedFuentePago.includes(String(payload.fuente_pago).toUpperCase())) {
    return 'Fuente de pago no válida';
  }

  return null;
};

export const getPucGruposGastos = async (_req, res) => {
  try {
    const grupos = getPucGroupsCatalog();
    return res.json({ success: true, data: grupos });
  } catch (error) {
    console.error('Error en getPucGruposGastos:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener grupos PUC.' });
  }
};

export const getPucSubcuentasGastos = async (req, res) => {
  try {
    const group = String(req.query?.group || '').trim();
    const data = getPucSubaccountsCatalog(group);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error en getPucSubcuentasGastos:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener subcuentas PUC.' });
  }
};

export const getGastos = async (req, res) => {
  try {
    const { fecha_inicio: fechaInicio, fecha_final: fechaFinal } = req.query;

    const filters = [];
    const params = [];

    if (fechaInicio) {
      filters.push('g.fecha_gasto >= ?');
      params.push(`${fechaInicio} 00:00:00`);
    }

    if (fechaFinal) {
      filters.push('g.fecha_gasto <= ?');
      params.push(`${fechaFinal} 23:59:59`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const [rows] = await db.query(
      `
        SELECT
          g.*,
          p.razon_social AS proveedor_razon_social,
          COALESCE(p.razon_social, p.contacto_nombre) AS proveedor_nombre,
          p.url_logo AS proveedor_url_logo,
          DATE_FORMAT(g.fecha_gasto, '%Y-%m-%d %H:%i') AS fecha_gasto,
          DATE_FORMAT(g.fecha_registro, '%Y-%m-%d %H:%i') AS fecha_registro
        FROM gastos g
        LEFT JOIN proveedores p ON p.id = g.proveedor_id
        ${whereClause}
        ORDER BY g.fecha_gasto DESC, g.id DESC
      `,
      params
    );

    res.json({ success: true, data: rows.map((row) => mapRow(req, row)) });
  } catch (error) {
    console.error('Error en getGastos:', error);
    res.status(500).json({ success: false, message: 'Error al obtener gastos' });
  }
};

export const getGastoById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `
        SELECT
          g.*,
          p.razon_social AS proveedor_razon_social,
          COALESCE(p.razon_social, p.contacto_nombre) AS proveedor_nombre,
          p.url_logo AS proveedor_url_logo,
          DATE_FORMAT(g.fecha_gasto, '%Y-%m-%d %H:%i') AS fecha_gasto,
          DATE_FORMAT(g.fecha_registro, '%Y-%m-%d %H:%i') AS fecha_registro
        FROM gastos g
        LEFT JOIN proveedores p ON p.id = g.proveedor_id
        WHERE g.id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Gasto no encontrado' });
    }

    res.json({ success: true, data: mapRow(req, rows[0]) });
  } catch (error) {
    console.error('Error en getGastoById:', error);
    res.status(500).json({ success: false, message: 'Error al obtener gasto' });
  }
};

export const createGasto = async (req, res) => {
  const payload = req.body || {};
  const personalId = req.user?.id ?? null;
  const validationError = validatePayload(payload);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const valorNeto = toMoney(payload.valor_neto);
  const iva = toMoney(payload.iva);
  const retencionFuente = toMoney(payload.retencion_fuente);
  const totalGasto = payload.total_gasto !== undefined && payload.total_gasto !== null && payload.total_gasto !== ''
    ? toMoney(payload.total_gasto)
    : (valorNeto + iva - retencionFuente);

  const urlComprobante = req.file ? req.file.filename : DEFAULT_COMPROBANTE;
  const fechaGasto = toSqlDatetimeNoSeconds(payload.fecha_gasto);
  const fechaRegistro = toSqlDatetimeNoSeconds(payload.fecha_registro) || toSqlDatetimeNoSeconds(new Date());
  const estadoFinal = payload.estado || 'CAUSADO';
  const fuentePagoFinal = String(payload.fuente_pago || 'CAJA_GENERAL').toUpperCase();
  const groupCode = normalizeGroupCode(payload.grupo_puc);
  const grupoPucEtiqueta = buildGrupoPucEtiqueta(groupCode);
  const cuentaGasto = mapGrupoPucToCuentaGasto(groupCode);
  // Allow explicit subaccount override if provided and valid (6 digits)
  const subcuentaFromPayload = String(payload.subcuenta_puc || payload.cuenta_puc || '').trim();
  const subcuentaFinal = (/^\d{6}$/.test(subcuentaFromPayload)) ? subcuentaFromPayload : cuentaGasto;
  const tipoMovimientoFinal = String(payload.tipo_movimiento || '').toUpperCase() || null;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const chronologicalError = await validateChronologicalDate(connection, fechaGasto);
    if (chronologicalError) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: chronologicalError });
    }

    const [result] = await connection.query(
      `
        INSERT INTO gastos (
          sucursal_id,
          proveedor_id,
          grupo_puc,
          descripcion,
          fecha_gasto,
          fecha_registro,
          valor_neto,
          iva,
          retencion_fuente,
          total_gasto,
          tipo_documento,
          numero_soporte,
          url_comprobante,
          subcuenta_puc,
          tipo_movimiento,
          estado,
          fuente_pago
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        Number(payload.sucursal_id || 1),
        payload.proveedor_id ? Number(payload.proveedor_id) : null,
        groupCode,
        String(payload.descripcion || '').trim(),
        fechaGasto,
        fechaRegistro,
        valorNeto,
        iva,
        retencionFuente,
        totalGasto,
        payload.tipo_documento,
        payload.numero_soporte || null,
        urlComprobante,
        subcuentaFinal || null,
        tipoMovimientoFinal,
        estadoFinal,
        fuentePagoFinal
      ]
    );

    const gastoId = Number(result?.insertId || 0);
    if (!gastoId) {
      await connection.rollback();
      return res.status(500).json({ success: false, message: 'No se pudo crear el gasto.' });
    }

    const descContable = String(payload.descripcion || '').trim();

    // Causación: DÉBITO cuenta gasto → CRÉDITO 233505 (Costos y Gastos por Pagar)
    await registrarCausacionGasto(connection, {
      monto: totalGasto,
      cuenta_puc: subcuentaFinal,
      gasto_id: gastoId,
      descripcion: descContable
    });

    // Pago inmediato: DÉBITO 233505 → CRÉDITO 110505 (Caja)
    if (estadoFinal === 'PAGADO') {
      await registrarPagoGasto(connection, {
        monto: totalGasto,
        gasto_id: gastoId,
        descripcion: descContable,
        fuente_pago: fuentePagoFinal
      });
    }

    await connection.commit();

    await registrarAccion({
      tabla: 'gastos',
      operacion: 'INSERT',
      registroId: gastoId,
      personalId,
      detalles: {
        proveedor_id: payload.proveedor_id ? Number(payload.proveedor_id) : null,
        grupo_puc: grupoPucEtiqueta,
        subcuenta_puc: subcuentaFinal,
        tipo_movimiento: tipoMovimientoFinal,
        descripcion: String(payload.descripcion || '').trim(),
        total_gasto: totalGasto,
        tipo_documento: payload.tipo_documento,
        estado: estadoFinal,
        fuente_pago: fuentePagoFinal
      }
    });

    req.params.id = gastoId;
    return getGastoById(req, res);
  } catch (error) {
    await connection.rollback();
    console.error('Error en createGasto:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error al crear gasto',
      detail: error.sqlMessage || undefined
    });
  } finally {
    connection.release();
  }
};

export const updateGasto = async (req, res) => {
  const { id } = req.params;
  const payload = req.body || {};
  const personalId = req.user?.id ?? null;

  const isSoloCambioEstado = Object.keys(payload).length === 1 && payload.estado !== undefined;
  const estadoNormalizado = String(payload.estado || '').toUpperCase();

  if (isSoloCambioEstado) {
    if (!allowedEstado.includes(estadoNormalizado)) {
      return res.status(400).json({ success: false, message: 'Estado no válido' });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [rows] = await connection.query(
        'SELECT id, estado, descripcion, total_gasto, fuente_pago FROM gastos WHERE id = ? LIMIT 1',
        [Number(id)]
      );

      if (!rows.length) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'Gasto no encontrado' });
      }

      const gasto = rows[0];
      const estadoPrevio = String(gasto.estado || '').toUpperCase();
      const fuentePago = String(gasto.fuente_pago || 'CAJA_GENERAL').toUpperCase();

      if (estadoPrevio === 'ANULADO') {
        await connection.rollback();
        return res.status(409).json({ success: false, message: 'El gasto ya está anulado y no puede modificarse.' });
      }

      await connection.query('UPDATE gastos SET estado = ? WHERE id = ?', [estadoNormalizado, Number(id)]);

      if (estadoNormalizado === 'PAGADO' && estadoPrevio !== 'PAGADO') {
        await registrarPagoGasto(connection, {
          monto: toMoney(gasto.total_gasto),
          gasto_id: Number(id),
          descripcion: String(gasto.descripcion || '').trim(),
          fuente_pago: fuentePago
        });
      }

      if (estadoNormalizado === 'ANULADO' && estadoPrevio !== 'ANULADO') {
        await revertirAsientosGasto(connection, {
          gasto_id: Number(id),
          descripcion: String(gasto.descripcion || '').trim()
        });
      }

      await connection.commit();

      await registrarAccion({
        tabla: 'gastos',
        operacion: 'UPDATE',
        registroId: Number(id),
        personalId,
        detalles: {
          estado_anterior: estadoPrevio,
          estado_nuevo: estadoNormalizado,
          modo_actualizacion: 'SOLO_ESTADO'
        }
      });

      req.params.id = Number(id);
      return getGastoById(req, res);
    } catch (error) {
      await connection.rollback();
      console.error('Error en updateGasto (solo estado):', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error al actualizar estado del gasto',
        detail: error.sqlMessage || undefined
      });
    } finally {
      connection.release();
    }
  }

  const validationError = validatePayload(payload);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const valorNeto = toMoney(payload.valor_neto);
  const iva = toMoney(payload.iva);
  const retencionFuente = toMoney(payload.retencion_fuente);
  const totalGasto = payload.total_gasto !== undefined && payload.total_gasto !== null && payload.total_gasto !== ''
    ? toMoney(payload.total_gasto)
    : (valorNeto + iva - retencionFuente);

  const fechaGasto = toSqlDatetimeNoSeconds(payload.fecha_gasto);
  const fechaRegistro = toSqlDatetimeNoSeconds(payload.fecha_registro) || toSqlDatetimeNoSeconds(new Date());
  const estadoFinal = payload.estado || 'CAUSADO';
  const fuentePagoFinal = String(payload.fuente_pago || 'CAJA_GENERAL').toUpperCase();
  const groupCode = normalizeGroupCode(payload.grupo_puc);
  const grupoPucEtiqueta = buildGrupoPucEtiqueta(groupCode);
  const cuentaGasto = mapGrupoPucToCuentaGasto(groupCode);

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.query(
      'SELECT id, url_comprobante, estado AS estado_previo, fuente_pago FROM gastos WHERE id = ? LIMIT 1',
      [id]
    );
    if (!existingRows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Gasto no encontrado' });
    }

    const estadoPrevio = existingRows[0].estado_previo;

    if (String(estadoPrevio || '').toUpperCase() === 'ANULADO') {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'El gasto está anulado y no puede editarse.' });
    }

    const fuentePagoPrevia = String(existingRows[0].fuente_pago || 'CAJA_GENERAL').toUpperCase();

    const chronologicalError = await validateChronologicalDate(connection, fechaGasto, id);
    if (chronologicalError) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: chronologicalError });
    }

    const urlComprobante = req.file
      ? req.file.filename
      : (existingRows[0].url_comprobante || DEFAULT_COMPROBANTE);

    const fuentePago = payload.fuente_pago
      ? String(payload.fuente_pago).toUpperCase()
      : fuentePagoPrevia;

    await connection.query(
      `
        UPDATE gastos
        SET sucursal_id = ?,
            proveedor_id = ?,
            grupo_puc = ?,
            descripcion = ?,
            fecha_gasto = ?,
            fecha_registro = ?,
            valor_neto = ?,
            iva = ?,
            retencion_fuente = ?,
            total_gasto = ?,
            tipo_documento = ?,
            numero_soporte = ?,
            url_comprobante = ?,
            estado = ?,
            fuente_pago = ?
        WHERE id = ?
      `,
      [
        Number(payload.sucursal_id || 1),
        payload.proveedor_id ? Number(payload.proveedor_id) : null,
        groupCode,
        String(payload.descripcion || '').trim(),
        fechaGasto,
        fechaRegistro,
        valorNeto,
        iva,
        retencionFuente,
        totalGasto,
        payload.tipo_documento,
        payload.numero_soporte || null,
        urlComprobante,
        estadoFinal,
        fuentePago,
        Number(id)
      ]
    );

    // Registrar pago solo si transición PENDIENTE → PAGADO
    // (la causación ya fue registrada al crear el gasto)
    if (estadoPrevio !== 'PAGADO' && estadoFinal === 'PAGADO') {
      await registrarPagoGasto(connection, {
        monto: totalGasto,
        gasto_id: Number(id),
        descripcion: String(payload.descripcion || '').trim(),
        fuente_pago: fuentePago
      });
    }

    if (String(estadoPrevio || '').toUpperCase() !== 'ANULADO' && String(estadoFinal || '').toUpperCase() === 'ANULADO') {
      await revertirAsientosGasto(connection, {
        gasto_id: Number(id),
        descripcion: String(payload.descripcion || '').trim()
      });
    }

    await connection.commit();

    await registrarAccion({
      tabla: 'gastos',
      operacion: 'UPDATE',
      registroId: Number(id),
      personalId,
      detalles: {
        proveedor_id: payload.proveedor_id ? Number(payload.proveedor_id) : null,
        grupo_puc: grupoPucEtiqueta,
        subcuenta_puc: subcuentaFinal,
        tipo_movimiento: tipoMovimientoFinal,
        descripcion: String(payload.descripcion || '').trim(),
        total_gasto: totalGasto,
        tipo_documento: payload.tipo_documento,
        estado: estadoFinal,
        fuente_pago: fuentePago
      }
    });

    return getGastoById(req, res);
  } catch (error) {
    await connection.rollback();
    console.error('Error en updateGasto:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error al actualizar gasto',
      detail: error.sqlMessage || undefined
    });
  } finally {
    connection.release();
  }
};

export const deleteGasto = async (req, res) => {
  return res.status(405).json({
    success: false,
    message: 'Operación no permitida: los gastos no se eliminan físicamente. Use ANULAR.'
  });
};
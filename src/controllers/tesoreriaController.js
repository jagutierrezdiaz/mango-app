import db from '../config/db.js';
import { toSqlDateTime } from '../utils/sqlDateHelpers.js';
import { mapClasePucToCuentaCosto, mapGrupoPucToCuentaGasto } from '../services/contabilidadService.js';

const CUENTAS_TESORERIA = [
  { cuenta_codigo: '110505', nombre: 'Caja Punto de Venta', fuente_pago: 'CAJA_GENERAL' },
  { cuenta_codigo: '110510', nombre: 'Caja Operativa', fuente_pago: 'CAJA_MENOR' },
  { cuenta_codigo: '110515', nombre: 'Ahorros / Fondo Reserva', fuente_pago: 'CAJA_AHORRO' },
  { cuenta_codigo: '111005', nombre: 'Bancos (Cta Ahorros)', fuente_pago: 'BANCO' }
];

const CUENTAS_SET = new Set(CUENTAS_TESORERIA.map((c) => c.cuenta_codigo));
const CUENTA_META = Object.fromEntries(CUENTAS_TESORERIA.map((c) => [c.cuenta_codigo, c]));

const roundMoney = (value) => Number((Number(value) || 0).toFixed(2));

const normalizeAsignaciones = (input) => {
  if (Array.isArray(input)) {
    return input.map((item) => ({
      cuenta_codigo: String(item?.cuenta_codigo || '').trim(),
      monto: roundMoney(item?.monto)
    }));
  }

  if (input && typeof input === 'object') {
    return Object.entries(input).map(([cuenta_codigo, monto]) => ({
      cuenta_codigo: String(cuenta_codigo || '').trim(),
      monto: roundMoney(monto)
    }));
  }

  return [];
};

const logSqlGastoPago = (step, sql, params = [], extra = null) => {
  const normalizedSql = String(sql || '').replace(/\s+/g, ' ').trim();
  console.log(`[registrarPagoTesoreria][${step}] SQL:`, normalizedSql);
  console.log(`[registrarPagoTesoreria][${step}] params:`, params);
  if (extra !== null && extra !== undefined) {
    console.log(`[registrarPagoTesoreria][${step}] result:`, extra);
  }
};

const getSaldosFromRows = (rows) => {
  const saldoBase = {
    '110505': 0,
    '110510': 0,
    '110515': 0,
    '111005': 0
  };

  for (const row of rows || []) {
    const cuenta = String(row.cuenta_codigo || '');
    if (!CUENTAS_SET.has(cuenta)) continue;
    saldoBase[cuenta] = roundMoney(row.saldo_disponible);
  }

  return CUENTAS_TESORERIA.map((cuenta) => ({
    ...cuenta,
    saldo_disponible: saldoBase[cuenta.cuenta_codigo]
  }));
};

const getSaldosByConnection = async (connection) => {
  const [rows] = await connection.query(
    `SELECT
      mc.cuenta_codigo,
      COALESCE(SUM(CASE WHEN mc.tipo_movimiento = 'Debito' THEN mc.monto ELSE -mc.monto END), 0) AS saldo_disponible
     FROM movimientos_contables mc
     WHERE mc.cuenta_codigo IN ('110505', '110510', '110515', '111005')
     GROUP BY mc.cuenta_codigo`
  );

  return getSaldosFromRows(rows);
};

const tableHasColumn = async (connection, tableName, columnName) => {
  const [rows] = await connection.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  );

  return rows.length > 0;
};

const toDbTipoMovimiento = (tipo) => {
  const normalized = String(tipo || '').trim().toUpperCase();
  return normalized === 'DEBITO' ? 'Debito' : 'Credito';
};

const insertarMovimientoContable = async (connection, payload) => {
  const {
    cuenta_codigo,
    tipo_movimiento,
    monto,
    referencia_tabla,
    referencia_id,
    descripcion,
    arqueo_id = null,
    fecha = toSqlDateTime(new Date())
  } = payload;

  const hasArqueoId = await tableHasColumn(connection, 'movimientos_contables', 'arqueo_id');
  const logPago = ['gastos', 'costos'].includes(String(referencia_tabla || ''));

  if (hasArqueoId) {
    const insertSql = `INSERT INTO movimientos_contables (
        fecha,
        cuenta_codigo,
        tipo_movimiento,
        monto,
        referencia_tabla,
        referencia_id,
        descripcion,
        arqueo_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const insertParams = [
      fecha,
      cuenta_codigo,
      toDbTipoMovimiento(tipo_movimiento),
      roundMoney(monto),
      referencia_tabla,
      Number(referencia_id),
      descripcion,
      arqueo_id
    ];

    if (logPago) {
      logSqlGastoPago('INSERT movimiento_contable', insertSql, insertParams);
    }

    const [insertResult] = await connection.query(insertSql, insertParams);

    if (logPago) {
      logSqlGastoPago('INSERT movimiento_contable', insertSql, insertParams, {
        insertId: insertResult?.insertId,
        affectedRows: insertResult?.affectedRows
      });
    }

    return;
  }

  const insertSql = `INSERT INTO movimientos_contables (
      fecha,
      cuenta_codigo,
      tipo_movimiento,
      monto,
      referencia_tabla,
      referencia_id,
      descripcion
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const insertParams = [
    fecha,
    cuenta_codigo,
    toDbTipoMovimiento(tipo_movimiento),
    roundMoney(monto),
    referencia_tabla,
    Number(referencia_id),
    descripcion
  ];

  if (logPago) {
    logSqlGastoPago('INSERT movimiento_contable', insertSql, insertParams);
  }

  const [insertResult] = await connection.query(insertSql, insertParams);

  if (logPago) {
    logSqlGastoPago('INSERT movimiento_contable', insertSql, insertParams, {
      insertId: insertResult?.insertId,
      affectedRows: insertResult?.affectedRows
    });
  }
};

export const getSaldosTesoreria = async (_req, res) => {
  try {
    const saldos = await getSaldosByConnection(db);
    return res.json({
      success: true,
      data: {
        cuentas: saldos
      }
    });
  } catch (error) {
    console.error('Error al consultar saldos de tesoreria:', error);
    return res.status(500).json({
      success: false,
      message: 'No se pudieron consultar los saldos de tesoreria.'
    });
  }
};

const getCurrentLocalDateTime = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 19).replace('T', ' ');
};

const roundFromPayload = (value) => roundMoney(Number(value || 0));

const normalizeTrasladoDistribucion = (body = {}) => {
  const fromMap = normalizeAsignaciones(body.distribucion)
    .filter((item) => ['110505', '110510', '110515', '111005'].includes(item.cuenta_codigo))
    .map((item) => ({ cuenta_codigo: item.cuenta_codigo, monto: roundMoney(item.monto) }));

  if (fromMap.length) {
    return fromMap;
  }

  return [
    { cuenta_codigo: '110510', monto: roundFromPayload(body.caja_menor) },
    { cuenta_codigo: '111005', monto: roundFromPayload(body.bancos) },
    { cuenta_codigo: '110515', monto: roundFromPayload(body.ahorros) },
    { cuenta_codigo: '110505', monto: roundFromPayload(body.caja_general) }
  ];
};

export const procesarTrasladoContable = async (req, res) => {
    const connection = await db.getConnection(); // Obtener conexión para la transacción
    try {
        await connection.beginTransaction();

        const { distribucion, descripcion, fecha } = req.body;

        // 1. REGISTRAR LA SALIDA (CRÉDITO) DE LA CAJA GENERAL - CAJA PUNTO DE VENTA
        // El monto total que sale es la suma de lo que se reparte a las otras cuentas
        const montoSalida = Number(distribucion['110510'] || 0) + 
                            Number(distribucion['111005'] || 0) + 
                            Number(distribucion['110515'] || 0);

        if (montoSalida > 0) {
            await insertarMovimientoContable(connection, {
                cuenta_codigo: '110505', // Caja Punto de Venta
                tipo_movimiento: 'CREDITO', // Sale dinero
                monto: montoSalida,
                referencia_tabla: 'traslados_fondos',
                referencia_id: 0, 
                descripcion: descripcion || 'Salida por distribución de saldos',
                fecha: fecha
            });
        }

        // 2. REGISTRAR LAS ENTRADAS (DÉBITOS) A LAS CUENTAS DESTINO
        // Iteramos sobre las llaves de distribución (excepto la cuenta origen)
        const cuentasDestino = ['110510', '111005', '110515'];

        for (const codigo of cuentasDestino) {
            const monto = Number(distribucion[codigo] || 0);
            if (monto > 0) {
                await insertarMovimientoContable(connection, {
                    cuenta_codigo: codigo,
                    tipo_movimiento: 'DEBITO', // Entra dinero
                    monto: monto,
                    referencia_tabla: 'traslados_fondos',
                    referencia_id: 0,
                    descripcion: `Ingreso por traslado - cuenta ${codigo}`,
                    fecha: fecha
                });
            }
        }

        await connection.commit();
        res.json({ success: true, message: 'Asientos contables registrados correctamente' });

    } catch (error) {
        await connection.rollback();
        console.error("Error en procesarTrasladoContable:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

export const getArqueosPendientesTesoreria = async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         ac.id,
         COALESCE(ac.fecha_cierre, ac.fecha_apertura) AS fecha,
         CONCAT(TRIM(COALESCE(p.nombres, '')), ' ', TRIM(COALESCE(p.apellidos, ''))) AS cajero,
         COALESCE(ac.saldo_real, 0) AS efectivo_real_reportado,
         COALESCE(ac.ventas_digital, 0) AS total_transferencias,
         ac.estado
       FROM arqueos_caja ac
       INNER JOIN personal p ON p.id = ac.usuario_id
       WHERE UPPER(COALESCE(ac.estado, '')) = 'CERRADO'
         AND NOT EXISTS (
           SELECT 1
           FROM movimientos_contables mc
           WHERE mc.referencia_tabla = 'arqueos_caja'
             AND mc.referencia_id = ac.id
             AND mc.cuenta_codigo = '110505'
             AND mc.tipo_movimiento = 'Credito'
             AND mc.descripcion LIKE 'Traslado Tesoreria%'
         )
       ORDER BY COALESCE(ac.fecha_cierre, ac.fecha_apertura) ASC, ac.id ASC`
    );

    return res.json({
      success: true,
      data: (rows || []).map((row) => ({
        id: Number(row.id || 0),
        fecha: row.fecha,
        cajero: String(row.cajero || '').trim() || 'Cajero',
        efectivo_real_reportado: roundMoney(row.efectivo_real_reportado),
        total_transferencias: roundMoney(row.total_transferencias),
        estado: row.estado
      }))
    });
  } catch (error) {
    console.error('Error al consultar arqueos pendientes de tesoreria:', error);
    return res.status(500).json({
      success: false,
      message: 'No se pudieron consultar arqueos pendientes de tesoreria.'
    });
  }
};

export const trasladarArqueoTesoreria = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const arqueoId = Number(req.body?.arqueo_id || 0);
    if (!arqueoId) {
      return res.status(400).json({ success: false, message: 'arqueo_id es requerido.' });
    }

    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT id, estado, COALESCE(saldo_real, 0) AS efectivo_real_reportado
       FROM arqueos_caja
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [arqueoId]
    );

    const arqueo = rows?.[0];
    if (!arqueo) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Arqueo no encontrado.' });
    }

    const estadoNormalizado = String(arqueo.estado || '').trim().toUpperCase();
    if (estadoNormalizado !== 'CERRADO') {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'Solo se pueden trasladar arqueos en estado CERRADO.'
      });
    }

    const efectivoReal = roundMoney(arqueo.efectivo_real_reportado);
    const distribucion = normalizeTrasladoDistribucion(req.body)
      .map((item) => ({ cuenta_codigo: item.cuenta_codigo, monto: roundMoney(item.monto) }))
      .filter((item) => item.monto > 0);

    if (!distribucion.length) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Debe distribuir al menos un valor mayor a 0.'
      });
    }

    const totalDistribuido = roundMoney(distribucion.reduce((sum, item) => sum + item.monto, 0));
    if (Math.abs(totalDistribuido - efectivoReal) > 0.009) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'La distribución debe ser exactamente igual al Efectivo Real Reportado.',
        data: {
          efectivo_real_reportado: efectivoReal,
          total_distribuido: totalDistribuido,
          diferencia: roundMoney(efectivoReal - totalDistribuido)
        }
      });
    }

    for (const item of distribucion) {
      const descripcion = `Traslado Tesoreria Arqueo #${arqueoId} -> ${item.cuenta_codigo}`;

      await insertarMovimientoContable(connection, {
        cuenta_codigo: item.cuenta_codigo,
        tipo_movimiento: 'DEBITO',
        monto: item.monto,
        referencia_tabla: 'arqueos_caja',
        referencia_id: arqueoId,
        descripcion,
        arqueo_id: arqueoId,
        fecha: getCurrentLocalDateTime()
      });

      await insertarMovimientoContable(connection, {
        cuenta_codigo: '110505',
        tipo_movimiento: 'CREDITO',
        monto: item.monto,
        referencia_tabla: 'arqueos_caja',
        referencia_id: arqueoId,
        descripcion,
        arqueo_id: arqueoId,
        fecha: getCurrentLocalDateTime()
      });
    }

    const totalBancos = roundMoney(
      distribucion
        .filter((item) => item.cuenta_codigo === '111005')
        .reduce((sum, item) => sum + item.monto, 0)
    );
    const totalCajaMenor = roundMoney(
      distribucion
        .filter((item) => item.cuenta_codigo === '110510')
        .reduce((sum, item) => sum + item.monto, 0)
    );

    await connection.query(
      `UPDATE arqueos_caja
       SET estado = 'Trasladado',
           traslados_bancos = ?,
           traslados_caja_menor = ?,
           fecha_cierre = COALESCE(fecha_cierre, ?)
       WHERE id = ?`,
      [totalBancos, totalCajaMenor, getCurrentLocalDateTime(), arqueoId]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Traslado de tesorería registrado correctamente.',
      data: {
        arqueo_id: arqueoId,
        estado: 'PROCESADO_TESORERIA',
        efectivo_real_reportado: efectivoReal,
        total_distribuido: totalDistribuido,
        distribucion
      }
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // No-op
    }
    console.error('Error al trasladar arqueo en tesoreria:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'No se pudo trasladar el arqueo a tesoreria.'
    });
  } finally {
    connection.release();
  }
};

export const registrarPagoTesoreria = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const registroId = Number(req.body?.registro_id || 0);
    const tipoRegistro = String(req.body?.tipo_registro || '').trim().toLowerCase();
    const montoObjetivoRequest = req.body?.monto_objetivo;
    const asignacionesRaw = normalizeAsignaciones(req.body?.asignaciones);

    console.log('[registrarPagoTesoreria] Inicio', {
      registro_id: registroId,
      tipo_registro: tipoRegistro,
      monto_objetivo: montoObjetivoRequest,
      asignaciones_raw: asignacionesRaw
    });

    if (!registroId) {
      return res.status(400).json({ success: false, message: 'registro_id es requerido.' });
    }

    if (!['gasto', 'costo'].includes(tipoRegistro)) {
      return res.status(400).json({ success: false, message: "tipo_registro debe ser 'gasto' o 'costo'." });
    }

    const asignaciones = asignacionesRaw
      .filter((item) => CUENTAS_SET.has(item.cuenta_codigo))
      .map((item) => ({
        cuenta_codigo: item.cuenta_codigo,
        monto: roundMoney(item.monto)
      }))
      .filter((item) => item.monto > 0);

    console.log('[registrarPagoTesoreria] Asignaciones normalizadas:', asignaciones);

    if (!asignaciones.length) {
      return res.status(400).json({ success: false, message: 'Debe asignar al menos un monto mayor a 0.' });
    }

    await connection.beginTransaction();
    console.log('[registrarPagoTesoreria] Transacción iniciada');

    const tableName = tipoRegistro === 'gasto' ? 'gastos' : 'costos';
    const referenciaTabla = tableName;

    const selectSql = tipoRegistro === 'gasto'
      ? `SELECT id, total_gasto AS monto_registro, grupo_puc, estado, fuente_pago
         FROM gastos
         WHERE id = ?
         LIMIT 1
         FOR UPDATE`
      : `SELECT id, total_costo AS monto_registro, clase_puc, estado, fuente_pago
         FROM costos
         WHERE id = ?
         LIMIT 1
         FOR UPDATE`;

    logSqlGastoPago('SELECT registro', selectSql, [registroId]);
    const [rows] = await connection.query(selectSql, [registroId]);
    logSqlGastoPago('SELECT registro', selectSql, [registroId], rows);

    const registro = rows?.[0];
    if (!registro) {
      console.log('[registrarPagoTesoreria] Registro no encontrado, rollback');
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: `${tipoRegistro === 'gasto' ? 'Gasto' : 'Costo'} no encontrado.`
      });
    }

    const estadoPrevio = String(registro.estado || '').toUpperCase();
    console.log('[registrarPagoTesoreria] Registro bloqueado:', {
      id: registro.id,
      estado_previo: estadoPrevio,
      fuente_pago_previo: registro.fuente_pago,
      monto_registro: registro.monto_registro
    });

    if (estadoPrevio === 'ANULADO') {
      console.log('[registrarPagoTesoreria] Rechazado: ANULADO, rollback');
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'El registro está anulado y no puede pagarse.'
      });
    }

    if (estadoPrevio === 'PAGADO') {
      console.log('[registrarPagoTesoreria] Rechazado: ya PAGADO, rollback');
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'El registro ya está pagado.'
      });
    }

    const montoRegistro = roundMoney(registro.monto_registro);
    const montoObjetivo = roundMoney(montoObjetivoRequest ?? montoRegistro);
    const totalAsignado = roundMoney(asignaciones.reduce((acc, item) => acc + item.monto, 0));

    if (Math.abs(montoObjetivo - montoRegistro) > 0.009) {
      console.log('[registrarPagoTesoreria] Rechazado: monto_objetivo != monto_registro, rollback', {
        montoObjetivo,
        montoRegistro
      });
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'El monto_objetivo no coincide con el valor del registro en base de datos.'
      });
    }

    if (Math.abs(totalAsignado - montoObjetivo) > 0.009) {
      console.log('[registrarPagoTesoreria] Rechazado: total asignado != monto objetivo, rollback', {
        totalAsignado,
        montoObjetivo
      });
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'La suma asignada debe ser exactamente igual al monto objetivo.'
      });
    }

    const saldosSql = `SELECT mc.cuenta_codigo,
      COALESCE(SUM(CASE WHEN mc.tipo_movimiento = 'Debito' THEN mc.monto ELSE -mc.monto END), 0) AS saldo_disponible
     FROM movimientos_contables mc
     WHERE mc.cuenta_codigo IN ('110505', '110510', '110515', '111005')
     GROUP BY mc.cuenta_codigo`;
    logSqlGastoPago('SELECT saldos', saldosSql, []);
    const saldos = await getSaldosByConnection(connection);
    logSqlGastoPago('SELECT saldos', saldosSql, [], saldos);
    const saldosByCuenta = Object.fromEntries(saldos.map((item) => [item.cuenta_codigo, roundMoney(item.saldo_disponible)]));

    for (const asignacion of asignaciones) {
      const saldoDisponible = roundMoney(saldosByCuenta[asignacion.cuenta_codigo] || 0);
      if (asignacion.monto - saldoDisponible > 0.009) {
        console.log('[registrarPagoTesoreria] Rechazado: saldo insuficiente, rollback', {
          cuenta: asignacion.cuenta_codigo,
          monto: asignacion.monto,
          saldoDisponible
        });
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Saldo insuficiente en cuenta ${asignacion.cuenta_codigo}. Disponible: ${saldoDisponible}`
        });
      }
    }

    const cuentasUsadas = asignaciones.map((item) => item.cuenta_codigo);
    const fuentePago = cuentasUsadas.length === 1
      ? (CUENTA_META[cuentasUsadas[0]]?.fuente_pago || 'CAJA_GENERAL')
      : 'MIXTO';

    const cuentaDestino = tipoRegistro === 'gasto'
      ? mapGrupoPucToCuentaGasto(registro.grupo_puc)
      : mapClasePucToCuentaCosto(registro.clase_puc);

    console.log('[registrarPagoTesoreria] Datos calculados para pago:', {
      tableName,
      fuentePago,
      cuentaDestino,
      registroId
    });

    const updateSql = `UPDATE ${tableName}
       SET fuente_pago = ?, estado = 'PAGADO'
       WHERE id = ?`;
    const updateParams = [fuentePago, registroId];
    logSqlGastoPago('UPDATE gasto/costo', updateSql, updateParams);
    const [updateResult] = await connection.query(updateSql, updateParams);
    logSqlGastoPago('UPDATE gasto/costo', updateSql, updateParams, {
      affectedRows: updateResult?.affectedRows,
      changedRows: updateResult?.changedRows,
      warningStatus: updateResult?.warningStatus
    });

    for (const asignacion of asignaciones) {
      const descripcionBase = `Pago ${tipoRegistro} #${registroId} desde cuenta ${asignacion.cuenta_codigo}`;

      console.log('[registrarPagoTesoreria] Insertando movimiento CREDITO', {
        cuenta_codigo: asignacion.cuenta_codigo,
        monto: asignacion.monto,
        referencia_tabla: referenciaTabla,
        referencia_id: registroId
      });
      await insertarMovimientoContable(connection, {
        cuenta_codigo: asignacion.cuenta_codigo,
        tipo_movimiento: 'CREDITO',
        monto: asignacion.monto,
        referencia_tabla: referenciaTabla,
        referencia_id: registroId,
        descripcion: descripcionBase,
        arqueo_id: null
      });

      console.log('[registrarPagoTesoreria] Insertando movimiento DEBITO', {
        cuenta_codigo: cuentaDestino,
        monto: asignacion.monto,
        referencia_tabla: referenciaTabla,
        referencia_id: registroId
      });
      await insertarMovimientoContable(connection, {
        cuenta_codigo: cuentaDestino,
        tipo_movimiento: 'DEBITO',
        monto: asignacion.monto,
        referencia_tabla: referenciaTabla,
        referencia_id: registroId,
        descripcion: descripcionBase,
        arqueo_id: null
      });
    }

    console.log('[registrarPagoTesoreria] Ejecutando COMMIT');
    await connection.commit();

    const verifySql = tipoRegistro === 'gasto'
      ? 'SELECT id, estado, fuente_pago, total_gasto FROM gastos WHERE id = ? LIMIT 1'
      : 'SELECT id, estado, fuente_pago, total_costo FROM costos WHERE id = ? LIMIT 1';
    logSqlGastoPago('VERIFY post-commit', verifySql, [registroId]);
    const [verifyRows] = await db.query(verifySql, [registroId]);
    logSqlGastoPago('VERIFY post-commit', verifySql, [registroId], verifyRows?.[0] || null);
    console.log('[registrarPagoTesoreria] Pago completado exitosamente');

    return res.json({
      success: true,
      message: 'Pago registrado correctamente en tesoreria.',
      data: {
        registro_id: registroId,
        tipo_registro: tipoRegistro,
        fuente_pago: fuentePago,
        estado: 'PAGADO',
        monto_objetivo: montoObjetivo,
        total_asignado: totalAsignado,
        asignaciones
      }
    });
  } catch (error) {
    try {
      console.log('[registrarPagoTesoreria] Error capturado, ejecutando ROLLBACK');
      await connection.rollback();
    } catch {
      // No-op
    }

    console.error('[registrarPagoTesoreria] Error al registrar pago en tesoreria:', error);
    return res.status(500).json({
      success: false,
      message: 'No se pudo registrar el pago en tesoreria.'
    });
  } finally {
    connection.release();
  }
};

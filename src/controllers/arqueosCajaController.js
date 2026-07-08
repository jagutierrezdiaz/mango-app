import db from '../config/db.js';
import { registrarAccion } from '../helpers/auditoria.helper.js';
import contabilidadService from '../services/contabilidadService.js';
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundMoney = (value) => Number(toNumber(value).toFixed(2));

const toDateOnly = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/^\d{4}-\d{2}-\d{2}$/);
  return match ? raw : '';
};

const toDateTime = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const normalized = raw.replace('T', ' ');
  const match = normalized.match(/^\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2}(?::\d{2})?)?$/);
  if (!match) return null;
  return normalized.length === 16 ? `${normalized}:00` : normalized;
};

const getTodayDateOnly = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const buildPersonalPhotoUrl = (req, value) => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (String(value).startsWith('/uploads/')) {
    return `${req.protocol}://${req.get('host')}${value}`;
  }
  return `${req.protocol}://${req.get('host')}/uploads/personal/${value}`;
};

const getCurrentLocalDateTime = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 19).replace('T', ' ');
};

const getLastClosedArqueo = async (connection, beforeDateTime = null) => {
  const params = [];
  let beforeClause = '';

  if (beforeDateTime) {
    beforeClause = ' AND ac.fecha_cierre < ?';
    params.push(beforeDateTime);
  }

  const [rows] = await connection.query(
    `SELECT ac.id, ac.fecha_cierre, COALESCE(ac.saldo_real, 0) AS base_inicial
     FROM arqueos_caja ac
     WHERE UPPER(COALESCE(ac.estado, '')) IN ('CERRADO', 'PROCESADO_TESORERIA')
       AND ac.fecha_cierre IS NOT NULL${beforeClause}
     ORDER BY ac.fecha_cierre DESC, ac.id DESC
     LIMIT 1`,
    params
  );

  return rows?.[0] || null;
};

const getPendingVentasMetrics = async (connection, fechaInicio = null, fechaFin = null) => {
  const filters = ["iv.estado = 'Generada'"];
  const params = [];
  if (fechaInicio) {
    filters.push('iv.fecha_venta >= ?');
    params.push(fechaInicio);
  }
  if (fechaFin) {
    filters.push('iv.fecha_venta <= ?');
    params.push(fechaFin);
  }
  const [ventasRows] = await connection.query(
    `SELECT
       COALESCE(SUM(iv.monto_efectivo), 0) AS efectivo_recibido,
       COALESCE(SUM(iv.monto_digital), 0) AS digital_recibido,
       MIN(iv.fecha_venta) AS fecha_apertura,
       MAX(iv.fecha_venta) AS fecha_cierre,
       COALESCE(SUM(1), 0) AS comandas_aprobadas,
       0 AS comandas_anuladas
     FROM ingresos_ventas iv
     WHERE ${filters.join(' AND ')}`,
    params
  );
  const ventasRow = ventasRows?.[0] || {};
  return {
    fecha_apertura: ventasRow.fecha_apertura || null,
    fecha_cierre: ventasRow.fecha_cierre || null,
    efectivo_recibido: roundMoney(ventasRow.efectivo_recibido || 0),
    digital_recibido: roundMoney(ventasRow.digital_recibido || 0),
    comandas_aprobadas: Number(ventasRow.comandas_aprobadas || 0),
    comandas_anuladas: Number(ventasRow.comandas_anuladas || 0)
  };
};

const getPendingPropinasMetrics = async (connection, fechaInicio = null, fechaFin = null) => {
  const filters = ["iv.estado = 'Generada'"];
  const params = [];
  if (fechaInicio) {
    filters.push('iv.fecha_venta >= ?');
    params.push(fechaInicio);
  }
  if (fechaFin) {
    filters.push('iv.fecha_venta <= ?');
    params.push(fechaFin);
  }
  const [rows] = await connection.query(
    `SELECT COALESCE(SUM(iv.aporte_servicio), 0) AS total_propinas
     FROM ingresos_ventas iv
     WHERE ${filters.join(' AND ')}`,
    params
  );
  return {
    total_propinas: roundMoney(rows?.[0]?.total_propinas || 0)
  };
};

const getEgresosMetricsByRange = async (connection, fechaInicio = null, fechaFin = null) => {
  const egresosFilters = [
    "mc.cuenta_codigo = '110505'",
    "mc.tipo_movimiento = 'Credito'",
    "mc.referencia_tabla IN ('gastos', 'costos')"
  ];
  const egresosParams = [];

  if (fechaInicio) {
    egresosFilters.push('COALESCE(g.fecha_gasto, c.fecha_costo) >= ?');
    egresosParams.push(fechaInicio);
  }

  if (fechaFin) {
    egresosFilters.push('COALESCE(g.fecha_gasto, c.fecha_costo) <= ?');
    egresosParams.push(fechaFin);
  }

  const [egresosRows] = await connection.query(
    `SELECT COALESCE(SUM(mc.monto), 0) AS total_egresos
     FROM movimientos_contables mc
     LEFT JOIN gastos g
       ON mc.referencia_tabla = 'gastos'
      AND mc.referencia_id = g.id
     LEFT JOIN costos c
       ON mc.referencia_tabla = 'costos'
      AND mc.referencia_id = c.id
     WHERE ${egresosFilters.join(' AND ')}`,
    egresosParams
  );

  const egresosRow = egresosRows?.[0] || {};

  return {
    total_egresos: roundMoney(egresosRow.total_egresos || 0)
  };
};

const allowedTipoTraslado = ['BANCO', 'CAJA_MENOR'];

const normalizeTipoTraslado = (value) => String(value || '').trim().toUpperCase();

const mapTrasladoRow = (row) => ({
  id: Number(row.id),
  arqueo_id: row.arqueo_id == null ? null : Number(row.arqueo_id),
  monto: roundMoney(row.monto),
  tipo_traslado: row.tipo_traslado,
  fecha: row.fecha,
  descripcion: row.descripcion || ''
});

const sumTraslados = (rows = []) => rows.reduce((acc, item) => acc + roundMoney(item.monto), 0);

const syncTotalesArqueoFromTraslados = async (connection, arqueoId) => {
  const [sumRows] = await connection.query(
    `SELECT
       COALESCE(SUM(CASE WHEN tipo_traslado = 'BANCO' THEN monto ELSE 0 END), 0) AS traslados_bancos,
       COALESCE(SUM(CASE WHEN tipo_traslado = 'CAJA_MENOR' THEN monto ELSE 0 END), 0) AS traslados_caja_menor,
       COALESCE(SUM(monto), 0) AS total_retiros
     FROM traslados_tesoreria
     WHERE arqueo_id = ?`,
    [Number(arqueoId)]
  );

  const trasladosBancos = roundMoney(sumRows?.[0]?.traslados_bancos || 0);
  const trasladosCajaMenor = roundMoney(sumRows?.[0]?.traslados_caja_menor || 0);
  const totalRetiros = roundMoney(sumRows?.[0]?.total_retiros || 0);

  await connection.query(
    `UPDATE arqueos_caja
     SET traslados_bancos = ?,
         traslados_caja_menor = ?,
         saldo_esperado = ROUND(COALESCE(saldo_inicial, 0) + COALESCE(ventas_efectivo, 0) - COALESCE(gastos_efectivo, 0) - COALESCE(traslados_bancos, 0) - COALESCE(traslados_caja_menor, 0), 2)
     WHERE id = ?`,
    [trasladosBancos, trasladosCajaMenor, Number(arqueoId)]
  );

  return totalRetiros;
};

const mapArqueoRow = (req, row) => {
  const totalVentasEfectivo = roundMoney(row.total_ventas_efectivo ?? row.ventas_efectivo);
  const totalVentasDigital = roundMoney(row.total_ventas_digital ?? row.ventas_digital);
  const totalRetiros = roundMoney((row.total_retiros ?? 0));

  return {
    ...row,
    fecha_arqueo: row.fecha_arqueo || row.fecha_apertura,
    base_inicial: roundMoney(row.base_inicial ?? row.saldo_inicial),
    efectivo_recibido: roundMoney(row.efectivo_recibido ?? row.ventas_efectivo ?? totalVentasEfectivo),
    digital_recibido: roundMoney(row.digital_recibido ?? row.ventas_digital ?? totalVentasDigital),
    total_retiros: totalRetiros,
    total_egresos: roundMoney(row.total_egresos ?? row.gastos_efectivo ?? 0),
    efectivo_verificado: roundMoney(row.efectivo_verificado ?? row.saldo_real ?? 0),
    digital_verificado: roundMoney(row.digital_verificado ?? 0),
    diferencia_cuadre: roundMoney(row.diferencia_cuadre ?? row.diferencia ?? 0),
    total_ventas_efectivo: totalVentasEfectivo,
    total_ventas_digital: totalVentasDigital,
    base_final: roundMoney(row.base_final ?? row.saldo_esperado ?? 0),
    comandas_aprobadas: Number(row.comandas_aprobadas || 0),
    comandas_anuladas: Number(row.comandas_anuladas || 0),
    total_ventas: roundMoney(totalVentasEfectivo + totalVentasDigital),
    personal_nombre: `${row.nombres || ''} ${row.apellidos || ''}`.trim(),
    personal_url_foto: buildPersonalPhotoUrl(req, row.url_foto)
  };
};

export const getArqueosByFecha = async (req, res) => {
  try {
    const fecha = toDateOnly(req.query.fecha);
    const fechaInicio = toDateOnly(req.query.fecha_inicio);
    const fechaFinal = toDateOnly(req.query.fecha_final);

    const filters = [];
    const params = [];

    if (fecha) {
      filters.push('DATE(ac.fecha_apertura) = ?');
      params.push(fecha);
    } else {
      if (fechaInicio) {
        filters.push('DATE(ac.fecha_apertura) >= ?');
        params.push(fechaInicio);
      }

      if (fechaFinal) {
        filters.push('DATE(ac.fecha_apertura) <= ?');
        params.push(fechaFinal);
      }
    }

    if (!filters.length) {
      return res.status(400).json({
        success: false,
        message: 'Debe enviar fecha (YYYY-MM-DD) o fecha_inicio / fecha_final.'
      });
    }

    const whereClause = `WHERE ${filters.join(' AND ')}`;

    const [rows] = await db.query(
      `SELECT
        ac.id,
        ac.usuario_id AS persona_id,
        ac.sucursal_id,
        ac.fecha_apertura AS fecha_arqueo,
        ac.saldo_inicial AS base_inicial,
        ac.ventas_efectivo AS efectivo_recibido,
        ac.ventas_digital AS digital_recibido,
        ac.gastos_efectivo AS egresos_registrados,
        ac.aporte_efectivo,
        ac.aporte_digital,
        ac.saldo_esperado AS efectivo_esperado,
        ac.saldo_real AS efectivo_real,
        ac.diferencia,
        CASE WHEN ABS(COALESCE(ac.diferencia, 0)) > 0.009 THEN 'SI' ELSE 'NO' END AS hubo_descuadre,
        0 AS comandas_aprobadas,
        0 AS comandas_anuladas,
        ac.estado,
        ac.observaciones,
        p.nombres,
        p.apellidos,
        p.url_foto
      FROM arqueos_caja ac
      INNER JOIN personal p ON p.id = ac.usuario_id
      ${whereClause}
      ORDER BY ac.fecha_apertura DESC, ac.id DESC`,
      params
    );

    const data = await Promise.all(rows.map(async (row) => {
      const mapped = mapArqueoRow(req, row);

      if (String(row.estado || '').toUpperCase() !== 'ABIERTO') {
        return mapped;
      }

      const [ventasMetrics, egresosMetrics] = await Promise.all([
        getPendingVentasMetrics(db),
        getEgresosMetricsByRange(db, row.fecha_apertura, row.fecha_cierre || getCurrentLocalDateTime())
      ]);

      const totalRetiros = roundMoney(mapped.total_retiros);
      const baseInicial = roundMoney(mapped.base_inicial);
      const baseFinal = roundMoney(baseInicial + ventasMetrics.efectivo_recibido - egresosMetrics.total_egresos - totalRetiros);

      return {
        ...mapped,
        efectivo_recibido: ventasMetrics.efectivo_recibido,
        digital_recibido: ventasMetrics.digital_recibido,
        total_ventas_efectivo: ventasMetrics.efectivo_recibido,
        total_ventas_digital: ventasMetrics.digital_recibido,
        total_egresos: egresosMetrics.total_egresos,
        comandas_aprobadas: ventasMetrics.comandas_aprobadas,
        comandas_anuladas: ventasMetrics.comandas_anuladas,
        base_final: baseFinal,
        total_ventas: roundMoney(ventasMetrics.efectivo_recibido + ventasMetrics.digital_recibido)
      };
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error en getArqueosByFecha:', error);
    return res.status(500).json({ success: false, message: 'Error al consultar arqueos de caja.' });
  }
};

// ensayo - prueba
export const getArqueoPreload = async (req, res) => {
  const { fecha } = req.query;
  const connection = await db.getConnection();

  try {
    if (!fecha) {
      return res.status(400).json({
        success: false,
        message: 'Fecha requerida'
      });
    }

    console.log("------------------------------------------------");
    console.log("🔍 DEBUG PRELOAD - Fecha recibida:", fecha);

    // 1. Obtener saldo inicial desde parámetros
    let saldoInicial = 0;

    try {
      const [paramRows] = await connection.query(
        `SELECT valor_parametro
         FROM parametros_sistema
         WHERE nombre_parametro = 'base_caja_menor'
         LIMIT 1`
      );

      saldoInicial = Number(paramRows?.[0]?.valor_parametro || 0);

    } catch (err) {
      console.error('Error al leer parametros_sistema:', err);
      saldoInicial = 0;
    }

    // =====================================================
    // VENTAS TRANSFERENCIA
    // =====================================================
    const sql_1 = `
      SELECT
        COALESCE(SUM(total_venta),0) AS digital,
        COALESCE(SUM(aporte_servicio),0) AS propinas
      FROM ingresos_ventas
      WHERE DATE(fecha_venta) = ?
        AND estado = 'Generada'
        AND metodo_pago = 'Transferencia'
        AND arqueo_id IS NULL
    `;

    // =====================================================
    // VENTAS EFECTIVO
    // =====================================================
    const sql_2 = `
      SELECT
        COALESCE(SUM(total_venta),0) AS efectivo,
        COALESCE(SUM(aporte_servicio),0) AS propinas
      FROM ingresos_ventas
      WHERE DATE(fecha_venta) = ?
        AND estado = 'Generada'
        AND metodo_pago = 'Efectivo'
        AND arqueo_id IS NULL
    `;

    // =====================================================
    // VENTAS MIXTAS (PRORRATEADAS)
    // =====================================================
    const sql_3 = `
      SELECT

        COALESCE(
          SUM(
            (monto_efectivo / NULLIF(total_pagado,0))
            * total_venta
          ),
          0
        ) AS efectivo,

        COALESCE(
          SUM(
            (monto_digital / NULLIF(total_pagado,0))
            * total_venta
          ),
          0
        ) AS digital,

        COALESCE(
          SUM(
            (monto_efectivo / NULLIF(total_pagado,0))
            * aporte_servicio
          ),
          0
        ) AS propinas_efectivo,

        COALESCE(
          SUM(
            (monto_digital / NULLIF(total_pagado,0))
            * aporte_servicio
          ),
          0
        ) AS propinas_digital

      FROM ingresos_ventas

      WHERE DATE(fecha_venta) = ?
        AND estado = 'Generada'
        AND metodo_pago = 'Mixto'
        AND arqueo_id IS NULL
    `;

    const [ventas_transferencia] = await connection.query(sql_1, [fecha]);
    const [ventas_efectivo] = await connection.query(sql_2, [fecha]);
    const [ventas_mixto] = await connection.query(sql_3, [fecha]);

    // =====================================================
    // GASTOS DEL DÍA
    // =====================================================
    const sqlGastos = `
      SELECT
        COALESCE(SUM(mc.monto), 0) AS total_egresos
      FROM movimientos_contables mc

      LEFT JOIN gastos g
        ON mc.referencia_tabla = 'gastos'
       AND mc.referencia_id = g.id

      LEFT JOIN costos c
        ON mc.referencia_tabla = 'costos'
       AND mc.referencia_id = c.id

      WHERE mc.cuenta_codigo = '110505'
        AND mc.tipo_movimiento = 'Credito'
        AND mc.referencia_tabla IN ('gastos', 'costos')
        AND DATE(COALESCE(g.fecha_gasto, c.fecha_costo)) = ?
    `;

    const [gastosRow] = await connection.query(sqlGastos, [fecha]);

    const totalEgresos = Number(gastosRow[0]?.total_egresos || 0);

    // =====================================================
    // TOTALES EFECTIVO / DIGITAL
    // =====================================================

    const efectivoSistema =
      Number(ventas_efectivo[0]?.efectivo || 0) +
      Number(ventas_mixto[0]?.efectivo || 0);

    const digitalSistema =
      Number(ventas_transferencia[0]?.digital || 0) +
      Number(ventas_mixto[0]?.digital || 0);

    const propinas_efectivo =
      Number(ventas_efectivo[0]?.propinas || 0) +
      Number(ventas_mixto[0]?.propinas_efectivo || 0);

    const propinas_transferencia =
      Number(ventas_transferencia[0]?.propinas || 0) +
      Number(ventas_mixto[0]?.propinas_digital || 0);

    // =====================================================
    // DEBUG
    // =====================================================

    console.log("=== VENTAS EFECTIVO ===");
    console.log(ventas_efectivo[0]);

    console.log("=== VENTAS TRANSFERENCIA ===");
    console.log(ventas_transferencia[0]);

    console.log("=== VENTAS MIXTAS ===");
    console.log(ventas_mixto[0]);

    console.log("=== TOTALES ===");
    console.log("efectivoSistema:", efectivoSistema);
    console.log("digitalSistema:", digitalSistema);
    console.log("propinas_efectivo:", propinas_efectivo);
    console.log("propinas_transferencia:", propinas_transferencia);
    console.log("totalEgresos:", totalEgresos);

    // =====================================================
    // SALDO ESPERADO
    // =====================================================

    const saldo_esperado = Math.round(
      (
        saldoInicial +
        efectivoSistema +
        digitalSistema +
        propinas_efectivo +
        propinas_transferencia
      ) - totalEgresos
    );

    const data = {
      base_inicial: saldoInicial,
      efectivo_sistema: efectivoSistema,
      digital_sistema: digitalSistema,
      propinas_efectivo,
      propinas_transferencia,
      gastos: totalEgresos,
      saldo_esperado
    };

    console.log("📦 DATA FINAL A ENVIAR AL FRONT:", data);
    console.log("------------------------------------------------");

    return res.json({
      success: true,
      data
    });

  } catch (error) {

    console.error('❌ Error en getArqueoPreload:', error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  } finally {
    connection.release();
  }
};

// Este debe ser el ÚNICO getArqueoPreload en tu arqueosCajaController.js
/*
export const getArqueoPreload = async (req, res) => {
  const { fecha } = req.query;
  const connection = await db.getConnection();

  try {
    if (!fecha) return res.status(400).json({ success: false, message: 'Fecha requerida' });

    console.log("------------------------------------------------");
    console.log("🔍 DEBUG PRELOAD - Fecha recibida:", fecha);

    // 1. Saldo Inicial
    const [last] = await connection.query(
      'SELECT saldo_real FROM arqueos_caja WHERE sucursal_id = 1 ORDER BY fecha_cierre DESC LIMIT 1'
    );

    // Obtener parametro 'base_caja_menor' directamente desde la DB
    let saldoInicial = 0;
    try {
      const [paramRows] = await connection.query(
        `SELECT valor_parametro FROM patio_bohemio.parametros_sistema WHERE nombre_parametro = 'base_caja_menor' LIMIT 1`
      );
      saldoInicial = Number(paramRows?.[0]?.valor_parametro || 0);
    } catch (err) {
      console.error('Error al leer parametros de tesoreria:', err);
      saldoInicial = 0;
    }

    const sql_1 = `
      SELECT 
        SUM(total_venta) AS digital,
        SUM(aporte_servicio) AS propinas
      FROM ingresos_ventas 
      WHERE DATE(fecha_venta) = ? 
        AND estado = 'Generada' 
        AND metodo_pago = 'Transferencia'
        AND arqueo_id IS NULL
    `;

    const sql_2 = `

      SELECT 
        SUM(total_venta) AS efectivo,
        SUM(aporte_servicio) AS propinas
      FROM ingresos_ventas 
      WHERE DATE(fecha_venta) = ? 
        AND estado = 'Generada' 
        AND metodo_pago = 'Efectivo'
        AND arqueo_id IS NULL
    `;

    const [ventas_transferencia] = await connection.query(sql_1, [fecha]);
    const [ventas_efectivo] = await connection.query(sql_2, [fecha]);

    // 3. Gastos del día
    const sqlGastos = `
      SELECT COALESCE(SUM(mc.monto), 0) AS total_egresos
      FROM movimientos_contables mc
      LEFT JOIN gastos g ON mc.referencia_tabla = 'gastos' AND mc.referencia_id = g.id
      LEFT JOIN costos c ON mc.referencia_tabla = 'costos' AND mc.referencia_id = c.id
      WHERE mc.cuenta_codigo = '110505'
        AND mc.tipo_movimiento = 'Credito'
        AND mc.referencia_tabla IN ('gastos', 'costos')
        AND DATE(COALESCE(g.fecha_gasto, c.fecha_costo)) = ?`;

    console.log("📡 SQL MOVIMIENTOS CONTABLES:", sqlGastos);
    console.log("🔢 PARÁMETROS MOVIMIENTOS CONTABLES:", [fecha]);

    const [gastosRow] = await connection.query(sqlGastos, [fecha]);

    console.log(gastosRow[0]);
    console.log(gastosRow[1]);

    const totalEgresos = Number(gastosRow[0].total_egresos || 0);
    const efectivoSistema = Number(ventas_efectivo[0].efectivo || 0);
    const digitalSistema = Number(ventas_transferencia[0].digital || 0);
    const propinas_efectivo = Number(ventas_efectivo[0].propinas || 0);
    const propinas_transferencia = Number(ventas_transferencia[0].propinas || 0);

    console.log("propinas_efectivo:", propinas_efectivo);
    console.log("propinas_transferencia:", propinas_transferencia);

    const saldo_esperado = (saldoInicial + efectivoSistema + digitalSistema + propinas_efectivo + propinas_transferencia) - totalEgresos;

    const data = {
      base_inicial: saldoInicial,
      efectivo_sistema: efectivoSistema,
      digital_sistema: digitalSistema,
      propinas_efectivo: propinas_efectivo,
      propinas_transferencia: propinas_transferencia,
      gastos: totalEgresos,
      saldo_esperado: saldo_esperado
    };

    console.log("📦 DATA FINAL A ENVIAR AL FRONT:", data);
    console.log("------------------------------------------------");

    res.json({ success: true, data });

  } catch (error) {
    console.error('❌ Error en getArqueoPreload:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
};
*/

/**
 * Crea y cierra un arqueo de caja de forma definitiva.
 * Se ejecuta al presionar "Finalizar y Cerrar Caja" en el frontend.
 */
export const createArqueoCaja = async (req, res) => {
  console.log("🚀 Iniciando proceso de cierre de arqueo...");
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Extraer datos del body (enviados desde CrearArqueo.vue)
    const {
      fecha,              // Fecha seleccionada en el calendario
      usuario_id,         // ID del usuario que cierra
      efectivo_verificado,// Lo que el cajero contó físicamente
      observaciones,      // Notas del cierre
      base_inicial,       // Saldo inicial (traído del preload)
      efectivo_sistema,   // Ventas efectivo (traído del preload)
      digital_sistema,    // Ventas digital (traído del preload)
      propinas_efectivo,
      propinas_transferencia,
      gastos,             // Gastos del periodo (traído del preload)
      saldo_esperado,     // Cálculo sugerido por el sistema
      aporte_efectivo,    // Aporte efectivo (traído del preload)
      aporte_digital      // Aporte digital (traído del preload)
    } = req.body;

    // Validación de seguridad
    if (!fecha || !usuario_id) {
      throw new Error("Faltan datos críticos: Fecha o Usuario ID no definidos.");
    }

    // 2. Calcular la diferencia final
    const diferencia = roundMoney(Number(efectivo_verificado) - Number(saldo_esperado));

    // 3. Definir rangos de tiempo para la vinculación de ventas
    const fechaInicio = `${fecha} 00:00:00`;
    const fechaSiguiente = `${fecha} 23:59:59`; // O usar DATE_ADD en SQL

    const caja_general = Number(efectivo_verificado) - Number(base_inicial) || 0;

    const [result] = await connection.query(
      `INSERT INTO arqueos_caja (
      usuario_id, 
      sucursal_id, 
      fecha_apertura, 
      fecha_cierre,
      saldo_inicial, 
      ventas_efectivo, 
      ventas_digital, 
      gastos_efectivo,
      aporte_efectivo,
      aporte_digital,
      saldo_esperado, 
      saldo_real, 
      diferencia, 
      estado, 
      observaciones,
      traslados_caja_general
    ) VALUES (?, 1, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Cerrado', ?, ?)`,
      [
        usuario_id,
        fechaInicio,
        base_inicial,
        efectivo_sistema, //ventas_efectivo
        digital_sistema, //ventas_digital
        gastos, //gastos_efectivo
        propinas_efectivo,   //aporte_efectivo 👈 nuevo
        propinas_transferencia,    //aporte_digital 👈 nuevo
        saldo_esperado, //saldo_esperado
        efectivo_verificado, //saldo_real
        diferencia, //diferencia
        observaciones || '',
        caja_general
      ]
    );


    const arqueoId = result.insertId;
    if (!arqueoId) throw new Error("La base de datos no generó un ID de Arqueo.");

    // 5. VINCULAR VENTAS: Marcar ventas con el ID de este arqueo
    // Solo vinculamos ventas que: correspondan a la fecha, no tengan arqueo previo y estén 'Generada'
    await connection.query(
      `UPDATE ingresos_ventas 
       SET arqueo_id = ? 
       WHERE fecha_venta >= ? AND fecha_venta <= ? 
       AND arqueo_id IS NULL
       AND estado = 'Generada'`,
      [arqueoId, fechaInicio, fechaSiguiente]
    );


    // 6. LÓGICA CONTABLE COMPLETA
    const descripcionGeneral = `Arqueo #${arqueoId} - Fecha: ${fecha}`;

    // --- D. AJUSTE POR DIFERENCIA (Sobrantes o Faltantes) ---
    if (diferencia < 0) {
      const montoFaltante = Math.abs(diferencia);
      await contabilidadService.insertarMovimiento(connection, {
        cuenta: '519530', // Gastos / Faltantes
        tipo_movimiento: 'DEBITO',
        monto: montoFaltante,
        descripcion: `Ajuste Faltante - ${descripcionGeneral}`,
        referencia_tabla: 'arqueos_caja',
        referencia_id: arqueoId
      });

      await contabilidadService.insertarMovimiento(connection, {
        cuenta: '110505', // Caja Punto de Venta 
        tipo_movimiento: 'CREDITO',
        monto: montoFaltante,
        descripcion: `Ajuste Faltante - ${descripcionGeneral}`,
        referencia_tabla: 'arqueos_caja',
        referencia_id: arqueoId
      });

    } else if (diferencia > 0) {
      await contabilidadService.insertarMovimiento(connection, {
        cuenta: '110505', // Caja Punto de Venta
        tipo_movimiento: 'DEBITO',
        monto: diferencia,
        descripcion: `Ajuste Sobrante - ${descripcionGeneral}`,
        referencia_tabla: 'arqueos_caja',
        referencia_id: arqueoId
      });

      await contabilidadService.insertarMovimiento(connection, {
        cuenta: '429550', // Otros Ingresos / Sobrantes
        tipo_movimiento: 'CREDITO',
        monto: diferencia,
        descripcion: `Ajuste Sobrante - ${descripcionGeneral}`,
        referencia_tabla: 'arqueos_caja',
        referencia_id: arqueoId
      });
    }

    // 7. Commit de la transacción
    await connection.commit();
    console.log(`✅ Arqueo #${arqueoId} cerrado y contabilizado exitosamente.`);

    // Recuperar el arqueo recién insertado junto con los datos del personal
    const [createdRows] = await connection.query(
      `SELECT
         ac.id,
         ac.usuario_id,
         ac.sucursal_id,
         ac.fecha_apertura,
         ac.fecha_cierre,
         ac.saldo_inicial,
         ac.ventas_efectivo,
         ac.ventas_digital,
         ac.gastos_efectivo,
         ac.aporte_efectivo,
         ac.aporte_digital,
         ac.saldo_esperado,
         ac.saldo_real,
         ac.diferencia,
         ac.estado,
         ac.observaciones,
         p.nombres AS personal_nombres,
         p.apellidos AS personal_apellidos
       FROM arqueos_caja ac
       LEFT JOIN personal p ON p.id = ac.usuario_id
       WHERE ac.id = ?
       LIMIT 1`,
      [arqueoId]
    );

    const createdRow = createdRows?.[0] || null;
    const responseData = createdRow ? { ...createdRow, personal_nombre: `${createdRow.personal_nombres || ''} ${createdRow.personal_apellidos || ''}`.trim() } : { id: arqueoId };

    res.json({
      success: true,
      message: 'Arqueo procesado y contabilizado correctamente',
      data: responseData
    });

  } catch (error) {
    // Si algo falla, deshacemos todos los cambios en la BD
    if (connection) await connection.rollback();
    console.error("❌ ERROR CRÍTICO EN createArqueoCaja:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error interno al procesar el arqueo."
    });
  } finally {
    if (connection) connection.release();
  }
};

export const cerrarArqueoCaja = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const arqueoId = Number(req.params.id);
    const personalId = req.user?.id ?? null;
    if (!arqueoId) {
      connection.release();
      return res.status(400).json({ success: false, message: 'ID de arqueo inválido.' });
    }

    await connection.beginTransaction();

    /* const [arqueoRows] = await connection.query(
      `SELECT id, estado, fecha_apertura, fecha_cierre, saldo_inicial, saldo_real, diferencia
       FROM arqueos_caja
       WHERE id = ?
       LIMIT 1`,
      [arqueoId]
    ); */

    const [arqueoRows] = await connection.query(
      `SELECT 
            id,
            usuario_id,
            sucursal_id,
            estado,
            fecha_apertura,
            fecha_cierre,
            saldo_inicial,
            ventas_efectivo,
            ventas_digital,
            gastos_efectivo,
            aporte_efectivo,
            aporte_digital,
            saldo_esperado,
            saldo_real,
            diferencia,
            observaciones,
        FROM arqueos_caja
        WHERE id = ?
        LIMIT 1`,
      [arqueoId]
    );


    if (!arqueoRows.length) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'No se encontró un arqueo con el ID indicado.'
      });
    }

    const arqueo = arqueoRows[0];
    if (String(arqueo.estado || '').toUpperCase() !== 'ABIERTO') {
      await connection.rollback();
      connection.release();
      return res.status(409).json({
        success: false,
        message: 'El arqueo ya está cerrado.'
      });
    }

    const [ventasMetrics, egresosMetrics] = await Promise.all([
      getPendingVentasMetrics(connection),
      getEgresosMetricsByRange(connection, arqueo.fecha_apertura, getCurrentLocalDateTime())
    ]);

    const [pendingRows] = await connection.query(
      `SELECT COUNT(*) AS total_pendientes
       FROM ingresos_ventas
       WHERE arqueo_id IS NULL`,
      []
    );

    const totalPendientes = Number(pendingRows?.[0]?.total_pendientes || 0);
    const cierreSinPendientes = totalPendientes === 0 && roundMoney(ventasMetrics.efectivo_recibido) === 0;

    const totalRetiros = await syncTotalesArqueoFromTraslados(connection, arqueoId);
    const saldoEsperado = roundMoney(arqueo.saldo_inicial + ventasMetrics.efectivo_recibido - egresosMetrics.total_egresos - totalRetiros);
    const saldoReal = roundMoney(arqueo.saldo_real || 0);
    const diferenciaActualizada = roundMoney(saldoReal - saldoEsperado);

    await connection.query(
      `UPDATE arqueos_caja
       SET ventas_efectivo = ?,
           ventas_digital = ?,
           gastos_efectivo = ?,
           saldo_esperado = ?,
           diferencia = ?
       WHERE id = ?`,
      [
        ventasMetrics.efectivo_recibido,
        ventasMetrics.digital_recibido,
        egresosMetrics.total_egresos,
        saldoEsperado,
        diferenciaActualizada,
        arqueoId
      ]
    );

    const [traslados] = await connection.query(
      `SELECT id, monto, tipo_traslado
       FROM traslados_tesoreria
       WHERE arqueo_id = ?
       ORDER BY id ASC`,
      [arqueoId]
    );

    for (const traslado of traslados) {
      const monto = roundMoney(traslado.monto);
      if (monto <= 0) continue;

      const tipoTraslado = normalizeTipoTraslado(traslado.tipo_traslado);
      const cuentaDestino = tipoTraslado === 'BANCO' ? '111005' : '110510';
      const descripcion = `Traslado Tesoreria #${traslado.id} - Arqueo #${arqueoId}`;

      // Debito: destino del traslado (Banco o Caja Menor = Caja Operativa)
      await contabilidadService.insertarMovimiento(connection, {
        cuenta: cuentaDestino,
        tipo_movimiento: 'DEBITO',
        monto,
        descripcion,
        referencia_tabla: 'arqueos_caja',
        referencia_id: arqueoId
      });

      // Credito: salida de Caja General - Caja Punto de Venta
      await contabilidadService.insertarMovimiento(connection, {
        cuenta: '110505', //Caja Punto de Venta
        tipo_movimiento: 'CREDITO',
        monto,
        descripcion,
        referencia_tabla: 'arqueos_caja',
        referencia_id: arqueoId
      });
    }

    const diferencia = diferenciaActualizada;
    if (diferencia < 0) {
      const montoFaltante = roundMoney(Math.abs(diferencia));
      const descripcion = `Ajuste Faltante Arqueo #${arqueoId}`;

      await contabilidadService.insertarMovimiento(connection, {
        cuenta: '519530',
        tipo_movimiento: 'DEBITO',
        monto: montoFaltante,
        descripcion,
        referencia_tabla: 'arqueos_caja',
        referencia_id: arqueoId
      });

      await contabilidadService.insertarMovimiento(connection, {
        cuenta: '110505', //Caja Punto de Venta
        tipo_movimiento: 'CREDITO',
        monto: montoFaltante,
        descripcion,
        referencia_tabla: 'arqueos_caja',
        referencia_id: arqueoId
      });
    } else if (diferencia > 0) {
      const montoSobrante = roundMoney(diferencia);
      const descripcion = `Ajuste Sobrante Arqueo #${arqueoId}`;

      await contabilidadService.insertarMovimiento(connection, {
        cuenta: '110505', //Caja Punto de Venta
        tipo_movimiento: 'DEBITO',
        monto: montoSobrante,
        descripcion,
        referencia_tabla: 'arqueos_caja',
        referencia_id: arqueoId
      });

      await contabilidadService.insertarMovimiento(connection, {
        cuenta: '429550',
        tipo_movimiento: 'CREDITO',
        monto: montoSobrante,
        descripcion,
        referencia_tabla: 'arqueos_caja',
        referencia_id: arqueoId
      });
    }

    const [result] = await connection.query(
      `UPDATE arqueos_caja
       SET estado = 'Cerrado',
           fecha_cierre = ?
       WHERE id = ? AND estado = 'Abierto'`,
      [getCurrentLocalDateTime(), arqueoId]
    );

    if (!result.affectedRows) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'No se encontró un arqueo abierto con el ID indicado.'
      });
    }

    await connection.commit();

    await registrarAccion({
      tabla: 'arqueos_caja',
      operacion: 'UPDATE',
      registroId: arqueoId,
      personalId,
      detalles: {
        estado: 'Cerrado',
        asientos_traslados: Number(traslados?.length || 0),
        diferencia_cuadre: diferencia
      }
    });

    return res.json({
      success: true,
      message: 'Arqueo cerrado correctamente.',
      data: {
        id: arqueoId,
        estado: 'Cerrado',
        warning: cierreSinPendientes
          ? 'Cierre sin ventas pendientes por asociar. Se cerró correctamente con efectivo recibido en 0.'
          : null
      }
    });
  } catch (error) {
    await connection.rollback().catch(() => { });
    console.error('Error en cerrarArqueoCaja:', error);
    return res.status(500).json({ success: false, message: 'Error al cerrar arqueo de caja.' });
  } finally {
    connection.release();
  }
};

export const getTrasladosByArqueoId = async (req, res) => {
  try {
    const arqueoId = Number(req.params.id);
    if (!arqueoId) {
      return res.status(400).json({ success: false, message: 'ID de arqueo inválido.' });
    }

    const [rows] = await db.query(
      `SELECT id, arqueo_id, monto, tipo_traslado, fecha, descripcion
       FROM traslados_tesoreria
       WHERE arqueo_id = ?
       ORDER BY fecha DESC, id DESC`,
      [arqueoId]
    );

    return res.json({ success: true, data: rows.map(mapTrasladoRow) });
  } catch (error) {
    console.error('Error en getTrasladosByArqueoId:', error);
    return res.status(500).json({ success: false, message: 'Error al consultar traslados de tesorería.' });
  }
};

export const createTrasladoTesoreria = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const arqueoId = Number(req.params.id);
    const personalId = req.user?.id ?? null;
    const monto = roundMoney(req.body?.monto);
    const tipoTraslado = normalizeTipoTraslado(req.body?.tipo_traslado);
    const descripcion = String(req.body?.descripcion || '').trim() || null;

    if (!arqueoId) {
      connection.release();
      return res.status(400).json({ success: false, message: 'ID de arqueo inválido.' });
    }
    if (monto <= 0) {
      connection.release();
      return res.status(400).json({ success: false, message: 'El monto del traslado debe ser mayor a 0.' });
    }
    if (!allowedTipoTraslado.includes(tipoTraslado)) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Tipo de traslado no válido.' });
    }

    await connection.beginTransaction();

    const [arqueoRows] = await connection.query(
      'SELECT id FROM arqueos_caja WHERE id = ? LIMIT 1',
      [arqueoId]
    );
    if (!arqueoRows.length) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Arqueo no encontrado.' });
    }

    const [result] = await connection.query(
      `INSERT INTO traslados_tesoreria (arqueo_id, monto, tipo_traslado, descripcion)
       VALUES (?, ?, ?, ?)`,
      [arqueoId, monto, tipoTraslado, descripcion]
    );

    const totalRetiros = await syncTotalesArqueoFromTraslados(connection, arqueoId);
    await connection.commit();

    await registrarAccion({
      tabla: 'traslados_tesoreria',
      operacion: 'INSERT',
      registroId: Number(result.insertId),
      personalId,
      detalles: { arqueo_id: arqueoId, monto, tipo_traslado: tipoTraslado }
    });

    const [createdRows] = await db.query(
      `SELECT id, arqueo_id, monto, tipo_traslado, fecha, descripcion
       FROM traslados_tesoreria
       WHERE id = ? LIMIT 1`,
      [Number(result.insertId)]
    );

    return res.status(201).json({
      success: true,
      data: {
        traslado: createdRows.length ? mapTrasladoRow(createdRows[0]) : null,
        total_retiros: totalRetiros
      }
    });
  } catch (error) {
    await connection.rollback().catch(() => { });
    console.error('Error en createTrasladoTesoreria:', error);
    return res.status(500).json({ success: false, message: 'Error al registrar traslado de tesorería.' });
  } finally {
    connection.release();
  }
};

export const updateTrasladoTesoreria = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const arqueoId = Number(req.params.id);
    const trasladoId = Number(req.params.trasladoId);
    const personalId = req.user?.id ?? null;
    const monto = roundMoney(req.body?.monto);
    const tipoTraslado = normalizeTipoTraslado(req.body?.tipo_traslado);
    const descripcion = String(req.body?.descripcion || '').trim() || null;

    if (!arqueoId || !trasladoId) {
      connection.release();
      return res.status(400).json({ success: false, message: 'IDs inválidos.' });
    }
    if (monto <= 0) {
      connection.release();
      return res.status(400).json({ success: false, message: 'El monto del traslado debe ser mayor a 0.' });
    }
    if (!allowedTipoTraslado.includes(tipoTraslado)) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Tipo de traslado no válido.' });
    }

    await connection.beginTransaction();

    const [existingRows] = await connection.query(
      'SELECT id FROM traslados_tesoreria WHERE id = ? AND arqueo_id = ? LIMIT 1',
      [trasladoId, arqueoId]
    );
    if (!existingRows.length) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Traslado no encontrado para este arqueo.' });
    }

    await connection.query(
      `UPDATE traslados_tesoreria
       SET monto = ?, tipo_traslado = ?, descripcion = ?
       WHERE id = ? AND arqueo_id = ?`,
      [monto, tipoTraslado, descripcion, trasladoId, arqueoId]
    );

    const totalRetiros = await syncTotalesArqueoFromTraslados(connection, arqueoId);
    await connection.commit();

    await registrarAccion({
      tabla: 'traslados_tesoreria',
      operacion: 'UPDATE',
      registroId: trasladoId,
      personalId,
      detalles: { arqueo_id: arqueoId, monto, tipo_traslado: tipoTraslado }
    });

    const [updatedRows] = await db.query(
      `SELECT id, arqueo_id, monto, tipo_traslado, fecha, descripcion
       FROM traslados_tesoreria
       WHERE id = ? LIMIT 1`,
      [trasladoId]
    );

    return res.json({
      success: true,
      data: {
        traslado: updatedRows.length ? mapTrasladoRow(updatedRows[0]) : null,
        total_retiros: totalRetiros
      }
    });
  } catch (error) {
    await connection.rollback().catch(() => { });
    console.error('Error en updateTrasladoTesoreria:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar traslado de tesorería.' });
  } finally {
    connection.release();
  }
};

export const deleteTrasladoTesoreria = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const arqueoId = Number(req.params.id);
    const trasladoId = Number(req.params.trasladoId);
    const personalId = req.user?.id ?? null;

    if (!arqueoId || !trasladoId) {
      connection.release();
      return res.status(400).json({ success: false, message: 'IDs inválidos.' });
    }

    await connection.beginTransaction();

    const [existingRows] = await connection.query(
      'SELECT id FROM traslados_tesoreria WHERE id = ? AND arqueo_id = ? LIMIT 1',
      [trasladoId, arqueoId]
    );
    if (!existingRows.length) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Traslado no encontrado para este arqueo.' });
    }

    await connection.query(
      'DELETE FROM traslados_tesoreria WHERE id = ? AND arqueo_id = ?',
      [trasladoId, arqueoId]
    );

    const totalRetiros = await syncTotalesArqueoFromTraslados(connection, arqueoId);
    await connection.commit();

    await registrarAccion({
      tabla: 'traslados_tesoreria',
      operacion: 'DELETE',
      registroId: trasladoId,
      personalId,
      detalles: { arqueo_id: arqueoId }
    });

    return res.json({ success: true, data: { id: trasladoId, total_retiros: totalRetiros } });
  } catch (error) {
    await connection.rollback().catch(() => { });
    console.error('Error en deleteTrasladoTesoreria:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar traslado de tesorería.' });
  } finally {
    connection.release();
  }
};
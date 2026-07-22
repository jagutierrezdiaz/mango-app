import db from '../config/db.js';
import { registrarAsientoEgreso, registrarAsientoVenta } from '../services/contabilidadService.js';
import { registrarAccion } from '../helpers/auditoria.helper.js';
import { COMANDA_ESTADOS, MESA_ESTADOS } from '../constants/domainConstants.js';

const METODOS_PAGO = ['Efectivo', 'Tarjeta', 'Transferencia', 'Mixto'];
const ESTADOS_CAJA = [COMANDA_ESTADOS.CERRADA];
const CATEGORIAS_GASTO_CAJA = {
  Insumos: {
    tabla: 'costos',
    cuenta_puc: '613501',
    clase_puc: '61 - Costo de Ventas - Alimentos',
    tipo_costo: 'MATERIA_PRIMA'
  },
  Empaques: {
    tabla: 'gastos',
    cuenta_puc: '529595',
    clase_puc: '52 - Operacionales de Ventas (Publicidad, Empaques)'
  },
  Servicios: {
    tabla: 'gastos',
    cuenta_puc: '519595',
    clase_puc: '51 - Operacionales de Administración (Nómina, Arriendos, Servicios)'
  },
  Otros: {
    tabla: 'gastos',
    cuenta_puc: '519595',
    clase_puc: '51 - Operacionales de Administración (Nómina, Arriendos, Servicios)'
  }
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundMoney = (value) => Number(toNumber(value).toFixed(2));

const getEstadoCajaPlaceholders = () => ESTADOS_CAJA.map(() => '?').join(', ');

const getCurrentSqlDateTime = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 19).replace('T', ' ');
};

const normalizeGastoCajaCategoria = (value) => {
  const rawValue = String(value || '').trim().toLowerCase();
  return Object.keys(CATEGORIAS_GASTO_CAJA).find((item) => item.toLowerCase() === rawValue) || null;
};

const getMovimientosCajaHoyData = async (connection = db) => {
  const sqlMovimientosHoy = `SELECT 
    mc.id,
    mc.fecha AS momento,
    mc.monto,
    mc.tipo_movimiento,
    mc.descripcion AS concepto,
    mc.referencia_tabla,
    mc.referencia_id,
    COALESCE(
      CASE
        WHEN mc.referencia_tabla = 'ingresos_ventas' THEN (
          SELECT CONVERT(CONCAT(TRIM(COALESCE(p.nombres, '')), ' ', TRIM(COALESCE(p.apellidos, ''))) USING utf8mb4) COLLATE utf8mb4_unicode_ci
          FROM ingresos_ventas iv
          JOIN personal p ON iv.persona_id = p.id
          WHERE iv.id = mc.referencia_id
          LIMIT 1
        )
        WHEN mc.referencia_tabla = 'arqueos_caja' THEN (
          SELECT CONVERT(CONCAT(TRIM(COALESCE(p.nombres, '')), ' ', TRIM(COALESCE(p.apellidos, ''))) USING utf8mb4) COLLATE utf8mb4_unicode_ci
          FROM arqueos_caja ac
          JOIN personal p ON ac.usuario_id = p.id
          WHERE ac.id = mc.referencia_id
          LIMIT 1
        )
        WHEN mc.referencia_tabla IN ('gastos', 'costos') THEN (
          SELECT CONVERT(CONCAT(TRIM(COALESCE(p.nombres, '')), ' ', TRIM(COALESCE(p.apellidos, ''))) USING utf8mb4) COLLATE utf8mb4_unicode_ci
          FROM auditoria a
          JOIN personal p ON a.personal_id = p.id
          WHERE a.registro_id = mc.referencia_id
            AND a.tabla_nombre = mc.referencia_tabla
            AND a.operacion = 'INSERT'
          ORDER BY a.id DESC
          LIMIT 1
        )
        ELSE NULL
      END,
      CONVERT('Sistema' USING utf8mb4) COLLATE utf8mb4_unicode_ci
    ) AS responsable_nombre
  FROM movimientos_contables mc
  WHERE DATE(mc.fecha) = CURDATE()
    AND (
      mc.cuenta_codigo LIKE '1105%' OR
      mc.cuenta_codigo LIKE '1110%'
    )
  ORDER BY mc.fecha DESC`;

  // Traza explícita para ubicar consultas fantasma y ruta exacta de ejecución.
  console.trace('Rastro de la consulta fantasma: /api/caja/movimientos-hoy -> getMovimientosCajaHoyData');

  let rows = [];
  try {
    [rows] = await connection.query(sqlMovimientosHoy);
  } catch (error) {
    console.error('[CAJA DEBUG] SQL fallido en getMovimientosCajaHoyData');
    console.error('[CAJA DEBUG] Error.sql:', error?.sql || sqlMovimientosHoy);
    console.error('[CAJA DEBUG] Error.sqlMessage:', error?.sqlMessage || error?.message);
    return {
      __error: true,
      statusCode: 500,
      message: 'Error al cargar movimientos de hoy.',
      detail: error?.sqlMessage || error?.message || 'SQL_ERROR'
    };
  }

  const movimientos = (rows || []).map((row) => ({
    movimiento_id: Number(row.id || 0),
    id: Number(row.id || 0),
    fecha: row.momento,
    momento: row.momento,
    monto: roundMoney(row.monto),
    tipo_movimiento: String(row.tipo_movimiento || ''),
    categoria: String(row.tipo_movimiento || '').toUpperCase() === 'DEBITO' ? 'Entrada' : 'Salida',
    detalle: row.concepto || 'Movimiento de caja',
    concepto: row.concepto || 'Movimiento de caja',
    numero_soporte: null,
    referencia_tabla: row.referencia_tabla,
    referencia_id: Number(row.referencia_id || 0),
    ejecutado_by: String(row.responsable_nombre || '').trim() || 'Sistema',
    responsable_nombre: String(row.responsable_nombre || '').trim() || 'Sistema',
    usuario: String(row.responsable_nombre || '').trim() || 'Sistema'
  }));

  return {
    movimientos,
    total_egresos_hoy: roundMoney(
      movimientos
        .filter((item) => String(item.tipo_movimiento || '').toUpperCase() === 'CREDITO')
        .reduce((sum, item) => sum + roundMoney(item.monto), 0)
    ),
    flujo_neto_hoy: roundMoney(
      movimientos.reduce((sum, item) => {
        const monto = roundMoney(item.monto);
        return String(item.tipo_movimiento || '').toUpperCase() === 'DEBITO'
          ? sum + monto
          : sum - monto;
      }, 0)
    )
  };
};

const getAporteServicioPorcentaje = async (connection = db) => {
  const [rows] = await connection.query(
    `SELECT valor_parametro
     FROM parametros_sistema
     WHERE nombre_parametro = 'aporte_servicio'
     LIMIT 1`
  );

  const rawValue = rows?.[0]?.valor_parametro;
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return roundMoney(parsed);
};

export const getParametrosTesoreria = async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM patio_bohemio.parametros_sistema
       WHERE nombre_parametro IN ('base_caja_menor','ahorro_reserva')`
    );

    return res.json({ success: true, data: rows || [] });
  } catch (error) {
    console.error('Error en getParametrosTesoreria:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener parámetros de tesoreria.' });
  }
};

export const getComandasPendientesCaja = async (_req, res) => {
  try {
    const aporteServicioPorcentaje = await getAporteServicioPorcentaje();

    const [rows] = await db.query(
      `SELECT
        c.id,
        c.mesa_id,
        c.personal_id,
        c.cliente_nombre,
        c.fecha_hora,
        c.total_sin_servicio,
        c.servicio_voluntario,
        c.total_final,
        c.forma_pago,
        c.estado_comanda,
        m.nombre AS mesa_nombre,
        m.numero AS mesa_numero,
        p.nombres AS personal_nombres,
        p.apellidos AS personal_apellidos,
        p.url_foto AS personal_url_foto,
        COALESCE(SUM(cd.valor_subtotal), 0) AS subtotal_detalle
      FROM comandas c
      INNER JOIN mesas m ON m.id = c.mesa_id
      INNER JOIN personal p ON p.id = c.personal_id
      LEFT JOIN ingresos_ventas iv ON iv.comanda_id = c.id
      LEFT JOIN comandas_detalle cd ON cd.comanda_id = c.id
      WHERE c.estado_comanda IN (${getEstadoCajaPlaceholders()})
        AND iv.id IS NULL
      GROUP BY
        c.id,
        c.mesa_id,
        c.personal_id,
        c.cliente_nombre,
        c.fecha_hora,
        c.total_sin_servicio,
        c.servicio_voluntario,
        c.total_final,
        c.forma_pago,
        c.estado_comanda,
        m.nombre,
        m.numero,
        p.nombres,
        p.apellidos,
        p.url_foto
      ORDER BY c.fecha_hora ASC, c.id ASC`,
      ESTADOS_CAJA
    );

    const data = rows.map((row) => {
      const subtotalDetalle = roundMoney(row.subtotal_detalle);
      const servicio = roundMoney(subtotalDetalle * (aporteServicioPorcentaje / 100));
      const totalFinal = roundMoney(subtotalDetalle + servicio);
      return {
        ...row,
        total_sin_servicio: subtotalDetalle,
        aporte_servicio_porcentaje: aporteServicioPorcentaje,
        servicio_voluntario: servicio,
        total_final: totalFinal
      };
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error en getComandasPendientesCaja:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener comandas de caja.' });
  }
};

export const getComandaCajaById = async (req, res) => {
  try {
    const comandaId = Number(req.params.id);
    if (!comandaId) {
      return res.status(400).json({ success: false, message: 'Comanda invalida.' });
    }

    const aporteServicioPorcentaje = await getAporteServicioPorcentaje();

    const [rows] = await db.query(
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
        m.numero AS mesa_numero,
        p.nombres AS personal_nombres,
        p.apellidos AS personal_apellidos,
        p.url_foto AS personal_url_foto
      FROM comandas c
      INNER JOIN mesas m ON m.id = c.mesa_id
      INNER JOIN personal p ON p.id = c.personal_id
      LEFT JOIN ingresos_ventas iv ON iv.comanda_id = c.id
      WHERE c.id = ?
        AND c.estado_comanda IN (${getEstadoCajaPlaceholders()})
        AND iv.id IS NULL
      LIMIT 1`,
      [comandaId, ...ESTADOS_CAJA]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Comanda no encontrada para caja.' });
    }

    const [detalles] = await db.query(
      `SELECT
        cd.id,
        cd.comanda_id,
        cd.producto_id,
        cd.cantidad,
        cd.precio_unitario,
        cd.valor_subtotal,
        cd.observaciones_cocina,
        cd.observaciones_mesero,
        cd.estado_producto,
        p.nombre AS producto_nombre,
        p.url_foto AS producto_url_foto
      FROM comandas_detalle cd
      INNER JOIN productos p ON p.id = cd.producto_id
      WHERE cd.comanda_id = ?
      ORDER BY cd.id ASC`,
      [comandaId]
    );

    const subtotalDetalle = detalles.reduce((sum, item) => sum + roundMoney(item.valor_subtotal), 0);
    const servicio = roundMoney(subtotalDetalle * (aporteServicioPorcentaje / 100));

    const comanda = {
      ...rows[0],
      total_sin_servicio: roundMoney(subtotalDetalle),
      aporte_servicio_porcentaje: aporteServicioPorcentaje,
      servicio_voluntario: servicio,
      total_final: roundMoney(subtotalDetalle + servicio),
      detalles: detalles.map((item) => ({
        ...item,
        precio_unitario: roundMoney(item.precio_unitario),
        valor_subtotal: roundMoney(item.valor_subtotal)
      }))
    };

    return res.json({ success: true, data: comanda });
  } catch (error) {
    console.error('Error en getComandaCajaById:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener detalle de caja.' });
  }
};

export const registrarPagoCaja = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const personaId = Number(req.user?.id);

    // 1. EXTRAER DATOS DEL BODY - SE INCLUYE aporte_servicio QUE VIENE DEL FRONTEND
    const {
      comanda_id,
      metodo_pago,
      monto_efectivo,
      monto_efectivo_bruto,
      monto_digital,
      aporte_servicio,
      notas
    } = req.body || {};

    const comandaId = Number(comanda_id);
    if (!personaId || !comandaId) {
      return res.status(400).json({ success: false, message: 'Datos de pago incompletos.' });
    }

    if (!METODOS_PAGO.includes(metodo_pago)) {
      return res.status(400).json({ success: false, message: 'Metodo de pago invalido.' });
    }

    // 2. NORMALIZAR MONTOS RECIBIDOS (bruto para validar devuelta, neto para persistir)
    const efectivoBruto = roundMoney(monto_efectivo_bruto ?? monto_efectivo);
    const efectivo = roundMoney(monto_efectivo);
    const digital = roundMoney(monto_digital);
    const totalRecibidoBruto = roundMoney(efectivoBruto + digital);
    const totalRecibido = roundMoney(efectivo + digital);

    await connection.beginTransaction();

    // 3. OBTENER DATOS DE LA COMANDA DESDE LA BASE DE DATOS
    const [comandaRows] = await connection.query(
      `SELECT
        c.id,
        c.personal_id,
        c.cliente_nombre,
        c.total_sin_servicio,
        c.servicio_voluntario,
        c.total_final,
        c.forma_pago,
        c.estado_comanda,
        m.id AS mesa_id,
        m.nombre AS mesa_nombre,
        p.nombres AS personal_nombres,
        p.apellidos AS personal_apellidos,
        p.url_foto AS personal_url_foto
      FROM comandas c
      INNER JOIN mesas m ON m.id = c.mesa_id
      INNER JOIN personal p ON p.id = c.personal_id
      LEFT JOIN ingresos_ventas iv ON iv.comanda_id = c.id
      WHERE c.id = ?
        AND c.estado_comanda IN (${getEstadoCajaPlaceholders()})
        AND iv.id IS NULL
      LIMIT 1`,
      [comandaId, ...ESTADOS_CAJA]
    );

    if (!comandaRows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'La comanda no esta disponible para pago.' });
    }

    const comanda = comandaRows[0];

    // Recalcular subtotal directamente desde los detalles para evitar valores stale
    const [sumRows] = await connection.query(
      `SELECT COALESCE(SUM(valor_subtotal), 0) AS subtotal_detalles
       FROM comandas_detalle
       WHERE comanda_id = ?`,
      [comandaId]
    );
    const subTotalDB = roundMoney(sumRows?.[0]?.subtotal_detalles || 0);

    // Si hay discrepancia con el campo en la cabecera, dejar registro para depuración
    if (roundMoney(comanda.total_sin_servicio) !== subTotalDB) {
      console.warn('[CAJA DEBUG] subtotal mismatch for comanda', comandaId, 'total_sin_servicio=', roundMoney(comanda.total_sin_servicio), 'sum_detalles=', subTotalDB);
    }

    // 4. USAR EL APORTE DE SERVICIO QUE EL CAJERO INGRESÓ (O CERO SI NO HAY)
    const servicioIngresado = roundMoney(aporte_servicio || 0);

    // 5. CALCULAR TOTAL FINAL SUMANDO EL SUBTOTAL DE DB + EL SERVICIO EDITADO
    const totalFinalCalculado = roundMoney(subTotalDB + servicioIngresado);
    const diferencia = roundMoney(totalRecibidoBruto - totalFinalCalculado);

    // 6. VALIDACIÓN CRÍTICA CON REDONDEO PARA EVITAR DECIMALES INVISIBLES
    if (Math.round(totalRecibidoBruto) < Math.round(totalFinalCalculado)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'El valor recibido es insuficiente.',
        data: {
          total_final: totalFinalCalculado,
          total_recibido: totalRecibidoBruto,
          falta_dinero: roundMoney(totalFinalCalculado - totalRecibidoBruto)
        }
      });
    }

    const devuelta = roundMoney(totalRecibidoBruto - totalFinalCalculado);
    if (devuelta > 0 && Math.round(efectivoBruto) < Math.round(devuelta)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'La devuelta se entrega en efectivo. El efectivo recibido debe ser mayor o igual a la devuelta.'
      });
    }

    // 7. INSERTAR REGISTRO DE VENTA
    const [insertResult] = await connection.query(
      `INSERT INTO ingresos_ventas (
        comanda_id,
        persona_id,
        arqueo_id,
        numero_factura,
        total_venta,
        impuestos,
        aporte_servicio,
        total_pagado,
        metodo_pago,
        monto_efectivo,
        monto_digital,
        notas
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        comandaId,
        personaId,
        null,
        null,
        subTotalDB,
        0,
        servicioIngresado,
        totalFinalCalculado,
        metodo_pago,
        efectivo,
        digital,
        notas ? String(notas).trim() : null
      ]
    );

    const ventaId = Number(insertResult?.insertId || 0);
    if (!ventaId) {
      await connection.rollback();
      return res.status(500).json({ success: false, message: 'No se pudo crear el registro de venta.' });
    }

    // 8. REGISTRAR ASIENTO CONTABLE
    await registrarAsientoVenta(connection, {
      total_venta: subTotalDB,
      aporte_servicio: servicioIngresado,
      metodo_pago,
      referencia_id: ventaId,
      comanda_id: comandaId
    });

    const [facturaRows] = await connection.query(
      `SELECT numero_factura FROM ingresos_ventas WHERE id = ? LIMIT 1`,
      [ventaId]
    );

    const numeroFactura = facturaRows?.[0]?.numero_factura || null;

    // 9. ACTUALIZAR ESTADO DE COMANDA Y LIBERAR MESA
    await connection.query(
      `UPDATE comandas
       SET servicio_voluntario = ?,
           total_final = ?,
           estado_comanda = ?,
           forma_pago = CASE WHEN ? = 'Mixto' THEN forma_pago ELSE ? END
       WHERE id = ?`,
      [servicioIngresado, totalFinalCalculado, COMANDA_ESTADOS.PAGADA, metodo_pago, metodo_pago, comandaId]
    );

    await connection.query(
      `UPDATE mesas SET estado = ? WHERE id = ?`,
      [MESA_ESTADOS.LIBRE, Number(comanda.mesa_id)]
    );

    const [detalles] = await connection.query(
      `SELECT cd.id, cd.cantidad, cd.precio_unitario, cd.valor_subtotal, p.nombre AS producto_nombre
       FROM comandas_detalle cd
       INNER JOIN productos p ON p.id = cd.producto_id
       WHERE cd.comanda_id = ?`,
      [comandaId]
    );

    await connection.commit();

    // 10. REGISTRAR ACCIONES EN AUDITORÍA
    await registrarAccion({
      tabla: 'ingresos_ventas',
      operacion: 'INSERT',
      registroId: ventaId,
      personalId: personaId,
      detalles: { total_pagado: totalFinalCalculado, metodo_pago }
    });

    // 11. EMITIR EVENTO DE COMANDA PAGADA POR WEBSOCKET
    const io = req?.app?.get?.('socketio');
    if (io && typeof io.emit === 'function') {
      const comandaPagadaPayload = {
        id_comanda: comandaId,
        comanda_id: comandaId,
        id: comandaId,
        mesa_id: Number(comanda.mesa_id || 0),
        mesa_nombre: comanda.mesa_nombre || null,
        cliente_nombre: comanda.cliente_nombre || null,
        total_pagado: totalFinalCalculado,
        aporte_servicio: servicioIngresado,
        numero_factura: numeroFactura,
        fecha_pago: new Date().toISOString(),
        metodo_pago: metodo_pago ?? detalles[0].metodo_pago,

      };

      // Emitir a la room de cajeros para actualizar listas en tiempo real
      io.to('role:CAJA').emit('comanda-pagada', comandaPagadaPayload);
      console.log('📡 [SOCKET] Evento comanda-pagada emitido:', { comanda_id: comandaId, mesa: comanda.mesa_nombre });
    }

    return res.status(201).json({
      success: true,
      message: 'Pago registrado correctamente.',
      data: {
        numero_factura: numeroFactura,
        cambio: diferencia > 0 ? diferencia : 0,
        total_pagado: totalFinalCalculado,
        total_recibido: totalRecibido,
        venta: {
          fecha_venta: new Date().toISOString(),
          metodo_pago: metodo_pago,
          comanda_id: comandaId,
          id_mesa: comanda.mesa_id,
          mesa_nombre: comanda.mesa_nombre,
          cliente_nombre: comanda.cliente_nombre || null,
          mesero_nombre: `${comanda.personal_nombres || ''} ${comanda.personal_apellidos || ''}`.trim() || null,
          numero_factura: numeroFactura,
          total_venta: subTotalDB,
          aporte_servicio: servicioIngresado,
          total_pagado: totalFinalCalculado,
          notas: notas ? String(notas).trim() : null,
          detalles: detalles.map(item => ({
            ...item,
            precio_unitario: roundMoney(item.precio_unitario),
            valor_subtotal: roundMoney(item.valor_subtotal)
          }))
        }
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error en registrarPagoCaja:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error al registrar el pago.'
    });
  } finally {
    connection.release();
  }
};

export const getMovimientosCajaHoy = async (_req, res) => {
  try {
    const data = await getMovimientosCajaHoyData(db);
    if (data?.__error) {
      return res.status(Number(data.statusCode || 500)).json({
        success: false,
        message: data.message || 'Error al cargar movimientos de hoy.',
        detail: data.detail || undefined
      });
    }
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[CAJA DEBUG] Error.sql:', error?.sql);
    console.error('[CAJA DEBUG] Error.sqlMessage:', error?.sqlMessage);
    console.error('Error en getMovimientosCajaHoy:', error);
    return res.status(500).json({ success: false, message: 'Error al cargar movimientos de hoy.' });
  }
};

export const getReporteCajaHoy = async (_req, res) => {
  try {
    const [rows] = await db.query(
      `
        SELECT
          iv.metodo_pago AS Metodo_Pago,
          SUM(iv.total_pagado) AS Total_Pagado,
          SUM(
            CASE
              WHEN iv.metodo_pago = 'Efectivo' THEN iv.total_venta
              WHEN iv.metodo_pago = 'Mixto' THEN
                CASE
                  WHEN iv.total_pagado = 0 THEN 0
                  ELSE ROUND((iv.total_venta / iv.total_pagado) * iv.monto_efectivo, 0)
                END
              ELSE 0
            END
          ) AS Venta_Efectivo,
          SUM(
            CASE
              WHEN iv.metodo_pago = 'Efectivo' THEN iv.aporte_servicio
              WHEN iv.metodo_pago = 'Mixto' THEN
                CASE
                  WHEN iv.total_pagado = 0 THEN 0
                  ELSE ROUND((iv.aporte_servicio / iv.total_pagado) * iv.monto_efectivo, 0)
                END
              ELSE 0
            END
          ) AS Servicio_Efectivo,
          SUM(
            CASE
              WHEN iv.metodo_pago = 'Transferencia' THEN iv.total_venta
              WHEN iv.metodo_pago = 'Mixto' THEN
                CASE
                  WHEN iv.total_pagado = 0 THEN 0
                  ELSE ROUND((iv.total_venta / iv.total_pagado) * iv.monto_digital, 0)
                END
              ELSE 0
            END
          ) AS Venta_Transferencia,
          SUM(
            CASE
              WHEN iv.metodo_pago = 'Transferencia' THEN iv.aporte_servicio
              WHEN iv.metodo_pago = 'Mixto' THEN
                CASE
                  WHEN iv.total_pagado = 0 THEN 0
                  ELSE ROUND((iv.aporte_servicio / iv.total_pagado) * iv.monto_digital, 0)
                END
              ELSE 0
            END
          ) AS Servicio_Transferencia
        FROM ingresos_ventas iv
        WHERE DATE(iv.fecha_venta) = CURDATE()
          AND iv.estado = 'Generada'
        GROUP BY iv.metodo_pago
        ORDER BY iv.metodo_pago
      `
    );

    const fecha = getCurrentSqlDateTime().slice(0, 10);

    return res.json({
      success: true,
      data: {
        fecha,
        filas: rows || []
      }
    });
  } catch (error) {
    console.error('Error en getReporteCajaHoy:', error);
    return res.status(500).json({ success: false, message: 'Error al generar reporte de caja.' });
  }
};

export const debugCajaSchema = async (_req, res) => {
  try {
    const [describeMovimientosContables] = await db.query('DESCRIBE movimientos_contables');
    const [allTablesRaw] = await db.query('SHOW TABLES');

    const tableNameKey = allTablesRaw.length ? Object.keys(allTablesRaw[0])[0] : null;
    const allTableNames = (allTablesRaw || [])
      .map((row) => String(row?.[tableNameKey] || ''))
      .filter(Boolean);

    const similarToCajaOMov = allTableNames.filter((name) => /(caja|mov)/i.test(name));

    const [triggersRef] = await db.query(
      `SELECT TRIGGER_NAME, EVENT_OBJECT_TABLE, ACTION_TIMING, EVENT_MANIPULATION
       FROM INFORMATION_SCHEMA.TRIGGERS
       WHERE TRIGGER_SCHEMA = DATABASE()
         AND ACTION_STATEMENT LIKE '%caja_movimientos%'`
    );

    const [routinesRef] = await db.query(
      `SELECT ROUTINE_NAME, ROUTINE_TYPE
       FROM INFORMATION_SCHEMA.ROUTINES
       WHERE ROUTINE_SCHEMA = DATABASE()
         AND ROUTINE_DEFINITION LIKE '%caja_movimientos%'`
    );

    const [viewsRef] = await db.query(
      `SELECT TABLE_NAME
       FROM INFORMATION_SCHEMA.VIEWS
       WHERE TABLE_SCHEMA = DATABASE()
         AND VIEW_DEFINITION LIKE '%caja_movimientos%'`
    );

    const [eventsRef] = await db.query(
      `SELECT EVENT_NAME
       FROM INFORMATION_SCHEMA.EVENTS
       WHERE EVENT_SCHEMA = DATABASE()
         AND EVENT_DEFINITION LIKE '%caja_movimientos%'`
    );

    return res.json({
      success: true,
      data: {
        describe_movimientos_contables: describeMovimientosContables,
        total_tablas: allTableNames.length,
        tablas_similares_caja_o_mov: similarToCajaOMov,
        refs_caja_movimientos: {
          triggers: triggersRef,
          routines: routinesRef,
          views: viewsRef,
          events: eventsRef
        }
      }
    });
  } catch (error) {
    console.error('[CAJA DEBUG] Error en debugCajaSchema');
    console.error('[CAJA DEBUG] Error.sql:', error?.sql);
    console.error('[CAJA DEBUG] Error.sqlMessage:', error?.sqlMessage || error?.message);
    return res.status(500).json({
      success: false,
      message: 'Error al inspeccionar esquema de caja.',
      detail: error?.sqlMessage || error?.message
    });
  }
};

export const registrarGastoCaja = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const personalId = Number(req.user?.id);
    const monto = roundMoney(req.body?.monto);
    const categoria = normalizeGastoCajaCategoria(req.body?.categoria);
    const descripcion = String(req.body?.descripcion || '').trim();
    const numeroSoporte = String(req.body?.numero_soporte || '').trim() || null;

    if (!personalId) {
      return res.status(401).json({ success: false, message: 'No se pudo identificar al usuario actual.' });
    }

    if (!categoria || !CATEGORIAS_GASTO_CAJA[categoria]) {
      return res.status(400).json({ success: false, message: 'Debe seleccionar una categoria valida.' });
    }

    if (monto <= 0) {
      return res.status(400).json({ success: false, message: 'El monto debe ser mayor a cero.' });
    }

    if (!descripcion) {
      return res.status(400).json({ success: false, message: 'La descripcion del gasto es obligatoria.' });
    }

    const config = CATEGORIAS_GASTO_CAJA[categoria];
    const fechaActual = getCurrentSqlDateTime();
    const descripcionFinal = `${categoria}: ${descripcion}`;

    await connection.beginTransaction();

    let referenciaId = 0;
    console.log("-------------")
    console.log("categoria:", config.clase_puc)
    console.log("-------------")
    if (config.tabla === 'costos') {
      const [result] = await connection.query(
        `INSERT INTO costos (
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          null,
          1,
          config.clase_puc,
          fechaActual,
          fechaActual,
          config.tipo_costo,
          descripcionFinal,
          1,
          monto,
          monto,
          null,
          'CAJA_GENERAL',
          'PAGADO'
        ]
      );

      referenciaId = Number(result?.insertId || 0);
    } else {
      const [result] = await connection.query(
        `INSERT INTO gastos (
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
          estado,
          fuente_pago
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          1,
          null,
          config.clase_puc,
          descripcionFinal,
          fechaActual,
          fechaActual,
          monto,
          0,
          0,
          monto,
          'DOCUMENTO_SOPORTE',
          numeroSoporte,
          'default.png',
          'PAGADO',
          'CAJA_GENERAL'
        ]
      );

      referenciaId = Number(result?.insertId || 0);
    }

    if (!referenciaId) {
      await connection.rollback();
      return res.status(500).json({ success: false, message: 'No se pudo crear el gasto de caja.' });
    }

    await registrarAsientoEgreso(connection, {
      monto,
      cuenta_puc: config.cuenta_puc,
      referencia_id: referenciaId,
      tabla: config.tabla,
      descripcion: descripcionFinal
    });

    await connection.commit();

    await registrarAccion({
      tabla: config.tabla,
      operacion: 'INSERT',
      registroId: referenciaId,
      personalId,
      detalles: {
        origen: 'gestion_caja',
        categoria,
        descripcion: descripcionFinal,
        monto,
        numero_soporte: numeroSoporte,
        cuenta_puc: config.cuenta_puc,
        fuente_pago: 'CAJA_GENERAL'
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Gasto de caja registrado correctamente.',
      data: {
        id: referenciaId,
        categoria,
        monto,
        descripcion: descripcionFinal,
        numero_soporte: numeroSoporte,
        referencia_tabla: config.tabla,
        cuenta_puc: config.cuenta_puc,
        fecha: fechaActual
      }
    });
  } catch (error) {
    await connection.rollback().catch(() => { });
    console.error('Error en registrarGastoCaja:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error al registrar el gasto de caja.',
      detail: error.sqlMessage || undefined
    });
  } finally {
    connection.release();
  }
};

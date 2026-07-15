import db from '../config/db.js';

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundMoney = (value) => Number(toNumber(value).toFixed(2));

const buildPersonalPhotoUrl = (req, value) => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (String(value).startsWith('/uploads/')) {
    return `${req.protocol}://${req.get('host')}${value}`;
  }
  return `${req.protocol}://${req.get('host')}/uploads/personal/${value}`;
};

/**
 * GET /api/caja/ingresos
 * Obtiene el histórico de ingresos_ventas con filtros de fecha
 */
export const getIngresos = async (req, res) => {
  try {
    const { fecha_inicio: fechaInicio, fecha_final: fechaFinal } = req.query;

    const filters = [];
    const params = [];

    if (fechaInicio) {
      filters.push('iv.fecha_venta >= ?');
      params.push(`${fechaInicio} 00:00:00`);
    }

    if (fechaFinal) {
      filters.push('iv.fecha_venta <= ?');
      params.push(`${fechaFinal} 23:59:59`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const [rows] = await db.query(
      `SELECT
          iv.id,
          iv.comanda_id,
          iv.persona_id,
          iv.arqueo_id,
          iv.fecha_venta,
          iv.numero_factura,
          iv.total_venta,
          iv.impuestos,
          iv.aporte_servicio,
          iv.total_pagado,
          iv.metodo_pago,
          iv.monto_efectivo,
          iv.monto_digital,
          iv.estado,
          iv.notas,
          p.nombres,
          p.apellidos,
          p.rol,
          p.url_foto,
          m.id AS id_mesa,
          m.nombre AS mesa_nombre,
          pm.nombres AS mesero_nombres,
          pm.apellidos AS mesero_apellidos
        FROM ingresos_ventas iv
        LEFT JOIN personal p ON iv.persona_id = p.id
        LEFT JOIN comandas c ON c.id = iv.comanda_id
        LEFT JOIN mesas m ON m.id = c.mesa_id
        LEFT JOIN personal pm ON pm.id = c.personal_id
        ${whereClause}
        ORDER BY iv.fecha_venta DESC, iv.id DESC
      `,
      params
    );


    // Obtener detalles (productos) para todas las comandas incluidas en los ingresos
    const comandaIds = Array.from(new Set(rows.map(r => Number(r.comanda_id || 0)).filter(id => id > 0)));
    const detallesPorComanda = new Map();
    if (comandaIds.length) {
      const placeholders = comandaIds.map(() => '?').join(',');


      const [rows_comandas] = await db.query(
        `SELECT
            cd.id AS detalle_id,
            cd.comanda_id,
            cd.producto_id,
            p.nombre AS producto_nombre,
            cd.cantidad,
            cd.precio_unitario,
            cd.valor_subtotal,
            cd.estado_producto
        FROM comandas_detalle cd
        INNER JOIN comandas c
          ON cd.comanda_id = c.id
        LEFT JOIN productos p
          ON cd.producto_id = p.id
        WHERE cd.comanda_id IN (${placeholders})
          AND c.estado_comanda = 'Pagada'
        ORDER BY cd.id ASC`,
        comandaIds
            );



      for (const d of rows_comandas) {
        const cid = Number(d.comanda_id || 0);
        if (!detallesPorComanda.has(cid)) detallesPorComanda.set(cid, []);
        detallesPorComanda.get(cid).push({
          detalle_id: Number(d.detalle_id || 0),
          producto_id: Number(d.producto_id || 0),
          producto_nombre: d.producto_nombre || '',
          cantidad: Number(d.cantidad || 0),
          precio_unitario: Number(d.precio_unitario || 0),
          valor_subtotal: Number(d.valor_subtotal || 0),
          estado_producto: d.estado_producto || null
        });
      }
    }

    const data = rows.map((row) => ({
      ...row,
      arqueo_id: row.arqueo_id == null ? null : Number(row.arqueo_id),
      total_venta: roundMoney(row.total_venta),
      impuestos: roundMoney(row.impuestos),
      aporte_servicio: roundMoney(row.aporte_servicio),
      total_pagado: roundMoney(row.total_pagado),
      monto_efectivo: roundMoney(row.monto_efectivo),
      monto_digital: roundMoney(row.monto_digital),
      personal_url_foto: buildPersonalPhotoUrl(req, row.url_foto),
      personal_nombre: `${row.nombres || ''} ${row.apellidos || ''}`.trim(),
      id_mesa: row.id_mesa == null ? null : Number(row.id_mesa),
      mesa_nombre: row.mesa_nombre || null,
      mesero_nombre: `${row.mesero_nombres || ''} ${row.mesero_apellidos || ''}`.trim() || null,
      // Adjuntar lista de productos asociados a la comanda (si existen)
      productos: detallesPorComanda.get(Number(row.comanda_id || 0)) || []
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error en getIngresos:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener ingresos.' });
  }
};

/**
 * GET /api/caja/ingresos/:id
 * Obtiene un ingreso específico con sus detalles
 */
export const getIngresoById = async (req, res) => {
  try {
    const ingresoId = Number(req.params.id);
    if (!ingresoId) {
      return res.status(400).json({ success: false, message: 'ID de ingreso inválido.' });
    }

    const [rows] = await db.query(
      `
        SELECT
          iv.id,
          iv.comanda_id,
          iv.persona_id,
          iv.arqueo_id,
          iv.fecha_venta,
          iv.numero_factura,
          iv.total_venta,
          iv.impuestos,
          iv.aporte_servicio,
          iv.total_pagado,
          iv.metodo_pago,
          iv.monto_efectivo,
          iv.monto_digital,
          iv.estado,
          iv.notas,
          p.nombres,
          p.apellidos,
          p.rol,
          p.url_foto,
          m.id AS id_mesa,
          m.nombre AS mesa_nombre,
          pm.nombres AS mesero_nombres,
          pm.apellidos AS mesero_apellidos
        FROM ingresos_ventas iv
        LEFT JOIN personal p ON iv.persona_id = p.id
        LEFT JOIN comandas c ON c.id = iv.comanda_id
        LEFT JOIN mesas m ON m.id = c.mesa_id
        LEFT JOIN personal pm ON pm.id = c.personal_id
        WHERE iv.id = ?
        LIMIT 1
      `,
      [ingresoId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Ingreso no encontrado.' });
    }

    const row = rows[0];
    const data = {
      ...row,
      arqueo_id: row.arqueo_id == null ? null : Number(row.arqueo_id),
      total_venta: roundMoney(row.total_venta),
      impuestos: roundMoney(row.impuestos),
      aporte_servicio: roundMoney(row.aporte_servicio),
      total_pagado: roundMoney(row.total_pagado),
      monto_efectivo: roundMoney(row.monto_efectivo),
      monto_digital: roundMoney(row.monto_digital),
      personal_url_foto: buildPersonalPhotoUrl(req, row.url_foto),
      personal_nombre: `${row.nombres || ''} ${row.apellidos || ''}`.trim(),
      id_mesa: row.id_mesa == null ? null : Number(row.id_mesa),
      mesa_nombre: row.mesa_nombre || null,
      mesero_nombre: `${row.mesero_nombres || ''} ${row.mesero_apellidos || ''}`.trim() || null
    };

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error en getIngresoById:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener ingreso.' });
  }
};

/**
 * Obtiene resumen de ingresos por mes
 */
export const getResumenIngresos = async (req, res) => {
  try {
    const { fecha_inicio: fechaInicio, fecha_final: fechaFinal } = req.query;

    const filters = [];
    const params = [];

    if (fechaInicio) {
      filters.push('DATE(iv.fecha_venta) >= ?');
      params.push(fechaInicio);
    }

    if (fechaFinal) {
      filters.push('DATE(iv.fecha_venta) <= ?');
      params.push(fechaFinal);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    // 1) Ejecutar consulta agregada (compatibilidad con encabezado)
    const [summaryRows] = await db.query(
      `
        SELECT
          COUNT(*) as numero_ventas,
          SUM(iv.total_venta) as total_venta,
          SUM(iv.impuestos) as total_impuestos,
          SUM(iv.aporte_servicio) as total_servicio,
          SUM(iv.total_pagado) as total_pagado,
          SUM(iv.monto_efectivo) as total_efectivo,
          SUM(iv.monto_digital) as total_digital
        FROM ingresos_ventas iv
        ${whereClause}
      `,
      params
    );

    const summary = (summaryRows && summaryRows[0]) || {};
    const resumen = {
      numero_ventas: summary.numero_ventas || 0,
      total_venta: roundMoney(summary.total_venta || 0),
      total_impuestos: roundMoney(summary.total_impuestos || 0),
      total_servicio: roundMoney(summary.total_servicio || 0),
      total_pagado: roundMoney(summary.total_pagado || 0),
      total_efectivo: roundMoney(summary.total_efectivo || 0),
      total_digital: roundMoney(summary.total_digital || 0)
    };

    // 2) Ejecutar consulta detallada (filas) para que el frontend muestre los campos en el desplegable
    const [rows] = await db.query(
      `
        SELECT
          iv.comanda_id AS Comanda,
          DATE(iv.fecha_venta) AS Fecha,
          iv.numero_factura AS Factura,
          iv.total_pagado AS Total_Pagado,
          iv.metodo_pago AS Metodo_Pago,

          CASE
            WHEN iv.metodo_pago = 'Efectivo'
              THEN iv.total_venta

            WHEN iv.metodo_pago = 'Mixto'
              THEN CASE
                    WHEN iv.total_pagado = 0 THEN 0
                    ELSE ROUND(
                      (iv.total_venta / iv.total_pagado)
                      * iv.monto_efectivo,
                      0
                    )
                  END

            ELSE 0
          END AS Venta_Efectivo,

          CASE
            WHEN iv.metodo_pago = 'Efectivo'
              THEN iv.aporte_servicio

            WHEN iv.metodo_pago = 'Mixto'
              THEN CASE
                    WHEN iv.total_pagado = 0 THEN 0
                    ELSE ROUND(
                      (iv.aporte_servicio / iv.total_pagado)
                      * iv.monto_efectivo,
                      0
                    )
                  END

            ELSE 0
          END AS Servicio_Efectivo,

          CASE
            WHEN iv.metodo_pago = 'Transferencia'
              THEN iv.total_venta

            WHEN iv.metodo_pago = 'Mixto'
              THEN CASE
                    WHEN iv.total_pagado = 0 THEN 0
                    ELSE ROUND(
                      (iv.total_venta / iv.total_pagado)
                      * iv.monto_digital,
                      0
                    )
                  END

            ELSE 0
          END AS Venta_Transferencia,

          CASE
            WHEN iv.metodo_pago = 'Transferencia'
              THEN iv.aporte_servicio

            WHEN iv.metodo_pago = 'Mixto'
              THEN CASE
                    WHEN iv.total_pagado = 0 THEN 0
                    ELSE ROUND(
                      (iv.aporte_servicio / iv.total_pagado)
                      * iv.monto_digital,
                      0
                    )
                  END

            ELSE 0
          END AS Servicio_Transferencia

        FROM ingresos_ventas iv

        ${whereClause}
      `,
      params
    );

    return res.json({ success: true, data: { resumen, rows } });
  } catch (error) {
    console.error('Error en getResumenIngresos:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener resumen.' });
  }
};

/**
 * GET /api/caja/ingresos-desglosados
 * Devuelve desglose por medio de pago según la consulta solicitada
 */
export const getIngresosDesglosados = async (req, res) => {
  try {
    const { fecha_inicio: fechaInicio, fecha_final: fechaFinal } = req.query;

    const filters = [];
    const params = [];

    if (fechaInicio && fechaFinal) {
      // Si ambos vienen, usamos BETWEEN (fechas en formato YYYY-MM-DD esperadas desde el frontend)
      filters.push('DATE(iv.fecha_venta) BETWEEN ? AND ?');
      params.push(fechaInicio, fechaFinal);
    } else {
      if (fechaInicio) {
        filters.push('DATE(iv.fecha_venta) >= ?');
        params.push(fechaInicio);
      }
      if (fechaFinal) {
        filters.push('DATE(iv.fecha_venta) <= ?');
        params.push(fechaFinal);
      }
    }

    // Filtrar solo ingresos con estado 'Generada'
    filters.push("iv.estado = 'Generada'");

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const [rows] = await db.query(
      `
        SELECT
          iv.comanda_id AS Comanda,
          DATE(iv.fecha_venta) AS Fecha,
          iv.numero_factura AS Factura,
          iv.total_pagado AS Total_Pagado,
          iv.metodo_pago AS Metodo_Pago,

          CASE
            WHEN iv.metodo_pago = 'Efectivo'
              THEN iv.total_venta

            WHEN iv.metodo_pago = 'Mixto'
              THEN CASE
                    WHEN iv.total_pagado = 0 THEN 0
                    ELSE ROUND(
                      (iv.total_venta / iv.total_pagado)
                      * iv.monto_efectivo,
                      0
                    )
                  END

            ELSE 0
          END AS Venta_Efectivo,

          CASE
            WHEN iv.metodo_pago = 'Efectivo'
              THEN iv.aporte_servicio

            WHEN iv.metodo_pago = 'Mixto'
              THEN CASE
                    WHEN iv.total_pagado = 0 THEN 0
                    ELSE ROUND(
                      (iv.aporte_servicio / iv.total_pagado)
                      * iv.monto_efectivo,
                      0
                    )
                  END

            ELSE 0
          END AS Servicio_Efectivo,

          CASE
            WHEN iv.metodo_pago = 'Transferencia'
              THEN iv.total_venta

            WHEN iv.metodo_pago = 'Mixto'
              THEN CASE
                    WHEN iv.total_pagado = 0 THEN 0
                    ELSE ROUND(
                      (iv.total_venta / iv.total_pagado)
                      * iv.monto_digital,
                      0
                    )
                  END

            ELSE 0
          END AS Venta_Transferencia,

          CASE
            WHEN iv.metodo_pago = 'Transferencia'
              THEN iv.aporte_servicio

            WHEN iv.metodo_pago = 'Mixto'
              THEN CASE
                    WHEN iv.total_pagado = 0 THEN 0
                    ELSE ROUND(
                      (iv.aporte_servicio / iv.total_pagado)
                      * iv.monto_digital,
                      0
                    )
                  END

            ELSE 0
          END AS Servicio_Transferencia

        FROM ingresos_ventas iv

        ${whereClause}

        ORDER BY DATE(iv.fecha_venta), iv.comanda_id
      `,
      params
    );

    /*
    const [rows] = await db.query(
      `
        SELECT
          iv.comanda_id AS Comanda,
          DATE(iv.fecha_venta) AS Fecha,
          iv.numero_factura AS Factura,
          iv.total_pagado AS Total_Pagado,
          iv.metodo_pago AS Metodo_Pago,
          CASE WHEN iv.total_pagado = 0 THEN 0 ELSE ROUND((iv.total_venta / iv.total_pagado) * iv.monto_efectivo, 0) END AS Venta_Efectivo,
          CASE WHEN iv.total_pagado = 0 THEN 0 ELSE ROUND((iv.aporte_servicio / iv.total_pagado) * iv.monto_efectivo, 0) END AS Servicio_Efectivo,
          CASE WHEN iv.total_pagado = 0 THEN 0 ELSE ROUND((iv.total_venta / iv.total_pagado) * iv.monto_digital, 0) END AS Venta_Transferencia,
          CASE WHEN iv.total_pagado = 0 THEN 0 ELSE ROUND((iv.aporte_servicio / iv.total_pagado) * iv.monto_digital, 0) END AS Servicio_Transferencia
        FROM ingresos_ventas iv
        ${whereClause}
        ORDER BY DATE(iv.fecha_venta), iv.comanda_id
      `,
      params
    );
    */

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error en getIngresosDesglosados:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener ingresos desglosados.' });
  }
};

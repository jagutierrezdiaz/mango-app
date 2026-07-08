import db from '../config/db.js';

const toInt = (v, fallback = 0) => {
  const n = Number.parseInt(String(v || ''), 10);
  return Number.isFinite(n) ? n : fallback;
};

const validateMonthYear = (mes, anio) => {
  if (mes < 1 || mes > 12) return false;
  if (anio < 1900 || anio > 3000) return false;
  return true;
};

export const getMovimientosTotal = async (req, res) => {
  try {
    const codigo = String(req.query.codigo || '').trim();
    const mes = toInt(req.query.mes, 0);
    const anio = toInt(req.query.anio, 0);

    if (!codigo) return res.status(400).json({ success: false, message: 'codigo es requerido' });
    if (!validateMonthYear(mes, anio)) return res.status(400).json({ success: false, message: 'mes o anio inválidos' });

    //suma debito + crédito ERROR
    /*
    const [rows] = await db.query(
      `SELECT COALESCE(SUM(mc.monto), 0) AS total
       FROM movimientos_contables mc
       INNER JOIN plan_unico_cuentas puc ON puc.codigo = mc.cuenta_codigo
       WHERE puc.codigo = ?
         AND MONTH(mc.fecha) = ?
         AND YEAR(mc.fecha) = ?`
      [codigo, mes, anio]
    );
    */

    //Devuelve el saldo total de la cuenta
    const [rows] = await db.query(
      `SELECT 
        COALESCE(
          SUM(
            CASE 
              WHEN tipo_movimiento = 'Debito' 
              THEN monto 
              ELSE -monto 
            END
          ), 
          0
        ) AS total
      FROM movimientos_contables
      WHERE cuenta_codigo = ?`,
      [codigo]
    );

    // Log SQL final
    console.log(`
    SQL FINAL:
    SELECT 
      COALESCE(
        SUM(
          CASE 
            WHEN tipo_movimiento = 'Debito' 
            THEN monto 
            ELSE -monto 
          END
        ), 
        0
      ) AS total
    FROM movimientos_contables
    WHERE cuenta_codigo = '${codigo}'
    `);

    const total = Number(rows?.[0]?.total || 0);
    return res.json({ success: true, total });
  } catch (error) {
    console.error('Error en getMovimientosTotal:', error);
    return res.status(500).json({ success: false, message: 'Error al calcular total de movimientos.' });
  }
};

export const getMovimientosList = async (req, res) => {
  try {
    const codigo = String(req.query.codigo || '').trim();
    const mes = toInt(req.query.mes, 0);
    const anio = toInt(req.query.anio, 0);

    if (!codigo) return res.status(400).json({ success: false, message: 'codigo es requerido' });
    if (!validateMonthYear(mes, anio)) return res.status(400).json({ success: false, message: 'mes o anio inválidos' });

    const [rows] = await db.query(
      `SELECT
         mc.id,
         mc.fecha,
          CASE WHEN mc.tipo_movimiento = 'Debito' THEN mc.monto ELSE NULL END AS Debito,
          CASE WHEN mc.tipo_movimiento = 'Credito' THEN mc.monto ELSE NULL END AS Credito,
         mc.referencia_tabla,
         mc.referencia_id,
         mc.descripcion
       FROM movimientos_contables mc
       INNER JOIN plan_unico_cuentas puc ON puc.codigo = mc.cuenta_codigo
       LEFT JOIN ingresos_ventas iv ON mc.referencia_tabla = 'ingresos_ventas' AND mc.referencia_id = iv.id
       LEFT JOIN arqueos_caja a ON mc.referencia_tabla = 'arqueos_caja' AND mc.referencia_id = a.id
       LEFT JOIN gastos g ON mc.referencia_tabla = 'gastos' AND mc.referencia_id = g.id
       LEFT JOIN costos c ON mc.referencia_tabla = 'costos' AND mc.referencia_id = c.id
       LEFT JOIN traslados_tesoreria t ON mc.referencia_tabla = 'traslados_tesoreria' AND mc.referencia_id = t.id
       WHERE puc.codigo = ?
         AND MONTH(mc.fecha) = ?
         AND YEAR(mc.fecha) = ?
       ORDER BY mc.fecha ASC, mc.id ASC`,
      [codigo, mes, anio]
    );

    const mapped = (rows || []).map((r) => ({
      id: Number(r.id || 0),
      fecha: r.fecha,
      Debito: Number(r.Debito || 0),
      Credito: Number(r.Credito || 0),
      referencia_tabla: r.referencia_tabla,
      referencia_id: Number(r.referencia_id || 0),
      descripcion: r.descripcion,
      // no extra data returned per requirements
      
    }));

    return res.json({ success: true, rows: mapped });
  } catch (error) {
    console.error('Error en getMovimientosList:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener movimientos.' });
  }
};

export default {
  getMovimientosTotal,
  getMovimientosList
};

import db from '../config/db.js';

/**
 * Calcula el saldo neto de la Caja General (110505)
 */
export const getSaldoCajaGeneralController = async (req, res) => {
  try {
    const query = `
      SELECT 
        SUM(CASE WHEN tipo_movimiento = 'Debito' THEN monto ELSE -monto END) AS saldo
      FROM movimientos_contables
      WHERE cuenta_codigo = '110505'
      GROUP BY cuenta_codigo;
    `;
    const [rows] = await db.query(query);
    const saldo = rows.length > 0 ? rows[0].saldo : 0;
    return res.json({ success: true, saldo: Number(saldo || 0) });
  } catch (error) {
    console.error('=> [Backend] Error en getSaldoCajaGeneralController:', error);
    return res.status(500).json({ success: false, message: 'Error al calcular el saldo contable' });
  }
};

/**
 * Obtiene el parámetro de Base Caja Venta
 */
export const getParametroBaseCajaVenta = async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT valor_parametro FROM patio_bohemio.parametros_sistema 
       WHERE nombre_parametro = 'base_caja_venta'`
    );

    // Console.log para ver el valor en la terminal del backend
    console.log("🔍 [Backend] Valor recuperado para Base Caja Venta (Menor):", rows[0] ? rows[0].valor_parametro : "No encontrado (usando 0)");

    return res.json({ success: true, data: rows[0] || { valor_parametro: 0 } });
  } catch (error) {
    console.error('Error en getParametroBaseCajaVenta:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener base_caja_menor.' });
  }
};

/**
 * Obtiene el parámetro de Base Ahorro (Caja Venta)
 */
export const getParametroBaseAhorro = async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT valor_parametro FROM patio_bohemio.parametros_sistema 
       WHERE nombre_parametro = 'ahorro_reserva'`
    );

    // Console.log para ver el valor en la terminal del backend
    console.log("🔍 [Backend] Valor recuperado para Base Ahorro:", rows[0] ? rows[0].valor_parametro : "No encontrado (usando 0)");

    return res.json({ success: true, data: rows[0] || { valor_parametro: 0 } });
  } catch (error) {
    console.error('Error en getParametroBaseAhorro:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener base_caja_venta.' });
  }
};

// Exportación unificada
export default {
  getSaldoCajaGeneralController,
  getParametroBaseCajaVenta,
  getParametroBaseAhorro
};
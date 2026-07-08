import db from '../config/db.js';
import { getPucAccountsByGroup } from '../services/contabilidadService.js';

const normalizeGroupCode = (value = '') => {
  const match = String(value || '').match(/^(\d{2,4})/);
  return match ? match[1] : '';
};

export const getPucAccountsByGroupWithBalance = async (req, res) => {
  try {
    const groupCode = normalizeGroupCode(req.params.groupCode);
    if (!groupCode) {
      return res.status(400).json({
        success: false,
        message: 'Grupo PUC invalido. Debe iniciar con 2 digitos.'
      });
    }

    const accounts = await getPucAccountsByGroup(db, groupCode);

    const [balanceRows] = await db.query(
      `SELECT
         cuenta_codigo,
         COALESCE(SUM(CASE WHEN tipo_movimiento = 'Debito' THEN monto ELSE 0 END), 0) AS total_debito,
         COALESCE(SUM(CASE WHEN tipo_movimiento = 'Credito' THEN monto ELSE 0 END), 0) AS total_credito
       FROM movimientos_contables
       WHERE LEFT(cuenta_codigo, 2) = ?
       GROUP BY cuenta_codigo`,
      [groupCode.slice(0, 2)]
    );

    const balanceMap = new Map(
      (balanceRows || []).map((row) => {
        const debito = Number(row.total_debito || 0);
        const credito = Number(row.total_credito || 0);
        const balance = Number((debito - credito).toFixed(2));
        return [String(row.cuenta_codigo || '').trim(), { debito, credito, balance }];
      })
    );

    const data = (accounts || []).map((account) => {
      const b = balanceMap.get(account.codigo) || { debito: 0, credito: 0, balance: 0 };
      return {
        ...account,
        total_debito: b.debito,
        total_credito: b.credito,
        balance: b.balance
      };
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error en getPucAccountsByGroupWithBalance:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al consultar cuentas PUC por grupo.'
    });
  }
};

export const searchPucAccounts = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ success: true, data: [] });

    const likeQ = `%${q}%`;
    const [rows] = await db.query(
      `SELECT codigo, nombre FROM plan_unico_cuentas WHERE codigo LIKE ? OR nombre LIKE ? ORDER BY codigo LIMIT 50`,
      [`${q}%`, likeQ]
    );

    const data = (rows || []).map((r) => ({
      codigo: String(r.codigo || '').trim(),
      nombre: String(r.nombre || '').trim(),
      etiqueta: `${r.codigo} - ${r.nombre}`
    }));
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error searchPucAccounts:', error);
    return res.status(500).json({ success: false, message: 'Error al buscar cuentas PUC.' });
  }
};

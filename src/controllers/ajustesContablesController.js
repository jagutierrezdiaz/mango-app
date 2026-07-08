import db from '../config/db.js';
import { insertarMovimiento } from '../services/contabilidadService.js';

const round = (v) => Number((Number(v) || 0).toFixed(2));

const CUENTAS_INVENTARIO = ['143501', '143502', '143503'];

const saldoContablePorCuenta = async (cuentaCodigo) => {
  const [rows] = await db.query(
    `SELECT COALESCE(SUM(CASE WHEN tipo_movimiento = 'Debito' THEN monto ELSE -monto END), 0) AS saldo
     FROM movimientos_contables
     WHERE cuenta_codigo = ?`,
    [cuentaCodigo]
  );
  return round(rows?.[0]?.saldo || 0);
};

const saldoContableInventarios = async () => {
  const [rows] = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN tipo_movimiento = 'Debito' THEN monto ELSE 0 END), 0) AS total_debito,
       COALESCE(SUM(CASE WHEN tipo_movimiento = 'Credito' THEN monto ELSE 0 END), 0) AS total_credito
     FROM movimientos_contables
     WHERE cuenta_codigo IN (?, ?, ?)`,
    CUENTAS_INVENTARIO
  );
  const debito = Number(rows?.[0]?.total_debito || 0);
  const credito = Number(rows?.[0]?.total_credito || 0);
  return round(debito - credito);
};

export const getResumenAjustes = async (_req, res) => {
  try {
    const [inventariosContable, cajaOperativaContable, cajaGeneralContable, bancosContable] = await Promise.all([
      saldoContableInventarios(),
      saldoContablePorCuenta('110505'),
      saldoContablePorCuenta('110510'),
      saldoContablePorCuenta('111005')
    ]);

    const contable = {
      inventarios: inventariosContable,
      cajaOperativa: cajaOperativaContable,
      cajaGeneral: cajaGeneralContable,
      bancos: bancosContable
    };

    // Operativos: intentar obtener desde tablas existentes
    // Inventarios operativos: sumar stock_actual * costo_unitario desde articulos si existe
    let inventarioOperativo = 0;
    try {
      const [rows] = await db.query('SELECT COALESCE(SUM(stock_actual * COALESCE(costo_unitario,0)),0) AS valor FROM articulos');
      inventarioOperativo = round(rows?.[0]?.valor || 0);
    } catch (e) {
      inventarioOperativo = 0;
    }

    // Caja operativa operativo: último arqueo saldo_real
    let cajaOperativaOperativo = 0;
    try {
      const [r] = await db.query('SELECT COALESCE(saldo_real,0) AS saldo_real FROM arqueos_caja WHERE sucursal_id = 1 ORDER BY fecha_cierre DESC LIMIT 1');
      cajaOperativaOperativo = round(r?.[0]?.saldo_real || 0);
    } catch (e) {
      cajaOperativaOperativo = 0;
    }

    // Caja general operativo: no hay una fuente clara, usar 0 por ahora
    const cajaGeneralOperativo = 0;

    // Bancos operativo: sumar movimientos_bancos si existe
    let bancosOperativo = 0;
    try {
      const [rb] = await db.query("SELECT COALESCE(SUM(CASE WHEN tipo_movimiento = 'Ingreso' THEN monto ELSE -monto END),0) AS saldo FROM movimientos_bancos");
      bancosOperativo = round(rb?.[0]?.saldo || 0);
    } catch (e) {
      bancosOperativo = 0;
    }

    const data = {
      inventarios: {
        operativo: inventarioOperativo,
        contable: contable.inventarios,
        diferencia: round(inventarioOperativo - contable.inventarios)
      },
      cajaOperativa: {
        operativo: cajaOperativaOperativo,
        contable: contable.cajaOperativa,
        diferencia: round(cajaOperativaOperativo - contable.cajaOperativa)
      },
      cajaGeneral: {
        operativo: cajaGeneralOperativo,
        contable: contable.cajaGeneral,
        diferencia: round(cajaGeneralOperativo - contable.cajaGeneral)
      },
      bancos: {
        operativo: bancosOperativo,
        contable: contable.bancos,
        diferencia: round(bancosOperativo - contable.bancos)
      }
    };

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error getResumenAjustes:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener resumen de ajustes.' });
  }
};

export const registrarAjusteContable = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { cuentaDebito, cuentaCredito, monto, descripcion } = req.body || {};
    const valor = Number(monto || 0);
    if (!cuentaDebito || !cuentaCredito) return res.status(400).json({ success: false, message: 'Debe indicar cuentas débito y crédito.' });
    if (cuentaDebito === cuentaCredito) return res.status(400).json({ success: false, message: 'Cuenta débito y crédito deben ser distintas.' });
    if (!(valor > 0)) return res.status(400).json({ success: false, message: 'El monto debe ser mayor a 0.' });

    // validar existencia de cuentas
    const [pucs] = await connection.query('SELECT codigo FROM plan_unico_cuentas WHERE codigo IN (?,?)', [cuentaDebito, cuentaCredito]);
    const found = new Set((pucs || []).map(r => String(r.codigo).trim()));
    const missing = [cuentaDebito, cuentaCredito].filter(c => !found.has(c));
    if (missing.length) return res.status(400).json({ success: false, message: `Cuentas PUC no encontradas: ${missing.join(', ')}` });

    await connection.beginTransaction();

    const referencia_tabla = 'ajuste_contable';
    const referencia_id = 0; // Usar 0 para ajustes iniciados desde UI

    const insertedIds = [];

    const debitoId = await insertarMovimiento(connection, {
      fecha: new Date(),
      cuenta: String(cuentaDebito),
      tipo_movimiento: 'DEBITO',
      monto: valor,
      descripcion: String(descripcion || 'Ajuste contable manual'),
      referencia_tabla,
      referencia_id
    });
    insertedIds.push(debitoId);

    const creditoId = await insertarMovimiento(connection, {
      fecha: new Date(),
      cuenta: String(cuentaCredito),
      tipo_movimiento: 'CREDITO',
      monto: valor,
      descripcion: String(descripcion || 'Ajuste contable manual'),
      referencia_tabla,
      referencia_id
    });
    insertedIds.push(creditoId);

    await connection.commit();
    return res.json({ success: true, insertedIds, referencia_id });
  } catch (error) {
    try { await connection.rollback(); } catch (e) {}
    console.error('Error registrarAjusteContable:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error al registrar ajuste contable.' });
  } finally {
    try { connection.release(); } catch (e) {}
  }
};

export default { getResumenAjustes, registrarAjusteContable };

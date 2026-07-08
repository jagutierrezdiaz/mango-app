/**
 * SERVICIO DE CONTABILIDAD - PARTIDA DOBLE
 * Gestiona el registro de asientos contables basándose en el Plan Único de Cuentas (PUC)
 * Todas las funciones requieren una connection activa para atomicidad transaccional.
 */

import { normalizeDateTimeForSQL } from '../utils/dateFormatter.js';

const logBackendError = (functionName, error) => {
  console.error(`\n${'='.repeat(50)}`);
  console.error(`❌ ERROR DETECTADO EN: ${functionName}`);
  console.error('MENSAJE:', error?.message);
  if (error?.sql) console.error('SQL FALLIDO:', error.sql);
  if (error?.sqlMessage) console.error('ERROR MYSQL:', error.sqlMessage);
  console.error('='.repeat(50));
  console.error('');
};

/**
 * Redondea valores monetarios a 2 decimales
 */
const roundMoney = (value) => Number((Number(value) || 0).toFixed(2));

export const PUC_GROUPS_CATALOG = {
  '51': 'Operacionales de Administración (Nómina, Arriendos, Servicios)',
  '52': 'Operacionales de Ventas (Publicidad, Empaques)',
  '53': 'No Operacionales (Gastos Financieros, Extraordinarios)'
};

// Subcuentas por grupo (catálogo localizado para uso en formularios)
export const PUC_SUBACCOUNTS = {
  '51': {
    '510506': 'Sueldos',
    '510515': 'Horas extras',
    '510518': 'Comisiones',
    '511010': 'Honorarios contador',
    '512010': 'Arrendamientos',
    '513505': 'Aseo y vigilancia',
    '513515': 'Asistencia técnica',
    '513520': 'Procesamiento electrónico de datos',
    '513525': 'Acueducto y alcantarillado',
    '513530': 'Energía eléctrica',
    '513535': 'Teléfono e internet',
    '513540': 'Correo y mensajería',
    '513595': 'Otros servicios',
    '514515': 'Mantenimiento y reparaciones',
    '515005': 'Adecuación e instalación',
    '516005': 'Depreciaciones',
    '519595': 'Gastos diversos'
  },

  '52': {
    '520506': 'Sueldos ventas',
    '520515': 'Comisiones ventas',
    '521020': 'Publicidad y propaganda',
    '522010': 'Arrendamientos ventas',
    '523535': 'Servicios ventas',
    '523595': 'Gastos comerciales diversos',
    '524540': 'Empaques comerciales',
    '525505': 'Transporte y domicilios',
    '529505': 'Promociones y eventos',
    '529595': 'Gastos ventas diversos'
  },

  '53': {
    '530505': 'Gastos bancarios',
    '530510': 'Comisiones bancarias',
    '530515': 'Intereses',
    '530520': 'Diferencia en cambio',
    '530525': 'Gravamen financiero 4x1000',
    '531005': 'Pérdida venta activos',
    '531515': 'Multas y sanciones',
    '539505': 'Gastos extraordinarios',
    '539595': 'Gastos diversos'
  }
};

// Catalogo de 2 digitos solo para filtros/etiquetado visual.
// Ningun asiento se registra con estas cuentas: los INSERT exigen 6 digitos.

export const getPucGroupsCatalog = () => Object.entries(PUC_GROUPS_CATALOG).map(([codigo, nombre]) => ({
  codigo,
  nombre,
  etiqueta: `${codigo} - ${nombre}`
}));

export const getPucSubaccountsCatalog = (groupCode = '') => {
  const code = normalizeGroupCode(groupCode);
  if (!code) return [];
  const map = PUC_SUBACCOUNTS[code] || {};
  return Object.entries(map).map(([codigo, nombre]) => ({
    codigo,
    nombre,
    etiqueta: `${codigo} - ${nombre}`
  }));
};

const normalizeGroupCode = (value = '') => {
  const match = String(value || '').match(/^(\d{2})/);
  return match ? match[1] : '';
};

export const filterPucAccountsByGroup = (accounts = [], groupCode = '') => {
  const code = normalizeGroupCode(groupCode);
  if (!code) return [];

  return (accounts || []).filter((item) => String(item?.codigo || '').startsWith(code));
};

export const isCuentaInAllowedGroup = (cuenta = '', groupCode = '') => {
  const cuentaCode = String(cuenta || '').trim();
  if (!/^\d{6}$/.test(cuentaCode)) return false;
  const group = normalizeGroupCode(groupCode);
  return !!group && cuentaCode.startsWith(group);
};

export async function getPucAccountsByGroup(connection, groupCode) {
  const code = normalizeGroupCode(groupCode);
  if (!code) return [];

  const [rows] = await connection.query(
    `SELECT codigo, nombre, tipo, naturaleza, reporte
     FROM plan_unico_cuentas
     WHERE codigo REGEXP '^[0-9]{6}$'
       AND LEFT(codigo, 2) = ?
     ORDER BY codigo ASC`,
    [code]
  );

  return (rows || []).map((row) => ({
    codigo: String(row.codigo || '').trim(),
    nombre: String(row.nombre || '').trim(),
    tipo: row.tipo || null,
    naturaleza: row.naturaleza || null,
    reporte: row.reporte || null,
    etiqueta: `${row.codigo} - ${row.nombre}`
  }));
}

/**
 * Mapea el campo clase_puc de la tabla costos al código PUC de 6 dígitos.
 * El campo llega como string con formato "NN - Descripción" (ej: "61 - Costo de Ventas - Alimentos").
 *
 * Códigos PUC para costos de restaurante:
 *   61 → 613501  Costo de Venta - Alimentos
 *   71 → 710501  Costos de Producción/Operación
 *   Default     → 613501
 *
 * @param {string} clasePuc - Valor del campo clase_puc
 * @returns {string} Código PUC de 6 dígitos
 */
export const mapClasePucToCuentaCosto = (clasePuc) => {
  const match = String(clasePuc || '').match(/^(\d{2})/);
  const grupo = match?.[1];
  const mapa = {
    '61': '613501',
    '71': '710501'
  };
  if (mapa[grupo]) return mapa[grupo];
  const digit = String(clasePuc || '').charAt(0);
  if (digit === '7') return '710501';
  return '613501';
};

/**
 * Mapea el campo grupo_puc del formulario al código de 6 dígitos de plan_unico_cuentas.
 */
export const mapGrupoPucToCuentaGasto = (grupoPuc) => {
  const grupo = normalizeGroupCode(grupoPuc);
  const mapa = {
    '15': '152405',
    '51': '519595',
    '52': '529595',
    '53': '539505',
    '61': '613501'
  };
  return mapa[grupo] || '519595';
};

export const mapFuentePagoToCuentaSalida = (fuentePago) => {
  const fuente = String(fuentePago || '').trim().toUpperCase();
  const mapa = {
    CAJA_MENOR: '110510',
    BANCO: '111005',
    CAJA_GENERAL: '110505'
  };
  return mapa[fuente] || '110505';
};

export const mapFormaPagoCompraToCuentaCredito = (formaPago) => {
  const forma = String(formaPago || '').trim().toUpperCase();
  if (forma.includes('CRÉDITO') || forma.includes('CREDITO')) {
    // 233505 - Costos y Gastos por Pagar (pasivo: queda a deber al proveedor)
    return '233505';
  }
  // 110505 - Caja General (pago de contado) - Caja Punto de Venta
  return '110505';
};

export const mapTipoArticuloToCuentaInventario = (tipo) => {
  const tipoNormalizado = String(tipo || '').trim().toLowerCase();
  const mapa = {
    insumo: '143501',
    materia_prima: '143502',
    empaque: '143503'
  };
  return mapa[tipoNormalizado] || '143501';
};

const validarFormatoCuenta = (cuenta) => /^\d{6}$/.test(String(cuenta).trim());


export async function insertarMovimiento(connection, datos) {
  const {
    fecha = new Date(),
    cuenta,
    tipo_movimiento,
    monto,
    descripcion,
    referencia_tabla,
    referencia_id
  } = datos;

  // Normalizar fecha a formato SQL consistente: YYYY-MM-DD HH:mm:00
  let fechaNormalizada;
  try {
    fechaNormalizada = normalizeDateTimeForSQL(fecha);
  } catch (error) {
    logBackendError('insertarMovimiento', error);
    throw new Error(`Error al procesar fecha en insertarMovimiento: ${error.message}`);
  }

  if (!validarFormatoCuenta(cuenta)) {
    throw new Error(`Cuenta PUC inválida: ${cuenta}. Debe ser un código de 6 dígitos.`);
  }

  const tipoNormalizado = String(tipo_movimiento || '').trim().toUpperCase();
  if (!['DEBITO', 'CREDITO'].includes(tipoNormalizado)) {
    throw new Error(`Tipo de movimiento inválido: ${tipo_movimiento}. Use DEBITO o CREDITO.`);
  }

  const tipoParaDb = tipoNormalizado === 'DEBITO' ? 'Debito' : 'Credito';

  const montoRedondeado = roundMoney(monto);
  if (montoRedondeado <= 0) {
    throw new Error(`Monto debe ser mayor a 0. Recibido: ${monto}`);
  }

  if (!referencia_tabla) {
    throw new Error('Referencia de tabla es requerida para trazar la transacción.');
  }

  // Aceptar 0 como referencia válida para ajustes iniciados desde la UI.
  const referenciaIdNum = referencia_id == null ? null : Number(referencia_id);
  if (referenciaIdNum !== null && !Number.isFinite(referenciaIdNum)) {
    throw new Error('referencia_id inválido. Debe ser numérico (puede ser 0).');
  }

  if (referenciaIdNum === 0) {
    console.log('[contabilidadService] Insertando movimiento con referencia_id = 0 (ajuste contable UI)');
  }

  const query = `
    INSERT INTO movimientos_contables (
      fecha,
      cuenta_codigo,
      tipo_movimiento,
      monto,
      referencia_tabla,
      referencia_id,
      descripcion
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await connection.query(query, [
    fechaNormalizada,
    cuenta,
    tipoParaDb,
    montoRedondeado,
    referencia_tabla,
    referenciaIdNum,
    descripcion
  ]);

  return Number(result?.insertId || 0);
}

export async function registrarAsientoVenta(connection, payload) {
  const {
    total_venta,
    aporte_servicio = 0,
    metodo_pago = 'Efectivo',
    referencia_id,
    comanda_id
  } = payload;

  if (!referencia_id || !comanda_id) {
    throw new Error('referencia_id y comanda_id son requeridos para registrar venta.');
  }

  const montoVenta = roundMoney(total_venta);
  const montoServicio = roundMoney(aporte_servicio);
  if (montoVenta < 0 || montoServicio < 0) {
    throw new Error('total_venta y aporte_servicio no pueden ser negativos.');
  }

  const montoRecaudoTotal = roundMoney(montoVenta + montoServicio);
  if (montoRecaudoTotal <= 0) {
    throw new Error('El recaudo total de la venta debe ser mayor a 0.');
  }

  // Normalizar fecha (actualizar en DB con tiempo actualizado)
  const ahora = normalizeDateTimeForSQL(new Date());

  let cuentaDebito;
  if (metodo_pago === 'Efectivo' || metodo_pago === 'Mixto') {
    cuentaDebito = '110505';
  } else if (metodo_pago === 'Transferencia' || metodo_pago === 'Tarjeta') {
    cuentaDebito = '111005';
  } else {
    cuentaDebito = '110505';
  }

  const movimientoIds = [];

  const creditoVentaId = await insertarMovimiento(connection, {
    fecha: ahora,
    cuenta: '413501',
    tipo_movimiento: 'CREDITO',
    monto: montoVenta,
    descripcion: `Venta Alimentos Comanda #${comanda_id}`,
    referencia_tabla: 'ingresos_ventas',
    referencia_id
  });
  movimientoIds.push(creditoVentaId);

  if (montoServicio > 0) {
    const creditoServicioId = await insertarMovimiento(connection, {
      fecha: ahora,
      cuenta: '238505',
      tipo_movimiento: 'CREDITO',
      monto: montoServicio,
      descripcion: `Servicio Voluntario - Comanda #${comanda_id}`,
      referencia_tabla: 'ingresos_ventas',
      referencia_id
    });
    movimientoIds.push(creditoServicioId);
  }

  const debitoRecaudoId = await insertarMovimiento(connection, {
    fecha: ahora,
    cuenta: cuentaDebito,
    tipo_movimiento: 'DEBITO',
    monto: montoRecaudoTotal,
    descripcion: `Recaudo Total Comanda #${comanda_id}`,
    referencia_tabla: 'ingresos_ventas',
    referencia_id
  });
  movimientoIds.push(debitoRecaudoId);

  return movimientoIds;
}

export async function registrarAsientoEgreso(connection, payload) {
  const { monto, cuenta_puc, referencia_id, tabla, descripcion } = payload;

  if (!cuenta_puc || !referencia_id || !tabla) {
    throw new Error('cuenta_puc, referencia_id y tabla son requeridos para registrar egreso.');
  }

  if (!['gastos', 'costos'].includes(tabla)) {
    throw new Error(`Tabla inválida: ${tabla}. Use 'gastos' o 'costos'.`);
  }

  const cuentaStr = String(cuenta_puc).trim();
  if (!validarFormatoCuenta(cuentaStr)) {
    throw new Error(`Cuenta PUC inválida: ${cuentaStr}`);
  }

  const primerDigito = cuentaStr.charAt(0);
  if (!['5', '6'].includes(primerDigito)) {
    throw new Error(`Cuenta debe ser de egreso (5xx o 6xx). Recibida: ${cuentaStr}`);
  }

  const montoEgreso = roundMoney(monto);
    const ahora = normalizeDateTimeForSQL(new Date());
  const desc = `${tabla === 'gastos' ? 'Gasto' : 'Costo'}: ${descripcion}`;

  const debitoId = await insertarMovimiento(connection, {
    fecha: ahora,
    cuenta: cuentaStr,
    tipo_movimiento: 'DEBITO',
    monto: montoEgreso,
    descripcion: desc,
    referencia_tabla: tabla,
    referencia_id
  });

  const creditoId = await insertarMovimiento(connection, {
    fecha: ahora,
    cuenta: '110505',
    tipo_movimiento: 'CREDITO',
    monto: montoEgreso,
    descripcion: desc,
    referencia_tabla: tabla,
    referencia_id
  });

  return [debitoId, creditoId];
}

export async function registrarAsientoMovimientoCaja(connection, payload) {
  const { monto, tipo_movimiento, referencia_id, descripcion = '' } = payload;

  if (!referencia_id) {
    throw new Error('referencia_id es requerido para registrar movimiento de caja.');
  }

  if (!['AHORROS', 'RETIRO_SOCIOS'].includes(tipo_movimiento)) {
    throw new Error(`Tipo de movimiento inválido: ${tipo_movimiento}. Use AHORROS o RETIRO_SOCIOS.`);
  }

  const montoMovimiento = roundMoney(monto);
    const ahora = normalizeDateTimeForSQL(new Date());

  let cuentaDebito;
  let tipoDesc;

  if (tipo_movimiento === 'AHORROS') {
    cuentaDebito = '110515';
    tipoDesc = `Ahorro en Banco${descripcion ? ` - ${descripcion}` : ''}`;
  } else {
    cuentaDebito = '311505';
    tipoDesc = `Retiro de Socios${descripcion ? ` - ${descripcion}` : ''}`;
  }

  const debitoId = await insertarMovimiento(connection, {
    fecha: ahora,
    cuenta: cuentaDebito,
    tipo_movimiento: 'DEBITO',
    monto: montoMovimiento,
    descripcion: tipoDesc,
    referencia_tabla: 'arqueos_caja',
    referencia_id
  });

  const creditoId = await insertarMovimiento(connection, {
    fecha: ahora,
    cuenta: '110505',
    tipo_movimiento: 'CREDITO',
    monto: montoMovimiento,
    descripcion: tipoDesc,
    referencia_tabla: 'arqueos_caja',
    referencia_id
  });

  return [debitoId, creditoId];
}

export async function registrarAsientoCompra(connection, payload) {
  const {
    compra_id,
    monto,
    forma_pago = 'Contado',
    fecha = null,
    numero_documento = '',
    cuenta_inventario = '143501',
    detalles = []
  } = payload;

  if (!compra_id) {
    throw new Error('compra_id es requerido para registrar asiento de compra.');
  }

  console.log(`🚀 Iniciando proceso contable para compra ID: ${compra_id}`);

  const montoCompra = roundMoney(monto);
  await connection.query(
    'DELETE FROM movimientos_contables WHERE referencia_tabla = ? AND referencia_id = ?',
    ['compras', Number(compra_id)]
  );

  if (montoCompra <= 0) {
    return [];
  }

  const cuentaCredito = mapFormaPagoCompraToCuentaCredito(forma_pago);
  const fechaMovimiento = normalizeDateTimeForSQL(fecha);
  const descripcion = `Compra inventario${numero_documento ? ` ${numero_documento}` : ` #${compra_id}`}`;
  const insertedIds = [];

  const groupedByCuenta = new Map();
  for (const detalle of Array.isArray(detalles) ? detalles : []) {
    const subtotal = roundMoney(detalle?.valor_subtotal);
    if (subtotal <= 0) continue;

    const cuentaInventario = mapTipoArticuloToCuentaInventario(detalle?.articulo_tipo);
    if (!validarFormatoCuenta(cuentaInventario)) {
      throw new Error(`Cuenta de inventario inválida para tipo ${detalle?.articulo_tipo}: ${cuentaInventario}`);
    }

    groupedByCuenta.set(
      cuentaInventario,
      roundMoney((groupedByCuenta.get(cuentaInventario) || 0) + subtotal)
    );
  }

  if (!groupedByCuenta.size) {
    if (!validarFormatoCuenta(cuenta_inventario)) {
      throw new Error(`Cuenta de inventario inválida: ${cuenta_inventario}`);
    }
    groupedByCuenta.set(cuenta_inventario, montoCompra);
  }

  for (const [cuentaInventario, totalCuenta] of groupedByCuenta.entries()) {
    insertedIds.push(await insertarMovimiento(connection, {
      fecha: fechaMovimiento,
      cuenta: cuentaInventario,
      tipo_movimiento: 'DEBITO',
      monto: totalCuenta,
      descripcion,
      referencia_tabla: 'compras',
      referencia_id: Number(compra_id)
    }));
  }

  insertedIds.push(await insertarMovimiento(connection, {
    fecha: fechaMovimiento,
    cuenta: cuentaCredito,
    tipo_movimiento: 'CREDITO',
    monto: montoCompra,
    descripcion,
    referencia_tabla: 'compras',
    referencia_id: Number(compra_id)
  }));

  return insertedIds;
}

export async function sincronizarAsientoMovimientoInventario(connection, payload) {
  const {
    movimiento_id,
    tipo_movimiento,
    articulo_tipo,
    total_entrada = 0,
    total_salida = 0,
    fecha = null,
    documento_referencia = ''
  } = payload;

  if (!movimiento_id) {
    throw new Error('movimiento_id es requerido para sincronizar asiento de inventario.');
  }

  await connection.query(
    'DELETE FROM movimientos_contables WHERE referencia_tabla = ? AND referencia_id = ?',
    ['kardex_articulos', Number(movimiento_id)]
  );

  const tipo = String(tipo_movimiento || '').trim().toUpperCase();
  const monto = roundMoney(tipo === 'ENTRADA' ? total_entrada : total_salida);
  if (monto <= 0) return [];

  const cuentaInventario = mapTipoArticuloToCuentaInventario(articulo_tipo);
  const cuentaContrapartida = tipo === 'ENTRADA' ? '310505' : '613501';
  const fechaMovimiento = normalizeDateTimeForSQL(fecha);
  const descripcion = `Kardex ${tipo}${documento_referencia ? ` - ${documento_referencia}` : ''}`;

  if (!validarFormatoCuenta(cuentaInventario) || !validarFormatoCuenta(cuentaContrapartida)) {
    throw new Error('Las cuentas del asiento de inventario deben tener 6 dígitos.');
  }

  if (tipo === 'ENTRADA') {
    const debitoId = await insertarMovimiento(connection, {
      fecha: fechaMovimiento,
      cuenta: cuentaInventario,
      tipo_movimiento: 'DEBITO',
      monto,
      descripcion,
      referencia_tabla: 'kardex_articulos',
      referencia_id: Number(movimiento_id)
    });

    const creditoId = await insertarMovimiento(connection, {
      fecha: fechaMovimiento,
      cuenta: cuentaContrapartida,
      tipo_movimiento: 'CREDITO',
      monto,
      descripcion,
      referencia_tabla: 'kardex_articulos',
      referencia_id: Number(movimiento_id)
    });

    return [debitoId, creditoId];
  }

  const debitoId = await insertarMovimiento(connection, {
    fecha: fechaMovimiento,
    cuenta: cuentaContrapartida,
    tipo_movimiento: 'DEBITO',
    monto,
    descripcion,
    referencia_tabla: 'kardex_articulos',
    referencia_id: Number(movimiento_id)
  });

  const creditoId = await insertarMovimiento(connection, {
    fecha: fechaMovimiento,
    cuenta: cuentaInventario,
    tipo_movimiento: 'CREDITO',
    monto,
    descripcion,
    referencia_tabla: 'kardex_articulos',
    referencia_id: Number(movimiento_id)
  });

  return [debitoId, creditoId];
}

export async function eliminarAsientoMovimientoInventario(connection, movimientoId) {
  if (!movimientoId) return;
  await connection.query(
    'DELETE FROM movimientos_contables WHERE referencia_tabla = ? AND referencia_id = ?',
    ['kardex_articulos', Number(movimientoId)]
  );
}

/**
 * Registra el asiento contable al pagar una factura de compra a crédito.
 *
 *   DÉBITO:  233505 – Costos y Gastos por Pagar  (reduce la deuda con el proveedor)
 *   CRÉDITO: cuenta_pago                (110510 Caja Operativa / 110515 Ahorros Reserva / 111005 Bancos)
 * 
 *
 * Los movimientos se guardan con referencia_tabla = 'compras' para distinguirlos
 * del asiento de causación (referencia_tabla = 'compras').
 */
export async function registrarAsientoPagoFacturaCompra(connection, payload) {
  const {
    compra_id,
    monto,
    cuenta_pago = '110510',
    fecha = null,
    numero_documento = ''
  } = payload;

  if (!compra_id) {
    throw new Error('compra_id es requerido para registrar pago de factura.');
  }

  const cuentasPermitidas = ['110510', '110515', '111005'];
  if (!cuentasPermitidas.includes(String(cuenta_pago).trim())) {
    throw new Error(`cuenta_pago inválida: ${cuenta_pago}. Use 110510, 110515 o 111005.`);
  }

  const montoPago = roundMoney(monto);
  if (montoPago <= 0) {
    throw new Error('El monto del pago debe ser mayor a 0.');
  }

  const fechaMovimiento = normalizeDateTimeForSQL(fecha || new Date());
  const descripcion = `Pago factura compra${numero_documento ? ` ${numero_documento}` : ` #${compra_id}`}`;

  const debitoId = await insertarMovimiento(connection, {
    fecha: fechaMovimiento,
    cuenta: '233505',
    tipo_movimiento: 'DEBITO',
    monto: montoPago,
    descripcion,
    referencia_tabla: 'compras',
    referencia_id: Number(compra_id)
  });

  const creditoId = await insertarMovimiento(connection, {
    fecha: fechaMovimiento,
    cuenta: String(cuenta_pago).trim(),
    tipo_movimiento: 'CREDITO',
    monto: montoPago,
    descripcion,
    referencia_tabla: 'compras',
    referencia_id: Number(compra_id)
  });

  return [debitoId, creditoId];
}

export async function registrarReversionAsientoCompra(connection, payload) {
  const {
    compra_id,
    numero_documento = '',
    fecha = null
  } = payload;

  if (!compra_id) {
    throw new Error('compra_id es requerido para registrar reversión de compra.');
  }

  await connection.query(
    'DELETE FROM movimientos_contables WHERE referencia_tabla = ? AND referencia_id = ?',
    ['compras_anulacion', Number(compra_id)]
  );

  const [rows] = await connection.query(
    `
      SELECT cuenta_codigo, tipo_movimiento, monto
      FROM movimientos_contables
      WHERE referencia_tabla = ? AND referencia_id = ?
      ORDER BY id ASC
    `,
    ['compras', Number(compra_id)]
  );

  if (!rows.length) {
    return [];
  }

    const fechaMovimiento = normalizeDateTimeForSQL(fecha || new Date());
  const descripcion = `Reversion compra inventario${numero_documento ? ` ${numero_documento}` : ` #${compra_id}`}`;
  const insertedIds = [];

  for (const row of rows) {
    const tipoOriginal = String(row.tipo_movimiento || '').trim().toUpperCase();
    const tipoInvertido = tipoOriginal === 'DEBITO' ? 'CREDITO' : 'DEBITO';

    insertedIds.push(await insertarMovimiento(connection, {
      fecha: fechaMovimiento,
      cuenta: String(row.cuenta_codigo || '').trim(),
      tipo_movimiento: tipoInvertido,
      monto: roundMoney(row.monto),
      descripcion,
      referencia_tabla: 'compras_anulacion',
      referencia_id: Number(compra_id)
    }));
  }

  return insertedIds;
}

export async function obtenerBalanceCuenta(connection, cuenta, fechaInicio = null, fechaFin = null) {
  if (!validarFormatoCuenta(cuenta)) {
    throw new Error(`Cuenta PUC inválida: ${cuenta}`);
  }

  let whereClause = 'WHERE cuenta_codigo = ?';
  const params = [cuenta];

  if (fechaInicio) {
    whereClause += ' AND DATE(fecha) >= ?';
    params.push(fechaInicio);
  }

  if (fechaFin) {
    whereClause += ' AND DATE(fecha) <= ?';
    params.push(fechaFin);
  }

  const query = `
    SELECT
      COALESCE(SUM(CASE WHEN tipo_movimiento = 'Debito' THEN monto ELSE 0 END), 0) as total_debitos,
      COALESCE(SUM(CASE WHEN tipo_movimiento = 'Credito' THEN monto ELSE 0 END), 0) as total_creditos
    FROM movimientos_contables
    ${whereClause}
  `;

  const [rows] = await connection.query(query, params);
  const row = rows?.[0] || {};
  const debit = roundMoney(row.total_debitos || 0);
  const credit = roundMoney(row.total_creditos || 0);

  return roundMoney(debit - credit);
}

export async function obtenerBalancePUC(connection, fechaInicio = null, fechaFin = null) {
  const conditions = [];
  const params = [];

  if (fechaInicio) {
    conditions.push('DATE(fecha) >= ?');
    params.push(fechaInicio);
  }

  if (fechaFin) {
    conditions.push('DATE(fecha) <= ?');
    params.push(fechaFin);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      cuenta_codigo AS cuenta,
      SUM(CASE WHEN tipo_movimiento = 'Debito' THEN monto ELSE 0 END) as total_debitos,
      SUM(CASE WHEN tipo_movimiento = 'Credito' THEN monto ELSE 0 END) as total_creditos
    FROM movimientos_contables
    ${whereClause}
    GROUP BY cuenta_codigo
    ORDER BY cuenta_codigo ASC
  `;

  const [rows] = await connection.query(query, params);
  return (rows || []).map(row => ({
    cuenta: row.cuenta,
    debitos: roundMoney(row.total_debitos || 0),
    creditos: roundMoney(row.total_creditos || 0),
    balance: roundMoney((row.total_debitos || 0) - (row.total_creditos || 0))
  }));
}

export async function rastrearVenta(connection, ventaId) {
  const [ventaRows] = await connection.query(
    `SELECT * FROM ingresos_ventas WHERE id = ? LIMIT 1`,
    [ventaId]
  );

  if (!ventaRows?.length) {
    throw new Error(`Venta no encontrada: ${ventaId}`);
  }

  const venta = ventaRows[0];

  const [movimientos] = await connection.query(
    `SELECT * FROM movimientos_contables
     WHERE referencia_tabla = 'ingresos_ventas' AND referencia_id = ?
     ORDER BY fecha, tipo_movimiento, id`,
    [ventaId]
  );

  return {
    venta: {
      id: venta.id,
      comanda_id: venta.comanda_id,
      numero_factura: venta.numero_factura,
      total_pagado: roundMoney(venta.total_pagado),
      metodo_pago: venta.metodo_pago,
      fecha: venta.fecha_registro
    },
    movimientos: (movimientos || []).map(m => ({
      id: m.id,
      cuenta: m.cuenta_codigo,
      tipo: m.tipo_movimiento,
      monto: roundMoney(m.monto),
      fecha: m.fecha,
      descripcion: m.descripcion
    }))
  };
}

export async function registrarCausacionGasto(connection, { monto, cuenta_puc, gasto_id, descripcion = '' }) {
  if (!gasto_id) throw new Error('gasto_id es requerido para registrar causación de gasto.');

  const cuentaStr = String(cuenta_puc || '').trim();
  if (!validarFormatoCuenta(cuentaStr)) {
    throw new Error(`Cuenta PUC inválida para causación: ${cuentaStr}. Debe tener 6 dígitos.`);
  }
  if (!['5', '6'].includes(cuentaStr.charAt(0))) {
    throw new Error(`La cuenta de gasto debe iniciar en 5 o 6. Recibida: ${cuentaStr}`);
  }

  const montoGasto = roundMoney(monto);
  if (montoGasto <= 0) throw new Error(`Monto de causación debe ser mayor a 0. Recibido: ${monto}`);

  const ahora = normalizeDateTimeForSQL(new Date());
  const desc = `Causación Gasto${descripcion ? ` - ${descripcion}` : ''}`;

  const debitoId = await insertarMovimiento(connection, {
    fecha: ahora,
    cuenta: cuentaStr,
    tipo_movimiento: 'DEBITO',
    monto: montoGasto,
    descripcion: desc,
    referencia_tabla: 'gastos',
    referencia_id: gasto_id
  });

  const creditoId = await insertarMovimiento(connection, {
    fecha: ahora,
    cuenta: '233505',
    tipo_movimiento: 'CREDITO',
    monto: montoGasto,
    descripcion: desc,
    referencia_tabla: 'gastos',
    referencia_id: gasto_id
  });

  return [debitoId, creditoId];
}

export async function registrarPagoGasto(connection, { monto, gasto_id, descripcion = '', fuente_pago = 'CAJA_GENERAL' }) {
  if (!gasto_id) throw new Error('gasto_id es requerido para registrar pago de gasto.');

  const montoPago = roundMoney(monto);
  if (montoPago <= 0) throw new Error(`Monto de pago debe ser mayor a 0. Recibido: ${monto}`);

  const cuentaSalida = mapFuentePagoToCuentaSalida(fuente_pago);
  const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const desc = `Pago Gasto${descripcion ? ` - ${descripcion}` : ''}`;

  const debitoId = await insertarMovimiento(connection, {
    fecha: ahora,
    cuenta: '233505',
    tipo_movimiento: 'DEBITO',
    monto: montoPago,
    descripcion: desc,
    referencia_tabla: 'gastos',
    referencia_id: gasto_id
  });

  const creditoId = await insertarMovimiento(connection, {
    fecha: ahora,
    cuenta: cuentaSalida,
    tipo_movimiento: 'CREDITO',
    monto: montoPago,
    descripcion: desc,
    referencia_tabla: 'gastos',
    referencia_id: gasto_id
  });

  return [debitoId, creditoId];
}

export async function registrarPagoCosto(connection, { monto, costo_id, descripcion = '', fuente_pago = 'CAJA_GENERAL' }) {
  if (!costo_id) throw new Error('costo_id es requerido para registrar pago de costo.');

  const montoPago = roundMoney(monto);
  if (montoPago <= 0) throw new Error(`Monto de pago debe ser mayor a 0. Recibido: ${monto}`);

  const cuentaSalida = mapFuentePagoToCuentaSalida(fuente_pago);
  const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const desc = `Pago Costo${descripcion ? ` - ${descripcion}` : ''}`;

  const debitoId = await insertarMovimiento(connection, {
    fecha: ahora,
    cuenta: '233505',
    tipo_movimiento: 'DEBITO',
    monto: montoPago,
    descripcion: desc,
    referencia_tabla: 'costos',
    referencia_id: costo_id
  });

  const creditoId = await insertarMovimiento(connection, {
    fecha: ahora,
    cuenta: cuentaSalida,
    tipo_movimiento: 'CREDITO',
    monto: montoPago,
    descripcion: desc,
    referencia_tabla: 'costos',
    referencia_id: costo_id
  });

  return [debitoId, creditoId];
}

export async function revertirAsientosGasto(connection, { gasto_id, descripcion = '' }) {
  if (!gasto_id) throw new Error('gasto_id es requerido para revertir asientos de gasto.');

  const [movimientos] = await connection.query(
    `SELECT id, cuenta_codigo, tipo_movimiento, monto
     FROM movimientos_contables
     WHERE referencia_tabla = 'gastos' AND referencia_id = ?
     ORDER BY id ASC`,
    [Number(gasto_id)]
  );

  if (!movimientos?.length) {
    throw new Error(`No existen movimientos contables para revertir en gasto #${gasto_id}.`);
  }

  const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const desc = `Reversión anulación gasto #${gasto_id}${descripcion ? ` - ${descripcion}` : ''}`;
  const ids = [];

  for (const mov of movimientos) {
    const tipoOriginal = String(mov.tipo_movimiento || '').trim().toUpperCase();
    const tipoInverso = tipoOriginal === 'DEBITO' ? 'CREDITO' : 'DEBITO';

    const movimientoId = await insertarMovimiento(connection, {
      fecha: ahora,
      cuenta: String(mov.cuenta_codigo || '').trim(),
      tipo_movimiento: tipoInverso,
      monto: roundMoney(mov.monto),
      descripcion: desc,
      referencia_tabla: 'gastos',
      referencia_id: Number(gasto_id)
    });

    ids.push(movimientoId);
  }

  return ids;
}

export async function registrarCausacionCosto(connection, { monto, cuenta_puc, costo_id, descripcion = '' }) {
  if (!costo_id) throw new Error('costo_id es requerido para registrar causación de costo.');

  const cuentaStr = String(cuenta_puc || '').trim();
  if (!validarFormatoCuenta(cuentaStr)) {
    throw new Error(`Cuenta PUC inválida para causación: ${cuentaStr}. Debe tener 6 dígitos.`);
  }
  if (!['6', '7'].includes(cuentaStr.charAt(0))) {
    throw new Error(`La cuenta de costo debe iniciar en 6 o 7. Recibida: ${cuentaStr}`);
  }

  const montoCosto = roundMoney(monto);
  if (montoCosto <= 0) throw new Error(`Monto de causación debe ser mayor a 0. Recibido: ${monto}`);

  const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const desc = `Causación Costo${descripcion ? ` - ${descripcion}` : ''}`;

  const debitoId = await insertarMovimiento(connection, {
    fecha: ahora,
    cuenta: cuentaStr,
    tipo_movimiento: 'DEBITO',
    monto: montoCosto,
    descripcion: desc,
    referencia_tabla: 'costos',
    referencia_id: costo_id
  });

  const creditoId = await insertarMovimiento(connection, {
    fecha: ahora,
    cuenta: '233505',
    tipo_movimiento: 'CREDITO',
    monto: montoCosto,
    descripcion: desc,
    referencia_tabla: 'costos',
    referencia_id: costo_id
  });

  return [debitoId, creditoId];
}

export async function revertirAsientosCosto(connection, { costo_id, descripcion = '' }) {
  if (!costo_id) throw new Error('costo_id es requerido para revertir asientos de costo.');

  const [movimientos] = await connection.query(
    `SELECT id, cuenta_codigo, tipo_movimiento, monto
     FROM movimientos_contables
     WHERE referencia_tabla = 'costos' AND referencia_id = ?
     ORDER BY id ASC`,
    [Number(costo_id)]
  );

  if (!movimientos?.length) {
    throw new Error(`No existen movimientos contables para revertir en costo #${costo_id}.`);
  }

  const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const desc = `Reversión anulación costo #${costo_id}${descripcion ? ` - ${descripcion}` : ''}`;
  const ids = [];

  for (const mov of movimientos) {
    const tipoOriginal = String(mov.tipo_movimiento || '').trim().toUpperCase();
    const tipoInverso = tipoOriginal === 'DEBITO' ? 'CREDITO' : 'DEBITO';

    const movimientoId = await insertarMovimiento(connection, {
      fecha: ahora,
      cuenta: String(mov.cuenta_codigo || '').trim(),
      tipo_movimiento: tipoInverso,
      monto: roundMoney(mov.monto),
      descripcion: desc,
      referencia_tabla: 'costos',
      referencia_id: Number(costo_id)
    });

    ids.push(movimientoId);
  }

  return ids;
}

export default {
  registrarAsientoVenta,
  registrarAsientoEgreso,
  registrarAsientoMovimientoCaja,
  registrarAsientoCompra,
  registrarReversionAsientoCompra,
  registrarAsientoPagoFacturaCompra,
  sincronizarAsientoMovimientoInventario,
  eliminarAsientoMovimientoInventario,
  registrarCausacionGasto,
  registrarPagoGasto,
  registrarPagoCosto,
  revertirAsientosGasto,
  registrarCausacionCosto,
  revertirAsientosCosto,
  mapFormaPagoCompraToCuentaCredito,
  mapTipoArticuloToCuentaInventario,
  mapFuentePagoToCuentaSalida,
  obtenerBalanceCuenta,
  obtenerBalancePUC,
  rastrearVenta,
  insertarMovimiento,
  roundMoney,
  validarFormatoCuenta,
  PUC_GROUPS_CATALOG,
  getPucGroupsCatalog,
  getPucSubaccountsCatalog,
  PUC_SUBACCOUNTS,
  filterPucAccountsByGroup,
  isCuentaInAllowedGroup,
  getPucAccountsByGroup
};
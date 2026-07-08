import db from '../config/db.js';
import { PUC_GROUPS_CATALOG } from '../services/contabilidadService.js';

const roundMoney = (value) => Number((Number(value) || 0).toFixed(2));

const MONTHS_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
];

const GROUP_LABEL_FALLBACK = {
  ...PUC_GROUPS_CATALOG,
  '41': 'Ingresos Operacionales',
  '42': 'Ingresos No Operacionales',
  '61': 'Costo de Ventas',
  '71': 'Costos de Produccion u Operacion'
};

const resolveGroupName = (groupCode, dbName = '') => {
  const group = String(groupCode || '').trim();
  const name = String(dbName || '').trim();
  if (name) return name;
  return GROUP_LABEL_FALLBACK[group] || `Grupo ${group}`;
};

const toInt = (value, fallback = 0) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getPeriodRange = (year, month) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const toSqlDate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    start: toSqlDate(start),
    end: toSqlDate(end)
  };
};

const normalizeClassAmount = (clase, debitos, creditos) => {
  const d = roundMoney(debitos || 0);
  const c = roundMoney(creditos || 0);

  if (clase === '4') {
    return roundMoney(c - d);
  }

  if (clase === '5' || clase === '6') {
    return roundMoney(d - c);
  }

  return 0;
};

export const getEstadoResultadosMeta = async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT YEAR(MIN(fecha)) AS first_year
       FROM movimientos_contables`
    );

    const currentYear = new Date().getFullYear();
    const firstYearRaw = toInt(rows?.[0]?.first_year, currentYear);
    const firstYear = firstYearRaw > 1900 ? firstYearRaw : currentYear;

    const years = [];
    for (let year = firstYear; year <= currentYear; year += 1) {
      years.push(year);
    }

    const months = MONTHS_ES.map((label, index) => ({
      value: index + 1,
      label
    }));

    return res.json({
      success: true,
      data: {
        first_year: firstYear,
        current_year: currentYear,
        years,
        months
      }
    });
  } catch (error) {
    console.error('Error en getEstadoResultadosMeta:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener metadatos de Estado de Resultados.'
    });
  }
};

export const getEstadoResultadosMensual = async (req, res) => {
  try {
    const now = new Date();
    const month = toInt(req.query.mes, now.getMonth() + 1);
    const year = toInt(req.query.anio, now.getFullYear());

    if (month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: 'Mes inválido. Debe estar entre 1 y 12.' });
    }

    if (year < 2000 || year > 2100) {
      return res.status(400).json({ success: false, message: 'Año inválido.' });
    }

    const period = getPeriodRange(year, month);

    const [classRows] = await db.query(
      `SELECT
         LEFT(cuenta_codigo, 1) AS clase,
         COALESCE(SUM(CASE WHEN tipo_movimiento = 'Debito' THEN monto ELSE 0 END), 0) AS debitos,
         COALESCE(SUM(CASE WHEN tipo_movimiento = 'Credito' THEN monto ELSE 0 END), 0) AS creditos
       FROM movimientos_contables
       WHERE fecha >= ?
         AND fecha < ?
         AND LEFT(cuenta_codigo, 1) IN ('4', '5', '6')
       GROUP BY LEFT(cuenta_codigo, 1)`,
      [period.start, period.end]
    );

    const classMap = {
      '4': { debitos: 0, creditos: 0 },
      '5': { debitos: 0, creditos: 0 },
      '6': { debitos: 0, creditos: 0 }
    };

    for (const row of classRows || []) {
      const clase = String(row.clase || '').trim();
      if (!classMap[clase]) continue;
      classMap[clase] = {
        debitos: roundMoney(row.debitos || 0),
        creditos: roundMoney(row.creditos || 0)
      };
    }

    const ingresos = normalizeClassAmount('4', classMap['4'].debitos, classMap['4'].creditos);
    const costosVentas = normalizeClassAmount('6', classMap['6'].debitos, classMap['6'].creditos);
    const utilidadBruta = roundMoney(ingresos - costosVentas);

    const [groupRows] = await db.query(
      `SELECT
         LEFT(mc.cuenta_codigo, 1) AS clase,
         LEFT(mc.cuenta_codigo, 2) AS grupo,
         COALESCE(MAX(NULLIF(TRIM(puc.nombre), '')), '') AS nombre,
         COALESCE(SUM(CASE WHEN mc.tipo_movimiento = 'Debito' THEN mc.monto ELSE 0 END), 0) AS debitos,
         COALESCE(SUM(CASE WHEN mc.tipo_movimiento = 'Credito' THEN mc.monto ELSE 0 END), 0) AS creditos
       FROM movimientos_contables mc
       LEFT JOIN plan_unico_cuentas puc
         ON puc.codigo = CONCAT(LEFT(mc.cuenta_codigo, 2), '0000')
       WHERE mc.fecha >= ?
         AND mc.fecha < ?
         AND LEFT(mc.cuenta_codigo, 1) IN ('4', '5', '6')
       GROUP BY LEFT(mc.cuenta_codigo, 1), LEFT(mc.cuenta_codigo, 2)
       ORDER BY LEFT(mc.cuenta_codigo, 1) ASC, LEFT(mc.cuenta_codigo, 2) ASC`,
      [period.start, period.end]
    );

    const detailsByClass = {
      '4': [],
      '5': [],
      '6': []
    };

    for (const row of groupRows || []) {
      const clase = String(row.clase || '').trim();
      const grupo = String(row.grupo || '').trim();
      if (!detailsByClass[clase] || !grupo) continue;

      const debitos = roundMoney(row.debitos || 0);
      const creditos = roundMoney(row.creditos || 0);
      const total = normalizeClassAmount(clase, debitos, creditos);
      if (Math.abs(total) <= 0.009) continue;

      detailsByClass[clase].push({
        grupo,
        nombre: resolveGroupName(grupo, row.nombre),
        debitos,
        creditos,
        total
      });
    }

    const gastosOperacionales = normalizeClassAmount('5', classMap['5'].debitos, classMap['5'].creditos);

    const utilidadNeta = roundMoney(utilidadBruta - gastosOperacionales);

    return res.json({
      success: true,
      data: {
        periodo: {
          anio: year,
          mes: month,
          mes_nombre: MONTHS_ES[month - 1],
          fecha_inicio: period.start,
          fecha_fin_exclusiva: period.end,
          etiqueta: `${MONTHS_ES[month - 1]} ${year}`
        },
        clases: {
          ingresos_4: {
            debitos: classMap['4'].debitos,
            creditos: classMap['4'].creditos,
            total: ingresos
          },
          gastos_5: {
            debitos: classMap['5'].debitos,
            creditos: classMap['5'].creditos,
            total: normalizeClassAmount('5', classMap['5'].debitos, classMap['5'].creditos)
          },
          costos_6: {
            debitos: classMap['6'].debitos,
            creditos: classMap['6'].creditos,
            total: costosVentas
          }
        },
        resumen: {
          ingresos,
          costos_ventas: costosVentas,
          utilidad_bruta: utilidadBruta,
          gastos_operacionales: gastosOperacionales,
          utilidad_neta: utilidadNeta
        },
        ingresos: {
          total: ingresos,
          detalles: detailsByClass['4']
        },
        gastos: {
          total: gastosOperacionales,
          detalles: detailsByClass['5']
        },
        costos: {
          total: costosVentas,
          detalles: detailsByClass['6']
        },
        gastos_desglosados: detailsByClass['5']
      }
    });
  } catch (error) {
    console.error('Error en getEstadoResultadosMensual:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al generar Estado de Resultados.'
    });
  }
};

import db from '../config/db.js';

/**
 * Obtiene todos los registros de auditoría con filtros opcionales
 * - Filter por tabla_nombre
 * - Filter por operacion (INSERT, UPDATE, DELETE)
 * - Filter por rango de fechas
 * - Limit y offset para paginación
 */
export const obtenerAuditoria = async (req, res) => {
  try {
    const { tabla, operacion, fechaDesde, fechaHasta, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT 
        a.id,
        a.tabla_nombre,
        CASE 
          WHEN a.operacion = 'INSERT' THEN 'AGREGADO'
          WHEN a.operacion = 'UPDATE' THEN 'ACTUALIZADO'
          WHEN a.operacion = 'DELETE' THEN 'BORRADO'
          ELSE a.operacion 
        END AS operacion_texto,
        a.operacion,
        a.registro_id,
        CONCAT(COALESCE(p.nombres, ''), ' ', COALESCE(p.apellidos, '')) AS usuario_nombre,
        p.id AS usuario_id,
        a.detalles,
        a.fecha
      FROM 
        auditoria a
      LEFT JOIN 
        personal p ON a.personal_id = p.id
      WHERE 1=1
    `;

    const params = [];

    // Filtro por tabla
    if (tabla && tabla.trim()) {
      query += ` AND a.tabla_nombre = ?`;
      params.push(tabla.trim());
    }

    // Filtro por operacion
    if (operacion && ['INSERT', 'UPDATE', 'DELETE'].includes(operacion.toUpperCase())) {
      query += ` AND a.operacion = ?`;
      params.push(operacion.toUpperCase());
    }

    // Filtro por rango de fechas
    if (fechaDesde && fechaDesde.trim()) {
      query += ` AND a.fecha >= ?`;
      params.push(fechaDesde.trim());
    }

    if (fechaHasta && fechaHasta.trim()) {
      query += ` AND a.fecha <= DATE_ADD(?, INTERVAL 1 DAY)`;
      params.push(fechaHasta.trim());
    }

    // Ordenar por fecha descendente
    query += ` ORDER BY a.fecha DESC`;

    // Limitar y paginar
    const parsedLimit = Math.min(parseInt(limit, 10) || 100, 1000);
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

    query += ` LIMIT ? OFFSET ?`;
    params.push(parsedLimit, parsedOffset);

    // Ejecutar query principal
    const [registros] = await db.query(query, params);

    // Query para obtener total sin paginación (para calcular totalPages)
    let queryTotal = `
      SELECT COUNT(*) as total
      FROM auditoria a
      WHERE 1=1
    `;
    const paramsTotal = [];

    if (tabla && tabla.trim()) {
      queryTotal += ` AND a.tabla_nombre = ?`;
      paramsTotal.push(tabla.trim());
    }

    if (operacion && ['INSERT', 'UPDATE', 'DELETE'].includes(operacion.toUpperCase())) {
      queryTotal += ` AND a.operacion = ?`;
      paramsTotal.push(operacion.toUpperCase());
    }

    if (fechaDesde && fechaDesde.trim()) {
      queryTotal += ` AND a.fecha >= ?`;
      paramsTotal.push(fechaDesde.trim());
    }

    if (fechaHasta && fechaHasta.trim()) {
      queryTotal += ` AND a.fecha <= DATE_ADD(?, INTERVAL 1 DAY)`;
      paramsTotal.push(fechaHasta.trim());
    }

    const [[{ total }]] = await db.query(queryTotal, paramsTotal);

    return res.status(200).json({
      success: true,
      data: registros,
      pagination: {
        total,
        limit: parsedLimit,
        offset: parsedOffset,
        totalPages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error('[auditoria] Error al obtener auditoria:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener registros de auditoria.'
    });
  }
};

/**
 * Obtiene un símaple conteo de operaciones por tipo
 */
export const obtenerResumenAuditoria = async (req, res) => {
  try {
    const query = `
      SELECT 
        a.operacion,
        CASE 
          WHEN a.operacion = 'INSERT' THEN 'AGREGADO'
          WHEN a.operacion = 'UPDATE' THEN 'ACTUALIZADO'
          WHEN a.operacion = 'DELETE' THEN 'BORRADO'
          ELSE a.operacion 
        END AS operacion_texto,
        COUNT(*) as cantidad
      FROM 
        auditoria a
      GROUP BY 
        a.operacion
      ORDER BY 
        a.operacion ASC
    `;

    const [resumen] = await db.query(query);

    return res.status(200).json({
      success: true,
      data: resumen
    });
  } catch (error) {
    console.error('[auditoria] Error al obtener resumen auditoria:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener resumen de auditoria.'
    });
  }
};

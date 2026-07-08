import db from '../config/db.js';

export const listUsuariosConRol = async () => {
  const [rows] = await db.query(`
    SELECT u.id, u.username, u.nombre_completo, r.nombre as rol
    FROM usuarios u
    LEFT JOIN roles r ON u.role_id = r.id
    ORDER BY u.id DESC
  `);

  return rows;
};

export const createUsuario = async ({ username, password, nombre_completo, role_id }) => {
  const [result] = await db.query(
    'INSERT INTO usuarios (username, password, nombre_completo, role_id) VALUES (?, ?, ?, ?)',
    [username, password, nombre_completo, role_id]
  );

  return result.insertId;
};

export const getReporteSemanal = async () => {
  const [rows] = await db.query(`
    SELECT
      DATE_FORMAT(fecha_hora, '%Y-%m-%d') AS fecha,
      SUM(total_sin_servicio) AS sub_total,
      SUM(servicio_voluntario) AS aporte_servicio,
      SUM(total_final) AS total_pagado
    FROM comandas
    WHERE estado_comanda = 'Pagada'
      AND fecha_hora >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
    GROUP BY DATE_FORMAT(fecha_hora, '%Y-%m-%d')
    ORDER BY DATE_FORMAT(fecha_hora, '%Y-%m-%d') ASC
  `);

  return rows.map((row) => ({
    fecha: row.fecha,
    sub_total: Number(row.sub_total) || 0,
    aporte_servicio: Number(row.aporte_servicio) || 0,
    total_pagado: Number(row.total_pagado) || 0
  }));
};

export const getStatsHoy = async () => {
  const [[stats]] = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM comandas WHERE estado_comanda = 'Abierta' AND DATE(fecha_hora) = CURDATE()) AS abiertas,
      (SELECT COUNT(*) FROM comandas WHERE estado_comanda = 'Cerrada' AND DATE(fecha_hora) = CURDATE()) AS cerradas,
      (SELECT COALESCE(SUM(total_sin_servicio), 0) FROM comandas WHERE estado_comanda = 'Pagada' AND DATE(fecha_hora) = CURDATE()) AS ventas,
      (SELECT COALESCE(SUM(servicio_voluntario), 0) FROM comandas WHERE estado_comanda = 'Pagada' AND DATE(fecha_hora) = CURDATE()) AS servicio,
      (SELECT COALESCE(SUM(total_final), 0) FROM comandas WHERE estado_comanda = 'Pagada' AND DATE(fecha_hora) = CURDATE()) AS ingresos
  `);

  return {
    abiertas: Number(stats.abiertas) || 0,
    cerradas: Number(stats.cerradas) || 0,
    ventas: Number(stats.ventas) || 0,
    servicio: Number(stats.servicio) || 0,
    ingresos: Number(stats.ingresos) || 0
  };
};

export const getSalonServiciosPorMesa = async ({ dias = 14, limitPorMesa = 8 } = {}) => {
  const diasRecientes = Math.max(1, Math.min(Number(dias) || 14, 90));
  const limiteMesa = Math.max(1, Math.min(Number(limitPorMesa) || 8, 30));

  const [rows] = await db.query(
    `SELECT
      m.id AS mesa_id,
      m.numero AS mesa_numero,
      m.nombre AS mesa_nombre,
      m.estado AS mesa_estado,
      c.id AS comanda_id,
      c.fecha_hora,
      c.total_sin_servicio,
      c.servicio_voluntario,
      c.estado_comanda,
      c.forma_pago,
      p.id AS personal_id,
      p.nombres AS personal_nombres,
      p.apellidos AS personal_apellidos,
      p.url_foto AS personal_foto_url
    FROM mesas m
    LEFT JOIN comandas c
      ON c.mesa_id = m.id
      AND (
        c.estado_comanda IN ('Abierta', 'En Proceso', 'Cerrada', 'Pagada')
        OR c.fecha_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)
      )
    LEFT JOIN personal p ON p.id = c.personal_id
    ORDER BY CAST(m.numero AS UNSIGNED) ASC, c.fecha_hora DESC`,
    [diasRecientes]
  );

  const grouped = new Map();

  for (const row of rows || []) {
    if (!grouped.has(row.mesa_id)) {
      grouped.set(row.mesa_id, {
        mesa_id: Number(row.mesa_id),
        mesa_numero: row.mesa_numero,
        mesa_nombre: row.mesa_nombre || `Mesa ${row.mesa_numero}`,
        mesa_estado: row.mesa_estado || 'Libre',
        comandas: []
      });
    }

    if (!row.comanda_id) continue;

    const mesa = grouped.get(row.mesa_id);
    if (mesa.comandas.length >= limiteMesa) continue;

    mesa.comandas.push({
      comanda_id: Number(row.comanda_id),
      fecha_hora: row.fecha_hora,
      total_sin_servicio: Number(row.total_sin_servicio) || 0,
      servicio_voluntario: Number(row.servicio_voluntario) || 0,
      estado_comanda: row.estado_comanda || 'Abierta',
      forma_pago: row.forma_pago || 'Pendiente',
      personal_id: row.personal_id ? Number(row.personal_id) : null,
      personal_nombres: row.personal_nombres || '',
      personal_apellidos: row.personal_apellidos || '',
      personal_foto_url: row.personal_foto_url || null
    });
  }

  return Array.from(grouped.values()).map((mesa) => ({
    ...mesa,
    comandas: Array.isArray(mesa.comandas) ? mesa.comandas : []
  }));
};

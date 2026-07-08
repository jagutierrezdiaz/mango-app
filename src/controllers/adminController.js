import {
  listUsuariosConRol,
  createUsuario,
  getReporteSemanal,
  getStatsHoy,
  getSalonServiciosPorMesa
} from '../services/adminService.js';

export const getUsuariosAdmin = async (_req, res) => {
  try {
    const rows = await listUsuariosConRol();
    res.json(rows);
  } catch (error) {
    console.error('Error en GET /admin/usuarios:', error);
    res.status(500).json({ success: false, message: 'Error al obtener usuarios' });
  }
};

export const createUsuarioAdmin = async (req, res) => {
  const { username, password, nombre_completo, role_id } = req.body;

  if (!username || !password || !role_id) {
    return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
  }

  try {
    const id = await createUsuario({ username, password, nombre_completo, role_id });
    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      id
    });
  } catch (error) {
    console.error('Error en POST /admin/usuarios:', error);
    res.status(500).json({ success: false, message: 'Error al crear usuario' });
  }
};

export const getReporteSemanalAdmin = async (_req, res) => {
  try {
    const report = await getReporteSemanal();
    res.json(report);
  } catch (error) {
    console.error('Error en GET /admin/reporte-semanal:', error);
    res.status(500).json({ success: false, message: 'Error al obtener reporte semanal' });
  }
};

export const getStatsHoyAdmin = async (_req, res) => {
  try {
    const stats = await getStatsHoy();
    res.json(stats);
  } catch (error) {
    console.error('Error en GET /admin/stats-hoy:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas del día' });
  }
};

export const getSalonServiciosAdmin = async (req, res) => {
  try {
    const data = await getSalonServiciosPorMesa({
      dias: req.query?.dias,
      limitPorMesa: req.query?.limitPorMesa
    });

    res.status(200).json({
      success: true,
      data,
      mesas: data,
      servicios: data
    });
  } catch (error) {
    console.error('Error en GET /admin/salon/servicios:', {
      message: error?.message,
      code: error?.code,
      errno: error?.errno,
      sqlState: error?.sqlState,
      sqlMessage: error?.sqlMessage,
      stack: error?.stack
    });
    res.status(500).json({
      success: false,
      message: 'Error al obtener servicios del salon por mesa'
    });
  }
};

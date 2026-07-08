import express from 'express';
import { getPersonal, createPersonal } from '../controllers/personalController.js';
import {
    getUsuariosAdmin,
    createUsuarioAdmin,
    getReporteSemanalAdmin,
    getStatsHoyAdmin,
    getSalonServiciosAdmin
} from '../controllers/adminController.js';
import { guard } from '../middlewares/guard.js'; 

const router = express.Router();

// --- SECCIÓN DE PERSONAL ---
// Cambiamos 'authorize' por 'guard' para que coincida con la importación
router.get('/personal', guard(['Administrador']), getPersonal);
router.post('/personal', guard(['Administrador']), createPersonal);


// --- SECCIÓN DE USUARIOS (Gestión de Accesos) ---

/**
 * Listar usuarios con su rol
 */
router.get('/usuarios', guard(['Administrador']), getUsuariosAdmin);

/**
 * Crear nuevos usuarios
 */
router.post('/usuarios', guard(['Administrador']), createUsuarioAdmin);

/**
 * Reporte de ventas agrupado por día — últimos 7 días
 * GET /api/admin/reporte-semanal
 */
router.get('/reporte-semanal', guard(['Administrador']), getReporteSemanalAdmin);

/**
 * Estadísticas del día en curso para el Dashboard
 * GET /api/admin/stats-hoy
 */
router.get('/stats-hoy', guard(['Administrador']), getStatsHoyAdmin);

/**
 * Servicio de salon agrupado por mesa (comandas activas/recientes)
 * GET /api/admin/salon/servicios
 */
router.get('/salon/servicios', guard(['Administrador']), getSalonServiciosAdmin);

export default router;
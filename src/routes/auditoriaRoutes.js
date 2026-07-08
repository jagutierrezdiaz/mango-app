import express from 'express';
import { guard } from '../middlewares/guard.js';
import {
  obtenerAuditoria,
  obtenerResumenAuditoria
} from '../controllers/auditoriaController.js';

const router = express.Router();

// GET /api/auditoria - Obtener listado de auditoria con filtros
router.get('/', guard(['Administrador']), obtenerAuditoria);

// GET /api/auditoria/resumen - Obtener resumen estadístico de operaciones
router.get('/resumen', guard(['Administrador']), obtenerResumenAuditoria);

export default router;

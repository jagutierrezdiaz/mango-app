import express from 'express';
import { guard } from '../middlewares/guard.js';
import { getMovimientosTotal, getMovimientosList } from '../controllers/movimientosTesoreria.js';

const router = express.Router();

// Protegemos con rol Administrador (consistente con otras rutas de reportes)
router.get('/total', guard(['Administrador']), getMovimientosTotal);
router.get('/list', guard(['Administrador']), getMovimientosList);

export default router;

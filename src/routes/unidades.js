import express from 'express';
const router = express.Router();
import * as unidadesController from '../controllers/unidadesController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

/**
 * RUTAS PARA /api/unidades
 * Todas las rutas requieren autenticación JWT.
 */
router.get('/', verifyToken, unidadesController.getAllUnidades);
router.post('/', verifyToken, unidadesController.createUnidad);
router.put('/:id', verifyToken, unidadesController.updateUnidad);
router.delete('/:id', verifyToken, unidadesController.deleteUnidad);

export default router;
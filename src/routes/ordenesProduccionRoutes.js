import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import {
  cerrarOrdenProduccion,
  createOrdenProduccion,
  deleteOrdenProduccion,
  getOrdenProduccionById,
  getOrdenesProduccion,
  inventarioParaOrden,
  updateFechaProgramada,
  updateOrdenProduccion,
  updateRegistroProduccion
} from '../controllers/ordenesProduccionController.js';

const router = Router();

router.get('/', verifyToken, getOrdenesProduccion);
router.get('/:id', verifyToken, getOrdenProduccionById);
router.get('/:id/inventario', verifyToken, inventarioParaOrden);
router.post('/', verifyToken, createOrdenProduccion);
router.put('/:id', verifyToken, updateOrdenProduccion);
router.put('/:id/fecha-programada', verifyToken, updateFechaProgramada);
router.put('/:id/registro', verifyToken, updateRegistroProduccion);
router.put('/:id/cerrar', verifyToken, cerrarOrdenProduccion);
router.delete('/:id', verifyToken, deleteOrdenProduccion);

export default router;

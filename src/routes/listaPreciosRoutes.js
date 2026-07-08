import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import {
  createPrecioProducto,
  deletePrecioProducto,
  getListaPrecios,
  updatePrecioProducto
} from '../controllers/listaPreciosController.js';

const router = Router();

router.get('/', verifyToken, getListaPrecios);
router.post('/:productoId/precios', verifyToken, createPrecioProducto);
router.put('/precios/:id', verifyToken, updatePrecioProducto);
router.delete('/precios/:id', verifyToken, deletePrecioProducto);

export default router;

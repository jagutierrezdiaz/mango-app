import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import {
  actualizarMesa,
  crearMesa,
  eliminarMesa,
  listarMesas,
  obtenerMesaPorId
} from '../controllers/mesasController.js';

const router = express.Router();

router.get('/', verifyToken, listarMesas);
router.get('/:id', verifyToken, obtenerMesaPorId);
router.post('/', verifyToken, crearMesa);
router.put('/:id', verifyToken, actualizarMesa);
router.delete('/:id', verifyToken, eliminarMesa);

export default router;

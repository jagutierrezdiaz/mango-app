import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import {
  createCosto,
  deleteCosto,
  getCostoById,
  getCostos,
  updateCosto
} from '../controllers/costosController.js';

const router = Router();

router.get('/', verifyToken, getCostos);
router.get('/:id', verifyToken, getCostoById);
router.post('/', verifyToken, createCosto);
router.put('/:id', verifyToken, updateCosto);
router.delete('/:id', verifyToken, deleteCosto);

export default router;
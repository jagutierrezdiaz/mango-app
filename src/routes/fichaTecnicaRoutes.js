import express from 'express';
import * as fichaTecnicaController from '../controllers/fichaTecnicaController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/producto/:productoId/consumo', verifyToken, fichaTecnicaController.getConsumoByProducto);
router.get('/producto/:productoId', verifyToken, fichaTecnicaController.getByProducto);

router.post('/', verifyToken, fichaTecnicaController.create);

router.put('/:id', verifyToken, fichaTecnicaController.update);

router.delete('/:id', verifyToken, fichaTecnicaController.deleteItem);

export default router;

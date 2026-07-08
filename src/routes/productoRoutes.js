import { Router } from 'express';
import {
    getProductos,
    createProducto,
    deleteProducto,
    getProductoById,
    updateProducto,
    addInsumoAFicha
} from '../controllers/productoController.js';

import { verifyToken } from '../middlewares/authMiddleware.js';
import { uploadProductos } from '../config/multer.js';

const router = Router();

// RUTAS PRINCIPALES
router.get('/', verifyToken, getProductos);
router.post('/', verifyToken, uploadProductos.single('imagen_url'), createProducto);

// RUTA FICHA TÉCNICA
router.post('/ficha', verifyToken, addInsumoAFicha);

// RUTAS POR ID
router.get('/:id', verifyToken, getProductoById);
router.put('/:id', verifyToken, uploadProductos.single('imagen_url'), updateProducto);
router.delete('/:id', verifyToken, deleteProducto);

export default router;

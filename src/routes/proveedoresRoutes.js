import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import * as proveedoresController from '../controllers/proveedoresController.js';
import { uploadProveedores } from '../config/multer.js';

const router = express.Router();

/* =====================================================
   RUTAS DE APOYO (UPLOAD INDEPENDIENTE)
===================================================== */

// Esta ruta permite subir la foto para el PREVIEW sin crear el registro en la DB
router.post('/upload', verifyToken, uploadProveedores.single('url_logo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No se subió ninguna imagen' });
    }
    res.json({
        success: true,
        filename: req.file.filename,
        message: 'Imagen subida temporalmente con éxito'
    });
});

/* =====================================================
   RUTAS PRINCIPALES
===================================================== */

router.get('/', verifyToken, proveedoresController.getAll);

router.get('/:id', verifyToken, proveedoresController.getById);

/* =====================================================
   CREAR PROVEEDOR
===================================================== */

router.post(
    '/',
    verifyToken,
    uploadProveedores.single('url_logo'),
    proveedoresController.create
);

/* =====================================================
   ACTUALIZAR PROVEEDOR
===================================================== */

router.put(
    '/:id',
    verifyToken,
    uploadProveedores.single('url_logo'),
    proveedoresController.update
);

/* =====================================================
   ELIMINAR
===================================================== */

router.delete(
    '/:id',
    verifyToken,
    proveedoresController.deleteProveedor
);

export default router;
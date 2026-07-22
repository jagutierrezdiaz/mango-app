import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { verifyToken } from '../middlewares/authMiddleware.js';
import {
  createGasto,
  deleteGasto,
  getGastoById,
  getGastoResumenPago,
  getGastos,
  getPucGruposGastos,
  getPucSubcuentasGastos,
  updateGasto
} from '../controllers/gastosController.js';
import { uploadGastos } from '../config/multer.js';

const router = Router();

const upload = multer({
  storage: uploadGastos.storage,
  fileFilter: (_req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const isPdf = file.mimetype === 'application/pdf';
    if (isImage || isPdf) {
      cb(null, true);
      return;
    }
    cb(new Error('Solo se permiten archivos de imagen o PDF'));
  }
});

router.get('/', verifyToken, getGastos);
router.get('/puc/grupos', verifyToken, getPucGruposGastos);
router.get('/puc/subcuentas', verifyToken, getPucSubcuentasGastos);
router.get('/:id/resumen-pago', verifyToken, getGastoResumenPago);
router.get('/:id', verifyToken, getGastoById);
router.post('/', verifyToken, upload.single('comprobante'), createGasto);
router.put('/:id', verifyToken, upload.single('comprobante'), updateGasto);
router.delete('/:id', verifyToken, deleteGasto);

export default router;
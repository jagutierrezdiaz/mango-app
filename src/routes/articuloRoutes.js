import express from 'express';
import multer from 'multer';
import path from 'path';
import * as articuloController from '../controllers/articuloController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { uploadArticulos } from '../config/multer.js';

const router = express.Router();

// Rutas
router.get('/', verifyToken, articuloController.getArticulos);
router.get('/:id', verifyToken, articuloController.getArticuloById);

// Importante: .single('foto') debe coincidir con el name="foto" del input en el modal
router.post('/', verifyToken, uploadArticulos.single('foto'), articuloController.createArticulo);
router.put('/:id', verifyToken, uploadArticulos.single('foto'), articuloController.updateArticulo);
router.delete('/:id', verifyToken, articuloController.deleteArticulo);

export default router;
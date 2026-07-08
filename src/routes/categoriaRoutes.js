import express from 'express';
import { uploadCategorias } from '../config/multer.js';
import * as categoriaController from '../controllers/categoriaController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 1. LISTAR TODO (Lo que ya tenías)
// Se activa al cargar la página
router.get('/', verifyToken, categoriaController.listarCategorias);

// 2. OBTENER UNA (Nueva)
// Se activa al presionar "Editar" para traer los datos al modal
router.get('/:id', verifyToken, categoriaController.obtenerCategoriaPorId);

// 3. CREAR (Lo que ya tenías)
// Se activa al presionar "Guardar" cuando el formulario es nuevo
router.post('/', verifyToken, uploadCategorias.single('foto'), categoriaController.crearCategoria);

// 4. ACTUALIZAR (Nueva)
// Se activa al presionar "Guardar" cuando estamos editando una existente
router.put('/:id', verifyToken, uploadCategorias.single('foto'), categoriaController.actualizarCategoria);

// 5. ELIMINAR (Habilitada)
// Se activa al presionar el icono de la papelera
router.delete('/:id', verifyToken, categoriaController.eliminarCategoria);

export default router;
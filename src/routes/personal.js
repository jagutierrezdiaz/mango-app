import express from 'express';
const router = express.Router();
import * as personalController from '../controllers/personalController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

/**
 * NOTA: Estas rutas se acceden vía: /api/personal
 * El middleware verifyToken asegura que solo usuarios logueados accedan.
 */

// 1. Obtener toda la lista de personal
// GET /api/personal
router.get('/', verifyToken, personalController.getPersonal);

// 2. Obtener un registro específico por ID (Útil para edición)
// GET /api/personal/:id
router.get('/:id', verifyToken, personalController.getPersonalById);

// 3. Crear nuevo registro de personal
// POST /api/personal
router.post('/', verifyToken, personalController.createPersonal);

// 4. Actualizar registro completo
// PUT /api/personal/:id
router.put('/:id', verifyToken, personalController.updatePersonal);

// 5. Eliminar registro definitivamente
// DELETE /api/personal/:id
router.delete('/:id', verifyToken, personalController.deletePersonal);

// 6. Actualizar solo el estado (Activo/Inactivo)
// PATCH /api/personal/:id/estado
router.patch('/:id/estado', verifyToken, personalController.updateEstadoPersonal);
router.put('/:id/estado', verifyToken, personalController.updateEstadoPersonal);

// 7. Borrar contraseña (dejarla NULL)
// PATCH /api/personal/:id/password
router.patch('/:id/password', verifyToken, personalController.clearPasswordPersonal);

export default router;
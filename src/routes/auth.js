import express from 'express';
// Importamos las funciones específicas del controlador
import { login, refreshToken, setupPassword, validarContrasena } from '../controllers/authController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Ruta para el inicio de sesión normal
router.post('/login', login);

// CORRECCIÓN: Quitamos "authController." porque la función ya está importada directamente
router.post('/setup-password', setupPassword); 

// Validar contraseña (para acciones sensibles)
router.post('/validar-contrasena', verifyToken, validarContrasena);

// Renovación de sesión (sliding session)
router.post('/refresh', verifyToken, refreshToken);

export default router;
import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { getNotificacionesPendientes } from '../controllers/notificacionesController.js';

const router = express.Router();

router.get('/pendientes', verifyToken, getNotificacionesPendientes);
router.get('/pendientes/:rol', verifyToken, getNotificacionesPendientes);

export default router;
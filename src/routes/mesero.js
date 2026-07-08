import express from 'express';
import { guard } from '../middlewares/guard.js';

const router = express.Router();

// Endpoint base para validar acceso por rol MESERO.
router.get('/comandas', guard(['MESERO']), async (req, res) => {
	res.json({
		success: true,
		message: 'Ruta de comandas para mesero habilitada',
		data: []
	});
});

router.post('/comandas', guard(['MESERO']), async (req, res) => {
	res.status(201).json({
		success: true,
		message: 'Estructura base para crear comanda lista'
	});
});

export default router;

import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { guard } from '../middlewares/guard.js';
import { getResumenAjustes, registrarAjusteContable } from '../controllers/ajustesContablesController.js';

const router = Router();

router.get('/resumen', verifyToken, guard(['ADMIN']), getResumenAjustes);
router.post('/registrar', verifyToken, guard(['ADMIN']), registrarAjusteContable);

export default router;

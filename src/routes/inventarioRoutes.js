import { Router } from 'express';
import { guard } from '../middlewares/guard.js';
import { sanearInventarioTotal } from '../controllers/inventarioController.js';

const router = Router();

router.post('/sanear-total', guard(['ADMIN']), sanearInventarioTotal);

export default router;

import { Router } from 'express';
import { guard } from '../middlewares/guard.js';
import {
  createMovimientoManualKardex,
  deleteMovimientoManualKardex,
  getKardexArticulos,
  getKardexSucursales,
  updateMovimientoManualKardex
} from '../controllers/kardexArticulosController.js';

const router = Router();

router.get('/', guard(['ADMIN']), getKardexArticulos);
router.get('/sucursales', guard(['ADMIN']), getKardexSucursales);
router.post('/manual', guard(['ADMIN']), createMovimientoManualKardex);
router.put('/manual/:id', guard(['ADMIN']), updateMovimientoManualKardex);
router.delete('/manual/:id', guard(['ADMIN']), deleteMovimientoManualKardex);

export default router;

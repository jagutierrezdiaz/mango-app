import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { getPucAccountsByGroupWithBalance, searchPucAccounts } from '../controllers/contabilidadController.js';
import {
  getSaldoCajaGeneralController,
  getParametroBaseCajaVenta,
  getParametroBaseAhorro
} from '../controllers/trasladosDinerosController.js';

const router = Router();

router.get('/puc/grupos/:groupCode', verifyToken, getPucAccountsByGroupWithBalance);
router.get('/puc/search', verifyToken, searchPucAccounts);

// Endpoint para obtener saldo por código de cuenta (ej: 110505)
router.get('/saldo/:codigo', verifyToken, getSaldoCajaGeneralController);

router.get('/parametro/base-venta', verifyToken, getParametroBaseCajaVenta);
router.get('/parametro/base-ahorro', verifyToken, getParametroBaseAhorro);

export default router;


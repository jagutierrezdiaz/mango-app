import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import {
  createCompra,
  getComprasCatalogos,
  getCuentasPorPagar,
  getSaldoCuentaPagoCompra,
  pagarFacturaCompra,
  createDetalleCompra,
  deleteCompra,
  deleteDetalleCompra,
  getCompraById,
  getCompras,
  getDetallesByCompra,
  updateCompra,
  updateDetalleCompra
} from '../controllers/comprasController.js';

const router = Router();

router.get('/', verifyToken, getCompras);
router.get('/catalogos', verifyToken, getComprasCatalogos);
router.get('/cuentas-por-pagar', verifyToken, getCuentasPorPagar);
router.get('/saldo-cuenta/:codigo', verifyToken, getSaldoCuentaPagoCompra);
router.get('/:id', verifyToken, getCompraById);
router.post('/', verifyToken, createCompra);
router.put('/:id', verifyToken, updateCompra);
router.delete('/:id', verifyToken, deleteCompra);

router.post('/:id/pagar', verifyToken, pagarFacturaCompra);

router.get('/:compraId/detalles', verifyToken, getDetallesByCompra);
router.post('/:compraId/detalles', verifyToken, createDetalleCompra);
router.put('/detalles/:id', verifyToken, updateDetalleCompra);
router.delete('/detalles/:id', verifyToken, deleteDetalleCompra);

export default router;

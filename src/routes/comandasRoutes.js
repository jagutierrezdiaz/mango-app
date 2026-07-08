import express from 'express';
import { guard } from '../middlewares/guard.js';
import {
  getComandas,
  getComandaById,
  createComanda,
  updateComanda,
  deleteComanda,
  addProductoComanda,
  updateDetalleComanda,
  deleteDetalleComanda,
  getProductosActivos,
  getCategoriasConProductos
} from '../controllers/comandasController.js';

const router = express.Router();

// Seguridad: solo meseros pueden operar este dominio.
router.use(guard(['MESERO']));

// Rutas de Comandas
router.get('/', getComandas);
router.get('/:id', getComandaById);
router.post('/', createComanda);
router.put('/:id', updateComanda);
router.delete('/:id', deleteComanda);

// Rutas de Detalle de Comanda (Productos en comanda)
router.post('/:id/detalles', addProductoComanda);
router.put('/detalles/:id', updateDetalleComanda);
router.delete('/detalles/:id', deleteDetalleComanda);

// Rutas auxiliares para carga de datos
router.get('/productos/activos', getProductosActivos);
router.get('/categorias/productos', getCategoriasConProductos);

export default router;

import express from 'express';
import { guard } from '../middlewares/guard.js';
import {
  getProgramacionCocina,
  getDetallesComandaOrdenados,
  marcarDetalleComoProcesado
} from '../controllers/cocinaController.js';

const router = express.Router();

router.get('/programacion', guard(['COCINERO', 'BARISTA', 'BARTENDER']), getProgramacionCocina);
router.get('/comandas/:comandaId/detalles', guard(['COCINERO', 'BARISTA', 'BARTENDER']), getDetallesComandaOrdenados);
router.patch('/detalles/:detalleId/listo', guard(['COCINERO', 'BARISTA', 'BARTENDER']), marcarDetalleComoProcesado);

// Compatibilidad con ruta antigua /pedidos
router.get('/pedidos', guard(['COCINERO', 'BARISTA', 'BARTENDER']), getProgramacionCocina);

export default router;

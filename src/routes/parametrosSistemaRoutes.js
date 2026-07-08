import express from 'express';
import { guard } from '../middlewares/guard.js';
import {
  getParametrosSistema,
  updateParametroSistema
} from '../controllers/parametrosSistemaController.js';

const router = express.Router();

router.get('/', guard(['ADMIN', 'MESERO', 'COCINERO', 'CAJERO', 'BARISTA', 'BARTENDER']), getParametrosSistema);
router.put('/:id', guard(['ADMIN']), updateParametroSistema);

export default router;

import express from 'express';
import { guard } from '../middlewares/guard.js';
import {
	getSaldosTesoreria,
	registrarPagoTesoreria,
	getArqueosPendientesTesoreria,
	trasladarArqueoTesoreria,
	procesarTrasladoContable
} from '../controllers/tesoreriaController.js';
import { getParametrosTesoreria } from '../controllers/cajaController.js';

const router = express.Router();

router.get('/saldos', guard(['Administrador']), getSaldosTesoreria);
router.get('/arqueos-pendientes', guard(['Administrador']), getArqueosPendientesTesoreria);
router.post('/trasladar', guard(['Administrador']), trasladarArqueoTesoreria);
router.post('/trasladar-contable', guard(['Administrador']), procesarTrasladoContable);
router.post('/registrar-pago', guard(['Administrador']), registrarPagoTesoreria);
router.post('/parametros-tesoreria', guard(['Administrador']), getParametrosTesoreria);

export default router;

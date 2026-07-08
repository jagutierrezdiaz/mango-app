import express from 'express';
import { guard } from '../middlewares/guard.js';
import {
  getComandasPendientesCaja,
  getComandaCajaById,
  registrarPagoCaja,
  getMovimientosCajaHoy,
  registrarGastoCaja,
  debugCajaSchema
} from '../controllers/cajaController.js';
import {
  getIngresos,
  getIngresoById,
  getResumenIngresos,
  getIngresosDesglosados
} from '../controllers/ingresoCajaController.js';
import {
  getArqueosByFecha,
  getArqueoPreload,
  createArqueoCaja,
  cerrarArqueoCaja,
  getTrasladosByArqueoId,
  createTrasladoTesoreria,
  updateTrasladoTesoreria,
  deleteTrasladoTesoreria
} from '../controllers/arqueosCajaController.js';
import {
  getEstadoResultadosMeta,
  getEstadoResultadosMensual
} from '../controllers/estadoResultadosController.js';

const router = express.Router();

// Rutas de cobros/gestión de caja (Cajero)
router.get('/cobros', guard(['CAJERO', 'CAJERO(A)']), getComandasPendientesCaja);
router.get('/comandas', guard(['CAJERO', 'CAJERO(A)']), getComandasPendientesCaja);
router.get('/comandas/:id', guard(['CAJERO', 'CAJERO(A)']), getComandaCajaById);
router.post('/pagos', guard(['CAJERO', 'CAJERO(A)']), registrarPagoCaja);
router.get('/movimientos-hoy', guard(['CAJERO', 'CAJERO(A)', 'Administrador']), getMovimientosCajaHoy);
router.post('/gastos', guard(['CAJERO', 'CAJERO(A)']), registrarGastoCaja);
router.get('/debug/esquema-caja', guard(['Administrador']), debugCajaSchema);

// Rutas de informe de caja (Admin)
router.get('/ingresos', guard(['Administrador']), getIngresos);
router.get('/ingresos/:id', guard(['Administrador']), getIngresoById);
router.get('/ingresos-desglosados', guard(['Administrador']), getIngresosDesglosados);
router.get('/resumen', guard(['Administrador']), getResumenIngresos);
router.get('/estado-resultados/meta', guard(['Administrador']), getEstadoResultadosMeta);
router.get('/estado-resultados', guard(['Administrador']), getEstadoResultadosMensual);

// Rutas de arqueos de caja (Admin)
router.get('/arqueos', guard(['Administrador']), getArqueosByFecha);
router.get('/arqueos/preload', guard(['Administrador', 'CAJERO']), getArqueoPreload); 
router.post('/arqueos', guard(['Administrador', 'CAJERO']), createArqueoCaja);
//cerrar no se usara
router.patch('/arqueos/:id/cerrar', guard(['Administrador']), cerrarArqueoCaja);
router.get('/arqueos/:id/traslados', guard(['Administrador']), getTrasladosByArqueoId);
router.post('/arqueos/:id/traslados', guard(['Administrador']), createTrasladoTesoreria);
router.put('/arqueos/:id/traslados/:trasladoId', guard(['Administrador']), updateTrasladoTesoreria);
router.delete('/arqueos/:id/traslados/:trasladoId', guard(['Administrador']), deleteTrasladoTesoreria);

export default router;

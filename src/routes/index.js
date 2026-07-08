import express from 'express';
const router = express.Router();

// Importamos los routers específicos
import authRoutes from './auth.js';
import personalRoutes from './personal.js';
import categoriaRoutes from './categoriaRoutes.js';
import unidadesRoutes from './unidades.js'; 
import articuloRoutes from './articuloRoutes.js';
import productoRoutes from './productoRoutes.js';
import fichaTecnicaRoutes from './fichaTecnicaRoutes.js';
import proveedoresRoutes from './proveedoresRoutes.js';
import comprasRoutes from './comprasRoutes.js';
import kardexArticulosRoutes from './kardexArticulosRoutes.js';
import gastosRoutes from './gastosRoutes.js';
import costosRoutes from './costosRoutes.js';
import ordenesProduccionRoutes from './ordenesProduccionRoutes.js';
import cocinaRoutes from './cocina.js';
import cajaRoutes from './caja.js';
import mesasRoutes from './mesasRoutes.js';
import listaPreciosRoutes from './listaPreciosRoutes.js';
import comandasRoutes from './comandasRoutes.js';
import parametrosSistemaRoutes from './parametrosSistemaRoutes.js';
import auditoriaRoutes from './auditoriaRoutes.js';
import adminRoutes from './admin.js';
import tesoreriaRoutes from './tesoreriaRoutes.js';
import contabilidadRoutes from './contabilidadRoutes.js';
import ajustesContablesRoutes from './ajustesContablesRoutes.js';
import movimientosContablesRoutes from './movimientosContablesRoutes.js';
import inventarioRoutes from './inventarioRoutes.js';
import notificacionesRoutes from './notificacionesRoutes.js';


//accesible como: /api/articulos
router.use('/articulos', articuloRoutes); // Accesible como /api/articulos

// Accesible como: /api/auth
router.use('/auth', authRoutes);

// Accesible como: /api/personal 
router.use('/personal', personalRoutes);

// Accesible como: /api/categorias
router.use('/categorias', categoriaRoutes); 

// Accesible como: /api/unidades
// Aquí es donde el frontend buscará los datos para la tabla de unidades
router.use('/unidades', unidadesRoutes); 

router.use('/productos', productoRoutes);

router.use('/fichas-tecnicas', fichaTecnicaRoutes);

router.use('/proveedores', proveedoresRoutes);
router.use('/compras', comprasRoutes);
router.use('/kardex-articulos', kardexArticulosRoutes);
router.use('/gastos', gastosRoutes);
router.use('/costos', costosRoutes);
router.use('/ordenes-produccion', ordenesProduccionRoutes);
router.use('/cocina', cocinaRoutes);
router.use('/caja', cajaRoutes);
router.use('/mesas', mesasRoutes);
router.use('/lista-precios', listaPreciosRoutes);
router.use('/comandas', comandasRoutes);
router.use('/parametros-sistema', parametrosSistemaRoutes);
router.use('/auditoria', auditoriaRoutes);
router.use('/admin', adminRoutes);
router.use('/tesoreria', tesoreriaRoutes);
router.use('/contabilidad', contabilidadRoutes);
router.use('/ajustes-contables', ajustesContablesRoutes);
router.use('/movimientos_contables', movimientosContablesRoutes);
router.use('/inventario', inventarioRoutes);
router.use('/notificaciones', notificacionesRoutes);


export default router;
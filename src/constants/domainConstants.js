export const ROLES = {
  ADMIN: 'ADMIN',
  MESERO: 'MESERO',
  COCINERO: 'COCINERO',
  BARISTA: 'BARISTA',
  BARTENDER: 'BARTENDER',
  CAJERO: 'CAJERO',
  CAJA: 'CAJA',
  COCINA: 'COCINA'
};

export const COMANDA_ESTADOS = {
  ABIERTA: 'Abierta',
  EN_PROCESO: 'En Proceso',
  CERRADA: 'Cerrada',
  PAGADA: 'Pagada',
  ANULADA: 'Anulada'
};

export const MESA_ESTADOS = {
  LIBRE: 'Libre',
  OCUPADA: 'Ocupada',
  SUCIA: 'Sucia',
  RESERVADA: 'Reservada',
  EN_CAJA: 'En Caja'
};

export const DETALLE_ESTADOS = {
  ORDENADO: 'Ordenado',
  PROCESADO: 'Procesado'
};

export const SOCKET_EVENTS = {
  CATEGORIAS_ACTUALIZADAS: 'categorias-actualizadas',
  PRODUCTOS_ACTUALIZADOS: 'productos-actualizados',
  NUEVA_COMANDA: 'nueva-comanda',
  EDITAR_COMANDA: 'editar-comanda',
  BORRAR_COMANDA: 'borrar-comanda',
  NUEVO_PRODUCTO_COMANDA: 'nuevo-producto-comanda',
  EDITAR_PRODUCTO_COMANDA: 'editar-producto-comanda',
  BORRAR_PRODUCTO_COMANDA: 'borrar-producto-comanda',
  SOLICITUD_CUENTA: 'solicitud-cuenta',
  COMANDA_CERRADA: 'comanda-cerrada',
  COMANDA_PAGADA: 'comanda-pagada',
  PLATO_LISTO: 'plato-procesado',
  ABRIR_CAJON: 'abrir-cajon',
  CONFIG_CAMBIO: 'CONFIG_CAMBIO',
  ALERTA_ADMIN: 'ALERTA_ADMIN',
  NUEVO_PRODUCTO: 'NUEVO_PRODUCTO',
  ESTADO_CAMBIO: 'ESTADO_CAMBIO'
};

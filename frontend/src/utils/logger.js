/**
 * Logger utility para trazabilidad de ejecución de módulos.
 * Envía logs al backend vía WebSocket para aparecer en la terminal del servidor.
 */
export const logger = {
  log: (message, level = 'INFO') => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage); // Log en consola del navegador
    if (window.socket) {
      window.socket.emit('log', logMessage);
    }
  },
  error: (message) => {
    logger.log(message, 'ERROR');
  },
  warn: (message) => {
    logger.log(message, 'WARN');
  },
  info: (message) => {
    logger.log(message, 'INFO');
  },
  debug: (message) => {
    logger.log(message, 'DEBUG');
  }
};
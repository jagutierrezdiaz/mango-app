let warnedDisabledWriter = false;

export const enqueueNotification = async (_args = {}) => {
  if (!warnedDisabledWriter) {
    warnedDisabledWriter = true;
    console.warn('[notifications] enqueueNotification deshabilitado: las notificaciones ahora solo se crean por triggers de MySQL.');
  }
};

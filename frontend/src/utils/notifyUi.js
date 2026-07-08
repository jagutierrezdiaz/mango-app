/**
 * Utilidad para mostrar notificaciones UI (toasts, banners).
 * Incluye logs temporales para diagnóstico.
 */
export function notifyUi({ message, type = 'info', duration = 3500 }) {
  console.log('[notifyUi] Mostrando notificación:', { message, type, duration })
  window.dispatchEvent(new CustomEvent('pb:notify-ui', {
    detail: { message, type, duration }
  }))
}

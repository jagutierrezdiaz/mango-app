/**
 * Utilidad para reproducir sonidos de notificación.
 * Incluye logs temporales para diagnóstico.
 */
export function playNotification(nombreArchivo) {
  if (!nombreArchivo) {
    console.warn('[audioUtils] No se especificó archivo de sonido')
    return Promise.resolve(false)
  }
  const url = `/sounds/${nombreArchivo}`
  if (process.env.NODE_ENV !== 'production') {
    console.log('[audioUtils] Intentando reproducir sonido:', url)
  }
  const audio = new Audio(url)
  return audio.play().then(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[audioUtils] Sonido reproducido:', url)
    }
    return true
  }).catch((err) => {
    console.warn('[audioUtils] Error al reproducir sonido:', err)
    window.dispatchEvent(new CustomEvent('pb:audio-unlock-required'))
    return false
  })
}

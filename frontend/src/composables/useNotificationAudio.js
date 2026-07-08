/**
 * useNotificationAudio.js
 * Composable Vue 3 para el sistema de notificaciones de audio en tiempo real.
 *
 * Encapsula el módulo realtimeNotifications y expone sus funciones de forma
 * consistente con el patrón Composition API.
 *
 * Uso básico:
 *   import { useNotificationAudio } from '@/composables/useNotificationAudio'
 *
 *   const { playNotification, playUniqueNotification, notifyUi, checkDuplicate } = useNotificationAudio()
 *
 *   // Reproducir sonido simple
 *   await playNotification('new_order.mp3')
 *
 *   // Reproducir con deduplicación (ignora el mismo id_comanda en 5 s)
 *   await playUniqueNotification(`comanda:${payload.id_comanda}`, 'new_order.mp3')
 *
 *   // Mostrar toast en la UI
 *   notifyUi({ message: 'Nueva comanda recibida', type: 'warning' })
 */

import {
  playNotification,
  playUniqueNotification,
  notifyUi,
  checkDuplicate,
  clearDedupRegistry,
  unlockAudioContext,
  isAudioUnlocked,
  getRequiredSoundFiles,
} from '../utils/realtimeNotifications'

/**
 * @returns {{
 *   playNotification: (fileName: string, options?: { volume?: number }) => Promise<boolean>,
 *   playUniqueNotification: (key: string, fileName: string, options?: { volume?: number }) => Promise<boolean>,
 *   notifyUi: (opts: { message?: string, type?: string, duration?: number, persistent?: boolean }) => void,
 *   checkDuplicate: (key: string) => boolean,
 *   clearDedupRegistry: () => void,
 *   unlockAudioContext: () => void,
 *   isAudioUnlocked: () => boolean,
 *   getRequiredSoundFiles: () => string[],
 * }}
 */
export const useNotificationAudio = () => ({
  playNotification,
  playUniqueNotification,
  notifyUi,
  checkDuplicate,
  clearDedupRegistry,
  unlockAudioContext,
  isAudioUnlocked,
  getRequiredSoundFiles,
})

import { defineStore } from 'pinia'

/**
 * Store global de comandas y detalles para toda la app.
 * Provee reactividad global y acciones para todos los eventos de negocio.
 * Incluye logs temporales para diagnóstico.
 */
export const useComandasStore = defineStore('comandas', {
  state: () => ({
    comandas: [], // Lista de comandas activas
    detallesPorComanda: {}, // { [comandaId]: [detalles] }
    solicitudesPendientes: [], // Para caja
    loading: false,
    lastUpdate: null
  }),
  actions: {
    setComandas(comandas) {
      console.log('[Pinia] setComandas', comandas)
      this.comandas = Array.isArray(comandas) ? comandas : []
      this.lastUpdate = Date.now()
    },
    setDetalles(comandaId, detalles) {
      console.log('[Pinia] setDetalles', comandaId, detalles)
      this.detallesPorComanda = {
        ...this.detallesPorComanda,
        [Number(comandaId)]: Array.isArray(detalles) ? detalles : []
      }
      this.lastUpdate = Date.now()
    },
    addComanda(comanda) {
      console.log('[Pinia] addComanda', comanda)
      this.comandas.push(comanda)
      this.lastUpdate = Date.now()
    },
    removeComanda(payload) {
      const id = Number(payload?.comanda_id || payload?.id)
      console.log('[Pinia] removeComanda', id)
      this.comandas = this.comandas.filter(c => Number(c.id) !== id)
      delete this.detallesPorComanda[id]
      this.lastUpdate = Date.now()
    },
    updateComanda(payload) {
      const id = Number(payload?.comanda_id || payload?.id)
      console.log('[Pinia] updateComanda', id, payload)
      this.comandas = this.comandas.map(c => Number(c.id) === id ? { ...c, ...payload } : c)
      this.lastUpdate = Date.now()
    },
    addDetalle(comandaId, detalle) {
      console.log('[Pinia] addDetalle', comandaId, detalle)
      const id = Number(comandaId)
      const prev = Array.isArray(this.detallesPorComanda[id]) ? this.detallesPorComanda[id] : []
      this.detallesPorComanda = {
        ...this.detallesPorComanda,
        [id]: [...prev, detalle]
      }
      this.lastUpdate = Date.now()
    },
    removeDetalle(comandaId, detalleId) {
      console.log('[Pinia] removeDetalle', comandaId, detalleId)
      const id = Number(comandaId)
      const prev = Array.isArray(this.detallesPorComanda[id]) ? this.detallesPorComanda[id] : []
      this.detallesPorComanda = {
        ...this.detallesPorComanda,
        [id]: prev.filter(d => Number(d.id) !== Number(detalleId))
      }
      this.lastUpdate = Date.now()
    },
    setSolicitudesPendientes(solicitudes) {
      console.log('[Pinia] setSolicitudesPendientes', solicitudes)
      this.solicitudesPendientes = Array.isArray(solicitudes) ? solicitudes : []
      this.lastUpdate = Date.now()
    },
    addSolicitud(solicitud) {
      console.log('[Pinia] addSolicitud', solicitud)
      this.solicitudesPendientes.push(solicitud)
      this.lastUpdate = Date.now()
    },
    removeSolicitud(comandaId) {
      const id = Number(comandaId)
      console.log('[Pinia] removeSolicitud', id)
      this.solicitudesPendientes = this.solicitudesPendientes.filter(s => Number(s.comanda_id) !== id)
      this.lastUpdate = Date.now()
    },
    clearAll() {
      console.log('[Pinia] clearAll')
      this.comandas = []
      this.detallesPorComanda = {}
      this.solicitudesPendientes = []
      this.lastUpdate = Date.now()
    }
  }
})

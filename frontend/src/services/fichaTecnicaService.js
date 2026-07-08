/*
  SERVICIO: Funciones para interactuar con la API de fichas técnicas.
  - Métodos: getByProducto, deleteItem.
  - Usa fetch con autenticación JWT.
  - Usa window.location.origin para que vaya a través de Nginx proxy (como legacy)
*/
import { API_BASE_URL as API_BASE } from '../config/api.js'

const getHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`
})

export const fichaTecnicaService = {
  async getByProducto(productoId) {
    try {
      const res = await fetch(`${API_BASE}/fichas-tecnicas/producto/${productoId}`, { headers: getHeaders() })
      if (!res.ok) throw new Error('Error al obtener ficha técnica')
      return await res.json()
    } catch (error) {
      console.error('Error en fichaTecnicaService.getByProducto:', error)
      throw error
    }
  },

  async deleteItem(id) {
    const response = await fetch(`${API_BASE}/fichas-tecnicas/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    })

    const result = await response.json()
    if (!result.success) throw new Error(result.message || 'Error al eliminar')
    return result
  }
}
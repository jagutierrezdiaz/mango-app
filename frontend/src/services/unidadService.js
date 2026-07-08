/*
  SERVICIO: Funciones para interactuar con la API de unidades.
  - Métodos: getAll, create, update, delete.
  - Usa fetch con autenticación JWT.
  - Usa window.location.origin para que vaya a través de Nginx proxy (como legacy)
*/
import { API_BASE_URL as API_BASE } from '../config/api.js'

const getHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`
})

export const unidadService = {
  async getAll() {
    try {
      const res = await fetch(`${API_BASE}/unidades`, { headers: getHeaders() })
      if (!res.ok) throw new Error('Error al obtener unidades')
      const result = await res.json()
      return { data: result, success: true }
    } catch (error) {
      console.error('Error en unidadService.getAll:', error)
      throw error
    }
  },

  async create(data) {
    const response = await fetch(`${API_BASE}/unidades`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    const result = await response.json()
    if (!result.success) throw new Error(result.message || 'Error al crear')
    return result
  },

  async update(id, data) {
    const response = await fetch(`${API_BASE}/unidades/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    const result = await response.json()
    if (!result.success) throw new Error(result.message || 'Error al actualizar')
    return result
  },

  async delete(id) {
    const response = await fetch(`${API_BASE}/unidades/${id}`, {
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
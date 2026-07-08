/*
  SERVICIO: Funciones para interactuar con la API de artículos.
  - Métodos: getAll, getById, save, delete.
  - Usa fetch con autenticación JWT.
  - Usa window.location.origin para que vaya a través de Nginx proxy (como legacy)
*/
import { API_BASE_URL as API_BASE } from '../config/api.js'

const getHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`
})

export const articuloService = {
  async getAll() {
    try {
      const res = await fetch(`${API_BASE}/articulos`, { headers: getHeaders() })
      if (!res.ok) throw new Error('Error al obtener artículos')
      const data = await res.json()
      return Array.isArray(data) ? data : data.data || []
    } catch (error) {
      console.error('Error en articuloService.getAll:', error)
      throw error
    }
  },

  async getById(id) {
    try {
      const res = await fetch(`${API_BASE}/articulos/${id}`, { headers: getHeaders() })
      if (!res.ok) throw new Error('Error al obtener artículo')
      const data = await res.json()
      // DEBUG: log response for diagnosis (frontend console)
      console.log('DEBUG articuloService.getById response:', data)
      return data
    } catch (error) {
      console.error('Error en articuloService.getById:', error)
      throw error
    }
  },

  async save(formData, id) {
    const url = id ? `${API_BASE}/articulos/${id}` : `${API_BASE}/articulos`
    const method = id ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
        // No Content-Type para FormData
      },
      body: formData
    })

    const result = await response.json()
    if (!result.success) throw new Error(result.message || 'Error al guardar')
    return result
  },

  async delete(id) {
    const response = await fetch(`${API_BASE}/articulos/${id}`, {
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
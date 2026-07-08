/*
  SERVICIO: Funciones para interactuar con la API de proveedores.
  - Métodos: getAll, getById, save, delete.
  - Usa fetch con autenticación JWT.
  - Usa window.location.origin para que vaya a través de Nginx proxy (como legacy)
*/
import { API_BASE_URL as API_BASE } from '../config/api.js'

const getHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`
})

export const proveedoresService = {
  async getAll() {
    try {
      const res = await fetch(`${API_BASE}/proveedores`, { headers: getHeaders() })
      if (!res.ok) throw new Error('Error al obtener proveedores')
      return await res.json()
    } catch (error) {
      console.error('Error en proveedoresService.getAll:', error)
      throw error
    }
  },

  async getById(id) {
    try {
      const res = await fetch(`${API_BASE}/proveedores/${id}`, { headers: getHeaders() })
      if (!res.ok) throw new Error('Error al obtener proveedor')
      const result = await res.json()
      return result.success ? result.data : null
    } catch (error) {
      console.error('Error en proveedoresService.getById:', error)
      throw error
    }
  },

  async save(formData, id) {
    const url = id ? `${API_BASE}/proveedores/${id}` : `${API_BASE}/proveedores`
    const method = id ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    })

    const result = await response.json()
    if (!result.success) throw new Error(result.message || 'Error al guardar')
    return result
  },

  async delete(id) {
    const response = await fetch(`${API_BASE}/proveedores/${id}`, {
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
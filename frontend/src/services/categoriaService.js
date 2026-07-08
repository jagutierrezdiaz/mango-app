/*
  SERVICIO: Funciones para interactuar con la API de categorías.
  - Métodos: getAll, getById, save, delete.
  - Usa fetch con autenticación JWT.
  - Usa window.location.origin para que vaya a través de Nginx proxy (como legacy)
*/
import { API_BASE_URL as API_BASE } from '../config/api.js'

const getHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`
})

const handleUnauthorized = async (res) => {
  if (res.status !== 401) return

  let message = 'Sesion expirada. Inicia sesion nuevamente.'
  try {
    const payload = await res.clone().json()
    if (payload?.message) message = payload.message
  } catch (_error) {
    // Ignore parse errors and keep default message.
  }

  localStorage.removeItem('token')
  localStorage.removeItem('user')
  alert(message)
  window.location.href = '/login'
}

export const categoriasService = {
  async getAll() {
    try {
      const res = await fetch(`${API_BASE}/categorias`, { headers: getHeaders() })
      await handleUnauthorized(res)
      if (!res.ok) throw new Error('Error al obtener categorías')
      const result = await res.json()
      return result.success ? result.data : []
    } catch (error) {
      console.error('Error en categoriasService.getAll:', error)
      throw error
    }
  },

  async getById(id) {
    try {
      const res = await fetch(`${API_BASE}/categorias/${id}`, { headers: getHeaders() })
      await handleUnauthorized(res)
      if (!res.ok) throw new Error('Error al obtener categoría')
      const result = await res.json()
      return result.success ? result.data : null
    } catch (error) {
      console.error('Error en categoriasService.getById:', error)
      throw error
    }
  },

  async save(formData, id) {
    const url = id ? `${API_BASE}/categorias/${id}` : `${API_BASE}/categorias`
    const method = id ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    })

    await handleUnauthorized(response)

    const result = await response.json()
    if (!result.success) throw new Error(result.message || 'Error al guardar')
    return result
  },

  async delete(id) {
    const response = await fetch(`${API_BASE}/categorias/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    })

    await handleUnauthorized(response)

    const result = await response.json()
    if (!result.success) throw new Error(result.message || 'Error al eliminar')
    return result
  }
}
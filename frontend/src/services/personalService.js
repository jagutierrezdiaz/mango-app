/*
  SERVICIO: Funciones para interactuar con la API de personal.
  - Métodos: getAll, getById, save, delete, updateEstado.
  - Usa fetch con autenticación JWT.
  - Usa window.location.origin para que vaya a través de Nginx proxy (como legacy)
*/
import { API_BASE_URL as API_BASE } from '../config/api.js'

const getHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`
})

const parseJsonSafe = async (response) => {
  try {
    return await response.json()
  } catch (_error) {
    return null
  }
}

const extractMessage = (payload, fallback) => {
  if (payload && typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message
  }
  return fallback
}

export const personalService = {
  async getAll() {
    try {
      const res = await fetch(`${API_BASE}/personal`, { headers: getHeaders() })
      const result = await parseJsonSafe(res)
      if (!res.ok) throw new Error(extractMessage(result, 'Error al obtener personal'))

      if (Array.isArray(result)) return result
      if (Array.isArray(result?.data)) return result.data
      return []
    } catch (error) {
      console.error('Error en personalService.getAll:', error)
      throw error
    }
  },

  async getById(id) {
    try {
      const res = await fetch(`${API_BASE}/personal/${id}`, { headers: getHeaders() })
      const result = await parseJsonSafe(res)

      if (!res.ok) throw new Error(extractMessage(result, 'Error al obtener personal'))

      if (result && typeof result === 'object') {
        if (result.success === true || result.status === true) return result.data || null
        if (result.data && typeof result.data === 'object') return result.data
      }

      // Compatibilidad con endpoints que podrían devolver el objeto plano.
      if (result && typeof result === 'object' && !Array.isArray(result)) return result

      return null
    } catch (error) {
      console.error('Error en personalService.getById:', error)
      throw error
    }
  },

  async save(formData, id) {
    const url = id ? `${API_BASE}/personal/${id}` : `${API_BASE}/personal`
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
    const response = await fetch(`${API_BASE}/personal/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    })

    const result = await response.json()
    if (!result.success) throw new Error(result.message || 'Error al eliminar')
    return result
  },

  async updateEstado(id, estado) {
    const response = await fetch(`${API_BASE}/personal/${id}/estado`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ estado })
    })

    const result = await response.json()
    if (!result.success) throw new Error(result.message || 'Error al actualizar estado')
    return result
  },

  async clearPassword(id) {
    const response = await fetch(`${API_BASE}/personal/${id}/password`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.message || 'Error al borrar contraseña')
    return result
  }
}
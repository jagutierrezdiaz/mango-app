/*
  SERVICIO: Funciones para interactuar con la API de productos.
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

export const productoService = {
  async getAll() {
    try {
      const token = localStorage.getItem('token')
      const headers = getHeaders()
      
      console.log('🔵 Token en localStorage:', token ? `${token.substring(0, 20)}...` : 'NO EXISTE')
      console.log('🔵 Headers siendo enviados:', headers)
      console.log('🔵 Solicitando productos desde:', `${API_BASE}/productos`)
      
      const res = await fetch(`${API_BASE}/productos`, { headers })
      
      console.log('📊 Status:', res.status, res.statusText)

      await handleUnauthorized(res)
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Error al obtener productos`)
      }
      
      const data = await res.json()
      console.log('📦 Respuesta:', data)
      
      const products = data.success 
        ? data.data 
        : Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : []
      
      console.log('✅ Productos:', products)
      return products
    } catch (error) {
      console.error('❌ Error en productoService.getAll:', error)
      throw error
    }
  },

  async getById(id) {
    const response = await fetch(`${API_BASE}/productos/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    await handleUnauthorized(response)

    if (!response.ok) throw new Error('Error al obtener producto')
    const result = await response.json()
    return result.success ? result.data : null
  },

  async save(formData, id) {
    const url = id ? `${API_BASE}/productos/${id}` : `${API_BASE}/productos`
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
    const response = await fetch(`${API_BASE}/productos/${id}`, {
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
import { inject } from 'vue'

export const DELETE_SECURITY_KEY = 'pb-delete-security'

export const useDeleteSecurity = () => {
  const requestDeleteSecurity = inject(DELETE_SECURITY_KEY, null)

  if (typeof requestDeleteSecurity !== 'function') {
    throw new Error('El proveedor de seguridad de borrado no está disponible.')
  }

  return requestDeleteSecurity
}

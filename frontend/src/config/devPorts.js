const toPortNumber = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const DEV_BACKEND_HOST = String(process.env.VUE_APP_DEV_BACKEND_HOST || 'localhost').trim() || 'localhost'
export const DEV_BACKEND_PORT = toPortNumber(process.env.VUE_APP_DEV_BACKEND_PORT || process.env.PORT, 3000)
export const DEV_FRONTEND_PORT = toPortNumber(process.env.VUE_APP_DEV_FRONTEND_PORT, 5173)
export const DEV_BACKEND_ORIGIN = `http://${DEV_BACKEND_HOST}:${DEV_BACKEND_PORT}`

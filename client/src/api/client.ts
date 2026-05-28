import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1',
  withCredentials: true,
})

let refreshPromise: Promise<string> | null = null

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Never intercept auth endpoints — avoids refresh loops
    const isAuthEndpoint = originalRequest.url?.includes('/auth/')
    if (isAuthEndpoint) {
      return Promise.reject(error)
    }

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/')
    ) {
      originalRequest._retry = true

      // Only attempt refresh if we actually have a user in the store
      const hasUser = !!useAuthStore.getState().user
      if (!hasUser) {
        localStorage.removeItem('regi_had_session')
        useAuthStore.getState().clearAuth()
        return Promise.reject(error)
      }

      try {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            const response = await axios.post(
              `${apiClient.defaults.baseURL}/auth/refresh`,
              {},
              { withCredentials: true }
            )
            const { accessToken } = response.data
            const user = useAuthStore.getState().user
            if (user) {
              useAuthStore.getState().setAuth(user, accessToken)
            }
            return accessToken
          })()
        }

        const accessToken = await refreshPromise
        refreshPromise = null
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return apiClient(originalRequest)
      } catch {
        refreshPromise = null
        localStorage.removeItem('regi_had_session')
        useAuthStore.getState().clearAuth()
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient

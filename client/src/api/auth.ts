import apiClient from './client'
import { AuthUser } from '@/types/api'

interface LoginResponse {
  accessToken: string
  user: AuthUser
}

interface RegisterResponse {
  message: string
  user: Pick<AuthUser, 'id' | 'email' | 'name' | 'role'>
}

interface RefreshResponse {
  accessToken: string
  user: AuthUser
}

export const authAPI = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', {
      email,
      password,
    })
    return response.data
  },

  async register(
    email: string,
    name: string,
    password: string,
    workspaceName: string
  ): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>('/auth/register', {
      email,
      name,
      password,
      workspaceName,
    })
    return response.data
  },

  async refresh(): Promise<RefreshResponse> {
    const response = await apiClient.post<RefreshResponse>('/auth/refresh')
    return response.data
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout')
  },
}

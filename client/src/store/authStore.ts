import { create } from 'zustand'
import type { AuthUser } from '@/types/api'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean
  setAuth: (user: AuthUser, accessToken: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,

  setAuth: (user: AuthUser, accessToken: string) => {
    set({
      user,
      accessToken,
      isAuthenticated: true,
    })
  },

  clearAuth: () => {
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    })
  },
}))

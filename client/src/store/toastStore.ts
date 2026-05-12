import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastStore {
  toasts: Toast[]
  show: (message: string, type?: ToastType) => void
  hide: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  show: (message, type = 'success') => {
    const id = Math.random().toString(36).slice(2)
    set(state => ({
      toasts: [...state.toasts, { id, message, type }]
    }))
    // Auto-hide after 3.5 seconds
    setTimeout(() => {
      set(state => ({
        toasts: state.toasts.filter(t => t.id !== id)
      }))
    }, 3500)
  },

  hide: (id) => {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id)
    }))
  },
}))

// Helper — call this anywhere without needing the hook
// e.g. toast.success('Project created')
export const toast = {
  success: (message: string) =>
    useToastStore.getState().show(message, 'success'),
  error: (message: string) =>
    useToastStore.getState().show(message, 'error'),
  info: (message: string) =>
    useToastStore.getState().show(message, 'info'),
}

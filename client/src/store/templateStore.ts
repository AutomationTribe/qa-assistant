import { create } from 'zustand'
import { TestCaseTemplate, TestCaseField } from '@/types/api'
import { templatesAPI } from '@/api/templates'

interface TemplateStore {
  template: TestCaseTemplate | null
  loading: boolean
  error: string | null
  fetchTemplate: (projectId: string) => Promise<void>
  saveTemplate: (projectId: string, fields: Partial<TestCaseField>[]) => Promise<void>
  updateTemplate: (projectId: string, fields: Partial<TestCaseField>[]) => Promise<void>
  addField: (projectId: string, field: Partial<TestCaseField>) => Promise<void>
  removeField: (projectId: string, fieldId: string) => Promise<void>
  reorderFields: (projectId: string, fieldIds: string[]) => Promise<void>
  setError: (error: string | null) => void
  reset: () => void
}

export const useTemplateStore = create<TemplateStore>((set) => ({
  template: null,
  loading: false,
  error: null,

  fetchTemplate: async (projectId: string) => {
    set({ loading: true, error: null })
    try {
      const template = await templatesAPI.getTemplate(projectId)
      set({ template, loading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch template'
      set({ error: message, loading: false })
    }
  },

  saveTemplate: async (projectId: string, fields: Partial<TestCaseField>[]) => {
    set({ loading: true, error: null })
    try {
      const template = await templatesAPI.createTemplate(projectId, fields)
      set({ template, loading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save template'
      set({ error: message, loading: false })
      throw error
    }
  },

  updateTemplate: async (projectId: string, fields: Partial<TestCaseField>[]) => {
    set({ loading: true, error: null })
    try {
      const template = await templatesAPI.updateTemplate(projectId, fields)
      set({ template, loading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update template'
      set({ error: message, loading: false })
      throw error
    }
  },

  addField: async (projectId: string, field: Partial<TestCaseField>) => {
    set({ loading: true, error: null })
    try {
      const template = await templatesAPI.addField(projectId, field)
      set({ template, loading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add field'
      set({ error: message, loading: false })
      throw error
    }
  },

  removeField: async (projectId: string, fieldId: string) => {
    set({ loading: true, error: null })
    try {
      const template = await templatesAPI.removeField(projectId, fieldId)
      set({ template, loading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove field'
      set({ error: message, loading: false })
      throw error
    }
  },

  reorderFields: async (projectId: string, fieldIds: string[]) => {
    set({ loading: true, error: null })
    try {
      const template = await templatesAPI.reorderFields(projectId, fieldIds)
      set({ template, loading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reorder fields'
      set({ error: message, loading: false })
      throw error
    }
  },

  setError: (error: string | null) => {
    set({ error })
  },

  reset: () => {
    set({ template: null, loading: false, error: null })
  },
}))

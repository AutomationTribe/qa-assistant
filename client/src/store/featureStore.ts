import { create } from 'zustand'
import { Feature, FeatureType, FeatureStatus } from '@/types/api'
import { featuresAPI } from '@/api/features'

interface FeatureStore {
  features: Feature[]
  loading: boolean
  error: string | null
  fetchFeatures(projectId: string, params?: {
    search?: string
    dateFrom?: string
    dateTo?: string
    status?: FeatureStatus
  }): Promise<void>
  createFeature(projectId: string, data: { name: string; type: FeatureType }): Promise<void>
  updateFeature(projectId: string, featureId: string, data: Partial<Feature>): Promise<void>
  deleteFeature(projectId: string, featureId: string): Promise<void>
}

export const useFeatureStore = create<FeatureStore>((set, get) => ({
  features: [],
  loading: false,
  error: null,

  fetchFeatures: async (projectId, params) => {
    set({ loading: true, error: null })
    try {
      const features = await featuresAPI.listFeatures(projectId, params)
      set({ features, loading: false })
    } catch {
      set({ error: 'Failed to load features', loading: false })
    }
  },

  createFeature: async (projectId, data) => {
    try {
      const feature = await featuresAPI.createFeature(projectId, data)
      set(state => ({ features: [feature, ...state.features] }))
    } catch (error) {
      set({ error: 'Failed to create feature' })
      throw error
    }
  },

  updateFeature: async (projectId, featureId, data) => {
    try {
      const feature = await featuresAPI.updateFeature(projectId, featureId, data)
      set(state => ({
        features: state.features.map(f => f.id === featureId ? feature : f)
      }))
    } catch (error) {
      set({ error: 'Failed to update feature' })
      throw error
    }
  },

  deleteFeature: async (projectId, featureId) => {
    try {
      await featuresAPI.deleteFeature(projectId, featureId)
      set(state => ({
        features: state.features.filter(f => f.id !== featureId)
      }))
    } catch (error) {
      set({ error: 'Failed to delete feature' })
      throw error
    }
  },
}))

import apiClient from './client'
import { Feature, FeatureType, FeatureStatus, ApiEndpoint } from '@/types/api'

interface ListFeaturesParams {
  search?: string
  dateFrom?: string
  dateTo?: string
  status?: FeatureStatus
}

export const featuresAPI = {
  async listFeatures(projectId: string, params?: ListFeaturesParams): Promise<Feature[]> {
    const response = await apiClient.get<{ features: Feature[] }>(
      `/projects/${projectId}/features`,
      { params }
    )
    return response.data.features
  },

  async createFeature(
    projectId: string,
    data: {
      name: string
      description: string
      type: FeatureType
      acceptanceCriteria?: string
      uiNotes?: string
      testData?: string
      contextImages?: string[]
      endpoints?: ApiEndpoint[]
    }
  ): Promise<Feature> {
    const response = await apiClient.post<{ feature: Feature }>(
      `/projects/${projectId}/features`,
      data
    )
    return response.data.feature
  },

  async updateFeature(
    projectId: string,
    featureId: string,
    data: Partial<{ name: string; type: FeatureType; status: FeatureStatus }>
  ): Promise<Feature> {
    const response = await apiClient.patch<{ feature: Feature }>(
      `/projects/${projectId}/features/${featureId}`,
      data
    )
    return response.data.feature
  },

  async deleteFeature(projectId: string, featureId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/features/${featureId}`)
  },
}

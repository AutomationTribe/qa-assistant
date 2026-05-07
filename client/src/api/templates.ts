import apiClient from './client'
import { TestCaseTemplate, TestCaseField } from '@/types/api'

export const templatesAPI = {
  async getTemplate(projectId: string): Promise<TestCaseTemplate | null> {
    const response = await apiClient.get<{ template: TestCaseTemplate | null }>(`/projects/${projectId}/template`)
    return response.data.template
  },

  async createTemplate(projectId: string, fields: Partial<TestCaseField>[]): Promise<TestCaseTemplate> {
    const response = await apiClient.post<{ template: TestCaseTemplate }>(`/projects/${projectId}/template`, { fields })
    return response.data.template
  },

  async updateTemplate(projectId: string, fields: Partial<TestCaseField>[]): Promise<TestCaseTemplate> {
    const response = await apiClient.put<{ template: TestCaseTemplate }>(`/projects/${projectId}/template`, { fields })
    return response.data.template
  },

  async addField(projectId: string, field: Partial<TestCaseField>): Promise<TestCaseTemplate> {
    const response = await apiClient.post<{ template: TestCaseTemplate }>(`/projects/${projectId}/template/fields`, { field })
    return response.data.template
  },

  async removeField(projectId: string, fieldId: string): Promise<TestCaseTemplate> {
    const response = await apiClient.delete<{ template: TestCaseTemplate }>(`/projects/${projectId}/template/fields/${fieldId}`)
    return response.data.template
  },

  async reorderFields(projectId: string, fieldIds: string[]): Promise<TestCaseTemplate> {
    const response = await apiClient.put<{ template: TestCaseTemplate }>(`/projects/${projectId}/template/fields/reorder`, { fieldIds })
    return response.data.template
  },
}

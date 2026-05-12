import apiClient from './client'
import {
  ZephyrConnection,
  ZephyrExportResult,
  ZephyrFieldMapping,
} from '@/types/api'

export const zephyrAPI = {
  async getConnection(projectId: string): Promise<ZephyrConnection | null> {
    const res = await apiClient.get<{ connection: ZephyrConnection | null }>(
      `/projects/${projectId}/zephyr`
    )
    return res.data.connection
  },

  async saveConnection(
    projectId: string,
    data: {
      apiToken: string
      jiraProjectKey: string
      fieldMapping: ZephyrFieldMapping
    }
  ): Promise<ZephyrConnection> {
    const res = await apiClient.post<{ connection: ZephyrConnection }>(
      `/projects/${projectId}/zephyr`,
      data
    )
    return res.data.connection
  },

  async deleteConnection(projectId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/zephyr`)
  },

  async exportTestCases(
    featureId: string,
    testCaseIds: string[] | 'all'
  ): Promise<ZephyrExportResult> {
    const res = await apiClient.post<ZephyrExportResult>(
      `/features/${featureId}/testcases/export-zephyr`,
      { testCaseIds }
    )
    return res.data
  },
}

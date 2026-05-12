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

  async getProjectFolders(
    projectId: string
  ): Promise<Array<{ id: number; name: string; parentId: number | null }>> {
    const res = await apiClient.get<{
      folders: Array<{ id: number; name: string; parentId: number | null }>
    }>(`/projects/${projectId}/zephyr/folders`)
    return res.data.folders
  },

  async exportTestCases(
    featureId: string,
    testCaseIds: string[] | 'all',
    parentFolderId?: number | null
  ): Promise<ZephyrExportResult> {
    const res = await apiClient.post<ZephyrExportResult>(
      `/features/${featureId}/testcases/export-zephyr`,
      { testCaseIds, parentFolderId: parentFolderId ?? null }
    )
    return res.data
  },
}

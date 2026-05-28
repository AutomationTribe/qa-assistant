import apiClient from './client';
export const zephyrAPI = {
    async getConnection(projectId) {
        const res = await apiClient.get(`/projects/${projectId}/zephyr`);
        return res.data.connection;
    },
    async saveConnection(projectId, data) {
        const res = await apiClient.post(`/projects/${projectId}/zephyr`, data);
        return res.data.connection;
    },
    async deleteConnection(projectId) {
        await apiClient.delete(`/projects/${projectId}/zephyr`);
    },
    async getProjectFolders(projectId) {
        const res = await apiClient.get(`/projects/${projectId}/zephyr/folders`);
        return res.data.folders;
    },
    async exportTestCases(featureId, testCaseIds, parentFolderId) {
        const res = await apiClient.post(`/features/${featureId}/testcases/export-zephyr`, { testCaseIds, parentFolderId: parentFolderId ?? null });
        return res.data;
    },
};

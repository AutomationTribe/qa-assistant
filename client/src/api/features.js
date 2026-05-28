import apiClient from './client';
export const featuresAPI = {
    async listFeatures(projectId, params) {
        const response = await apiClient.get(`/projects/${projectId}/features`, { params });
        return response.data.features;
    },
    async createFeature(projectId, data) {
        const response = await apiClient.post(`/projects/${projectId}/features`, data);
        return response.data.feature;
    },
    async updateFeature(projectId, featureId, data) {
        const response = await apiClient.patch(`/projects/${projectId}/features/${featureId}`, data);
        return response.data.feature;
    },
    async deleteFeature(projectId, featureId) {
        await apiClient.delete(`/projects/${projectId}/features/${featureId}`);
    },
};

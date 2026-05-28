import apiClient from './client';
export const templatesAPI = {
    async getTemplate(projectId) {
        const response = await apiClient.get(`/projects/${projectId}/template`);
        return response.data.template;
    },
    async createTemplate(projectId, fields) {
        const response = await apiClient.post(`/projects/${projectId}/template`, { fields });
        return response.data.template;
    },
    async updateTemplate(projectId, fields) {
        const response = await apiClient.put(`/projects/${projectId}/template`, { fields });
        return response.data.template;
    },
    async addField(projectId, field) {
        const response = await apiClient.post(`/projects/${projectId}/template/fields`, { field });
        return response.data.template;
    },
    async removeField(projectId, fieldId) {
        const response = await apiClient.delete(`/projects/${projectId}/template/fields/${fieldId}`);
        return response.data.template;
    },
    async reorderFields(projectId, fieldIds) {
        const response = await apiClient.put(`/projects/${projectId}/template/fields/reorder`, { fieldIds });
        return response.data.template;
    },
};

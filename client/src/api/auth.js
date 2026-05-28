import apiClient from './client';
export const authAPI = {
    async login(email, password) {
        const response = await apiClient.post('/auth/login', {
            email,
            password,
        });
        return response.data;
    },
    async register(email, name, password, workspaceName) {
        const response = await apiClient.post('/auth/register', {
            email,
            name,
            password,
            workspaceName,
        });
        return response.data;
    },
    async refresh() {
        const response = await apiClient.post('/auth/refresh');
        return response.data;
    },
    async logout() {
        await apiClient.post('/auth/logout');
    },
};

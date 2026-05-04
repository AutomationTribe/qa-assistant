import apiClient from './client';
export async function getProjects() {
    const response = await apiClient.get('/v1/projects');
    return response.data.projects;
}
export async function createProject(data) {
    const response = await apiClient.post('/v1/projects', data);
    return response.data.project;
}
export async function updateProject(id, data) {
    const response = await apiClient.patch(`/v1/projects/${id}`, data);
    return response.data.project;
}
export async function deleteProject(id) {
    await apiClient.delete(`/v1/projects/${id}`);
}

import apiClient from './client';
export async function getProjects() {
    const response = await apiClient.get('/projects');
    return response.data.projects;
}
export async function getProject(id) {
    const projects = await getProjects();
    return projects.find((p) => p.id === id) || null;
}
export async function createProject(data) {
    const response = await apiClient.post('/projects', data);
    return response.data.project;
}
export async function updateProject(id, data) {
    const response = await apiClient.patch(`/projects/${id}`, data);
    return response.data.project;
}
export async function deleteProject(id) {
    await apiClient.delete(`/projects/${id}`);
}

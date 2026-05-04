import apiClient from './client'
import type { Project, TemplateConfig } from '@/types/api'

export async function getProjects(): Promise<Project[]> {
  const response = await apiClient.get<{ projects: Project[] }>('/v1/projects')
  return response.data.projects
}

export async function createProject(data: {
  name: string
  templateConfig: TemplateConfig
}): Promise<Project> {
  const response = await apiClient.post<{ project: Project }>('/v1/projects', data)
  return response.data.project
}

export async function updateProject(
  id: string,
  data: Partial<{ name: string; templateConfig: TemplateConfig }>
): Promise<Project> {
  const response = await apiClient.patch<{ project: Project }>(`/v1/projects/${id}`, data)
  return response.data.project
}

export async function deleteProject(id: string): Promise<void> {
  await apiClient.delete(`/v1/projects/${id}`)
}

import apiClient from './client'
import type { Project, TemplateConfig } from '@/types/api'

export async function getProjects(): Promise<Project[]> {
  const response = await apiClient.get<{ projects: Project[] }>('/projects')
  return response.data.projects
}

export async function getProject(id: string): Promise<Project | null> {
  const projects = await getProjects()
  return projects.find((p) => p.id === id) || null
}

export async function createProject(data: {
  name: string
  description?: string
  baseUrl?: string
  templateConfig: TemplateConfig
  logins?: Array<{ username: string; password: string; role?: string }>
}): Promise<Project> {
  const response = await apiClient.post<{ project: Project }>('/projects', data)
  return response.data.project
}

export async function updateProject(
  id: string,
  data: Partial<{ name: string; templateConfig: TemplateConfig }>
): Promise<Project> {
  const response = await apiClient.patch<{ project: Project }>(`/projects/${id}`, data)
  return response.data.project
}

export async function deleteProject(id: string): Promise<void> {
  await apiClient.delete(`/projects/${id}`)
}

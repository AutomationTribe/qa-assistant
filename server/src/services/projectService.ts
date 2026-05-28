import { prisma } from '../lib/prisma'

class ProjectError extends Error {
  constructor(public code: string, message: string) {
    super(message)
    this.name = 'ProjectError'
  }
}

interface TemplateConfig {
  style: 'bdd' | 'step_by_step' | 'exploratory'
}

interface ProjectLogin {
  username: string
  password: string
  role?: string
}

interface CreateProjectPayload {
  name: string
  description?: string
  baseUrl?: string
  templateConfig: TemplateConfig
  logins?: ProjectLogin[]
}

interface UpdateProjectPayload {
  name?: string
  description?: string
  baseUrl?: string
  templateConfig?: TemplateConfig
  logins?: ProjectLogin[]
}

export const projectService = {
  async listProjects(workspaceId: string) {
    const projects = await prisma.project.findMany({
      where: {
        workspaceId,
        deletedAt: { equals: null },
      },
      select: {
        id: true,
        name: true,
        description: true,
        baseUrl: true,
        workspaceId: true,
        templateConfig: true,
        logins: true,
        createdAt: true,
        _count: {
          select: { tickets: true, features: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return projects
  },

  async createProject(workspaceId: string, data: any) {
    const { name, description, baseUrl, templateConfig, logins } = data

    const existingProject = await prisma.project.findFirst({
      where: {
        workspaceId,
        name,
        deletedAt: { equals: null },
      },
    })

    if (existingProject) {
      throw new ProjectError('PROJECT_EXISTS', 'Project name already exists in this workspace')
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        baseUrl: baseUrl || null,
        workspaceId,
        templateConfig: templateConfig as any,
        logins: logins && logins.length > 0 ? (logins as any) : null,
        template: {
          create: {},
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        baseUrl: true,
        workspaceId: true,
        templateConfig: true,
        logins: true,
        createdAt: true,
        _count: {
          select: { tickets: true, features: true },
        },
      },
    })

    return project
  },

  async updateProject(projectId: string, workspaceId: string, data: any) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project || project.deletedAt) {
      throw new ProjectError('PROJECT_NOT_FOUND', 'Project not found')
    }

    if (project.workspaceId !== workspaceId) {
      throw new ProjectError('PROJECT_NOT_FOUND', 'Project not found')
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.baseUrl !== undefined && { baseUrl: data.baseUrl || null }),
        ...(data.templateConfig && { templateConfig: data.templateConfig as any }),
        ...(data.logins !== undefined && { logins: data.logins && data.logins.length > 0 ? (data.logins as any) : null }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        baseUrl: true,
        workspaceId: true,
        templateConfig: true,
        logins: true,
        updatedAt: true,
        _count: {
          select: { tickets: true, features: true },
        },
      },
    })

    return updatedProject
  },

  async deleteProject(projectId: string, workspaceId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project || project.deletedAt) {
      throw new ProjectError('PROJECT_NOT_FOUND', 'Project not found')
    }

    if (project.workspaceId !== workspaceId) {
      throw new ProjectError('PROJECT_NOT_FOUND', 'Project not found')
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
    })
  },
}

export { ProjectError }

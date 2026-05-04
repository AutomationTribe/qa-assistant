import { prisma } from '@/lib/prisma'

class ProjectError extends Error {
  constructor(public code: string, message: string) {
    super(message)
    this.name = 'ProjectError'
  }
}

interface TemplateConfig {
  style: 'bdd' | 'step_by_step' | 'exploratory'
}

interface CreateProjectPayload {
  name: string
  templateConfig: TemplateConfig
}

interface UpdateProjectPayload {
  name?: string
  templateConfig?: TemplateConfig
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
        workspaceId: true,
        templateConfig: true,
        createdAt: true,
        _count: {
          select: { tickets: { where: { id: { not: undefined } } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return projects
  },

  async createProject(workspaceId: string, data: CreateProjectPayload) {
    const { name, templateConfig } = data

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
        workspaceId,
        templateConfig,
      },
      select: {
        id: true,
        name: true,
        workspaceId: true,
        templateConfig: true,
        createdAt: true,
      },
    })

    return project
  },

  async updateProject(projectId: string, workspaceId: string, data: UpdateProjectPayload) {
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
        ...(data.templateConfig && { templateConfig: data.templateConfig }),
      },
      select: {
        id: true,
        name: true,
        workspaceId: true,
        templateConfig: true,
        updatedAt: true,
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

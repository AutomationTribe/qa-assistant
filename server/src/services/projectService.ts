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

const DEFAULT_TEMPLATE_FIELDS = [
  {
    name: 'Test Title',
    key: 'test_title',
    type: 'TEXT' as const,
    description: 'A concise, descriptive name for this test case',
    required: true,
    order: 0,
  },
  {
    name: 'Preconditions',
    key: 'preconditions',
    type: 'TEXTAREA' as const,
    description: 'Any setup or state required before running this test',
    required: false,
    order: 1,
  },
  {
    name: 'Test Steps',
    key: 'test_steps',
    type: 'STEPS' as const,
    description: 'Numbered steps the tester must follow to execute this test case',
    required: true,
    order: 2,
  },
  {
    name: 'Expected Result',
    key: 'expected_result',
    type: 'TEXTAREA' as const,
    description: 'What should happen if the test passes',
    required: true,
    order: 3,
  },
  {
    name: 'Priority',
    key: 'priority',
    type: 'SELECT' as const,
    description: 'The importance of this test case',
    required: true,
    order: 4,
    options: ['HIGH', 'MEDIUM', 'LOW'],
  },
  {
    name: 'Test Type',
    key: 'test_type',
    type: 'SELECT' as const,
    description: 'The category of this test case',
    required: true,
    order: 5,
    options: ['POSITIVE', 'NEGATIVE', 'EDGE_CASE'],
  },
]

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
          select: { tickets: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return projects
  },

  async createProject(workspaceId: string, data: CreateProjectPayload) {
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
        templateConfig,
        logins: logins && logins.length > 0 ? logins : null,
        template: {
          create: {
            fields: {
              createMany: {
                data: DEFAULT_TEMPLATE_FIELDS.map((f) => ({
                  name: f.name,
                  key: f.key,
                  type: f.type,
                  description: f.description,
                  required: f.required,
                  order: f.order,
                  options: f.options ? f.options : null,
                })),
              },
            },
          },
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
          select: { tickets: true },
        },
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
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.baseUrl !== undefined && { baseUrl: data.baseUrl || null }),
        ...(data.templateConfig && { templateConfig: data.templateConfig }),
        ...(data.logins !== undefined && { logins: data.logins && data.logins.length > 0 ? data.logins : null }),
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
          select: { tickets: true },
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

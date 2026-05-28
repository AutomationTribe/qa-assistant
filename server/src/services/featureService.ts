import { prisma } from '@/lib/prisma'

class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

interface ListFilters {
  search?: string
  dateFrom?: string
  dateTo?: string
  status?: 'DRAFT' | 'FINAL'
}

export const featureService = {
  async listFeatures(
    projectId: string,
    workspaceId: string,
    filters?: ListFilters
  ) {
    console.log('listFeatures called:', { projectId, workspaceId })
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    console.log('Project found:', project?.id, project?.workspaceId)
    if (!project) throw new NotFoundError('Project not found')
    if (project.workspaceId !== workspaceId) throw new UnauthorizedError('Unauthorized')

    const where: any = {
      projectId,
      deletedAt: null,
    }

    if (filters?.dateFrom) {
      where.createdAt = { gte: new Date(filters.dateFrom) }
    }

    if (filters?.dateTo) {
      const toDate = new Date(filters.dateTo)
      toDate.setHours(23, 59, 59, 999)
      if (where.createdAt) {
        where.createdAt.lte = toDate
      } else {
        where.createdAt = { lte: toDate }
      }
    }

    if (filters?.status) {
      where.status = filters.status
    }

    const features = await prisma.feature.findMany({
      where,
      include: { _count: { select: { testCases: true } } },
      take: 500, // Reduced limit to prevent MySQL sort buffer overflow
    })

    // Sort in memory instead of database to avoid sort buffer issues
    features.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    if (!filters?.search) {
      return features
    }

    const searchLower = filters.search.toLowerCase()
    return features.filter(f => f.name.toLowerCase().includes(searchLower))
  },

  async createFeature(
    projectId: string,
    workspaceId: string,
    data: {
      name?: string
      description?: string
      type: 'NEW_FEATURE' | 'BUG' | 'BACKEND_API'
      acceptanceCriteria?: string
      uiNotes?: string
      testData?: string
      contextImages?: string[]
      endpoints?: any[]
    }
  ) {
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) throw new NotFoundError('Project not found')
    if (project.workspaceId !== workspaceId) throw new UnauthorizedError('Unauthorized')

    const feature = await prisma.feature.create({
      data: {
        name: data.name || '',
        description: data.description || '',
        acceptanceCriteria: data.acceptanceCriteria || null,
        uiNotes: data.uiNotes || null,
        testData: data.testData || null,
        contextImages: data.contextImages?.length ? data.contextImages : null,
        endpoints: data.endpoints?.length ? data.endpoints : null,
        type: data.type,
        status: 'FINAL',
        projectId,
      },
      include: { _count: { select: { testCases: true } } },
    })

    return feature
  },

  async updateFeature(
    featureId: string,
    workspaceId: string,
    data: {
      name?: string
      description?: string
      type?: 'NEW_FEATURE' | 'BUG' | 'BACKEND_API'
      status?: 'DRAFT' | 'FINAL'
      acceptanceCriteria?: string
      uiNotes?: string
      testData?: string
      contextImages?: string[]
      endpoints?: any[]
    }
  ) {
    const feature = await prisma.feature.findUnique({ where: { id: featureId } })
    if (!feature) throw new NotFoundError('Feature not found')

    const project = await prisma.project.findUnique({ where: { id: feature.projectId } })
    if (!project || project.workspaceId !== workspaceId) {
      throw new UnauthorizedError('Unauthorized')
    }

    const updated = await prisma.feature.update({
      where: { id: featureId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.type && { type: data.type }),
        ...(data.status && { status: data.status }),
        ...(data.acceptanceCriteria !== undefined && { acceptanceCriteria: data.acceptanceCriteria || null }),
        ...(data.uiNotes !== undefined && { uiNotes: data.uiNotes || null }),
        ...(data.testData !== undefined && { testData: data.testData || null }),
        ...(data.contextImages !== undefined && { contextImages: data.contextImages?.length ? data.contextImages : null }),
        ...(data.endpoints !== undefined && { endpoints: data.endpoints?.length ? data.endpoints : null }),
      },
      include: { _count: { select: { testCases: true } } },
    })

    return updated
  },

  async deleteFeature(featureId: string, workspaceId: string) {
    const feature = await prisma.feature.findUnique({ where: { id: featureId } })
    if (!feature) throw new NotFoundError('Feature not found')

    const project = await prisma.project.findUnique({ where: { id: feature.projectId } })
    if (!project || project.workspaceId !== workspaceId) {
      throw new UnauthorizedError('Unauthorized')
    }

    await prisma.feature.update({
      where: { id: featureId },
      data: { deletedAt: new Date() },
    })

    return { message: 'Feature deleted' }
  },
}

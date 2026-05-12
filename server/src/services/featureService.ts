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
    const project = await prisma.project.findUnique({ where: { id: projectId } })
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
      orderBy: { createdAt: 'desc' },
    })

    if (!filters?.search) {
      return features
    }

    const searchLower = filters.search.toLowerCase()
    return features.filter(f => f.name.toLowerCase().includes(searchLower))
  },

  async createFeature(
    projectId: string,
    workspaceId: string,
    data: { name: string; type: 'NEW_FEATURE' | 'BUG'; description?: string }
  ) {
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) throw new NotFoundError('Project not found')
    if (project.workspaceId !== workspaceId) throw new UnauthorizedError('Unauthorized')

    const feature = await prisma.feature.create({
      data: {
        name: data.name,
        description: data.description || null,
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
    data: { name?: string; type?: 'NEW_FEATURE' | 'BUG'; status?: 'DRAFT' | 'FINAL' }
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
        ...(data.name && { name: data.name }),
        ...(data.type && { type: data.type }),
        ...(data.status && { status: data.status }),
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

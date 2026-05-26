import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { featureService } from '@/services/featureService'

interface AuthRequest extends Request {
  user?: { id: string; workspaceId: string }
}

const createSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  type: z.enum(['NEW_FEATURE', 'BUG', 'BACKEND_API']),
  acceptanceCriteria: z.string().optional(),
  uiNotes: z.string().optional(),
  testData: z.string().optional(),
  contextImages: z.array(z.string()).optional(),
  endpoints: z.array(z.object({
    id: z.string(),
    apiType: z.enum(['REST', 'GRAPHQL', 'WEBSOCKET']),
    method: z.string(),
    path: z.string(),
    requestBody: z.string().optional(),
    expectedResponse: z.string().optional(),
    authRequired: z.boolean(),
    authType: z.enum(['Bearer', 'API_Key', 'Basic', 'None']).optional(),
    notes: z.string().optional(),
  })).optional(),
})

const updateSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  type: z.enum(['NEW_FEATURE', 'BUG', 'BACKEND_API']).optional(),
  status: z.enum(['DRAFT', 'FINAL']).optional(),
  acceptanceCriteria: z.string().optional(),
  uiNotes: z.string().optional(),
  testData: z.string().optional(),
  contextImages: z.array(z.string()).optional(),
  endpoints: z.array(z.object({
    id: z.string(),
    apiType: z.enum(['REST', 'GRAPHQL', 'WEBSOCKET']),
    method: z.string(),
    path: z.string(),
    requestBody: z.string().optional(),
    expectedResponse: z.string().optional(),
    authRequired: z.boolean(),
    authType: z.enum(['Bearer', 'API_Key', 'Basic', 'None']).optional(),
    notes: z.string().optional(),
  })).optional(),
})

export const featureController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params
      const { search, dateFrom, dateTo, status } = req.query

      console.log('Fetching features for project:', projectId, 'user:', req.user?.id, 'workspace:', req.user?.workspaceId)
      const features = await featureService.listFeatures(projectId, req.user!.workspaceId, {
        search: search as string | undefined,
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
        status: status as 'DRAFT' | 'FINAL' | undefined,
      })
      console.log('Found features:', features.length)

      res.json({ features })
    } catch (error) {
      console.error('Features list error:', error)
      next(error)
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params
      const data = createSchema.parse(req.body)

      const feature = await featureService.createFeature(projectId, req.user!.workspaceId, data)
      res.status(201).json({ feature })
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' },
        })
      } else {
        next(error)
      }
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { featureId } = req.params
      const data = updateSchema.parse(req.body)

      const feature = await featureService.updateFeature(featureId, req.user!.workspaceId, data)
      res.json({ feature })
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' },
        })
      } else {
        next(error)
      }
    }
  },

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { featureId } = req.params
      const result = await featureService.deleteFeature(featureId, req.user!.workspaceId)
      res.json(result)
    } catch (error) {
      next(error)
    }
  },
}

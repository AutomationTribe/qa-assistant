import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { featureService } from '@/services/featureService'

interface AuthRequest extends Request {
  user?: { id: string; workspaceId: string }
}

const createSchema = z.object({
  name: z.string().min(3).max(200),
  type: z.enum(['NEW_FEATURE', 'BUG']),
})

const updateSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  type: z.enum(['NEW_FEATURE', 'BUG']).optional(),
  status: z.enum(['DRAFT', 'FINAL']).optional(),
})

export const featureController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params
      const { search, dateFrom, dateTo, status } = req.query

      const features = await featureService.listFeatures(projectId, req.user!.workspaceId, {
        search: search as string | undefined,
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
        status: status as 'DRAFT' | 'FINAL' | undefined,
      })

      res.json({ features })
    } catch (error) {
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

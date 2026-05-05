import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { projectService, ProjectError } from '@/services/projectService'

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  baseUrl: z.string().url().optional().or(z.literal('')),
  templateConfig: z.object({
    style: z.enum(['bdd', 'step_by_step', 'exploratory']),
  }),
  logins: z
    .array(
      z.object({
        username: z.string().min(1),
        password: z.string().min(1),
        role: z.string().optional(),
      })
    )
    .optional(),
})

const updateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').optional(),
  templateConfig: z.object({
    style: z.enum(['bdd', 'step_by_step', 'exploratory']),
  }).optional(),
})

export const projectController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.user!.workspaceId

      const projects = await projectService.listProjects(workspaceId)

      res.status(200).json({
        projects,
      })
    } catch (err) {
      next(err)
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createProjectSchema.parse(req.body)
      const workspaceId = req.user!.workspaceId

      const project = await projectService.createProject(workspaceId, data)

      res.status(201).json({
        project,
      })
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: err.errors[0].message,
          },
        })
        return
      }

      if (err instanceof ProjectError && err.code === 'PROJECT_EXISTS') {
        res.status(409).json({
          error: {
            code: err.code,
            message: err.message,
          },
        })
        return
      }

      next(err)
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = updateProjectSchema.parse(req.body)
      const projectId = req.params.id
      const workspaceId = req.user!.workspaceId

      const project = await projectService.updateProject(projectId, workspaceId, data)

      res.status(200).json({
        project,
      })
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: err.errors[0].message,
          },
        })
        return
      }

      if (err instanceof ProjectError && err.code === 'PROJECT_NOT_FOUND') {
        res.status(404).json({
          error: {
            code: err.code,
            message: err.message,
          },
        })
        return
      }

      next(err)
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.id
      const workspaceId = req.user!.workspaceId

      await projectService.deleteProject(projectId, workspaceId)

      res.status(200).json({
        message: 'Project deleted',
      })
    } catch (err) {
      if (err instanceof ProjectError && err.code === 'PROJECT_NOT_FOUND') {
        res.status(404).json({
          error: {
            code: err.code,
            message: err.message,
          },
        })
        return
      }

      next(err)
    }
  },
}

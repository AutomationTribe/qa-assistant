import { Request, Response } from 'express'
import { templateService, TemplateError } from '../services/templateService'

export const templateController = {
  async getTemplate(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      const workspaceId = req.user!.workspaceId

      const template = await templateService.getTemplate(projectId, workspaceId)

      res.json({ template })
    } catch (error) {
      if (error instanceof TemplateError) {
        return res.status(error.code === 'PROJECT_NOT_FOUND' ? 404 : 400).json({
          error: { code: error.code, message: error.message },
        })
      }
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      })
    }
  },

  async createTemplate(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      const { fields } = req.body
      const workspaceId = req.user!.workspaceId

      const template = await templateService.createTemplate(projectId, workspaceId, fields)

      res.status(201).json({ template })
    } catch (error) {
      if (error instanceof TemplateError) {
        if (error.code === 'PROJECT_NOT_FOUND') return res.status(404).json({ error: { code: error.code, message: error.message } })
        return res.status(400).json({
          error: { code: error.code, message: error.message },
        })
      }
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      })
    }
  },

  async updateTemplate(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      const { fields } = req.body
      const workspaceId = req.user!.workspaceId

      const template = await templateService.getTemplate(projectId, workspaceId)

      if (!template) {
        return res.status(404).json({
          error: { code: 'TEMPLATE_NOT_FOUND', message: 'Template not found' },
        })
      }

      const updatedTemplate = await templateService.updateTemplate(template.id, projectId, workspaceId, fields)

      res.json({ template: updatedTemplate })
    } catch (error) {
      if (error instanceof TemplateError) {
        if (error.code === 'PROJECT_NOT_FOUND') return res.status(404).json({ error: { code: error.code, message: error.message } })
        return res.status(400).json({
          error: { code: error.code, message: error.message },
        })
      }
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      })
    }
  },

  async addField(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      const { field } = req.body
      const workspaceId = req.user!.workspaceId

      const template = await templateService.getTemplate(projectId, workspaceId)

      if (!template) {
        return res.status(404).json({
          error: { code: 'TEMPLATE_NOT_FOUND', message: 'Template not found' },
        })
      }

      const updatedTemplate = await templateService.addField(template.id, projectId, workspaceId, field)

      res.json({ template: updatedTemplate })
    } catch (error) {
      if (error instanceof TemplateError) {
        if (error.code === 'TEMPLATE_NOT_FOUND') return res.status(404).json({ error: { code: error.code, message: error.message } })
        return res.status(400).json({
          error: { code: error.code, message: error.message },
        })
      }
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      })
    }
  },

  async removeField(req: Request, res: Response) {
    try {
      const { projectId, fieldId } = req.params
      const workspaceId = req.user!.workspaceId

      const template = await templateService.getTemplate(projectId, workspaceId)

      if (!template) {
        return res.status(404).json({
          error: { code: 'TEMPLATE_NOT_FOUND', message: 'Template not found' },
        })
      }

      const updatedTemplate = await templateService.removeField(fieldId, template.id, workspaceId)

      res.json({ template: updatedTemplate })
    } catch (error) {
      if (error instanceof TemplateError) {
        if (error.code === 'FIELD_NOT_FOUND') return res.status(404).json({ error: { code: error.code, message: error.message } })
        return res.status(400).json({
          error: { code: error.code, message: error.message },
        })
      }
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      })
    }
  },

  async reorderFields(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      const { fieldIds } = req.body
      const workspaceId = req.user!.workspaceId

      const template = await templateService.getTemplate(projectId, workspaceId)

      if (!template) {
        return res.status(404).json({
          error: { code: 'TEMPLATE_NOT_FOUND', message: 'Template not found' },
        })
      }

      const updatedTemplate = await templateService.reorderFields(template.id, workspaceId, fieldIds)

      res.json({ template: updatedTemplate })
    } catch (error) {
      if (error instanceof TemplateError) {
        return res.status(400).json({
          error: { code: error.code, message: error.message },
        })
      }
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      })
    }
  },
}

import { Request, Response, NextFunction } from 'express'
import { zephyrService } from './services/zephyrService'

export const zephyrController = {

  getConnection: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conn = await zephyrService.getConnection(
        req.params.projectId,
        req.user!.workspaceId
      )
      return res.json({ connection: conn })
    } catch (err) { next(err) }
  },

  saveConnection: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { apiToken, jiraProjectKey, fieldMapping } = req.body

      if (!apiToken || typeof apiToken !== 'string' || !apiToken.trim()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'apiToken is required and must be a non-empty string',
          },
        })
      }
      if (!jiraProjectKey || !jiraProjectKey.trim()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'jiraProjectKey is required',
          },
        })
      }
      if (!fieldMapping || !fieldMapping.name || !fieldMapping.steps) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'fieldMapping must include "name" and "steps" keys',
          },
        })
      }

      const trimmedToken = apiToken.trim()

      const valid = await zephyrService.testConnection(trimmedToken)
      if (!valid) {
        return res.status(400).json({
          error: {
            code: 'INVALID_TOKEN',
            message:
              'Could not connect to Zephyr Scale. Check your API token and try again.',
          },
        })
      }

      const conn = await zephyrService.saveConnection(
        req.params.projectId,
        req.user!.workspaceId,
        {
          apiToken: trimmedToken,
          jiraProjectKey: jiraProjectKey.trim().toUpperCase(),
          fieldMapping,
        }
      )

      return res.json({
        connection: {
          id: conn.id,
          jiraProjectKey: conn.jiraProjectKey,
          fieldMapping: conn.fieldMapping,
          connected: true,
        },
      })
    } catch (err) { next(err) }
  },

  deleteConnection: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await zephyrService.deleteConnection(
        req.params.projectId,
        req.user!.workspaceId
      )
      return res.json({ message: 'Zephyr connection removed' })
    } catch (err) { next(err) }
  },

  getFolders: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const folders = await zephyrService.getProjectFolders(
        req.params.projectId,
        req.user!.workspaceId
      )
      return res.json({ folders })
    } catch (err) { next(err) }
  },

  exportTestCases: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { testCaseIds, parentFolderId } = req.body
      if (!testCaseIds) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'testCaseIds is required',
          },
        })
      }

      const result = await zephyrService.exportTestCases(
        req.params.featureId,
        testCaseIds,
        req.user!.workspaceId,
        parentFolderId ? Number(parentFolderId) : null
      )
      return res.json(result)
    } catch (err: any) {
      if (err.message?.startsWith('NO_ZEPHYR')) {
        return res.status(400).json({
          error: {
            code: 'NO_ZEPHYR_CONNECTION',
            message: err.message.replace('NO_ZEPHYR: ', ''),
          },
        })
      }
      next(err)
    }
  },
}

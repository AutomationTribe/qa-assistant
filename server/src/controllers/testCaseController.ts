import { Request, Response, NextFunction } from 'express'
import { testCaseService } from '../services/testCaseService'

export const testCaseController = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { featureId } = req.params
      const { testCases, fields } = await testCaseService.listTestCases(
        featureId,
        req.user!.workspaceId
      )
      return res.json({ testCases, fields })
    } catch (error) {
      next(error)
    }
  },

  generate: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { featureId } = req.params
      const result = await testCaseService.generateTestCases(
        featureId,
        req.user!.workspaceId
      )
      return res.json({
        testCases: result.testCases,
        fields: result.fields,
        count: result.testCases.length,
        alreadyExisted: result.alreadyExisted || false,
      })
    } catch (error: any) {
      if (error.message?.startsWith('NO_TEMPLATE')) {
        return res.status(400).json({
          error: { code: 'NO_TEMPLATE', message: error.message.replace('NO_TEMPLATE: ', '') }
        })
      }
      next(error)
    }
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { testCaseId } = req.params
      const { fieldValues } = req.body
      const testCase = await testCaseService.updateTestCase(
        testCaseId,
        req.user!.workspaceId,
        { fieldValues }
      )
      return res.json({ testCase })
    } catch (error) {
      next(error)
    }
  },

  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { testCaseId } = req.params
      await testCaseService.deleteTestCase(testCaseId, req.user!.workspaceId)
      return res.json({ message: 'Test case deleted' })
    } catch (error) {
      next(error)
    }
  },
}

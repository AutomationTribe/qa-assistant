import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { zephyrController } from '../controllers/zephyrController'

const router = Router({ mergeParams: true })
router.use(authenticate)

/**
 * @swagger
 * /api/v1/projects/{projectId}/zephyr:
 *   get:
 *     tags: [Zephyr]
 *     summary: Get Zephyr connection status for a project
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Connection object or null
 */
router.get('/projects/:projectId/zephyr', zephyrController.getConnection)

/**
 * @swagger
 * /api/v1/projects/{projectId}/zephyr:
 *   post:
 *     tags: [Zephyr]
 *     summary: Save Zephyr connection for a project
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [apiToken, jiraProjectKey, fieldMapping]
 *             properties:
 *               apiToken:
 *                 type: string
 *               jiraProjectKey:
 *                 type: string
 *                 example: MAP
 *               fieldMapping:
 *                 type: object
 *                 example:
 *                   name: test_title
 *                   steps: test_steps
 *                   objective: expected_result
 *                   priority: priority
 *     responses:
 *       200:
 *         description: Connection saved
 *       400:
 *         description: Invalid token or missing fields
 */
router.post('/projects/:projectId/zephyr', zephyrController.saveConnection)

/**
 * @swagger
 * /api/v1/projects/{projectId}/zephyr:
 *   delete:
 *     tags: [Zephyr]
 *     summary: Remove Zephyr connection from a project
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Connection removed
 */
router.delete('/projects/:projectId/zephyr', zephyrController.deleteConnection)

/**
 * @swagger
 * /api/v1/projects/{projectId}/zephyr/folders:
 *   get:
 *     tags: [Zephyr]
 *     summary: Get existing Zephyr folders for a project
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of folders with id, name, parentId
 */
router.get(
  '/projects/:projectId/zephyr/folders',
  zephyrController.getFolders
)

/**
 * @swagger
 * /api/v1/features/{featureId}/testcases/export-zephyr:
 *   post:
 *     tags: [Zephyr]
 *     summary: Export test cases to Zephyr Scale
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: featureId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [testCaseIds]
 *             properties:
 *               testCaseIds:
 *                 oneOf:
 *                   - type: string
 *                     enum: [all]
 *                   - type: array
 *                     items: { type: string }
 *     responses:
 *       200:
 *         description: Export results with successCount and failCount
 */
router.post(
  '/features/:featureId/testcases/export-zephyr',
  zephyrController.exportTestCases
)

export default router

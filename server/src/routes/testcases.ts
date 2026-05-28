import { Router } from 'express'
import { testCaseController } from '../controllers/testCaseController'
import { authenticate } from '../middleware/auth'

const router = Router({ mergeParams: true })

/**
 * @swagger
 * /api/v1/features/{featureId}/testcases:
 *   get:
 *     summary: List test cases for a feature
 *     tags: [Test Cases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: featureId
 *         required: true
 *         schema:
 *           type: string
 *         description: Feature ID
 *     responses:
 *       200:
 *         description: List of test cases with template fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 testCases:
 *                   type: array
 *                   items:
 *                     type: object
 *                 fields:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/features/:featureId/testcases', authenticate, testCaseController.list)

/**
 * @swagger
 * /api/v1/features/{featureId}/testcases/generate:
 *   post:
 *     summary: Generate test cases with AI
 *     tags: [Test Cases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: featureId
 *         required: true
 *         schema:
 *           type: string
 *         description: Feature ID
 *     responses:
 *       200:
 *         description: Test cases generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 testCases:
 *                   type: array
 *                   items:
 *                     type: object
 *                 fields:
 *                   type: array
 *                   items:
 *                     type: object
 *                 count:
 *                   type: integer
 */
router.post('/features/:featureId/testcases/generate', authenticate, testCaseController.generate)

/**
 * @swagger
 * /api/v1/testcases/{testCaseId}:
 *   patch:
 *     summary: Update a test case's field values
 *     tags: [Test Cases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: testCaseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Test Case ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fieldValues
 *             properties:
 *               fieldValues:
 *                 type: object
 *                 description: Field values as key-value pairs
 *     responses:
 *       200:
 *         description: Test case updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 testCase:
 *                   type: object
 */
router.patch('/testcases/:testCaseId', authenticate, testCaseController.update)

/**
 * @swagger
 * /api/v1/testcases/{testCaseId}:
 *   delete:
 *     summary: Delete a test case
 *     tags: [Test Cases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: testCaseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Test Case ID
 *     responses:
 *       200:
 *         description: Test case deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.delete('/testcases/:testCaseId', authenticate, testCaseController.remove)

export default router

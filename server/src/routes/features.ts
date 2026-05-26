import { Router } from 'express'
import { featureController } from '@/controllers/featureController'
import { authenticate } from '@/middleware/auth'

const router = Router({ mergeParams: true })

router.use(authenticate)

/**
 * @swagger
 * /projects/{projectId}/features:
 *   get:
 *     summary: List all features for a project
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: search
 *         in: query
 *         schema: { type: string }
 *       - name: dateFrom
 *         in: query
 *         schema: { type: string, format: date-time }
 *       - name: dateTo
 *         in: query
 *         schema: { type: string, format: date-time }
 *       - name: status
 *         in: query
 *         schema: { type: string, enum: [DRAFT, FINAL] }
 *     responses:
 *       200:
 *         description: List of features
 */
router.get('/', featureController.list)

/**
 * @swagger
 * /projects/{projectId}/features:
 *   post:
 *     summary: Create a new feature
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
 *             required: [name, type, description]
 *             properties:
 *               name: { type: string, minLength: 3, maxLength: 200 }
 *               description: { type: string, minLength: 10, maxLength: 5000 }
 *               type: { type: string, enum: [NEW_FEATURE, BUG] }
 *               acceptanceCriteria: { type: string }
 *               uiNotes: { type: string }
 *               testData: { type: string }
 *               contextImages: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Feature created
 */
router.post('/', featureController.create)

/**
 * @swagger
 * /projects/{projectId}/features/{featureId}:
 *   patch:
 *     summary: Update a feature
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: featureId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, minLength: 3, maxLength: 200 }
 *               description: { type: string, minLength: 10, maxLength: 5000 }
 *               type: { type: string, enum: [NEW_FEATURE, BUG] }
 *               status: { type: string, enum: [DRAFT, FINAL] }
 *               acceptanceCriteria: { type: string }
 *               uiNotes: { type: string }
 *               testData: { type: string }
 *               contextImages: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Feature updated
 */
router.patch('/:featureId', featureController.update)

/**
 * @swagger
 * /projects/{projectId}/features/{featureId}:
 *   delete:
 *     summary: Delete a feature
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: featureId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Feature deleted
 */
router.delete('/:featureId', featureController.remove)

export default router

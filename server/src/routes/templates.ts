import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { templateController } from '../controllers/templateController'

const router = Router({ mergeParams: true })

router.use(authenticate)

/**
 * @swagger
 * /api/v1/projects/{projectId}/template:
 *   get:
 *     summary: Get template for a project
 *     tags: [Templates]
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 template:
 *                   type: object
 *                   nullable: true
 *       404:
 *         description: Project not found
 */
router.get('/', templateController.getTemplate)

/**
 * @swagger
 * /api/v1/projects/{projectId}/template:
 *   post:
 *     summary: Create template for a project
 *     tags: [Templates]
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     key:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [TEXT, TEXTAREA, STEPS, SELECT, MULTISELECT, BOOLEAN, NUMBER]
 *                     description:
 *                       type: string
 *                     required:
 *                       type: boolean
 *                     order:
 *                       type: number
 *                     options:
 *                       type: array
 *                       items:
 *                         type: string
 *     responses:
 *       201:
 *         description: Template created
 *       400:
 *         description: Bad request
 */
router.post('/', templateController.createTemplate)

/**
 * @swagger
 * /api/v1/projects/{projectId}/template:
 *   put:
 *     summary: Update template for a project
 *     tags: [Templates]
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Success
 *       404:
 *         description: Template not found
 */
router.put('/', templateController.updateTemplate)

/**
 * @swagger
 * /api/v1/projects/{projectId}/template/fields:
 *   post:
 *     summary: Add a field to template
 *     tags: [Templates]
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               field:
 *                 type: object
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/fields', templateController.addField)

/**
 * @swagger
 * /api/v1/projects/{projectId}/template/fields/{fieldId}:
 *   delete:
 *     summary: Remove a field from template
 *     tags: [Templates]
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: fieldId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.delete('/fields/:fieldId', templateController.removeField)

/**
 * @swagger
 * /api/v1/projects/{projectId}/template/fields/reorder:
 *   put:
 *     summary: Reorder fields in template
 *     tags: [Templates]
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fieldIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.put('/fields/reorder', templateController.reorderFields)

export default router

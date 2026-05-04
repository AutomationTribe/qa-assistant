import { Router } from 'express'
import { authenticate } from '@/middleware/auth'
import { projectController } from '@/controllers/projectController'

const router = Router()

/**
 * @swagger
 * /api/v1/projects:
 *   get:
 *     tags: [Projects]
 *     summary: List all projects for the authenticated workspace
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of projects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 projects:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Project'
 */
router.get('/', authenticate, projectController.list)

/**
 * @swagger
 * /api/v1/projects:
 *   post:
 *     tags: [Projects]
 *     summary: Create a new project
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, templateConfig]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Mobile App QA
 *               templateConfig:
 *                 type: object
 *                 properties:
 *                   style:
 *                     type: string
 *                     enum: [bdd, step_by_step, exploratory]
 *                     example: bdd
 *     responses:
 *       201:
 *         description: Project created
 *       409:
 *         description: Project name already exists in workspace
 */
router.post('/', authenticate, projectController.create)

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   patch:
 *     tags: [Projects]
 *     summary: Update a project
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               templateConfig:
 *                 type: object
 *                 properties:
 *                   style:
 *                     type: string
 *                     enum: [bdd, step_by_step, exploratory]
 *     responses:
 *       200:
 *         description: Project updated
 *       404:
 *         description: Project not found
 */
router.patch('/:id', authenticate, projectController.update)

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   delete:
 *     tags: [Projects]
 *     summary: Soft delete a project
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Project deleted successfully
 *       404:
 *         description: Project not found
 */
router.delete('/:id', authenticate, projectController.delete)

export default router

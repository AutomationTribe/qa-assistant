import { Router } from 'express'
import authRouter from './auth'
import projectsRouter from './projects'
import templatesRouter from './templates'
import featuresRouter from './features'

const router = Router()

router.use('/auth', authRouter)
router.use('/projects', projectsRouter)
router.use('/projects/:projectId/template', templatesRouter)
router.use('/projects/:projectId/features', featuresRouter)

export default router

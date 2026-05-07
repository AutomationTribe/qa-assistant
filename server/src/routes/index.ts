import { Router } from 'express'
import authRouter from './auth'
import projectsRouter from './projects'
import templatesRouter from './templates'

const router = Router()

router.use('/auth', authRouter)
router.use('/projects', projectsRouter)
router.use('/projects/:projectId/template', templatesRouter)

export default router

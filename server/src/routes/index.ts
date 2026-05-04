import { Router } from 'express'
import authRouter from './auth'
import projectsRouter from './projects'

const router = Router()

router.use('/auth', authRouter)
router.use('/projects', projectsRouter)

export default router

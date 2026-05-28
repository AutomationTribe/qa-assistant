import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import logger from './lib/logger'

export interface AuthPayload {
  id: string
  email: string
  role: string
  workspaceId: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : undefined

  if (!token) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    })
    return
  }

  try {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      throw new Error('JWT_SECRET not configured')
    }

    const decoded = jwt.verify(token, secret) as AuthPayload
    req.user = decoded
    next()
  } catch (err) {
    logger.error('Authentication error', { error: err })
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    })
  }
}

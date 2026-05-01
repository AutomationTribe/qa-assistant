import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authService, AuthError } from '@/services/authService'

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  workspaceName: z.string().min(2, 'Workspace name must be at least 2 characters'),
})

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

export const authController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate input
      const { email, name, password, workspaceName } = registerSchema.parse(req.body)

      // Register user
      const { user } = await authService.registerUser(email, name, password, workspaceName)

      res.status(201).json({
        message: 'Account created',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      })
    } catch (err) {
      if (err instanceof AuthError) {
        if (err.code === 'EMAIL_EXISTS') {
          res.status(409).json({
            error: {
              code: err.code,
              message: err.message,
            },
          })
          return
        }
      }
      next(err)
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate input
      const { email, password } = loginSchema.parse(req.body)

      // Login user
      const { accessToken, refreshToken, user } = await authService.loginUser(
        email,
        password
      )

      // Set refresh token as HTTP-only cookie
      const cookieOptions = {
        httpOnly: true,
        sameSite: 'strict' as const,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      }

      res.cookie('refreshToken', refreshToken, cookieOptions)

      res.status(200).json({
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          workspaceId: user.workspaceId,
        },
      })
    } catch (err) {
      if (err instanceof AuthError && err.code === 'INVALID_CREDENTIALS') {
        res.status(401).json({
          error: {
            code: err.code,
            message: err.message,
          },
        })
        return
      }
      next(err)
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get refresh token from cookie
      const refreshToken = req.cookies.refreshToken

      if (!refreshToken) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Refresh token not found',
          },
        })
        return
      }

      // Refresh access token
      const { accessToken, refreshToken: newRefreshToken } =
        await authService.refreshAccessToken(refreshToken)

      // Set new refresh token cookie
      const cookieOptions = {
        httpOnly: true,
        sameSite: 'strict' as const,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      }

      res.cookie('refreshToken', newRefreshToken, cookieOptions)

      res.status(200).json({
        accessToken,
      })
    } catch (err) {
      if (err instanceof AuthError && err.code === 'UNAUTHORIZED') {
        res.status(401).json({
          error: {
            code: err.code,
            message: err.message,
          },
        })
        return
      }
      next(err)
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Clear refresh token cookie
      res.clearCookie('refreshToken')

      res.status(200).json({
        message: 'Logged out',
      })
    } catch (err) {
      next(err)
    }
  },
}

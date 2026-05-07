import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import logger from '@/lib/logger'

interface ErrorResponse {
  error: {
    code: string
    message: string
  }
}

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response<ErrorResponse>,
  next: NextFunction
) => {
  let statusCode = 500
  let code = 'INTERNAL_ERROR'
  let message = 'Something went wrong'

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      statusCode = 404
      code = 'NOT_FOUND'
      message = 'Resource not found'
    } else if (err.code === 'P2002') {
      statusCode = 409
      code = 'CONFLICT'
      message = 'A record with this value already exists'
    } else {
      statusCode = 500
      code = 'INTERNAL_ERROR'
      message =
        process.env.NODE_ENV === 'production'
          ? 'Something went wrong'
          : err.message
    }
  } else if (err instanceof ZodError) {
    statusCode = 400
    code = 'VALIDATION_ERROR'
    message = err.issues[0]?.message || 'Validation error'
  } else if (err instanceof Error) {
    if (err.name === 'NotFoundError') {
      statusCode = 404
      code = 'NOT_FOUND'
      message = err.message
    } else if (err.name === 'UnauthorizedError') {
      statusCode = 403
      code = 'FORBIDDEN'
      message = err.message
    } else {
      statusCode = 500
      code = 'INTERNAL_ERROR'
      message =
        process.env.NODE_ENV === 'production'
          ? 'Something went wrong'
          : err.message
    }
  }

  logger.error(`${code}: ${message}`, { error: err })

  res.status(statusCode).json({
    error: {
      code,
      message,
    },
  })
}

import 'dotenv/config'
import http from 'http'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { Server as SocketIOServer } from 'socket.io'
import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import logger from '@/lib/logger'
import { errorHandler } from '@/middleware/errorHandler'
import apiRouter from '@/routes'

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Regi API',
      version: '1.0.0',
      description: 'AI QA Assistant — Test Case Generation API',
    },
    servers: [
      {
        url: 'http://localhost:3001/api/v1',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/**/*.ts'],
}

const swaggerSpec = swaggerJsdoc(swaggerOptions)

// Create app and HTTP server
const app = express()
const server = http.createServer(app)
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
})

// Middleware
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
)

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

// Rate limiter (disabled in development)
if (process.env.NODE_ENV !== 'development') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests, please try again later',
        },
      })
    },
  })
  app.use(limiter)
}

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  })
})

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.send(swaggerSpec)
})

app.use('/api/v1', apiRouter)

// Error handler (must be last)
app.use(errorHandler)

// Socket.IO events
io.on('connection', (socket) => {
  logger.info('Socket connected: ' + socket.id)

  socket.on('disconnect', () => {
    logger.info('Socket disconnected: ' + socket.id)
  })
})

// Start server
const PORT = process.env.PORT || 3001

async function startServer(): Promise<void> {
  server.listen(PORT, () => {
    logger.info('Regi server running on port ' + PORT)
  })
}

startServer().catch((err) => {
  logger.error('Failed to start server', { error: err })
  process.exit(1)
})

// Process safety
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled rejection', { reason })
  process.exit(1)
})

process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught exception', { error: err })
  process.exit(1)
})

export { app, server, io }

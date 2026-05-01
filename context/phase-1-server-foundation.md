# Phase 1 — Server Foundation

## What we are building
The Express server skeleton inside server/. No features yet — just the
infrastructure everything else will be built on. Think of it as wiring
electricity and plumbing before furnishing any rooms.

## Important — folder awareness
All files in this phase go inside server/. Do not touch client/ at all.

## Rules before you start
- Read server/CLAUDE.md first
- TypeScript strict mode on every file
- No any types anywhere
- Error responses always use shape: { error: { code: string, message: string } }
- Use named exports except where noted below

---

## Files to create

### server/src/lib/prisma.ts
Singleton Prisma client.
- Import PrismaClient from @prisma/client
- Use the globalThis singleton pattern to prevent multiple instances
  during hot reload in development
- Export a single named const: prisma
- Log "Prisma connected" on first use

### server/src/lib/redis.ts
Singleton IORedis client.
- Read REDIS_URL from process.env
- Export a single named const: redis
- On connection event: log "Redis connected"
- On error event: log "Redis error: " + the error message

### server/src/lib/logger.ts
Winston logger.
- Development (NODE_ENV !== 'production'): colorized console output
  Format: [timestamp] LEVEL message
- Production: JSON format, no colors
- Export as default: logger

### server/src/middleware/errorHandler.ts
Global Express error handler — catches anything that goes wrong in the app.
- Must have all four parameters: (err, req, res, next)
  Express only recognises it as an error handler if it has exactly 4 params
- Map these error types to HTTP status codes:
  - Prisma P2025 (record not found) → 404, code "NOT_FOUND"
  - Prisma P2002 (duplicate value) → 409, code "CONFLICT"
  - ZodError → 400, code "VALIDATION_ERROR", message is the first issue message
  - Everything else → 500, code "INTERNAL_ERROR"
- In development: include err.message in response
- In production: use generic "Something went wrong" for 500 errors
- Always respond with: { error: { code: string, message: string } }
- Export as named: errorHandler

### server/src/middleware/auth.ts
JWT authentication middleware.
- Read Bearer token from Authorization header
- Verify using JWT_SECRET from process.env
- JWT payload shape: { id: string, email: string, role: string, workspaceId: string }
- On success: attach decoded payload to req.user and call next()
- On any failure: return 401 { error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } }
- Add TypeScript declaration to extend Express Request with req.user
- Export as named: authenticate

### server/src/routes/index.ts
Empty API router placeholder.
- Create an Express Router
- Add a comment: "Routes added here phase by phase"
- Export as default

### server/src/index.ts
Main entry point. Wire everything in this exact order:

Step 1 — Environment
- Load dotenv pointing to ../.env (one level up from server/)
- Import all singletons: prisma, redis, logger

Step 2 — Create app
- Create Express app
- Create HTTP server: http.createServer(app)
- Attach Socket.IO to the HTTP server
  - cors origin: process.env.CLIENT_URL or 'http://localhost:5173'
  - credentials: true

Step 3 — Middleware (order matters)
- cors: allow origin http://localhost:5173, credentials true
- morgan: 'dev' in development
- express.json() with limit '10mb'
- cookie-parser

Step 4 — Rate limiter
- Use express-rate-limit
- Window: 15 minutes
- Max: 100 requests per IP
- Response when exceeded: { error: { code: "RATE_LIMITED", message: "Too many requests, please try again later" } }
- Apply to all routes

Step 5 — Routes
- GET /health → return 200 { status: "ok", timestamp: new Date().toISOString(), environment: process.env.NODE_ENV }
- Mount API router at /api/v1

Step 6 — Error handler
- Mount errorHandler as the very last middleware after all routes

Step 7 — Socket.IO events
- On connection: logger.info("Socket connected: " + socket.id)
- On disconnect: logger.info("Socket disconnected: " + socket.id)

Step 8 — Start server
- Listen on PORT from process.env, default to 3001
- On listen: logger.info("Regi server running on port " + PORT)

Step 9 — Process safety
- Handle process.on('unhandledRejection'): log and exit with code 1
- Handle process.on('uncaughtException'): log and exit with code 1

Export: export { app, server, io } as named exports

### server/tsconfig.json
Update with these settings:
- target: ES2020
- module: commonjs
- strict: true
- esModuleInterop: true
- outDir: ./dist
- rootDir: ./src
- baseUrl: ./src
- paths: { "@/*": ["./*"] }
- skipLibCheck: true

---

## After creating all files

Do these checks in order:

1. From inside the server/ folder run:
   npm run dev

2. Show me the full startup log — it should show:
   - Redis connected
   - Regi server running on port 3001

3. In a new terminal run:
   curl http://localhost:3001/health

4. Expected response:
   { "status": "ok", "timestamp": "...", "environment": "development" }

5. If there are TypeScript errors, fix every single one before showing output

6. Do NOT touch client/ in this phase
7. Do NOT start Phase 2 until I confirm Phase 1 is working

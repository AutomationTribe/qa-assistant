# Setup Swagger — API Documentation UI

## What this task does
Adds an interactive API documentation page at http://localhost:3001/api-docs
You can read about every endpoint AND test them directly in the browser.
Think of it as a built-in Postman for your API.

## Important — server/ folder only
All files in this task go inside server/. Do not touch client/.

## Step 1 — Install the required packages

Run this from inside the server/ folder:
```bash
npm install swagger-jsdoc swagger-ui-express
npm install --save-dev @types/swagger-jsdoc @types/swagger-ui-express
```

## Step 2 — Create server/src/lib/swagger.ts

```typescript
import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Regi API',
      version: '1.0.0',
      description: 'AI-powered QA test case generation API',
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your access token from the /auth/login response',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'NOT_FOUND' },
                message: { type: 'string', example: 'Resource not found' },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['ADMIN', 'QA_LEAD', 'QA_ENGINEER', 'VIEWER'] },
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        Project: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            workspaceId: { type: 'string', format: 'uuid' },
            templateConfig: {
              type: 'object',
              properties: {
                style: { type: 'string', enum: ['bdd', 'step_by_step', 'exploratory'] },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Ticket: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            summary: { type: 'string' },
            description: { type: 'string' },
            acceptanceCriteria: { type: 'string' },
            status: { type: 'string', enum: ['PENDING', 'GENERATING', 'DONE', 'FAILED'] },
            source: { type: 'string', enum: ['MANUAL', 'JIRA_WEBHOOK', 'JIRA_API'] },
            projectId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        TestCase: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
            testType: { type: 'string', enum: ['POSITIVE', 'NEGATIVE', 'EDGE_CASE'] },
            preconditions: { type: 'string' },
            steps: { type: 'array', items: { type: 'string' } },
            expectedResult: { type: 'string' },
            ticketId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
}

export const swaggerSpec = swaggerJsdoc(options)
```

## Step 3 — Add JSDoc comments to each route file

These comments are what Swagger reads to generate the documentation.
Add them above each route handler.

### In server/src/routes/auth.ts add these comments:

Above the register route:
```typescript
/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user and workspace
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, name, password, workspaceName]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               name:
 *                 type: string
 *                 example: Jane Smith
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: password123
 *               workspaceName:
 *                 type: string
 *                 example: Acme QA Team
 *     responses:
 *       201:
 *         description: Account created successfully
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
```

Above the login route:
```typescript
/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and receive access token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful — refreshToken set as HTTP-only cookie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 */
```

Above the refresh route:
```typescript
/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Get new access token using refresh token cookie
 *     security: []
 *     responses:
 *       200:
 *         description: New access token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *       401:
 *         description: Invalid or missing refresh token
 */
```

Above the logout route:
```typescript
/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout and clear refresh token cookie
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
```

### In server/src/routes/projects.ts add these comments:

Above GET /:
```typescript
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
```

Above POST /:
```typescript
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
```

## Step 4 — Mount Swagger in server/src/index.ts

Add these imports at the top of index.ts:
```typescript
import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from './lib/swagger'
```

Add this route BEFORE the /api/v1 mount and BEFORE the rate limiter
so the docs page is always accessible:
```typescript
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Regi API Docs',
  customCss: '.swagger-ui .topbar { display: none }',
}))

// Also expose the raw JSON spec for tools like Postman
app.get('/api-docs.json', (req, res) => {
  res.json(swaggerSpec)
})
```

## Step 5 — Verify it works

1. Restart the server: npm run dev
2. Open http://localhost:3001/api-docs in your browser
3. You should see the Swagger UI with all your endpoints listed
4. Click on POST /api/v1/auth/login → Try it out → fill in email and password → Execute
5. You should get a 200 response with your access token

## After this is working

- Every time Claude Code adds a new route file in later phases,
  remind it to add Swagger JSDoc comments above each route
- Add this line to server/CLAUDE.md:
  "Every new route must have a Swagger JSDoc comment above it. See context/setup-swagger.md for the format."
- The raw spec at /api-docs.json can be imported directly into Postman

# Regi — Feature Tasks

## Phase 1: Core MVP

### Project setup & infrastructure
🔵 Scaffold project structure
   - Files: entire monorepo skeleton
   - Create all folders, config files, CLAUDE.md files
   - Set up docker-compose.yml with MySQL + Redis
   - Set up Prisma schema with all core models
   - Set up client Vite + Tailwind + shadcn/ui
   - Set up server Express + Prisma + BullMQ boilerplate

### Authentication
🔲 JWT auth middleware (server)
   - Files: server/src/middleware/auth.ts
   - Verify JWT on protected routes, attach user to req
   - Return 401 with standard error shape if invalid

🔲 Login + register endpoints
   - Files: server/src/routes/auth.ts, server/src/controllers/authController.ts
   - POST /api/v1/auth/register — hash password (bcrypt), create User
   - POST /api/v1/auth/login — verify password, return access + refresh tokens
   - POST /api/v1/auth/refresh — rotate refresh token, return new access token
   - POST /api/v1/auth/logout — clear refresh token cookie

🔲 Auth UI (client)
   - Files: client/src/pages/LoginPage.tsx, client/src/store/authStore.ts
   - Login form with email + password
   - Store access token in Zustand (in memory only, not localStorage)
   - Axios interceptor auto-attaches Bearer token

### Project management
🔲 Workspace + Project CRUD (server)
   - Files: server/src/routes/projects.ts, server/src/controllers/projectController.ts,
     server/src/services/projectService.ts
   - GET /api/v1/projects — list projects for workspace
   - POST /api/v1/projects — create project
   - PATCH /api/v1/projects/:id — update name/templateConfig
   - DELETE /api/v1/projects/:id — soft delete

🔲 Project list + create UI (client)
   - Files: client/src/pages/ProjectsPage.tsx
   - List of project cards
   - Create project modal (name + template style: bdd | step_by_step | exploratory)

### Ticket ingestion
🔲 Manual ticket input (server)
   - Files: server/src/routes/tickets.ts, server/src/controllers/ticketController.ts,
     server/src/services/ticketService.ts
   - POST /api/v1/tickets — create Ticket from pasted text
   - GET /api/v1/tickets/:id — fetch single ticket

🔲 Jira OAuth 2.0 flow (server)
   - Files: server/src/services/jira/jiraService.ts, server/src/routes/jira.ts
   - GET /api/v1/auth/jira/connect — redirect to Atlassian OAuth
   - GET /api/v1/auth/jira/callback — exchange code, store encrypted tokens
   - Store in JiraConnection table (AES-256 encrypted accessToken + refreshToken)

### LLM generation
🔲 Prisma schema + first migration
   - Files: server/src/prisma/schema.prisma
   - All models: Workspace, User, Project, Ticket, TestCase, TestCaseVersion, JiraConnection
   - Run: npx prisma migrate dev --name init (human runs this)

🔲 BullMQ LLM worker
   - Files: server/src/workers/llmWorker.ts
   - Job name: "llm:generate"
   - Input: { ticketId, projectId, userId }
   - Calls orchestrator → saves TestCases to DB
   - Retry 3x with exponential backoff

🔲 LLM orchestrator
   - Files: server/src/services/llm/orchestrator.ts,
     server/src/services/llm/prompts.ts
   - buildPrompt(ticket, template) → { systemPrompt, userPrompt }
   - callLLM(prompts) → stream tokens via WebSocket
   - validateOutput(raw) → TestCase[] or throw

🔲 Generation trigger endpoint
   - Files: server/src/routes/testcases.ts, server/src/controllers/testCaseController.ts
   - POST /api/v1/tickets/:ticketId/generate
   - Enqueue BullMQ job "llm:generate", return 202 { jobId }

🔲 Generation UI (client)
   - Files: client/src/pages/GeneratePage.tsx, client/src/hooks/useSocket.ts
   - Ticket input (paste text or select Jira ticket)
   - Generate button → POST to trigger endpoint
   - Streaming preview via WebSocket (useSocket hook)

### Review + editing
🔲 TestCaseCard component
   - Files: client/src/components/TestCaseCard.tsx
   - Display title, priority badge, test type, steps, expected result
   - Inline edit mode (click any field)
   - Version history badge if versions.length > 1

🔲 TestCaseEditor (rich text steps)
   - Files: client/src/components/TestCaseEditor.tsx
   - TipTap editor for step content
   - Auto-save on blur → PATCH /api/v1/testcases/:id

### Export
🔲 CSV export endpoint
   - Files: server/src/services/export/csvExporter.ts,
     server/src/routes/export.ts
   - POST /api/v1/export/csv — accepts { testCaseIds[] }
   - Columns: title, priority, testType, preconditions, steps, expectedResult
   - Stream response for up to 500 rows

🔲 Export UI (client)
   - Files: client/src/pages/ExportPage.tsx
   - Select test cases, click export, download CSV file

## Phase 2 (future)
🔲 Jira webhook listener
🔲 Zephyr Scale push integration
🔲 Batch file import (CSV/JSON upload)
🔲 Test case coverage analysis
🔲 Slack / Teams notifications

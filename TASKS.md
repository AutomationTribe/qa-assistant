# Regi — Feature Tasks

## Phase status
- Phase 1 — Server Foundation                ✅ done
- Phase 2 — Authentication                   ✅ done
- Phase 3 — Projects CRUD + UI               ✅ done
- Phase 4 — Test Case Template Builder       ✅ done
- Phase 5 — Ticket Ingestion                 🔵 in progress
- Phase 6 — LLM Generation                   🔲 pending
- Phase 7 — Review and Editing               🔲 pending
- Phase 8 — Export                           🔲 pending

---

## Phase 1 — Server Foundation ✅

✅ Scaffold project structure
   - Monorepo skeleton: client/, server/, context/, ui/
   - docker-compose.yml with MySQL 8 + Redis 7
   - Prisma schema with all core models
   - Client: Vite + Tailwind + shadcn/ui
   - Server: Express + Prisma + BullMQ boilerplate

✅ Express server foundation
   - Files: server/src/index.ts, server/src/lib/prisma.ts,
     server/src/lib/redis.ts, server/src/lib/logger.ts
   - Express app with CORS, morgan, cookie-parser, rate limiter
   - Socket.IO attached to HTTP server
   - Global error handler middleware
   - Health check: GET /health → { status, timestamp, environment }
   - Winston logger (colorized dev, JSON prod)
   - Prisma singleton + Redis singleton
   - Unhandled rejection + uncaught exception handlers

✅ Prisma schema + migrations
   - All models: Workspace, User, Project, Ticket, TestCase,
     TestCaseVersion, JiraConnection
   - Migration: init (all base tables)
   - Migration: add_project_fields (description, baseUrl, logins, deletedAt)

---

## Phase 2 — Authentication ✅

✅ JWT auth middleware (server)
   - Files: server/src/middleware/auth.ts
   - Verify JWT on protected routes, attach user to req
   - Return 401 with standard error shape if invalid

✅ Login + register endpoints (server)
   - Files: server/src/routes/auth.ts, server/src/controllers/authController.ts,
     server/src/services/authService.ts
   - POST /api/v1/auth/register — bcrypt hash, create User + Workspace
   - POST /api/v1/auth/login — verify password, return access + refresh tokens
   - POST /api/v1/auth/refresh — rotate refresh token, return new access token
   - POST /api/v1/auth/logout — clear refresh token cookie
   - Refresh token stored in HTTP-only cookie only

✅ Auth UI (client)
   - Files: client/src/pages/LoginPage.tsx, client/src/store/authStore.ts,
     client/src/api/client.ts, client/src/components/ProtectedRoute.tsx
   - Tabbed login page: Sign In | Create Account on same URL /login
   - react-hook-form + zod validation on both forms
   - Zustand authStore (accessToken in memory only, not localStorage)
   - Axios interceptor auto-attaches Bearer token
   - Auto-login after registration, navigate to /projects
   - ProtectedRoute wrapper redirects unauthenticated users to /login

---

## Phase 3 — Projects CRUD + UI ✅

✅ Workspace + Project CRUD (server)
   - Files: server/src/routes/projects.ts,
     server/src/controllers/projectController.ts,
     server/src/services/projectService.ts
   - GET  /api/v1/projects — list projects for workspace
   - POST /api/v1/projects — create project
   - PATCH /api/v1/projects/:id — update name/config
   - DELETE /api/v1/projects/:id — soft delete (sets deletedAt)
   - Project model extended: description, baseUrl, logins (Json), deletedAt

✅ Project list + create UI (client)
   - Files: client/src/pages/ProjectsPage.tsx,
     client/src/components/CreateProjectModal.tsx,
     client/src/store/projectStore.ts, client/src/api/projects.ts,
     client/src/types/api.ts, client/src/App.tsx
   - Project cards: name, template badge, ticket count, hover effects
   - Create project slide-in panel: name, description, baseUrl,
     template style selector, test logins (username + password + role)
   - Zustand projectStore with fetch, create, select actions
   - React Router setup with protected routes

✅ UI Design System implemented
   - Files: client/src/components/Layout.tsx,
     client/src/components/ui/Input.tsx (with forwardRef),
     client/src/components/ui/Button.tsx (with forwardRef, loading state),
     client/src/index.css
   - Design: minimalist, indigo primary (#4F46E5), page bg #F0F0ED
   - LoginPage: gradient left panel + right form panel
   - ProjectsPage: sidebar + topbar shell (Layout component)
   - Reusable Input and Button components
   - Design mockups in ui/ folder

✅ Swagger API documentation
   - GET /api-docs — interactive Swagger UI
   - GET /api-docs.json — raw OpenAPI spec (importable to Postman)
   - JSDoc comments on all auth and project routes

---

## Phase 4 — Test Case Template Builder ✅

✅ Template model + migration (server)
   - Add models: TestCaseTemplate, TestCaseField to schema.prisma
   - Add enum: FieldType (TEXT, TEXTAREA, STEPS, SELECT, MULTISELECT, BOOLEAN, NUMBER)
   - Update TestCase model: replace fixed fields with fieldValues (Json)
   - Run migration: add_template_builder
   - See: context/phase-4-test-case-template-builder.md

✅ Template CRUD endpoints (server)
   - Files: server/src/services/templateService.ts,
     server/src/controllers/templateController.ts,
     server/src/routes/templates.ts
   - GET    /api/v1/projects/:projectId/template
   - POST   /api/v1/projects/:projectId/template
   - PUT    /api/v1/projects/:projectId/template
   - POST   /api/v1/projects/:projectId/template/fields
   - DELETE /api/v1/projects/:projectId/template/fields/:fieldId
   - PUT    /api/v1/projects/:projectId/template/fields/reorder
   - Auto-create default 6-field template on project creation

✅ Template Builder UI (client)
   - Files: client/src/pages/TemplatePage.tsx,
     client/src/components/AddFieldModal.tsx,
     client/src/components/TemplatePreviewModal.tsx,
     client/src/store/templateStore.ts, client/src/api/templates.ts
   - Field list with up/down reordering, edit, delete
   - Add Field modal: name, key (auto-generated), type selector grid,
     AI instruction textarea, required toggle, options tags (SELECT only)
   - Preview modal: shows placeholder values for each field type
   - Project card shows "Template needed" badge if no template set
   - Route: /projects/:projectId/template
   - Design mockup: ui/template-builder-design.html

---

## Phase 5 — Ticket Ingestion 🔲

🔲 Manual ticket input (server)
   - Files: server/src/routes/tickets.ts,
     server/src/controllers/ticketController.ts,
     server/src/services/ticketService.ts
   - POST /api/v1/tickets — create Ticket from pasted text
   - GET  /api/v1/tickets/:id — fetch ticket with test cases
   - GET  /api/v1/tickets?projectId=xxx — list tickets for project

🔲 Jira OAuth 2.0 flow (server)
   - Files: server/src/services/jira/jiraService.ts,
     server/src/routes/jira.ts
   - GET /api/v1/auth/jira/connect — redirect to Atlassian OAuth
   - GET /api/v1/auth/jira/callback — exchange code, store encrypted tokens
   - JiraConnection table: AES-256 encrypted accessToken + refreshToken

🔲 Ticket input UI (client)
   - Files: client/src/pages/GeneratePage.tsx,
     client/src/store/ticketStore.ts, client/src/api/tickets.ts
   - Project selector dropdown
   - Summary, description, acceptance criteria fields
   - Save ticket → success state with disabled Generate button
   - Recent tickets list for selected project

---

## Phase 6 — LLM Generation 🔲

🔲 Queue setup
   - Files: server/src/lib/queue.ts
   - BullMQ Queue named "llm", connected to Redis singleton
   - Export LLMJobData type: { ticketId, projectId, userId, socketId? }

🔲 LLM prompt builder
   - Files: server/src/services/llm/prompts.ts
   - buildSystemPrompt() → system instruction string
   - buildUserPrompt(ticket, template, fields) → user prompt string
   - Prompt instructs AI to fill each template field dynamically
   - Supports BDD, step_by_step, exploratory styles

🔲 LLM orchestrator
   - Files: server/src/services/llm/orchestrator.ts
   - buildPrompt(ticket, project) → { systemPrompt, userPrompt }
   - callLLM(prompts) → stream tokens via Socket.IO
   - validateOutput(raw, fields) → fieldValues[] or throw
   - Retry up to 3 times on validation failure

🔲 BullMQ LLM worker
   - Files: server/src/workers/llmWorker.ts
   - Job name: "llm:generate"
   - Input: { ticketId, projectId, userId, socketId? }
   - Calls orchestrator → saves TestCases to DB
   - Updates ticket status: GENERATING → DONE or FAILED
   - Emits generation:token, generation:complete, generation:failed via Socket.IO
   - Retry 3x with exponential backoff, concurrency 2

🔲 Generation trigger endpoint
   - Files: server/src/routes/testcases.ts,
     server/src/controllers/testCaseController.ts
   - POST /api/v1/tickets/:ticketId/generate
   - Enqueue job, return 202 { jobId }

🔲 Generation UI (client)
   - Files: client/src/hooks/useSocket.ts,
     client/src/store/testCaseStore.ts, client/src/api/testcases.ts
   - useSocket hook: connects to WS, handles generation events
   - Token-by-token streaming preview
   - Generation:complete → render TestCaseList
   - Generation:failed → error message + retry button

---

## Phase 7 — Review and Editing 🔲

🔲 TestCaseCard component (client)
   - Files: client/src/components/TestCaseCard.tsx
   - Dynamic field rendering based on template fields
   - Click any field to enter inline edit mode
   - Version history badge: "v{n}" if versions > 1
   - Auto-save on blur → PATCH /api/v1/testcases/:id

🔲 TestCaseEditor — rich text steps (client)
   - Files: client/src/components/TestCaseEditor.tsx
   - TipTap editor for STEPS field type
   - Ordered list, bold, italic
   - Auto-save on blur

🔲 Version history (server + client)
   - GET  /api/v1/testcases/:id/versions
   - POST /api/v1/testcases/:id/restore/:versionId
   - VersionHistoryPanel slide-in from right
   - Restore a previous version

---

## Phase 8 — Export 🔲

🔲 CSV export endpoint (server)
   - Files: server/src/services/export/csvExporter.ts,
     server/src/routes/export.ts
   - POST /api/v1/export/csv — accepts { testCaseIds[] }
   - Column headers = template field names (dynamic)
   - Stream response, up to 500 rows

🔲 Export UI (client)
   - Files: client/src/pages/ExportPage.tsx,
     client/src/components/ExportButton.tsx, client/src/api/export.ts
   - Select test cases, click export, browser download triggers

---

## Future — Phase 9+
🔲 Jira webhook listener
🔲 Zephyr Scale direct push integration
🔲 Batch file import (CSV/JSON upload)
🔲 Test case coverage analytics dashboard
🔲 Slack / Teams notifications
🔲 Role-based access control (RBAC)
🔲 Multi-workspace support

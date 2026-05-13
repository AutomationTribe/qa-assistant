# Regi — Feature Tasks

## Phase status
- Phase 1 — Server Foundation                ✅ done
- Phase 2 — Authentication                   ✅ done
- Phase 3 — Projects CRUD + UI               ✅ done
- Phase 4 — Test Case Template Builder       ✅ done
- Phase 5 — Features                         ✅ done
- Phase 6 — Test Cases + Generate Flow       ✅ done
- Phase 7 — AI Generation + Dynamic Columns + Sidebar  ✅ done
- Phase 8 — Zephyr Scale Export              ✅ done

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
   - Projects start with empty template (no default fields)

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

## Phase 5 — Features ✅

✅ Feature model + migration (server)
   - Add models: Feature to schema.prisma with FeatureType enum (NEW_FEATURE, BUG) and FeatureStatus enum (DRAFT, FINAL)
   - Update TestCase model: add optional featureId, make ticketId optional
   - Update Project model: add features relation
   - Migration: add_features

✅ Feature CRUD endpoints (server)
   - Files: server/src/services/featureService.ts,
     server/src/controllers/featureController.ts,
     server/src/routes/features.ts
   - GET    /api/v1/projects/:projectId/features — list with search, date, status filters
   - POST   /api/v1/projects/:projectId/features — create feature
   - PATCH  /api/v1/projects/:projectId/features/:featureId — update feature
   - DELETE /api/v1/projects/:projectId/features/:featureId — soft delete feature

✅ Features page (client)
   - Files: client/src/pages/FeaturesPage.tsx,
     client/src/components/AddFeaturePanel.tsx,
     client/src/store/featureStore.ts, client/src/api/features.ts
   - Feature list table with name, type badge, date, test cases count, status
   - Tabs: All | Draft
   - Search and date range filters
   - Sortable columns (Date, Test Cases)
   - Empty states (no features, no search results)
   - Loading skeleton
   - Add Feature slide-in panel with form validation
   - Row click navigates to feature test cases page (URL only for now)

---

## Phase 6 — Test Cases + Generate Flow ✅

✅ Test Case model + migration (server)
   - Add deletedAt field to TestCase model for soft deletes
   - Migration: add_testcase_soft_delete

✅ Test Case CRUD endpoints (server)
   - Files: server/src/services/testCaseService.ts,
     server/src/controllers/testCaseController.ts,
     server/src/routes/testcases.ts
   - GET    /api/v1/features/:featureId/testcases — list test cases
   - POST   /api/v1/features/:featureId/testcases — create test case
   - POST   /api/v1/features/:featureId/testcases/generate — generate with AI
   - PATCH  /api/v1/testcases/:testCaseId — update test case
   - DELETE /api/v1/testcases/:testCaseId — soft delete test case
   - All routes protected with auth middleware

✅ Test Case API client (client)
   - Files: client/src/api/testcases.ts, client/src/types/api.ts
   - Exported types: Priority, TestCaseType, GeneratedBy, TestCase
   - API methods: listTestCases, createTestCase, generateTestCases, updateTestCase, deleteTestCase

✅ Test Case Zustand store (client)
   - Files: client/src/store/testCaseStore.ts
   - State: testCases[], loading, generating, error
   - Methods: fetchTestCases, generateTestCases, updateTestCase, deleteTestCase, clearTestCases

✅ Features page enhancements (client)
   - Files: client/src/pages/FeaturesPage.tsx, client/src/components/AddFeaturePanel.tsx
   - Add Feature panel: Generate AI toggle + new onCreated callback
   - Generate button in Actions column (shows when testCases count = 0)
   - Row click navigates to test cases page
   - Toast notification after feature creation (when generate = off)

✅ Test Cases page (client)
   - Files: client/src/pages/TestCasesPage.tsx, client/src/index.css
   - Expandable row table: chevron toggles detail view, steps split into Action | Test data | Expected result
   - Summary row: test case name, priority badge, type badge, delete button
   - Expanded detail: Objective textarea, Preconditions textarea, Steps table with 3 columns
   - Steps editor: add/remove steps, edit each part (action, data, expected) separately
   - Other template fields shown below steps (if any)
   - Inline delete: click trash, row shows confirmation with Yes/Cancel
   - Save per row (in normal mode) or Save all (in allEditMode after AI generation)
   - Empty state: "No test cases yet" with Generate button
   - Generating state: skeleton rows + "✦ Generating..." label
   - Topbar: Save all (allEditMode only), Regenerate, Export to Zephyr/Connect Zephyr, Add test case buttons
   - Breadcrumb navigation
   - Badge colors: Priority (HIGH/MEDIUM/LOW) and Type (POSITIVE/NEGATIVE/EDGE_CASE)

✅ App routing (client)
   - Files: client/src/App.tsx
   - New route: /projects/:projectId/features/:featureId/testcases → TestCasesPage

✅ API documentation
   - Files: context/api-endpoints.md
   - Added all 5 test case endpoints with request/response examples

---

## Phase 7 — AI Generation + Dynamic Columns + Sidebar ✅

✅ Prisma schema updates (server)
   - Updated TestCase model: remove old fields (title, priority, steps, etc.), keep only featureId + fieldValues (Json)
   - Added description field to Feature model
   - Migration: testcase_dynamic_fields, add_feature_description
   - TestCaseField model already existed from Phase 4

✅ LLM prompt builder (server)
   - Files: server/src/services/llm/prompts.ts
   - Function: buildTestCaseGenerationPrompt(feature, fields, style)
   - Generates system + user prompts for OpenAI based on template fields
   - Validates field types, required fields, SELECT options

✅ Test case generation endpoint (server)
   - Files: server/src/services/testCaseService.ts,
     server/src/controllers/testCaseController.ts,
     server/src/routes/testcases.ts
   - POST /api/v1/features/:featureId/testcases/generate
   - Returns: { testCases[], fields[], count }
   - GET /api/v1/features/:featureId/testcases — returns { testCases[], fields[] }
   - PATCH /api/v1/testcases/:testCaseId — accepts fieldValues only
   - DELETE /api/v1/testcases/:testCaseId

✅ Dynamic columns table (client)
   - Files: client/src/pages/TestCasesPage.tsx
   - Table columns built from template fields at runtime
   - Each field type renders correctly: TEXT, TEXTAREA, STEPS, SELECT, MULTISELECT, BOOLEAN, NUMBER
   - Read mode: truncate text, badges for SELECT/BOOLEAN, numbered list for STEPS
   - Edit mode: appropriate form controls for each field type
   - Actions: inline edit (single row) or edit all (after AI generation)

✅ Sidebar collapse (client)
   - Width: w-[208px] expanded, w-[48px] collapsed (icon only)
   - Toggle button at bottom: ◀ (rotates 180° when collapsed)
   - State persists in localStorage: sidebarCollapsed
   - Smooth transition: transition-all duration-200
   - Files: client/src/components/Layout.tsx

✅ AI generation flow (client)
   - Add Feature panel: description field (optional), Generate toggle
   - When Generate = on and feature created: redirect to test cases page with ?generate=true
   - Page detects query param, triggers generateTestCases()
   - All rows enter edit mode (allEditMode = true)
   - Draft values pre-populated from AI output
   - Banner: "X test cases generated — review and edit"
   - Save all button saves all at once

✅ API types (client)
   - Updated: TestCase (fieldValues only), TestCaseField (already defined)
   - testcasesAPI returns { testCases[], fields[] }
   - useTestCaseStore holds both testCases + fields

---

## Phase 8 — Zephyr Scale Export ✅

✅ Zephyr Scale integration (server)
   - Files: server/prisma/schema.prisma, server/src/lib/encryption.ts,
     server/src/services/zephyrService.ts, server/src/controllers/zephyrController.ts,
     server/src/routes/zephyr.ts
   - Added ZephyrConnection model to store Atlassian API token (encrypted) + field mapping
   - Added zephyrKey and zephyrId fields to TestCase model
   - 4 endpoints: GET /projects/:projectId/zephyr, POST, DELETE,
     POST /features/:featureId/testcases/export-zephyr
   - API token encrypted using AES-256-GCM
   - Field mapping stored as JSON to support dynamic template fields
   - Sequential export (one at a time) to avoid rate limits
   - Exports skips test cases already in Zephyr (zephyrKey is not null)

✅ Zephyr UI (client)
   - Files: client/src/components/ZephyrSetupPanel.tsx,
     client/src/components/ZephyrExportModal.tsx,
     client/src/pages/TestCasesPage.tsx
   - Setup panel: Atlassian API token, Jira project key, field mapping selects
     with auto-defaults based on field names/types
   - Export modal: two tabs (Export All / Export Selected)
     with test case list, status icons (⏳/✓/✕), live updates during export
   - TestCasesPage: Select button, Connect/Export Zephyr button,
     Zephyr key badges on exported rows, checkbox column in select mode
   - Zustand state management for connection + export progress
   - Toast notifications for success/error

✅ API documentation
   - Files: context/api-endpoints.md
   - Added 4 Zephyr endpoints with request/response examples

---

## Future — Phase 9+
🔲 Jira webhook listener
🔲 Zephyr Scale direct push integration
🔲 Batch file import (CSV/JSON upload)
🔲 Test case coverage analytics dashboard
🔲 Slack / Teams notifications
🔲 Role-based access control (RBAC)
🔲 Multi-workspace support

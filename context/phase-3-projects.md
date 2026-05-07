# Phase 3 — Projects CRUD

## What we are building in this phase
The ability to create and manage Projects. A Project is the container
for everything in Regi — test cases, tickets, and Jira connections
all belong to a Project.

Think of a Project as a folder. You can have one folder per product
or per team. Everything you generate lives inside a folder.

## Rules before you start
- Read server/CLAUDE.md and client/CLAUDE.md
- All project endpoints are protected — use the `authenticate` middleware
- templateConfig controls how the AI generates test cases:
  style can be: "bdd" | "step_by_step" | "exploratory"

## Server — files to create

### server/src/services/projectService.ts

getProjects(workspaceId):
- Return all projects belonging to the workspace
- Include count of tickets per project
- Order by createdAt descending

createProject(workspaceId, { name, templateConfig }):
- Validate name is unique within workspace
- templateConfig must include: { style: "bdd"|"step_by_step"|"exploratory" }
- Return created project

updateProject(projectId, workspaceId, { name?, templateConfig? }):
- Verify project belongs to workspace (security check — always do this)
- Update only provided fields
- Return updated project

deleteProject(projectId, workspaceId):
- Verify project belongs to workspace
- Soft delete: set deletedAt timestamp (add deletedAt DateTime? to schema)
- Do not hard delete — data must be recoverable

### server/src/controllers/projectController.ts
Thin controller — validate, call service, return response.
- GET → 200 { projects: [] }
- POST → 201 { project }
- PATCH → 200 { project }
- DELETE → 200 { message: "Project deleted" }

### server/src/routes/projects.ts
All routes protected with `authenticate` middleware:
- GET /api/v1/projects
- POST /api/v1/projects
- PATCH /api/v1/projects/:id
- DELETE /api/v1/projects/:id

Update server/src/routes/index.ts to mount project routes.

## Client — files to create

### client/src/types/api.ts
TypeScript types matching the backend responses:
- Project type: { id, name, workspaceId, templateConfig, createdAt, _count?: { tickets: number } }
- TemplateConfig type: { style: 'bdd' | 'step_by_step' | 'exploratory' }
- ApiError type: { error: { code: string, message: string } }
- AuthUser type: { id, email, name, role, workspaceId }

### client/src/api/client.ts
Axios instance:
- baseURL from import.meta.env.VITE_API_BASE_URL
- withCredentials: true (so cookies are sent)
- Request interceptor: attach Authorization: Bearer {token} from Zustand authStore
- Response interceptor: if 401 received, attempt token refresh via POST /auth/refresh,
  retry original request with new token. If refresh fails, clear auth state and redirect to /login

### client/src/api/projects.ts
API functions using the Axios instance:
- getProjects(): Promise<Project[]>
- createProject(data: { name, templateConfig }): Promise<Project>
- updateProject(id, data: Partial<{name, templateConfig}>): Promise<Project>
- deleteProject(id): Promise<void>

### client/src/store/projectStore.ts
Zustand store:
- State: { projects: Project[], selectedProject: Project | null, loading: boolean, error: string | null }
- Actions: fetchProjects, createProject, updateProject, deleteProject, selectProject
- fetchProjects calls the API and sets projects in state

### client/src/store/authStore.ts
Zustand store for auth:
- State: { user: AuthUser | null, accessToken: string | null, isAuthenticated: boolean }
- Actions: setAuth(user, token), clearAuth()
- Persist accessToken in memory only (not localStorage)

### client/src/pages/LoginPage.tsx
Login form:
- Email input, password input, submit button
- Use react-hook-form + zod validation
- On submit call POST /api/v1/auth/login via Axios instance
- On success: store token in authStore, redirect to /projects
- Show error message if login fails

### client/src/pages/ProjectsPage.tsx
Projects list page:
- On mount: call projectStore.fetchProjects
- Show list of ProjectCard components
- Each card shows: project name, template style badge, ticket count
- "New Project" button opens CreateProjectModal

### client/src/components/CreateProjectModal.tsx
Modal form:
- Name input (required, min 2 chars)
- Template style selector: three buttons — BDD / Step by Step / Exploratory
  (only one can be selected at a time, selected one is highlighted)
- Cancel and Create buttons
- On create: call projectStore.createProject, close modal on success

### client/src/App.tsx
Update with React Router routes:
- / → redirect to /login
- /login → LoginPage (public)
- /projects → ProjectsPage (protected — redirect to /login if not authenticated)
- Wrap protected routes in a ProtectedRoute component that checks authStore.isAuthenticated

## After creating all files

1. Restart the server: npm run dev in server/
2. Start the client: npm run dev in client/
3. Open http://localhost:5173 in browser
4. You should be redirected to /login
5. Register a new account (or use the one from Phase 2 tests)
6. After login you should see the Projects page
7. Create a project and confirm it appears in the list
8. Show me a screenshot or confirm each step worked

Do NOT move to Phase 4 until I confirm this works end to end.

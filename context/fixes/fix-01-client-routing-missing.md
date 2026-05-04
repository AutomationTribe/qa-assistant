# Issue 01 — Client Routing and UI Not Implemented

## What is wrong
Phase 3 client work was not completed. The App.tsx is a placeholder that
just shows "Regi — AI QA Assistant" as text. There is no routing, no login
page, no projects page, and no navigation. The server side of Phase 3 is
done but the entire React client needs to be built.

## Files to check first
Before writing any code, check if these files already exist.
If they exist, read them first — do not overwrite working code:
- client/src/store/authStore.ts
- client/src/store/projectStore.ts
- client/src/api/client.ts
- client/src/api/projects.ts
- client/src/types/api.ts

## What needs to be built

### client/src/types/api.ts
TypeScript types used across the entire client:

```typescript
export type AuthUser = {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'QA_LEAD' | 'QA_ENGINEER' | 'VIEWER'
  workspaceId: string
}

export type TemplateConfig = {
  style: 'bdd' | 'step_by_step' | 'exploratory'
}

export type Project = {
  id: string
  name: string
  workspaceId: string
  templateConfig: TemplateConfig
  createdAt: string
  _count?: { tickets: number }
}

export type ApiError = {
  error: { code: string; message: string }
}
```

### client/src/api/client.ts
Axios instance with auth and refresh logic:
- baseURL from import.meta.env.VITE_API_BASE_URL
- withCredentials: true so cookies are sent automatically
- Request interceptor: read accessToken from authStore, attach as
  Authorization: Bearer {token} header
- Response interceptor:
  - If response is 401: attempt POST /auth/refresh
  - If refresh succeeds: retry the original request with new token
  - If refresh fails: call authStore.clearAuth() and redirect to /login
- Export as default: apiClient

### client/src/store/authStore.ts
Zustand store for authentication state:

```typescript
// State shape
{
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean
}

// Actions
setAuth(user: AuthUser, accessToken: string): void
clearAuth(): void
```

Note: store accessToken in memory only — not localStorage

### client/src/store/projectStore.ts
Zustand store for projects:

```typescript
// State shape
{
  projects: Project[]
  selectedProject: Project | null
  loading: boolean
  error: string | null
}

// Actions
fetchProjects(): Promise<void>   — calls GET /api/v1/projects
createProject(data): Promise<void>
selectProject(project: Project): void
```

### client/src/api/projects.ts
API functions:
- getProjects(): Promise<Project[]>
- createProject(data: { name: string, templateConfig: TemplateConfig }): Promise<Project>
- updateProject(id: string, data: Partial<{name: string, templateConfig: TemplateConfig}>): Promise<Project>
- deleteProject(id: string): Promise<void>

### client/src/pages/LoginPage.tsx
Login form page:
- Email input field (type email, required)
- Password input field (type password, required)
- Submit button labeled "Sign in"
- Use react-hook-form for form state
- On submit: POST to /api/v1/auth/login via apiClient
- On success: call authStore.setAuth(user, accessToken) then navigate to /projects
- On error: show the error message below the form
- If already authenticated: redirect to /projects immediately
- Style with Tailwind — centered card layout, clean and simple

### client/src/pages/ProjectsPage.tsx
Projects list page:
- On mount: call projectStore.fetchProjects()
- Show loading state while fetching
- Show empty state if no projects: "No projects yet. Create your first one."
- Show list of project cards when loaded
  Each card shows: project name, template style badge, ticket count
- "New Project" button in the top right — opens CreateProjectModal
- Clicking a project card: call projectStore.selectProject and navigate to /generate

### client/src/components/CreateProjectModal.tsx
Modal for creating a new project:
- Name text input (required, min 2 chars)
- Template style selector — three buttons side by side:
  "BDD" | "Step by Step" | "Exploratory"
  Only one can be active at a time, active one has a highlighted border
- Cancel button and Create button
- On create: call projectStore.createProject, close modal on success
- Show inline error if creation fails

### client/src/components/ProtectedRoute.tsx
Wrapper component for routes that require authentication:
- Read isAuthenticated from authStore
- If not authenticated: redirect to /login
- If authenticated: render the child component

### client/src/App.tsx
Replace the entire current placeholder with proper React Router setup:

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import ProjectsPage from './pages/ProjectsPage'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <ProjectsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

## After building all files

Test this exact flow in the browser:

1. Open http://localhost:5173
   Expected: redirected to http://localhost:5173/login automatically

2. Try visiting http://localhost:5173/projects without logging in
   Expected: redirected back to /login

3. Log in with the account created during Phase 2 testing
   Expected: redirected to /projects, see the Projects page

4. Create a new project using the modal
   Expected: project appears in the list

5. Open browser console — confirm no red errors

## Do not
- Do not modify any server/ files
- Do not change the routing structure — follow App.tsx above exactly
- Do not use localStorage for the access token
- Fix all TypeScript errors before confirming done
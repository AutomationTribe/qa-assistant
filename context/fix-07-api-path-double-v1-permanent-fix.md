# Issue 07 — Permanent Fix for Double /v1 in API Paths

## Root cause
The Axios baseURL is: http://localhost:3001/api/v1
This means every path passed to apiClient must start with just /auth/...
NOT /v1/auth/... and NOT /api/v1/auth/...

The rule is: baseURL owns /api/v1 — paths own everything after that.

## What to fix

### Step 1 — Audit every API file for wrong paths

Check each file and fix any path that starts with /v1/ or /api/v1/
The correct pattern is: /resource/... with no prefix

Files to check and correct paths:

#### client/src/api/projects.ts
All paths must be:
- GET    /projects
- POST   /projects
- PATCH  /projects/:id
- DELETE /projects/:id

#### client/src/api/templates.ts
All paths must be:
- GET    /projects/:id/template
- POST   /projects/:id/template
- PUT    /projects/:id/template
- POST   /projects/:id/template/fields
- DELETE /projects/:id/template/fields/:fieldId
- PUT    /projects/:id/template/fields/reorder

#### client/src/pages/LoginPage.tsx
Find every direct apiClient call in this file.
Replace any path like /v1/auth/login or /api/v1/auth/login
with just /auth/login

Do the same for /auth/register, /auth/refresh, /auth/logout

### Step 2 — Create client/src/api/auth.ts
Move all auth API calls out of LoginPage.tsx into this file.
This is the real fix — no page component should ever call apiClient directly.

```typescript
import apiClient from './client'
import { AuthUser } from '@/types/api'

interface LoginResponse {
  accessToken: string
  user: AuthUser
}

interface RegisterResponse {
  message: string
  user: Pick<AuthUser, 'id' | 'email' | 'name' | 'role'>
}

interface RefreshResponse {
  accessToken: string
  user: AuthUser
}

export const authAPI = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', {
      email,
      password,
    })
    return response.data
  },

  async register(
    email: string,
    name: string,
    password: string,
    workspaceName: string
  ): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>('/auth/register', {
      email,
      name,
      password,
      workspaceName,
    })
    return response.data
  },

  async refresh(): Promise<RefreshResponse> {
    const response = await apiClient.post<RefreshResponse>('/auth/refresh')
    return response.data
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout')
  },
}
```

### Step 3 — Update client/src/pages/LoginPage.tsx
Replace all direct apiClient calls with authAPI calls:

```typescript
import { authAPI } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'

// In the sign in submit handler:
const handleSignIn = async (data: SignInForm) => {
  try {
    const { accessToken, user } = await authAPI.login(data.email, data.password)
    useAuthStore.getState().setAuth(user, accessToken)
    navigate('/projects')
  } catch (err: any) {
    setError(err.response?.data?.error?.message || 'Invalid email or password')
  }
}

// In the register submit handler:
const handleRegister = async (data: RegisterForm) => {
  try {
    await authAPI.register(data.email, data.name, data.password, data.workspaceName)
    // Auto login after register
    const { accessToken, user } = await authAPI.login(data.email, data.password)
    useAuthStore.getState().setAuth(user, accessToken)
    navigate('/projects')
  } catch (err: any) {
    setError(err.response?.data?.error?.message || 'Registration failed')
  }
}
```

### Step 4 — Update client/src/App.tsx
The session recovery call must also use authAPI:

```typescript
import { authAPI } from './api/auth'

// In the recoverSession function:
const recoverSession = async () => {
  try {
    const { accessToken, user } = await authAPI.refresh()
    setAuth(user, accessToken)
  } catch {
    clearAuth()
  } finally {
    setChecking(false)
  }
}
```

### Step 5 — Update client/src/components/Layout.tsx
The logout call must use authAPI:

```typescript
import { authAPI } from '@/api/auth'

const handleLogout = async () => {
  try {
    await authAPI.logout()
  } catch {
    // Still clear local state even if server call fails
  } finally {
    clearAuth()
    navigate('/login')
  }
}
```

### Step 6 — Add rule to server/CLAUDE.md and client/CLAUDE.md

Add this to client/CLAUDE.md under the API calls section:

```markdown
## API path rules — CRITICAL
- baseURL is set to http://localhost:3001/api/v1 in all environments
- Every path in src/api/ files must start with / and the resource name only
- CORRECT:   apiClient.post('/auth/login')
- CORRECT:   apiClient.get('/projects')
- WRONG:     apiClient.post('/v1/auth/login')     ← adds duplicate /v1
- WRONG:     apiClient.post('/api/v1/auth/login') ← adds duplicate /api/v1
- NEVER call apiClient directly from a page component
- ALL API calls go through a file in src/api/ — one file per resource
  auth.ts, projects.ts, templates.ts, tickets.ts, testcases.ts, export.ts
```

---

## After applying all fixes

Test in this exact order:

1. Restart Vite: cd client && npm run dev

2. Open the browser Network tab (Inspect → Network)
   Keep it open for all tests below

3. Go to http://localhost:5173/login
   Sign in with your account
   In Network tab confirm the login request URL is:
   http://localhost:3001/api/v1/auth/login  ← exactly this, no double /v1

4. After login you should land on /projects
   In Network tab confirm projects request URL is:
   http://localhost:3001/api/v1/projects

5. Refresh the page
   In Network tab confirm the refresh request URL is:
   http://localhost:3001/api/v1/auth/refresh
   Confirm you stay on /projects after refresh

6. Go to a project template page
   Save the template
   In Network tab confirm the URL is:
   http://localhost:3001/api/v1/projects/:id/template

7. Click Sign out
   Confirm you land on /login

8. Every single URL in the Network tab must contain exactly one /v1
   If you see /v1/v1 anywhere — that endpoint has the same bug, report it

## Do not
- Do not change the baseURL in client.ts
- Do not change the .env file
- Do not add /v1 or /api/v1 to any path in any api/ file
- Fix all TypeScript errors before confirming done

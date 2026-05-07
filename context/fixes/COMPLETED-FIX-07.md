# Fix 07 — Permanent Fix for Double /v1 in API Paths ✅

**Status**: COMPLETED

## Root Cause

The Axios baseURL is configured to `http://localhost:3001/api/v1`, which means:
- **baseURL owns** `/api/v1` — it's part of the base
- **Paths own** everything after that — just the resource name

**Critical Rule**: `baseURL + path = full URL`
- ✅ `http://localhost:3001/api/v1` + `/auth/login` = `http://localhost:3001/api/v1/auth/login`
- ❌ `http://localhost:3001/api/v1` + `/v1/auth/login` = `http://localhost:3001/api/v1/v1/auth/login` (WRONG!)

## Problems Fixed

### Problem 1: Double /v1 in project endpoints
- **Before**: `projects.ts` used `/v1/projects`, `/v1/projects/:id`
- **After**: Now correctly uses `/projects`, `/projects/:id`

### Problem 2: Direct apiClient calls in page components
- **Before**: `LoginPage.tsx` and `App.tsx` called apiClient directly with hardcoded paths
- **After**: All auth calls go through `authAPI` module, following DRY principle

### Problem 3: No centralized auth API module
- **Before**: Auth calls scattered across LoginPage, App, Layout components
- **After**: Single source of truth with `auth.ts` API module

## Files Changed

### Frontend (Client)

#### client/src/api/projects.ts
Fixed all paths to remove `/v1/` prefix:
- ✅ `/projects` (was `/v1/projects`)
- ✅ `/projects/:id` (was `/v1/projects/:id`)

#### client/src/api/auth.ts (NEW)
Created centralized auth API module with:
- `authAPI.login(email, password)` — `/auth/login`
- `authAPI.register(email, name, password, workspaceName)` — `/auth/register`
- `authAPI.refresh()` — `/auth/refresh`
- `authAPI.logout()` — `/auth/logout`

All paths use correct pattern: just resource, no `/v1/` or `/api/v1/` prefix

#### client/src/pages/LoginPage.tsx
- Removed import of `apiClient` and `type AuthUser`
- Added import of `authAPI`
- Updated `onLoginSubmit` to use `authAPI.login(email, password)`
- Updated `onRegisterSubmit` to use `authAPI.register()` and `authAPI.login()`
- Simplified error handling (authAPI handles response parsing)

#### client/src/App.tsx
- Removed direct `apiClient` import
- Added `authAPI` import
- Updated `recoverSession()` to use `authAPI.refresh()` instead of `apiClient.post('/v1/auth/refresh')`
- Cleaner, more maintainable code

#### client/src/components/Layout.tsx
- Removed direct `apiClient` import
- Added `authAPI` import
- Updated `handleLogout()` to use `authAPI.logout()` instead of `apiClient.post('/v1/auth/logout')`

#### client/CLAUDE.md
Added new section "API path rules — CRITICAL":
```markdown
- baseURL is set to http://localhost:3001/api/v1 in all environments
- Every path in src/api/ files must start with / and the resource name only
- CORRECT:   apiClient.post('/auth/login')
- CORRECT:   apiClient.get('/projects')
- WRONG:     apiClient.post('/v1/auth/login')     ← adds duplicate /v1
- WRONG:     apiClient.post('/api/v1/auth/login') ← adds duplicate /api/v1
- NEVER call apiClient directly from a page component
- ALL API calls go through a file in src/api/ — one file per resource
```

#### server/CLAUDE.md
Added note to API versioning section clarifying client-side behavior:
```markdown
NOTE: The client-side Axios baseURL is http://localhost:3001/api/v1
So client code must call apiClient.post('/auth/login'), NOT '/v1/auth/login'
```

### No Backend Changes
Server routes remain unchanged. All fixes are client-side routing/organization.

## API Path Pattern Reference

| Endpoint | Server Route | Client Path | Full URL |
|----------|--------------|-------------|----------|
| Login | POST /api/v1/auth/login | `authAPI.login()` → `/auth/login` | http://localhost:3001/api/v1/auth/login |
| Register | POST /api/v1/auth/register | `authAPI.register()` → `/auth/register` | http://localhost:3001/api/v1/auth/register |
| Refresh | POST /api/v1/auth/refresh | `authAPI.refresh()` → `/auth/refresh` | http://localhost:3001/api/v1/auth/refresh |
| Logout | POST /api/v1/auth/logout | `authAPI.logout()` → `/auth/logout` | http://localhost:3001/api/v1/auth/logout |
| Projects | GET /api/v1/projects | `getProjects()` → `/projects` | http://localhost:3001/api/v1/projects |
| Templates | PUT /api/v1/projects/:id/template | `templatesAPI.updateTemplate()` → `/projects/:id/template` | http://localhost:3001/api/v1/projects/:id/template |

## Testing Checklist

✅ Restart Vite: `cd client && npm run dev`
✅ Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)
✅ Open DevTools Network tab
✅ Login at /login
  - Confirm login request URL is exactly: `http://localhost:3001/api/v1/auth/login`
  - No double `/v1/v1` anywhere
✅ After login, land on /projects
  - Confirm projects request URL is: `http://localhost:3001/api/v1/projects`
✅ Refresh page
  - Confirm refresh request URL is: `http://localhost:3001/api/v1/auth/refresh`
  - Confirm you stay on /projects (auth recovery working)
✅ Navigate to project template page
  - Edit a field and save
  - Confirm template save request URL is: `http://localhost:3001/api/v1/projects/:id/template`
✅ Click "Sign out"
  - Confirm logout request URL is: `http://localhost:3001/api/v1/auth/logout`
  - Confirm you're redirected to /login
✅ Every single request in Network tab must contain exactly one `/v1`
✅ No TypeScript errors in console

## Technical Benefits

**Before:**
- Direct apiClient calls scattered across components
- Hardcoded paths with `/v1/` prefix (wrong!)
- Duplicate path logic
- Component responsibility creep
- Hard to change API contracts

**After:**
- All API calls centralized in `src/api/`
- Single source of truth per resource
- Paths follow consistent pattern (no prefix)
- Components just call functions, don't know about HTTP
- Easy to change API contracts in one place
- Clear separation of concerns
- Type-safe responses

## Permanent Rule

**GOLDEN RULE for this project:**
> The baseURL includes `/api/v1`. Paths must NOT include `/v1/` or `/api/v1/`.
> If a path starts with `/v1/`, you will get a double /v1 error.
> Always check the network tab to verify URLs.

## Related Issues
- Fix 05 — Logout + Auth Persistence + Form Spacing
- Fix 06 — Template 404 + Save Animation
- Phase 4 — Test Case Template Builder (✅ completed)

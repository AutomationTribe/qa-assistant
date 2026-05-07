# Issue 05 — Logout Button + Auth Persistence on Refresh + Form Spacing

## Problem 1 — No logout button in the UI
The logout endpoint exists on the server but there is no button to call it.
Users have no way to sign out.

## Problem 2 — User gets logged out on every page refresh
The accessToken lives in Zustand memory only. When the page refreshes,
memory is cleared and the user appears logged out even though their
refresh token cookie is still valid in the browser.

The fix: when the app first loads, silently call POST /api/v1/auth/refresh
before deciding whether to show the app or redirect to login.
If refresh succeeds → restore auth state and show the app.
If refresh fails → clear auth and redirect to login.

## Problem 3 — No spacing between fields in login and register forms
Form groups are stacked with no visible gap between them.

---

## Files to change

### Fix 1 + Fix 2 — client/src/App.tsx

Replace the current App.tsx with this version that adds auth recovery on mount:

```typescript
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import ProjectsPage from './pages/ProjectsPage'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuthStore } from './store/authStore'
import apiClient from './api/client'

export default function App() {
  const { setAuth, clearAuth } = useAuthStore()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // On every page load, try to recover the session silently
    // using the refresh token cookie stored in the browser
    const recoverSession = async () => {
      try {
        const response = await apiClient.post('/auth/refresh')
        const { accessToken, user } = response.data
        setAuth(user, accessToken)
      } catch {
        // Refresh token missing or expired — user must log in
        clearAuth()
      } finally {
        setChecking(false)
      }
    }

    recoverSession()
  }, [])

  // Show nothing while checking — prevents flash of login page
  if (checking) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#F0F0ED',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#999',
      }}>
        Loading...
      </div>
    )
  }

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
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

Key change: the `useEffect` runs once on mount. It calls `/auth/refresh`.
If successful it restores the user session. If it fails the user goes to login.
The `checking` state prevents any flash of the login page before the check completes.

---

### Fix 2 continued — server/src/routes/auth.ts
The refresh endpoint must return the user object alongside the accessToken
so the client can restore full auth state. Check the current response:

If the refresh controller currently returns only { accessToken }:
Update authController.refresh to also return the user:

```typescript
// In authController.ts — refresh function
refresh: async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken
    if (!token) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'No refresh token' }
      })
    }
    const { accessToken, refreshToken, user } = await authService.refreshAccessToken(token)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    return res.json({ accessToken, user })
  } catch (error) {
    next(error)
  }
}
```

Also update authService.refreshAccessToken to return user data:
```typescript
// After verifying the token and finding the user
return {
  accessToken,
  refreshToken: newRefreshToken,
  user: {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    workspaceId: user.workspaceId,
  }
}
```

---

### Fix 3 — client/src/components/Layout.tsx
Add logout button to the sidebar footer.

Find the sidebar footer section (where the user avatar and name are shown).
Replace it with this:

```typescript
// Sidebar footer with logout
<div className="mt-auto border-t border-[#EBEBEB] pt-3">
  <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
    <div className="w-7 h-7 rounded-full bg-[#4F46E5] text-white text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
      {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[12px] font-medium text-[#111] truncate">{user?.name}</div>
      <div className="text-[10px] text-[#aaa]">{user?.role?.replace('_', ' ')}</div>
    </div>
  </div>
  <button
    onClick={handleLogout}
    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-[12.5px] text-[#777] hover:bg-[#EFEFEB] hover:text-[#111] transition-all cursor-pointer"
  >
    <span className="text-[13px] w-4 text-center">→</span>
    Sign out
  </button>
</div>
```

Add the handleLogout function inside the Layout component:

```typescript
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import apiClient from '@/api/client'

// Inside Layout component:
const navigate = useNavigate()
const { user, clearAuth } = useAuthStore()

const handleLogout = async () => {
  try {
    await apiClient.post('/auth/logout')
  } catch {
    // Even if the server call fails, clear local auth state
  } finally {
    clearAuth()
    navigate('/login')
  }
}
```

---

### Fix 4 — client/src/pages/LoginPage.tsx
Add spacing between form fields.

Find the Sign In form and Create Account form sections.
Each form group div should have margin-bottom applied.

If using plain divs, wrap each field in a div with className="mb-4":
```typescript
// Each form field group should look like this:
<div className="mb-4">
  <label ...>Email address</label>
  <Input ... />
</div>

<div className="mb-4">
  <label ...>Password</label>
  <Input ... />
</div>
```

If using the Input component with a label prop, add a wrapper:
```typescript
<div className="flex flex-col gap-4">
  <Input label="Email address" type="email" ... />
  <Input label="Password" type="password" ... />
</div>
```

Apply the same fix to both the Sign In form and the Create Account form.
Gap between fields should be 16px (gap-4 or mb-4 in Tailwind).

---

## After applying all fixes

Test this flow:

1. Log in at http://localhost:5173/login
2. You should land on /projects
3. Refresh the page — confirm you STAY on /projects, not redirected to login
4. Refresh again — still on /projects ✓
5. Click Sign out in the sidebar
6. Confirm you are redirected to /login
7. Try navigating to /projects — confirm you are redirected back to /login
8. Log in again — confirm it works
9. Open the login page — confirm there is clear spacing between all fields
10. Open the register tab — confirm same spacing

Open browser console after each step — confirm no red errors.

## Do not
- Do not change any other pages or components
- Do not modify server routes other than the refresh controller
- Fix all TypeScript errors before confirming done

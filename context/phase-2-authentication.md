# Phase 2 — Authentication

## What we are building in this phase
The login system. Users need to prove who they are before touching anything
in the app. We build register, login, logout, and token refresh.

Think of it as the front door of the building — you need a key (token)
to get in, and that key expires after 15 minutes. There is also a longer-lived
key (refresh token) that lets you get a new short key without logging in again.

## Plain English — how JWT auth works
1. User logs in with email + password
2. Server checks password, creates two tokens:
   - Access token: lasts 15 minutes, sent in every API request
   - Refresh token: lasts 7 days, stored in a secure cookie
3. When access token expires, client uses refresh token to get a new one silently
4. Logout clears the refresh token cookie

## Rules before you start
- Read server/CLAUDE.md first
- Passwords are NEVER stored as plain text — always bcrypt hashed
- Access token goes in response body, refresh token goes in HTTP-only cookie only
- Never put the refresh token in the response body
- JWT_SECRET signs access tokens, JWT_REFRESH_SECRET signs refresh tokens

## Files to create

### server/src/services/authService.ts
All auth business logic lives here.

Functions to implement:

registerUser(email, name, password, workspaceName):
- Check if email already exists → throw error with code EMAIL_EXISTS if so
- Hash password with bcrypt (12 rounds)
- Create Workspace first (slug = lowercase workspaceName with spaces replaced by dashes)
- Create User linked to workspace with role QA_ENGINEER
- Return { user, workspace } (never return passwordHash)

loginUser(email, password):
- Find user by email, include workspace
- If not found → throw error code INVALID_CREDENTIALS (do not say "user not found" — security risk)
- Compare password with bcrypt
- If wrong → throw same error code INVALID_CREDENTIALS
- Generate access token: JWT signed with JWT_SECRET, expires 15m
  Payload: { id, email, role, workspaceId }
- Generate refresh token: JWT signed with JWT_REFRESH_SECRET, expires 7d
  Payload: { id } only
- Return { accessToken, refreshToken, user }

refreshAccessToken(refreshToken):
- Verify refresh token with JWT_REFRESH_SECRET
- Find user by id from token payload
- If user not found → throw UNAUTHORIZED
- Generate new access token (15m)
- Generate new refresh token (7d) — always rotate, never reuse
- Return { accessToken, refreshToken }

### server/src/controllers/authController.ts
Thin layer — validate input, call service, return response.

register(req, res, next):
- Validate body with Zod: { email (valid email), name (min 2 chars), password (min 8 chars), workspaceName (min 2 chars) }
- Call authService.registerUser
- Return 201 { message: "Account created", user: { id, email, name, role } }

login(req, res, next):
- Validate body with Zod: { email, password }
- Call authService.loginUser
- Set refresh token as HTTP-only cookie named "refreshToken",
  maxAge 7 days, sameSite strict, secure in production
- Return 200 { accessToken, user: { id, email, name, role, workspaceId } }

refresh(req, res, next):
- Read refreshToken from req.cookies.refreshToken
- If missing → 401 UNAUTHORIZED
- Call authService.refreshAccessToken
- Set new refresh token cookie (same settings as login)
- Return 200 { accessToken }

logout(req, res, next):
- Clear the refreshToken cookie
- Return 200 { message: "Logged out" }

### server/src/routes/auth.ts
Mount auth routes:
- POST /register → authController.register
- POST /login → authController.login
- POST /refresh → authController.refresh
- POST /logout → authController.logout

### server/src/routes/index.ts
Update the API router to mount auth routes:
- import authRouter from './auth'
- router.use('/auth', authRouter)

## After creating all files

Test every endpoint with curl in this exact order:

1. Register:
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@regi.com","name":"Test User","password":"password123","workspaceName":"My Workspace"}'

Expected: 201 with user object

2. Login:
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@regi.com","password":"password123"}'

Expected: 200 with accessToken

3. Refresh (uses the cookie saved above):
curl -X POST http://localhost:3001/api/v1/auth/refresh \
  -b cookies.txt \
  -c cookies.txt

Expected: 200 with new accessToken

4. Logout:
curl -X POST http://localhost:3001/api/v1/auth/logout \
  -b cookies.txt

Expected: 200 with logged out message

Show me all four responses before we move to Phase 3.
Do NOT move to Phase 3 until I confirm these work.

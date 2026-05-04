# Issue 02 — Add Register Tab to Login Page

## What is wrong
There is no way for a new user to create an account from the UI.
The server endpoint POST /api/v1/auth/register already exists and works.
We just need to add a "Create Account" tab to the existing LoginPage.tsx.

## What to build

### client/src/pages/LoginPage.tsx
Replace the current single login form with a tabbed layout.

Layout:
- Two tabs at the top of the card: "Sign In" | "Create Account"
- Active tab has a visible highlight (darker border or underline)
- Clicking a tab switches the form below — no page navigation
- The URL stays at /login regardless of which tab is active

Sign In tab (existing form — keep it, just wrap it in the tab):
- Email input
- Password input
- "Sign In" button
- On success: setAuth then navigate to /projects

Create Account tab (new form):
- Name input (required, min 2 chars, placeholder "Your full name")
- Email input (required, valid email)
- Password input (required, min 8 chars)
- Workspace Name input (required, min 2 chars,
  placeholder "Your company or team name",
  helper text below: "This is your team's workspace in Regi")
- "Create Account" button
- On submit: POST /api/v1/auth/register via apiClient
- On success: immediately log the user in by calling
  POST /api/v1/auth/login with the same email + password,
  then call authStore.setAuth and navigate to /projects
- On error: show the error message from the server below the form

## Behaviour rules
- Both forms use react-hook-form with zod validation
- Show inline field errors (under each field, not just at the top)
- Show a loading spinner on the button while the request is in flight
- Disable the button while loading so it cannot be double-submitted
- If the user is already authenticated, redirect to /projects immediately
  (this already exists — do not remove it)

## Validation rules for Create Account form
- name: min 2 characters, required
- email: valid email format, required
- password: min 8 characters, required,
  show strength hint: "Use at least 8 characters"
- workspaceName: min 2 characters, required

## Do not
- Do not create a /register route — tabs only, URL stays at /login
- Do not modify any server files
- Do not touch any other client files except LoginPage.tsx
- Fix all TypeScript errors before confirming done

## After building

Test this flow in the browser:
1. Open http://localhost:5173 — confirm you land on /login
2. Click "Create Account" tab — confirm the form switches
3. Fill in all fields and submit
4. Confirm you are redirected to /projects after account creation
5. Log out (we will add a logout button later — for now just
   clear the browser and log in manually with the new account)
6. Click "Sign In" tab — log in with the account you just created
7. Confirm you land on /projects
8. Open browser console — confirm no red errors

# Regi API — Endpoint Reference

## How to use this file
- Update this file every time a new endpoint is added
- Format: HTTP_METHOD /path — description
- Include: request body shape, query params, and example response
- This file is read by Claude Code to understand what endpoints already exist

---

## Base URL
- Development: http://localhost:3001/api/v1
- All endpoints (except /health) require header: Authorization: Bearer {accessToken}
- Refresh token is sent automatically via HTTP-only cookie

---

## System

### GET /health
No auth required.
Returns server status.

Response 200:
```json
{
  "status": "ok",
  "timestamp": "2026-05-01T16:21:23.428Z",
  "environment": "development"
}
```

---

## Auth — /api/v1/auth
No Bearer token required on any auth route.

### POST /api/v1/auth/register
Create a new user and workspace.

Request body:
```json
{
  "email": "user@example.com",
  "name": "Jane Smith",
  "password": "password123",
  "workspaceName": "Acme QA Team"
}
```

Response 201:
```json
{
  "message": "Account created",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Jane Smith",
    "role": "QA_ENGINEER"
  }
}
```

Errors:
- 409 EMAIL_EXISTS — email already registered
- 400 VALIDATION_ERROR — invalid input

---

### POST /api/v1/auth/login
Log in and receive tokens.

Request body:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response 200:
```json
{
  "accessToken": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Jane Smith",
    "role": "QA_ENGINEER",
    "workspaceId": "uuid"
  }
}
```
Note: refreshToken is set as HTTP-only cookie, not in response body.

Errors:
- 401 INVALID_CREDENTIALS — wrong email or password

---

### POST /api/v1/auth/refresh
Get a new access token using the refresh token cookie.

No request body needed.
Cookie: refreshToken (sent automatically by browser)

Response 200:
```json
{
  "accessToken": "eyJhbGci..."
}
```

Errors:
- 401 UNAUTHORIZED — missing or invalid refresh token

---

### POST /api/v1/auth/logout
Clear the refresh token cookie.

No request body needed.

Response 200:
```json
{
  "message": "Logged out"
}
```

---

## Projects — /api/v1/projects
All routes require: Authorization: Bearer {accessToken}

### GET /api/v1/projects
List all projects for the authenticated workspace.

No request body. No query params.

Response 200:
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "Mobile App QA",
      "workspaceId": "uuid",
      "templateConfig": { "style": "bdd" },
      "createdAt": "2026-05-01T12:00:00.000Z",
      "_count": { "tickets": 12 }
    }
  ]
}
```

---

### POST /api/v1/projects
Create a new project.

Request body:
```json
{
  "name": "Mobile App QA",
  "templateConfig": {
    "style": "bdd"
  }
}
```
style options: "bdd" | "step_by_step" | "exploratory"

Response 201:
```json
{
  "project": {
    "id": "uuid",
    "name": "Mobile App QA",
    "workspaceId": "uuid",
    "templateConfig": { "style": "bdd" },
    "createdAt": "2026-05-01T12:00:00.000Z"
  }
}
```

Errors:
- 409 CONFLICT — project name already exists in workspace
- 400 VALIDATION_ERROR — invalid input

---

### PATCH /api/v1/projects/:id
Update a project name or template style.

Request body (all fields optional):
```json
{
  "name": "New Project Name",
  "templateConfig": {
    "style": "step_by_step"
  }
}
```

Response 200:
```json
{
  "project": {
    "id": "uuid",
    "name": "New Project Name",
    "templateConfig": { "style": "step_by_step" },
    "updatedAt": "2026-05-01T13:00:00.000Z"
  }
}
```

Errors:
- 404 NOT_FOUND — project does not exist or does not belong to workspace
- 400 VALIDATION_ERROR — invalid input

---

### DELETE /api/v1/projects/:id
Soft delete a project (sets deletedAt timestamp, data is not removed).

No request body.

Response 200:
```json
{
  "message": "Project deleted"
}
```

Errors:
- 404 NOT_FOUND — project does not exist or does not belong to workspace

---

## Tickets — /api/v1/tickets
All routes require: Authorization: Bearer {accessToken}

### POST /api/v1/tickets
Create a ticket from manually pasted requirement.

Request body:
```json
{
  "projectId": "uuid",
  "summary": "User can log in with email and password",
  "description": "As a registered user, I want to log in using my email and password so that I can access my workspace.",
  "acceptanceCriteria": "Given a registered user, when they enter valid credentials, then they should be redirected to the dashboard."
}
```

Response 201:
```json
{
  "ticket": {
    "id": "uuid",
    "summary": "User can log in with email and password",
    "description": "...",
    "acceptanceCriteria": "...",
    "status": "PENDING",
    "source": "MANUAL",
    "projectId": "uuid",
    "createdAt": "2026-05-01T12:00:00.000Z"
  }
}
```

---

### GET /api/v1/tickets?projectId={uuid}
List all tickets for a project.

Query param: projectId (required)

Response 200:
```json
{
  "tickets": [
    {
      "id": "uuid",
      "summary": "User can log in",
      "status": "DONE",
      "source": "MANUAL",
      "createdAt": "2026-05-01T12:00:00.000Z",
      "_count": { "testCases": 5 }
    }
  ]
}
```

---

### GET /api/v1/tickets/:id
Get a single ticket with its test cases.

Response 200:
```json
{
  "ticket": {
    "id": "uuid",
    "summary": "User can log in",
    "description": "...",
    "acceptanceCriteria": "...",
    "status": "DONE",
    "testCases": [
      {
        "id": "uuid",
        "title": "Successful login with valid credentials",
        "priority": "HIGH",
        "testType": "POSITIVE",
        "steps": ["Navigate to /login", "Enter valid email", "Enter valid password", "Click Login"],
        "expectedResult": "User is redirected to dashboard"
      }
    ]
  }
}
```

---

## Test Cases — /api/v1/testcases
All routes require: Authorization: Bearer {accessToken}

### POST /api/v1/tickets/:ticketId/generate
Enqueue an LLM generation job for a ticket.

Request body:
```json
{
  "socketId": "socket-id-from-client"
}
```

Response 202:
```json
{
  "message": "Generation started",
  "jobId": "bullmq-job-id"
}
```

Errors:
- 404 NOT_FOUND — ticket does not exist
- 409 CONFLICT — ticket is already being generated

---

### GET /api/v1/tickets/:ticketId/testcases
Get all test cases for a ticket.

Response 200:
```json
{
  "testCases": [
    {
      "id": "uuid",
      "title": "Successful login with valid credentials",
      "priority": "HIGH",
      "testType": "POSITIVE",
      "preconditions": "User must be registered",
      "steps": ["Go to /login", "Enter valid credentials", "Click Login"],
      "expectedResult": "Redirected to dashboard",
      "versions": []
    }
  ]
}
```

---

### PATCH /api/v1/testcases/:id
Update a test case. Creates a version snapshot before saving.

Request body (all fields optional):
```json
{
  "title": "Updated title",
  "priority": "LOW",
  "testType": "NEGATIVE",
  "preconditions": "User must be logged out",
  "steps": ["Go to /login", "Enter wrong password", "Click Login"],
  "expectedResult": "Error message is shown"
}
```

Response 200:
```json
{
  "testCase": {
    "id": "uuid",
    "title": "Updated title",
    "updatedAt": "2026-05-01T14:00:00.000Z",
    "versions": [{ "id": "uuid", "createdAt": "..." }]
  }
}
```

---

### GET /api/v1/testcases/:id/versions
Get version history for a test case.

Response 200:
```json
{
  "versions": [
    {
      "id": "uuid",
      "content": { "title": "...", "steps": [] },
      "editedBy": "uuid",
      "createdAt": "2026-05-01T13:00:00.000Z"
    }
  ]
}
```

---

### POST /api/v1/testcases/:id/restore/:versionId
Restore a test case to a previous version.

No request body.

Response 200:
```json
{
  "testCase": {
    "id": "uuid",
    "title": "Restored title",
    "steps": ["..."],
    "updatedAt": "2026-05-01T15:00:00.000Z"
  }
}
```

---

## Export — /api/v1/export
All routes require: Authorization: Bearer {accessToken}

### POST /api/v1/export/csv
Export test cases as a CSV file download.

Request body:
```json
{
  "testCaseIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

Response 200:
- Content-Type: text/csv
- Content-Disposition: attachment; filename="regi-testcases-{timestamp}.csv"
- Body: CSV file stream

CSV columns (Zephyr Scale format):
Name, Status, Priority, Component, Description, Precondition, Test Script (Step-by-Step)

Errors:
- 400 VALIDATION_ERROR — no test case IDs provided
- 400 VALIDATION_ERROR — more than 500 IDs provided

---

## WebSocket Events (Socket.IO)
Connection URL: ws://localhost:3001

### Server → Client events

generation:token
Fired as each token streams from the LLM.
```json
{ "token": "word", "ticketId": "uuid" }
```

generation:complete
Fired when all test cases have been saved to the database.
```json
{ "ticketId": "uuid", "testCases": [] }
```

generation:failed
Fired if generation fails after all retries.
```json
{ "ticketId": "uuid", "error": "Generation failed after 3 attempts" }
```

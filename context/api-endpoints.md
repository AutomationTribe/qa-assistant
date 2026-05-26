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

## Templates — /api/v1/projects/:projectId/template
All routes require: Authorization: Bearer {accessToken}

### GET /api/v1/projects/:projectId/template
Get the test case template for a project.

Response 200:
```json
{
  "template": {
    "id": "uuid",
    "projectId": "uuid",
    "fields": [
      {
        "id": "uuid",
        "name": "Test Title",
        "key": "test_title",
        "type": "TEXT",
        "description": "A concise, descriptive name for this test case",
        "required": true,
        "order": 0,
        "options": null
      }
    ],
    "createdAt": "2026-05-01T12:00:00.000Z",
    "updatedAt": "2026-05-01T12:00:00.000Z"
  }
}
```

Errors:
- 404 NOT_FOUND — project does not exist

---

### POST /api/v1/projects/:projectId/template
Create a test case template for a project.

Request body:
```json
{
  "fields": [
    {
      "name": "Test Title",
      "key": "test_title",
      "type": "TEXT",
      "description": "A concise, descriptive name for this test case",
      "required": true,
      "options": null
    }
  ]
}
```

Response 201:
```json
{
  "template": {
    "id": "uuid",
    "projectId": "uuid",
    "fields": [
      {
        "id": "uuid",
        "name": "Test Title",
        "key": "test_title",
        "type": "TEXT",
        "description": "A concise, descriptive name for this test case",
        "required": true,
        "order": 0,
        "options": null
      }
    ],
    "createdAt": "2026-05-01T12:00:00.000Z",
    "updatedAt": "2026-05-01T12:00:00.000Z"
  }
}
```

Errors:
- 404 NOT_FOUND — project does not exist
- 400 INVALID_INPUT — at least one field is required
- 400 DUPLICATE_KEYS — field keys must be unique

---

### PUT /api/v1/projects/:projectId/template
Update a test case template (replaces all fields).

Request body:
```json
{
  "fields": [
    {
      "name": "Test Title",
      "key": "test_title",
      "type": "TEXT",
      "required": true
    }
  ]
}
```

Response 200:
```json
{
  "template": {
    "id": "uuid",
    "projectId": "uuid",
    "fields": [],
    "updatedAt": "2026-05-01T13:00:00.000Z"
  }
}
```

Errors:
- 404 NOT_FOUND — project does not exist or template not found
- 400 INVALID_INPUT — validation failed

---

### POST /api/v1/projects/:projectId/template/fields
Add a single field to an existing template.

Request body:
```json
{
  "field": {
    "name": "Priority",
    "key": "priority",
    "type": "SELECT",
    "options": ["HIGH", "MEDIUM", "LOW"],
    "required": true
  }
}
```

Response 200:
```json
{
  "template": {
    "id": "uuid",
    "projectId": "uuid",
    "fields": [],
    "updatedAt": "2026-05-01T13:00:00.000Z"
  }
}
```

Errors:
- 404 NOT_FOUND — project or template does not exist
- 400 DUPLICATE_KEY — field key already exists

---

### DELETE /api/v1/projects/:projectId/template/fields/:fieldId
Remove a field from a template.

No request body.

Response 200:
```json
{
  "template": {
    "id": "uuid",
    "projectId": "uuid",
    "fields": [],
    "updatedAt": "2026-05-01T13:00:00.000Z"
  }
}
```

Errors:
- 404 NOT_FOUND — field or template does not exist

---

### PUT /api/v1/projects/:projectId/template/fields/reorder
Reorder fields in a template.

Request body:
```json
{
  "fieldIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

Response 200:
```json
{
  "template": {
    "id": "uuid",
    "projectId": "uuid",
    "fields": [],
    "updatedAt": "2026-05-01T13:00:00.000Z"
  }
}
```

Errors:
- 404 NOT_FOUND — template not found
- 400 INVALID_FIELDS — invalid field IDs provided

---

## Features — /api/v1/projects/:projectId/features
All routes require: Authorization: Bearer {accessToken}

### GET /api/v1/projects/:projectId/features
List all features for a project with optional filtering.

Query params (all optional):
- search: string — filter features by name (case-insensitive contains)
- dateFrom: ISO date string — filter features created on or after this date
- dateTo: ISO date string — filter features created on or before this date
- status: "DRAFT" | "FINAL" — filter features by status

Response 200:
```json
{
  "features": [
    {
      "id": "uuid",
      "name": "User can log in with email and password",
      "type": "NEW_FEATURE",
      "status": "DRAFT",
      "projectId": "uuid",
      "createdAt": "2026-05-01T12:00:00.000Z",
      "updatedAt": "2026-05-01T12:00:00.000Z",
      "_count": {
        "testCases": 5
      }
    }
  ]
}
```

Errors:
- 404 NOT_FOUND — project does not exist or does not belong to workspace

---

### POST /api/v1/projects/:projectId/features
Create a new feature.

Request body (frontend feature):
```json
{
  "name": "User can log in with email and password",
  "type": "NEW_FEATURE",
  "description": "User should be able to authenticate with email and password",
  "acceptanceCriteria": "Given a registered user, when they enter valid credentials...",
  "uiNotes": "Login button, Email field label",
  "testData": "user@test.com / Test@1234",
  "contextImages": ["data:image/png;base64,..."]
}
```

Request body (backend API feature):
```json
{
  "name": "Login API endpoint",
  "type": "BACKEND_API",
  "description": "Endpoint for user authentication",
  "acceptanceCriteria": "API should return access token and refresh token",
  "testData": "Valid: user@test.com / Test@1234",
  "endpoints": [
    {
      "id": "uuid",
      "apiType": "REST",
      "method": "POST",
      "path": "/api/v1/auth/login",
      "requestBody": "{ \"email\": \"user@test.com\", \"password\": \"Test@1234\" }",
      "expectedResponse": "Status 200, body: { accessToken: string, refreshToken: string }",
      "authRequired": false,
      "notes": "Main login endpoint"
    }
  ]
}
```

type must be: "NEW_FEATURE" | "BUG" | "BACKEND_API"
name must be 3-200 characters
description is required, min 10, max 5000 characters
endpoints is required for BACKEND_API type, optional for others

Response 201:
```json
{
  "feature": {
    "id": "uuid",
    "name": "User can log in with email and password",
    "description": "User should be able to authenticate with email and password",
    "type": "NEW_FEATURE",
    "status": "FINAL",
    "projectId": "uuid",
    "acceptanceCriteria": "...",
    "uiNotes": "...",
    "testData": "...",
    "contextImages": [...],
    "endpoints": null,
    "createdAt": "2026-05-01T12:00:00.000Z",
    "updatedAt": "2026-05-01T12:00:00.000Z",
    "_count": {
      "testCases": 0
    }
  }
}
```

Note: Manually created features have status "FINAL" by default. Features created from Jira webhooks (Phase 6+) will have status "DRAFT".

Errors:
- 404 NOT_FOUND — project does not exist or does not belong to workspace
- 400 VALIDATION_ERROR — invalid input (name length, type enum)
- 400 VALIDATION_ERROR — endpoints required for BACKEND_API features

---

### PATCH /api/v1/projects/:projectId/features/:featureId
Update a feature (all fields optional).

Request body:
```json
{
  "name": "Updated feature name",
  "description": "Updated description",
  "type": "BACKEND_API",
  "status": "FINAL",
  "acceptanceCriteria": "Updated acceptance criteria",
  "uiNotes": "Updated UI notes",
  "testData": "Updated test data",
  "endpoints": [
    {
      "id": "uuid",
      "apiType": "REST",
      "method": "POST",
      "path": "/api/v1/auth/login",
      "requestBody": "...",
      "expectedResponse": "...",
      "authRequired": true,
      "authType": "Bearer"
    }
  ]
}
```

Response 200:
```json
{
  "feature": {
    "id": "uuid",
    "name": "Updated feature name",
    "description": "Updated description",
    "type": "BACKEND_API",
    "status": "FINAL",
    "projectId": "uuid",
    "acceptanceCriteria": "...",
    "testData": "...",
    "endpoints": [...],
    "updatedAt": "2026-05-01T13:00:00.000Z",
    "_count": {
      "testCases": 5
    }
  }
}
```

Errors:
- 404 NOT_FOUND — feature does not exist or does not belong to workspace
- 400 VALIDATION_ERROR — invalid input

---

### DELETE /api/v1/projects/:projectId/features/:featureId
Soft delete a feature (sets deletedAt timestamp, data is not removed).

No request body.

Response 200:
```json
{
  "message": "Feature deleted"
}
```

Errors:
- 404 NOT_FOUND — feature does not exist or does not belong to workspace

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

## Test Cases — /api/v1/features/:featureId/testcases
All routes require: Authorization: Bearer {accessToken}

### GET /api/v1/features/:featureId/testcases
List all test cases for a feature with template fields.

Response 200:
```json
{
  "testCases": [
    {
      "id": "uuid",
      "featureId": "uuid",
      "fieldValues": {
        "test_title": "Successful login with valid credentials",
        "test_priority": "HIGH",
        "test_type": "POSITIVE",
        "test_steps": ["Navigate to /login", "Enter valid email", "Click Sign In"],
        "expected_result": "User is redirected to dashboard. Session persists on refresh."
      },
      "generatedBy": "LLM",
      "createdAt": "2026-05-01T12:00:00.000Z",
      "updatedAt": "2026-05-01T12:00:00.000Z"
    }
  ],
  "fields": [
    {
      "id": "uuid",
      "key": "test_title",
      "name": "Test Title",
      "type": "TEXT",
      "required": true,
      "order": 0,
      "description": "Short descriptive title for the test"
    }
  ]
}
```

Errors:
- 404 NOT_FOUND — feature does not exist or does not belong to workspace

---


---

### POST /api/v1/features/:featureId/testcases/generate
Generate test cases for a feature using AI. Uses project's template fields as schema.
If test cases already exist for this feature, returns existing ones instead of generating new ones.

No request body needed.

Response 200:
```json
{
  "testCases": [
    {
      "id": "uuid",
      "featureId": "uuid",
      "fieldValues": {
        "test_title": "Successful login with valid credentials",
        "test_priority": "HIGH",
        "test_type": "POSITIVE",
        "test_steps": ["Navigate to /login", "Enter credentials", "Click Sign In"],
        "expected_result": "User is redirected to dashboard"
      },
      "generatedBy": "LLM",
      "createdAt": "2026-05-01T12:00:00.000Z",
      "updatedAt": "2026-05-01T12:00:00.000Z"
    }
  ],
  "fields": [
    {
      "id": "uuid",
      "key": "test_title",
      "name": "Test Title",
      "type": "TEXT",
      "required": true,
      "order": 0
    }
  ],
  "count": 5,
  "alreadyExisted": false
}
```

Note: `alreadyExisted: true` if test cases already existed for this feature (generation was skipped).

Errors:
- 404 NOT_FOUND — feature does not exist or does not belong to workspace
- 400 NO_TEMPLATE — project has no test case template configured
- 400 LLM_ERROR — LLM generation failed

---

### PATCH /api/v1/testcases/:testCaseId
Update a test case's field values. Field keys must match template.

Request body:
```json
{
  "fieldValues": {
    "test_title": "Updated test case title",
    "test_priority": "MEDIUM",
    "test_type": "NEGATIVE",
    "test_steps": ["Step 1", "Step 2", "Step 3"],
    "expected_result": "Updated expected result"
  }
}
```

Response 200:
```json
{
  "testCase": {
    "id": "uuid",
    "featureId": "uuid",
    "fieldValues": {
      "test_title": "Updated test case title",
      "test_priority": "MEDIUM",
      "test_type": "NEGATIVE",
      "test_steps": ["Step 1", "Step 2", "Step 3"],
      "expected_result": "Updated expected result"
    },
    "generatedBy": "LLM",
    "createdAt": "2026-05-01T12:00:00.000Z",
    "updatedAt": "2026-05-01T14:00:00.000Z"
  }
}
```

Errors:
- 404 NOT_FOUND — test case does not exist or does not belong to workspace
- 401 UNAUTHORIZED — access denied

---

### DELETE /api/v1/testcases/:testCaseId
Soft delete a test case (sets deletedAt timestamp, data is not removed).

No request body.

Response 200:
```json
{
  "message": "Test case deleted"
}
```

Errors:
- 404 NOT_FOUND — test case does not exist or does not belong to workspace
- 400 FORBIDDEN — access denied

---

## Zephyr Scale — /api/v1/projects/:projectId/zephyr
All routes require: Authorization: Bearer {accessToken}

### GET /api/v1/projects/:projectId/zephyr
Get the Zephyr Scale connection status for a project.

Response 200 (connected):
```json
{
  "connection": {
    "id": "uuid",
    "jiraProjectKey": "MAP",
    "fieldMapping": {
      "name": "test_title",
      "steps": "test_steps",
      "objective": "expected_result",
      "priority": "priority",
      "precondition": "preconditions"
    },
    "connected": true
  }
}
```

Response 200 (not connected):
```json
{
  "connection": null
}
```

Errors:
- 404 NOT_FOUND — project does not exist or does not belong to workspace

---

### POST /api/v1/projects/:projectId/zephyr
Save or update a Zephyr Scale connection for a project.

Request body:
```json
{
  "apiToken": "your-atlassian-api-token",
  "jiraProjectKey": "MAP",
  "fieldMapping": {
    "name": "test_title",
    "steps": "test_steps",
    "objective": "expected_result",
    "priority": "priority",
    "precondition": "preconditions"
  }
}
```

Response 200:
```json
{
  "connection": {
    "id": "uuid",
    "jiraProjectKey": "MAP",
    "fieldMapping": {
      "name": "test_title",
      "steps": "test_steps",
      "objective": "expected_result",
      "priority": "priority",
      "precondition": "preconditions"
    },
    "connected": true
  }
}
```

Errors:
- 404 NOT_FOUND — project does not exist or does not belong to workspace
- 400 VALIDATION_ERROR — missing required fields
- 400 INVALID_TOKEN — API token is invalid or revoked

---

### DELETE /api/v1/projects/:projectId/zephyr
Remove the Zephyr Scale connection from a project.

No request body.

Response 200:
```json
{
  "message": "Zephyr connection removed"
}
```

Errors:
- 404 NOT_FOUND — project does not exist or does not belong to workspace

---

### GET /api/v1/projects/:projectId/zephyr/folders
Get existing Zephyr Scale test case folders for a project.

Response 200:
```json
{
  "folders": [
    { "id": 12345, "name": "Sprint 1", "parentId": null },
    { "id": 12346, "name": "Regression", "parentId": null },
    { "id": 12347, "name": "P1 Bugs", "parentId": 12345 }
  ]
}
```

Errors:
- 404 NOT_FOUND — project does not exist or does not belong to workspace

---

### POST /api/v1/features/:featureId/testcases/export-zephyr
Export test cases to Zephyr Scale Cloud. Optionally nest them in a parent folder. Enqueues them sequentially to avoid rate limits.

Request body (testCaseIds is required, parentFolderId is optional):
```json
{
  "testCaseIds": "all",
  "parentFolderId": 12345
}
```
or
```json
{
  "testCaseIds": ["uuid-1", "uuid-2", "uuid-3"],
  "parentFolderId": null
}
```

Response 200:
```json
{
  "results": [
    {
      "testCaseId": "uuid-1",
      "zephyrKey": "MAP-T1",
      "success": true
    },
    {
      "testCaseId": "uuid-2",
      "zephyrKey": "",
      "success": false,
      "error": "Network timeout"
    }
  ],
  "successCount": 1,
  "failCount": 1,
  "total": 2,
  "message": "Export completed with 1 failure"
}
```

Errors:
- 404 NOT_FOUND — feature does not exist or does not belong to workspace
- 400 VALIDATION_ERROR — testCaseIds is missing or invalid
- 400 NO_ZEPHYR_CONNECTION — project has no Zephyr connection configured

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

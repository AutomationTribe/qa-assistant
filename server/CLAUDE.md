# Server — Node.js Backend Rules

## Architecture layers (strict — do not mix)
routes/        → thin: routing + input validation (Zod) only
controllers/   → orchestrate: call services, return HTTP response
services/      → all business logic lives here
workers/       → BullMQ consumers, call services only
middleware/    → auth, rate limiting, error handling
prisma/        → schema + migrations only, no business logic

## Core Prisma models (field summary)
Workspace     id, name, slug, createdAt
User          id, email, name, passwordHash, role, workspaceId
Project       id, name, workspaceId, jiraProjectKey, templateConfig(JSON)
Ticket        id, jiraIssueKey, summary, description,
              acceptanceCriteria, status, source, projectId
TestCase      id, ticketId, title, priority, testType,
              preconditions, steps(JSON), expectedResult,
              generatedBy, projectId
TestCaseVer   id, testCaseId, content(JSON), editedBy, createdAt
JiraConn      id, projectId, accessToken(encrypted), refreshToken(encrypted),
              cloudId, jiraBaseUrl, webhookSecret

## API versioning
All routes must be prefixed: /api/v1/

## LLM rules
- All LLM calls go through services/llm/orchestrator.ts only
- Never call OpenAI or Anthropic SDK directly from a controller or route
- BullMQ job name format: "domain:action" e.g. "llm:generate", "export:csv"
- LLM responses must be validated against JSON schema before saving to DB

## Error response shape (always use this)
{ "error": { "code": "NOT_FOUND", "message": "Human readable message" } }

## Auth
- JWT is stateless — no server-side session store
- Redis is for: BullMQ queues + rate limit counters only
- Refresh tokens stored as HTTP-only cookies only, never in response body

## Migrations
- Never run prisma migrate dev automatically
- Always generate SQL with prisma migrate dev --create-only first
- Human reviews SQL before running migrate deploy

## Testing
- Unit tests live next to source: service.ts → service.test.ts
- Use Jest + Supertest for API integration tests
- Always mock external APIs (Jira, OpenAI) — never call real ones in tests

## Path alias
- Use @/ for imports from src/ e.g. import { prisma } from '@/lib/prisma'

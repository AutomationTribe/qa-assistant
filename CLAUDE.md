# Regi — AI QA Assistant

## What this app does
Regi takes a Jira ticket or pasted requirement and uses an LLM to generate
structured test cases. QA engineers review, edit, and export to Zephyr Scale or CSV.

## Tech stack
- Frontend: React 18, Vite, TypeScript, Zustand, shadcn/ui, Tailwind, Socket.IO client
- Backend: Node 20, Express, TypeScript, Prisma, MySQL 8, Redis, BullMQ
- Auth: JWT (15min access token) + HTTP-only refresh token cookie (7 days)
- LLM: Provider-agnostic layer — default OpenAI GPT-4o

## Monorepo structure
- client/    React SPA — runs on port 5173
- server/    Node.js API + background workers — runs on port 3001
- context/   Build task files and architecture notes — read these before coding

## How to get your next task
1. Check TASKS.md at the root to see the current phase marked 🔵
2. Read the matching file in context/ for the full instructions
3. Follow the instructions exactly — do not add extra features not listed
4. When done, stop and wait for confirmation before moving to the next phase

## Current phase
context/phase-6-llm-generation.md

## Phase status
- context/phase-1-server-foundation.md   ✅ done
- context/phase-2-authentication.md      ✅ done
- context/phase-3-projects.md            ✅ done
- context/phase-4-test-case-template-builder.md ✅ done
- context/phase-5-features.md            ✅ done
- context/phase-6-test-cases-and-generate-flow.md 🔵 in progress

- context/phase-7-ai-generation-and-collapsible-sidebar.md      🔵 in progress
- context/phase-8-zephyr-export.md 🔲 pending


## Architecture notes
Read context/architecture.md to understand why key decisions were made.

## Folder rules
- client/ code only touches client/ files
- server/ code only touches server/ files
- Never mix client and server imports
- Shared types are duplicated in each — no shared/ folder

## After every phase — mandatory updates
After implementing any phase, Claude Code must always do these three things:

1. Update context/api-endpoints.md
   - Add every new endpoint created in this phase
   - Include the HTTP method, full path, request body, and example response
   - Follow the exact format already in that file

2. Add Swagger JSDoc comments to every new route file
   - Every route must have a @swagger comment above it
   - Follow the format in context/setup-swagger.md
   - Do not skip any route

3. Update TASKS.md at the repo root
   - Mark the completed phase as ✅ done
   - Mark the next phase as 🔵 in progress

## Never do
- Never run prisma migrate dev automatically — show the SQL first and wait for approval
- Never store secrets or API keys in code or comments
- Never put business logic inside route files — services/ only
- Never use var — only const and let
- Never call OpenAI or any LLM SDK directly from a controller or route
- Never use TypeScript any type — fix the type properly
- Never store refresh tokens in localStorage or in the response body
- Never hard delete database records — use soft delete (deletedAt field)

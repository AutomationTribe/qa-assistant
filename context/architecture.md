# Architecture Decisions

## Why these technology choices were made

### Why BullMQ for LLM jobs instead of calling OpenAI directly?
LLM calls can take 10-30 seconds. If we called OpenAI directly from the
HTTP request, the browser would time out waiting. BullMQ puts the job in
a queue and a background worker handles it. The browser gets an immediate
202 response and receives results via WebSocket when ready.

### Why Socket.IO for streaming instead of Server-Sent Events (SSE)?
Socket.IO gives us two-way communication. We use it for streaming tokens
to the browser AND for future features like collaborative editing where
multiple users see the same test case being updated in real time.

### Why HTTP-only cookies for refresh tokens instead of localStorage?
localStorage can be read by any JavaScript on the page — including
malicious scripts from XSS attacks. HTTP-only cookies cannot be read
by JavaScript at all. The browser sends them automatically on every
request. This is the industry standard for refresh token storage.

### Why Zustand instead of Redux?
Redux requires a lot of boilerplate code for simple state. Zustand
does the same job in a fraction of the code. For an app of Regi's
size, Zustand is the right tool.

### Why Prisma instead of writing raw SQL?
Prisma catches type errors at compile time. If you rename a field in
the schema, TypeScript will immediately show errors everywhere that
field is used. Raw SQL has no such safety net.

### Why separate client/ and server/ folders instead of one folder?
They are deployed separately, have different dependencies, and are
built by different tools (Vite for client, tsc for server). Keeping
them separate makes each simpler and avoids dependency conflicts.

## Key constraints to never break
- LLM calls only through orchestrator.ts
- Business logic only in services/
- No SQL queries outside of Prisma
- Refresh tokens only in HTTP-only cookies
- All endpoints versioned under /api/v1/
- Migrations always reviewed by human before running

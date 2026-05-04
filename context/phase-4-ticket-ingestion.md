# Phase 4 — Ticket Ingestion

## What we are building in this phase
The ability to create a Ticket — the starting point for generating test cases.
A ticket is a requirement or user story. You either paste it manually or
it comes from Jira. In this phase we build manual paste first.

Think of a ticket as the order slip in a restaurant. Before the kitchen
(LLM) can cook anything, someone has to write down what they want.

## Rules before you start
- Read server/CLAUDE.md and client/CLAUDE.md
- All endpoints are protected with authenticate middleware
- Validate that the project belongs to the authenticated user's workspace
  before creating a ticket — never trust the projectId blindly

## Server — files to create

### server/src/services/ticketService.ts

createTicket(projectId, workspaceId, { summary, description, acceptanceCriteria }):
- Verify project exists and belongs to workspace
- Create Ticket with status PENDING, source MANUAL
- Return created ticket

getTicket(ticketId, workspaceId):
- Fetch ticket with its testCases
- Verify it belongs to a project in the workspace
- Return ticket with testCases array

getTicketsByProject(projectId, workspaceId):
- Verify project belongs to workspace
- Return all tickets for project, ordered by createdAt desc
- Include testCase count per ticket

### server/src/controllers/ticketController.ts
- POST → 201 { ticket }
- GET /:id → 200 { ticket }
- GET / (with ?projectId query) → 200 { tickets: [] }

### server/src/routes/tickets.ts
Protected routes:
- POST /api/v1/tickets
- GET /api/v1/tickets?projectId=xxx
- GET /api/v1/tickets/:id

Update routes/index.ts to mount ticket routes.

## Client — files to create

### client/src/types/api.ts
Add to existing file:
- Ticket type: { id, jiraIssueKey, summary, description, acceptanceCriteria, status, source, projectId, createdAt, testCases?: TestCase[], _count?: { testCases: number } }
- TicketStatus type: 'PENDING' | 'GENERATING' | 'DONE' | 'FAILED'
- TestCase type (basic for now): { id, ticketId, title, priority, testType, preconditions, steps, expectedResult }

### client/src/api/tickets.ts
- createTicket(data: { projectId, summary, description, acceptanceCriteria? }): Promise<Ticket>
- getTickets(projectId: string): Promise<Ticket[]>
- getTicket(id: string): Promise<Ticket>

### client/src/store/ticketStore.ts
Zustand store:
- State: { tickets: Ticket[], selectedTicket: Ticket | null, loading: boolean }
- Actions: fetchTickets(projectId), createTicket, selectTicket

### client/src/pages/GeneratePage.tsx
Main generation page (ticket input only in this phase — generation comes in Phase 5):
- Project selector at top (dropdown from projectStore)
- Ticket input form:
  - Summary input (required, single line)
  - Description textarea (required)
  - Acceptance Criteria textarea (optional)
  - "Save Ticket" button
- On save: call ticketStore.createTicket
- After saving show a success state with the ticket summary
  and a disabled "Generate Test Cases" button with label "Coming soon"
  (we wire this up in Phase 5)
- Below the form: list of recent tickets for selected project

## After creating all files

Test flow:
1. Login → go to Projects → select a project
2. Navigate to /generate
3. Fill in the ticket form and submit
4. Confirm ticket appears in the recent list below
5. Check Prisma Studio (npx prisma studio in server/) to confirm
   the ticket row exists in the Ticket table with status PENDING

Show me confirmation of each step before we move to Phase 5.
Phase 5 is the LLM generation — the core feature of the entire app.

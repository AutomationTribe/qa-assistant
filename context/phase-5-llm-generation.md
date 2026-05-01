# Phase 5 — LLM Generation (Core Feature)

## What we are building in this phase
The heart of Regi. A user submits a ticket, the server puts a job in a queue,
a worker picks it up, sends the ticket to the AI, the AI writes test cases,
and the results stream back to the browser in real time word by word.

## Plain English — how this works end to end
1. User clicks "Generate" on the frontend
2. Frontend calls POST /api/v1/tickets/:id/generate
3. Server puts a job in the BullMQ queue (like putting an order ticket on a spike in a restaurant)
4. The LLM worker (a background process, like a chef) picks up the job
5. Worker builds a prompt and sends it to OpenAI
6. OpenAI streams the response back word by word
7. As each word arrives, the worker emits it via Socket.IO to the browser
8. Browser shows the words appearing in real time
9. When complete, worker saves the parsed test cases to the database

## Rules before you start
- Read server/CLAUDE.md
- ALL OpenAI calls go through services/llm/orchestrator.ts ONLY
- Never call OpenAI SDK directly from a controller or worker
- Validate the AI output against the expected JSON structure before saving
- If validation fails, retry up to 3 times before marking ticket as FAILED

## Server — files to create

### server/src/lib/queue.ts
BullMQ queue setup:
- Create a Queue named "llm" using the redis singleton from lib/redis.ts
- Export the queue as named export `llmQueue`
- Export a named type `LLMJobData`: { ticketId: string, projectId: string, userId: string }

### server/src/services/llm/prompts.ts
Prompt builder functions:

buildSystemPrompt():
- Returns a system prompt string that instructs the AI to:
  - Act as a senior QA engineer
  - Generate structured test cases in valid JSON only
  - Never include markdown, explanation, or preamble in the response
  - Always return an array of test case objects

buildUserPrompt(ticket, templateConfig):
- ticket has: summary, description, acceptanceCriteria
- templateConfig has: style ('bdd' | 'step_by_step' | 'exploratory')
- For BDD style: steps should follow Given/When/Then format
- For step_by_step: steps should be numbered plain English instructions
- For exploratory: steps should be open-ended exploration scenarios
- The prompt must request this exact JSON structure:
  [
    {
      "title": string,
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "testType": "POSITIVE" | "NEGATIVE" | "EDGE_CASE",
      "preconditions": string,
      "steps": string[],
      "expectedResult": string
    }
  ]

### server/src/services/llm/orchestrator.ts

buildPrompt(ticket, templateConfig):
- Call buildSystemPrompt() and buildUserPrompt(ticket, templateConfig)
- Return { systemPrompt, userPrompt }

validateOutput(raw: string): TestCaseInput[]
- Parse the raw string as JSON
- Validate each item has all required fields
- Validate priority is HIGH/MEDIUM/LOW
- Validate testType is POSITIVE/NEGATIVE/EDGE_CASE
- If invalid throw an error with code "INVALID_LLM_OUTPUT"

generateTestCases(ticket, project, socketId: string | null):
- Build prompts
- Call OpenAI chat completions with stream: true
- Model: process.env.DEFAULT_LLM_MODEL or 'gpt-4o'
- As each chunk arrives:
  - If socketId provided: emit 'generation:token' event via Socket.IO
    with payload { token: chunk, ticketId: ticket.id }
- Collect all chunks into a full string
- Call validateOutput on the full string (retry up to 3 times if it fails)
- Return the validated TestCaseInput array

### server/src/workers/llmWorker.ts
BullMQ worker that processes "llm" queue jobs:

- Create a Worker for the "llm" queue
- Job processor:
  1. Get ticketId, projectId, userId from job.data
  2. Fetch the ticket and project from database
  3. Update ticket status to GENERATING
  4. Get socketId from job data (optional — passed if user is online)
  5. Call orchestrator.generateTestCases(ticket, project, socketId)
  6. Save each TestCase to database linked to ticketId and projectId
  7. Update ticket status to DONE
  8. Emit 'generation:complete' via Socket.IO with { ticketId, testCases }
  9. If anything throws: update ticket status to FAILED, emit 'generation:failed'

- Configure: concurrency 2, retry 3 times with exponential backoff

### server/src/controllers/testCaseController.ts

generate(req, res, next):
- Get ticketId from params
- Get socketId from request body (frontend sends this so worker knows where to stream)
- Verify ticket exists and belongs to user's workspace
- Check ticket is not already GENERATING
- Add job to llmQueue with { ticketId, projectId: ticket.projectId, userId: req.user.id, socketId }
- Update ticket status to GENERATING
- Return 202 { message: "Generation started", jobId: job.id }

getTestCases(req, res, next):
- Get testCases for a ticketId
- Verify ticket belongs to user's workspace
- Return 200 { testCases: [] }

updateTestCase(req, res, next):
- Validate body fields
- Create a TestCaseVersion record with current content before updating
- Update the TestCase
- Return 200 { testCase }

### server/src/routes/testcases.ts
Protected routes:
- POST /api/v1/tickets/:ticketId/generate → testCaseController.generate
- GET /api/v1/tickets/:ticketId/testcases → testCaseController.getTestCases
- PATCH /api/v1/testcases/:id → testCaseController.updateTestCase

Update routes/index.ts to mount these.

### server/src/index.ts
Update to:
- Import and start the llmWorker (import the file so the worker process starts)
- Export the io (Socket.IO) instance so the worker can use it to emit events
- Store io on app.locals.io so it's accessible in controllers

## Client — files to create

### client/src/hooks/useSocket.ts
Custom hook that manages the Socket.IO connection:
- Connect to VITE_WS_URL on mount, disconnect on unmount
- Listen for 'generation:token' events → call onToken callback
- Listen for 'generation:complete' events → call onComplete callback
- Listen for 'generation:failed' events → call onFailed callback
- Return { socketId, isConnected }

### client/src/api/testcases.ts
- generateTestCases(ticketId, socketId): Promise<{ jobId: string }>
- getTestCases(ticketId): Promise<TestCase[]>
- updateTestCase(id, data: Partial<TestCase>): Promise<TestCase>

### client/src/store/testCaseStore.ts
Zustand store:
- State: { testCases: TestCase[], streamingTokens: string, isGenerating: boolean }
- Actions: startGeneration, appendToken, completeGeneration, fetchTestCases

### client/src/pages/GeneratePage.tsx
Update from Phase 4 to wire up generation:
- Use useSocket hook, pass socketId to the generate API call
- "Generate Test Cases" button now active (remove "coming soon")
- On click: call testcasesApi.generateTestCases(ticketId, socketId)
- Show a streaming preview area below the form
- As tokens arrive (via useSocket onToken): append them to the preview
- When generation:complete fires: show the final TestCaseList component
- When generation:failed fires: show error message with retry button

### client/src/components/TestCaseList.tsx
Display list of generated test cases:
- Map over testCases array
- Render a TestCaseCard for each one

### client/src/components/TestCaseCard.tsx
Card for a single test case:
- Show: title, priority badge (HIGH=red, MEDIUM=yellow, LOW=green)
- Show: testType badge
- Show: preconditions (if present)
- Show: steps as a numbered list
- Show: expected result
- For now: read-only display only (editing comes in Phase 6)

## After creating all files

End to end test:
1. Start server (npm run dev) — confirm worker starts with message "LLM Worker started"
2. Start client (npm run dev)
3. Login → create a project → go to Generate page
4. Fill in a ticket (use a real example like "User login with email and password")
5. Click Generate Test Cases
6. Watch tokens stream in real time in the preview area
7. Confirm test cases appear as cards when complete
8. Check Prisma Studio — confirm TestCase rows were created in the database
9. Show me the generated test cases from the UI

This is the most important phase. Take your time and make sure
streaming works before confirming. Do NOT move to Phase 6 until I confirm.

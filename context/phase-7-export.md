# Phase 7 — Export

## What we are building in this phase
The ability to export test cases to CSV so they can be imported into
Zephyr Scale, Jira, or any test management tool. This is the final step
in the user journey — generate, review, export.

## Rules before you start
- Read server/CLAUDE.md
- Stream the CSV response for large sets — do not load all rows into memory
- Column names must match Zephyr Scale's import format exactly

## Server — files to create

### server/src/services/export/csvExporter.ts
exportToCSV(testCaseIds: string[], workspaceId: string): NodeJS.ReadableStream
- Verify all testCases belong to the workspace (security check)
- Fetch test cases with their steps
- Use csv-stringify in streaming mode
- Columns in this exact order:
  Name, Status, Priority, Component, Description,
  Precondition, Test Script (Step-by-Step)
- Map fields:
  - Name → title
  - Status → "Draft" (always for new exports)
  - Priority → capitalize first letter (High/Medium/Low)
  - Component → project name
  - Description → testType (Positive/Negative/Edge Case)
  - Precondition → preconditions
  - Test Script → steps joined by newline, each prefixed with step number
- Return the stream

### server/src/controllers/exportController.ts
exportCSV(req, res, next):
- Validate body: { testCaseIds: string[] } (min 1, max 500)
- Set response headers:
  Content-Type: text/csv
  Content-Disposition: attachment; filename="regi-testcases-{timestamp}.csv"
- Pipe the csvExporter stream to res
- On stream error: call next(error)

### server/src/routes/export.ts
Protected route:
- POST /api/v1/export/csv → exportController.exportCSV

Update routes/index.ts to mount export routes.

## Client — files to create

### client/src/api/export.ts
exportCSV(testCaseIds: string[]): Promise<void>
- POST to /api/v1/export/csv
- Set responseType: 'blob' in Axios config
- Create a temporary download link and trigger browser download
- Clean up the link after download starts

### client/src/components/ExportButton.tsx
Export button with selection:
- Props: { testCases: TestCase[] }
- "Export CSV" button
- On click: if no test cases selected, export all
- Show count: "Export 12 test cases"
- Loading state while download prepares
- On success: show brief "Downloaded" confirmation

### client/src/pages/GeneratePage.tsx
Update:
- Add ExportButton below the TestCaseList
- Pass current testCases to ExportButton

## After creating all files

Test flow:
1. Have at least 3 generated test cases from Phase 5/6
2. Click Export CSV
3. Confirm a .csv file downloads
4. Open the file in Excel or Numbers
5. Confirm columns are: Name, Status, Priority, Component,
   Description, Precondition, Test Script (Step-by-Step)
6. Confirm data matches what was shown in the UI

Show me the CSV content (paste the first 3 rows) before we call Phase 7 done.

---

## After Phase 7 is confirmed — what comes next (Phase 8+)

Phase 8: Jira OAuth + webhook listener
Phase 9: Zephyr Scale direct push integration
Phase 10: UI polish, loading states, empty states, error boundaries
Phase 11: Deployment — Docker production build, environment setup

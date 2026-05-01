# Phase 6 — Review and Editing

## What we are building in this phase
The ability to review and edit generated test cases inline.
After the AI generates test cases, QA engineers need to refine them —
fix wording, change priority, add steps. Every edit is saved as a version
so nothing is ever lost.

## Rules before you start
- Read client/CLAUDE.md
- Every save must create a TestCaseVersion record before overwriting
- Auto-save on blur (when user clicks away) — do not require a Save button
- Show a subtle saving indicator while the PATCH request is in flight

## Client — files to update/create

### client/src/components/TestCaseCard.tsx
Update from Phase 5 read-only version to editable version:

View mode (default):
- All fields displayed as text
- Click any field to enter edit mode for that field
- Version history badge in top-right corner: show "v{n}" if versions.length > 1
  clicking it calls props.onHistoryOpen(testCase.id)
- Priority badge is a dropdown when clicked (HIGH/MEDIUM/LOW)
- TestType badge is a dropdown when clicked

Edit mode (per field):
- Title: simple text input, auto-focus
- Preconditions: textarea
- Steps: each step is its own input line
  - "Add step" button appends a new empty step
  - Drag handle on each step (use a simple up/down button if drag is complex)
  - Delete button removes a step
- Expected result: textarea
- On blur of any field: call onSave with the full updated test case
- Show a small spinner next to the field while saving

### client/src/components/TestCaseEditor.tsx
Rich text editor for the steps field using TipTap:
- Install @tiptap/react @tiptap/pm @tiptap/starter-kit
- Ordered list support (steps are numbered)
- Bold and italic only — keep it simple
- On blur: return plain text content to parent

### client/src/components/VersionHistoryPanel.tsx
Slide-in panel (from right side) showing version history:
- List of versions ordered newest first
- Each version shows: timestamp, edited by (user name)
- Click a version to preview its content
- "Restore this version" button restores that version as the current content

### client/src/api/testcases.ts
Add to existing file:
- getVersionHistory(testCaseId): Promise<TestCaseVersion[]>
- restoreVersion(testCaseId, versionId): Promise<TestCase>

### client/src/pages/GeneratePage.tsx
Update to handle editing:
- Pass onSave handler to each TestCaseCard
- onSave calls testcasesApi.updateTestCase
- Pass onHistoryOpen handler — opens VersionHistoryPanel for that card
- Show VersionHistoryPanel as a right-side drawer when open

## Server — files to update

### server/src/controllers/testCaseController.ts
Update updateTestCase:
- Before updating, create a TestCaseVersion with the CURRENT content
  (this is the snapshot before the change, so it can be restored)
- Update the TestCase with new values
- Return updated TestCase with versions count

Add getVersionHistory(req, res, next):
- Return all versions for a testCaseId ordered by createdAt desc

Add restoreVersion(req, res, next):
- Get the version content
- Create a new version with the current content (preserving history)
- Update TestCase with version content
- Return updated TestCase

### server/src/routes/testcases.ts
Add:
- GET /api/v1/testcases/:id/versions → getVersionHistory
- POST /api/v1/testcases/:id/restore/:versionId → restoreVersion

## After creating all files

Test flow:
1. Generate test cases for a ticket (or use ones from Phase 5)
2. Click on a test case title — it should become editable
3. Change the title, click away — confirm it saves (check network tab or Prisma Studio)
4. Edit a step, add a new step, delete a step
5. Click the version badge — confirm the history panel opens showing v1
6. Make another edit — confirm badge now shows v2
7. Click v1 in history and restore it — confirm the card updates

Show me confirmation of each step.

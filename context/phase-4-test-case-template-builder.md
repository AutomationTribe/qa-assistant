# Phase 3b — Test Case Template Builder

## What we are building
After creating a project, the user defines the shape of their test cases.
They choose which fields exist, what each field is called, what type of
data it holds, and whether it is required. The AI reads these fields when
generating test cases and fills each one appropriately.

## Plain English — why this matters
Without this, every project gets the same fixed test case structure:
title, priority, steps, expected result. But different teams test differently.
A security team wants fields like "attack vector" and "severity rating".
A mobile team wants "device type" and "OS version". This feature lets each
project define its own test case shape and the AI adapts to it.

## How it connects to other phases
- Phase 4 (tickets) stores ticketId on each test case — no change needed
- Phase 5 (LLM) reads the template fields and builds a dynamic prompt
  that instructs the AI to fill each field. This replaces the hardcoded
  prompt structure currently planned.
- Phase 6 (review) renders fields dynamically based on the template
  instead of hardcoded card layout
- Phase 7 (export) uses field names as CSV column headers

---

## Database changes

### server/prisma/schema.prisma
Add a new model TestCaseTemplate and update Project to reference it:

```prisma
model TestCaseTemplate {
  id        String              @id @default(uuid())
  projectId String              @unique
  project   Project             @relation(fields: [projectId], references: [id])
  fields    TestCaseField[]
  createdAt DateTime            @default(now())
  updatedAt DateTime            @updatedAt
}

model TestCaseField {
  id           String           @id @default(uuid())
  templateId   String
  template     TestCaseTemplate @relation(fields: [templateId], references: [id])
  name         String           // display name e.g. "Test Steps"
  key          String           // machine key e.g. "test_steps"
  type         FieldType
  description  String?          // hint for the AI — what should go in this field
  required     Boolean          @default(true)
  order        Int              // controls display order
  options      Json?            // for SELECT type — list of allowed values
  createdAt    DateTime         @default(now())
}

enum FieldType {
  TEXT          // short single line text
  TEXTAREA      // long multi-line text
  STEPS         // numbered list of steps (special rendering)
  SELECT        // dropdown with predefined options
  MULTISELECT   // multiple choice from predefined options
  BOOLEAN       // yes/no toggle
  NUMBER        // numeric value
}
```

Update Project model — add relation:
```prisma
model Project {
  // ... existing fields
  template      TestCaseTemplate?
}
```

Also update TestCase model to store dynamic field values:
```prisma
model TestCase {
  // replace fixed fields (title, priority, testType, preconditions,
  // steps, expectedResult) with dynamic field values
  // Keep: id, ticketId, projectId, generatedBy, createdAt, updatedAt, versions
  // Add:
  fieldValues   Json    // stores { field_key: value } for every template field
  title         String  // keep title as a fixed field for display purposes
}
```

After updating schema run:
SHOW ME THE MIGRATION SQL — do not run automatically.
Command: npx prisma migrate dev --create-only --name add-template-builder

---

## Server files to create

### server/src/services/templateService.ts

getTemplate(projectId, workspaceId):
- Verify project belongs to workspace
- Return template with fields ordered by field.order
- If no template exists return null (project has no template yet)

createTemplate(projectId, workspaceId, fields):
- Verify project belongs to workspace
- Verify no template exists yet for this project
- Validate fields array — each must have name, key, type
- Auto-generate key from name if not provided (lowercase, underscores)
- Ensure keys are unique within the template
- Create template and all fields in a single Prisma transaction
- Return created template with fields

updateTemplate(templateId, projectId, workspaceId, fields):
- Verify ownership
- Delete all existing fields
- Re-create with new fields array (simpler than partial updates)
- Return updated template with fields

addField(templateId, projectId, workspaceId, field):
- Add a single field to existing template
- Set order to last position
- Return updated template

removeField(fieldId, templateId, workspaceId):
- Verify ownership chain
- Delete the field
- Reorder remaining fields to close the gap

reorderFields(templateId, workspaceId, fieldIds: string[]):
- Accept array of field IDs in new order
- Update order index on each field
- Return updated template

### server/src/controllers/templateController.ts
Thin controller — validate input, call service, return response.

- GET    → 200 { template } or { template: null }
- POST   → 201 { template }
- PUT    → 200 { template }
- POST /fields → 200 { template }
- DELETE /fields/:fieldId → 200 { template }
- PUT /fields/reorder → 200 { template }

Zod validation for a field:
```typescript
const fieldSchema = z.object({
  name: z.string().min(1).max(50),
  key: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/).optional(),
  type: z.enum(['TEXT','TEXTAREA','STEPS','SELECT','MULTISELECT','BOOLEAN','NUMBER']),
  description: z.string().max(200).optional(),
  required: z.boolean().default(true),
  order: z.number().int().min(0).optional(),
  options: z.array(z.string()).optional(),
})
```

### server/src/routes/templates.ts
All routes protected with authenticate middleware.
Mount under /api/v1/projects/:projectId/template

```
GET    /api/v1/projects/:projectId/template
POST   /api/v1/projects/:projectId/template
PUT    /api/v1/projects/:projectId/template
POST   /api/v1/projects/:projectId/template/fields
DELETE /api/v1/projects/:projectId/template/fields/:fieldId
PUT    /api/v1/projects/:projectId/template/fields/reorder
```

Update server/src/routes/index.ts to mount template routes.

### Update server/src/services/llm/prompts.ts
Update buildUserPrompt to accept template fields:

```typescript
buildUserPrompt(ticket, template, fields: TestCaseField[]):
  // Build a prompt that lists each field and its description
  // Tell the AI to fill every field for each test case
  // Example output in prompt:
  // "For each test case, provide values for these fields:
  //  - test_title (TEXT): A concise name for the test case
  //  - preconditions (TEXTAREA): Setup required before running
  //  - test_steps (STEPS): Numbered steps to execute
  //  - expected_result (TEXT): What should happen if test passes
  //  - priority (SELECT): One of: HIGH, MEDIUM, LOW"
```

---

## Client files to create

### client/src/types/api.ts
Add to existing file:

```typescript
export type FieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'STEPS'
  | 'SELECT'
  | 'MULTISELECT'
  | 'BOOLEAN'
  | 'NUMBER'

export type TestCaseField = {
  id: string
  name: string
  key: string
  type: FieldType
  description?: string
  required: boolean
  order: number
  options?: string[]
}

export type TestCaseTemplate = {
  id: string
  projectId: string
  fields: TestCaseField[]
  createdAt: string
  updatedAt: string
}
```

### client/src/api/templates.ts
```typescript
getTemplate(projectId): Promise<TestCaseTemplate | null>
createTemplate(projectId, fields: Partial<TestCaseField>[]): Promise<TestCaseTemplate>
updateTemplate(projectId, fields: Partial<TestCaseField>[]): Promise<TestCaseTemplate>
addField(projectId, field: Partial<TestCaseField>): Promise<TestCaseTemplate>
removeField(projectId, fieldId: string): Promise<TestCaseTemplate>
reorderFields(projectId, fieldIds: string[]): Promise<TestCaseTemplate>
```

### client/src/store/templateStore.ts
Zustand store:
```typescript
// State
{
  template: TestCaseTemplate | null
  loading: boolean
  error: string | null
}

// Actions
fetchTemplate(projectId): Promise<void>
saveTemplate(projectId, fields): Promise<void>
addField(projectId, field): Promise<void>
removeField(projectId, fieldId): Promise<void>
reorderFields(projectId, fieldIds): Promise<void>
```

### client/src/pages/TemplatePage.tsx
The template builder page at /projects/:projectId/template

Layout: use Layout component (title="Test Case Template")

Top section:
- Project name as breadcrumb: Projects > {project name} > Template
- Subtitle: "Define the fields the AI will fill for every test case"
- "Save Template" primary button top right (disabled if no changes)
- "Preview" secondary button — shows a preview modal of what a
  generated test case will look like with these fields

Field list section:
- If no template yet: empty state with "Add your first field" button
- Each field shown as a draggable card (use simple up/down buttons
  instead of drag-and-drop for now)
- Field card shows:
  - Drag handle (↕) on left
  - Field name (bold)
  - Field key (monospace, muted) e.g. test_steps
  - Type badge (TEXT / STEPS / SELECT etc)
  - Description text (muted, truncated)
  - Required badge if required: true
  - Edit button (pencil icon)
  - Delete button (trash icon, red, confirm before deleting)

"Add Field" button at bottom of list:
- Opens AddFieldModal

### client/src/components/AddFieldModal.tsx
Modal for adding or editing a field.

Fields in the modal:

1. Field name (required)
   - Text input
   - Placeholder: "e.g. Test Steps, Expected Result, Priority"
   - As user types, auto-generates the key below

2. Field key (auto-generated, editable)
   - Text input, monospace font
   - Auto-generated from name: lowercase, spaces→underscores
   - Hint: "Used by the AI to identify this field. Letters, numbers,
     underscores only."
   - Validate: /^[a-z0-9_]+$/

3. Field type (required)
   - Visual type selector — grid of type cards:
     [T] Text         — short single line
     [¶] Long Text    — multi-line paragraph
     [#] Steps        — numbered list of steps
     [▼] Select       — pick one from a list
     [☑] Multi-select — pick multiple from a list
     [✓] Yes/No       — boolean toggle
     [0] Number       — numeric value
   - Click to select, selected card highlighted in indigo

4. Description / AI instruction (optional)
   - Textarea, max 200 chars
   - Label: "Describe what the AI should put in this field"
   - Placeholder: "e.g. List each step the tester needs to perform,
     numbered from 1. Be specific and actionable."
   - Hint: "This is read by the AI — the better you describe it,
     the better the output"

5. Required toggle
   - Toggle switch: Required / Optional
   - Default: Required

6. Options (only shown when type is SELECT or MULTISELECT)
   - Label: "Options"
   - Tag input — type a value and press Enter to add
   - Each option shown as a removable tag
   - Placeholder: "e.g. High, Medium, Low"

Footer:
- Cancel button
- "Add Field" / "Save Changes" primary button

### client/src/components/TemplatePreviewModal.tsx
Shows a preview of what a generated test case will look like.

- Modal or slide-in panel
- Title: "Template Preview"
- Subtitle: "This is how a generated test case will appear"
- For each field in the template show:
  - Field label (bold)
  - A placeholder value that matches the type:
    - TEXT: "[AI will generate a concise text value]"
    - TEXTAREA: "[AI will generate a detailed paragraph]"
    - STEPS: "1. [First step]\n2. [Second step]\n3. [Third step]"
    - SELECT: "[One of: {options joined by comma}]"
    - BOOLEAN: "Yes / No"
    - NUMBER: "[Numeric value]"
- Close button

### Update client/src/pages/ProjectsPage.tsx
After a project is created, show a "Set up template" prompt on its card
if it has no template yet:
- Small amber badge: "Template needed"
- Clicking the card navigates to /projects/:id/template instead of /generate
- Once template exists, badge changes to green "Template ready"
  and clicking goes to /generate as normal

### Update client/src/App.tsx
Add new route:
```typescript
<Route
  path="/projects/:projectId/template"
  element={
    <ProtectedRoute>
      <TemplatePage />
    </ProtectedRoute>
  }
/>
```

---

## Default template fields (pre-populate for new projects)

When a project is first created, auto-create a default template with
these fields so the user has a starting point they can customise:

```typescript
const DEFAULT_FIELDS = [
  {
    name: 'Test Title',
    key: 'test_title',
    type: 'TEXT',
    description: 'A concise, descriptive name for this test case',
    required: true,
    order: 0,
  },
  {
    name: 'Preconditions',
    key: 'preconditions',
    type: 'TEXTAREA',
    description: 'Any setup or state required before running this test',
    required: false,
    order: 1,
  },
  {
    name: 'Test Steps',
    key: 'test_steps',
    type: 'STEPS',
    description: 'Numbered steps the tester must follow to execute this test case',
    required: true,
    order: 2,
  },
  {
    name: 'Expected Result',
    key: 'expected_result',
    type: 'TEXTAREA',
    description: 'What should happen if the test passes',
    required: true,
    order: 3,
  },
  {
    name: 'Priority',
    key: 'priority',
    type: 'SELECT',
    description: 'The importance of this test case',
    required: true,
    order: 4,
    options: ['HIGH', 'MEDIUM', 'LOW'],
  },
  {
    name: 'Test Type',
    key: 'test_type',
    type: 'SELECT',
    description: 'The category of this test case',
    required: true,
    order: 5,
    options: ['POSITIVE', 'NEGATIVE', 'EDGE_CASE'],
  },
]
```

Auto-create this template in projectService.createProject after the
project is created. The user can then modify, delete, or add fields.

---

## After building all files

Test this flow:
1. Create a new project
2. Confirm you are redirected to /projects/:id/template
3. Confirm the default 6 fields are pre-populated
4. Add a new field — type "Severity" with type SELECT,
   options: Critical, Major, Minor, Trivial
5. Edit the "Priority" field and change its description
6. Delete the "Test Type" field
7. Move "Expected Result" up one position using the up arrow
8. Click "Save Template"
9. Click "Preview" — confirm all fields show with placeholder values
10. Go back to Projects — confirm the project card shows "Template ready"

Show me confirmation of each step.
Do not move to Phase 4 until I confirm this works end to end.

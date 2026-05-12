# Phase 7 — AI Generation + Dynamic Test Cases Table + Collapsible Sidebar

## What we are building

### Part A — AI test case generation on feature create
When a user adds a feature with Generate AI toggled on:
1. Feature is created in the database
2. LLM generates test cases using the project's template fields as the schema
3. User is redirected to the test cases table for that feature
4. Generated test cases appear with ALL rows in edit mode for review
5. User edits any field, then clicks Save all

### Part B — Dynamic test cases table
The columns in the test cases table are NOT hardcoded.
They are built at runtime from the project's TestCaseTemplate fields.
Each template field becomes one column.
If the template has 5 fields, the table has 5 columns (plus an Actions column).
If someone adds a 6th field to the template, the table gets a 6th column.

### Part C — Collapsible sidebar on test cases page
A collapse toggle on the sidebar edge shrinks it to icon-only (48px).
State persists in localStorage.

## Reference design
ui/features-flow-v4-fixed.html — steps 5 through 8

---

## How field types render in the table

Each template field has a type. The table renders and edits each one correctly:

| FieldType  | Read display                        | Edit control              |
|------------|-------------------------------------|---------------------------|
| TEXT       | Plain text, truncated               | <input type="text"/>      |
| TEXTAREA   | Truncated text, expand on hover     | <textarea/>               |
| STEPS      | Numbered list, "+N more" if long    | <textarea/> one step per line |
| SELECT     | Badge with the selected value       | <select/> with options    |
| MULTISELECT| Multiple badges                     | Checkboxes or multi-select|
| BOOLEAN    | Yes / No badge                      | Toggle switch             |
| NUMBER     | Numeric value                       | <input type="number"/>    |

---

## Server changes

### server/src/services/llm/prompts.ts
Create this file if it does not exist, or add to it:

```typescript
import { TestCaseField } from '@prisma/client'

export function buildTestCaseGenerationPrompt(
  feature: {
    name: string
    description?: string | null
    type: string
  },
  fields: TestCaseField[],
  style: string
): { systemPrompt: string; userPrompt: string } {

  // Build field schema description for the AI
  const fieldSchema = fields
    .map(f => {
      let desc = `"${f.key}" (${f.type}): ${f.description || f.name}`
      if (f.options && Array.isArray(f.options) && (f.options as string[]).length > 0) {
        desc += `. Allowed values: ${(f.options as string[]).join(', ')}`
      }
      if (f.required) desc += '. Required.'
      return desc
    })
    .join('\n')

  const systemPrompt = `You are a senior QA engineer generating structured test cases.

Return ONLY a valid JSON array. No markdown, no explanation, no preamble, no code fences.
The array must contain between 4 and 8 test case objects.

Each object must have exactly these keys:
${fields.map(f => `"${f.key}"`).join(', ')}

Field definitions:
${fieldSchema}

Test case style: ${style}
Generate a mix of positive, negative, and edge case scenarios.
For STEPS fields: return an array of strings, one step per item.
For SELECT fields: return exactly one of the allowed values.
For BOOLEAN fields: return true or false.
For NUMBER fields: return a number.
For all other fields: return a string.`

  const featureType = feature.type === 'NEW_FEATURE' ? 'New Feature' : 'Bug'

  const userPrompt = `Generate test cases for this feature:

Feature: ${feature.name}
Type: ${featureType}
${feature.description ? `Description: ${feature.description}` : ''}

Return only the JSON array.`

  return { systemPrompt, userPrompt }
}
```

### server/src/services/testCaseService.ts

The TestCase model stores field values as a JSON blob keyed by field key.
This means the TestCase table does not change when the template changes —
the fieldValues column holds whatever fields the template had at generation time.

Update the TestCase Prisma model first (add fieldValues, keep existing fields
as fallback for manually created test cases):

In schema.prisma update TestCase:
```prisma
model TestCase {
  id           String      @id @default(uuid())
  featureId    String
  feature      Feature     @relation(fields: [featureId], references: [id])
  fieldValues  Json        // { field_key: value } for every template field
  generatedBy  GeneratedBy @default(LLM)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  deletedAt    DateTime?
}
```

Note: remove the old fixed columns (title, priority, testType, steps,
expectedResult, preconditions) from the TestCase model.
fieldValues is the single flexible store for all test case data.

Show migration SQL before running:
npx prisma migrate dev --create-only --name testcase-dynamic-fields

generateTestCases(featureId, workspaceId):
```typescript
async generateTestCases(featureId: string, workspaceId: string) {
  // 1. Verify ownership
  const feature = await prisma.feature.findUnique({
    where: { id: featureId },
    include: {
      project: {
        include: {
          template: {
            include: { fields: { orderBy: { order: 'asc' } } }
          }
        }
      }
    }
  })

  if (!feature) throw new NotFoundError('Feature not found')
  if (feature.project.workspaceId !== workspaceId) {
    throw new UnauthorizedError('Unauthorized')
  }
  if (!feature.project.template || feature.project.template.fields.length === 0) {
    throw new Error('NO_TEMPLATE: No template defined for this project. Create a template first.')
  }

  const fields = feature.project.template.fields
  const style = (feature.project.templateConfig as any)?.style ?? 'step_by_step'

  // 2. Build prompt
  const { systemPrompt, userPrompt } = buildTestCaseGenerationPrompt(
    {
      name: feature.name,
      description: feature.description,
      type: feature.type,
    },
    fields,
    style
  )

  // 3. Call OpenAI
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const completion = await openai.chat.completions.create({
    model: process.env.DEFAULT_LLM_MODEL || 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
  })

  const raw = completion.choices[0].message.content || '[]'

  // 4. Parse — strip any accidental markdown fences
  let parsed: Record<string, any>[]
  try {
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const obj = JSON.parse(clean)
    parsed = Array.isArray(obj) ? obj : Object.values(obj)[0] as any[]
  } catch {
    throw new Error('LLM returned invalid JSON. Try regenerating.')
  }

  // 5. Validate each item has at least the required field keys
  const requiredKeys = fields.filter(f => f.required).map(f => f.key)
  const validItems = parsed.filter(item =>
    requiredKeys.every(key => key in item)
  )

  if (validItems.length === 0) {
    throw new Error('LLM output did not match template fields. Try regenerating.')
  }

  // 6. Save each test case with fieldValues = the raw AI output object
  const created = await prisma.$transaction(
    validItems.map(item =>
      prisma.testCase.create({
        data: {
          featureId,
          fieldValues: item,
          generatedBy: 'LLM',
        }
      })
    )
  )

  return { testCases: created, fields }
}
```

Update listTestCases to also return the template fields so the client
knows how to render columns:

```typescript
async listTestCases(featureId: string, workspaceId: string) {
  const feature = await prisma.feature.findUnique({
    where: { id: featureId },
    include: {
      project: {
        include: {
          template: {
            include: { fields: { orderBy: { order: 'asc' } } }
          }
        }
      }
    }
  })

  if (!feature) throw new NotFoundError('Feature not found')
  if (feature.project.workspaceId !== workspaceId) {
    throw new UnauthorizedError('Unauthorized')
  }

  const testCases = await prisma.testCase.findMany({
    where: { featureId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  })

  return {
    testCases,
    fields: feature.project.template?.fields ?? [],
  }
}
```

### server/src/controllers/testCaseController.ts

list:
```typescript
list: async (req, res, next) => {
  try {
    const { featureId } = req.params
    const { testCases, fields } = await testCaseService.listTestCases(
      featureId,
      req.user!.workspaceId
    )
    return res.json({ testCases, fields })
  } catch (error) {
    next(error)
  }
}
```

generate:
```typescript
generate: async (req, res, next) => {
  try {
    const { featureId } = req.params
    const { testCases, fields } = await testCaseService.generateTestCases(
      featureId,
      req.user!.workspaceId
    )
    return res.json({ testCases, fields, count: testCases.length })
  } catch (error: any) {
    if (error.message?.startsWith('NO_TEMPLATE')) {
      return res.status(400).json({
        error: { code: 'NO_TEMPLATE', message: error.message.replace('NO_TEMPLATE: ', '') }
      })
    }
    next(error)
  }
}
```

update:
```typescript
update: async (req, res, next) => {
  try {
    const { testCaseId } = req.params
    const { fieldValues } = req.body
    const testCase = await testCaseService.updateTestCase(
      testCaseId,
      req.user!.workspaceId,
      { fieldValues }
    )
    return res.json({ testCase })
  } catch (error) {
    next(error)
  }
}
```

### server/src/routes/testcases.ts
```
GET    /api/v1/features/:featureId/testcases
POST   /api/v1/features/:featureId/testcases/generate
PATCH  /api/v1/testcases/:testCaseId
DELETE /api/v1/testcases/:testCaseId
```
Add Swagger JSDoc comments on each route.
Update context/api-endpoints.md.

---

## Client changes

### client/src/types/api.ts
Update TestCase type:

```typescript
export type FieldType =
  | 'TEXT' | 'TEXTAREA' | 'STEPS'
  | 'SELECT' | 'MULTISELECT' | 'BOOLEAN' | 'NUMBER'

export type TestCaseField = {
  id: string
  templateId: string
  name: string
  key: string
  type: FieldType
  description?: string
  required: boolean
  order: number
  options?: string[]
}

export type TestCase = {
  id: string
  featureId: string
  fieldValues: Record<string, any>  // { field_key: value }
  generatedBy: 'LLM' | 'MANUAL'
  createdAt: string
  updatedAt: string
}
```

### client/src/api/testcases.ts
Update return types:

```typescript
import apiClient from './client'
import { TestCase, TestCaseField } from '@/types/api'

interface TestCasesResponse {
  testCases: TestCase[]
  fields: TestCaseField[]
}

export const testCasesAPI = {
  async listTestCases(featureId: string): Promise<TestCasesResponse> {
    const res = await apiClient.get<TestCasesResponse>(
      `/features/${featureId}/testcases`
    )
    return res.data
  },

  async generateTestCases(featureId: string): Promise<TestCasesResponse & { count: number }> {
    const res = await apiClient.post<TestCasesResponse & { count: number }>(
      `/features/${featureId}/testcases/generate`
    )
    return res.data
  },

  async updateTestCase(
    testCaseId: string,
    fieldValues: Record<string, any>
  ): Promise<TestCase> {
    const res = await apiClient.patch<{ testCase: TestCase }>(
      `/testcases/${testCaseId}`,
      { fieldValues }
    )
    return res.data.testCase
  },

  async deleteTestCase(testCaseId: string): Promise<void> {
    await apiClient.delete(`/testcases/${testCaseId}`)
  },
}
```

### client/src/store/testCaseStore.ts
Update store to hold both testCases and fields:

```typescript
import { create } from 'zustand'
import { TestCase, TestCaseField } from '@/types/api'
import { testCasesAPI } from '@/api/testcases'

interface TestCaseStore {
  testCases: TestCase[]
  fields: TestCaseField[]         // template fields for current feature
  loading: boolean
  generating: boolean
  error: string | null
  fetchTestCases(featureId: string): Promise<void>
  generateTestCases(featureId: string): Promise<{ testCases: TestCase[]; fields: TestCaseField[] }>
  updateTestCase(id: string, fieldValues: Record<string, any>): Promise<void>
  deleteTestCase(id: string): Promise<void>
  clearTestCases(): void
}

export const useTestCaseStore = create<TestCaseStore>((set, get) => ({
  testCases: [],
  fields: [],
  loading: false,
  generating: false,
  error: null,

  fetchTestCases: async (featureId) => {
    set({ loading: true, error: null })
    try {
      const { testCases, fields } = await testCasesAPI.listTestCases(featureId)
      set({ testCases, fields, loading: false })
    } catch {
      set({ error: 'Failed to load test cases', loading: false })
    }
  },

  generateTestCases: async (featureId) => {
    set({ generating: true, error: null })
    try {
      const { testCases, fields } = await testCasesAPI.generateTestCases(featureId)
      set({ testCases, fields, generating: false })
      return { testCases, fields }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Generation failed'
      set({ error: msg, generating: false })
      throw err
    }
  },

  updateTestCase: async (id, fieldValues) => {
    const updated = await testCasesAPI.updateTestCase(id, fieldValues)
    set(state => ({
      testCases: state.testCases.map(tc => tc.id === id ? updated : tc)
    }))
  },

  deleteTestCase: async (id) => {
    await testCasesAPI.deleteTestCase(id)
    set(state => ({
      testCases: state.testCases.filter(tc => tc.id !== id)
    }))
  },

  clearTestCases: () => set({ testCases: [], fields: [], error: null }),
}))
```

### client/src/pages/TestCasesPage.tsx
Full implementation of the dynamic test cases table page.

#### Sidebar collapse
```typescript
const [sidebarCollapsed, setSidebarCollapsed] = useState(
  () => localStorage.getItem('sidebarCollapsed') === 'true'
)

const toggleSidebar = () => {
  const next = !sidebarCollapsed
  setSidebarCollapsed(next)
  localStorage.setItem('sidebarCollapsed', String(next))
}
```

Sidebar renders at w-[208px] when expanded, w-[48px] when collapsed.
When collapsed: show only icons, no text labels.
The collapse toggle button sits at the bottom of the sidebar.
Use a left-pointing chevron ◀ that rotates 180° when collapsed.
Transition: transition-all duration-200 on the sidebar width.

#### On mount
```typescript
const [searchParams] = useSearchParams()
const shouldGenerate = searchParams.get('generate') === 'true'

useEffect(() => {
  if (shouldGenerate) {
    navigate(location.pathname, { replace: true })  // clear query param
    handleGenerate()
  } else {
    fetchTestCases(featureId!)
  }
}, [featureId])
```

#### Edit mode state
```typescript
// allEditMode = true after AI generation — every row is editable
const [allEditMode, setAllEditMode] = useState(false)

// editingId = which single row is being edited in normal mode
const [editingId, setEditingId] = useState<string | null>(null)

// deletingId = which row is showing delete confirmation
const [deletingId, setDeletingId] = useState<string | null>(null)

// drafts = local edits before saving, keyed by testCase id
const [drafts, setDrafts] = useState<Record<string, Record<string, any>>>({})
```

When allEditMode becomes true, pre-populate drafts with each test case's
current fieldValues so every field shows the AI output ready to edit.

#### handleGenerate
```typescript
const handleGenerate = async () => {
  setAllEditMode(true)
  try {
    const { testCases: generated } = await generateTestCases(featureId!)
    // Pre-populate drafts
    const initial: Record<string, Record<string, any>> = {}
    generated.forEach(tc => { initial[tc.id] = { ...tc.fieldValues } })
    setDrafts(initial)
    toast.success(`${generated.length} test cases generated — review and save`)
  } catch (err: any) {
    setAllEditMode(false)
    toast.error(
      err?.response?.data?.error?.message || 'Generation failed. Please try again.'
    )
  }
}
```

#### handleSaveAll
```typescript
const handleSaveAll = async () => {
  try {
    await Promise.all(
      testCases.map(tc => {
        const draft = drafts[tc.id]
        if (!draft) return Promise.resolve()
        return updateTestCase(tc.id, draft)
      })
    )
    setAllEditMode(false)
    setDrafts({})
    toast.success('All test cases saved')
  } catch {
    toast.error('Failed to save some test cases. Please try again.')
  }
}
```

#### handleSaveOne
```typescript
const handleSaveOne = async (id: string) => {
  const draft = drafts[id]
  if (!draft) { setEditingId(null); return }
  try {
    await updateTestCase(id, draft)
    setEditingId(null)
    const next = { ...drafts }
    delete next[id]
    setDrafts(next)
    toast.success('Test case updated')
  } catch {
    toast.error('Failed to save test case')
  }
}
```

#### Dynamic table rendering
The table is built from the fields array from the store.

Table header:
```tsx
<thead>
  <tr>
    <th className="...">#</th>
    {fields.map(field => (
      <th key={field.key} className="...">
        {field.name}
      </th>
    ))}
    <th className="... text-right">Actions</th>
  </tr>
</thead>
```

Table rows — each row checks if it is in edit mode:
```tsx
{testCases.map((tc, index) => {
  const isEditing = allEditMode || editingId === tc.id
  const isDeleting = deletingId === tc.id
  const draft = drafts[tc.id] || tc.fieldValues

  if (isDeleting) {
    return (
      <tr key={tc.id} className="bg-[#FEF2F2]">
        <td colSpan={fields.length + 2} className="px-3 py-3">
          <div className="flex items-center gap-3 text-[12.5px] text-[#DC2626]">
            <span className="text-[15px]">⚠</span>
            Delete this test case? This cannot be undone.
            <button onClick={() => handleDelete(tc.id)} className="...del-yes...">
              Yes, delete
            </button>
            <button onClick={() => setDeletingId(null)} className="...cancel...">
              Cancel
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr
      key={tc.id}
      className={isEditing ? 'bg-[#FAFAFE]' : 'hover:bg-[#FAFAF9]'}
    >
      {/* Row number */}
      <td className="px-3 py-2 text-[11px] text-[#C0C0BC] font-mono align-top">
        {String(index + 1).padStart(2, '0')}
      </td>

      {/* One cell per template field */}
      {fields.map(field => (
        <td key={field.key} className="px-3 py-2 align-top">
          {isEditing
            ? renderEditCell(field, draft[field.key], (val) => {
                setDrafts(prev => ({
                  ...prev,
                  [tc.id]: { ...prev[tc.id], [field.key]: val }
                }))
              })
            : renderReadCell(field, tc.fieldValues[field.key])
          }
        </td>
      ))}

      {/* Actions */}
      <td className="px-3 py-2 text-right align-top">
        {isEditing ? (
          <div className="flex gap-2 justify-end">
            {!allEditMode && (
              <>
                <button onClick={() => handleSaveOne(tc.id)} className="...save...">
                  Save
                </button>
                <button onClick={() => { setEditingId(null); }} className="...cancel...">
                  Cancel
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="flex gap-1.5 justify-end">
            <button
              onClick={() => {
                setEditingId(tc.id)
                setDrafts(prev => ({ ...prev, [tc.id]: { ...tc.fieldValues } }))
              }}
              className="...edit-btn..."
              title="Edit"
            >
              ✏
            </button>
            <button
              onClick={() => setDeletingId(tc.id)}
              className="...delete-btn..."
              title="Delete"
            >
              🗑
            </button>
          </div>
        )}
      </td>
    </tr>
  )
})}
```

#### renderReadCell(field, value)
```typescript
function renderReadCell(field: TestCaseField, value: any): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-[#C0C0BC] text-[12px]">—</span>
  }

  switch (field.type) {
    case 'STEPS':
      const steps = Array.isArray(value) ? value : [String(value)]
      const visible = steps.slice(0, 3)
      return (
        <div className="text-[12px] text-[#555] leading-relaxed">
          {visible.map((s, i) => (
            <div key={i} className="flex gap-1.5">
              <span className="text-[#C0C0BC] flex-shrink-0 text-[11px] pt-px">{i + 1}.</span>
              <span>{s}</span>
            </div>
          ))}
          {steps.length > 3 && (
            <div className="text-[11px] text-[#C0C0BC] mt-1">+{steps.length - 3} more</div>
          )}
        </div>
      )

    case 'SELECT':
      return (
        <span className="inline-flex items-center text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-[#F0F0ED] text-[#555]">
          {String(value)}
        </span>
      )

    case 'BOOLEAN':
      return (
        <span className={`inline-flex items-center text-[10.5px] font-medium px-2 py-0.5 rounded-full ${
          value ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#F5F5F3] text-[#888]'
        }`}>
          {value ? 'Yes' : 'No'}
        </span>
      )

    case 'MULTISELECT':
      const vals = Array.isArray(value) ? value : [String(value)]
      return (
        <div className="flex flex-wrap gap-1">
          {vals.map((v, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[#F0F0ED] text-[#555]">
              {v}
            </span>
          ))}
        </div>
      )

    case 'NUMBER':
      return <span className="text-[13px] font-medium text-[#111]">{value}</span>

    default: // TEXT, TEXTAREA
      const str = String(value)
      return (
        <span className="text-[12.5px] text-[#333] leading-relaxed line-clamp-2">
          {str}
        </span>
      )
  }
}
```

#### renderEditCell(field, value, onChange)
```typescript
function renderEditCell(
  field: TestCaseField,
  value: any,
  onChange: (val: any) => void
): React.ReactNode {
  switch (field.type) {
    case 'STEPS':
      const stepsVal = Array.isArray(value) ? value.join('\n') : String(value || '')
      return (
        <textarea
          className="w-full border border-[#4F46E5] rounded-lg px-2 py-1.5 text-[12px] font-sans outline-none bg-white resize-none leading-relaxed min-h-[80px]"
          value={stepsVal}
          placeholder="One step per line"
          onChange={e => onChange(e.target.value.split('\n').filter(s => s.trim()))}
        />
      )

    case 'SELECT':
      return (
        <select
          className="border border-[#4F46E5] rounded-lg px-2 py-1.5 text-[12.5px] font-sans outline-none bg-white cursor-pointer"
          value={String(value || '')}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Select...</option>
          {(field.options || []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )

    case 'BOOLEAN':
      return (
        <button
          onClick={() => onChange(!value)}
          className={`text-[12px] px-3 py-1 rounded-lg border font-medium transition-all ${
            value
              ? 'bg-[#ECFDF5] border-[#6EE7B7] text-[#059669]'
              : 'bg-[#F5F5F3] border-[#D0D0CC] text-[#888]'
          }`}
        >
          {value ? 'Yes' : 'No'}
        </button>
      )

    case 'NUMBER':
      return (
        <input
          type="number"
          className="w-[80px] border border-[#4F46E5] rounded-lg px-2 py-1.5 text-[12.5px] font-sans outline-none bg-white"
          value={value ?? ''}
          onChange={e => onChange(Number(e.target.value))}
        />
      )

    case 'TEXTAREA':
      return (
        <textarea
          className="w-full border border-[#4F46E5] rounded-lg px-2 py-1.5 text-[12.5px] font-sans outline-none bg-white resize-none leading-relaxed min-h-[64px]"
          value={String(value || '')}
          onChange={e => onChange(e.target.value)}
        />
      )

    default: // TEXT
      return (
        <input
          type="text"
          className="w-full border border-[#4F46E5] rounded-lg px-2 py-1.5 text-[12.5px] font-sans outline-none bg-white"
          value={String(value || '')}
          onChange={e => onChange(e.target.value)}
        />
      )
  }
}
```

#### AI review banner (shown when allEditMode is true)
```tsx
{allEditMode && !generating && testCases.length > 0 && (
  <div className="bg-[#F0EFFD] border border-[#C4C2F4] rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
    <span className="text-[#4F46E5] text-[16px] flex-shrink-0">✦</span>
    <div className="flex-1">
      <div className="text-[13px] font-medium text-[#4F46E5]">
        {testCases.length} test cases generated — review and edit before saving
      </div>
      <div className="text-[12px] text-[#6B64D0] mt-0.5">
        All fields are editable. Click Save all when you are done.
      </div>
    </div>
    <button
      onClick={handleSaveAll}
      className="bg-[#4F46E5] hover:bg-[#4338CA] text-white border-none rounded-lg px-4 py-2 text-[12.5px] font-medium cursor-pointer font-sans flex-shrink-0"
    >
      Save all →
    </button>
  </div>
)}
```

#### Topbar Save all button
Only visible when allEditMode is true and there are test cases:
```tsx
{allEditMode && testCases.length > 0 && (
  <button
    onClick={handleSaveAll}
    className="bg-[#059669] hover:bg-[#047857] text-white border-none rounded-lg px-3 py-1.5 text-[12.5px] font-medium cursor-pointer font-sans flex items-center gap-1.5"
  >
    ✓ Save all
  </button>
)}
```

#### Generating skeleton
```tsx
{generating && (
  <div className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden">
    <div className="px-4 py-3 bg-[#FAFAF8] border-b border-[#EBEBEB] flex items-center gap-2">
      <div className="w-3.5 h-3.5 border-2 border-[#EEEDF8] border-t-[#4F46E5] rounded-full animate-spin"/>
      <span className="text-[12.5px] text-[#4F46E5] font-medium animate-pulse">
        Generating test cases with AI...
      </span>
    </div>
    <table className="w-full">
      <tbody>
        {[1, 2, 3, 4].map(i => (
          <tr key={i} className="border-b border-[#F2F2EF]">
            {[...Array((fields.length || 4) + 2)].map((_, j) => (
              <td key={j} className="px-3 py-3">
                <div
                  className="h-3 rounded bg-gradient-to-r from-[#F0F0ED] via-[#E8E8E5] to-[#F0F0ED] animate-pulse"
                  style={{ width: `${40 + Math.random() * 40}%` }}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
```

#### Empty state
```tsx
{!loading && !generating && testCases.length === 0 && (
  <div className="flex items-center justify-center py-16">
    <div className="text-center max-w-[360px]">
      <div className="w-14 h-14 rounded-2xl bg-[#EEEDF8] flex items-center justify-center text-2xl mx-auto mb-4">
        ✓
      </div>
      <h3 className="text-[16px] font-semibold text-[#111] mb-2">
        No test cases yet
      </h3>
      <p className="text-[13px] text-[#888] leading-relaxed mb-6">
        Generate them with AI or add them manually.
      </p>
      <div className="flex flex-col gap-3">
        <button
          onClick={handleGenerate}
          className="bg-[#4F46E5] hover:bg-[#4338CA] text-white border-none rounded-lg px-5 py-2.5 text-[13px] font-medium cursor-pointer font-sans"
        >
          ✦ Generate with AI
        </button>
        <button className="bg-white text-[#444] border border-[#D0D0CC] rounded-lg px-5 py-2.5 text-[13px] cursor-pointer font-sans">
          Add manually
        </button>
      </div>
    </div>
  </div>
)}
```

---

## After building all files

Test this exact flow end to end:

### Flow A — Generate ON from Add Feature
1. Go to a project that has a template with fields
2. Click Add Feature
3. Fill in name and description
4. Toggle Generate AI on
5. Click Add Feature
6. Confirm you land on the test cases table
7. Confirm skeleton loading rows appear while generating
8. Confirm the AI review banner appears: "X test cases generated — review and edit"
9. Confirm every row is in edit mode — all fields are inputs, not text
10. The number of columns matches the number of template fields exactly
11. Edit a field value — change one step, change a priority
12. Click Save all
13. Confirm toast: "All test cases saved"
14. Confirm rows return to read mode
15. Confirm edited values are shown

### Flow B — Click feature row
1. Go to features table
2. Click any feature row that has test cases
3. Confirm you land on the test cases table
4. Confirm rows are in READ mode (not edit mode)
5. Click Edit on one row — confirm only that row becomes editable
6. Edit a field, click Save — confirm it saves
7. Click Edit on a different row — confirm first row closes

### Flow C — Sidebar collapse
1. On the test cases table, click the ◀ collapse button at the bottom of the sidebar
2. Confirm sidebar shrinks to icon-only width
3. Confirm nav icons are still visible and clickable
4. Confirm the table area gets noticeably wider
5. Refresh the page — confirm sidebar stays collapsed (localStorage)
6. Click the button again (now ▶) — confirm sidebar expands

### Flow D — No template error
1. Create a new project with no template defined
2. Add a feature with Generate AI on
3. Confirm a toast error appears: "No template defined for this project. Create a template first."
4. Confirm no redirect happens — user stays on features page

### Flow E — Dynamic columns
1. Go to project settings → template
2. Add a new field e.g. "Severity" (SELECT with Critical/Major/Minor)
3. Go back to a feature's test cases and generate
4. Confirm the table now has a "Severity" column
5. Confirm the AI populated the Severity field

Do not move to the next phase until all flows are confirmed.
Fix all TypeScript errors before confirming done.

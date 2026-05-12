# Phase 6 — Test Cases Table + AI Generate Flow

## What we are building
This phase wires up the complete test case workflow:
- Add Feature panel gets a Generate AI toggle
- Toggle ON → clicking Add Feature redirects to the test cases table for that feature
- Toggle OFF → clicking Add Feature closes the panel and shows the features table
- Features with 0 test cases show a Generate button in the Actions column
- Clicking any feature row navigates to its test cases table
- Test cases table has inline edit and inline delete with confirmation

## Reference design
ui/features-flow-v4-fixed.html — walk all 8 steps before implementing

## Data hierarchy reminder
Project → Feature → Test Cases

---

## Database changes

### server/prisma/schema.prisma
Add TestCase model linked to Feature:

```prisma
model TestCase {
  id             String      @id @default(uuid())
  featureId      String
  feature        Feature     @relation(fields: [featureId], references: [id])
  title          String
  priority       Priority    @default(MEDIUM)
  testType       TestCaseType @default(POSITIVE)
  steps          Json        // array of strings
  expectedResult String      @db.Text
  preconditions  String?     @db.Text
  generatedBy    GeneratedBy @default(LLM)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  deletedAt      DateTime?
}

enum Priority {
  HIGH
  MEDIUM
  LOW
}

enum TestCaseType {
  POSITIVE
  NEGATIVE
  EDGE_CASE
}

enum GeneratedBy {
  LLM
  MANUAL
}
```

Update Feature model to include testCases relation and count:
```prisma
model Feature {
  // existing fields...
  testCases   TestCase[]
}
```

Show migration SQL before running:
npx prisma migrate dev --create-only --name add-test-cases

---

## Server files to create

### server/src/services/testCaseService.ts

listTestCases(featureId, workspaceId):
- Verify feature belongs to a project in the workspace
- Return all non-deleted test cases for the feature
- Order by createdAt asc
- Return with full fields

createTestCase(featureId, workspaceId, data):
- Verify feature ownership
- Create with generatedBy: MANUAL
- Return created test case

createManyTestCases(featureId, workspaceId, testCases[]):
- Verify feature ownership
- Create all in a single Prisma createMany
- Return all created test cases
- Used by the LLM worker after generation

updateTestCase(testCaseId, workspaceId, data):
- Verify ownership chain: testCase → feature → project → workspace
- Update only provided fields
- Return updated test case

deleteTestCase(testCaseId, workspaceId):
- Verify ownership
- Soft delete: set deletedAt = now()
- Return { message: 'Test case deleted' }

generateTestCases(featureId, workspaceId):
- Verify feature ownership
- Fetch the project's template fields
- Build prompt from feature name + description + template fields
- Call OpenAI (use existing llm/orchestrator.ts pattern)
- Validate response matches template field keys
- Save all generated test cases via createManyTestCases
- Update feature so _count.testCases reflects new count
- Return the created test cases array

### server/src/controllers/testCaseController.ts

list(req, res, next):
- featureId from req.params
- Return 200 { testCases: [] }

create(req, res, next):
- Validate body: { title, priority?, testType?, steps, expectedResult, preconditions? }
- Return 201 { testCase }

generate(req, res, next):
- featureId from req.params
- Call testCaseService.generateTestCases
- Return 200 { testCases: [], count: number }

update(req, res, next):
- testCaseId from req.params
- All fields optional
- Return 200 { testCase }

remove(req, res, next):
- testCaseId from req.params
- Return 200 { message: 'Test case deleted' }

### server/src/routes/testcases.ts
All routes protected with authenticate middleware.

```
GET    /api/v1/features/:featureId/testcases
POST   /api/v1/features/:featureId/testcases
POST   /api/v1/features/:featureId/testcases/generate
PATCH  /api/v1/testcases/:testCaseId
DELETE /api/v1/testcases/:testCaseId
```

Mount in server/src/routes/index.ts.
Add Swagger JSDoc comments to every route.
Update context/api-endpoints.md with all five endpoints.

---

## Client files to create

### client/src/types/api.ts
Add to existing file:

```typescript
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW'
export type TestCaseType = 'POSITIVE' | 'NEGATIVE' | 'EDGE_CASE'
export type GeneratedBy = 'LLM' | 'MANUAL'

export type TestCase = {
  id: string
  featureId: string
  title: string
  priority: Priority
  testType: TestCaseType
  steps: string[]
  expectedResult: string
  preconditions?: string
  generatedBy: GeneratedBy
  createdAt: string
  updatedAt: string
}
```

### client/src/api/testcases.ts

```typescript
import apiClient from './client'
import { TestCase } from '@/types/api'

export const testCasesAPI = {
  async listTestCases(featureId: string): Promise<TestCase[]> {
    const res = await apiClient.get<{ testCases: TestCase[] }>(
      `/features/${featureId}/testcases`
    )
    return res.data.testCases
  },

  async createTestCase(
    featureId: string,
    data: {
      title: string
      priority?: Priority
      testType?: TestCaseType
      steps: string[]
      expectedResult: string
      preconditions?: string
    }
  ): Promise<TestCase> {
    const res = await apiClient.post<{ testCase: TestCase }>(
      `/features/${featureId}/testcases`,
      data
    )
    return res.data.testCase
  },

  async generateTestCases(featureId: string): Promise<TestCase[]> {
    const res = await apiClient.post<{ testCases: TestCase[] }>(
      `/features/${featureId}/testcases/generate`
    )
    return res.data.testCases
  },

  async updateTestCase(
    testCaseId: string,
    data: Partial<Omit<TestCase, 'id' | 'featureId' | 'createdAt' | 'updatedAt'>>
  ): Promise<TestCase> {
    const res = await apiClient.patch<{ testCase: TestCase }>(
      `/testcases/${testCaseId}`,
      data
    )
    return res.data.testCase
  },

  async deleteTestCase(testCaseId: string): Promise<void> {
    await apiClient.delete(`/testcases/${testCaseId}`)
  },
}
```

### client/src/store/testCaseStore.ts

```typescript
import { create } from 'zustand'
import { TestCase } from '@/types/api'
import { testCasesAPI } from '@/api/testcases'

interface TestCaseStore {
  testCases: TestCase[]
  loading: boolean
  generating: boolean
  error: string | null
  fetchTestCases(featureId: string): Promise<void>
  generateTestCases(featureId: string): Promise<TestCase[]>
  updateTestCase(testCaseId: string, data: Partial<TestCase>): Promise<void>
  deleteTestCase(testCaseId: string): Promise<void>
  clearTestCases(): void
}

export const useTestCaseStore = create<TestCaseStore>((set, get) => ({
  testCases: [],
  loading: false,
  generating: false,
  error: null,

  fetchTestCases: async (featureId) => {
    set({ loading: true, error: null })
    try {
      const testCases = await testCasesAPI.listTestCases(featureId)
      set({ testCases, loading: false })
    } catch {
      set({ error: 'Failed to load test cases', loading: false })
    }
  },

  generateTestCases: async (featureId) => {
    set({ generating: true, error: null })
    try {
      const testCases = await testCasesAPI.generateTestCases(featureId)
      set({ testCases, generating: false })
      return testCases
    } catch {
      set({ error: 'Failed to generate test cases', generating: false })
      return []
    }
  },

  updateTestCase: async (testCaseId, data) => {
    const updated = await testCasesAPI.updateTestCase(testCaseId, data)
    set(state => ({
      testCases: state.testCases.map(tc =>
        tc.id === testCaseId ? updated : tc
      )
    }))
  },

  deleteTestCase: async (testCaseId) => {
    await testCasesAPI.deleteTestCase(testCaseId)
    set(state => ({
      testCases: state.testCases.filter(tc => tc.id !== testCaseId)
    }))
  },

  clearTestCases: () => set({ testCases: [], error: null }),
}))
```

---

## Client files to update

### client/src/components/AddFeaturePanel.tsx
Add the Generate AI toggle below the feature type field.

New state variable:
```typescript
const [generateAI, setGenerateAI] = useState(false)
```

Add this block below the feature type select and before the panel footer:

```tsx
{/* Generate toggle */}
<div
  onClick={() => setGenerateAI(prev => !prev)}
  className={[
    'border-[1.5px] rounded-xl p-3.5 cursor-pointer transition-all select-none',
    generateAI
      ? 'border-[#4F46E5] bg-[#F5F4FD]'
      : 'border-[#D8D8D4] bg-white',
  ].join(' ')}
>
  <div className="flex items-center justify-between gap-3">
    <div className={`flex items-center gap-2 text-[13px] font-medium ${
      generateAI ? 'text-[#333]' : 'text-[#333]'
    }`}>
      <span className={generateAI ? 'opacity-100' : 'opacity-35'}>✦</span>
      Generate test cases with AI
    </div>
    {/* Toggle switch */}
    <div className={`w-[35px] h-[20px] rounded-full relative flex-shrink-0 transition-colors ${
      generateAI ? 'bg-[#4F46E5]' : 'bg-[#D0D0CC]'
    }`}>
      <div className={`w-[14px] h-[14px] bg-white rounded-full absolute top-[3px] transition-all shadow-sm ${
        generateAI ? 'left-[18px]' : 'left-[3px]'
      }`}/>
    </div>
  </div>
  <p className={`text-[12px] mt-1.5 leading-[1.5] ${
    generateAI ? 'text-[#6B64D0]' : 'text-[#888]'
  }`}>
    {generateAI
      ? 'AI will generate test cases using your template after adding this feature.'
      : 'Enable to automatically generate test cases using your template after adding this feature.'
    }
  </p>
</div>
```

Update handleCreate to pass generateAI back to the parent:
```typescript
// Change the onClose prop signature to also accept the new feature and generateAI flag
interface AddFeaturePanelProps {
  projectId: string
  open: boolean
  onClose: () => void
  onCreated: (feature: Feature, generateAI: boolean) => void
}

// In handleCreate, after successful creation:
onCreated(createdFeature, generateAI)
```

The submit button always says "Add Feature" regardless of toggle state:
```tsx
<button className="btn-p ...">Add Feature</button>
```

### client/src/pages/FeaturesPage.tsx
Update to handle the onCreated callback from AddFeaturePanel.

Add imports:
```typescript
import { useTestCaseStore } from '@/store/testCaseStore'
```

Add state:
```typescript
const [redirectingFeatureId, setRedirectingFeatureId] = useState<string | null>(null)
const { generateTestCases } = useTestCaseStore()
```

Replace onClose with onCreated handler:
```typescript
const handleFeatureCreated = async (feature: Feature, generateAI: boolean) => {
  setPanelOpen(false)

  if (generateAI) {
    // Redirect to test cases page — generation happens there
    navigate(`/projects/${projectId}/features/${feature.id}/testcases?generate=true`)
  } else {
    // Stay on features table — show toast
    setToastMessage(`Feature added — "${feature.name}"`)
    setToastVisible(true)
    // Refresh features list to show new row
    fetchFeatures(projectId!)
  }
}
```

Update the Generate button in the Actions column:
```tsx
<button
  onClick={e => {
    e.stopPropagation()
    navigate(`/projects/${projectId}/features/${feature.id}/testcases?generate=true`)
  }}
  className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border border-[#C4C2F4] bg-[#EEEDF8] text-[#4F46E5] cursor-pointer hover:bg-[#4F46E5] hover:text-white hover:border-[#4F46E5] transition-all h-[26px] font-sans whitespace-nowrap"
>
  ✦ Generate
</button>
```

Update row onClick to navigate to test cases:
```tsx
onClick={() => navigate(`/projects/${projectId}/features/${feature.id}/testcases`)}
```

### client/src/App.tsx
Add new route for test cases page:
```typescript
<Route
  path="/projects/:projectId/features/:featureId/testcases"
  element={
    <ProtectedRoute>
      <TestCasesPage />
    </ProtectedRoute>
  }
/>
```

---

### client/src/pages/TestCasesPage.tsx
New page. Route: /projects/:projectId/features/:featureId/testcases

This page is reached two ways:
1. After adding a feature with generate ON — URL has ?generate=true
2. By clicking a feature row in the features table

On mount behaviour:
```typescript
const { featureId, projectId } = useParams()
const [searchParams] = useSearchParams()
const shouldGenerate = searchParams.get('generate') === 'true'

useEffect(() => {
  if (shouldGenerate) {
    // Trigger generation immediately, then clear the query param
    generateTestCases(featureId!)
    navigate(location.pathname, { replace: true })
  } else {
    fetchTestCases(featureId!)
  }
}, [featureId])
```

Layout: use Layout component

Topbar:
- Breadcrumb: Projects › {project name} › Features › {feature name}
- Right side: Regenerate button (secondary) + Export CSV (secondary) + Add test case (primary)

Feature info bar (below topbar, above table):
- Feature name (bold, 14px)
- Type badge (New Feature / Bug)
- AI Generated pill with pulsing dot (only if testCases[0].generatedBy === 'LLM')
- Count: "X test cases"
- Project name + style (muted)

Generating state (when shouldGenerate is true and generating is true in store):
- Show a loading state in the table body: 3 skeleton rows with shimmer animation
- Small "Generating test cases with AI..." label above the table

Table columns:
- Test Case (title + TC-xxx id below)
- Priority (HIGH/MEDIUM/LOW badge)
- Type (Positive/Negative/Edge Case badge)
- Steps (first 3 steps shown, "+N more" link if more)
- Expected Result (truncated at 100 chars)
- Actions (Edit icon + Delete icon — always visible)

#### Inline edit behaviour
Clicking the Edit icon on a row:
- Sets editingId state to that test case's id
- The row renders all fields as inputs instead of text:
  - Title → text input (full width)
  - Priority → select dropdown
  - Type → select dropdown
  - Steps → textarea (newline separated)
  - Expected Result → textarea
- Show Save and Cancel buttons below the title input
- Row gets a light blue background (#FAFAFE)
- On Save: call testCaseStore.updateTestCase, clear editingId
- On Cancel: clear editingId, no changes saved
- Only one row can be edited at a time

#### Inline delete behaviour
Clicking the Delete icon on a row:
- Sets deletingId state to that test case's id
- That row is replaced by a single red-tinted confirmation row spanning all columns:
  ⚠ Delete "{title}"? This cannot be undone.  [Yes, delete]  [Cancel]
- On "Yes, delete": call testCaseStore.deleteTestCase, clear deletingId
- On "Cancel": clear deletingId, row returns to normal

#### Empty state (no test cases yet)
Centered card:
- Icon: ✓
- Title: "No test cases yet"
- Sub: "Generate them with AI or add them manually"
- Two buttons: "✦ Generate with AI" (primary) and "Add manually" (secondary)

#### Generating state
While generateTestCases is in progress:
- Show 3 skeleton rows in the table
- Show label "✦ Generating test cases..." above table with pulsing animation

---

## Priority and type badge colours

| Value | Background | Text |
|---|---|---|
| HIGH | #FEF2F2 | #DC2626 |
| MEDIUM | #FFFBEB | #B45309 |
| LOW | #F5F5F3 | #888888 |
| POSITIVE | #EFF6FF | #2563EB |
| NEGATIVE | #FEF2F2 | #DC2626 |
| EDGE_CASE | #F0FDF4 | #166534 |

---

## After building all files

Test this exact flow:

### Flow A — Generate ON
1. Go to /projects/:id/features
2. Click ＋ Add Feature
3. Fill in feature name and description
4. Toggle Generate AI on — confirm box turns indigo, text changes
5. Click Add Feature
6. Confirm you land on /projects/:id/features/:fid/testcases
7. Confirm skeleton loading rows appear briefly
8. Confirm test cases appear in the table after generation
9. Confirm AI Generated pill is visible in the feature bar
10. Confirm breadcrumb shows correct path

### Flow B — Generate OFF
1. Click ＋ Add Feature
2. Leave Generate AI toggle off
3. Click Add Feature
4. Confirm panel closes
5. Confirm you stay on the features table
6. Confirm green toast appears at top
7. Confirm new feature row is highlighted with ✦ Generate button

### Flow C — Generate from features table
1. Find a feature row with 0 test cases
2. Confirm ✦ Generate button is visible in Actions column
3. Click it — confirm you land on the test cases page with generation starting

### Flow D — Click feature row
1. Click any feature row (not the action buttons)
2. Confirm navigation to /projects/:id/features/:fid/testcases
3. Confirm existing test cases load and display correctly

### Flow E — Edit test case
1. On the test cases page, click ✏ on any row
2. Confirm row expands with editable inputs
3. Change the title
4. Click Save — confirm title updates in the table
5. Click ✏ again, make a change, click Cancel — confirm nothing changed

### Flow F — Delete test case
1. Click 🗑 on any row
2. Confirm the row becomes a red confirmation row
3. Click "Yes, delete" — confirm row disappears
4. Click 🗑 on another row, click "Cancel" — confirm row returns to normal

Open browser console after each flow — zero red errors.

## Do not
- Do not add any navigation or redirect text to the generate toggle
- Do not change the Add Feature button label in any scenario
- Do not modify any other pages
- Fix all TypeScript errors before confirming done
- Run migration SQL review before executing

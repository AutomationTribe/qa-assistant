# Phase 6 — Test Cases Table + AI Generate Flow (Updated)

## What we are building
1. TestCasesPage — expandable row table with Objective, Preconditions, and per-step Action/Test Data/Expected Result
2. AI generation — on feature create with generate ON, redirect to test cases page with all rows open in edit mode
3. Collapsible sidebar on test cases page
4. Inline delete confirmation
5. Save per row or Save all

## Reference design
ui/features-flow-v4-fixed.html — walk all 5 steps before writing any code

---

## Data shape

### TestCase.fieldValues stores all fields as a flat JSON object
The keys come from the project template. Standard keys the AI generates:

```json
{
  "name": "Successful login with valid credentials",
  "objective": "Verify a registered user can log in with valid credentials",
  "pre_conditions": "User registered with email: user@test.com | Password: Test@1234",
  "steps": [
    "Navigate to login page | URL: /auth/login | Login form displays",
    "Enter credentials and click Sign In | user@test.com / Test@1234 | User redirected to dashboard"
  ],
  "priority": "High"
}
```

Steps use pipe-separated format: `"Action | Test data | Expected result"`

### Template fields that map to the expanded row UI

| Template field key | UI section | Display |
|---|---|---|
| `name` / `test_title` | Row header (tc-title) | Read only in summary |
| `objective` | Top field left | Editable textarea |
| `pre_conditions` / `preconditions` | Top field right | Editable textarea |
| `steps` | Steps table | One row per step, split on pipe |
| `priority` | Summary badge | Editable select |

Any other template fields are shown below the steps table as generic textareas labelled with their field name.

---

## Database — no changes needed
TestCase.fieldValues: Json — already correct

---

## Server — no changes needed
listTestCases and generateTestCases already return { testCases, fields }

---

## Client files to create

### client/src/pages/TestCasesPage.tsx

#### Layout
```
<div style="display:flex;height:100vh;overflow:hidden">
  <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
  <main>
    <Topbar breadcrumb={...} actions={...} />
    <div className="content">
      {generating && <SkeletonRows />}
      {allEditMode && <ReviewBanner count={testCases.length} onSaveAll={handleSaveAll} />}
      <FeatureBar feature={feature} />
      <TestCasesTable ... />
    </div>
  </main>
</div>
```

#### Sidebar collapse state
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

Sidebar renders at `w-[208px]` expanded, `w-[48px]` collapsed.
When collapsed: show only icons, hide text labels, hide user name.
Collapse toggle button at the bottom of the sidebar with a `◀` icon
that rotates 180deg when collapsed (`transition-transform duration-200`).

#### On mount behaviour
```typescript
const shouldGenerate = searchParams.get('generate') === 'true'

useEffect(() => {
  if (!featureId) return
  if (shouldGenerate) {
    navigate(location.pathname, { replace: true })
    setAllEditMode(true)
    handleGenerate()
  } else {
    fetchTestCases(featureId)
  }
}, [featureId])
```

#### Edit state
```typescript
// allEditMode — all rows open (after AI generation)
const [allEditMode, setAllEditMode] = useState(false)

// expandedIds — set of row IDs currently expanded
// In allEditMode all are expanded. In normal mode user clicks to expand.
const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

// deletingId — which row is showing delete confirmation
const [deletingId, setDeletingId] = useState<string | null>(null)

// drafts — local edits keyed by testCase id, value is full fieldValues
const [drafts, setDrafts] = useState<Record<string, Record<string, any>>>({})
```

When allEditMode becomes true after generation, expand all rows
and pre-populate drafts:
```typescript
useEffect(() => {
  if (allEditMode && testCases.length > 0) {
    const ids = new Set(testCases.map(tc => tc.id))
    setExpandedIds(ids)
    const init: Record<string, Record<string, any>> = {}
    testCases.forEach(tc => { init[tc.id] = { ...tc.fieldValues } })
    setDrafts(init)
  }
}, [testCases, allEditMode])
```

#### Toggle row expand
```typescript
const toggleExpand = (id: string) => {
  if (allEditMode) return // in allEditMode all rows stay open
  setExpandedIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  // pre-populate draft when opening
  if (!expandedIds.has(id)) {
    const tc = testCases.find(t => t.id === id)
    if (tc) {
      setDrafts(prev => ({ ...prev, [id]: { ...tc.fieldValues } }))
    }
  }
}
```

#### Update draft field
```typescript
const updateDraft = (id: string, key: string, value: any) => {
  setDrafts(prev => ({
    ...prev,
    [id]: { ...(prev[id] || {}), [key]: value }
  }))
}
```

#### Update single step in draft
Steps are stored as an array. Updating one step:
```typescript
const updateStep = (id: string, stepIndex: number, part: 'action' | 'data' | 'expected', value: string) => {
  const draft = drafts[id] || testCases.find(tc => tc.id === id)?.fieldValues || {}
  const stepsKey = findStepsKey(fields)
  const steps: string[] = [...(draft[stepsKey] || [])]

  // Parse existing step or create new one
  const parts = (steps[stepIndex] || '').split('|').map(s => s.trim())
  while (parts.length < 3) parts.push('')

  if (part === 'action') parts[0] = value
  if (part === 'data') parts[1] = value
  if (part === 'expected') parts[2] = value

  steps[stepIndex] = parts.join(' | ')
  updateDraft(id, stepsKey, steps)
}
```

#### Add/remove step
```typescript
const addStep = (id: string) => {
  const draft = drafts[id] || {}
  const stepsKey = findStepsKey(fields)
  const steps = [...(draft[stepsKey] || []), ' | | ']
  updateDraft(id, stepsKey, steps)
}

const removeStep = (id: string, stepIndex: number) => {
  const draft = drafts[id] || {}
  const stepsKey = findStepsKey(fields)
  const steps = [...(draft[stepsKey] || [])]
  steps.splice(stepIndex, 1)
  updateDraft(id, stepsKey, steps)
}
```

#### Find field keys helper
```typescript
// Find the key used for steps field (type STEPS)
const findStepsKey = (fields: TestCaseField[]): string => {
  return fields.find(f => f.type === 'STEPS')?.key || 'steps'
}

// Find objective field key
const findObjectiveKey = (fields: TestCaseField[]): string | null => {
  return fields.find(f =>
    f.key.includes('objective') || f.key.includes('expected_result')
  )?.key || null
}

// Find preconditions field key
const findPreconditionsKey = (fields: TestCaseField[]): string | null => {
  return fields.find(f =>
    f.key.includes('precondition') || f.key.includes('pre_condition')
  )?.key || null
}

// Fields to exclude from the "other fields" section
// (already shown in the top section or steps)
const HANDLED_FIELD_TYPES = ['STEPS']
const getOtherFields = (fields: TestCaseField[]) => {
  const stepsKey = findStepsKey(fields)
  const objKey = findObjectiveKey(fields)
  const preKey = findPreconditionsKey(fields)
  const nameKey = fields.find(f =>
    f.key.includes('name') || f.key.includes('title')
  )?.key
  const priorityKey = fields.find(f => f.key.includes('priority'))?.key

  const excludedKeys = [stepsKey, objKey, preKey, nameKey, priorityKey].filter(Boolean)
  return fields.filter(f => !excludedKeys.includes(f.key))
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
    setExpandedIds(new Set())
    setDrafts({})
    toast.success('All test cases saved')
  } catch {
    toast.error('Failed to save. Please try again.')
  }
}
```

#### handleSaveOne
```typescript
const handleSaveOne = async (id: string) => {
  const draft = drafts[id]
  if (!draft) {
    setExpandedIds(prev => { const n = new Set(prev); n.delete(id); return n })
    return
  }
  try {
    await updateTestCase(id, draft)
    setExpandedIds(prev => { const n = new Set(prev); n.delete(id); return n })
    const next = { ...drafts }
    delete next[id]
    setDrafts(next)
    toast.success('Test case saved')
  } catch {
    toast.error('Failed to save test case')
  }
}
```

#### handleDelete
```typescript
const handleDelete = async (id: string) => {
  try {
    await deleteTestCase(id)
    setDeletingId(null)
    toast.success('Test case deleted')
  } catch {
    toast.error('Failed to delete')
  }
}
```

---

## TestCasesTable component structure

```tsx
<div className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden">
  {/* Header row */}
  <div className="grid grid-cols-[30px_1fr_75px_90px_72px] bg-[#FAFAF8] border-b">
    <div /> {/* chevron col */}
    <div className="th">Test case</div>
    <div className="th">Priority</div>
    <div className="th">Type</div>
    <div className="th text-right pr-3">Actions</div>
  </div>

  {testCases.map(tc => {
    const isExpanded = expandedIds.has(tc.id)
    const isDeleting = deletingId === tc.id
    const draft = drafts[tc.id] || tc.fieldValues

    if (isDeleting) return <DeleteConfirmRow key={tc.id} tc={tc} onConfirm={handleDelete} onCancel={() => setDeletingId(null)} />

    return (
      <div key={tc.id} className="border-b last:border-b-0">
        {/* Summary row */}
        <div
          className="grid grid-cols-[30px_1fr_75px_90px_72px] items-center cursor-pointer hover:bg-[#FAFAF9]"
          style={isExpanded ? { background: '#FAFAFE' } : {}}
          onClick={() => toggleExpand(tc.id)}
        >
          <div className={`tc-chev ${isExpanded ? 'open' : ''}`}>▶</div>
          <div className="p-3">
            <div className="text-[13px] font-medium text-[#111]">
              {draft[findNameKey(fields)] || 'Untitled test case'}
            </div>
            <div className="text-[10.5px] text-[#C0C0BC] font-mono mt-0.5">
              TC-{String(index + 1).padStart(3, '0')}
            </div>
          </div>
          <div className="p-3"><PriorityBadge value={draft[findPriorityKey(fields)]} /></div>
          <div className="p-3"><TypeBadge value={draft[findTypeKey(fields)]} /></div>
          <div className="p-3 flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
            <button onClick={() => setDeletingId(tc.id)} className="icon-btn danger">🗑</button>
          </div>
        </div>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="bg-[#FAFAFE] border-t border-[#EBEBEB] px-4 py-4 pl-10">

            {/* Objective + Preconditions */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {findObjectiveKey(fields) && (
                <div>
                  <label className="field-label">Objective</label>
                  <textarea
                    className="field-textarea"
                    value={draft[findObjectiveKey(fields)!] || ''}
                    onChange={e => updateDraft(tc.id, findObjectiveKey(fields)!, e.target.value)}
                  />
                </div>
              )}
              {findPreconditionsKey(fields) && (
                <div>
                  <label className="field-label">Preconditions</label>
                  <textarea
                    className="field-textarea"
                    value={draft[findPreconditionsKey(fields)!] || ''}
                    onChange={e => updateDraft(tc.id, findPreconditionsKey(fields)!, e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Steps divider */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-semibold text-[#888] uppercase tracking-wide">Test steps</span>
              <div className="flex-1 h-px bg-[#EBEBEB]" />
            </div>

            {/* Steps table */}
            <div className="bg-white border border-[#EBEBEB] rounded-[9px] overflow-hidden mb-3">
              {/* Steps table header */}
              <div className="grid grid-cols-[28px_1fr_1fr_1fr_28px] bg-[#F5F5F3] border-b border-[#EBEBEB]">
                <div className="step-th">#</div>
                <div className="step-th">Action</div>
                <div className="step-th">Test data</div>
                <div className="step-th">Expected result</div>
                <div />
              </div>

              {/* Step rows */}
              {parseSteps(draft[findStepsKey(fields)]).map((step, i) => (
                <div key={i} className="grid grid-cols-[28px_1fr_1fr_1fr_28px] border-b last:border-b-0">
                  <div className="step-num">{i + 1}</div>
                  <div className="step-cell">
                    <textarea
                      className="step-input"
                      value={step.action}
                      onChange={e => updateStep(tc.id, i, 'action', e.target.value)}
                    />
                  </div>
                  <div className="step-cell">
                    <textarea
                      className="step-input"
                      value={step.data}
                      onChange={e => updateStep(tc.id, i, 'data', e.target.value)}
                    />
                  </div>
                  <div className="step-cell">
                    <textarea
                      className="step-input"
                      value={step.expected}
                      onChange={e => updateStep(tc.id, i, 'expected', e.target.value)}
                    />
                  </div>
                  <div className="step-del border-l border-[#EBEBEB] flex items-start pt-2 justify-center">
                    <button onClick={() => removeStep(tc.id, i)} className="icon-btn danger small">✕</button>
                  </div>
                </div>
              ))}

              {/* Add step */}
              <div className="p-2 border-t border-[#EBEBEB]">
                <button onClick={() => addStep(tc.id)} className="add-step-btn">
                  ＋ Add step
                </button>
              </div>
            </div>

            {/* Other template fields (if any) */}
            {getOtherFields(fields).map(field => (
              <div key={field.key} className="mb-3">
                <label className="field-label">{field.name}</label>
                <textarea
                  className="field-textarea"
                  value={String(draft[field.key] || '')}
                  onChange={e => updateDraft(tc.id, field.key, e.target.value)}
                />
              </div>
            ))}

            {/* Row actions */}
            {!allEditMode && (
              <div className="flex gap-2 mt-1">
                <button onClick={() => handleSaveOne(tc.id)} className="btn-g text-[11.5px]">
                  ✓ Save
                </button>
                <button
                  onClick={() => {
                    setExpandedIds(prev => { const n = new Set(prev); n.delete(tc.id); return n })
                  }}
                  className="btn-s text-[11.5px]"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  })}

  {/* Pagination */}
  <div className="pagination">...</div>
</div>
```

#### parseSteps helper
Steps are stored as pipe-separated strings. Parse into objects:
```typescript
function parseSteps(raw: any): Array<{ action: string; data: string; expected: string }> {
  if (!raw) return [{ action: '', data: '', expected: '' }]

  const arr: string[] = Array.isArray(raw) ? raw : [String(raw)]

  return arr.map(s => {
    const parts = String(s || '').split('|').map(p => p.trim())
    return {
      action: parts[0] || '',
      data: parts[1] || '',
      expected: parts[2] || '',
    }
  })
}
```

---

## Topbar buttons

```tsx
<div className="topbar-right">
  {/* Save all — only visible in allEditMode */}
  {allEditMode && testCases.length > 0 && (
    <button onClick={handleSaveAll} className="btn-g">
      ✓ Save all
    </button>
  )}

  <button onClick={handleRegenerate} className="btn-s">
    ✦ Regenerate
  </button>

  {/* Zephyr export */}
  {zephyrConn ? (
    <button onClick={() => setExportModalOpen(true)} className="btn-s">
      ↗ Export to Zephyr
    </button>
  ) : (
    <button onClick={() => setZephyrSetupOpen(true)} className="btn-s text-[#888]">
      ⚙ Connect Zephyr
    </button>
  )}

  <button className="btn-p">＋ Add test case</button>
</div>
```

---

## AI review banner

Show when allEditMode is true and not generating:

```tsx
{allEditMode && !generating && testCases.length > 0 && (
  <div className="bg-[#F0EFFD] border border-[#C4C2F4] rounded-xl px-4 py-3 mb-3 flex items-center gap-3">
    <span className="text-[#4F46E5] text-[15px] flex-shrink-0">✦</span>
    <div className="flex-1">
      <div className="text-[13px] font-medium text-[#4F46E5]">
        {testCases.length} test cases generated — review and edit before saving
      </div>
      <div className="text-[12px] text-[#6B64D0] mt-0.5">
        All rows are open. Click Save all when done.
      </div>
    </div>
    <button onClick={handleSaveAll} className="btn-p flex-shrink-0 text-[12px]">
      Save all →
    </button>
  </div>
)}
```

---

## Generating skeleton

```tsx
{generating && (
  <div className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden">
    <div className="px-4 py-3 bg-[#FAFAF8] border-b flex items-center gap-2">
      <div className="w-3.5 h-3.5 border-2 border-[#EEEDF8] border-t-[#4F46E5] rounded-full animate-spin" />
      <span className="text-[12.5px] text-[#4F46E5] font-medium animate-pulse">
        Generating test cases with AI...
      </span>
    </div>
    {[1, 2, 3].map(i => (
      <div key={i} className="border-b last:border-b-0">
        <div className="grid grid-cols-[30px_1fr_75px_90px_72px] p-3 gap-3">
          <div className="h-3 w-3 rounded-full bg-[#F0F0ED] animate-pulse" />
          <div className="h-3 rounded bg-[#F0F0ED] animate-pulse w-2/3" />
          <div className="h-3 rounded bg-[#F0F0ED] animate-pulse w-10" />
          <div className="h-3 rounded bg-[#F0F0ED] animate-pulse w-14" />
          <div />
        </div>
      </div>
    ))}
  </div>
)}
```

---

## CSS to add to index.css or component styles

```css
.tc-chev {
  padding: 10px;
  text-align: center;
  font-size: 12px;
  color: #C0C0BC;
  transition: transform 0.2s;
  user-select: none;
}
.tc-chev.open {
  transform: rotate(90deg);
}
.field-label {
  font-size: 11px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: block;
  margin-bottom: 5px;
}
.field-textarea {
  width: 100%;
  border: 1px solid #DDDDD9;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12.5px;
  font-family: inherit;
  color: #111;
  background: #fff;
  resize: none;
  min-height: 64px;
  outline: none;
  line-height: 1.6;
}
.field-textarea:focus {
  border-color: #4F46E5;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.07);
}
.step-input {
  width: 100%;
  border: 1px solid #DDDDD9;
  border-radius: 7px;
  padding: 6px 8px;
  font-size: 12px;
  font-family: inherit;
  color: #111;
  background: #fff;
  resize: none;
  min-height: 52px;
  outline: none;
  line-height: 1.55;
}
.step-input:focus {
  border-color: #4F46E5;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.08);
}
.add-step-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #aaa;
  cursor: pointer;
  padding: 5px 8px;
  border-radius: 7px;
  border: 1.5px dashed #D8D8D4;
  background: transparent;
  font-family: inherit;
  transition: all 0.15s;
}
.add-step-btn:hover {
  border-color: #4F46E5;
  color: #4F46E5;
}
```

---

## App.tsx route

```typescript
<Route
  path="/projects/:projectId/features/:featureId/testcases"
  element={<ProtectedRoute><TestCasesPage /></ProtectedRoute>}
/>
```

---

## After building — test these flows

### Flow A — Generate ON (all rows open in edit mode)
1. Add a feature with Generate AI enabled
2. Confirm redirect to test cases page
3. Confirm AI review banner appears
4. Confirm ALL rows are expanded showing Objective, Preconditions, Steps
5. Confirm steps are split into Action | Test data | Expected result columns
6. Edit a step action, test data, and expected result
7. Edit the objective field
8. Click Save all
9. Confirm toast: "All test cases saved"
10. Confirm rows collapse to read mode

### Flow B — Normal browsing (click to expand)
1. Click a feature row from the features table
2. Confirm test cases table loads in read mode (all collapsed)
3. Click a row chevron — confirm it expands showing all fields
4. Edit objective textarea — confirm text updates
5. Edit step 2 test data — confirm updates
6. Add a new step — confirm new empty row appears
7. Remove a step — confirm row disappears
8. Click Save — confirm toast and row collapses
9. Expand again — confirm saved values persist

### Flow C — Delete
1. Click 🗑 on any row
2. Confirm the row is replaced by a red confirmation row
3. Click "Yes, delete" — confirm row disappears and toast shows
4. Click 🗑 on another, click Cancel — confirm row returns to normal

### Flow D — Sidebar collapse
1. Click ◀ Collapse at the bottom of the sidebar
2. Confirm sidebar shrinks to icon-only 48px
3. Confirm test case table is noticeably wider
4. Confirm state persists on page refresh (localStorage)
5. Click again — confirm sidebar expands

### Flow E — Empty state
1. Navigate to a feature with no test cases
2. Confirm empty state with Generate and Add manually buttons
3. Click Generate — confirm generation starts

Fix all TypeScript errors before confirming done.
Do not modify any server files — only client files.

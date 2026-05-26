# Fix 22 — Project Name in Add Feature + Duplicate Test Cases on Refresh

## Two bugs to fix

### Bug 1 — Project ID showing in Add Feature dropdown
The project select is displaying project.id instead of project.name.

### Bug 2 — Duplicate test cases generated on page refresh
When the test cases page loads with ?generate=true and the user
refreshes, generation runs again creating duplicate test cases.

---

## Fix 1 — client/src/components/AddFeaturePanel.tsx

Find the project select/display and ensure it shows project.name.

If using a select element, fix the option labels:

```tsx
// WRONG — shows ID
<option value={project.id}>{project.id}</option>

// CORRECT — shows name
<option value={project.id}>{project.name}</option>
```

If using a read-only display (since project is passed as a prop),
find where the project is displayed and use project.name:

```tsx
// Find the project store and get the project name
const { projects } = useProjectStore()
const currentProject = projects.find(p => p.id === projectId)

// Display:
<div className="...">
  {currentProject?.name || 'Current project'}
</div>
```

If the panel receives projectId as a prop, look up the name:

```typescript
// In the component
const { projects } = useProjectStore()
const projectName = projects.find(p => p.id === projectId)?.name || projectId
```

Then render projectName wherever the project is displayed in the form.

---

## Fix 2 — Duplicate test cases on refresh

### Root cause
The ?generate=true query param persists in the URL after page load.
When user refreshes, React re-mounts the component, useEffect fires
again, sees ?generate=true, and calls generateTestCases() again.
This creates a second set of test cases on top of the first.

### Fix A — client/src/pages/TestCasesPage.tsx

The URL must be cleared SYNCHRONOUSLY before any async work begins.
Also check if test cases already exist before generating.

Replace the useEffect that handles generation:

```typescript
useEffect(() => {
  if (!featureId) return

  const shouldGenerate = searchParams.get('generate') === 'true'

  if (shouldGenerate) {
    // Clear the query param IMMEDIATELY — synchronous, before any async call
    // This means even if the user refreshes mid-generation, the param is gone
    setSearchParams({}, { replace: true })

    // Check if test cases already exist for this feature
    // If they do, just load them — do not regenerate
    fetchTestCases(featureId).then(() => {
      // fetchTestCases updates the store — check count after
      const existingCount = useTestCaseStore.getState().testCases.length
      if (existingCount > 0) {
        // Test cases already exist — show them in edit mode for review
        // but do NOT generate new ones
        setAllEditMode(true)
        const init: Record<string, Record<string, any>> = {}
        useTestCaseStore.getState().testCases.forEach(tc => {
          init[tc.id] = { ...tc.fieldValues }
        })
        setDrafts(init)
        const ids = new Set(useTestCaseStore.getState().testCases.map(tc => tc.id))
        setExpandedIds(ids)
      } else {
        // No test cases yet — run generation
        setAllEditMode(true)
        handleGenerate()
      }
    })
  } else {
    fetchTestCases(featureId)
  }
}, [featureId])
```

Note: the key change is `setSearchParams({}, { replace: true })` runs
BEFORE the async operations. On refresh the component remounts but
searchParams.get('generate') will now be null immediately.

### Fix B — server/src/services/testCaseService.ts

Add a server-side guard. Before generating, check if test cases
already exist. If they do, return them instead of generating new ones:

```typescript
async generateTestCases(featureId: string, workspaceId: string) {
  // ... existing ownership check ...

  // Guard: if test cases already exist, return them
  // This prevents duplicates if the client calls generate twice
  const existing = await prisma.testCase.findMany({
    where: { featureId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  })

  if (existing.length > 0) {
    console.log(`[Generate] Feature ${featureId} already has ${existing.length} test cases — skipping generation`)
    return {
      testCases: existing,
      fields: feature.project.template?.fields ?? [],
      alreadyExisted: true,
    }
  }

  // ... rest of existing generation logic unchanged ...
}
```

Update the controller to handle the alreadyExisted flag:

```typescript
// server/src/controllers/testCaseController.ts
generate: async (req, res, next) => {
  try {
    const { featureId } = req.params
    const result = await testCaseService.generateTestCases(
      featureId,
      req.user!.workspaceId
    )
    return res.json({
      testCases: result.testCases,
      fields: result.fields,
      count: result.testCases.length,
      alreadyExisted: result.alreadyExisted || false,
    })
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

Update the client store to handle alreadyExisted:

```typescript
// client/src/store/testCaseStore.ts
generateTestCases: async (featureId) => {
  set({ generating: true, error: null })
  try {
    const { testCases, fields, alreadyExisted } = await testCasesAPI.generateTestCases(featureId)
    set({ testCases, fields, generating: false })
    return { testCases, fields, alreadyExisted: alreadyExisted || false }
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message || 'Generation failed'
    set({ error: msg, generating: false })
    throw err
  }
},
```

Update the return type in client/src/api/testcases.ts:

```typescript
async generateTestCases(featureId: string): Promise<{
  testCases: TestCase[]
  fields: TestCaseField[]
  count: number
  alreadyExisted: boolean
}> {
  const res = await apiClient.post(
    `/features/${featureId}/testcases/generate`
  )
  return res.data
},
```

Update handleGenerate in TestCasesPage to use alreadyExisted:

```typescript
const handleGenerate = async () => {
  if (!featureId) return
  setAllEditMode(true)
  try {
    const { testCases: generated, alreadyExisted } = await generateTestCases(featureId)

    if (alreadyExisted) {
      toast.info('Test cases already generated — showing existing ones')
    } else {
      toast.success(`${generated.length} test cases generated — review and save`)
    }

    // Pre-populate drafts regardless
    const init: Record<string, Record<string, any>> = {}
    generated.forEach(tc => { init[tc.id] = { ...tc.fieldValues } })
    setDrafts(init)
    const ids = new Set(generated.map(tc => tc.id))
    setExpandedIds(ids)

  } catch (err: any) {
    setAllEditMode(false)
    toast.error(
      err?.response?.data?.error?.message || 'Generation failed. Please try again.'
    )
  }
}
```

---

## After applying

### Test Bug 1 — Project name
1. Open Add Feature panel
2. Confirm project dropdown or display shows "Mobile App v4" not a UUID

### Test Bug 2 — No duplicates on refresh
1. Add a feature with Generate AI enabled
2. Land on test cases page — 5 test cases generated
3. Refresh the page
4. Confirm still 5 test cases — no duplicates added
5. Refresh again — still 5, no duplicates
6. Check database — confirm no duplicate test cases for this feature

### Test — generate called twice quickly
1. In browser dev tools, call the generate API twice for the same feature
2. Second call should return alreadyExisted: true
3. Total test cases in DB should still match the first generation count

Do not modify any other files.
Fix all TypeScript errors before confirming done.

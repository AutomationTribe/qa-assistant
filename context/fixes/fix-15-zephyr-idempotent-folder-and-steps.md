# Fix 15 — Zephyr: Idempotent Subfolder + Fix Steps Export

## Two problems

### Problem 1 — Subfolder not reused on re-export
Every export creates a new subfolder even if one already exists
with the same feature name under the same parent. Fix: search
for existing subfolder first, create only if not found.

### Problem 2 — Test steps not appearing in Zephyr
Steps are in fieldValues but not reaching Zephyr's testScript.
Root cause: the steps field key in fieldMapping may not match
the actual key in fieldValues, OR the steps value is not a
plain array of strings — it may be a stringified array or
an array of objects.

---

## Fix in server/src/services/zephyrService.ts

### Replace createOrGetFolder entirely

This version always searches first before creating:

```typescript
async createOrGetFolder(
  apiToken: string,
  jiraProjectKey: string,
  folderName: string,
  parentId?: number | null
): Promise<number | null> {
  try {
    // Step 1 — search for existing folder with same name + parent
    const searchRes = await axios.get(
      `${ZEPHYR_BASE}/folders?projectKey=${jiraProjectKey}&folderType=TEST_CASE&maxResults=200`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
        validateStatus: () => true,
      }
    )

    if (searchRes.status === 200) {
      const folders: any[] = searchRes.data?.values || []

      // Match by name AND parentId
      const existing = folders.find(f => {
        const nameMatch = f.name === folderName
        const parentMatch = parentId
          ? f.parentId === parentId
          : !f.parentId  // root level if no parent specified
        return nameMatch && parentMatch
      })

      if (existing) {
        console.log(`[Zephyr] Reusing existing folder: "${folderName}" (id: ${existing.id})`)
        return existing.id as number
      }
    }

    // Step 2 — folder not found, create it
    const body: Record<string, any> = {
      projectKey: jiraProjectKey,
      name: folderName,
      folderType: 'TEST_CASE',
    }
    if (parentId) {
      body.parentId = parentId
    }

    const createRes = await axios.post(
      `${ZEPHYR_BASE}/folders`,
      body,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
        validateStatus: () => true,
      }
    )

    if (createRes.status === 201 || createRes.status === 200) {
      console.log(`[Zephyr] Created folder: "${folderName}" (id: ${createRes.data.id})`)
      return createRes.data.id as number
    }

    console.log('[Zephyr] Folder create failed:', createRes.status, createRes.data)
    return null

  } catch (err: any) {
    console.error('[Zephyr] createOrGetFolder error:', err.message)
    return null
  }
}
```

### Replace the steps building block in exportTestCases

Find the section that builds `stepsArray` and `zephyrSteps` and
replace it entirely with this:

```typescript
// ── Build steps array ──────────────────────────────────────
const rawSteps = mapping.steps ? fv[mapping.steps] : null

console.log('[Zephyr] raw steps value:', JSON.stringify(rawSteps))
console.log('[Zephyr] steps field key:', mapping.steps)
console.log('[Zephyr] fieldValues keys:', Object.keys(fv))

let stepsArray: string[] = []

if (Array.isArray(rawSteps)) {
  // Normal case — array of strings or array of objects
  stepsArray = rawSteps
    .map(s => {
      if (typeof s === 'string') return s.trim()
      if (typeof s === 'object' && s !== null) {
        // Could be { description: '...' } or { text: '...' } or { step: '...' }
        return String(
          s.description || s.text || s.step || s.action ||
          Object.values(s)[0] || ''
        ).trim()
      }
      return String(s || '').trim()
    })
    .filter(s => s.length > 0)

} else if (typeof rawSteps === 'string' && rawSteps.trim()) {
  // Could be a JSON stringified array
  try {
    const parsed = JSON.parse(rawSteps)
    if (Array.isArray(parsed)) {
      stepsArray = parsed
        .map(s => String(s || '').trim())
        .filter(s => s.length > 0)
    } else {
      // Plain string with newlines
      stepsArray = rawSteps
        .split('\n')
        .map(s => s.replace(/^\d+[\.\)]\s*/, '').trim())
        .filter(s => s.length > 0)
    }
  } catch {
    // Not JSON — treat as newline-separated plain text
    stepsArray = rawSteps
      .split('\n')
      .map(s => s.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter(s => s.length > 0)
  }
}

console.log('[Zephyr] parsed stepsArray:', stepsArray)

// Fallback — if no steps found at all, use objective as single step
if (stepsArray.length === 0 && objective) {
  stepsArray = [String(objective)]
}

// Build Zephyr step objects
// description = the action the tester performs
// expectedResult = what should happen (only on last step)
const zephyrSteps = stepsArray.map((stepText, i) => ({
  description: stepText,
  expectedResult: i === stepsArray.length - 1
    ? String(objective || '')
    : '',
}))

console.log('[Zephyr] zephyrSteps to send:', JSON.stringify(zephyrSteps))
// ── End steps ──────────────────────────────────────────────
```

### Also fix the testScript body to use PLAIN_TEXT type

Zephyr Scale requires the correct `type` for test scripts.
Some projects only accept `PLAIN_TEXT` not `STEP_BY_STEP`.
Update the axios.post body to try `STEP_BY_STEP` first and
add a comment noting the fallback:

```typescript
const body: Record<string, any> = {
  projectKey: jiraProjectKey,
  name: String(name),
  objective: String(objective),
  precondition: String(precondition),
  testScript: {
    type: 'STEP_BY_STEP',
    steps: zephyrSteps,
  },
  statusName: 'Draft',
  labels: ['regi-generated'],
}
```

If after the fix steps still do not appear in Zephyr,
update to use `BDD` or `PLAIN_TEXT`:
```typescript
testScript: {
  type: 'PLAIN_TEXT',
  text: stepsArray.map((s, i) => `${i + 1}. ${s}`).join('\n'),
},
```

---

## After applying

### Step 1 — Check the debug logs
Restart server and run an export. In the server terminal you
will see logs like:

```
[Zephyr] steps field key: test_steps
[Zephyr] raw steps value: ["Navigate to login","Enter credentials","Click submit"]
[Zephyr] parsed stepsArray: ["Navigate to login","Enter credentials","Click submit"]
[Zephyr] zephyrSteps to send: [{"description":"Navigate to login","expectedResult":""},...]
[Zephyr] Created folder: "User can log in" (id: 12345)
```

If `raw steps value` shows `null` — the field key in the mapping
is wrong. Check what keys are in `fieldValues keys` log and
update the fieldMapping in the Zephyr connection to use the
correct key.

If `raw steps value` shows the steps correctly but they still
do not appear in Zephyr — switch to `PLAIN_TEXT` type.

### Step 2 — Test idempotent folder
1. Export a feature to Zephyr — confirm folder created
2. Export the same feature again — server log should show
   "Reusing existing folder" not "Created folder"
3. Open Zephyr Scale — confirm test cases accumulate in the
   same folder, no duplicate folders created

### Step 3 — Verify steps in Zephyr
1. Open Zephyr Scale → HPC project → Test Cases
2. Click any exported test case
3. Click the "Test Script" tab
4. Confirm steps appear as numbered items

Do not modify any other files.
Fix all TypeScript errors before confirming done.

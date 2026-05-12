# Fix 16 — Zephyr Steps: Use Dedicated Test Steps Endpoint

## Root cause
Zephyr Scale Cloud API does not reliably save steps via the
testScript field on POST /v2/testcases. Steps must be added
via a separate call to:

POST /v2/testcases/{testCaseKey}/teststeps

This is a two-call process per test case:
1. POST /v2/testcases → creates the test case, returns key e.g. HPC-T5
2. POST /v2/testcases/HPC-T5/teststeps → adds each step

---

## Fix in server/src/services/zephyrService.ts

### Step 1 — Remove testScript from the create payload

In the exportTestCases function, update the test case creation
body to remove testScript entirely:

```typescript
const body: Record<string, any> = {
  projectKey: jiraProjectKey,
  name: String(name),
  objective: String(objective),
  precondition: String(precondition),
  statusName: 'Draft',
  labels: ['regi-generated'],
}

// Add folder if available
if (folderId) {
  body.folderId = folderId
}

// Add priority if mapped
if (mappedPriority) {
  body.priorityName = mappedPriority
}
```

### Step 2 — Add steps via teststeps endpoint after creation

After the successful POST /v2/testcases call, add each step
using the returned testCaseKey:

```typescript
const response = await axios.post(
  `${ZEPHYR_BASE}/testcases`,
  body,
  {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  }
)

const zephyrKey: string = response.data.key   // e.g. "HPC-T5"
const zephyrId: number = response.data.id

// Now add steps via the dedicated endpoint
if (zephyrSteps.length > 0) {
  await addTestSteps(apiToken, zephyrKey, zephyrSteps)
}

// Save Zephyr identifiers back to the test case
await prisma.testCase.update({
  where: { id: tc.id },
  data: { zephyrKey, zephyrId },
})

results.push({ testCaseId: tc.id, zephyrKey, success: true })
```

### Step 3 — Add addTestSteps helper function

Add this function to zephyrService:

```typescript
async addTestSteps(
  apiToken: string,
  testCaseKey: string,
  steps: Array<{ description: string; expectedResult: string }>
): Promise<void> {
  // Zephyr teststeps endpoint expects steps one at a time
  // OR as a bulk array — try bulk first
  try {
    // Build the steps payload
    // Each step: { inline: { description, testData, expectedResult } }
    const stepsPayload = steps.map((step, index) => ({
      inline: {
        description: step.description,
        testData: '',
        expectedResult: step.expectedResult || '',
      },
    }))

    const response = await axios.post(
      `${ZEPHYR_BASE}/testcases/${testCaseKey}/teststeps`,
      stepsPayload,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
        validateStatus: () => true,
      }
    )

    if (response.status === 200 || response.status === 201) {
      console.log(`[Zephyr] Added ${steps.length} steps to ${testCaseKey}`)
      return
    }

    console.log(
      `[Zephyr] Bulk steps failed (${response.status}):`,
      JSON.stringify(response.data).slice(0, 200)
    )

    // Fallback — add steps one by one
    for (const step of stepsPayload) {
      const singleRes = await axios.post(
        `${ZEPHYR_BASE}/testcases/${testCaseKey}/teststeps`,
        step,
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
          validateStatus: () => true,
        }
      )
      console.log(
        `[Zephyr] Single step result for ${testCaseKey}:`,
        singleRes.status,
        JSON.stringify(singleRes.data).slice(0, 100)
      )
    }

  } catch (err: any) {
    // Steps failed — log but do not fail the whole export
    // The test case is already created, steps can be added manually
    console.error(
      `[Zephyr] Failed to add steps to ${testCaseKey}:`,
      err.message
    )
  }
}
```

Note: addTestSteps is called with await but errors are caught
internally — a steps failure does not fail the whole test case
export. The test case will exist in Zephyr even if steps fail.

### Step 4 — Update the for loop to call addTestSteps

The full updated try block inside the for loop:

```typescript
try {
  // Create test case
  const response = await axios.post(
    `${ZEPHYR_BASE}/testcases`,
    body,
    {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  )

  const zephyrKey: string = response.data.key
  const zephyrId: number = response.data.id

  console.log(`[Zephyr] Created test case: ${zephyrKey}`)

  // Add steps via dedicated endpoint
  if (zephyrSteps.length > 0) {
    await this.addTestSteps(apiToken, zephyrKey, zephyrSteps)
  }

  // Persist Zephyr identifiers
  await prisma.testCase.update({
    where: { id: tc.id },
    data: { zephyrKey, zephyrId },
  })

  results.push({ testCaseId: tc.id, zephyrKey, success: true })

} catch (err: any) {
  const msg =
    err?.response?.data?.message ||
    err?.response?.data?.errorMessage ||
    err.message ||
    'Unknown error'
  console.error(`[Zephyr] Export failed for test case ${tc.id}:`, msg)
  results.push({
    testCaseId: tc.id,
    zephyrKey: '',
    success: false,
    error: msg,
  })
}
```

---

## After applying the fix

### Test
1. First delete any test cases already exported to Zephyr in the
   HPC project so you start clean
2. Restart server
3. Run export for a feature with test cases that have steps
4. Watch server terminal for these logs in order:
   ```
   [Zephyr] Reusing existing folder / Created folder: "..."
   [Zephyr] Created test case: HPC-T5
   [Zephyr] Added 3 steps to HPC-T5
   [Zephyr] Created test case: HPC-T6
   [Zephyr] Added 3 steps to HPC-T6
   ```
5. Open Zephyr Scale → HPC project → Test Cases
6. Click a test case → click the Test Script tab
7. Confirm steps appear as a numbered list

### If bulk steps fail and fallback runs
The logs will show:
```
[Zephyr] Bulk steps failed (400): ...
[Zephyr] Single step result for HPC-T5: 200 ...
```
This is fine — steps will still be added, just one at a time.

### If steps still do not appear
Paste the full [Zephyr] log output including the single step
result lines. The response body will tell us what format
Zephyr expects for this project's test script type.

Do not modify any other files.
Fix all TypeScript errors before confirming done.

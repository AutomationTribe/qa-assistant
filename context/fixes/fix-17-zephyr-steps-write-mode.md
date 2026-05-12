# Fix 17 — Zephyr Steps: Add mode=OVERWRITE query parameter

## Root cause
The teststeps endpoint requires a write mode query parameter.
Error: "Invalid test step write mode [STEP_BY_STEP]. Valid values: [APPEND, OVERWRITE]"

The URL must include ?mode=OVERWRITE (first export) or ?mode=APPEND
(subsequent exports). We use OVERWRITE since we always send all steps.

## Fix in server/src/services/zephyrService.ts

### Update addTestSteps — add mode to URL and fix payload format

Replace the entire addTestSteps function:

```typescript
async addTestSteps(
  apiToken: string,
  testCaseKey: string,
  steps: Array<{ description: string; expectedResult: string }>
): Promise<void> {
  if (steps.length === 0) return

  try {
    // OVERWRITE replaces any existing steps — correct for fresh exports
    // Payload is a plain array of step objects (not wrapped in { inline: ... })
    const response = await axios.post(
      `${ZEPHYR_BASE}/testcases/${testCaseKey}/teststeps?mode=OVERWRITE`,
      steps.map(step => ({
        inline: {
          description: step.description,
          testData: '',
          expectedResult: step.expectedResult || '',
        },
      })),
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
      `[Zephyr] Steps failed (${response.status}):`,
      JSON.stringify(response.data).slice(0, 300)
    )

  } catch (err: any) {
    console.error(`[Zephyr] addTestSteps error for ${testCaseKey}:`, err.message)
  }
}
```

## After applying

Restart server then run the export again.
Server terminal should show:

```
[Zephyr] Created test case: HPC-T1201
[Zephyr] Added 6 steps to HPC-T1201
```

Then open Zephyr Scale → HPC → Test Cases → click the test case
→ Test Script tab → steps should appear as a numbered list.

Only touch server/src/services/zephyrService.ts.

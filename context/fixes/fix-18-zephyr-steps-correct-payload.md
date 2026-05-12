# Fix 18 — Zephyr Steps: Correct Payload Format

## What was wrong
The teststeps endpoint requires:
- mode IN the request body (not query string)
- items as the array key (not steps)
- Each step wrapped in { inline: { description, testData, expectedResult } }

Confirmed working format via curl:
POST /v2/testcases/{key}/teststeps
Body: { "mode": "OVERWRITE", "items": [{ "inline": { "description": "...", "testData": "", "expectedResult": "..." } }] }
Response: { "id": 539160240, "self": "..." }

## Fix in server/src/services/zephyrService.ts

Replace the entire addTestSteps function with this:

```typescript
async addTestSteps(
  apiToken: string,
  testCaseKey: string,
  steps: Array<{ description: string; expectedResult: string }>
): Promise<void> {
  if (steps.length === 0) return

  try {
    const payload = {
      mode: 'OVERWRITE',
      items: steps.map(step => ({
        inline: {
          description: step.description,
          testData: '',
          expectedResult: step.expectedResult || '',
        },
      })),
    }

    const response = await axios.post(
      `${ZEPHYR_BASE}/testcases/${testCaseKey}/teststeps`,
      payload,
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
    } else {
      console.log(
        `[Zephyr] Steps failed (${response.status}):`,
        JSON.stringify(response.data).slice(0, 300)
      )
    }
  } catch (err: any) {
    console.error(`[Zephyr] addTestSteps error for ${testCaseKey}:`, err.message)
  }
}
```

## After applying

Restart server then run the export.
Server terminal should show:
```
[Zephyr] Created test case: HPC-T1201
[Zephyr] Added 6 steps to HPC-T1201
```

Open Zephyr Scale → HPC → Test Cases → click test case →
Test Script tab → steps appear as a numbered list.

Only touch server/src/services/zephyrService.ts.
Fix all TypeScript errors before confirming done.

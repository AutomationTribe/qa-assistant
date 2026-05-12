# Fix 19 — Structured Steps: Action | Data | Expected per Step

## What this does
Updates the AI prompt to generate steps in pipe-separated format:
"Action | Test Data | Expected Result"

Updates addTestSteps to split each step on | and map to
Zephyr's three columns: description, testData, expectedResult.

No template field changes needed — the existing STEPS field
stores the array, each item is now a pipe-separated string.

---

## Part 1 — Update AI prompt

### server/src/services/llm/prompts.ts

Find the systemPrompt in buildTestCaseGenerationPrompt.
Locate the section that describes how to format STEPS fields.

Add this instruction to the systemPrompt after the field definitions:

```typescript
// Find this line in systemPrompt:
// "For STEPS fields: return an array of strings, one step per item."
// Replace it with:

`For STEPS fields: return an array of strings, one string per step.
Each step string MUST use this exact pipe-separated format:
  "Action description | Test data used | Expected result"

Rules:
- Action: what the tester does. Start with a verb. e.g. "Enter email address"
- Test data: specific data used in this step. e.g. "test@example.com"
  If no specific data is needed for a step, use an empty string between pipes: "Action | | Expected"
- Expected result: what should happen after this step. 
  If no specific expected result for this step, use empty string: "Action | data | "
  The LAST step must always have a meaningful expected result.

Example steps array for a login feature:
[
  "Navigate to the application login page | URL: /auth/login | Login form is displayed with email and password fields",
  "Enter a valid email address | Email: user@example.com | Email field is populated",
  "Enter a valid password | Password: Test@123 | Password field shows masked characters",
  "Click the Sign In button | | User is redirected to the dashboard with a welcome message"
]`
```

The full updated systemPrompt section should look like:

```typescript
const systemPrompt = `You are a senior QA engineer generating structured test cases.

Return ONLY a valid JSON array. No markdown, no explanation, no preamble, no code fences.
The array must contain between 4 and 8 test case objects.

Each object must have exactly these keys:
${fields.map(f => `"${f.key}"`).join(', ')}

Field definitions:
${fieldSchema}

Test case style: ${style}
Generate a mix of positive, negative, and edge case scenarios.

For STEPS fields: return an array of strings, one string per step.
Each step MUST use pipe-separated format: "Action | Test data | Expected result"
- Action: what the tester does, starting with a verb
- Test data: specific values used (email, password, URL, etc.) Leave empty if none: "Action | | Expected"  
- Expected result: what should happen. Last step must always have a result.

Example steps:
[
  "Navigate to the login page | URL: /auth/login | Login page loads with email and password fields visible",
  "Enter email address | Email: testuser@example.com | Email field is populated with the entered value",
  "Enter password | Password: Test@1234 | Password is masked in the field",
  "Click Sign In button | | User is redirected to dashboard and welcome message is displayed"
]

For SELECT fields: return exactly one of the allowed values.
For BOOLEAN fields: return true or false.
For NUMBER fields: return a number.
For all other fields: return a string.`
```

---

## Part 2 — Update addTestSteps to parse pipe format

### server/src/services/zephyrService.ts

Replace the entire addTestSteps function:

```typescript
async addTestSteps(
  apiToken: string,
  testCaseKey: string,
  steps: Array<{ description: string; expectedResult: string }>
): Promise<void> {
  if (steps.length === 0) return

  try {
    // Parse pipe-separated format: "Action | Test data | Expected result"
    const items = steps.map(step => {
      const raw = step.description || ''

      if (raw.includes('|')) {
        const parts = raw.split('|').map(s => s.trim())
        return {
          inline: {
            description: parts[0] || '',
            testData: parts[1] || '',
            expectedResult: parts[2] || step.expectedResult || '',
          },
        }
      }

      // No pipe — use as plain description with expectedResult from export
      return {
        inline: {
          description: raw,
          testData: '',
          expectedResult: step.expectedResult || '',
        },
      }
    })

    console.log(`[Zephyr] Sending ${items.length} steps to ${testCaseKey}:`)
    items.forEach((item, i) => {
      console.log(`  Step ${i + 1}:`, JSON.stringify(item.inline))
    })

    const payload = {
      mode: 'OVERWRITE',
      items,
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
      console.log(`[Zephyr] ✓ Added ${items.length} steps to ${testCaseKey}`)
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

---

## Part 3 — Update template field description

### In the project template builder
Update the description of the Steps field so the AI understands
the expected format. This is stored in TestCaseField.description.

Run this SQL to update existing template fields named steps/test_steps:

```sql
UPDATE TestCaseField
SET description = 'Write each step in pipe-separated format: "Action | Test data | Expected result". Example: "Enter email address | user@example.com | Email field is populated". Use empty string between pipes if no data or expected result for a step.'
WHERE key IN ('steps', 'test_steps')
  AND type = 'STEPS';
```

Or do it via the template builder UI:
1. Go to the project template page
2. Edit the Steps field
3. Update its description to:
   "Each step: Action | Test data | Expected result. Example: Navigate to login page | URL: /login | Login form displays"

---

## How it maps to Zephyr

Given AI generates:
```json
[
  "Navigate to institution management | URL: /admin/institutions | Institution list page loads",
  "Click Create New Institution | | Create institution form opens",
  "Enter duplicate email | Email: existing@org.com | Email field is populated",
  "Submit the form | | Validation error displayed: Email already registered"
]
```

Zephyr Test Script tab shows:

| # | Step | Data | Expected Result |
|---|---|---|---|
| 1 | Navigate to institution management | URL: /admin/institutions | Institution list page loads |
| 2 | Click Create New Institution | | Create institution form opens |
| 3 | Enter duplicate email | Email: existing@org.com | Email field is populated |
| 4 | Submit the form | | Validation error displayed: Email already registered |

---

## After applying

1. Restart server
2. Delete existing test cases for a feature in Regi
3. Regenerate test cases with AI
4. Confirm steps in Regi show pipe-separated format:
   "Navigate to login | URL: /login | Login page displays"
5. Export to Zephyr
6. Open Zephyr Scale → HPC → Test Cases → click test case
7. Click Test Script tab
8. Confirm three columns are populated: Step, Data, Expected Result

If AI generates steps WITHOUT the pipe format on first generation:
- Update the template field description via the UI
- Regenerate — the description is passed to the AI in the prompt
  so it will follow the new format

Only touch:
- server/src/services/llm/prompts.ts
- server/src/services/zephyrService.ts

Fix all TypeScript errors before confirming done.

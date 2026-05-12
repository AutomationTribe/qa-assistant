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

  const featureType = feature.type === 'NEW_FEATURE' ? 'New Feature' : 'Bug'

  const userPrompt = `Generate test cases for this feature:

Feature: ${feature.name}
Type: ${featureType}
${feature.description ? `Description: ${feature.description}` : ''}

Return only the JSON array.`

  return { systemPrompt, userPrompt }
}

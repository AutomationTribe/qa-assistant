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

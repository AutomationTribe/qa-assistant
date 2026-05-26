import { TestCaseField } from '@prisma/client'

export type ApiEndpoint = {
  id: string
  apiType: 'REST' | 'GRAPHQL' | 'WEBSOCKET'
  method: string
  path: string
  requestBody?: string
  expectedResponse?: string
  authRequired: boolean
  authType?: string
  notes?: string
}

export function buildTestCaseGenerationPrompt(
  feature: {
    name: string
    description?: string | null
    type: string
    acceptanceCriteria?: string | null
    uiNotes?: string | null
    testData?: string | null
  },
  fields: TestCaseField[],
  style: string,
  baseUrl?: string | null
): { systemPrompt: string; userPrompt: string; hasImages: boolean } {
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

  // Build rich context block
  const contextParts: string[] = []

  contextParts.push(`Feature: ${feature.name}`)
  contextParts.push(`Type: ${featureType}`)

  if (feature.description) {
    contextParts.push(`\nDescription:\n${feature.description}`)
  }

  if (feature.acceptanceCriteria) {
    contextParts.push(`\nAcceptance Criteria:\n${feature.acceptanceCriteria}`)
    contextParts.push(`IMPORTANT: Convert each acceptance criterion directly into one or more test steps.`)
  }

  if (baseUrl) {
    contextParts.push(`\nBase URL: ${baseUrl}`)
    contextParts.push(`Use this base URL when referencing pages in test steps e.g. "${baseUrl}/auth/login"`)
  }

  if (feature.uiNotes) {
    contextParts.push(`\nUI Notes (exact labels, button names, field names in the interface):\n${feature.uiNotes}`)
    contextParts.push(`Use these exact labels in your test steps.`)
  }

  if (feature.testData) {
    contextParts.push(`\nTest Data to use:\n${feature.testData}`)
    contextParts.push(`Use this specific test data in the Test Data column of your steps.`)
  }

  const userPrompt = contextParts.join('\n') + '\n\nGenerate test cases now. Return only the JSON array.'

  return {
    systemPrompt,
    userPrompt,
    hasImages: false,
  }
}

export function buildBackendTestCasePrompt(
  feature: {
    name: string
    description?: string | null
    acceptanceCriteria?: string | null
    testData?: string | null
  },
  endpoints: ApiEndpoint[],
  fields: TestCaseField[],
  baseUrl?: string | null
): { systemPrompt: string; userPrompt: string } {
  const fieldSchema = fields
    .map(f => {
      let desc = `"${f.key}" (${f.type}): ${f.description || f.name}`
      if (f.options && Array.isArray(f.options)) {
        desc += `. Allowed values: ${(f.options as string[]).join(', ')}`
      }
      return desc
    })
    .join('\n')

  const systemPrompt = `You are a senior backend QA engineer specialising in API testing.
Generate structured API test cases for the endpoints provided.

Return ONLY a valid JSON array. No markdown, no explanation, no preamble.
The array must contain between 4 and 10 test case objects.
Each object must have exactly these keys: ${fields.map(f => `"${f.key}"`).join(', ')}

Field definitions:
${fieldSchema}

For STEPS fields use pipe-separated format: "Action | Test data | Expected result"

Action format by API type:
- REST: "Send {METHOD} {fullPath}" e.g. "Send POST https://api.example.com/v1/auth/login"
- GraphQL: "Execute {query|mutation|subscription} {operationName}" e.g. "Execute mutation createUser"
- WebSocket: "Connect to {wsUrl} and send {eventType}" e.g. "Connect to ws://api/events and send subscribe message"

Test data format:
- REST: JSON request body e.g. { "email": "test@example.com", "password": "Test@1234" }
- GraphQL: Variables JSON e.g. { "input": { "email": "test@example.com" } }
- WebSocket: Event payload e.g. { "type": "subscribe", "channel": "orders" }

Expected result format:
- REST: "Status {code}, response body {description}" e.g. "Status 200, body contains { accessToken: string, refreshToken: string }"
- GraphQL: "Response data contains {description}" e.g. "Response data.createUser contains { id, email, createdAt }"
- WebSocket: "Server emits {eventType} with {payload description}"

Generate test cases covering:
1. Happy path (valid data, correct auth)
2. Invalid input (missing required fields, wrong types, invalid values)
3. Auth failures (missing token, expired token, wrong permissions)
4. Edge cases (empty strings, very long values, special characters, SQL injection attempts)
5. For each endpoint provided, generate at least one test case

If auth is required, include an Authorization header step:
"Set Authorization header | Bearer {valid_token} | Request proceeds with auth"

For negative auth tests:
"Send request without Authorization header | (none) | Status 401 Unauthorized"`

  const endpointDescriptions = endpoints.map((ep, i) => {
    const fullPath = baseUrl && ep.path.startsWith('/')
      ? `${baseUrl.replace(/\/$/, '')}${ep.path}`
      : ep.path

    const lines = [
      `Endpoint ${i + 1}: ${ep.apiType}`,
      `  Method/Operation: ${ep.method.toUpperCase()}`,
      `  Path: ${fullPath}`,
    ]
    if (ep.requestBody) lines.push(`  Request body / Variables:\n  ${ep.requestBody}`)
    if (ep.expectedResponse) lines.push(`  Expected response:\n  ${ep.expectedResponse}`)
    if (ep.authRequired) lines.push(`  Auth: Required (${ep.authType || 'Bearer'})`)
    else lines.push(`  Auth: Not required`)
    if (ep.notes) lines.push(`  Notes: ${ep.notes}`)
    return lines.join('\n')
  }).join('\n\n')

  const contextParts = [
    `Feature: ${feature.name}`,
    `Type: Backend API`,
  ]

  if (feature.description) {
    contextParts.push(`\nDescription:\n${feature.description}`)
  }

  if (feature.acceptanceCriteria) {
    contextParts.push(`\nAcceptance Criteria:\n${feature.acceptanceCriteria}`)
  }

  contextParts.push(`\nEndpoints to test:\n${endpointDescriptions}`)

  if (feature.testData) {
    contextParts.push(`\nAdditional test data:\n${feature.testData}`)
  }

  contextParts.push('\nGenerate test cases now. Return only the JSON array.')

  return {
    systemPrompt,
    userPrompt: contextParts.join('\n'),
  }
}

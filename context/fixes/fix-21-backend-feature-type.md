# Fix 21 — Backend API Feature Type + Multi-Endpoint Support

## What this adds
- Feature type gains a third option: BACKEND_API
- Backend features show an endpoints section (add multiple)
- Each endpoint has: API type, method, path, request body, expected response, auth
- AI prompt switches to API testing mode for backend features
- Frontend features unchanged

---

## Database changes

### server/prisma/schema.prisma

Update FeatureType enum:
```prisma
enum FeatureType {
  NEW_FEATURE
  BUG
  BACKEND_API    // add this
}
```

Add endpoints field to Feature model:
```prisma
model Feature {
  // existing fields...
  endpoints  Json?   // array of ApiEndpoint objects — only for BACKEND_API
}
```

ApiEndpoint shape stored in the Json field:
```typescript
type ApiEndpoint = {
  id: string          // client-generated uuid for list key
  apiType: 'REST' | 'GRAPHQL' | 'WEBSOCKET'
  method: string      // POST/GET/PUT/PATCH/DELETE for REST, query/mutation/subscription for GraphQL, connect/send/subscribe for WS
  path: string        // /api/v1/auth/login or operation name or ws path
  requestBody?: string   // JSON string or GraphQL variables
  expectedResponse?: string  // expected status + body description
  authRequired: boolean
  authType?: 'Bearer' | 'API_Key' | 'Basic' | 'None'
  notes?: string      // any extra context for this endpoint
}
```

Migration:
```bash
cd server && npx prisma migrate dev --create-only --name add-backend-feature-type
```
Review SQL then run:
```bash
npx prisma migrate dev --name add-backend-feature-type
```

---

## Server changes

### server/src/services/featureService.ts

Update createFeature and updateFeature to accept endpoints:

```typescript
// Add to data parameter type:
endpoints?: ApiEndpoint[]

// In prisma.feature.create data:
endpoints: data.endpoints?.length ? data.endpoints : null,
```

### server/src/services/llm/prompts.ts

Add a separate prompt builder for backend features.
Add this function alongside buildTestCaseGenerationPrompt:

```typescript
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

  // Build endpoint descriptions
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
```

### server/src/services/testCaseService.ts

Update generateTestCases to branch on feature type:

```typescript
async generateTestCases(featureId: string, workspaceId: string) {
  const feature = await prisma.feature.findUnique({
    where: { id: featureId },
    include: {
      project: {
        include: {
          template: { include: { fields: { orderBy: { order: 'asc' } } } }
        }
      }
    }
  })

  if (!feature) throw new NotFoundError('Feature not found')
  if (feature.project.workspaceId !== workspaceId) {
    throw new UnauthorizedError('Unauthorized')
  }
  if (!feature.project.template?.fields?.length) {
    throw new Error('NO_TEMPLATE: No template defined for this project.')
  }

  const fields = feature.project.template.fields
  const baseUrl = feature.project.baseUrl || null

  let systemPrompt: string
  let userPrompt: string

  if (feature.type === 'BACKEND_API') {
    // Use backend prompt
    const endpoints = (feature.endpoints as ApiEndpoint[]) || []
    if (endpoints.length === 0) {
      throw new Error('NO_ENDPOINTS: Backend features require at least one endpoint.')
    }
    const result = buildBackendTestCasePrompt(
      {
        name: feature.name,
        description: feature.description,
        acceptanceCriteria: feature.acceptanceCriteria,
        testData: feature.testData,
      },
      endpoints,
      fields,
      baseUrl
    )
    systemPrompt = result.systemPrompt
    userPrompt = result.userPrompt
  } else {
    // Use existing frontend prompt
    const result = buildTestCaseGenerationPrompt(
      {
        name: feature.name,
        description: feature.description,
        type: feature.type,
        acceptanceCriteria: feature.acceptanceCriteria,
        uiNotes: feature.uiNotes,
        testData: feature.testData,
      },
      fields,
      (feature.project.templateConfig as any)?.style ?? 'step_by_step',
      baseUrl
    )
    systemPrompt = result.systemPrompt
    userPrompt = result.userPrompt
  }

  // ... rest of OpenAI call and saving unchanged ...
}
```

---

## Client changes

### client/src/types/api.ts

Update FeatureType and add ApiEndpoint:

```typescript
export type FeatureType = 'NEW_FEATURE' | 'BUG' | 'BACKEND_API'

export type ApiType = 'REST' | 'GRAPHQL' | 'WEBSOCKET'

export type RestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type GraphQLMethod = 'query' | 'mutation' | 'subscription'
export type WebSocketMethod = 'connect' | 'send' | 'subscribe'

export type ApiEndpoint = {
  id: string
  apiType: ApiType
  method: string
  path: string
  requestBody?: string
  expectedResponse?: string
  authRequired: boolean
  authType?: 'Bearer' | 'API_Key' | 'Basic' | 'None'
  notes?: string
}

export type Feature = {
  id: string
  name: string
  description: string
  acceptanceCriteria?: string | null
  uiNotes?: string | null
  testData?: string | null
  contextImages?: string[] | null
  endpoints?: ApiEndpoint[] | null   // add this
  type: FeatureType
  status: FeatureStatus
  projectId: string
  createdAt: string
  updatedAt: string
  _count?: { testCases: number }
}
```

### client/src/components/AddFeaturePanel.tsx

#### Feature type selector — three options

Replace the current type select with a visual selector:

```tsx
<div className="fg">
  <label className="lbl">Feature type</label>
  <div className="grid grid-cols-3 gap-2">
    {[
      { value: 'NEW_FEATURE', label: 'Frontend', icon: '🖥', desc: 'UI feature or flow' },
      { value: 'BACKEND_API', label: 'Backend API', icon: '⚡', desc: 'Endpoint(s) to test' },
      { value: 'BUG', label: 'Bug', icon: '🐛', desc: 'Defect or regression' },
    ].map(opt => (
      <div
        key={opt.value}
        onClick={() => setType(opt.value as FeatureType)}
        className={[
          'border rounded-xl p-3 cursor-pointer text-center transition-all',
          type === opt.value
            ? 'border-[#4F46E5] bg-[#F0EFFD]'
            : 'border-[#DDDDD9] bg-white hover:border-[#C4C2F4]',
        ].join(' ')}
      >
        <div className="text-xl mb-1">{opt.icon}</div>
        <div className={`text-[12.5px] font-medium ${type === opt.value ? 'text-[#4F46E5]' : 'text-[#111]'}`}>
          {opt.label}
        </div>
        <div className="text-[11px] text-[#aaa] mt-0.5">{opt.desc}</div>
      </div>
    ))}
  </div>
</div>
```

#### Conditional fields based on type

When type === 'BACKEND_API':
- Show endpoints section (below)
- Hide UI notes field
- Change description placeholder to API-specific text

When type !== 'BACKEND_API':
- Show UI notes field (already there)
- Hide endpoints section

```tsx
{/* UI notes — frontend only */}
{type !== 'BACKEND_API' && (
  <div className="fg">
    <label className="lbl">UI notes <span className="lbl-opt">optional</span></label>
    {/* ... existing UI notes textarea ... */}
  </div>
)}

{/* Endpoints — backend only */}
{type === 'BACKEND_API' && (
  <EndpointsSection
    endpoints={endpoints}
    onChange={setEndpoints}
  />
)}
```

#### Endpoints section state

```typescript
const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([
  {
    id: crypto.randomUUID(),
    apiType: 'REST',
    method: 'GET',
    path: '',
    requestBody: '',
    expectedResponse: '',
    authRequired: true,
    authType: 'Bearer',
    notes: '',
  }
])
```

#### EndpointsSection component

Create client/src/components/EndpointsSection.tsx:

```tsx
import { ApiEndpoint, ApiType } from '@/types/api'

const REST_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const GRAPHQL_METHODS = ['query', 'mutation', 'subscription']
const WS_METHODS = ['connect', 'send', 'subscribe']

const METHOD_OPTIONS: Record<ApiType, string[]> = {
  REST: REST_METHODS,
  GRAPHQL: GRAPHQL_METHODS,
  WEBSOCKET: WS_METHODS,
}

const PATH_PLACEHOLDER: Record<ApiType, string> = {
  REST: '/api/v1/auth/login',
  GRAPHQL: 'loginUser (operation name)',
  WEBSOCKET: 'ws://api.yourapp.com/events',
}

const BODY_PLACEHOLDER: Record<ApiType, string> = {
  REST: '{\n  "email": "user@test.com",\n  "password": "Test@1234"\n}',
  GRAPHQL: '{\n  "input": {\n    "email": "user@test.com"\n  }\n}',
  WEBSOCKET: '{\n  "type": "subscribe",\n  "channel": "notifications"\n}',
}

interface Props {
  endpoints: ApiEndpoint[]
  onChange: (endpoints: ApiEndpoint[]) => void
}

export default function EndpointsSection({ endpoints, onChange }: Props) {
  const update = (id: string, field: keyof ApiEndpoint, value: any) => {
    onChange(endpoints.map(ep =>
      ep.id === id ? { ...ep, [field]: value } : ep
    ))
  }

  const add = () => {
    onChange([...endpoints, {
      id: crypto.randomUUID(),
      apiType: 'REST',
      method: 'GET',
      path: '',
      requestBody: '',
      expectedResponse: '',
      authRequired: true,
      authType: 'Bearer',
      notes: '',
    }])
  }

  const remove = (id: string) => {
    if (endpoints.length === 1) return // keep at least one
    onChange(endpoints.filter(ep => ep.id !== id))
  }

  return (
    <div className="fg">
      <div className="flex items-center justify-between mb-2">
        <label className="lbl mb-0">
          Endpoints
          <span className="text-[#EF4444] ml-1">*</span>
        </label>
        <button
          type="button"
          onClick={add}
          className="text-[11.5px] text-[#4F46E5] font-medium flex items-center gap-1 hover:text-[#4338CA]"
        >
          ＋ Add endpoint
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {endpoints.map((ep, index) => (
          <div
            key={ep.id}
            className="border border-[#DDDDD9] rounded-xl p-3 bg-[#FAFAF8] relative"
          >
            {/* Endpoint header */}
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11.5px] font-600 text-[#555]">
                Endpoint {index + 1}
              </div>
              {endpoints.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(ep.id)}
                  className="text-[11px] text-[#aaa] hover:text-[#EF4444] flex items-center gap-1"
                >
                  ✕ Remove
                </button>
              )}
            </div>

            {/* API type selector */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(['REST', 'GRAPHQL', 'WEBSOCKET'] as ApiType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    update(ep.id, 'apiType', t)
                    // Reset method to first valid option for new type
                    update(ep.id, 'method', METHOD_OPTIONS[t][0])
                  }}
                  className={[
                    'py-1.5 rounded-lg border text-[11.5px] font-medium transition-all',
                    ep.apiType === t
                      ? 'border-[#4F46E5] bg-[#EEEDFE] text-[#4F46E5]'
                      : 'border-[#D8D8D4] bg-white text-[#666] hover:border-[#C4C2F4]',
                  ].join(' ')}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Method + Path on same row */}
            <div className="flex gap-2 mb-2">
              <select
                value={ep.method}
                onChange={e => update(ep.id, 'method', e.target.value)}
                className="border border-[#DDDDD9] rounded-lg px-2 py-1.5 text-[12.5px] font-mono font-medium text-[#111] bg-white outline-none cursor-pointer flex-shrink-0 w-[110px]"
              >
                {METHOD_OPTIONS[ep.apiType].map(m => (
                  <option key={m} value={m}>{m.toUpperCase()}</option>
                ))}
              </select>
              <input
                type="text"
                value={ep.path}
                onChange={e => update(ep.id, 'path', e.target.value)}
                placeholder={PATH_PLACEHOLDER[ep.apiType]}
                className="flex-1 border border-[#DDDDD9] rounded-lg px-3 py-1.5 text-[12.5px] font-mono text-[#111] bg-white outline-none focus:border-[#4F46E5]"
              />
            </div>

            {/* Request body */}
            <div className="mb-2">
              <label className="text-[11px] font-500 text-[#888] block mb-1">
                {ep.apiType === 'GRAPHQL' ? 'Variables' : ep.apiType === 'WEBSOCKET' ? 'Payload' : 'Request body'}
                <span className="text-[#C0C0BC] font-normal ml-1">optional</span>
              </label>
              <textarea
                value={ep.requestBody || ''}
                onChange={e => update(ep.id, 'requestBody', e.target.value)}
                placeholder={BODY_PLACEHOLDER[ep.apiType]}
                rows={3}
                className="w-full border border-[#DDDDD9] rounded-lg px-3 py-2 text-[12px] font-mono text-[#111] bg-white outline-none resize-none focus:border-[#4F46E5] leading-relaxed"
              />
            </div>

            {/* Expected response */}
            <div className="mb-2">
              <label className="text-[11px] font-500 text-[#888] block mb-1">
                Expected response
                <span className="text-[#C0C0BC] font-normal ml-1">optional</span>
              </label>
              <textarea
                value={ep.expectedResponse || ''}
                onChange={e => update(ep.id, 'expectedResponse', e.target.value)}
                placeholder={
                  ep.apiType === 'REST'
                    ? 'Status 200, body: { accessToken: string, user: { id, email } }'
                    : ep.apiType === 'GRAPHQL'
                    ? 'data.loginUser: { token: string, user: { id, email } }'
                    : 'Server emits "connected" event with { userId, sessionId }'
                }
                rows={2}
                className="w-full border border-[#DDDDD9] rounded-lg px-3 py-2 text-[12px] font-mono text-[#111] bg-white outline-none resize-none focus:border-[#4F46E5] leading-relaxed"
              />
            </div>

            {/* Auth toggle */}
            <div className="flex items-center gap-3">
              <div
                onClick={() => update(ep.id, 'authRequired', !ep.authRequired)}
                className={[
                  'flex items-center gap-2 text-[12px] cursor-pointer select-none',
                  ep.authRequired ? 'text-[#4F46E5]' : 'text-[#888]',
                ].join(' ')}
              >
                <div className={[
                  'w-8 h-5 rounded-full relative transition-colors',
                  ep.authRequired ? 'bg-[#4F46E5]' : 'bg-[#D0D0CC]',
                ].join(' ')}>
                  <div className={[
                    'w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all shadow-sm',
                    ep.authRequired ? 'left-[17px]' : 'left-[3px]',
                  ].join(' ')} />
                </div>
                Auth required
              </div>

              {ep.authRequired && (
                <select
                  value={ep.authType || 'Bearer'}
                  onChange={e => update(ep.id, 'authType', e.target.value)}
                  className="border border-[#DDDDD9] rounded-lg px-2 py-1 text-[12px] bg-white outline-none cursor-pointer"
                >
                  <option value="Bearer">Bearer token</option>
                  <option value="API_Key">API Key</option>
                  <option value="Basic">Basic auth</option>
                </select>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="text-[11px] text-[#aaa] mt-1.5 leading-1.5">
        Add all endpoints this feature covers. The AI will generate test cases for each one including positive, negative, and edge case scenarios.
      </div>
    </div>
  )
}
```

#### Validation — backend features require at least one endpoint with a path

```typescript
const handleCreate = async () => {
  if (!name.trim() || name.trim().length < 3) {
    setError('Feature name must be at least 3 characters')
    return
  }
  if (!description.trim() || description.trim().length < 10) {
    setError('Description is required (minimum 10 characters)')
    return
  }
  if (type === 'BACKEND_API') {
    const hasPath = endpoints.some(ep => ep.path.trim().length > 0)
    if (!hasPath) {
      setError('At least one endpoint path is required for backend features')
      return
    }
  }
  // ...
}
```

#### Pass endpoints in the API call

```typescript
const feature = await featuresAPI.createFeature(projectId, {
  name: name.trim(),
  description: description.trim(),
  type,
  acceptanceCriteria: acceptanceCriteria.trim() || undefined,
  uiNotes: type !== 'BACKEND_API' ? (uiNotes.trim() || undefined) : undefined,
  testData: testData.trim() || undefined,
  contextImages: contextImages.length ? contextImages : undefined,
  endpoints: type === 'BACKEND_API' ? endpoints.filter(ep => ep.path.trim()) : undefined,
})
```

### Features table — show backend badge

Update the type badge rendering in FeaturesPage.tsx:

```tsx
// Add alongside the existing NEW_FEATURE and BUG badges:
{feature.type === 'BACKEND_API' && (
  <span className="badge" style={{ background: '#F0FDF4', color: '#166534' }}>
    <span className="badge-dot" style={{ background: '#166534' }} />
    Backend API
  </span>
)}
```

---

## How the AI output looks for backend features

Given a feature with these endpoints:
- POST /api/v1/auth/login (REST, Bearer)
- POST /api/v1/auth/refresh (REST, Bearer)

The AI generates test cases like:

TC-001 — Successful login with valid credentials
- Step 1: `Send POST https://api.app.com/v1/auth/login | { "email": "user@test.com", "password": "Test@1234" } | Status 200, body contains { accessToken: string, refreshToken: string }`

TC-002 — Login fails with wrong password
- Step 1: `Send POST https://api.app.com/v1/auth/login | { "email": "user@test.com", "password": "WrongPass" } | Status 401, body: { error: "Invalid credentials" }`

TC-003 — Login fails with missing email
- Step 1: `Send POST https://api.app.com/v1/auth/login | { "password": "Test@1234" } | Status 400, body: { error: "email is required" }`

TC-004 — Token refresh with valid token
- Step 1: `Set Authorization header | Bearer {valid_refresh_token} | Header set`
- Step 2: `Send POST https://api.app.com/v1/auth/refresh | {} | Status 200, new accessToken returned`

---

## After applying all changes

### Test frontend feature (unchanged)
1. Select Frontend type — confirm UI notes field visible, no endpoints section
2. Add feature, generate — confirm existing behaviour unchanged

### Test backend feature — single endpoint
1. Select Backend API type — confirm endpoints section appears, UI notes hidden
2. Select REST, set method POST, enter path /api/v1/auth/login
3. Enter request body JSON
4. Enter expected response
5. Toggle auth required on, select Bearer
6. Generate test cases
7. Confirm steps say "Send POST https://..." with JSON in test data column

### Test backend feature — multiple endpoints
1. Click + Add endpoint
2. Add a second REST endpoint
3. Click + Add endpoint again
4. Add a GraphQL mutation
5. Generate — confirm AI generates test cases covering all three endpoints

### Test WebSocket endpoint
1. Add endpoint, select WEBSOCKET
2. Method changes to connect/send/subscribe options
3. Enter ws:// path
4. Generate — confirm steps say "Connect to ws://..." and "Send subscribe message"

### Test validation
1. Select Backend API, leave path empty, click Add Feature
2. Confirm error: "At least one endpoint path is required"

Fix all TypeScript errors before confirming done.
Run Prisma migration before testing.
Do not change any other files.

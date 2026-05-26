# Fix 20 — Add Feature Form: Context Fields + Image Attachment

## What this adds to the Add Feature form
- Description field — now required, max 5000 characters
- Acceptance criteria — optional textarea
- UI notes — optional textarea  
- Test data — optional textarea
- Figma / screenshot attachment — optional image upload (max 3 images)

All new fields are passed to the AI prompt when generating test cases.
Image attachments are sent to the LLM as base64 encoded images.

---

## Database changes

### server/prisma/schema.prisma
Add new fields to the Feature model:

```prisma
model Feature {
  id                 String        @id @default(uuid())
  name               String
  description        String        @db.Text  // now required
  acceptanceCriteria String?       @db.Text
  uiNotes            String?       @db.Text
  testData           String?       @db.Text
  contextImages      Json?         // array of base64 strings
  type               FeatureType
  status             FeatureStatus @default(DRAFT)
  projectId          String
  project            Project       @relation(fields: [projectId], references: [id])
  testCases          TestCase[]
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt
  deletedAt          DateTime?
}
```

Show migration SQL before running:
```bash
cd server && npx prisma migrate dev --create-only --name add-feature-context-fields
```
Review then run:
```bash
npx prisma migrate dev --name add-feature-context-fields
```

---

## Server changes

### server/src/services/featureService.ts

Update createFeature to accept and save new fields:

```typescript
async createFeature(
  projectId: string,
  workspaceId: string,
  data: {
    name: string
    description: string            // now required
    type: 'NEW_FEATURE' | 'BUG'
    acceptanceCriteria?: string
    uiNotes?: string
    testData?: string
    contextImages?: string[]       // array of base64 image strings
  }
) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) throw new NotFoundError('Project not found')
  if (project.workspaceId !== workspaceId) throw new UnauthorizedError('Unauthorized')

  return prisma.feature.create({
    data: {
      name: data.name,
      description: data.description,
      acceptanceCriteria: data.acceptanceCriteria || null,
      uiNotes: data.uiNotes || null,
      testData: data.testData || null,
      contextImages: data.contextImages?.length ? data.contextImages : null,
      type: data.type,
      status: 'FINAL',
      projectId,
    },
    include: { _count: { select: { testCases: true } } },
  })
}
```

Update updateFeature to accept the new fields too:

```typescript
async updateFeature(
  featureId: string,
  workspaceId: string,
  data: {
    name?: string
    description?: string
    type?: 'NEW_FEATURE' | 'BUG'
    status?: 'DRAFT' | 'FINAL'
    acceptanceCriteria?: string
    uiNotes?: string
    testData?: string
    contextImages?: string[]
  }
) {
  // ... existing ownership check ...
  return prisma.feature.update({
    where: { id: featureId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.acceptanceCriteria !== undefined && { acceptanceCriteria: data.acceptanceCriteria || null }),
      ...(data.uiNotes !== undefined && { uiNotes: data.uiNotes || null }),
      ...(data.testData !== undefined && { testData: data.testData || null }),
      ...(data.contextImages !== undefined && { contextImages: data.contextImages?.length ? data.contextImages : null }),
    },
    include: { _count: { select: { testCases: true } } },
  })
}
```

### server/src/services/llm/prompts.ts

Update buildTestCaseGenerationPrompt to use all context fields.
Replace the userPrompt section:

```typescript
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

  // ... existing systemPrompt building ...

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
```

### server/src/services/testCaseService.ts

Update generateTestCases to pass the new fields and handle images:

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
  const style = (feature.project.templateConfig as any)?.style ?? 'step_by_step'
  const baseUrl = feature.project.baseUrl || null

  const { systemPrompt, userPrompt } = buildTestCaseGenerationPrompt(
    {
      name: feature.name,
      description: feature.description,
      type: feature.type,
      acceptanceCriteria: feature.acceptanceCriteria,
      uiNotes: feature.uiNotes,
      testData: feature.testData,
    },
    fields,
    style,
    baseUrl
  )

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  // Build messages array — add images if present
  const contextImages = feature.contextImages as string[] | null
  const hasImages = contextImages && contextImages.length > 0

  let messages: any[]

  if (hasImages) {
    // Send images alongside the prompt for visual context
    const imageContent = contextImages!.map(img => ({
      type: 'image_url',
      image_url: {
        url: img.startsWith('data:') ? img : `data:image/png;base64,${img}`,
        detail: 'high',
      },
    }))

    messages = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          ...imageContent,
          {
            type: 'text',
            text: 'Use the UI screenshots above to extract exact button labels, field names, URLs, and error messages. Incorporate them into the test steps.',
          },
        ],
      },
    ]
  } else {
    messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]
  }

  const completion = await openai.chat.completions.create({
    model: process.env.DEFAULT_LLM_MODEL || 'gpt-4o',
    messages,
    temperature: 0.3,
    max_tokens: 4000,
  })

  // ... rest of existing parsing and saving logic unchanged ...
}
```

---

## Client changes

### client/src/types/api.ts

Update Feature type:

```typescript
export type Feature = {
  id: string
  name: string
  description: string             // now required string not optional
  acceptanceCriteria?: string | null
  uiNotes?: string | null
  testData?: string | null
  contextImages?: string[] | null
  type: FeatureType
  status: FeatureStatus
  projectId: string
  createdAt: string
  updatedAt: string
  _count?: { testCases: number }
}
```

### client/src/components/AddFeaturePanel.tsx

Add new state variables:

```typescript
const [description, setDescription] = useState('')
const [acceptanceCriteria, setAcceptanceCriteria] = useState('')
const [uiNotes, setUiNotes] = useState('')
const [testData, setTestData] = useState('')
const [contextImages, setContextImages] = useState<string[]>([])
const [imageError, setImageError] = useState('')
```

Update validation — description is now required with minimum 10 chars:

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
  // ...
}
```

Update the API call to include new fields:

```typescript
const feature = await featuresAPI.createFeature(projectId, {
  name: name.trim(),
  description: description.trim(),
  type,
  acceptanceCriteria: acceptanceCriteria.trim() || undefined,
  uiNotes: uiNotes.trim() || undefined,
  testData: testData.trim() || undefined,
  contextImages: contextImages.length ? contextImages : undefined,
})
```

#### New form fields to add in panel body

Add these after the existing feature type select, before the generate toggle.

**Description (required, 5000 chars):**
```tsx
<div className="fg">
  <label className="lbl">
    Description
    <span className="text-[#EF4444] ml-1">*</span>
  </label>
  <textarea
    className="inp"
    rows={3}
    maxLength={5000}
    placeholder="Describe what this feature does in detail. The more specific you are, the more accurate the AI-generated test steps will be."
    value={description}
    onChange={e => setDescription(e.target.value)}
  />
  <div className="flex justify-between mt-1">
    <span className="text-[11px] text-[#aaa]">Required — helps AI generate accurate steps</span>
    <span className={`text-[11px] ${description.length > 4800 ? 'text-[#EF4444]' : 'text-[#C0C0BC]'}`}>
      {description.length} / 5000
    </span>
  </div>
</div>
```

**Acceptance criteria (optional):**
```tsx
<div className="fg">
  <label className="lbl">
    Acceptance criteria
    <span className="lbl-opt">optional</span>
  </label>
  <textarea
    className="inp"
    rows={3}
    placeholder={`Given [context]\nWhen [action]\nThen [expected outcome]`}
    value={acceptanceCriteria}
    onChange={e => setAcceptanceCriteria(e.target.value)}
  />
  <div className="text-[11px] text-[#aaa] mt-1">
    Write in Given/When/Then format. Each criterion becomes a test case.
  </div>
</div>
```

**UI notes (optional):**
```tsx
<div className="fg">
  <label className="lbl">
    UI notes
    <span className="lbl-opt">optional</span>
  </label>
  <textarea
    className="inp"
    rows={2}
    placeholder="Button labels, field names, URLs, error messages exactly as they appear in the UI"
    value={uiNotes}
    onChange={e => setUiNotes(e.target.value)}
  />
  <div className="text-[11px] text-[#aaa] mt-1">
    e.g. "Sign In button, Work email field, error: Invalid email or password"
  </div>
</div>
```

**Test data (optional):**
```tsx
<div className="fg">
  <label className="lbl">
    Test data
    <span className="lbl-opt">optional</span>
  </label>
  <textarea
    className="inp"
    rows={2}
    placeholder="Specific values to use in tests: emails, passwords, IDs, amounts"
    value={testData}
    onChange={e => setTestData(e.target.value)}
  />
  <div className="text-[11px] text-[#aaa] mt-1">
    e.g. "Valid: user@test.com / Test@1234 | Invalid: wrong@test.com / BadPass"
  </div>
</div>
```

**Screenshots / Figma exports (optional, max 3 images):**
```tsx
<div className="fg">
  <label className="lbl">
    Screenshots or Figma exports
    <span className="lbl-opt">optional · max 3 images</span>
  </label>

  {/* Image previews */}
  {contextImages.length > 0 && (
    <div className="flex gap-2 mb-2 flex-wrap">
      {contextImages.map((img, i) => (
        <div key={i} className="relative">
          <img
            src={img}
            alt={`Context ${i + 1}`}
            className="w-20 h-20 object-cover rounded-lg border border-[#EBEBEB]"
          />
          <button
            onClick={() => setContextImages(prev => prev.filter((_, idx) => idx !== i))}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#EF4444] text-white text-[10px] flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )}

  {/* Upload area */}
  {contextImages.length < 3 && (
    <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-[#D8D8D4] rounded-xl cursor-pointer hover:border-[#4F46E5] hover:bg-[#FAFAFE] transition-all">
      <span className="text-2xl">🖼</span>
      <span className="text-[12.5px] font-medium text-[#555]">
        Upload screenshots or Figma exports
      </span>
      <span className="text-[11.5px] text-[#aaa]">
        PNG, JPG, WEBP · Max 4MB each · {3 - contextImages.length} remaining
      </span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={async (e) => {
          setImageError('')
          const files = Array.from(e.target.files || [])
          const remaining = 3 - contextImages.length
          const toProcess = files.slice(0, remaining)

          for (const file of toProcess) {
            if (file.size > 4 * 1024 * 1024) {
              setImageError(`${file.name} is too large. Max 4MB per image.`)
              continue
            }
            const base64 = await fileToBase64(file)
            setContextImages(prev => [...prev, base64])
          }
          // Reset input so same file can be re-selected
          e.target.value = ''
        }}
      />
    </label>
  )}

  {imageError && (
    <div className="text-[11.5px] text-[#EF4444] mt-1">{imageError}</div>
  )}

  <div className="text-[11px] text-[#aaa] mt-1.5">
    The AI will read your UI screenshots to extract exact button labels,
    field names, and error messages for more accurate test steps.
  </div>
</div>
```

#### Add fileToBase64 helper inside the component file

```typescript
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
```

### client/src/api/features.ts (or wherever createFeature is defined)

Update the API call type:

```typescript
async createFeature(
  projectId: string,
  data: {
    name: string
    description: string
    type: 'NEW_FEATURE' | 'BUG'
    acceptanceCriteria?: string
    uiNotes?: string
    testData?: string
    contextImages?: string[]
  }
): Promise<Feature> {
  const res = await apiClient.post<{ feature: Feature }>(
    `/projects/${projectId}/features`,
    data
  )
  return res.data.feature
}
```

Note: contextImages are base64 strings (data URLs). They can be large.
If the request fails due to payload size, the server's body size limit
needs to be increased in server/src/index.ts or server/src/app.ts:

```typescript
// Find the express json middleware and increase limit
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true, limit: '20mb' }))
```

---

## How the AI uses each new field

| Field | How AI uses it |
|---|---|
| Description (5000 chars) | Primary context — full product description, edge cases, business rules |
| Acceptance criteria | Each Given/When/Then becomes one or more test cases directly |
| UI notes | Exact button/field labels used in step descriptions |
| Test data | Exact values used in the Test data column of each step |
| Base URL (project) | Full URLs in steps e.g. https://app.product.com/auth/login |
| Screenshots | Visual extraction of labels, error messages, page layouts |

---

## After applying all changes

### Test with minimal context (current behaviour)
1. Add a feature with name only
2. Generate test cases
3. Note how generic the steps are

### Test with full context
1. Add a feature with:
   - Description: detailed paragraph about what the feature does
   - Acceptance criteria: 3 Given/When/Then statements
   - UI notes: "Sign In button, Work email field, error: Invalid credentials"
   - Test data: "Valid: user@test.com / Test@1234 | Invalid: bad@test.com"
   - Screenshot: export the relevant Figma frame as PNG and attach it
2. Generate test cases
3. Compare — steps should reference exact labels, URLs, and test data

### Verify image upload
1. Upload a PNG screenshot under 4MB — confirm preview thumbnail appears
2. Upload a second image — confirm both show
3. Try uploading a 4th — confirm it is blocked
4. Remove an image with ✕ — confirm it disappears
5. Generate with images — check server logs confirm images are sent to OpenAI

### Verify description validation
1. Try to submit with empty description — confirm error message
2. Type 9 chars in description — confirm still blocked
3. Type 10+ chars — confirm allowed

Do not modify any other files.
Fix all TypeScript errors before confirming done.
Run migration before testing.

# Phase 8 — Zephyr Scale Export

## What we are building
After AI generates test cases, the user can push them directly to
Zephyr Scale Cloud. Two export modes: all test cases for a feature,
or user-selected test cases only.

A one-time Zephyr connection setup per project maps the project's
dynamic template field keys to Zephyr's required fields.

## Existing data shape — do not change these
TestCase.fieldValues: Record<string, any>  — all field data lives here
fields[]: TestCaseField[]                  — comes from template, defines columns
TestCaseField.options: Json?               — cast to string[] when reading

Schema path: server/prisma/schema.prisma

---

## Database changes

### server/prisma/schema.prisma

#### 1. Add zephyrKey and zephyrId to TestCase
Find the TestCase model and add two fields:

```prisma
model TestCase {
  id          String            @id @default(uuid())
  featureId   String
  feature     Feature           @relation(fields: [featureId], references: [id])
  fieldValues Json
  generatedBy GeneratedBy       @default(LLM)
  zephyrKey   String?           // e.g. "MAP-T1" — set after successful export
  zephyrId    Int?              // Zephyr internal numeric ID
  versions    TestCaseVersion[]
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  deletedAt   DateTime?
}
```

#### 2. Add ZephyrConnection model
Add after the TestCaseTemplate model:

```prisma
model ZephyrConnection {
  id             String   @id @default(uuid())
  projectId      String   @unique
  project        Project  @relation(fields: [projectId], references: [id])
  apiToken       String   @db.Text   // AES-256 encrypted
  jiraProjectKey String              // e.g. "MAP"
  fieldMapping   Json                // { zephyrField: templateFieldKey }
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

#### 3. Add relation to Project model
In the Project model add:
```prisma
zephyrConnection ZephyrConnection?
```

#### 4. Run migration
Show SQL only first — do not run:
```bash
cd server && npx prisma migrate dev --create-only --name add-zephyr-connection
```
Review the SQL, then run:
```bash
npx prisma migrate dev --name add-zephyr-connection
```

---

## Server files to create

### server/src/lib/encryption.ts
Create if it does not already exist:

```typescript
import crypto from 'crypto'

const KEY = Buffer.from(
  process.env.ENCRYPTION_KEY || '',
  'utf8'
).slice(0, 32)

const ALGORITHM = 'aes-256-gcm'

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return [
    iv.toString('hex'),
    tag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':')
}

export function decrypt(encoded: string): string {
  const [ivHex, tagHex, encryptedHex] = encoded.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString('utf8')
}
```

### server/src/services/zephyrService.ts

```typescript
import axios from 'axios'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/encryption'
import { NotFoundError, UnauthorizedError } from '@/lib/errors'

const ZEPHYR_BASE = 'https://api.zephyrscale.smartbear.com/v2'

// fieldMapping shape stored in ZephyrConnection.fieldMapping:
// {
//   name:         "test_title",      // required
//   steps:        "test_steps",      // required
//   objective:    "expected_result", // optional
//   priority:     "priority",        // optional
//   precondition: "preconditions",   // optional
// }

function mapPriority(raw: any): string {
  const s = String(raw || '').toUpperCase()
  if (s.includes('HIGH') || s.includes('CRITICAL')) return 'High'
  if (s.includes('LOW')) return 'Low'
  return 'Medium'
}

export const zephyrService = {

  // ── Connection management ────────────────────────────────

  async getConnection(projectId: string, workspaceId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })
    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundError('Project not found')
    }
    const conn = await prisma.zephyrConnection.findUnique({
      where: { projectId },
    })
    if (!conn) return null
    return {
      id: conn.id,
      jiraProjectKey: conn.jiraProjectKey,
      fieldMapping: conn.fieldMapping,
      connected: true,
    }
  },

  async testConnection(apiToken: string): Promise<boolean> {
    try {
      await axios.get(`${ZEPHYR_BASE}/testcases?maxResults=1`, {
        headers: { Authorization: `Bearer ${apiToken}` },
        timeout: 8000,
      })
      return true
    } catch (err: any) {
      // 401 = bad token, anything else = network/other issue
      if (err?.response?.status === 401) return false
      // If we get any other HTTP response, the token is likely valid
      if (err?.response?.status) return true
      return false
    }
  },

  async saveConnection(
    projectId: string,
    workspaceId: string,
    data: {
      apiToken: string
      jiraProjectKey: string
      fieldMapping: Record<string, string>
    }
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })
    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundError('Project not found')
    }
    const encryptedToken = encrypt(data.apiToken)
    return prisma.zephyrConnection.upsert({
      where: { projectId },
      create: {
        projectId,
        apiToken: encryptedToken,
        jiraProjectKey: data.jiraProjectKey.toUpperCase().trim(),
        fieldMapping: data.fieldMapping,
      },
      update: {
        apiToken: encryptedToken,
        jiraProjectKey: data.jiraProjectKey.toUpperCase().trim(),
        fieldMapping: data.fieldMapping,
      },
    })
  },

  async deleteConnection(projectId: string, workspaceId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })
    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundError('Project not found')
    }
    await prisma.zephyrConnection.delete({ where: { projectId } })
  },

  // ── Export ────────────────────────────────────────────────

  async exportTestCases(
    featureId: string,
    testCaseIds: string[] | 'all',
    workspaceId: string
  ) {
    // 1. Load feature with project + connection + template fields
    const feature = await prisma.feature.findUnique({
      where: { id: featureId },
      include: {
        project: {
          include: {
            zephyrConnection: true,
            template: {
              include: {
                fields: { orderBy: { order: 'asc' } },
              },
            },
          },
        },
      },
    })

    if (!feature) throw new NotFoundError('Feature not found')
    if (feature.project.workspaceId !== workspaceId) {
      throw new UnauthorizedError('Unauthorized')
    }

    const conn = feature.project.zephyrConnection
    if (!conn) {
      throw new Error(
        'NO_ZEPHYR: No Zephyr connection configured for this project. ' +
        'Go to project settings to connect.'
      )
    }

    const apiToken = decrypt(conn.apiToken)
    const mapping = conn.fieldMapping as Record<string, string>
    const jiraProjectKey = conn.jiraProjectKey

    // 2. Load test cases — skip ones already in Zephyr
    const whereClause: any = {
      featureId,
      deletedAt: null,
      zephyrKey: null, // skip already exported
    }
    if (testCaseIds !== 'all') {
      whereClause.id = { in: testCaseIds }
    }

    const testCases = await prisma.testCase.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
    })

    if (testCases.length === 0) {
      return {
        results: [],
        successCount: 0,
        failCount: 0,
        total: 0,
        message: 'All selected test cases are already in Zephyr Scale.',
      }
    }

    // 3. Export each one sequentially to avoid rate limits
    const results: Array<{
      testCaseId: string
      zephyrKey: string
      success: boolean
      error?: string
    }> = []

    for (const tc of testCases) {
      const fv = tc.fieldValues as Record<string, any>

      // Map using the stored field mapping
      const name = String(fv[mapping.name] || 'Untitled test case')
      const objective = mapping.objective ? String(fv[mapping.objective] || '') : ''
      const precondition = mapping.precondition
        ? String(fv[mapping.precondition] || '')
        : ''
      const priorityRaw = mapping.priority ? fv[mapping.priority] : null
      const rawSteps = mapping.steps ? fv[mapping.steps] : []

      // Build Zephyr step objects
      // TestCaseField type STEPS stores an array of strings
      const stepsArray: string[] = Array.isArray(rawSteps)
        ? rawSteps.map(String)
        : String(rawSteps || '').split('\n').filter(Boolean)

      const zephyrSteps = stepsArray.map((stepText, i) => ({
        description: stepText,
        // Put expected result only on the last step
        expectedResult: i === stepsArray.length - 1 ? objective : '',
      }))

      // If no steps were found, create one step from the objective
      if (zephyrSteps.length === 0 && objective) {
        zephyrSteps.push({ description: objective, expectedResult: '' })
      }

      try {
        const response = await axios.post(
          `${ZEPHYR_BASE}/testcases`,
          {
            projectKey: jiraProjectKey,
            name,
            objective,
            precondition,
            testScript: {
              type: 'STEP_BY_STEP',
              steps: zephyrSteps,
            },
            statusName: 'Draft',
            priorityName: mapPriority(priorityRaw),
            labels: ['regi-generated'],
          },
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

        // Save Zephyr identifiers back to the test case
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
        results.push({
          testCaseId: tc.id,
          zephyrKey: '',
          success: false,
          error: msg,
        })
      }
    }

    return {
      results,
      successCount: results.filter(r => r.success).length,
      failCount: results.filter(r => !r.success).length,
      total: testCases.length,
    }
  },
}
```

### server/src/controllers/zephyrController.ts

```typescript
import { Request, Response, NextFunction } from 'express'
import { zephyrService } from '@/services/zephyrService'

export const zephyrController = {

  getConnection: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conn = await zephyrService.getConnection(
        req.params.projectId,
        req.user!.workspaceId
      )
      return res.json({ connection: conn })
    } catch (err) { next(err) }
  },

  saveConnection: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { apiToken, jiraProjectKey, fieldMapping } = req.body
      if (!apiToken?.trim() || !jiraProjectKey?.trim() || !fieldMapping) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'apiToken, jiraProjectKey, and fieldMapping are required',
          },
        })
      }
      if (!fieldMapping.name || !fieldMapping.steps) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'fieldMapping must include "name" and "steps" keys',
          },
        })
      }

      // Test the connection before saving
      const valid = await zephyrService.testConnection(apiToken)
      if (!valid) {
        return res.status(400).json({
          error: {
            code: 'INVALID_TOKEN',
            message:
              'Could not connect to Zephyr Scale. Check your API token and try again.',
          },
        })
      }

      const conn = await zephyrService.saveConnection(
        req.params.projectId,
        req.user!.workspaceId,
        { apiToken, jiraProjectKey, fieldMapping }
      )

      return res.json({
        connection: {
          id: conn.id,
          jiraProjectKey: conn.jiraProjectKey,
          fieldMapping: conn.fieldMapping,
          connected: true,
        },
      })
    } catch (err) { next(err) }
  },

  deleteConnection: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await zephyrService.deleteConnection(
        req.params.projectId,
        req.user!.workspaceId
      )
      return res.json({ message: 'Zephyr connection removed' })
    } catch (err) { next(err) }
  },

  exportTestCases: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { testCaseIds } = req.body
      if (!testCaseIds) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'testCaseIds is required. Pass "all" or an array of IDs.',
          },
        })
      }

      const result = await zephyrService.exportTestCases(
        req.params.featureId,
        testCaseIds,
        req.user!.workspaceId
      )
      return res.json(result)
    } catch (err: any) {
      if (err.message?.startsWith('NO_ZEPHYR')) {
        return res.status(400).json({
          error: {
            code: 'NO_ZEPHYR_CONNECTION',
            message: err.message.replace('NO_ZEPHYR: ', ''),
          },
        })
      }
      next(err)
    }
  },
}
```

### server/src/routes/zephyr.ts

```typescript
import { Router } from 'express'
import { authenticate } from '@/middleware/auth'
import { zephyrController } from '@/controllers/zephyrController'

const router = Router({ mergeParams: true })
router.use(authenticate)

/**
 * @swagger
 * /api/v1/projects/{projectId}/zephyr:
 *   get:
 *     tags: [Zephyr]
 *     summary: Get Zephyr connection status for a project
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Connection object or null
 */
router.get('/projects/:projectId/zephyr', zephyrController.getConnection)

/**
 * @swagger
 * /api/v1/projects/{projectId}/zephyr:
 *   post:
 *     tags: [Zephyr]
 *     summary: Save Zephyr connection for a project
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [apiToken, jiraProjectKey, fieldMapping]
 *             properties:
 *               apiToken:
 *                 type: string
 *               jiraProjectKey:
 *                 type: string
 *                 example: MAP
 *               fieldMapping:
 *                 type: object
 *                 example:
 *                   name: test_title
 *                   steps: test_steps
 *                   objective: expected_result
 *                   priority: priority
 *     responses:
 *       200:
 *         description: Connection saved
 *       400:
 *         description: Invalid token or missing fields
 */
router.post('/projects/:projectId/zephyr', zephyrController.saveConnection)

/**
 * @swagger
 * /api/v1/projects/{projectId}/zephyr:
 *   delete:
 *     tags: [Zephyr]
 *     summary: Remove Zephyr connection from a project
 */
router.delete('/projects/:projectId/zephyr', zephyrController.deleteConnection)

/**
 * @swagger
 * /api/v1/features/{featureId}/testcases/export-zephyr:
 *   post:
 *     tags: [Zephyr]
 *     summary: Export test cases to Zephyr Scale
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: featureId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [testCaseIds]
 *             properties:
 *               testCaseIds:
 *                 oneOf:
 *                   - type: string
 *                     enum: [all]
 *                   - type: array
 *                     items: { type: string }
 *     responses:
 *       200:
 *         description: Export results with successCount and failCount
 */
router.post(
  '/features/:featureId/testcases/export-zephyr',
  zephyrController.exportTestCases
)

export default router
```

Mount in server/src/routes/index.ts:
```typescript
import zephyrRouter from './zephyr'
router.use('/', zephyrRouter)
```

---

## Client files to create

### client/src/types/api.ts
Add to existing file:

```typescript
export type ZephyrFieldMapping = {
  name: string          // required — which template key is the test case title
  steps: string         // required — which template key holds the steps array
  objective?: string    // optional — maps to expected result or similar
  priority?: string     // optional — maps to priority field
  precondition?: string // optional — maps to preconditions field
}

export type ZephyrConnection = {
  id: string
  jiraProjectKey: string
  fieldMapping: ZephyrFieldMapping
  connected: boolean
}

export type ZephyrExportResult = {
  results: Array<{
    testCaseId: string
    zephyrKey: string
    success: boolean
    error?: string
  }>
  successCount: number
  failCount: number
  total: number
  message?: string
}
```

Also update the TestCase type to include optional Zephyr fields:
```typescript
export type TestCase = {
  id: string
  featureId: string
  fieldValues: Record<string, any>
  generatedBy: GeneratedBy
  zephyrKey?: string | null    // add these
  zephyrId?: number | null     // add these
  createdAt: string
  updatedAt: string
}
```

### client/src/api/zephyr.ts

```typescript
import apiClient from './client'
import {
  ZephyrConnection,
  ZephyrExportResult,
  ZephyrFieldMapping,
} from '@/types/api'

export const zephyrAPI = {
  async getConnection(projectId: string): Promise<ZephyrConnection | null> {
    const res = await apiClient.get<{ connection: ZephyrConnection | null }>(
      `/projects/${projectId}/zephyr`
    )
    return res.data.connection
  },

  async saveConnection(
    projectId: string,
    data: {
      apiToken: string
      jiraProjectKey: string
      fieldMapping: ZephyrFieldMapping
    }
  ): Promise<ZephyrConnection> {
    const res = await apiClient.post<{ connection: ZephyrConnection }>(
      `/projects/${projectId}/zephyr`,
      data
    )
    return res.data.connection
  },

  async deleteConnection(projectId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/zephyr`)
  },

  async exportTestCases(
    featureId: string,
    testCaseIds: string[] | 'all'
  ): Promise<ZephyrExportResult> {
    const res = await apiClient.post<ZephyrExportResult>(
      `/features/${featureId}/testcases/export-zephyr`,
      { testCaseIds }
    )
    return res.data
  },
}
```

### client/src/components/ZephyrSetupPanel.tsx
Slide-in panel using the existing SlidePanel component.
Opened from the test cases page topbar when Zephyr is not connected.

Props:
```typescript
interface ZephyrSetupPanelProps {
  open: boolean
  onClose: () => void
  projectId: string
  templateFields: TestCaseField[]  // from testCaseStore.fields
  onConnected: (conn: ZephyrConnection) => void
}
```

Form fields:

1. Atlassian API Token (required)
   - type="password" input
   - Label: "Atlassian API Token"
   - Hint: "Get this from id.atlassian.com → Security → API tokens"
   - Helper link that opens https://id.atlassian.com/manage-profile/security/api-tokens

2. Jira Project Key (required)
   - text input, uppercase transform
   - Label: "Jira Project Key"
   - Placeholder: "MAP"
   - Hint: "The short code in your Jira project URL e.g. MAP, QA, DEV"

3. Field mapping section
   - Section label: "Map your template fields to Zephyr"
   - Sub: "Tell Regi which field contains each piece of information"
   - Render a mapping row for each Zephyr field:

   ```
   Zephyr "Test Name" *    →  [ dropdown of templateFields ]
   Zephyr "Test Steps" *   →  [ dropdown of templateFields ]
   Zephyr "Objective"      →  [ dropdown of templateFields ] optional
   Zephyr "Priority"       →  [ dropdown of templateFields ] optional
   Zephyr "Precondition"   →  [ dropdown of templateFields ] optional
   ```

   The dropdown options are built from templateFields:
   ```tsx
   <select>
     <option value="">— not mapped —</option>
     {templateFields.map(f => (
       <option key={f.key} value={f.key}>{f.name} ({f.key})</option>
     ))}
   </select>
   ```

   Auto-select sensible defaults on mount:
   - name → field with key containing "title" or "name"
   - steps → field with type === 'STEPS'
   - objective → field with key containing "expected" or "result"
   - priority → field with key containing "priority"
   - precondition → field with key containing "precondition"

Submit behaviour:
- Show spinner + "Testing connection..." while verifying
- On success: call zephyrAPI.saveConnection, show toast "Zephyr Scale connected", call onConnected, close panel
- On error: show inline error below the form — do not close

### client/src/components/ZephyrExportModal.tsx
Centred modal (not a slide panel — it is a decision/action modal).

Props:
```typescript
interface ZephyrExportModalProps {
  open: boolean
  onClose: () => void
  featureId: string
  featureName: string
  testCases: TestCase[]
  fields: TestCaseField[]
  jiraProjectKey: string
}
```

Layout: centred overlay with a white modal card, max-width 560px.

Two tabs at top:
- "Export All" — shows count
- "Export Selected" — shows selected count

#### Export All tab
Content:
- Summary line: "Export {count} test cases from '{featureName}' to Zephyr project {jiraProjectKey}"
- List of test cases (read-only):
  - Each row shows: TC number, the value from the `name` mapped field, Zephyr key badge if already exported
  - Already exported rows are muted with a green "↗ {key}" badge and cannot be re-exported
- Count of new (not yet in Zephyr) vs already exported

Footer:
- Cancel button
- "Export {newCount} to Zephyr →" primary button
  - Disabled if newCount === 0 (all already exported)

#### Export Selected tab
Same list but with checkboxes:
- Already-exported rows: checked, greyed out, cannot uncheck — labelled "Already in Zephyr ↗ {key}"
- New rows: checkbox, default unchecked
- "Select all" / "Deselect all" link at top
- Count: "{selectedCount} selected"

Footer:
- Cancel button  
- "Export {selectedCount} to Zephyr →" primary button (disabled if 0 selected)

#### Export in progress state
When export button clicked:
- Button shows spinner + "Exporting..."
- Each row gets a status icon that updates live:
  - ⏳ pending (grey)
  - ✓ exported (green) + the Zephyr key e.g. MAP-T1
  - ✕ failed (red) + short error message
- Cannot close modal while in progress (disable the X button)

#### Export complete state
- Show summary banner:
  - All success: "✓ {count} test cases exported to Zephyr Scale"
  - Partial: "{successCount} exported, {failCount} failed"
- For failed rows: show error text inline next to the ✕
- Footer changes to:
  - "Close" button
  - "View in Zephyr →" link that opens https://{your-company}.atlassian.net/projects/{jiraProjectKey}/boards

### client/src/pages/TestCasesPage.tsx
Update to add Zephyr functionality.

Add state:
```typescript
const [zephyrConn, setZephyrConn] = useState<ZephyrConnection | null>(null)
const [zephyrSetupOpen, setZephyrSetupOpen] = useState(false)
const [exportModalOpen, setExportModalOpen] = useState(false)
const [selectMode, setSelectMode] = useState(false)
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
```

On mount — check Zephyr connection status:
```typescript
useEffect(() => {
  if (!projectId) return
  zephyrAPI.getConnection(projectId).then(conn => {
    setZephyrConn(conn)
  }).catch(() => {})
}, [projectId])
```

Add Select button to topbar (appears when there are test cases):
```tsx
{testCases.length > 0 && (
  <button
    onClick={() => {
      setSelectMode(prev => !prev)
      setSelectedIds(new Set())
    }}
    className="btn-s text-[12px]"
  >
    {selectMode
      ? `Cancel (${selectedIds.size} selected)`
      : 'Select'
    }
  </button>
)}
```

Add Zephyr button to topbar:
```tsx
{zephyrConn ? (
  <button
    onClick={() => setExportModalOpen(true)}
    className="btn-s text-[12px] flex items-center gap-1.5"
  >
    ↗ Export to Zephyr
  </button>
) : (
  <button
    onClick={() => setZephyrSetupOpen(true)}
    className="btn-s text-[12px] text-[#888]"
  >
    ⚙ Connect Zephyr
  </button>
)}
```

Add checkboxes to table rows when selectMode is true:
```tsx
// Add a checkbox column before the field columns
{selectMode && (
  <td
    className="px-3 py-2 w-[40px] align-top"
    onClick={e => e.stopPropagation()}
  >
    <input
      type="checkbox"
      checked={selectedIds.has(tc.id)}
      onChange={() => {
        setSelectedIds(prev => {
          const next = new Set(prev)
          next.has(tc.id) ? next.delete(tc.id) : next.add(tc.id)
          return next
        })
      }}
      className="w-4 h-4 accent-[#4F46E5] cursor-pointer"
    />
  </td>
)}
```

Show Zephyr key badge on rows already exported:
```tsx
// In the row number / first cell, below the TC id:
{tc.zephyrKey && (
  <div className="text-[10px] text-[#059669] font-medium mt-0.5 flex items-center gap-1">
    <span>↗</span>
    <span>{tc.zephyrKey}</span>
  </div>
)}
```

Mount the panels at the bottom of the return:
```tsx
<ZephyrSetupPanel
  open={zephyrSetupOpen}
  onClose={() => setZephyrSetupOpen(false)}
  projectId={projectId!}
  templateFields={fields}
  onConnected={conn => {
    setZephyrConn(conn)
    setZephyrSetupOpen(false)
  }}
/>

{zephyrConn && (
  <ZephyrExportModal
    open={exportModalOpen}
    onClose={() => {
      setExportModalOpen(false)
      setSelectMode(false)
      setSelectedIds(new Set())
    }}
    featureId={featureId!}
    featureName={feature?.name || ''}
    testCases={testCases}
    fields={fields}
    jiraProjectKey={zephyrConn.jiraProjectKey}
  />
)}
```

---

## .env additions
Add to server `.env` and `.env.example` (if not already present):
```env
ZEPHYR_BASE_URL=https://api.zephyrscale.smartbear.com/v2
```

---

## After building — test in this exact order

### Setup
1. On a test cases page, click "⚙ Connect Zephyr"
2. Confirm ZephyrSetupPanel slides in from the right
3. Confirm the field mapping dropdowns are populated with your template fields
4. Confirm sensible defaults are pre-selected (test_title for name, etc.)
5. Enter your Atlassian API token and Jira project key
6. Click "Connect to Zephyr"
7. Confirm "Testing connection..." spinner appears
8. Confirm success toast: "Zephyr Scale connected"
9. Confirm the button in the topbar changes to "↗ Export to Zephyr"

### Export all
1. Click "↗ Export to Zephyr"
2. Confirm modal opens on "Export All" tab
3. Confirm all test cases are listed
4. Click "Export X to Zephyr →"
5. Confirm progress icons update live as each test case exports
6. Confirm summary: "X test cases exported to Zephyr Scale"
7. Open Zephyr Scale in Jira — confirm test cases appear in the project
8. Back in Regi — confirm each row now shows the Zephyr key badge e.g. "↗ MAP-T1"

### Export selected
1. Click "Select" in the topbar
2. Check 2 or 3 test cases
3. Click "↗ Export to Zephyr"
4. Confirm modal opens on "Export Selected" tab with those rows checked
5. Confirm only selected rows are exported
6. Confirm already-exported rows show as greyed out with Zephyr key

### Error handling
1. Enter an invalid API token → confirm "Could not connect" error in the panel
2. Try to export with no Zephyr connection → confirm "Connect Zephyr" prompt
3. Re-export an already-exported test case → confirm it is skipped with "Already in Zephyr" label

Fix all TypeScript errors before confirming done.
Update context/api-endpoints.md with the four new endpoints.

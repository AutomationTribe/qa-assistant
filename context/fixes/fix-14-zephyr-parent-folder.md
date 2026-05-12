# Fix 14 — Zephyr Export: Parent Folder Selection

## What this adds
User can optionally specify an existing Zephyr folder as a parent.
On export, the feature subfolder is created inside the selected parent.

Final folder structure:
```
/Sprint 1 (existing parent — user selects)
  └── /User can log in (created automatically — named after feature)
        └── TC-001 Successful login
        └── TC-002 Login with wrong password
```

If no parent is selected, the feature folder is created at the root
of the Zephyr project (existing behaviour).

---

## Server changes

### server/src/services/zephyrService.ts

#### Add getProjectFolders helper

Add this function to zephyrService. It fetches all existing TEST_CASE
folders for a project so the client can show them in a dropdown:

```typescript
async getProjectFolders(
  projectId: string,
  workspaceId: string
): Promise<Array<{ id: number; name: string; parentId: number | null }>> {
  // Verify ownership and get connection
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { zephyrConnection: true },
  })
  if (!project || project.workspaceId !== workspaceId) {
    throw new NotFoundError('Project not found')
  }
  const conn = project.zephyrConnection
  if (!conn) return []

  const apiToken = decrypt(conn.apiToken)

  try {
    const response = await axios.get(
      `${ZEPHYR_BASE}/folders?projectKey=${conn.jiraProjectKey}&folderType=TEST_CASE&maxResults=200`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
        validateStatus: s => s < 500,
      }
    )

    if (response.status !== 200) return []

    const values = response.data?.values || []
    return values.map((f: any) => ({
      id: f.id as number,
      name: f.name as string,
      parentId: f.parentId ?? null,
    }))
  } catch {
    return []
  }
}
```

#### Update createOrGetFolder to accept optional parentId

Replace the existing createOrGetFolder function:

```typescript
async createOrGetFolder(
  apiToken: string,
  jiraProjectKey: string,
  folderName: string,
  parentId?: number | null
): Promise<number | null> {
  try {
    const body: Record<string, any> = {
      projectKey: jiraProjectKey,
      name: folderName,
      folderType: 'TEST_CASE',
    }

    // If a parent folder ID is provided, create as subfolder
    if (parentId) {
      body.parentId = parentId
    }

    const response = await axios.post(
      `${ZEPHYR_BASE}/folders`,
      body,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
        validateStatus: s => s < 500,
      }
    )

    if (response.status === 201 || response.status === 200) {
      return response.data.id as number
    }

    // 400 may mean folder already exists — search for it
    if (response.status === 400) {
      const search = await axios.get(
        `${ZEPHYR_BASE}/folders?projectKey=${jiraProjectKey}&folderType=TEST_CASE&maxResults=200`,
        {
          headers: { Authorization: `Bearer ${apiToken}` },
          timeout: 10000,
        }
      )
      const values = search.data?.values || []

      // Match by name AND parentId if parent was specified
      const existing = parentId
        ? values.find(
            (f: any) => f.name === folderName && f.parentId === parentId
          )
        : values.find(
            (f: any) => f.name === folderName && !f.parentId
          )

      return existing?.id ?? null
    }

    return null
  } catch (err: any) {
    console.error('Folder creation error:', err?.response?.data || err.message)
    return null
  }
}
```

#### Update exportTestCases signature to accept parentFolderId

Change the function signature:

```typescript
async exportTestCases(
  featureId: string,
  testCaseIds: string[] | 'all',
  workspaceId: string,
  parentFolderId?: number | null   // add this optional param
)
```

Update the folder creation call inside the function to pass parentFolderId:

```typescript
const folderId = await this.createOrGetFolder(
  apiToken,
  jiraProjectKey,
  sanitisedFolderName,
  parentFolderId ?? null   // pass through
)
```

---

### server/src/controllers/zephyrController.ts

#### Add getFolders endpoint

```typescript
getFolders: async (req: Request, res: Response, next: NextFunction) => {
  try {
    const folders = await zephyrService.getProjectFolders(
      req.params.projectId,
      req.user!.workspaceId
    )
    return res.json({ folders })
  } catch (err) { next(err) }
},
```

#### Update exportTestCases to read parentFolderId from body

```typescript
exportTestCases: async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { testCaseIds, parentFolderId } = req.body
    // parentFolderId is optional — numeric Zephyr folder ID
    if (!testCaseIds) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'testCaseIds is required',
        },
      })
    }

    const result = await zephyrService.exportTestCases(
      req.params.featureId,
      testCaseIds,
      req.user!.workspaceId,
      parentFolderId ? Number(parentFolderId) : null
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
```

---

### server/src/routes/zephyr.ts

Add the new folders endpoint:

```typescript
/**
 * @swagger
 * /api/v1/projects/{projectId}/zephyr/folders:
 *   get:
 *     tags: [Zephyr]
 *     summary: Get existing Zephyr folders for a project
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of folders with id, name, parentId
 */
router.get(
  '/projects/:projectId/zephyr/folders',
  zephyrController.getFolders
)
```

---

## Client changes

### client/src/api/zephyr.ts

Add the folders API call:

```typescript
async getProjectFolders(
  projectId: string
): Promise<Array<{ id: number; name: string; parentId: number | null }>> {
  const res = await apiClient.get<{
    folders: Array<{ id: number; name: string; parentId: number | null }>
  }>(`/projects/${projectId}/zephyr/folders`)
  return res.data.folders
},

async exportTestCases(
  featureId: string,
  testCaseIds: string[] | 'all',
  parentFolderId?: number | null   // add this
): Promise<ZephyrExportResult> {
  const res = await apiClient.post<ZephyrExportResult>(
    `/features/${featureId}/testcases/export-zephyr`,
    { testCaseIds, parentFolderId: parentFolderId ?? null }
  )
  return res.data
},
```

---

### client/src/components/ZephyrExportModal.tsx

#### Add parent folder selector

Load folders when the modal opens:

```typescript
const [folders, setFolders] = useState<
  Array<{ id: number; name: string; parentId: number | null }>
>([])
const [loadingFolders, setLoadingFolders] = useState(false)
const [selectedParentFolderId, setSelectedParentFolderId] = useState<
  number | null
>(null)

useEffect(() => {
  if (!open || !projectId) return
  setLoadingFolders(true)
  zephyrAPI.getProjectFolders(projectId)
    .then(f => setFolders(f))
    .catch(() => setFolders([]))
    .finally(() => setLoadingFolders(false))
}, [open, projectId])
```

Build a readable folder tree for the dropdown. Folders with no parentId
are root folders. Indent child folders visually:

```typescript
// Build display list with indentation
function buildFolderOptions(
  folders: Array<{ id: number; name: string; parentId: number | null }>
): Array<{ id: number; label: string }> {
  const roots = folders.filter(f => !f.parentId)
  const children = folders.filter(f => !!f.parentId)

  const result: Array<{ id: number; label: string }> = []

  roots.forEach(root => {
    result.push({ id: root.id, label: root.name })
    children
      .filter(c => c.parentId === root.id)
      .forEach(child => {
        result.push({ id: child.id, label: `  ↳ ${child.name}` })
      })
  })

  return result
}
```

Add the folder selector UI above the test case list in the modal.
Place it in its own section with a label and a helper line:

```tsx
{/* Parent folder selector */}
<div className="mb-4">
  <label className="text-[12px] font-medium text-[#333] block mb-1.5">
    Group under folder
    <span className="text-[#C0C0BC] font-normal ml-1.5">optional</span>
  </label>

  {loadingFolders ? (
    <div className="text-[12px] text-[#aaa] py-2">
      Loading folders...
    </div>
  ) : (
    <div className="relative">
      <select
        value={selectedParentFolderId ?? ''}
        onChange={e =>
          setSelectedParentFolderId(
            e.target.value ? Number(e.target.value) : null
          )
        }
        className="w-full border border-[#D8D8D4] rounded-lg px-3 py-2 text-[13px] text-[#111] font-sans outline-none bg-white appearance-none cursor-pointer pr-8 focus:border-[#4F46E5]"
      >
        <option value="">— No parent folder (create at root) —</option>
        {buildFolderOptions(folders).map(opt => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] pointer-events-none text-[12px]">
        ▾
      </span>
    </div>
  )}

  {/* Preview of resulting structure */}
  <div className="mt-2 text-[11.5px] text-[#aaa] leading-relaxed">
    {selectedParentFolderId ? (
      <>
        Will create:{' '}
        <span className="font-mono text-[#4F46E5]">
          /{folders.find(f => f.id === selectedParentFolderId)?.name}
          {' / '}
          {featureName}
        </span>
      </>
    ) : (
      <>
        Will create:{' '}
        <span className="font-mono text-[#4F46E5]">
          /{featureName}
        </span>
        {' '}at project root
      </>
    )}
  </div>
</div>
```

Pass selectedParentFolderId to the export call:

```typescript
const handleExport = async (ids: string[] | 'all') => {
  setExporting(true)
  try {
    const result = await zephyrAPI.exportTestCases(
      featureId,
      ids,
      selectedParentFolderId   // pass selected parent
    )
    // handle result...
  } catch (err) {
    // handle error...
  }
}
```

---

## After applying all fixes

### Test 1 — No parent folder selected
1. Open export modal
2. Leave "Group under folder" as "No parent folder"
3. Export
4. Open Zephyr Scale → HOA project → Test Cases
5. Confirm folder named after feature appears at the root level

### Test 2 — Parent folder selected
1. Open export modal
2. Select an existing folder from the dropdown e.g. "Sprint 1"
3. Confirm the preview shows: /Sprint 1 / Feature Name
4. Export
5. Open Zephyr Scale → HOA → Test Cases → expand "Sprint 1"
6. Confirm "Feature Name" subfolder appears inside "Sprint 1"
7. Confirm test cases are inside the feature subfolder

### Test 3 — Empty folders list
1. If the HOA project has no folders yet, the dropdown shows only
   "No parent folder" option
2. Export still works — feature folder created at root

### Test curl — verify folders API works
```bash
curl http://localhost:3001/api/v1/projects/PROJECT_ID/zephyr/folders \
  -H "Authorization: Bearer REGI_TOKEN" \
  -s | json_pp
```

Expected:
```json
{
  "folders": [
    { "id": 12345, "name": "Sprint 1", "parentId": null },
    { "id": 12346, "name": "Regression", "parentId": null }
  ]
}
```

Fix all TypeScript errors before confirming done.
Do not touch any other files.

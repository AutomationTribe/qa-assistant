# Phase 5 — Features

## What we are building
When a user clicks on a project they land on the Features page.
A Feature is a user story or bug ticket title — the thing being tested.
Test cases are written directly against a Feature.
There is no separate Ticket model — Feature IS the ticket.

## Data hierarchy
Project → Feature → Test Cases

## Example features
- "User can log in with email and password" (type: New Feature)
- "Fix payment timeout on checkout" (type: Bug)
- "User can reset password via email" (type: New Feature)

## Page behaviour
- Two tabs: All | Draft
- All tab: shows every feature, has Add Feature button
- Draft tab: shows only features with status Draft, no Add Feature button
- Searchable by feature name or date
- Clicking a feature navigates to its test cases page (built in a later phase)
- Empty state when no features exist

---

## Database changes

### server/prisma/schema.prisma

Add Feature model:
```prisma
model Feature {
  id          String        @id @default(uuid())
  name        String
  type        FeatureType
  status      FeatureStatus @default(DRAFT)
  projectId   String
  project     Project       @relation(fields: [projectId], references: [id])
  testCases   TestCase[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  deletedAt   DateTime?
}

enum FeatureType {
  NEW_FEATURE
  BUG
}

enum FeatureStatus {
  DRAFT
  FINAL
}
```

Update Project model — add features relation:
```prisma
model Project {
  // ...existing fields
  features    Feature[]
}
```

Update TestCase model — link to Feature instead of Ticket:
```prisma
model TestCase {
  // ...existing fields
  featureId   String
  feature     Feature @relation(fields: [featureId], references: [id])
}
```

Remove Ticket model entirely if it exists — Feature replaces it.

Show migration SQL before running:
npx prisma migrate dev --create-only --name add-features

---

## Server files to create

### server/src/services/featureService.ts

listFeatures(projectId, workspaceId, filters?):
- Verify project belongs to workspace
- Accept optional filters:
  search: string — filters feature name (case insensitive contains)
  dateFrom: string — ISO date, filters createdAt >= dateFrom
  dateTo: string — ISO date, filters createdAt <= dateTo
  status: 'DRAFT' | 'FINAL' — filter by status
- Always exclude soft deleted (deletedAt is null)
- Order by createdAt descending
- Include _count: { testCases: true } for each feature
- Return features array

createFeature(projectId, workspaceId, { name, type }):
- Verify project belongs to workspace
- name: required, min 3 chars, max 200 chars
- type: required, must be NEW_FEATURE or BUG
- Create with status DRAFT by default
- Return created feature

updateFeature(featureId, workspaceId, { name?, type?, status? }):
- Verify feature belongs to a project in the workspace
- Update only provided fields
- Return updated feature

deleteFeature(featureId, workspaceId):
- Verify ownership
- Soft delete: set deletedAt = now()
- Return { message: 'Feature deleted' }

### server/src/controllers/featureController.ts
Thin controller — validate input with Zod, call service, return response.

list(req, res, next):
- projectId from req.params
- search, dateFrom, dateTo, status from req.query
- Return 200 { features: [] }

create(req, res, next):
Zod validation:
```typescript
const schema = z.object({
  name: z.string().min(3).max(200),
  type: z.enum(['NEW_FEATURE', 'BUG']),
})
```
- Return 201 { feature }

update(req, res, next):
- featureId from req.params
- Return 200 { feature }

remove(req, res, next):
- featureId from req.params
- Return 200 { message: 'Feature deleted' }

### server/src/routes/features.ts
All routes protected with authenticate middleware.

```
GET    /api/v1/projects/:projectId/features
POST   /api/v1/projects/:projectId/features
PATCH  /api/v1/projects/:projectId/features/:featureId
DELETE /api/v1/projects/:projectId/features/:featureId
```

Mount in server/src/routes/index.ts:
```typescript
import featureRouter from './features'
router.use('/projects/:projectId/features', featureRouter)
```

Update context/api-endpoints.md with all four endpoints.
Add Swagger JSDoc comments to every route.

---

## Client files to create

### client/src/types/api.ts
Add to existing file:

```typescript
export type FeatureType = 'NEW_FEATURE' | 'BUG'
export type FeatureStatus = 'DRAFT' | 'FINAL'

export type Feature = {
  id: string
  name: string
  type: FeatureType
  status: FeatureStatus
  projectId: string
  createdAt: string
  updatedAt: string
  _count?: {
    testCases: number
  }
}
```

### client/src/api/features.ts

```typescript
import apiClient from './client'
import { Feature } from '@/types/api'

interface ListFeaturesParams {
  search?: string
  dateFrom?: string
  dateTo?: string
  status?: 'DRAFT' | 'FINAL'
}

export const featuresAPI = {
  async listFeatures(projectId: string, params?: ListFeaturesParams): Promise<Feature[]> {
    const response = await apiClient.get<{ features: Feature[] }>(
      `/projects/${projectId}/features`,
      { params }
    )
    return response.data.features
  },

  async createFeature(
    projectId: string,
    data: { name: string; type: FeatureType }
  ): Promise<Feature> {
    const response = await apiClient.post<{ feature: Feature }>(
      `/projects/${projectId}/features`,
      data
    )
    return response.data.feature
  },

  async updateFeature(
    projectId: string,
    featureId: string,
    data: Partial<{ name: string; type: FeatureType; status: FeatureStatus }>
  ): Promise<Feature> {
    const response = await apiClient.patch<{ feature: Feature }>(
      `/projects/${projectId}/features/${featureId}`,
      data
    )
    return response.data.feature
  },

  async deleteFeature(projectId: string, featureId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/features/${featureId}`)
  },
}
```

### client/src/store/featureStore.ts

```typescript
import { create } from 'zustand'
import { Feature, FeatureType, FeatureStatus } from '@/types/api'
import { featuresAPI } from '@/api/features'

interface FeatureStore {
  features: Feature[]
  loading: boolean
  error: string | null
  fetchFeatures(projectId: string, params?: {
    search?: string
    dateFrom?: string
    dateTo?: string
    status?: FeatureStatus
  }): Promise<void>
  createFeature(projectId: string, data: { name: string; type: FeatureType }): Promise<void>
  updateFeature(projectId: string, featureId: string, data: Partial<Feature>): Promise<void>
  deleteFeature(projectId: string, featureId: string): Promise<void>
}

export const useFeatureStore = create<FeatureStore>((set, get) => ({
  features: [],
  loading: false,
  error: null,

  fetchFeatures: async (projectId, params) => {
    set({ loading: true, error: null })
    try {
      const features = await featuresAPI.listFeatures(projectId, params)
      set({ features, loading: false })
    } catch {
      set({ error: 'Failed to load features', loading: false })
    }
  },

  createFeature: async (projectId, data) => {
    const feature = await featuresAPI.createFeature(projectId, data)
    set(state => ({ features: [feature, ...state.features] }))
  },

  updateFeature: async (projectId, featureId, data) => {
    const feature = await featuresAPI.updateFeature(projectId, featureId, data)
    set(state => ({
      features: state.features.map(f => f.id === featureId ? feature : f)
    }))
  },

  deleteFeature: async (projectId, featureId) => {
    await featuresAPI.deleteFeature(projectId, featureId)
    set(state => ({
      features: state.features.filter(f => f.id !== featureId)
    }))
  },
}))
```

### client/src/pages/FeaturesPage.tsx
Route: /projects/:projectId/features

Layout: use Layout component (title="Features")

#### Top section
Breadcrumb: Projects › {project name} › Features
Right side: search bar + date picker + Add Feature button
Add Feature button only visible when active tab is "All"

#### Search and filter bar
- Text input: placeholder "Search features..."
  On change: debounce 300ms then call fetchFeatures with search param
- Date range: two date inputs — From and To
  On change: call fetchFeatures with dateFrom and dateTo params
- Both filters work together (search AND date range)

#### Tabs
Two tabs directly below the search bar:
- All — shows every feature regardless of status
- Draft — shows only features with status DRAFT

Active tab: indigo underline border, indigo text, font-medium
Inactive tab: muted text, no border

Tab switching:
- Clicking Draft calls fetchFeatures with { status: 'DRAFT' }
- Clicking All calls fetchFeatures with no status filter
- Preserve search and date filters when switching tabs

#### Table — All tab columns
| Column | Content |
|---|---|
| Feature Name | name, with type badge (New Feature / Bug) below |
| Type | NEW_FEATURE → "New Feature" badge (blue), BUG → "Bug" badge (red) |
| Date | createdAt formatted as "12 May 2026" |
| Test Cases | _count.testCases number, grey if 0 |
| Status | DRAFT badge (amber) or FINAL badge (green) |
| Actions | Edit and Delete icon buttons, visible on row hover |

Table behaviour:
- Clicking a row navigates to /projects/:projectId/features/:featureId/testcases
- Rows are sortable by clicking column headers (Date, Test Cases)
- Hover state: light background on row

#### Table — Draft tab columns
Same columns as All tab minus the Status column
(all rows are Draft so the column is redundant)

#### Empty state — no features yet
Centered card with:
- Icon: 📋
- Title: "No features yet"
- Subtitle: "Add a user story or bug title to start generating test cases"
- "Add Feature" primary button

#### Empty state — search returns no results
- Icon: 🔍
- Title: "No features match your search"
- Subtitle: "Try a different name or date range"
- "Clear filters" text button

#### Loading state
Show skeleton rows (3 grey animated placeholder rows) while fetching

### client/src/components/AddFeaturePanel.tsx
Slide-in panel from the right. Opens when Add Feature is clicked.

Panel width: 420px on desktop, full width on mobile

Fields:

1. Feature name (required)
   - Large textarea (not a single line input — feature names can be long)
   - Placeholder: "e.g. User can log in with email and password"
   - Min 3 chars, max 200 chars
   - Character counter shown bottom right of textarea
   - Hint: "Write this as a user story title or bug description"

2. Feature type (required)
   - Dropdown select
   - Options:
     - New Feature (default selected)
     - Bug
   - Show a coloured dot next to each option:
     New Feature → blue dot
     Bug → red dot

3. Project (required)
   - Dropdown select
   - Populated from projectStore — all projects in the workspace
   - Default: the current project (pre-selected based on URL param)
   - Changing project updates which project the feature is created under

Panel footer:
- Cancel button (secondary) — closes panel, clears form
- "Add Feature" primary button
  - Disabled until name and type are filled
  - Shows spinner while creating
  - On success: closes panel, feature appears at top of table
  - On error: shows inline error below the form

Validation:
- name: required, min 3, max 200
- type: required
- projectId: required (always pre-filled)

### client/src/App.tsx
Add new route:
```typescript
<Route
  path="/projects/:projectId/features"
  element={
    <ProtectedRoute>
      <FeaturesPage />
    </ProtectedRoute>
  }
/>
```

### client/src/pages/ProjectsPage.tsx
Update project card onClick:
- Change navigation from /generate to /projects/:id/features
- Clicking a project card now goes to the features page for that project

---

## UI design reference
Design mockup is at: ui/features-design.html
Open in browser to review before implementing.
The design follows the same system as ui/regi-ui-design.html.

---

## After building all files

Test this exact flow:

1. Run the Prisma migration — show SQL first, confirm before running
2. Restart the server: npm run dev in server/
3. Start the client: npm run dev in client/
4. Log in → click on a project
5. Confirm you land on /projects/:id/features
6. Confirm the empty state shows with "No features yet"
7. Click Add Feature
8. Confirm the slide-in panel appears from the right
9. Fill in:
   - Name: "User can log in with email and password"
   - Type: New Feature
   - Project: pre-selected (the current project)
10. Click Add Feature
11. Confirm the panel closes and the feature appears in the table
12. Confirm columns show: name, type badge, date, 0 test cases, Draft status
13. Click the Draft tab — confirm the feature appears there too
14. Search for "login" — confirm the feature appears in results
15. Search for "xyz" — confirm the empty search state shows
16. Click the feature row — confirm navigation to
    /projects/:projectId/features/:featureId/testcases
    (page does not need to exist yet — just confirm the URL changes)
17. Open browser console — zero red errors

Do not build the test cases page in this phase.
Do not move to Phase 6 until I confirm this works end to end.

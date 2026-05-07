# Fix 08 — Features Page Updates

## Changes to make

### Change 1 — Move Add Feature button to search row
The Add Feature button must sit on the same line as the search input
and date filters. Remove it from the topbar right side entirely.

In FeaturesPage.tsx find the topbar right section and remove the
Add Feature button from there.

Find the search row div and update it to include the button at the end:

```tsx
<div className="flex items-center gap-3 mb-4">
  {/* Search input */}
  <div className="relative flex-1 max-w-[280px]">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa] text-[13px]">🔍</span>
    <input
      className="w-full h-[34px] border border-[#D8D8D4] rounded-lg pl-8 pr-3 text-[12.5px] text-[#111] font-sans outline-none bg-white focus:border-[#4F46E5]"
      placeholder="Search features..."
      value={search}
      onChange={e => setSearch(e.target.value)}
    />
  </div>

  {/* Date from */}
  <span className="text-[12px] text-[#999]">From</span>
  <input
    type="date"
    className="h-[34px] border border-[#D8D8D4] rounded-lg px-3 text-[12px] text-[#555] font-sans outline-none bg-white cursor-pointer"
    value={dateFrom}
    onChange={e => setDateFrom(e.target.value)}
  />

  {/* Date to */}
  <span className="text-[12px] text-[#999]">To</span>
  <input
    type="date"
    className="h-[34px] border border-[#D8D8D4] rounded-lg px-3 text-[12px] text-[#555] font-sans outline-none bg-white cursor-pointer"
    value={dateTo}
    onChange={e => setDateTo(e.target.value)}
  />

  {/* Add Feature button — only visible on All tab */}
  {activeTab === 'all' && (
    <button
      onClick={() => setPanelOpen(true)}
      className="ml-auto flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white border-none rounded-lg px-4 h-[34px] text-[12.5px] font-medium cursor-pointer font-sans whitespace-nowrap transition-colors"
    >
      ＋ Add Feature
    </button>
  )}
</div>
```

---

### Change 2 — Show project name not project ID

In AddFeaturePanel.tsx the project dropdown must show the project name.
The value sent to the API is still the projectId but the display label
is the project name.

Find the project dropdown and update it:

```tsx
// Fetch projects from projectStore on mount
const { projects } = useProjectStore()

// In the select element:
<select
  value={selectedProjectId}
  onChange={e => setSelectedProjectId(e.target.value)}
  className="w-full border border-[#DDDDD9] rounded-lg px-3 py-2 text-[13px] ..."
>
  {projects.map(project => (
    <option key={project.id} value={project.id}>
      {project.name}
    </option>
  ))}
</select>
```

Pre-select the current project by default:
```tsx
// On mount, set selectedProjectId to the projectId from URL params
const { projectId } = useParams()
const [selectedProjectId, setSelectedProjectId] = useState(projectId || '')
```

---

### Change 3 — Slide animation on all panels (AddFeaturePanel and all future panels)

This animation must be added to every slide-in panel across the app.
The panel slides in from the right when opened and slides out when
closed (cancel or successful create).

#### Step A — Add CSS classes to index.css

Add these animation classes to client/src/index.css:

```css
/* Panel slide animations */
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOutRight {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

.panel-slide-in {
  animation: slideInRight 0.25s cubic-bezier(0.32, 0.72, 0, 1) forwards;
}

.panel-slide-out {
  animation: slideOutRight 0.25s cubic-bezier(0.32, 0.72, 0, 1) forwards;
}

.overlay-fade-in {
  animation: fadeIn 0.2s ease forwards;
}

.overlay-fade-out {
  animation: fadeOut 0.2s ease forwards;
}
```

#### Step B — Create a reusable SlidePanel component

Create client/src/components/ui/SlidePanel.tsx:

```tsx
import { useState, useEffect } from 'react'

interface SlidePanelProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  footer: React.ReactNode
  width?: string
}

export default function SlidePanel({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = '420px',
}: SlidePanelProps) {
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setVisible(true)
      setClosing(false)
      // Small delay so animation triggers after mount
      requestAnimationFrame(() => setAnimating(true))
    }
  }, [open])

  const handleClose = () => {
    // Start closing animation
    setClosing(true)
    // Wait for animation to finish before unmounting
    setTimeout(() => {
      setVisible(false)
      setAnimating(false)
      setClosing(false)
      onClose()
    }, 250)
  }

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end ${
        closing ? 'overlay-fade-out' : 'overlay-fade-in'
      }`}
      style={{ background: 'rgba(0,0,0,0.2)' }}
      onClick={e => {
        // Close when clicking the overlay background
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div
        className={`bg-white flex flex-col border-l border-[#EBEBEB] shadow-xl h-full ${
          closing ? 'panel-slide-out' : 'panel-slide-in'
        }`}
        style={{ width }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-0 relative flex-shrink-0">
          <button
            onClick={handleClose}
            className="absolute top-5 right-5 w-7 h-7 rounded-lg border border-[#D8D8D4] bg-white flex items-center justify-center cursor-pointer text-[13px] text-[#888] hover:bg-[#F5F5F3] transition-colors"
          >
            ✕
          </button>
          <h2 className="text-[16px] font-semibold text-[#111] mb-1">{title}</h2>
          {subtitle && (
            <p className="text-[13px] text-[#999] mb-6">{subtitle}</p>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {children}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#EBEBEB] flex gap-3 flex-shrink-0">
          {footer}
        </div>
      </div>
    </div>
  )
}
```

#### Step C — Update AddFeaturePanel.tsx to use SlidePanel

Replace the current panel markup with the SlidePanel component:

```tsx
import SlidePanel from '@/components/ui/SlidePanel'

// Props
interface AddFeaturePanelProps {
  open: boolean
  onClose: () => void
  projectId: string
}

export default function AddFeaturePanel({ open, onClose, projectId }: AddFeaturePanelProps) {
  // ... form state

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title="Add Feature"
      subtitle="Create a user story or bug to generate test cases against"
      footer={
        <>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-white text-[#444] border border-[#D0D0CC] rounded-lg text-[13px] cursor-pointer font-sans hover:bg-[#FAFAF8] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name || !type || loading}
            className="flex-[2] py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white border-none rounded-lg text-[13px] font-medium cursor-pointer font-sans transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" .../>
                Creating...
              </>
            ) : (
              'Add Feature →'
            )}
          </button>
        </>
      }
    >
      {/* Form fields go here */}
    </SlidePanel>
  )
}
```

#### Step D — Apply SlidePanel to CreateProjectModal too

The CreateProjectModal (Add Project panel) must also use the SlidePanel
component so it has the same slide animation.

Find CreateProjectModal.tsx and wrap its panel content with SlidePanel
the same way as AddFeaturePanel above.

---

### Change 4 — Manual features created with status FINAL

In server/src/services/featureService.ts find the createFeature function.
Change the default status from DRAFT to FINAL for manually created features:

```typescript
// createFeature — manually created by user
async createFeature(projectId, workspaceId, { name, type }) {
  // ... ownership check
  return prisma.feature.create({
    data: {
      name,
      type,
      status: 'FINAL',  // ← manual = FINAL
      projectId,
    }
  })
}
```

When Jira webhook creates features in Phase 6, that function will
explicitly pass status: 'DRAFT' to override this default.

---

### Change 5 — Actions column always visible

In FeaturesPage.tsx find the table row actions.
Remove the opacity-0 / group-hover:opacity-100 classes.
Actions must always be visible — no hover required.

Replace any hover-dependent action visibility with always-visible:

```tsx
// Remove these classes:
// opacity-0 group-hover:opacity-100 transition-opacity

// The actions cell should always render visibly:
<td className="w-[80px]">
  <div className="flex items-center gap-1.5">
    <button
      onClick={e => { e.stopPropagation(); handleEdit(feature) }}
      className="w-[26px] h-[26px] rounded-[6px] border border-[#E4E4E0] bg-white flex items-center justify-center cursor-pointer text-[11px] text-[#888] hover:bg-[#EEEDF8] hover:border-[#C4C2F4] hover:text-[#4F46E5] transition-all"
      title="Edit"
    >
      ✏
    </button>
    <button
      onClick={e => { e.stopPropagation(); handleDelete(feature.id) }}
      className="w-[26px] h-[26px] rounded-[6px] border border-[#E4E4E0] bg-white flex items-center justify-center cursor-pointer text-[11px] text-[#888] hover:bg-[#FEF2F2] hover:border-[#FECACA] hover:text-[#EF4444] transition-all"
      title="Delete"
    >
      🗑
    </button>
  </div>
</td>
```

Also add "Actions" as the column header:
```tsx
<th className="w-[80px] text-right pr-4">Actions</th>
```

---

## Update the UI design file

Also update ui/features-design.html to reflect all these changes:
- Add Feature button in the search row
- Actions column always visible (remove hover-only opacity)
- Status shows FINAL for manually created features

---

## After applying all fixes

Test this flow:

1. Open /projects/:id/features
2. Confirm Add Feature button is in the same row as search and dates
3. Click Add Feature — confirm panel slides in smoothly from right
4. Confirm project dropdown shows project names not IDs
5. Create a feature — confirm panel slides out smoothly after creation
6. Confirm the new feature has status FINAL in the table
7. Click Cancel on any panel — confirm it slides out smoothly
8. Open CreateProjectModal — confirm it also slides in and out
9. Confirm edit and delete icons are always visible in the Actions column
10. Hover over the icons — confirm hover colour changes work

Do not modify any server files except featureService.ts (status change).
Do not change any other client files except the ones listed above.
Fix all TypeScript errors before confirming done.

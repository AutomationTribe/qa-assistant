# Fix 23 (updated) — Zephyr Export: Auto-close + Success Toast

## Problem
handleExport sets exportComplete and shows a toast but never calls
onClose(). The modal stays open because there is no auto-close logic.

## Fix — client/src/components/ZephyrExportModal.tsx

### Step 1 — Add onExported to props interface

```typescript
interface ZephyrExportModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  featureId: string
  featureName: string
  testCases: TestCase[]
  fields: TestCaseField[]
  jiraProjectKey: string
  onExported?: () => void   // called after successful export to refresh test cases
}
```

Add onExported to the destructured props:
```typescript
export default function ZephyrExportModal({
  open,
  onClose,
  projectId,
  featureId,
  featureName,
  testCases,
  fields,
  jiraProjectKey,
  onExported,       // add this
}: ZephyrExportModalProps) {
```

### Step 2 — Replace the handleExport function entirely

Find the entire handleExport function and replace it with this:

```typescript
const handleExport = async () => {
  setIsExporting(true)
  setExportResults(new Map())
  setExportComplete(false)

  const casesToExport =
    currentTab === 'all'
      ? newCases.map(tc => tc.id)
      : Array.from(selectedIds)

  try {
    const result = await zephyrAPI.exportTestCases(
      featureId,
      casesToExport,
      selectedParentFolderId
    )

    const resultMap = new Map<string, ExportResult>()
    result.results.forEach(r => {
      resultMap.set(r.testCaseId, {
        status: r.success ? 'exported' : 'failed',
        zephyrKey: r.zephyrKey || undefined,
        error: r.error,
      })
    })
    setExportResults(resultMap)
    setExportComplete(true)

    if (result.failCount === 0) {
      // All succeeded — show toast then auto-close after 1.5 seconds
      const count = result.successCount
      toast.success(
        count === 1
          ? '1 test case exported to Zephyr Scale'
          : `${count} test cases exported to Zephyr Scale`
      )
      setTimeout(() => {
        onClose()
        if (onExported) onExported()
      }, 1500)
    } else if (result.successCount > 0) {
      // Partial — stay open so user can see failures
      toast.success(`${result.successCount} exported, ${result.failCount} failed — see details`)
    } else {
      // All failed — stay open
      toast.error('Export failed — see details below')
    }
  } catch (err: any) {
    const msg =
      err?.response?.data?.error?.message ||
      err.message ||
      'Export failed'
    toast.error(msg)
    setExportComplete(true)
  } finally {
    setIsExporting(false)
  }
}
```

The key change is the `setTimeout(() => { onClose(); if (onExported) onExported() }, 1500)`
inside the `failCount === 0` branch. This was missing entirely before.

### Step 3 — Pass onExported from TestCasesPage.tsx

In client/src/pages/TestCasesPage.tsx find the ZephyrExportModal
usage and add the onExported prop:

```tsx
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
  jiraProjectKey={zephyrConn!.jiraProjectKey}
  projectId={projectId!}
  onExported={() => {
    // Refresh test cases so Zephyr key badges appear on the rows
    fetchTestCases(featureId!)
  }}
/>
```

## After applying

1. Run an export with all test cases
2. Confirm the export runs and success icons appear on each row
3. Confirm the modal closes automatically after ~1.5 seconds
4. Confirm the toast appears: "X test cases exported to Zephyr Scale"
5. Confirm Zephyr key badges (↗ HPC-T5) appear on the test case rows

Only touch ZephyrExportModal.tsx and TestCasesPage.tsx.

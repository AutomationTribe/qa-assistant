import { useState, useMemo, useEffect } from 'react'
import { zephyrAPI } from '@/api/zephyr'
import { toast } from '@/store/toastStore'
import { TestCase, TestCaseField, ZephyrConnection } from '@/types/api'

interface ZephyrExportModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  featureId: string
  featureName: string
  testCases: TestCase[]
  fields: TestCaseField[]
  jiraProjectKey: string
  onExported?: () => void
}

type ExportStatus = 'pending' | 'exported' | 'failed'

interface ExportResult {
  status: ExportStatus
  zephyrKey?: string
  error?: string
}

export default function ZephyrExportModal({
  open,
  onClose,
  projectId,
  featureId,
  featureName,
  testCases,
  fields,
  jiraProjectKey,
  onExported,
}: ZephyrExportModalProps) {
  const [currentTab, setCurrentTab] = useState<'all' | 'selected'>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)
  const [exportResults, setExportResults] = useState<Map<string, ExportResult>>(
    new Map()
  )
  const [exportComplete, setExportComplete] = useState(false)
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
    zephyrAPI
      .getProjectFolders(projectId)
      .then(f => setFolders(f))
      .catch(() => setFolders([]))
      .finally(() => setLoadingFolders(false))
  }, [open, projectId])

  // Find the name field mapping key
  const nameField = useMemo(() => {
    const mapping = fields[0]?.key
    return mapping || 'id'
  }, [fields])

  // Filter test cases based on tab and selection
  const casesToShow = useMemo(() => {
    if (currentTab === 'all') {
      return testCases
    }
    return testCases.filter(tc => selectedIds.has(tc.id))
  }, [currentTab, testCases, selectedIds])

  // Count new (not yet exported) vs already exported
  const newCases = testCases.filter(tc => !tc.zephyrKey)
  const exportedCases = testCases.filter(tc => tc.zephyrKey)

  const newCountToExport = useMemo(() => {
    if (currentTab === 'all') {
      return newCases.length
    }
    return Array.from(selectedIds).filter(id => {
      const tc = testCases.find(t => t.id === id)
      return tc && !tc.zephyrKey
    }).length
  }, [currentTab, selectedIds, testCases, newCases])

  const selectedCountAll = useMemo(() => {
    return Array.from(selectedIds).filter(id => {
      const tc = testCases.find(t => t.id === id)
      return tc && !tc.zephyrKey
    }).length
  }, [selectedIds, testCases])

  // Scroll test case list when exporting
  const [scrollIntoView, setScrollIntoView] = useState<string | null>(null)

  const handleSelectAll = () => {
    const newIds = new Set(
      newCases.map(tc => tc.id)
    )
    setSelectedIds(newIds)
  }

  const handleDeselectAll = () => {
    setSelectedIds(new Set())
  }

  const handleToggleTestCase = (testCaseId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(testCaseId)) {
        next.delete(testCaseId)
      } else {
        next.add(testCaseId)
      }
      return next
    })
  }

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

  if (!open) return null

  function buildFolderOptions(
    folderList: Array<{ id: number; name: string; parentId: number | null }>
  ): Array<{ id: number; label: string }> {
    // Show only parent folders (parentId is null)
    return folderList
      .filter(f => !f.parentId)
      .map(f => ({ id: f.id, label: f.name }))
  }

  const successCount = Array.from(exportResults.values()).filter(
    r => r.status === 'exported'
  ).length
  const failCount = Array.from(exportResults.values()).filter(
    r => r.status === 'failed'
  ).length

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg max-w-[560px] w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header with tabs */}
        <div className="border-b border-[#EBEBEB]">
          <div className="px-6 pt-5 pb-3 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-[#111]">
              Export to Zephyr
            </h2>
            {!isExporting && (
              <button
                onClick={onClose}
                disabled={isExporting}
                className="text-[#999] hover:text-[#333] text-[20px] leading-none"
              >
                ×
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-0 px-6">
            <button
              onClick={() => {
                setCurrentTab('all')
                setExportResults(new Map())
                setExportComplete(false)
              }}
              disabled={isExporting || exportComplete}
              className={`px-4 py-3 text-[13px] font-medium border-b-2 transition-colors ${
                currentTab === 'all'
                  ? 'border-[#4F46E5] text-[#4F46E5]'
                  : 'border-transparent text-[#888] hover:text-[#333]'
              }`}
            >
              Export All {newCases.length > 0 && `(${newCases.length})`}
            </button>
            <button
              onClick={() => {
                setCurrentTab('selected')
                setExportResults(new Map())
                setExportComplete(false)
              }}
              disabled={isExporting || exportComplete}
              className={`px-4 py-3 text-[13px] font-medium border-b-2 transition-colors ${
                currentTab === 'selected'
                  ? 'border-[#4F46E5] text-[#4F46E5]'
                  : 'border-transparent text-[#888] hover:text-[#333]'
              }`}
            >
              Export Selected ({selectedIds.size})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Summary */}
          {!exportComplete && (
            <div className="text-[13px] text-[#666]">
              {currentTab === 'all' ? (
                <>
                  Export {newCases.length} test case{newCases.length !== 1 ? 's' : ''} from{' '}
                  <strong>{featureName}</strong> to Jira project{' '}
                  <strong>{jiraProjectKey}</strong>
                </>
              ) : (
                <>
                  Export {selectedCountAll} test case{selectedCountAll !== 1 ? 's' : ''} from{' '}
                  <strong>{featureName}</strong> to Jira project{' '}
                  <strong>{jiraProjectKey}</strong>
                </>
              )}
              {exportedCases.length > 0 && (
                <p className="text-[12px] text-[#999] mt-2">
                  {exportedCases.length} test case{exportedCases.length !== 1 ? 's' : ''} already exported
                </p>
              )}
            </div>
          )}

          {/* Summary banner after export */}
          {exportComplete && (
            <div
              className={`p-3 rounded-lg border ${
                failCount === 0
                  ? 'bg-green-50 border-green-200'
                  : 'bg-amber-50 border-amber-200'
              }`}
            >
              <p
                className={`text-[13px] font-medium ${
                  failCount === 0
                    ? 'text-green-700'
                    : 'text-amber-700'
                }`}
              >
                {failCount === 0
                  ? `✓ ${successCount} test case${successCount !== 1 ? 's' : ''} exported to Zephyr Scale`
                  : `${successCount} exported, ${failCount} failed`}
              </p>
            </div>
          )}

          {/* Parent folder selector */}
          {!exportComplete && (
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
                      {(() => {
                        const path: string[] = []
                        let folderId: number | null = selectedParentFolderId
                        while (folderId !== null) {
                          const folder = folders.find(f => f.id === folderId)
                          if (folder) {
                            path.unshift(folder.name)
                            folderId = folder.parentId
                          } else {
                            break
                          }
                        }
                        return '/' + path.join(' / ') + ' / ' + featureName
                      })()}
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
          )}

          {/* Select all / Deselect all for Selected tab */}
          {currentTab === 'selected' && !exportComplete && (
            <div className="flex gap-3 text-[12px]">
              <button
                onClick={handleSelectAll}
                className="text-[#4F46E5] hover:underline"
              >
                Select all
              </button>
              <button
                onClick={handleDeselectAll}
                className="text-[#4F46E5] hover:underline"
              >
                Deselect all
              </button>
            </div>
          )}

          {/* Test cases list */}
          <div className="space-y-2 bg-[#FAFAF8] rounded-lg p-3 border border-[#EBEBEB]">
            {casesToShow.length === 0 ? (
              <p className="text-[12px] text-[#999] py-2">
                {currentTab === 'all'
                  ? 'All test cases already exported'
                  : 'No test cases selected'}
              </p>
            ) : (
              casesToShow.map((tc, idx) => {
                const isAlreadyExported = Boolean(tc.zephyrKey)
                const exportResult = exportResults.get(tc.id)
                const nameValue =
                  String(tc.fieldValues[nameField] || `Test case ${idx + 1}`).substring(
                    0,
                    60
                  ) || `Test case ${idx + 1}`

                return (
                  <div
                    key={tc.id}
                    className={`flex items-start gap-3 p-2 rounded text-[12px] ${
                      isAlreadyExported && !exportResult
                        ? 'bg-white/40 opacity-60'
                        : 'bg-white'
                    }`}
                  >
                    {/* Checkbox for selected tab */}
                    {currentTab === 'selected' && !exportComplete && (
                      <input
                        type="checkbox"
                        checked={
                          isAlreadyExported
                            ? true
                            : selectedIds.has(tc.id)
                        }
                        onChange={() => {
                          if (!isAlreadyExported) {
                            handleToggleTestCase(tc.id)
                          }
                        }}
                        disabled={isAlreadyExported}
                        className="w-4 h-4 mt-1 accent-[#4F46E5] cursor-pointer disabled:opacity-50"
                      />
                    )}

                    {/* Status icon during export */}
                    {isExporting || exportComplete ? (
                      <div className="w-4 h-4 mt-1 flex items-center justify-center">
                        {exportResult?.status === 'pending' ? (
                          <span className="inline-block w-3 h-3 border-2 border-[#999] border-t-transparent rounded-full animate-spin" />
                        ) : exportResult?.status === 'exported' ? (
                          <span className="text-green-600 text-[14px]">✓</span>
                        ) : exportResult?.status === 'failed' ? (
                          <span className="text-red-600 text-[14px]">✕</span>
                        ) : isAlreadyExported ? (
                          <span className="text-green-600 text-[14px]">↗</span>
                        ) : null}
                      </div>
                    ) : null}

                    {/* Test case info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[#666] font-medium">
                          TC-{(idx + 1).toString().padStart(2, '0')}
                        </span>
                        <span className="text-[#333] truncate">
                          {nameValue}
                        </span>
                      </div>

                      {/* Zephyr key badge or already exported label */}
                      {isAlreadyExported && !exportResult ? (
                        <div className="text-[10px] text-green-700 mt-1 flex items-center gap-1">
                          <span>↗</span>
                          <span className="font-medium">{tc.zephyrKey}</span>
                          <span className="text-[#999]">Already in Zephyr</span>
                        </div>
                      ) : exportResult?.status === 'exported' ? (
                        <div className="text-[10px] text-green-700 mt-1 flex items-center gap-1">
                          <span>↗</span>
                          <span className="font-medium">
                            {exportResult.zephyrKey}
                          </span>
                        </div>
                      ) : exportResult?.status === 'failed' ? (
                        <div className="text-[10px] text-red-700 mt-1 flex items-center gap-1">
                          <span>✕</span>
                          <span className="truncate">
                            {exportResult.error || 'Unknown error'}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#EBEBEB] px-6 py-4 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="flex-1 py-2.5 bg-white text-[#444] border border-[#D0D0CC] rounded-lg text-[13px] cursor-pointer font-sans hover:bg-[#FAFAF8] disabled:opacity-50 transition-colors"
          >
            {exportComplete ? 'Close' : 'Cancel'}
          </button>

          {exportComplete && exportedCases.length > 0 ? (
            <a
              href={`https://${jiraProjectKey.toLowerCase()}.atlassian.net/projects/${jiraProjectKey}/board`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-[1.5] py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white border-none rounded-lg text-[13px] font-medium cursor-pointer font-sans transition-colors text-center"
            >
              View in Zephyr →
            </a>
          ) : (
            <button
              onClick={handleExport}
              disabled={
                isExporting ||
                (currentTab === 'all' ? newCases.length === 0 : selectedCountAll === 0) ||
                exportComplete
              }
              className="flex-[1.5] py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white border-none rounded-lg text-[13px] font-medium cursor-pointer font-sans transition-colors flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Exporting...
                </>
              ) : (
                `Export ${
                  currentTab === 'all' ? newCases.length : selectedCountAll
                } to Zephyr →`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

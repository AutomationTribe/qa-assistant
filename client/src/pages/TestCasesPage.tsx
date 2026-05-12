import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useTestCaseStore } from '@/store/testCaseStore'
import { useToastStore } from '@/store/toastStore'
import { useProjectStore } from '@/store/projectStore'
import { useFeatureStore } from '@/store/featureStore'
import { TestCaseField, ZephyrConnection } from '@/types/api'
import { zephyrAPI } from '@/api/zephyr'
import Layout from '@/components/Layout'
import ZephyrExportModal from '@/components/ZephyrExportModal'

export default function TestCasesPage() {
  const { projectId, featureId } = useParams<{ projectId: string; featureId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()

  const { testCases, fields, loading, generating, fetchTestCases, generateTestCases, updateTestCase, deleteTestCase } = useTestCaseStore()
  const { success: showSuccess, error: showError } = useToastStore()
  const { projects } = useProjectStore()
  const { features } = useFeatureStore()

  const project = projects.find(p => p.id === projectId)
  const feature = features.find(f => f.id === featureId)

  const [allEditMode, setAllEditMode] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Record<string, any>>>({})
  const [zephyrConn, setZephyrConn] = useState<ZephyrConnection | null>(null)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const shouldGenerate = searchParams.get('generate') === 'true'

  useEffect(() => {
    if (!featureId) return

    if (shouldGenerate) {
      navigate(location.pathname, { replace: true })
      handleGenerate()
    } else {
      fetchTestCases(featureId)
    }
  }, [featureId])

  useEffect(() => {
    if (!projectId) return
    zephyrAPI.getConnection(projectId).then(conn => {
      setZephyrConn(conn)
    }).catch(() => {})
  }, [projectId])

  const handleGenerate = async () => {
    if (!featureId) return
    setAllEditMode(true)
    try {
      const { testCases: generated } = await generateTestCases(featureId)
      const initial: Record<string, Record<string, any>> = {}
      generated.forEach(tc => {
        initial[tc.id] = { ...tc.fieldValues }
      })
      setDrafts(initial)
      showSuccess(`${generated.length} test cases generated — review and save`)
    } catch (err: any) {
      setAllEditMode(false)
      showError(
        err?.response?.data?.error?.message || 'Generation failed. Please try again.'
      )
    }
  }

  const handleSaveAll = async () => {
    try {
      await Promise.all(
        testCases.map(tc => {
          const draft = drafts[tc.id]
          if (!draft) return Promise.resolve()
          return updateTestCase(tc.id, draft)
        })
      )
      setAllEditMode(false)
      setDrafts({})
      showSuccess('All test cases saved')
    } catch {
      showError('Failed to save some test cases. Please try again.')
    }
  }

  const handleSaveOne = async (id: string) => {
    const draft = drafts[id]
    if (!draft) {
      setEditingId(null)
      return
    }
    try {
      await updateTestCase(id, draft)
      setEditingId(null)
      const next = { ...drafts }
      delete next[id]
      setDrafts(next)
      showSuccess('Test case updated')
    } catch {
      showError('Failed to save test case')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteTestCase(id)
      setDeletingId(null)
      showSuccess('Test case deleted')
    } catch {
      showError('Failed to delete test case')
    }
  }

  const actions = (
    <div className="flex items-center gap-3">
      {allEditMode && testCases.length > 0 && (
        <button
          onClick={handleSaveAll}
          className="bg-[#059669] hover:bg-[#047857] text-white border-none rounded-lg px-3 py-1.5 text-[12.5px] font-medium cursor-pointer font-sans flex items-center gap-1.5"
        >
          ✓ Save all
        </button>
      )}
      {testCases.length > 0 && (
        <button
          onClick={() => {
            setSelectMode(prev => !prev)
            setSelectedIds(new Set())
          }}
          className="flex items-center gap-2 bg-white text-[#111] border border-[#D8D8D4] rounded-lg px-4 h-[36px] text-[12.5px] font-medium cursor-pointer hover:bg-[#FAFAF8] transition-colors"
        >
          {selectMode ? `Cancel (${selectedIds.size} selected)` : 'Select'}
        </button>
      )}
      {testCases.length > 0 && zephyrConn && (
        <button
          onClick={() => setExportModalOpen(true)}
          className="flex items-center gap-2 bg-white text-[#111] border border-[#D8D8D4] rounded-lg px-4 h-[36px] text-[12.5px] font-medium cursor-pointer hover:bg-[#FAFAF8] transition-colors"
        >
          ↗ Export to Zephyr
        </button>
      )}
      <button
        onClick={() => navigate(`/projects/${projectId}/template`)}
        className="flex items-center gap-2 bg-white text-[#111] border border-[#D8D8D4] rounded-lg px-4 h-[36px] text-[12.5px] font-medium cursor-pointer hover:bg-[#FAFAF8] transition-colors"
      >
        ⚙️ Template
      </button>
    </div>
  )

  return (
    <Layout
      title="Test Cases"
      actions={actions}
    >
      <div>
        {/* Breadcrumb */}
        <div className="mb-6 text-sm text-[#999]">
          <button
            onClick={() => navigate('/projects')}
            className="text-[#999] hover:text-[#4F46E5] cursor-pointer transition-colors"
          >
            Projects
          </button>
          <span className="mx-2 text-[#D0D0CC]">›</span>
          <button
            onClick={() => navigate(`/projects/${projectId}/features`)}
            className="text-[#111] font-medium hover:text-[#4F46E5] cursor-pointer transition-colors"
          >
            {project?.name || 'Project'}
          </button>
          <span className="mx-2 text-[#D0D0CC]">›</span>
          <button
            onClick={() => navigate(`/projects/${projectId}/features/${featureId}/testcases`)}
            className="text-[#111] font-medium hover:text-[#4F46E5] cursor-pointer transition-colors"
          >
            {feature?.name || 'Feature'}
          </button>
          <span className="mx-2 text-[#D0D0CC]">›</span>
          <span className="text-[#111] font-medium">Test Cases</span>
        </div>

            {allEditMode && !generating && testCases.length > 0 && (
              <div className="bg-[#F0EFFD] border border-[#C4C2F4] rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
                <span className="text-[#4F46E5] text-[16px] flex-shrink-0">✦</span>
                <div className="flex-1">
                  <div className="text-[13px] font-medium text-[#4F46E5]">
                    {testCases.length} test cases generated — review and edit before saving
                  </div>
                  <div className="text-[12px] text-[#6B64D0] mt-0.5">
                    All fields are editable. Click Save all when you are done.
                  </div>
                </div>
                <button
                  onClick={handleSaveAll}
                  className="bg-[#4F46E5] hover:bg-[#4338CA] text-white border-none rounded-lg px-4 py-2 text-[12.5px] font-medium cursor-pointer font-sans flex-shrink-0"
                >
                  Save all →
                </button>
              </div>
            )}

            {generating && (
              <div className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-[#FAFAF8] border-b border-[#EBEBEB] flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-[#EEEDF8] border-t-[#4F46E5] rounded-full animate-spin" />
                  <span className="text-[12.5px] text-[#4F46E5] font-medium animate-pulse">
                    Generating test cases with AI...
                  </span>
                </div>
                <table className="w-full">
                  <tbody>
                    {[1, 2, 3, 4].map(i => (
                      <tr key={i} className="border-b border-[#F2F2EF]">
                        {[...Array((fields.length || 4) + 2)].map((_, j) => (
                          <td key={j} className="px-3 py-3">
                            <div
                              className="h-3 rounded bg-gradient-to-r from-[#F0F0ED] via-[#E8E8E5] to-[#F0F0ED] animate-pulse"
                              style={{ width: `${40 + Math.random() * 40}%` }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && !generating && testCases.length === 0 && (
              <div className="flex items-center justify-center py-16">
                <div className="text-center max-w-[360px]">
                  <div className="w-14 h-14 rounded-2xl bg-[#EEEDF8] flex items-center justify-center text-2xl mx-auto mb-4">
                    ✓
                  </div>
                  <h3 className="text-[16px] font-semibold text-[#111] mb-2">
                    No test cases yet
                  </h3>
                  <p className="text-[13px] text-[#888] leading-relaxed mb-6">
                    Generate them with AI or add them manually.
                  </p>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleGenerate}
                      className="bg-[#4F46E5] hover:bg-[#4338CA] text-white border-none rounded-lg px-5 py-2.5 text-[13px] font-medium cursor-pointer font-sans"
                    >
                      ✦ Generate with AI
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!loading && !generating && testCases.length > 0 && (
              <div className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#EBEBEB] bg-[#FAFAF8]">
                      {selectMode && (
                        <th className="px-3 py-3 text-center w-[40px]" />
                      )}
                      <th className="px-3 py-3 text-left text-[12px] font-semibold text-[#666] font-mono">#</th>
                      {fields.map(field => (
                        <th key={field.key} className="px-3 py-3 text-left text-[12px] font-semibold text-[#666]">
                          {field.name}
                        </th>
                      ))}
                      <th className="px-3 py-3 text-right text-[12px] font-semibold text-[#666]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testCases.map((tc, index) => {
                      const isEditing = allEditMode || editingId === tc.id
                      const isDeleting = deletingId === tc.id
                      const draft = drafts[tc.id] || tc.fieldValues

                      if (isDeleting) {
                        return (
                          <tr key={tc.id} className="bg-[#FEF2F2]">
                            <td colSpan={fields.length + 2} className="px-3 py-3">
                              <div className="flex items-center gap-3 text-[12.5px] text-[#DC2626]">
                                <span className="text-[15px]">⚠</span>
                                Delete this test case? This cannot be undone.
                                <button onClick={() => handleDelete(tc.id)} className="bg-[#DC2626] hover:bg-[#991B1B] text-white border-none rounded-lg px-3 py-1 text-[12px] font-medium cursor-pointer">
                                  Yes, delete
                                </button>
                                <button onClick={() => setDeletingId(null)} className="bg-white text-[#DC2626] border border-[#DC2626] rounded-lg px-3 py-1 text-[12px] font-medium cursor-pointer">
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      }

                      return (
                        <tr
                          key={tc.id}
                          className={isEditing ? 'bg-[#FAFAFE]' : 'hover:bg-[#FAFAF9] border-b border-[#EBEBEB]'}
                        >
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
                          <td className="px-3 py-2 text-[11px] text-[#C0C0BC] font-mono align-top">
                            <div>
                              {String(index + 1).padStart(2, '0')}
                            </div>
                            {tc.zephyrKey && (
                              <div className="text-[10px] text-[#059669] font-medium mt-0.5 flex items-center gap-1">
                                <span>↗</span>
                                <span>{tc.zephyrKey}</span>
                              </div>
                            )}
                          </td>

                          {fields.map(field => (
                            <td key={field.key} className="px-3 py-2 align-top">
                              {isEditing
                                ? renderEditCell(field, draft[field.key], (val) => {
                                    setDrafts(prev => ({
                                      ...prev,
                                      [tc.id]: { ...prev[tc.id], [field.key]: val }
                                    }))
                                  })
                                : renderReadCell(field, tc.fieldValues[field.key])
                              }
                            </td>
                          ))}

                          <td className="px-3 py-2 text-right align-top">
                            {isEditing ? (
                              <div className="flex gap-2 justify-end">
                                {!allEditMode && (
                                  <>
                                    <button onClick={() => handleSaveOne(tc.id)} className="bg-[#4F46E5] hover:bg-[#4338CA] text-white border-none rounded-lg px-2 py-1 text-[12px] font-medium cursor-pointer">
                                      Save
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="bg-white text-[#444] border border-[#D0D0CC] rounded-lg px-2 py-1 text-[12px] font-medium cursor-pointer">
                                      Cancel
                                    </button>
                                  </>
                                )}
                              </div>
                            ) : (
                              <div className="flex gap-1.5 justify-end">
                                <button
                                  onClick={() => {
                                    setEditingId(tc.id)
                                    setDrafts(prev => ({ ...prev, [tc.id]: { ...tc.fieldValues } }))
                                  }}
                                  className="text-[14px] hover:bg-[#F5F5F3] p-1.5 rounded cursor-pointer"
                                  title="Edit"
                                >
                                  ✏
                                </button>
                                <button
                                  onClick={() => setDeletingId(tc.id)}
                                  className="text-[14px] hover:bg-[#F5F5F3] p-1.5 rounded cursor-pointer"
                                  title="Delete"
                                >
                                  🗑
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

        {zephyrConn && (
          <ZephyrExportModal
            open={exportModalOpen}
            onClose={() => {
              setExportModalOpen(false)
              setSelectMode(false)
              setSelectedIds(new Set())
            }}
            projectId={projectId!}
            featureId={featureId!}
            featureName={feature?.name || ''}
            testCases={testCases}
            fields={fields}
            jiraProjectKey={zephyrConn.jiraProjectKey}
          />
        )}
          </div>
    </Layout>
  )
}

function renderReadCell(field: TestCaseField, value: any): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-[#C0C0BC] text-[12px]">—</span>
  }

  switch (field.type) {
    case 'STEPS':
      const steps = Array.isArray(value) ? value : [String(value)]
      const visible = steps.slice(0, 3)
      return (
        <div className="text-[12px] text-[#555] leading-relaxed">
          {visible.map((s, i) => (
            <div key={i} className="flex gap-1.5">
              <span className="text-[#C0C0BC] flex-shrink-0 text-[11px] pt-px">{i + 1}.</span>
              <span>{s}</span>
            </div>
          ))}
          {steps.length > 3 && (
            <div className="text-[11px] text-[#C0C0BC] mt-1">+{steps.length - 3} more</div>
          )}
        </div>
      )

    case 'SELECT':
      return (
        <span className="inline-flex items-center text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-[#F0F0ED] text-[#555]">
          {String(value)}
        </span>
      )

    case 'BOOLEAN':
      return (
        <span className={`inline-flex items-center text-[10.5px] font-medium px-2 py-0.5 rounded-full ${
          value ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#F5F5F3] text-[#888]'
        }`}>
          {value ? 'Yes' : 'No'}
        </span>
      )

    case 'MULTISELECT':
      const vals = Array.isArray(value) ? value : [String(value)]
      return (
        <div className="flex flex-wrap gap-1">
          {vals.map((v, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[#F0F0ED] text-[#555]">
              {v}
            </span>
          ))}
        </div>
      )

    case 'NUMBER':
      return <span className="text-[13px] font-medium text-[#111]">{value}</span>

    default:
      const str = String(value)
      return (
        <span className="text-[12.5px] text-[#333] leading-relaxed line-clamp-2">
          {str}
        </span>
      )
  }
}

function renderEditCell(
  field: TestCaseField,
  value: any,
  onChange: (val: any) => void
): React.ReactNode {
  switch (field.type) {
    case 'STEPS':
      const stepsVal = Array.isArray(value) ? value.join('\n') : String(value || '')
      return (
        <textarea
          className="w-full border border-[#4F46E5] rounded-lg px-2 py-1.5 text-[12px] font-sans outline-none bg-white resize-none leading-relaxed min-h-[80px]"
          value={stepsVal}
          placeholder="One step per line"
          onChange={e => onChange(e.target.value.split('\n').filter(s => s.trim()))}
        />
      )

    case 'SELECT':
      return (
        <select
          className="border border-[#4F46E5] rounded-lg px-2 py-1.5 text-[12.5px] font-sans outline-none bg-white cursor-pointer"
          value={String(value || '')}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Select...</option>
          {(field.options || []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )

    case 'BOOLEAN':
      return (
        <button
          onClick={() => onChange(!value)}
          className={`text-[12px] px-3 py-1 rounded-lg border font-medium transition-all ${
            value
              ? 'bg-[#ECFDF5] border-[#6EE7B7] text-[#059669]'
              : 'bg-[#F5F5F3] border-[#D0D0CC] text-[#888]'
          }`}
        >
          {value ? 'Yes' : 'No'}
        </button>
      )

    case 'NUMBER':
      return (
        <input
          type="number"
          className="w-[80px] border border-[#4F46E5] rounded-lg px-2 py-1.5 text-[12.5px] font-sans outline-none bg-white"
          value={value ?? ''}
          onChange={e => onChange(Number(e.target.value))}
        />
      )

    case 'TEXTAREA':
      return (
        <textarea
          className="w-full border border-[#4F46E5] rounded-lg px-2 py-1.5 text-[12.5px] font-sans outline-none bg-white resize-none leading-relaxed min-h-[64px]"
          value={String(value || '')}
          onChange={e => onChange(e.target.value)}
        />
      )

    default:
      return (
        <input
          type="text"
          className="w-full border border-[#4F46E5] rounded-lg px-2 py-1.5 text-[12.5px] font-sans outline-none bg-white"
          value={String(value || '')}
          onChange={e => onChange(e.target.value)}
        />
      )
  }
}

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


function parseSteps(raw: any): Array<{ action: string; data: string; expected: string }> {
  if (!raw) return [{ action: '', data: '', expected: '' }]
  const arr: string[] = Array.isArray(raw) ? raw : [String(raw)]
  return arr.map(s => {
    const parts = String(s || '').split('|').map(p => p.trim())
    return {
      action: parts[0] || '',
      data: parts[1] || '',
      expected: parts[2] || '',
    }
  })
}

function findStepsKey(fields: TestCaseField[]): string {
  return fields.find(f => f.type === 'STEPS')?.key || 'steps'
}

function findObjectiveKey(fields: TestCaseField[]): string | null {
  return fields.find(f =>
    f.key.includes('objective') || f.key.includes('expected_result')
  )?.key || null
}

function findPreconditionsKey(fields: TestCaseField[]): string | null {
  return fields.find(f =>
    f.key.includes('precondition') || f.key.includes('pre_condition')
  )?.key || null
}

function findNameKey(fields: TestCaseField[]): string | null {
  return fields.find(f =>
    f.key.includes('name') || f.key.includes('title')
  )?.key || null
}

function findPriorityKey(fields: TestCaseField[]): string | null {
  return fields.find(f => f.key.includes('priority'))?.key || null
}

function findTypeKey(fields: TestCaseField[]): string | null {
  return fields.find(f => f.key.includes('type'))?.key || null
}

function getOtherFields(fields: TestCaseField[]): TestCaseField[] {
  const stepsKey = findStepsKey(fields)
  const objKey = findObjectiveKey(fields)
  const preKey = findPreconditionsKey(fields)
  const nameKey = findNameKey(fields)
  const priorityKey = findPriorityKey(fields)
  const typeKey = findTypeKey(fields)

  const excludedKeys = [stepsKey, objKey, preKey, nameKey, priorityKey, typeKey].filter(Boolean)
  return fields.filter(f => !excludedKeys.includes(f.key))
}

export default function TestCasesPage() {
  const { projectId, featureId } = useParams<{ projectId: string; featureId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()

  const { testCases, fields, loading, generating, fetchTestCases, generateTestCases, updateTestCase, deleteTestCase } = useTestCaseStore()
  const { success: showSuccess, error: showError } = useToastStore()
  const { projects } = useProjectStore()
  const { features } = useFeatureStore()

  const project = projects.find(p => p.id === projectId)
  const feature = features.find(f => f.id === featureId)

  const [allEditMode, setAllEditMode] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Record<string, any>>>({})
  const [zephyrConn, setZephyrConn] = useState<ZephyrConnection | null>(null)
  const [exportModalOpen, setExportModalOpen] = useState(false)

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
    if (allEditMode && testCases.length > 0) {
      const ids = new Set(testCases.map(tc => tc.id))
      setExpandedIds(ids)
      const init: Record<string, Record<string, any>> = {}
      testCases.forEach(tc => { init[tc.id] = { ...tc.fieldValues } })
      setDrafts(init)
    }
  }, [testCases, allEditMode])

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
      showSuccess(`${generated.length} test cases generated — review and save`)
    } catch (err: any) {
      setAllEditMode(false)
      showError(
        err?.response?.data?.error?.message || 'Generation failed. Please try again.'
      )
    }
  }

  const toggleExpand = (id: string) => {
    if (allEditMode) return
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    if (!expandedIds.has(id)) {
      const tc = testCases.find(t => t.id === id)
      if (tc) {
        setDrafts(prev => ({ ...prev, [id]: { ...tc.fieldValues } }))
      }
    }
  }

  const updateDraft = (id: string, key: string, value: any) => {
    setDrafts(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [key]: value }
    }))
  }

  const updateStep = (id: string, stepIndex: number, part: 'action' | 'data' | 'expected', value: string) => {
    const draft = drafts[id] || testCases.find(tc => tc.id === id)?.fieldValues || {}
    const stepsKey = findStepsKey(fields)
    const steps: string[] = [...(draft[stepsKey] || [])]

    const parts = (steps[stepIndex] || '').split('|').map(s => s.trim())
    while (parts.length < 3) parts.push('')

    if (part === 'action') parts[0] = value
    if (part === 'data') parts[1] = value
    if (part === 'expected') parts[2] = value

    steps[stepIndex] = parts.join(' | ')
    updateDraft(id, stepsKey, steps)
  }

  const addStep = (id: string) => {
    const draft = drafts[id] || {}
    const stepsKey = findStepsKey(fields)
    const steps = [...(draft[stepsKey] || []), ' | | ']
    updateDraft(id, stepsKey, steps)
  }

  const removeStep = (id: string, stepIndex: number) => {
    const draft = drafts[id] || {}
    const stepsKey = findStepsKey(fields)
    const steps = [...(draft[stepsKey] || [])]
    steps.splice(stepIndex, 1)
    updateDraft(id, stepsKey, steps)
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
      setExpandedIds(new Set())
      setDrafts({})
      showSuccess('All test cases saved')
    } catch {
      showError('Failed to save some test cases. Please try again.')
    }
  }

  const handleSaveOne = async (id: string) => {
    const draft = drafts[id]
    if (!draft) {
      setExpandedIds(prev => { const n = new Set(prev); n.delete(id); return n })
      return
    }
    try {
      await updateTestCase(id, draft)
      setExpandedIds(prev => { const n = new Set(prev); n.delete(id); return n })
      const next = { ...drafts }
      delete next[id]
      setDrafts(next)
      showSuccess('Test case saved')
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
    <div className="flex items-center gap-2">
      {allEditMode && testCases.length > 0 && (
        <button
          onClick={handleSaveAll}
          className="bg-[#059669] hover:bg-[#047857] text-white border-none rounded-lg px-3 py-1.5 text-[12px] font-medium cursor-pointer font-sans flex items-center gap-1.5"
        >
          ✓ Save all
        </button>
      )}
      {testCases.length > 0 && (
        <button
          onClick={handleGenerate}
          className="flex items-center gap-1.5 bg-white text-[#111] border border-[#D8D8D4] rounded-lg px-3 py-1.5 text-[12px] font-medium cursor-pointer hover:bg-[#FAFAF8] transition-colors"
        >
          ✦ Regenerate
        </button>
      )}
      {zephyrConn ? (
        <button
          onClick={() => setExportModalOpen(true)}
          className="flex items-center gap-1.5 bg-white text-[#111] border border-[#D8D8D4] rounded-lg px-3 py-1.5 text-[12px] font-medium cursor-pointer hover:bg-[#FAFAF8] transition-colors"
        >
          ↗ Export to Zephyr
        </button>
      ) : (
        <button
          onClick={() => navigate(`/projects/${projectId}/template`)}
          className="flex items-center gap-1.5 bg-white text-[#888] border border-[#D8D8D4] rounded-lg px-3 py-1.5 text-[12px] font-medium cursor-pointer"
        >
          ⚙ Connect Zephyr
        </button>
      )}
      <button
        className="flex items-center gap-1.5 bg-[#4F46E5] text-white border-none rounded-lg px-3 py-1.5 text-[12px] font-medium cursor-pointer hover:bg-[#4338CA] transition-colors"
      >
        ＋ Add test case
      </button>
    </div>
  )

  return (
    <Layout title="Test Cases" actions={actions}>
      <div>
        <div className="mb-4 text-[12.5px] text-[#999] flex items-center gap-1">
          <button onClick={() => navigate('/projects')} className="text-[#999] hover:text-[#4F46E5] cursor-pointer">
            Projects
          </button>
          <span className="text-[#D0D0CC]">›</span>
          <button onClick={() => navigate(`/projects/${projectId}/features`)} className="text-[#111] font-medium hover:text-[#4F46E5] cursor-pointer">
            {project?.name || 'Project'}
          </button>
          <span className="text-[#D0D0CC]">›</span>
          <button onClick={() => navigate(`/projects/${projectId}/features/${featureId}/testcases`)} className="text-[#111] font-medium hover:text-[#4F46E5] cursor-pointer">
            {feature?.name || 'Feature'}
          </button>
          <span className="text-[#D0D0CC]">›</span>
          <span className="text-[#111] font-medium">Test Cases</span>
        </div>

        {allEditMode && !generating && testCases.length > 0 && (
          <div className="bg-[#F0EFFD] border border-[#C4C2F4] rounded-xl px-4 py-3 mb-3 flex items-center gap-3">
            <span className="text-[#4F46E5] text-[15px] flex-shrink-0">✦</span>
            <div className="flex-1">
              <div className="text-[13px] font-medium text-[#4F46E5]">
                {testCases.length} test cases generated — review and edit before saving
              </div>
              <div className="text-[12px] text-[#6B64D0] mt-0.5">
                All rows are open. Click Save all when done.
              </div>
            </div>
            <button onClick={handleSaveAll} className="bg-[#4F46E5] hover:bg-[#4338CA] text-white border-none rounded-lg px-4 py-2 text-[12px] font-medium cursor-pointer font-sans flex-shrink-0">
              Save all →
            </button>
          </div>
        )}

        {generating && (
          <div className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#FAFAF8] border-b flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-[#EEEDF8] border-t-[#4F46E5] rounded-full animate-spin" />
              <span className="text-[12.5px] text-[#4F46E5] font-medium animate-pulse">
                Generating test cases with AI...
              </span>
            </div>
            {[1, 2, 3].map(i => (
              <div key={i} className="border-b last:border-b-0">
                <div className="grid grid-cols-[30px_1fr_75px_90px_72px] p-3 gap-3">
                  <div className="h-3 w-3 rounded-full bg-[#F0F0ED] animate-pulse" />
                  <div className="h-3 rounded bg-[#F0F0ED] animate-pulse w-2/3" />
                  <div className="h-3 rounded bg-[#F0F0ED] animate-pulse w-10" />
                  <div className="h-3 rounded bg-[#F0F0ED] animate-pulse w-14" />
                  <div />
                </div>
              </div>
            ))}
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
            <div className="grid grid-cols-[30px_1fr_75px_90px_72px] bg-[#FAFAF8] border-b">
              <div className="th" />
              <div className="th">Test case</div>
              <div className="th">Priority</div>
              <div className="th">Type</div>
              <div className="th text-right pr-3">Actions</div>
            </div>

            {testCases.map((tc, index) => {
              const isExpanded = expandedIds.has(tc.id)
              const isDeleting = deletingId === tc.id
              const draft = drafts[tc.id] || tc.fieldValues
              const nameKey = findNameKey(fields)
              const priorityKey = findPriorityKey(fields)
              const typeKey = findTypeKey(fields)

              if (isDeleting) {
                return (
                  <div key={tc.id} className="border-b last:border-b-0 bg-[#FEF2F2]">
                    <div className="flex items-center gap-3 px-4 py-3 text-[12.5px] text-[#DC2626]">
                      <span className="text-[15px]">⚠</span>
                      Delete "{draft[nameKey!] || 'Untitled'}"? This cannot be undone.
                      <button onClick={() => handleDelete(tc.id)} className="bg-[#DC2626] hover:bg-[#991B1B] text-white border-none rounded-lg px-3 py-1 text-[12px] font-medium cursor-pointer">
                        Yes, delete
                      </button>
                      <button onClick={() => setDeletingId(null)} className="bg-white text-[#555] border border-[#D0D0CC] rounded-lg px-3 py-1 text-[12px] font-medium cursor-pointer">
                        Cancel
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div key={tc.id} className="border-b last:border-b-0">
                  <div
                    className="grid grid-cols-[30px_1fr_75px_90px_72px] items-center cursor-pointer hover:bg-[#FAFAF9]"
                    style={isExpanded ? { background: '#FAFAFE' } : {}}
                    onClick={() => toggleExpand(tc.id)}
                  >
                    <div className={`tc-chev ${isExpanded ? 'open' : ''}`}>▶</div>
                    <div className="p-3">
                      <div className="text-[13px] font-medium text-[#111]">
                        {draft[nameKey!] || 'Untitled test case'}
                      </div>
                      <div className="text-[10.5px] text-[#C0C0BC] font-mono mt-0.5">
                        TC-{String(index + 1).padStart(3, '0')}
                      </div>
                    </div>
                    <div className="p-3">
                      <PriorityBadge value={draft[priorityKey!]} />
                    </div>
                    <div className="p-3">
                      <TypeBadge value={draft[typeKey!]} />
                    </div>
                    <div className="p-3 flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setDeletingId(tc.id)} className="icon-btn danger">🗑</button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-[#FAFAFE] border-t border-[#EBEBEB] px-4 py-4 pl-10">
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {findObjectiveKey(fields) && (
                          <div>
                            <label className="field-label">Objective</label>
                            <textarea
                              className="field-textarea"
                              value={draft[findObjectiveKey(fields)!] || ''}
                              onChange={e => updateDraft(tc.id, findObjectiveKey(fields)!, e.target.value)}
                            />
                          </div>
                        )}
                        {findPreconditionsKey(fields) && (
                          <div>
                            <label className="field-label">Preconditions</label>
                            <textarea
                              className="field-textarea"
                              value={draft[findPreconditionsKey(fields)!] || ''}
                              onChange={e => updateDraft(tc.id, findPreconditionsKey(fields)!, e.target.value)}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[11px] font-semibold text-[#888] uppercase tracking-wide">Test steps</span>
                        <div className="flex-1 h-px bg-[#EBEBEB]" />
                      </div>

                      <div className="bg-white border border-[#EBEBEB] rounded-[9px] overflow-hidden mb-3">
                        <div className="grid grid-cols-[28px_1fr_1fr_1fr_28px] bg-[#F5F5F3] border-b border-[#EBEBEB]">
                          <div className="step-th">#</div>
                          <div className="step-th">Action</div>
                          <div className="step-th">Test data</div>
                          <div className="step-th">Expected result</div>
                          <div />
                        </div>

                        {parseSteps(draft[findStepsKey(fields)]).map((step, i) => (
                          <div key={i} className="grid grid-cols-[28px_1fr_1fr_1fr_28px] border-b last:border-b-0">
                            <div className="step-num">{i + 1}</div>
                            <div className="step-cell">
                              <textarea
                                className="step-input"
                                value={step.action}
                                onChange={e => updateStep(tc.id, i, 'action', e.target.value)}
                              />
                            </div>
                            <div className="step-cell">
                              <textarea
                                className="step-input"
                                value={step.data}
                                onChange={e => updateStep(tc.id, i, 'data', e.target.value)}
                              />
                            </div>
                            <div className="step-cell">
                              <textarea
                                className="step-input"
                                value={step.expected}
                                onChange={e => updateStep(tc.id, i, 'expected', e.target.value)}
                              />
                            </div>
                            <div className="step-del border-l border-[#EBEBEB] flex items-start pt-2 justify-center">
                              <button onClick={() => removeStep(tc.id, i)} className="icon-btn danger small">✕</button>
                            </div>
                          </div>
                        ))}

                        <div className="p-2 border-t border-[#EBEBEB]">
                          <button onClick={() => addStep(tc.id)} className="add-step-btn">
                            ＋ Add step
                          </button>
                        </div>
                      </div>

                      {getOtherFields(fields).map(field => (
                        <div key={field.key} className="mb-3">
                          <label className="field-label">{field.name}</label>
                          <textarea
                            className="field-textarea"
                            value={String(draft[field.key] || '')}
                            onChange={e => updateDraft(tc.id, field.key, e.target.value)}
                          />
                        </div>
                      ))}

                      {!allEditMode && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => handleSaveOne(tc.id)} className="btn-g text-[11.5px]">
                            ✓ Save
                          </button>
                          <button
                            onClick={() => {
                              setExpandedIds(prev => { const n = new Set(prev); n.delete(tc.id); return n })
                            }}
                            className="btn-s text-[11.5px]"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {zephyrConn && (
          <ZephyrExportModal
            open={exportModalOpen}
            onClose={() => setExportModalOpen(false)}
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

function PriorityBadge({ value }: { value?: string }): React.ReactNode {
  if (!value) return <span className="text-[#C0C0BC] text-[10.5px]">—</span>
  const colors: Record<string, string> = {
    'HIGH': 'bg-[#FEF2F2] text-[#DC2626]',
    'MEDIUM': 'bg-[#FFFBEB] text-[#B45309]',
    'LOW': 'bg-[#ECFDF5] text-[#059669]',
  }
  return (
    <span className={`inline-flex items-center gap-1 font-medium text-[10.5px] px-2 py-1 rounded-full ${colors[value] || 'bg-[#F0F0ED] text-[#666]'}`}>
      {value}
    </span>
  )
}

function TypeBadge({ value }: { value?: string }): React.ReactNode {
  if (!value) return <span className="text-[#C0C0BC] text-[10.5px]">—</span>
  const colors: Record<string, string> = {
    'POSITIVE': 'bg-[#EFF6FF] text-[#2563EB]',
    'NEGATIVE': 'bg-[#FEF2F2] text-[#DC2626]',
    'EDGE_CASE': 'bg-[#EEEDFE] text-[#4F46E5]',
  }
  return (
    <span className={`inline-flex items-center gap-1 font-medium text-[10.5px] px-2 py-1 rounded-full ${colors[value] || 'bg-[#F0F0ED] text-[#666]'}`}>
      {value?.replace('_', ' ')}
    </span>
  )
}


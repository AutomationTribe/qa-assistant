import { useState, useEffect } from 'react'
import { TestCaseField } from '@/types/api'
import { testCasesAPI } from '@/api/testcases'
import { toast } from '@/store/toastStore'

interface Props {
  open: boolean
  onClose: () => void
  featureId: string
  projectName: string
  fields: TestCaseField[]
  onSaved: (testCase: any) => void
}

export default function AddTestCasePanel({
  open,
  onClose,
  featureId,
  projectName,
  fields,
  onSaved,
}: Props) {
  const [values, setValues] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [continueCreating, setContinueCreating] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when panel opens
  useEffect(() => {
    if (open) {
      setValues({})
      setErrors({})
    }
  }, [open])

  const updateValue = (key: string, value: any) => {
    setValues(prev => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
    }
  }

  // Steps are stored as pipe-separated strings: "Action | Data | Expected"
  const updateStep = (
    stepIndex: number,
    part: 'action' | 'data' | 'expected',
    value: string,
    stepsKey: string
  ) => {
    const current: string[] = Array.isArray(values[stepsKey])
      ? [...values[stepsKey]]
      : ['']
    while (current.length <= stepIndex) current.push('')
    const parts = current[stepIndex].split('|').map(s => s.trim())
    while (parts.length < 3) parts.push('')
    if (part === 'action') parts[0] = value
    if (part === 'data') parts[1] = value
    if (part === 'expected') parts[2] = value
    current[stepIndex] = parts.join(' | ')
    updateValue(stepsKey, current)
  }

  const addStep = (stepsKey: string) => {
    const current: string[] = Array.isArray(values[stepsKey])
      ? [...values[stepsKey]]
      : []
    updateValue(stepsKey, [...current, ' | | '])
  }

  const removeStep = (stepsKey: string, index: number) => {
    const current: string[] = Array.isArray(values[stepsKey])
      ? [...values[stepsKey]]
      : []
    updateValue(stepsKey, current.filter((_, i) => i !== index))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    fields.forEach(field => {
      if (field.required) {
        const val = values[field.key]
        if (field.type === 'STEPS') {
          const steps: string[] = Array.isArray(val) ? val : []
          const hasStep = steps.some(s => s.replace(/\|/g, '').trim().length > 0)
          if (!hasStep) newErrors[field.key] = 'At least one step is required'
        } else if (!val || String(val).trim() === '') {
          newErrors[field.key] = `${field.name} is required`
        }
      }
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const testCase = await testCasesAPI.createTestCase(featureId, values)
      onSaved(testCase)
      toast.success('Test case saved successfully')
      if (continueCreating) {
        setValues({})
        setErrors({})
      } else {
        onClose()
      }
    } catch {
      toast.error('Failed to save test case. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const stepsField = fields.find(f => f.type === 'STEPS')
  const otherFields = fields.filter(f => f.type !== 'STEPS')

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-[380px] bg-white flex flex-col h-full shadow-none border-l border-[#EBEBEB] z-10">

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-[#EBEBEB] flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[14px] font-medium text-[#111]">Add test case</div>
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-md border border-[#EBEBEB] flex items-center justify-center text-[#888] hover:text-[#333] text-[14px]"
            >
              ✕
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-[11.5px] text-[#888]">
            <span>Using</span>
            <span className="font-medium text-[#111]">{projectName}</span>
            <span>template · {fields.length} fields</span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">

          {/* Template note */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[#FAFAF8] rounded-lg border border-[#EBEBEB] mb-4 text-[11.5px] text-[#888]">
            <span style={{ color: '#534AB7', fontSize: 14 }}>◫</span>
            <span>Fields match your saved template. Edit the template to update these fields.</span>
          </div>

          {/* Non-steps fields */}
          {otherFields.map(field => (
            <div key={field.key} className="mb-4">
              <label className="flex items-center gap-1.5 text-[12px] font-medium text-[#111] mb-1.5">
                {field.name}
                {field.required && <span className="text-[#E24B4A] text-[11px]">*</span>}
                {!field.required && <span className="text-[11px] font-normal text-[#aaa]">optional</span>}
              </label>

              {field.type === 'TEXT' && (
                <input
                  type="text"
                  value={String(values[field.key] || '')}
                  onChange={e => updateValue(field.key, e.target.value)}
                  placeholder={field.description || `Enter ${field.name.toLowerCase()}`}
                  className={`w-full border rounded-lg px-3 py-2 text-[12.5px] font-sans text-[#111] bg-white outline-none focus:border-[#534AB7] focus:ring-2 focus:ring-[#EEEDFE] ${errors[field.key] ? 'border-[#E24B4A]' : 'border-[#DDDDD9]'}`}
                />
              )}

              {field.type === 'TEXTAREA' && (
                <textarea
                  value={String(values[field.key] || '')}
                  onChange={e => updateValue(field.key, e.target.value)}
                  placeholder={field.description || `Enter ${field.name.toLowerCase()}`}
                  rows={2}
                  className={`w-full border rounded-lg px-3 py-2 text-[12.5px] font-sans text-[#111] bg-white outline-none resize-none focus:border-[#534AB7] focus:ring-2 focus:ring-[#EEEDFE] ${errors[field.key] ? 'border-[#E24B4A]' : 'border-[#DDDDD9]'}`}
                />
              )}

              {field.type === 'SELECT' && Array.isArray(field.options) && (
                <select
                  value={String(values[field.key] || '')}
                  onChange={e => updateValue(field.key, e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-[12.5px] font-sans text-[#111] bg-white outline-none cursor-pointer focus:border-[#534AB7] ${errors[field.key] ? 'border-[#E24B4A]' : 'border-[#DDDDD9]'}`}
                >
                  <option value="">Select {field.name.toLowerCase()}</option>
                  {(field.options as string[]).map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              {field.type === 'BOOLEAN' && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`field-${field.key}`}
                    checked={Boolean(values[field.key])}
                    onChange={e => updateValue(field.key, e.target.checked)}
                    className="w-4 h-4 accent-[#4F46E5]"
                  />
                  <label htmlFor={`field-${field.key}`} className="text-[12.5px] text-[#333]">
                    {field.description || field.name}
                  </label>
                </div>
              )}

              {field.type === 'NUMBER' && (
                <input
                  type="number"
                  value={values[field.key] ?? ''}
                  onChange={e => updateValue(field.key, Number(e.target.value))}
                  placeholder="0"
                  className={`w-full border rounded-lg px-3 py-2 text-[12.5px] font-sans text-[#111] bg-white outline-none focus:border-[#534AB7] ${errors[field.key] ? 'border-[#E24B4A]' : 'border-[#DDDDD9]'}`}
                />
              )}

              {errors[field.key] && (
                <div className="text-[11px] text-[#A32D2D] mt-1">{errors[field.key]}</div>
              )}
            </div>
          ))}

          {/* Steps field */}
          {stepsField && (
            <div className="mb-4">
              <label className="flex items-center gap-1.5 text-[12px] font-medium text-[#111] mb-1.5">
                {stepsField.name}
                {stepsField.required && <span className="text-[#E24B4A] text-[11px]">*</span>}
              </label>

              <div className="border border-[#DDDDD9] rounded-lg overflow-hidden">
                {/* Steps header */}
                <div className="grid grid-cols-[22px_1fr_1fr_1fr] bg-[#FAFAF8] border-b border-[#EBEBEB]">
                  {['#', 'Action', 'Test data', 'Expected result'].map(h => (
                    <div key={h} className="px-2 py-1.5 text-[10px] font-medium text-[#888] uppercase tracking-wide">
                      {h}
                    </div>
                  ))}
                </div>

                {/* Step rows */}
                {((values[stepsField.key] as string[]) || ['']).map((step, i) => {
                  const parts = step.split('|').map(s => s.trim())
                  while (parts.length < 3) parts.push('')
                  return (
                    <div key={i} className="grid grid-cols-[22px_1fr_1fr_1fr] border-b border-[#F2F2EF] last:border-b-0">
                      <div className="px-1.5 py-2 text-[10.5px] text-[#aaa] font-mono text-center border-r border-[#EBEBEB] flex items-start pt-2">
                        {i + 1}
                      </div>
                      {(['action', 'data', 'expected'] as const).map((part, pi) => (
                        <div key={part} className="p-1">
                          <textarea
                            value={parts[pi] || ''}
                            onChange={e => updateStep(i, part, e.target.value, stepsField.key)}
                            placeholder={part === 'action' ? 'Navigate to...' : part === 'data' ? 'URL, data...' : 'Should show...'}
                            rows={2}
                            className="w-full border-none bg-transparent text-[11.5px] font-sans text-[#111] outline-none resize-none focus:bg-[#FAFAF8] rounded px-1 py-1 leading-snug"
                          />
                        </div>
                      ))}
                    </div>
                  )
                })}

                {/* Add / remove step */}
                <div className="flex items-center justify-between px-2 py-1.5 bg-[#FAFAF8] border-t border-[#EBEBEB]">
                  <button
                    type="button"
                    onClick={() => addStep(stepsField.key)}
                    className="text-[11.5px] text-[#888] hover:text-[#4F46E5] flex items-center gap-1"
                  >
                    ＋ Add step
                  </button>
                  {((values[stepsField.key] as string[]) || []).length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStep(
                        stepsField.key,
                        ((values[stepsField.key] as string[]) || []).length - 1
                      )}
                      className="text-[11px] text-[#aaa] hover:text-[#EF4444]"
                    >
                      Remove last
                    </button>
                  )}
                </div>
              </div>

              {errors[stepsField.key] && (
                <div className="text-[11px] text-[#A32D2D] mt-1">{errors[stepsField.key]}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#EBEBEB] flex-shrink-0 bg-[#FAFAF8]">
          {/* Continue toggle */}
          <div
            className="flex items-center gap-2.5 mb-3 cursor-pointer"
            onClick={() => setContinueCreating(p => !p)}
          >
            <div className={`w-8 h-5 rounded-full relative transition-colors ${continueCreating ? 'bg-[#4F46E5]' : 'bg-[#D0D0CC]'}`}>
              <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all ${continueCreating ? 'left-[17px]' : 'left-[3px]'}`} />
            </div>
            <div>
              <div className="text-[12.5px] text-[#111]">Create another after saving</div>
              <div className="text-[11px] text-[#aaa]">
                {continueCreating
                  ? 'Pane stays open to add another'
                  : 'Pane will close after saving'}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 border border-[#D0D0CC] rounded-lg text-[12.5px] bg-white text-[#444] hover:bg-[#FAFAF8]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-[2] py-2 border-none rounded-lg text-[12.5px] font-medium bg-[#4F46E5] text-white hover:bg-[#4338CA] disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {saving ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>✓ Save test case</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

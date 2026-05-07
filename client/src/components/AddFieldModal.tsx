import { useState, useEffect } from 'react'
import { TestCaseField, FieldType } from '@/types/api'
import Button from '@/components/ui/Button'

interface AddFieldModalProps {
  onSubmit: (field: Partial<TestCaseField>) => void
  onCancel: () => void
  initialField?: Partial<TestCaseField>
  isEditing?: boolean
}

const FIELD_TYPES: FieldType[] = ['TEXT', 'TEXTAREA', 'STEPS', 'SELECT', 'MULTISELECT', 'BOOLEAN', 'NUMBER']

const TYPE_LABELS: Record<FieldType, { label: string; icon: string; description: string }> = {
  TEXT: { label: 'Text', icon: 'T', description: 'short single line' },
  TEXTAREA: { label: 'Long Text', icon: '¶', description: 'multi-line paragraph' },
  STEPS: { label: 'Steps', icon: '#', description: 'numbered list of steps' },
  SELECT: { label: 'Select', icon: '▼', description: 'pick one from a list' },
  MULTISELECT: { label: 'Multi-select', icon: '☑', description: 'pick multiple from a list' },
  BOOLEAN: { label: 'Yes/No', icon: '✓', description: 'boolean toggle' },
  NUMBER: { label: 'Number', icon: '0', description: 'numeric value' },
}

const generateKeyFromName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

export default function AddFieldModal({ onSubmit, onCancel, initialField, isEditing }: AddFieldModalProps) {
  const [name, setName] = useState(initialField?.name ?? '')
  const [key, setKey] = useState(initialField?.key ?? '')
  const [type, setType] = useState<FieldType>(initialField?.type ?? 'TEXT')
  const [description, setDescription] = useState(initialField?.description ?? '')
  const [required, setRequired] = useState(initialField?.required ?? true)
  const [options, setOptions] = useState<string[]>(initialField?.options ?? [])
  const [optionInput, setOptionInput] = useState('')

  useEffect(() => {
    if (name && !initialField?.key) {
      setKey(generateKeyFromName(name))
    }
  }, [name, initialField?.key])

  const handleAddOption = () => {
    if (optionInput.trim()) {
      setOptions([...options, optionInput.trim()])
      setOptionInput('')
    }
  }

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    if (!name.trim() || !key.trim()) {
      return
    }

    const field: Partial<TestCaseField> = {
      name: name.trim(),
      key: key.trim(),
      type,
      description: description.trim() || undefined,
      required,
      ...(['SELECT', 'MULTISELECT'].includes(type) && { options: options.length > 0 ? options : undefined }),
    }

    onSubmit(field)
  }

  const isValid = name.trim() && key.trim() && !/[^a-z0-9_]/.test(key)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6">
          <h2 className="text-xl font-semibold">{isEditing ? 'Edit Field' : 'Add Field'}</h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Field name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Test Steps, Expected Result, Priority"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Key */}
          <div>
            <label className="block text-sm font-medium mb-2">Field key *</label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="auto-generated from name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">Used by the AI to identify this field. Letters, numbers, underscores only.</p>
            {!isValid && key && /[^a-z0-9_]/.test(key) && <p className="text-xs text-red-500 mt-1">Invalid characters in key</p>}
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium mb-3">Field type *</label>
            <div className="grid grid-cols-2 gap-2">
              {FIELD_TYPES.map((fieldType) => (
                <button
                  key={fieldType}
                  onClick={() => setType(fieldType)}
                  className={`p-3 border-2 rounded-lg text-left transition-all ${
                    type === fieldType ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-lg">{TYPE_LABELS[fieldType].icon}</div>
                  <div className="font-medium">{TYPE_LABELS[fieldType].label}</div>
                  <div className="text-xs text-gray-500">{TYPE_LABELS[fieldType].description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Describe what the AI should put in this field</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. List each step the tester needs to perform, numbered from 1. Be specific and actionable."
              maxLength={200}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">This is read by the AI — the better you describe it, the better the output</p>
          </div>

          {/* Required */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setRequired(!required)}
              className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all font-medium ${
                required
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              Required
            </button>
            <button
              onClick={() => setRequired(!required)}
              className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all font-medium ${
                !required ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              Optional
            </button>
          </div>

          {/* Options (for SELECT and MULTISELECT) */}
          {['SELECT', 'MULTISELECT'].includes(type) && (
            <div>
              <label className="block text-sm font-medium mb-2">Options</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={optionInput}
                  onChange={(e) => setOptionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddOption()
                    }
                  }}
                  placeholder="e.g. High, Medium, Low"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Button variant="secondary" size="md" onClick={handleAddOption}>
                  Add
                </Button>
              </div>
              {options.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {options.map((option, idx) => (
                    <div key={idx} className="bg-indigo-100 text-indigo-900 px-3 py-1 rounded-full flex items-center gap-2 text-sm">
                      {option}
                      <button
                        onClick={() => handleRemoveOption(idx)}
                        className="text-indigo-600 hover:text-indigo-900 font-bold cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t p-6 flex justify-between gap-3">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!isValid}>
            {isEditing ? 'Save Changes' : 'Add Field'}
          </Button>
        </div>
      </div>
    </div>
  )
}

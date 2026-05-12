import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import Button from '@/components/ui/Button'
import AddFieldModal from '@/components/AddFieldModal'
import TemplatePreviewModal from '@/components/TemplatePreviewModal'
import { useTemplateStore } from '@/store/templateStore'
import { toast } from '@/store/toastStore'
import { TestCaseField } from '@/types/api'
import { getProject } from '@/api/projects'

interface WorkingField extends Partial<TestCaseField> {
  _tempId?: string
}

export default function TemplatePage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [projectName, setProjectName] = useState<string>('')
  const [workingFields, setWorkingFields] = useState<WorkingField[]>([])
  const [showAddFieldModal, setShowAddFieldModal] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null)
  const [unsavedChanges, setUnsavedChanges] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const { template, loading, fetchTemplate, updateTemplate } = useTemplateStore()

  useEffect(() => {
    if (projectId) {
      fetchTemplate(projectId)
      getProject(projectId).then((project) => {
        if (project) setProjectName(project.name)
      })
    }
  }, [projectId, fetchTemplate])

  useEffect(() => {
    if (template) {
      setWorkingFields(template.fields)
      setUnsavedChanges(false)
    }
  }, [template])

  const handleAddField = (field: Partial<TestCaseField>) => {
    if (editingFieldIndex !== null) {
      const newFields = [...workingFields]
      newFields[editingFieldIndex] = { ...field, _tempId: workingFields[editingFieldIndex]._tempId }
      setWorkingFields(newFields)
      setEditingFieldIndex(null)
    } else {
      setWorkingFields([...workingFields, { ...field, _tempId: `temp_${Date.now()}` }])
    }
    setShowAddFieldModal(false)
    setUnsavedChanges(true)
  }

  const handleDeleteField = (index: number) => {
    if (!window.confirm('Are you sure you want to delete this field?')) return
    setWorkingFields(workingFields.filter((_, i) => i !== index))
    setUnsavedChanges(true)
  }

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === workingFields.length - 1)) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    const newFields = [...workingFields]
    ;[newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]]
    setWorkingFields(newFields)
    setUnsavedChanges(true)
  }

  const handleSaveTemplate = async () => {
    if (!projectId || !unsavedChanges) return

    setSaveState('saving')
    try {
      await updateTemplate(projectId, workingFields)
      setUnsavedChanges(false)
      setSaveState('saved')
      toast.success('Template saved successfully')
      setTimeout(() => navigate('/projects'), 800)
    } catch (error) {
      console.error('Failed to save template:', error)
      setSaveState('error')
      toast.error('Failed to save template. Please try again.')
      setTimeout(() => setSaveState('idle'), 2000)
    }
  }

  const handleAddFirstField = () => {
    setEditingFieldIndex(null)
    setShowAddFieldModal(true)
  }

  const editingField = editingFieldIndex !== null ? workingFields[editingFieldIndex] : undefined

  return (
    <Layout title="Test Case Template">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <button onClick={() => navigate('/projects')} className="text-indigo-600 hover:text-indigo-700 text-sm">
            Projects
          </button>
          <span className="text-gray-400 mx-2">/</span>
          <button onClick={() => navigate('/projects')} className="text-indigo-600 hover:text-indigo-700 text-sm">
            {projectName}
          </button>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-600 text-sm">Template</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Test Case Template</h1>
            <p className="text-gray-600 mt-2">Define the fields the AI will fill for every test case</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowPreview(true)} disabled={workingFields.length === 0}>
              Preview
            </Button>
            <button
              onClick={handleSaveTemplate}
              disabled={!unsavedChanges || saveState === 'saving'}
              className={[
                'flex items-center gap-2 px-4 py-2 rounded-lg text-[12.5px]',
                'font-medium border transition-all duration-200 font-sans',
                'disabled:cursor-not-allowed',
                saveState === 'saved'
                  ? 'bg-[#ECFDF5] border-[#6EE7B7] text-[#059669]'
                  : saveState === 'error'
                  ? 'bg-red-50 border-red-200 text-red-600'
                  : saveState === 'saving'
                  ? 'bg-[#4F46E5] border-transparent text-white opacity-80'
                  : 'bg-[#4F46E5] border-transparent text-white hover:bg-[#4338CA]',
              ].join(' ')}
            >
              {saveState === 'saving' && (
                <svg
                  className="animate-spin h-3.5 w-3.5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {saveState === 'saving' && 'Saving...'}
              {saveState === 'saved' && '✓ Saved'}
              {saveState === 'error' && '✕ Failed'}
              {saveState === 'idle' && 'Save Template'}
            </button>
          </div>
        </div>

        {/* Fields List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading template...</div>
        ) : workingFields.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center max-w-[380px]">
              <div className="w-14 h-14 rounded-2xl bg-[#EEEDF8] flex items-center justify-center text-2xl mx-auto mb-4">
                📋
              </div>
              <h3 className="text-[16px] font-semibold text-[#111] mb-2">
                No template defined yet
              </h3>
              <p className="text-[13px] text-[#888] leading-relaxed mb-6">
                A template defines the fields the AI will fill for every test case
                in this project. Add your first field to get started.
              </p>
              <button
                onClick={handleAddFirstField}
                className="inline-flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white border-none rounded-lg px-5 py-2.5 text-[13px] font-medium cursor-pointer font-sans transition-colors"
              >
                ＋ Add your first field
              </button>
              <p className="text-[11.5px] text-[#aaa] mt-4 leading-relaxed">
                We recommend starting with: Test Title, Test Steps,
                Expected Result, and Priority.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {workingFields.map((field, index) => (
              <div key={field._tempId || field.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-gray-400 text-lg">↕</span>
                      <h3 className="font-semibold text-gray-900">{field.name}</h3>
                      {field.key && <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono">{field.key}</span>}
                      {field.type && <span className="text-xs bg-indigo-100 text-indigo-900 px-2 py-1 rounded">{field.type}</span>}
                      {field.required && <span className="text-xs bg-red-100 text-red-900 px-2 py-1 rounded">Required</span>}
                    </div>
                    {field.description && <p className="text-sm text-gray-600 line-clamp-1">{field.description}</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    {index > 0 && (
                      <button
                        onClick={() => handleMoveField(index, 'up')}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                        title="Move up"
                      >
                        ↑
                      </button>
                    )}
                    {index < workingFields.length - 1 && (
                      <button
                        onClick={() => handleMoveField(index, 'down')}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                        title="Move down"
                      >
                        ↓
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingFieldIndex(index)
                        setShowAddFieldModal(true)
                      }}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                      title="Edit"
                    >
                      ✏
                    </button>
                    <button
                      onClick={() => handleDeleteField(index)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add Field Button */}
            <div className="flex justify-center mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingFieldIndex(null)
                  setShowAddFieldModal(true)
                }}
              >
                + Add Field
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddFieldModal && (
        <AddFieldModal
          onSubmit={handleAddField}
          onCancel={() => {
            setShowAddFieldModal(false)
            setEditingFieldIndex(null)
          }}
          initialField={editingField}
          isEditing={editingFieldIndex !== null}
        />
      )}

      {showPreview && <TemplatePreviewModal fields={workingFields as TestCaseField[]} onClose={() => setShowPreview(false)} />}
    </Layout>
  )
}

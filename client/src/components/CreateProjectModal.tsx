import { useState } from 'react'
import { useProjectStore } from '@/store/projectStore'
import type { TemplateConfig } from '@/types/api'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const [name, setName] = useState('')
  const [style, setStyle] = useState<TemplateConfig['style']>('bdd')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { createProject } = useProjectStore()

  const handleCreate = async () => {
    setError(null)

    if (name.trim().length < 2) {
      setError('Project name must be at least 2 characters')
      return
    }

    setIsSubmitting(true)
    try {
      await createProject({
        name: name.trim(),
        templateConfig: { style },
      })
      setName('')
      setStyle('bdd')
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create project'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6">Create New Project</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Mobile App QA"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Testing Style
            </label>
            <div className="flex gap-3">
              {[
                { value: 'bdd' as const, label: 'BDD' },
                { value: 'step_by_step' as const, label: 'Step by Step' },
                { value: 'exploratory' as const, label: 'Exploratory' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setStyle(option.value)}
                  disabled={isSubmitting}
                  className={`flex-1 py-2 px-3 rounded-lg font-medium transition ${
                    style === option.value
                      ? 'bg-blue-600 text-white border-2 border-blue-600'
                      : 'border-2 border-gray-300 text-gray-700 hover:border-gray-400'
                  } disabled:opacity-50`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

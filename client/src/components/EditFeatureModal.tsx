import { useState } from 'react'
import { useFeatureStore } from '@/store/featureStore'
import SlidePanel from '@/components/ui/SlidePanel'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import type { Feature, FeatureType, FeatureStatus } from '@/types/api'

interface EditFeatureModalProps {
  feature: Feature | null
  projectId: string
  isOpen: boolean
  onClose: () => void
}

export default function EditFeatureModal({
  feature,
  projectId,
  isOpen,
  onClose,
}: EditFeatureModalProps) {
  const [name, setName] = useState(feature?.name || '')
  const [type, setType] = useState<FeatureType>(feature?.type || 'NEW_FEATURE')
  const [status, setStatus] = useState<FeatureStatus>(feature?.status || 'FINAL')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { updateFeature } = useFeatureStore()

  const handleUpdate = async () => {
    if (!feature) return
    setError(null)

    if (name.trim().length < 2) {
      setError('Feature name must be at least 2 characters')
      return
    }

    setIsSubmitting(true)
    try {
      await updateFeature(projectId, feature.id, {
        name: name.trim(),
        type,
        status,
      })
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update feature'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName(feature?.name || '')
      setType(feature?.type || 'NEW_FEATURE')
      setStatus(feature?.status || 'FINAL')
      setError(null)
      onClose()
    }
  }

  return (
    <SlidePanel
      open={isOpen}
      onClose={() => handleOpenChange(false)}
      title="Edit Feature"
      footer={
        <>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            loading={isSubmitting}
            onClick={handleUpdate}
          >
            Save Changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Feature name"
          placeholder="Feature name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSubmitting}
        />

        <div className="mb-4">
          <label className="text-xs font-medium text-[#333] block mb-3">Type</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'NEW_FEATURE' as const, label: 'New Feature' },
              { value: 'BUG' as const, label: 'Bug' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setType(option.value)}
                disabled={isSubmitting}
                className={`py-3 px-2 rounded-lg text-center text-xs font-medium transition border-2 ${
                  type === option.value
                    ? 'border-[#4F46E5] bg-[#EEEDF8] text-[#4F46E5]'
                    : 'border-[#DDDDD9] text-[#999] hover:border-[#4F46E5]/30'
                } disabled:opacity-50`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium text-[#333] block mb-3">Status</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'DRAFT' as const, label: 'Draft' },
              { value: 'FINAL' as const, label: 'Final' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setStatus(option.value)}
                disabled={isSubmitting}
                className={`py-3 px-2 rounded-lg text-center text-xs font-medium transition border-2 ${
                  status === option.value
                    ? 'border-[#4F46E5] bg-[#EEEDF8] text-[#4F46E5]'
                    : 'border-[#DDDDD9] text-[#999] hover:border-[#4F46E5]/30'
                } disabled:opacity-50`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-[#FEE2E2] border border-[#FECACA] text-[#DC2626] text-xs px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </SlidePanel>
  )
}

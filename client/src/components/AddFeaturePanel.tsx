import { useState } from 'react'
import axios from 'axios'
import { useFeatureStore } from '@/store/featureStore'
import { useProjectStore } from '@/store/projectStore'
import { Feature, FeatureType } from '@/types/api'
import SlidePanel from '@/components/ui/SlidePanel'

interface AddFeaturePanelProps {
  projectId: string
  open: boolean
  onClose: () => void
  onCreated: (feature: Feature, generateAI: boolean) => void
}

export default function AddFeaturePanel({ projectId, open, onClose, onCreated }: AddFeaturePanelProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<FeatureType>('NEW_FEATURE')
  const [generateAI, setGenerateAI] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { createFeature } = useFeatureStore()
  const { projects } = useProjectStore()

  const currentProject = projects.find(p => p.id === projectId)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim() || name.length < 3) {
      setError('Feature name must be at least 3 characters')
      return
    }

    setIsLoading(true)
    let feature: Feature
    try {
      feature = await createFeature(projectId, { name, type, description: description || undefined })
    } catch (err) {
      let message = 'Failed to create feature'
      if (axios.isAxiosError(err)) {
        message = err.response?.data?.error?.message || err.message || message
      } else if (err instanceof Error) {
        message = err.message
      }
      setError(message)
      setIsLoading(false)
      console.error('Feature creation error:', err)
      return
    }

    try {
      setName('')
      setDescription('')
      setType('NEW_FEATURE')
      setGenerateAI(false)
      onCreated(feature, generateAI)
    } finally {
      setIsLoading(false)
    }
  }

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
            disabled={isLoading}
            className="flex-1 py-2.5 bg-white text-[#444] border border-[#D0D0CC] rounded-lg text-[13px] cursor-pointer font-sans hover:bg-[#FAFAF8] disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isLoading || !name.trim() || name.length < 3}
            className="flex-[2] py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white border-none rounded-lg text-[13px] font-medium cursor-pointer font-sans transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              'Add Feature'
            )}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="block text-[13px] font-medium text-[#333] mb-2">Feature name</label>
          <textarea
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. User can log in with email and password"
            rows={3}
            className="w-full border border-[#DDDDD9] rounded-lg px-3 py-2 text-[13px] text-[#111] placeholder-[#C0C0BC] bg-[#FAFAF8] focus:border-[#4F46E5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]/10 resize-none"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-[11px] text-[#aaa]">Write this as a user story title or bug description</span>
            <span className="text-[11px] text-[#C0C0BC]">{name.length} / 200</span>
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#333] mb-2">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Additional details about this feature"
            rows={2}
            className="w-full border border-[#DDDDD9] rounded-lg px-3 py-2 text-[13px] text-[#111] placeholder-[#C0C0BC] bg-[#FAFAF8] focus:border-[#4F46E5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]/10 resize-none"
          />
          <span className="text-[11px] text-[#C0C0BC] mt-1 block">{description.length} / 2000</span>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#333] mb-2">Feature type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as FeatureType)}
            className="w-full border border-[#DDDDD9] rounded-lg px-3 py-2 text-[13px] text-[#111] bg-[#FAFAF8] focus:border-[#4F46E5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]/10 appearance-none cursor-pointer"
          >
            <option value="NEW_FEATURE">🔵 New Feature</option>
            <option value="BUG">🔴 Bug</option>
          </select>
        </div>

        <div
          onClick={() => setGenerateAI(prev => !prev)}
          className={[
            'border-[1.5px] rounded-xl p-3.5 cursor-pointer transition-all select-none',
            generateAI
              ? 'border-[#4F46E5] bg-[#F5F4FD]'
              : 'border-[#D8D8D4] bg-white',
          ].join(' ')}
        >
          <div className="flex items-center justify-between gap-3">
            <div className={`flex items-center gap-2 text-[13px] font-medium ${
              generateAI ? 'text-[#333]' : 'text-[#333]'
            }`}>
              <span className={generateAI ? 'opacity-100' : 'opacity-35'}>✦</span>
              Generate test cases with AI
            </div>
            <div className={`w-[35px] h-[20px] rounded-full relative flex-shrink-0 transition-colors ${
              generateAI ? 'bg-[#4F46E5]' : 'bg-[#D0D0CC]'
            }`}>
              <div className={`w-[14px] h-[14px] bg-white rounded-full absolute top-[3px] transition-all shadow-sm ${
                generateAI ? 'left-[18px]' : 'left-[3px]'
              }`}/>
            </div>
          </div>
          <p className={`text-[12px] mt-1.5 leading-[1.5] ${
            generateAI ? 'text-[#6B64D0]' : 'text-[#888]'
          }`}>
            {generateAI
              ? 'AI will generate test cases using your template after adding this feature.'
              : 'Enable to automatically generate test cases using your template after adding this feature.'
            }
          </p>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#333] mb-2">Project</label>
          <select
            value={projectId}
            disabled
            className="w-full border border-[#DDDDD9] rounded-lg px-3 py-2 text-[13px] text-[#111] bg-[#FAFAF8] appearance-none cursor-not-allowed opacity-70"
          >
            <option>{currentProject?.name || projectId}</option>
          </select>
          <span className="text-[11px] text-[#aaa] mt-2 block">The project this feature belongs to</span>
        </div>

        {error && (
          <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>
    </SlidePanel>
  )
}

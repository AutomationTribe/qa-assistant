import { useState } from 'react'
import axios from 'axios'
import { useFeatureStore } from '@/store/featureStore'
import { useProjectStore } from '@/store/projectStore'
import { Feature, FeatureType, ApiEndpoint } from '@/types/api'
import SlidePanel from '@/components/ui/SlidePanel'
import EndpointsSection from '@/components/EndpointsSection'

interface AddFeaturePanelProps {
  projectId: string
  open: boolean
  onClose: () => void
  onCreated: (feature: Feature, generateAI: boolean) => void
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function AddFeaturePanel({ projectId, open, onClose, onCreated }: AddFeaturePanelProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('')
  const [uiNotes, setUiNotes] = useState('')
  const [testData, setTestData] = useState('')
  const [contextImages, setContextImages] = useState<string[]>([])
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([
    {
      id: crypto.randomUUID(),
      apiType: 'REST',
      method: 'GET',
      path: '',
      requestBody: '',
      expectedResponse: '',
      authRequired: true,
      authType: 'Bearer',
      notes: '',
    }
  ])
  const [type, setType] = useState<FeatureType>('NEW_FEATURE')
  const [generateAI, setGenerateAI] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageError, setImageError] = useState('')
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
    if (!description.trim() || description.trim().length < 10) {
      setError('Description is required (minimum 10 characters)')
      return
    }
    if (type === 'BACKEND_API') {
      const hasPath = endpoints.some(ep => ep.path.trim().length > 0)
      if (!hasPath) {
        setError('At least one endpoint path is required for backend features')
        return
      }
    }

    setIsLoading(true)
    let feature: Feature
    try {
      feature = await createFeature(projectId, {
        name: name.trim(),
        description: description.trim(),
        type,
        acceptanceCriteria: acceptanceCriteria.trim() || undefined,
        uiNotes: type !== 'BACKEND_API' ? (uiNotes.trim() || undefined) : undefined,
        testData: testData.trim() || undefined,
        contextImages: contextImages.length ? contextImages : undefined,
        endpoints: type === 'BACKEND_API' ? endpoints.filter(ep => ep.path.trim()) : undefined,
      })
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
      setAcceptanceCriteria('')
      setUiNotes('')
      setTestData('')
      setContextImages([])
      setEndpoints([{
        id: crypto.randomUUID(),
        apiType: 'REST',
        method: 'GET',
        path: '',
        requestBody: '',
        expectedResponse: '',
        authRequired: true,
        authType: 'Bearer',
        notes: '',
      }])
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
            disabled={isLoading || !name.trim() || name.length < 3 || !description.trim() || description.trim().length < 10}
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
          <label className="block text-[13px] font-medium text-[#333] mb-2">
            Description
            <span className="text-[#EF4444] ml-1">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this feature does in detail. The more specific you are, the more accurate the AI-generated test steps will be."
            rows={3}
            maxLength={5000}
            className="w-full border border-[#DDDDD9] rounded-lg px-3 py-2 text-[13px] text-[#111] placeholder-[#C0C0BC] bg-[#FAFAF8] focus:border-[#4F46E5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]/10 resize-none"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[11px] text-[#aaa]">Required — helps AI generate accurate steps</span>
            <span className={`text-[11px] ${description.length > 4800 ? 'text-[#EF4444]' : 'text-[#C0C0BC]'}`}>
              {description.length} / 5000
            </span>
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#333] mb-2">
            Acceptance criteria
            <span className="text-[11px] font-normal text-[#aaa] ml-1">optional</span>
          </label>
          <textarea
            value={acceptanceCriteria}
            onChange={(e) => setAcceptanceCriteria(e.target.value)}
            placeholder={`Given [context]\nWhen [action]\nThen [expected outcome]`}
            rows={3}
            className="w-full border border-[#DDDDD9] rounded-lg px-3 py-2 text-[13px] text-[#111] placeholder-[#C0C0BC] bg-[#FAFAF8] focus:border-[#4F46E5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]/10 resize-none"
          />
          <div className="text-[11px] text-[#aaa] mt-1">
            Write in Given/When/Then format. Each criterion becomes a test case.
          </div>
        </div>

        {type !== 'BACKEND_API' && (
          <div>
            <label className="block text-[13px] font-medium text-[#333] mb-2">
              UI notes
              <span className="text-[11px] font-normal text-[#aaa] ml-1">optional</span>
            </label>
            <textarea
              value={uiNotes}
              onChange={(e) => setUiNotes(e.target.value)}
              placeholder="Button labels, field names, URLs, error messages exactly as they appear in the UI"
              rows={2}
              className="w-full border border-[#DDDDD9] rounded-lg px-3 py-2 text-[13px] text-[#111] placeholder-[#C0C0BC] bg-[#FAFAF8] focus:border-[#4F46E5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]/10 resize-none"
            />
            <div className="text-[11px] text-[#aaa] mt-1">
              e.g. "Sign In button, Work email field, error: Invalid email or password"
            </div>
          </div>
        )}

        <div>
          <label className="block text-[13px] font-medium text-[#333] mb-2">
            Test data
            <span className="text-[11px] font-normal text-[#aaa] ml-1">optional</span>
          </label>
          <textarea
            value={testData}
            onChange={(e) => setTestData(e.target.value)}
            placeholder="Specific values to use in tests: emails, passwords, IDs, amounts"
            rows={2}
            className="w-full border border-[#DDDDD9] rounded-lg px-3 py-2 text-[13px] text-[#111] placeholder-[#C0C0BC] bg-[#FAFAF8] focus:border-[#4F46E5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]/10 resize-none"
          />
          <div className="text-[11px] text-[#aaa] mt-1">
            e.g. "Valid: user@test.com / Test@1234 | Invalid: wrong@test.com / BadPass"
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#333] mb-2">
            Screenshots or Figma exports
            <span className="text-[11px] font-normal text-[#aaa] ml-1">optional · max 3 images</span>
          </label>

          {contextImages.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {contextImages.map((img, i) => (
                <div key={i} className="relative">
                  <img
                    src={img}
                    alt={`Context ${i + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-[#EBEBEB]"
                  />
                  <button
                    type="button"
                    onClick={() => setContextImages(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#EF4444] text-white text-[10px] flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {contextImages.length < 3 && (
            <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-[#D8D8D4] rounded-xl cursor-pointer hover:border-[#4F46E5] hover:bg-[#FAFAFE] transition-all">
              <span className="text-2xl">🖼</span>
              <span className="text-[12.5px] font-medium text-[#555]">
                Upload screenshots or Figma exports
              </span>
              <span className="text-[11.5px] text-[#aaa]">
                PNG, JPG, WEBP · Max 4MB each · {3 - contextImages.length} remaining
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                onChange={async (e) => {
                  setImageError('')
                  const files = Array.from(e.target.files || [])
                  const remaining = 3 - contextImages.length
                  const toProcess = files.slice(0, remaining)

                  for (const file of toProcess) {
                    if (file.size > 4 * 1024 * 1024) {
                      setImageError(`${file.name} is too large. Max 4MB per image.`)
                      continue
                    }
                    const base64 = await fileToBase64(file)
                    setContextImages(prev => [...prev, base64])
                  }
                  e.target.value = ''
                }}
              />
            </label>
          )}

          {imageError && (
            <div className="text-[11.5px] text-[#EF4444] mt-1">{imageError}</div>
          )}

          <div className="text-[11px] text-[#aaa] mt-1.5">
            The AI will read your UI screenshots to extract exact button labels,
            field names, and error messages for more accurate test steps.
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#333] mb-2">Feature type</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'NEW_FEATURE', label: 'Frontend', icon: '🖥', desc: 'UI feature or flow' },
              { value: 'BACKEND_API', label: 'Backend API', icon: '⚡', desc: 'Endpoint(s) to test' },
              { value: 'BUG', label: 'Bug', icon: '🐛', desc: 'Defect or regression' },
            ].map(opt => (
              <div
                key={opt.value}
                onClick={() => setType(opt.value as FeatureType)}
                className={[
                  'border rounded-xl p-3 cursor-pointer text-center transition-all',
                  type === opt.value
                    ? 'border-[#4F46E5] bg-[#F0EFFD]'
                    : 'border-[#DDDDD9] bg-white hover:border-[#C4C2F4]',
                ].join(' ')}
              >
                <div className="text-xl mb-1">{opt.icon}</div>
                <div className={`text-[12.5px] font-medium ${type === opt.value ? 'text-[#4F46E5]' : 'text-[#111]'}`}>
                  {opt.label}
                </div>
                <div className="text-[11px] text-[#aaa] mt-0.5">{opt.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {type === 'BACKEND_API' && (
          <EndpointsSection
            endpoints={endpoints}
            onChange={setEndpoints}
          />
        )}

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

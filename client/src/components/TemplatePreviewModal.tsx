import { TestCaseField } from '@/types/api'
import Button from '@/components/ui/Button'

interface TemplatePreviewModalProps {
  fields: TestCaseField[]
  onClose: () => void
}

const getPlaceholderValue = (field: TestCaseField): string => {
  switch (field.type) {
    case 'TEXT':
      return '[AI will generate a concise text value]'
    case 'TEXTAREA':
      return '[AI will generate a detailed paragraph]'
    case 'STEPS':
      return '1. [First step]\n2. [Second step]\n3. [Third step]'
    case 'SELECT':
      return field.options ? `[One of: ${field.options.join(', ')}]` : '[Select value]'
    case 'MULTISELECT':
      return field.options ? `[Multiple of: ${field.options.join(', ')}]` : '[Multiple select values]'
    case 'BOOLEAN':
      return 'Yes / No'
    case 'NUMBER':
      return '[Numeric value]'
    default:
      return '[Value]'
  }
}

export default function TemplatePreviewModal({ fields, onClose }: TemplatePreviewModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6">
          <h2 className="text-xl font-semibold">Template Preview</h2>
          <p className="text-sm text-gray-600 mt-1">This is how a generated test case will appear</p>
        </div>

        <div className="p-6 space-y-6">
          {fields.map((field) => (
            <div key={field.id} className="border-l-4 border-indigo-200 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-gray-900">{field.name}</h3>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{field.type}</span>
                {field.required && <span className="text-xs text-red-600 font-medium">Required</span>}
              </div>
              {field.description && <p className="text-sm text-gray-600 mb-2">{field.description}</p>}
              <div className="bg-gray-50 p-3 rounded text-sm text-gray-600 whitespace-pre-wrap font-mono">
                {getPlaceholderValue(field)}
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t p-6 flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

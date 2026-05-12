import { useToastStore } from '@/store/toastStore'

export default function ToastContainer() {
  const { toasts, hide } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2.5 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={[
            'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border',
            'font-sans text-[13px] font-medium pointer-events-auto',
            'toast-enter',
            t.type === 'success'
              ? 'bg-white border-[#D1FAE5] text-[#111]'
              : t.type === 'error'
              ? 'bg-white border-red-200 text-[#111]'
              : 'bg-white border-[#EBEBEB] text-[#111]',
          ].join(' ')}
        >
          {/* Icon dot */}
          <div className={[
            'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold',
            t.type === 'success' ? 'bg-[#ECFDF5] text-[#059669]' :
            t.type === 'error' ? 'bg-red-50 text-red-500' :
            'bg-[#EEEDF8] text-[#4F46E5]',
          ].join(' ')}>
            {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'i'}
          </div>

          {/* Message */}
          <span className="text-[#333] flex-1">{t.message}</span>

          {/* Dismiss */}
          <button
            onClick={() => hide(t.id)}
            className="text-[#C0C0BC] hover:text-[#888] text-[14px] ml-1 leading-none flex-shrink-0"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

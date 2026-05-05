import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  optional?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, optional, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-[12px] font-medium text-[#333]">
            {label}
            {optional && (
              <span className="font-normal text-[#bbb] ml-1 text-[11px]">
                optional
              </span>
            )}
          </label>
        )}
        <input
          ref={ref}
          className={[
            'w-full border rounded-lg px-3 py-2 text-[13px] text-[#111]',
            'bg-[#FAFAF8] font-sans outline-none transition-all',
            'placeholder:text-[#C8C8C4]',
            error
              ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-400/10'
              : 'border-[#DDDDD9] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        {hint && !error && (
          <span className="text-[11px] text-[#aaa]">{hint}</span>
        )}
        {error && (
          <span className="text-[11px] text-red-500">{error}</span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input

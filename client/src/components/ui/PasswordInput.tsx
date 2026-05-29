import { forwardRef, useState } from 'react'
import Input from './Input'

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  optional?: boolean
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, hint, error, optional, className = '', ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(false)

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
        <div className="relative">
          <input
            ref={ref}
            type={isVisible ? 'text' : 'password'}
            className={[
              'w-full border rounded-lg px-3 py-2 text-[13px] text-[#111] pr-10',
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
          <button
            type="button"
            onClick={() => setIsVisible(!isVisible)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#666] hover:text-[#333] transition-colors p-1"
            tabIndex={-1}
            aria-label={isVisible ? 'Hide password' : 'Show password'}
          >
            {isVisible ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3.98 8.223A10.477 10.477 0 001.934 12c1.226 4.338 5.557 7.5 10.734 7.5.766 0 1.52-.06 2.255-.178l-1.08-1.079A6.75 6.75 0 1112 4.5c2.052 0 3.913.84 5.25 2.195l-1.272-1.272A10.5 10.5 0 0012 1.5C6.477 1.5 1.637 4.61.294 9.49a10.724 10.724 0 003.686 8.733z" />
                <path d="M15.75 12c0 2.07-1.681 3.75-3.75 3.75s-3.75-1.68-3.75-3.75m7.5 0c0 2.07-1.681 3.75-3.75 3.75s-3.75-1.68-3.75-3.75m7.5 0c0-2.07-1.681-3.75-3.75-3.75s-3.75 1.68-3.75 3.75M6 12a6 6 0 1112 0 6 6 0 01-12 0zm12-6a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 4.5C7.304 4.5 3.117 7.327 1.5 11.25c1.617 3.923 5.804 6.75 10.5 6.75s8.883-2.827 10.5-6.75c-1.617-3.923-5.804-6.75-10.5-6.75zm0 9a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" />
              </svg>
            )}
          </button>
        </div>
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

PasswordInput.displayName = 'PasswordInput'

export default PasswordInput

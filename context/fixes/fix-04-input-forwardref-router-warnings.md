# Issue 04 — Input ForwardRef Fix + React Router Warnings

## What is broken and why

### Problem 1 — Input component cannot receive refs (breaks form)
react-hook-form passes a `ref` to every input it registers so it can
read and control the field value. Our custom Input component is a plain
function component — it cannot receive refs unless we use React.forwardRef().

Without this fix, react-hook-form cannot read the input values, which means
the login and register forms will not submit correctly even if they look fine.

### Problem 2 — React Router future flag warnings (yellow, not breaking)
BrowserRouter is missing two future flags that silence deprecation warnings
about upcoming React Router v7 behaviour changes.

---

## Fixes to apply

### Fix 1 — client/src/components/ui/Input.tsx

Replace the entire file with this exact implementation:

```typescript
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
```

The key change: `forwardRef<HTMLInputElement, InputProps>` wraps the component
and passes `ref` through to the actual `<input>` element.
The `displayName` line makes it show as "Input" in React DevTools instead of "ForwardRef".

---

### Fix 2 — client/src/components/ui/Button.tsx

Also needs forwardRef so it can be used in forms and with refs:

```typescript
import { forwardRef } from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-[12px]',
  md: 'px-4 py-2 text-[13px]',
  lg: 'px-5 py-2.5 text-[14px]',
}

const variantClasses = {
  primary: 'bg-[#4F46E5] hover:bg-[#4338CA] text-white border-transparent',
  secondary: 'bg-white hover:bg-[#FAFAF8] text-[#444] border-[#D0D0CC]',
  danger: 'bg-[#EF4444] hover:bg-red-600 text-white border-transparent',
  ghost: 'bg-transparent hover:bg-[#EFEFEB] text-[#444] border-transparent',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      className = '',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center gap-2',
          'font-medium rounded-lg border transition-all font-sans',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          sizeClasses[size],
          variantClasses[variant],
          fullWidth ? 'w-full' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
```

---

### Fix 3 — client/src/App.tsx

Add the two future flags to BrowserRouter to silence the React Router warnings:

Find this line:
```typescript
<BrowserRouter>
```

Replace it with:
```typescript
<BrowserRouter
  future={{
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  }}
>
```

Do not change anything else in App.tsx.

---

## After applying all three fixes

1. Save all files
2. The Vite dev server should hot-reload automatically
3. Open http://localhost:5173 in the browser
4. Open the browser console (right click → Inspect → Console)
5. Confirm:
   - The red "Function components cannot be given refs" warning is GONE
   - The two yellow React Router warnings are GONE
   - Console shows only: "root" and the content-script lines (those are from
     your browser extension — not from our app, ignore them)
6. Test the login form:
   - Fill in email and password
   - Click Sign In
   - Confirm it submits and either logs you in or shows an error message
7. Test the Create Account tab:
   - Fill in all fields
   - Click Create account
   - Confirm it submits correctly

Do not touch any other files.
Fix all three issues in one go — they are all small targeted changes.

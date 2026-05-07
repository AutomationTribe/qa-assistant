# Issue 06 — Template 404 Fix + Save Animation

## Problem 1 — 404 on template save
The request hits /api/projects/:id/template instead of
/api/v1/projects/:id/template. The /v1 is missing.

Root cause: the baseURL fallback in client.ts is '/api' instead of
'/api/v1'. When the VITE_API_BASE_URL env variable is not loaded,
the fallback kicks in and produces the wrong URL.

## Problem 2 — No feedback when saving template
The save button has no loading state, no success confirmation,
and no animation. Users do not know if the save worked.

---

## Fix 1 — client/src/api/client.ts

Change the fallback baseURL from '/api' to '/api/v1':

Find this line:
```typescript
baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
```

Replace with:
```typescript
baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1',
```

This ensures the correct base URL is always used even if the env
variable fails to load.

---

## Fix 2 — client/.env

Confirm this file exists and contains exactly:
```
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_WS_URL=ws://localhost:3001
```

If it does not exist, create it with those two lines.
After any change to .env, the Vite dev server must be restarted.

---

## Fix 3 — Save animation in client/src/pages/TemplatePage.tsx

### Step A — Add a Toast component

Create client/src/components/ui/Toast.tsx:

```typescript
import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error'
  visible: boolean
  onHide: () => void
}

export default function Toast({
  message,
  type = 'success',
  visible,
  onHide,
}: ToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onHide, 3000)
      return () => clearTimeout(timer)
    }
  }, [visible, onHide])

  return (
    <div
      className={[
        'fixed top-5 right-5 z-50 flex items-center gap-3',
        'px-4 py-3 rounded-xl shadow-lg border',
        'font-sans text-[13px] font-medium',
        'transition-all duration-300',
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 -translate-y-2 pointer-events-none',
        type === 'success'
          ? 'bg-white border-[#EBEBEB] text-[#111]'
          : 'bg-white border-red-200 text-red-600',
      ].join(' ')}
    >
      {type === 'success' ? (
        <div className="w-5 h-5 rounded-full bg-[#ECFDF5] flex items-center justify-center flex-shrink-0">
          <span className="text-[#059669] text-[11px] font-bold">✓</span>
        </div>
      ) : (
        <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
          <span className="text-red-500 text-[11px] font-bold">✕</span>
        </div>
      )}
      {message}
    </div>
  )
}
```

### Step B — Update the Save button state in TemplatePage.tsx

Add these state variables at the top of the TemplatePage component:

```typescript
const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
const [toastVisible, setToastVisible] = useState(false)
const [toastMessage, setToastMessage] = useState('')
const [toastType, setToastType] = useState<'success' | 'error'>('success')
```

Replace the current handleSave function with this:

```typescript
const handleSave = async () => {
  setSaveState('saving')
  try {
    await templateStore.saveTemplate(projectId, fields)
    setSaveState('saved')
    setToastMessage('Template saved successfully')
    setToastType('success')
    setToastVisible(true)
    // Return to idle after 2 seconds
    setTimeout(() => setSaveState('idle'), 2000)
  } catch (err) {
    setSaveState('error')
    setToastMessage('Failed to save template. Please try again.')
    setToastType('error')
    setToastVisible(true)
    setTimeout(() => setSaveState('idle'), 2000)
  }
}
```

### Step C — Replace the Save button markup in TemplatePage.tsx

Replace the current Save Template button with this:

```typescript
<button
  onClick={handleSave}
  disabled={saveState === 'saving'}
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
```

### Step D — Add Toast to the TemplatePage return statement

Add the Toast component just before the closing tag of the page wrapper:

```typescript
import Toast from '@/components/ui/Toast'

// At the bottom of the return, before the last closing div:
<Toast
  message={toastMessage}
  type={toastType}
  visible={toastVisible}
  onHide={() => setToastVisible(false)}
/>
```

---

## What the save experience looks like after this fix

1. User clicks "Save Template"
2. Button immediately shows spinner + "Saving..." in indigo
3. Request completes (usually under 300ms on local)
4. Button turns green with "✓ Saved" text for 2 seconds
5. A white toast slides in from the top right: green dot + "Template saved successfully"
6. After 3 seconds the toast fades out
7. Button returns to normal "Save Template" indigo state
8. If save fails: button turns red "✕ Failed", toast shows error message in red

---

## After applying fixes

1. Restart the Vite dev server (env change requires restart):
   cd client && npm run dev

2. Go to /projects, click a project, go to its template page

3. Make a small change (edit a field name)

4. Click Save Template

5. Confirm:
   - Button shows spinner while saving
   - Button turns green with checkmark on success
   - Toast appears top right and fades after 3 seconds
   - No 404 error in the browser console or network tab
   - The change persists after page refresh

Do not modify any server files.
Do not change any other client files except the ones listed above.

# Fix 10 — Global Toast System + Template Redirect + Empty State

## What this fix does
1. Builds a global toast system usable from anywhere in the app
2. Shows success toast and redirects to /projects after template is saved
3. Adds an empty state to the template builder page
4. Applies the toast to all existing actions across the app

---

## Part 1 — Global Toast System

### client/src/store/toastStore.ts
Create this file. This is the single source of truth for toast state.

```typescript
import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastStore {
  toasts: Toast[]
  show: (message: string, type?: ToastType) => void
  hide: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  show: (message, type = 'success') => {
    const id = Math.random().toString(36).slice(2)
    set(state => ({
      toasts: [...state.toasts, { id, message, type }]
    }))
    // Auto-hide after 3.5 seconds
    setTimeout(() => {
      set(state => ({
        toasts: state.toasts.filter(t => t.id !== id)
      }))
    }, 3500)
  },

  hide: (id) => {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id)
    }))
  },
}))

// Helper — call this anywhere without needing the hook
// e.g. toast.success('Project created')
export const toast = {
  success: (message: string) =>
    useToastStore.getState().show(message, 'success'),
  error: (message: string) =>
    useToastStore.getState().show(message, 'error'),
  info: (message: string) =>
    useToastStore.getState().show(message, 'info'),
}
```

### client/src/components/ui/ToastContainer.tsx
Create this file. Mount once in App.tsx — renders all active toasts.

```typescript
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
            'animate-in slide-in-from-right-4 fade-in duration-200',
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
```

Note: if `animate-in` Tailwind classes are not available, replace with
a CSS animation. Add this to client/src/index.css:
```css
@keyframes toastIn {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
.toast-enter {
  animation: toastIn 0.2s cubic-bezier(0.32, 0.72, 0, 1) forwards;
}
```
And replace the animate-in classes with just `toast-enter`.

### client/src/App.tsx
Import and mount ToastContainer once at the root level.
Add it as the last child inside the BrowserRouter, outside all Routes:

```typescript
import ToastContainer from '@/components/ui/ToastContainer'

// Inside the return, after </Routes> and before </BrowserRouter>:
<ToastContainer />
```

---

## Part 2 — Apply toast to every existing action

Replace all local toast state (toastVisible, toastMessage, setToastVisible etc.)
in every page with the global toast helper.

### client/src/pages/TemplatePage.tsx

Remove any local toast state variables.
Import the toast helper:
```typescript
import { toast } from '@/store/toastStore'
import { useNavigate } from 'react-router-dom'
```

Add navigate:
```typescript
const navigate = useNavigate()
```

Update handleSave:
```typescript
const handleSave = async () => {
  setSaveState('saving')
  try {
    await templateStore.saveTemplate(projectId, fields)
    setSaveState('saved')
    toast.success('Template saved successfully')
    // Redirect to projects page after short delay so user sees the toast
    setTimeout(() => navigate('/projects'), 800)
  } catch {
    setSaveState('error')
    toast.error('Failed to save template. Please try again.')
    setTimeout(() => setSaveState('idle'), 2000)
  }
}
```

Remove the local Toast component render from TemplatePage if it exists.

### client/src/pages/FeaturesPage.tsx

Remove local toast state.
Import toast helper:
```typescript
import { toast } from '@/store/toastStore'
```

Replace any local toast calls with:
```typescript
// After feature created (generate OFF path):
toast.success(`Feature added — "${feature.name}"`)

// After feature deleted:
toast.success('Feature deleted')

// After feature updated:
toast.success('Feature updated')
```

### client/src/pages/ProjectsPage.tsx

Remove local toast state if any.
Import toast helper and use:
```typescript
// After project created:
toast.success(`Project "${name}" created`)

// After project deleted:
toast.success('Project deleted')
```

### client/src/pages/TestCasesPage.tsx (Phase 6)

When this page is built, use the global toast from the start:
```typescript
// After test case saved:
toast.success('Test case updated')

// After test case deleted:
toast.success('Test case deleted')

// After generation complete:
toast.success(`${count} test cases generated`)

// On generation error:
toast.error('Generation failed. Please try again.')
```

---

## Part 3 — Template builder empty state

### client/src/pages/TemplatePage.tsx

The page currently shows nothing useful when a project has no template.
Add this empty state when template is null and loading is false:

```tsx
{!loading && !template && (
  <div className="flex items-center justify-center py-16">
    <div className="text-center max-w-[380px]">
      <div className="w-14 h-14 rounded-2xl bg-[#EEEDF8] flex items-center justify-center text-2xl mx-auto mb-4">
        📋
      </div>
      <h3 className="text-[16px] font-semibold text-[#111] mb-2">
        No template defined yet
      </h3>
      <p className="text-[13px] text-[#888] leading-relaxed mb-6">
        A template defines the fields the AI will fill for every test case
        in this project. Add your first field to get started.
      </p>
      <button
        onClick={handleAddFirstField}
        className="inline-flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white border-none rounded-lg px-5 py-2.5 text-[13px] font-medium cursor-pointer font-sans transition-colors"
      >
        ＋ Add your first field
      </button>
      <p className="text-[11.5px] text-[#aaa] mt-4 leading-relaxed">
        We recommend starting with: Test Title, Test Steps,
        Expected Result, and Priority.
      </p>
    </div>
  </div>
)}
```

Add handler:
```typescript
const handleAddFirstField = () => {
  // Open the AddFieldModal — reuse whatever mechanism already opens it
  setAddFieldModalOpen(true)
}
```

The existing field list and Add Field button should only render
when template exists OR at least one field has been added locally
(before the first save).

---

## After applying all fixes

Test in this order:

### Toast system
1. Create a project → confirm global toast appears top right: "Project created"
2. Create a feature → confirm toast: "Feature added — [name]"
3. Delete a feature → confirm toast: "Feature deleted"
4. Confirm toasts auto-dismiss after ~3.5 seconds
5. Confirm multiple toasts stack if triggered quickly

### Template save + redirect
1. Go to a project's template page
2. Add or edit a field
3. Click Save Template
4. Confirm toast appears: "Template saved successfully"
5. Confirm you are redirected to /projects within 1 second
6. Confirm the toast is still visible briefly after redirect

### Template empty state
1. Create a brand new project
2. Navigate to its template page
3. Confirm the empty state is shown: icon, title, description, button
4. Click "Add your first field"
5. Confirm the Add Field modal opens
6. Add a field and save — confirm the empty state is replaced by the field list

### No regressions
1. All existing actions still work
2. No page has local toast state remaining
3. Browser console shows zero red errors

## Do not
- Do not create more than one ToastContainer — it is mounted once in App.tsx only
- Do not use window.alert or window.confirm for any user-facing message
- Do not keep any local toast state in any page after this fix
- Fix all TypeScript errors before confirming done

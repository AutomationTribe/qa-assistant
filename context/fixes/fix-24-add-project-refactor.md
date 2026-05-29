# Fix 24 — Add Project: Methodology Selector + URL Validation

## Workflow
Work on the develop branch.
When done, merge develop into main.
Do not push to remote — that is handled separately.

---

## What this changes
- Removes testing style field (step_by_step, BDD, exploratory)
- Adds development methodology selector (Waterfall / Agile)
- Agile shows Scrum / Kanban sub-options
- Base URL field accepts multiple URL formats and is optional
- Updates TemplateConfig type across client and server

---

## Files to change

### client/src/components/AddProjectModal.tsx
(or wherever the add project form lives — find it first)

#### Remove
Any field labelled "testing style" or "style" that has options like
step_by_step, bdd, or exploratory. Remove the state variable,
the JSX element, and the value being passed to the API call.

#### Add — methodology selector state

```typescript
const [methodology, setMethodology] = useState<
  'waterfall' | 'agile_scrum' | 'agile_kanban' | null
>(null)
const [agileFramework, setAgileFramework] = useState<
  'scrum' | 'kanban' | null
>(null)
```

#### Add — methodology selector UI

Replace the testing style field section with this:

```tsx
{/* Development methodology */}
<div className="fg">
  <label className="lbl">Development methodology</label>

  {/* Main method cards */}
  <div className="grid grid-cols-2 gap-2">
    {[
      {
        value: 'waterfall',
        label: 'Waterfall',
        desc: 'Sequential phases with defined milestones',
        icon: '↓',
      },
      {
        value: 'agile',
        label: 'Agile',
        desc: 'Iterative delivery with continuous feedback',
        icon: '↻',
      },
    ].map(opt => {
      const isWaterfall = opt.value === 'waterfall'
      const isSelected = isWaterfall
        ? methodology === 'waterfall'
        : methodology === 'agile_scrum' || methodology === 'agile_kanban'

      return (
        <div
          key={opt.value}
          onClick={() => {
            if (isWaterfall) {
              setMethodology('waterfall')
              setAgileFramework(null)
            } else {
              setMethodology(null)
              setAgileFramework(null)
            }
          }}
          className={[
            'border rounded-xl p-3 cursor-pointer transition-all',
            isSelected
              ? 'border-[#534AB7] bg-[#EEEDFE]'
              : 'border-[#DDDDD9] bg-white hover:border-[#AFA9EC]',
          ].join(' ')}
        >
          <div className={`text-[13px] font-medium mb-0.5 ${isSelected ? 'text-[#534AB7]' : 'text-[#111]'}`}>
            {opt.label}
          </div>
          <div className="text-[11.5px] text-[#888] leading-snug">{opt.desc}</div>
        </div>
      )
    })}
  </div>

  {/* Agile sub-options — shown when Agile card is active */}
  {(methodology === 'agile_scrum' ||
    methodology === 'agile_kanban' ||
    agileFramework !== null ||
    // show when agile card clicked but sub not yet chosen
    (methodology === null && agileFramework === null && /* track agile clicked */ agileClicked)) && (
    <div className="mt-2 p-3 bg-[#FAFAF8] border border-[#EBEBEB] rounded-xl">
      <div className="text-[11px] font-medium text-[#888] uppercase tracking-wide mb-2">
        Choose Agile framework
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { value: 'scrum', label: 'Scrum', desc: 'Sprints, standups, retrospectives' },
          { value: 'kanban', label: 'Kanban', desc: 'Continuous flow, WIP limits' },
        ].map(sub => {
          const isSelected = methodology === `agile_${sub.value}`
          return (
            <div
              key={sub.value}
              onClick={() => {
                setMethodology(`agile_${sub.value}` as 'agile_scrum' | 'agile_kanban')
                setAgileFramework(sub.value as 'scrum' | 'kanban')
              }}
              className={[
                'border rounded-xl p-3 cursor-pointer transition-all flex items-start gap-2',
                isSelected
                  ? 'border-[#534AB7] bg-[#EEEDFE]'
                  : 'border-[#DDDDD9] bg-white hover:border-[#AFA9EC]',
              ].join(' ')}
            >
              <div className={[
                'w-4 h-4 rounded-full border-[1.5px] flex-shrink-0 mt-0.5',
                isSelected ? 'bg-[#534AB7] border-[#534AB7]' : 'border-[#DDDDD9]',
              ].join(' ')} />
              <div>
                <div className={`text-[13px] font-medium ${isSelected ? 'text-[#534AB7]' : 'text-[#111]'}`}>
                  {sub.label}
                </div>
                <div className="text-[11.5px] text-[#888]">{sub.desc}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )}

  {/* Badge preview */}
  {methodology && (
    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEEDFE] border border-[#AFA9EC] text-[12px] font-medium text-[#3C3489]">
      <div className="w-1.5 h-1.5 rounded-full bg-[#534AB7]" />
      {methodology === 'waterfall' && 'Waterfall'}
      {methodology === 'agile_scrum' && 'Agile — Scrum'}
      {methodology === 'agile_kanban' && 'Agile — Kanban'}
    </div>
  )}
</div>
```

NOTE: The above pattern uses an `agileClicked` state variable to track
when the Agile card is clicked before a sub-option is chosen.
Add this state alongside the others:

```typescript
const [agileClicked, setAgileClicked] = useState(false)
```

And in the Agile card onClick, set it:
```typescript
setAgileClicked(true)
setMethodology(null)
setAgileFramework(null)
```

Update the sub-options visibility condition to simply:
```typescript
{agileClicked && ( ... )}
```

#### Add — Base URL validation

Replace the baseUrl input with this:

```tsx
<div className="fg">
  <label className="lbl">
    Base URL
    <span className="text-[11px] font-normal text-[#aaa] ml-1">optional</span>
  </label>
  <input
    type="text"
    value={baseUrl}
    onChange={e => {
      setBaseUrl(e.target.value)
      if (urlError) validateBaseUrl(e.target.value)
    }}
    onBlur={e => validateBaseUrl(e.target.value)}
    placeholder="www.yourapp.com or https://yourapp.com"
    className={[
      'inp w-full',
      urlError ? 'border-[#E24B4A]' : '',
    ].join(' ')}
  />
  {urlError && (
    <div className="text-[11.5px] text-[#A32D2D] mt-1">
      Enter a valid URL — e.g. www.test.com, https://www.test.com or https://test.com
    </div>
  )}
  <div className="flex gap-1.5 mt-1.5 flex-wrap">
    {['www.test.com', 'https://www.test.com', 'https://test.com', 'http://localhost:3000'].map(f => (
      <span key={f} className="text-[11px] px-2 py-0.5 rounded-full bg-[#F4F4F2] border border-[#EBEBEB] font-mono text-[#666]">
        {f}
      </span>
    ))}
  </div>
</div>
```

Add these to the component:

```typescript
const [urlError, setUrlError] = useState('')

const URL_PATTERN =
  /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$|^https?:\/\/localhost(:\d+)?(\/.*)?$/

const validateBaseUrl = (value: string): boolean => {
  if (!value.trim()) {
    setUrlError('')
    return true
  }
  const valid = URL_PATTERN.test(value.trim())
  setUrlError(valid ? '' : 'invalid')
  return valid
}
```

#### Update validation in handleCreate / handleSubmit

```typescript
const handleCreate = async () => {
  if (!name.trim() || name.trim().length < 3) {
    setError('Project name must be at least 3 characters')
    return
  }
  if (baseUrl && !validateBaseUrl(baseUrl)) {
    return
  }
  if (!methodology) {
    setError('Please select a development methodology')
    return
  }
  // ...existing create logic...
}
```

#### Update API call — pass methodology as templateConfig style

```typescript
await projectsAPI.createProject({
  name: name.trim(),
  description: description.trim() || undefined,
  baseUrl: baseUrl.trim() || undefined,
  templateConfig: { style: methodology },
})
```

---

### client/src/types/api.ts

Update TemplateConfig:

```typescript
export type TemplateConfig = {
  style: 'waterfall' | 'agile_scrum' | 'agile_kanban'
}
```

Remove any reference to 'step_by_step' | 'bdd' | 'exploratory' in this file.

---

### server/src/types/ or server/src/services/projectService.ts

Find wherever TemplateConfig is defined on the server side and update:

```typescript
type TemplateConfig = {
  style: 'waterfall' | 'agile_scrum' | 'agile_kanban'
}
```

Also find any validation that checks for the old style values and update
to accept the new ones.

---

### server/src/services/llm/prompts.ts

Find where templateConfig.style is used to build the AI prompt.
Update it to handle the new values:

```typescript
const methodologyLabel =
  style === 'waterfall' ? 'Waterfall — sequential phases'
  : style === 'agile_scrum' ? 'Agile Scrum — sprint-based delivery'
  : style === 'agile_kanban' ? 'Agile Kanban — continuous flow'
  : 'Agile'

// Use methodologyLabel in the prompt context instead of the raw style value
```

---

## After all changes

### Check
- [ ] Selecting Waterfall shows badge "Waterfall", no sub-options
- [ ] Selecting Agile shows Scrum/Kanban sub-options
- [ ] Selecting Scrum shows badge "Agile — Scrum"
- [ ] Selecting Kanban shows badge "Agile — Kanban"
- [ ] Submitting without methodology shows error
- [ ] www.test.com accepted as valid URL
- [ ] https://www.test.com accepted as valid URL
- [ ] https://test.com accepted as valid URL
- [ ] notaurl accepted as invalid URL — shows error
- [ ] Empty URL accepted — no error (optional field)
- [ ] TypeScript errors are all fixed

### Workflow
1. Make all changes on the develop branch
2. Merge develop into main locally
3. Do not push to remote — that is done separately

Do not modify any database schema or migration files.
Do not modify any other files outside those listed above.

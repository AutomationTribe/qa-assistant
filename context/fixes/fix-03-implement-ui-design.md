# Issue 03 — Implement UI Design into React Components

## What this task does
Replaces the current plain unstyled UI with the clean minimalist design
established in regi-ui-design.html. Every component must match the design
exactly — colours, spacing, typography, border radius, and interactions.

## Design system — use these values everywhere, never deviate

### Colours
- Primary: #4F46E5 (indigo) — buttons, active states, focus rings
- Primary dark: #4338CA — button hover
- Primary light bg: #EEEDF8 — active nav, selected badges
- Background page: #F0F0ED — outer app background
- Background card: #FFFFFF — cards, panels, modals
- Background subtle: #FAFAF8 — sidebar, input default bg
- Border default: #EBEBEB — card borders, dividers
- Border input: #DDDDD9 — input default border
- Text primary: #111111 — headings, labels
- Text secondary: #444444 — body text
- Text muted: #999999 — placeholders, hints, subtitles
- Text faint: #CCCCCC — optional labels, disabled
- Badge green bg: #ECFDF5, text: #059669
- Badge amber bg: #FFFBEB, text: #B45309
- Badge indigo bg: #EEEDF8, text: #4F46E5
- Danger: #EF4444 — remove/delete actions

### Typography
- Font: system-ui, -apple-system, 'Inter', sans-serif (already in Tailwind)
- Page title: 15px, font-weight 600, color #111
- Section heading: 10.5px, font-weight 600, uppercase, letter-spacing 0.07em, color #999
- Label: 12px, font-weight 500, color #333
- Body: 13px, color #444
- Hint/caption: 11px, color #999
- Badge: 10.5px, font-weight 500

### Spacing
- Card padding: p-5 (20px)
- Content area padding: p-6 (24px)
- Sidebar padding: px-4 py-6
- Topbar height: h-14 (56px)
- Sidebar width: w-52 (208px)
- Gap between cards: gap-3.5
- Form group margin bottom: mb-4

### Border radius
- Cards: rounded-xl (12px)
- Inputs: rounded-lg (8px)
- Buttons: rounded-lg (8px)
- Badges: rounded-full
- Avatars: rounded-full
- Brand icon: rounded-xl

### Shadows
- Card hover: shadow-md with indigo tint
- Modal/panel: shadow-xl
- Focus ring: ring-2 ring-indigo-500/10

---

## Files to create or replace

### client/src/index.css
Add this to the base styles:
```css
body {
  background-color: #F0F0ED;
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
}
```

### client/src/components/Layout.tsx
Shared app shell with sidebar and topbar. Used by all protected pages.

Props:
- title: string — shown in the topbar
- actions?: ReactNode — buttons shown in topbar right side
- children: ReactNode — page content

Sidebar contents:
- Brand: indigo dot + "Regi" text
- Nav items (use react-router NavLink for active state):
  - ▣ Projects → /projects
  - 🎫 Tickets → /tickets (greyed out, not linked yet — add 'soon' badge)
  - ✓ Test Cases → /testcases (greyed out, not linked yet)
  - ↗ Export → /export (greyed out, not linked yet)
  - ⚙ Settings → /settings (greyed out, not linked yet)
- Footer: user avatar (initials), name, role from authStore

Active nav item style: bg-[#EEEDF8] text-[#4F46E5] font-medium
Inactive nav item style: text-[#777] hover:bg-[#EFEFEB] hover:text-[#111]

Topbar:
- Left: page title (font-semibold text-[15px] text-[#111])
- Right: actions slot

### client/src/pages/LoginPage.tsx
Replace entirely with the designed version.

Layout: full screen flex row, min-h-screen

Left panel (38% width, hidden on mobile):
- Background: linear-gradient from #18181B to #312E81
- Brand: white "R" icon (indigo bg, rounded-xl) + "Regi" text
- Tagline: "Generate QA test cases from your tickets using AI."
- Quote block: italic quote with left border, attribution below

Right panel (flex-1):
- White background, centered content
- Max width of form card: 320px

Form card:
- Heading: "Welcome back" (22px, font-semibold)
- Sub: "Sign in to your Regi workspace" (13px, muted)
- Two tabs: "Sign In" | "Create Account"
  - Tab active: text-[#4F46E5] border-b-2 border-[#4F46E5] font-medium
  - Tab inactive: text-[#aaa] border-b-2 border-transparent
- Tab content switches without page navigation

Sign In form fields:
- Email address input
- Password input
- "Sign in →" primary button (full width)
- "Forgot password? Reset it" link centered below

Create Account form fields:
- Full name input
- Work email input
- Password input (hint: "Use at least 8 characters")
- Workspace name input (hint: "Your team's shared workspace in Regi")
- "Create account →" primary button (full width)

Validation: react-hook-form + zod, show inline errors under each field
Loading state: spinner inside button, button disabled while request is in flight
On success (sign in): setAuth then navigate to /projects
On success (create account): auto login then navigate to /projects

### client/src/pages/ProjectsPage.tsx
Replace entirely with the designed version.
Wrap with Layout component (title="Projects").

Topbar action: "+ New Project" primary button that opens CreateProjectModal

Content area:
- Project cards in a responsive grid: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
- Each card: white bg, rounded-xl border, p-5, hover lifts with indigo border tint
  - Project icon (emoji or letter avatar in indigo bg)
  - Project name (font-medium text-[#111])
  - Meta line: "{n} tickets · {n} test cases" (text-muted text-[12px])
  - Template style badge (coloured)
  - On click: selectProject and navigate to /generate
- Last item in grid: dashed "＋ New Project" card, same height as others
  - On click: open CreateProjectModal
- Empty state (no projects): centered icon, "No projects yet", subtitle, create button

Loading state: skeleton cards (grey animated placeholder blocks)

### client/src/components/CreateProjectModal.tsx
Replace entirely with the designed slide-in panel version.

Behaviour:
- Slides in from the right as a fixed panel (not a centred dialog)
- Overlay behind it dims and blurs the projects grid slightly
- Panel width: 400px on desktop, full width on mobile
- Scrollable content if form is tall

Fields in order:
1. Project name (required)
2. Description (optional, textarea 2 rows)
3. Base URL (optional, placeholder "https://app.yourproduct.com",
   hint: "Helps the AI understand the context of your tests")
4. Test case style selector — three style buttons side by side:
   📋 BDD | 🔢 Step by Step | 🔍 Exploratory
   Only one active at a time, active = indigo border + bg + text
   Default selected: BDD
5. Test Logins section (optional):
   - Section label: "TEST LOGINS" uppercase muted
   - Each login card: border rounded-xl bg-subtle padding
     - "Login N" label + Remove button (red text, top right)
     - Username/Email + Password inputs side by side (grid-cols-2)
     - Role input full width (optional, hint text)
   - "＋ Add another login" dashed button below
   - Max 5 logins

Footer (sticky at bottom of panel):
- Cancel button (secondary)
- "Create Project →" primary button
- On cancel: close panel
- On create: call projectStore.createProject with all fields, close on success
- Disable Create button while loading

Validation:
- name: required, min 2 chars
- baseUrl: optional but if provided must be a valid URL
- templateConfig.style: required, defaults to 'bdd'
- logins: optional, but if a login is added username + password are required,
  role is always optional

### client/src/types/api.ts
Update Project type to include the new fields:
```typescript
export type ProjectLogin = {
  username: string
  password: string
  role?: string
}

export type TemplateConfig = {
  style: 'bdd' | 'step_by_step' | 'exploratory'
}

export type Project = {
  id: string
  name: string
  description?: string
  baseUrl?: string
  workspaceId: string
  templateConfig: TemplateConfig
  logins?: ProjectLogin[]
  createdAt: string
  _count?: { tickets: number; testCases?: number }
}
```

### server/prisma/schema.prisma
Update the Project model to include new fields:
- description  String?  @db.Text
- baseUrl      String?
- logins       Json?    (stores array of { username, password, role? })

After updating the schema, generate a new migration:
SHOW ME THE MIGRATION SQL FIRST — do not run it automatically.

---

## Shared input component (reuse across all forms)

Create client/src/components/ui/Input.tsx:
```typescript
// Reusable input with label, hint, and error state
// Props: label, hint?, error?, optional?, ...input HTML props
// Error state: border-red-400 + red error text below
// Focus state: border-[#4F46E5] ring-2 ring-[#4F46E5]/10
```

Create client/src/components/ui/Button.tsx:
```typescript
// variant: 'primary' | 'secondary' | 'danger' | 'ghost'
// size: 'sm' | 'md' | 'lg'
// loading?: boolean — shows spinner, disables button
// fullWidth?: boolean
```

---

## After building all files

Test this flow:
1. Open http://localhost:5173 — confirm the login page matches the design
2. Switch between Sign In and Create Account tabs
3. Create a new account — confirm you land on /projects
4. Confirm the projects page shows the sidebar, topbar, and card grid
5. Click "New Project" — confirm the slide-in panel appears
6. Fill in all fields including adding 2 logins — confirm it saves
7. Confirm the new project appears as a card with correct badge colour
8. Open browser console — zero red errors

Do not move to any other task until I confirm this looks correct.
Show me screenshots or describe exactly what each screen looks like.

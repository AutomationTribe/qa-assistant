# UI Design Generator — Reusable Template

## What this file does
Run this whenever you need a new page or feature designed before building it.
Fill in the ONE section marked "YOUR INPUT HERE" and tell Claude Code:

  "Read context/ui-design-generator.md and generate a design for [page name]"

Claude Code will produce a new standalone HTML file at:
  client/src/designs/{page-name}-design.html

Open it in your browser to review the design. When you approve it,
create an issue file to implement it into React (like issue-03).

---

## Design system — always apply these (do not change)

### Colours
- Primary action:      #4F46E5
- Primary hover:       #4338CA
- Primary light bg:    #EEEDF8
- Page background:     #F0F0ED
- Card background:     #FFFFFF
- Subtle background:   #FAFAF8
- Border default:      #EBEBEB
- Border input:        #DDDDD9
- Text primary:        #111111
- Text secondary:      #444444
- Text muted:          #999999
- Text faint:          #CCCCCC
- Success bg/text:     #ECFDF5 / #059669
- Warning bg/text:     #FFFBEB / #B45309
- Danger:              #EF4444

### Typography scale
- Page title:      15px, font-weight 600
- Section label:   10.5px, font-weight 600, uppercase, letter-spacing 0.07em
- Card title:      14px, font-weight 500
- Label:           12px, font-weight 500
- Body:            13px
- Caption/hint:    11px
- Badge:           10.5px, font-weight 500

### Spacing
- Page content padding: 24px
- Card padding:         20px
- Sidebar width:        208px
- Topbar height:        56px
- Form gap:             16px between fields
- Card grid gap:        14px

### Borders and radius
- Cards:    1px solid #EBEBEB, border-radius 12px
- Inputs:   1px solid #DDDDD9, border-radius 8px, bg #FAFAF8
- Buttons:  border-radius 8px
- Badges:   border-radius 999px (pill)
- Modals/panels: box-shadow 0 8px 40px rgba(0,0,0,.12)

### Interaction states
- Input focus:    border #4F46E5, box-shadow 0 0 0 3px rgba(79,70,229,.07)
- Button hover:   background #4338CA
- Card hover:     border-color #C4C2F4, box-shadow 0 2px 16px rgba(79,70,229,.1)
- Nav active:     background #EEEDF8, color #4F46E5, font-weight 500

### Layout
- All app pages use the sidebar + topbar shell (same as Projects page)
- Sidebar is always visible on desktop
- Topbar always shows page title left, action buttons right
- Content area scrolls independently

---

## Sidebar navigation items (always the same)
▣  Projects      → /projects
🎫  Tickets       → /tickets
✓  Test Cases    → /testcases
↗  Export        → /export
⚙  Settings      → /settings

Active item: bg-[#EEEDF8] text-[#4F46E5]
Inactive:    text-[#777] hover:bg-[#EFEFEB]

---

## YOUR INPUT HERE
## Fill in this section when running the generator

### Page or feature name
<!-- e.g. "Generate Test Cases", "Ticket Detail", "Export", "Settings" -->
REPLACE WITH PAGE NAME

### URL this page lives at
<!-- e.g. /generate, /tickets/:id, /export -->
REPLACE WITH URL

### What the user is trying to do on this page
<!-- One sentence. e.g. "Paste a ticket requirement and trigger AI test case generation" -->
REPLACE WITH USER GOAL

### Main sections or panels on this page
<!-- List each section and what it contains. Be specific. -->
<!-- Example:
  Section 1 — Ticket input area
    - Dropdown to select project
    - Textarea for pasting ticket summary
    - Textarea for description
    - Textarea for acceptance criteria (optional)
    - "Generate Test Cases" primary button

  Section 2 — Streaming preview panel
    - Appears after Generate is clicked
    - Shows tokens appearing word by word
    - Loading spinner with "Generating..." label
    - Cancel button

  Section 3 — Results list
    - Appears when generation is complete
    - List of TestCaseCard components
    - Each card: title, priority badge, test type, steps, expected result
    - Export button at the bottom
-->
REPLACE WITH SECTIONS

### Key states to show in the design
<!-- List each state that needs a visual. -->
<!-- Example:
  - Empty state (no project selected)
  - Loading state (generation in progress, tokens streaming)
  - Success state (test cases displayed)
  - Error state (generation failed, retry button shown)
-->
REPLACE WITH STATES

### Interactive elements
<!-- List buttons, dropdowns, toggles, modals that appear on this page -->
<!-- Example:
  - Project selector dropdown
  - Generate button (disabled until all required fields filled)
  - Cancel generation button (appears during streaming)
  - Regenerate single test case button (on each card)
  - Export to CSV button
-->
REPLACE WITH INTERACTIONS

### Any special behaviour to show
<!-- Anything unusual, like real-time streaming, drag and drop, inline editing -->
REPLACE WITH SPECIAL BEHAVIOUR OR WRITE "none"

---

## Output instructions for Claude Code

Read everything above. Then:

1. Generate a single self-contained HTML file
   Output path: client/src/designs/{page-name}-design.html
   The file must include all CSS inline (no external dependencies)
   Use the exact design system values above — no deviations

2. The HTML file must show ALL states from "Key states to show"
   Use a tab or button switcher at the top to switch between states
   (same pattern as regi-ui-design.html)

3. Include the sidebar and topbar shell on every state
   The page title in the topbar must match the page name

4. Every interactive element must be shown
   Buttons, dropdowns, and modals can be static (no real functionality needed)
   But hover states should work via CSS

5. Add a small legend at the top of the file (outside the browser frame)
   that lists what each state tab shows and any design notes

6. Do NOT install any npm packages
   Do NOT modify any existing React files
   Only create the new HTML design file

7. After generating, tell me:
   - The file path
   - How to open it (just open in browser)
   - Any design decisions you made that were not specified
   - Any questions you have before I approve the design for implementation

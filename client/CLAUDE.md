# Client — React Frontend Rules

## Component rules
- All shared UI components go in src/components/
- Page-level components go in src/pages/
- One component per file, filename = component name (PascalCase)
- Use shadcn/ui as the base — extend, don't replace

## State management
- Use Zustand for all global state — no Redux, no React Context for app state
- Local UI state (open/closed, hover) → useState is fine
- Store files go in src/store/, one file per domain
  e.g. testCaseStore.ts, projectStore.ts, authStore.ts

## API calls
- All API calls go through src/api/ — never fetch() directly in components
- One file per backend resource: testcases.ts, tickets.ts, auth.ts, projects.ts
- Use the Axios instance from src/api/client.ts (has auth headers + interceptors)

## Styling
- Tailwind only — no inline styles, no separate CSS files, no CSS modules
- Use shadcn/ui class variants for component states
- Dark mode via Tailwind dark: prefix

## TypeScript
- Always type props explicitly — no React.FC<any>
- API response types live in src/types/api.ts
- Never use @ts-ignore — fix the type

## Real-time
- WebSocket connection is in src/hooks/useSocket.ts
- Use this hook to receive LLM streaming tokens
- Never open a new socket connection inside a component directly

## Path alias
- Use @/ for imports from src/ e.g. import { Button } from '@/components/Button'

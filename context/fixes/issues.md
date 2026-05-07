#Issue 01 - ✅ FIXED
Error: http://localhost:3001/api/v1/projects 500 (Internal Server Error) after login

**Root cause:** projectService.listProjects() was trying to count `testCases` in the `_count` select, but Project model doesn't have a direct relation to TestCase—only to Ticket. TestCases belong to Tickets.

**Solution:** Removed `testCases: true` from the _count select in listProjects method, keeping only `tickets: true` which is the valid relationship.


#Issue 02 - ✅ FIXED
Blank white screen after the implementation of phase 4 test case template builder, with console error: "The requested module '/src/api/client.js' does not provide an export named 'client' (at templates.js:1:10)"

**Root cause:** Stale compiled `.js` files in `client/src/api/` were being served by Vite instead of recompiling from TypeScript sources. The `.js` files had the old import syntax (`import { client }`) while the `.ts` files had been updated to the correct syntax (`import apiClient from './client'`).

**Solution:** Deleted stale compiled files:
- client/src/api/templates.js
- client/src/api/client.js  
- client/src/api/projects.js

Vite will now recompile from the correct TypeScript sources on next page load.



#Issue 03 - ✅ FIXED
404 error for stale compiled .js files after Issue 02 was fixed
Error: GET http://localhost:5173/src/api/projects.js?t=1777979320175 net::ERR_ABORTED 404 (Not Found)

**Root cause:** Beyond the .js files deleted for Issue 02, there were many more stale compiled JavaScript files throughout the entire `client/src/` directory. Vite was preferring these old .js files over the TypeScript sources, causing both old import syntax issues and 404 errors when modules were referenced.

**Solution:** Deleted all stale compiled .js files from `client/src/`:
- Removed 15+ .js files across all directories (main.js, App.js, all components, all pages, all stores, all type files)
- Verified only TypeScript source files (.ts and .tsx) remain
- Vite will now recompile everything from correct TypeScript sources on next page load

#Issue 04 - ✅ FIXED
Click the create project button returns 400 (Bad Request)
Error: POST http://localhost:3001/api/v1/projects 400 (Bad Request)

**Root cause:** The frontend `createProject()` API function was incomplete. It only accepted and sent `name` and `templateConfig`, but the CreateProjectModal was trying to pass `description`, `baseUrl`, and `logins`. The backend validation expected all these fields and rejected the request with a 400 error.

**Solution:** Updated the `createProject()` function signature in `client/src/api/projects.ts` to accept all fields that the modal sends:
- Added `description?: string`
- Added `baseUrl?: string`
- Added `logins?: Array<{ username: string; password: string; role?: string }>`

Now the API function properly forwards all form data to the backend.

#Issue 05 - ✅ FIXED
500 Internal Server Error when creating a project: "Unknown argument `template`" from Prisma

**Root cause:** The Prisma schema was updated to add the `template TestCaseTemplate?` relation to the Project model (in prisma/schema.prisma line 54), but the Prisma client code generator wasn't run. The stale Prisma client didn't have the `template` field in its TypeScript types, so when projectService.ts tried to pass `template: { create: { fields: { createMany: ... } } }`, Prisma validation rejected it as an unknown field.

**Solution:** Regenerated the Prisma client by running `npx prisma generate` in the server directory. This reads the current schema and regenerates the TypeScript types to include the `template` field and its nested create syntax. The projectService.ts code was already correct and ready for the updated client.
    }
}

#Issue 06 - ✅ FIXED
Unable to route to the template builder after creating a project

**Root cause:** The `createProject` store action was successfully creating the project and updating the projects list, but it wasn't returning the created project. Additionally, the `CreateProjectModal` component wasn't navigating to the template builder page after project creation. The route `/projects/:projectId/template` existed in the app routing, but it was never being triggered.

**Solution:** 
1. Updated `projectStore.ts` to return the created project from the `createProject` action and changed the return type from `Promise<void>` to `Promise<Project>`
2. Updated `CreateProjectModal.tsx` to import `useNavigate` from react-router-dom
3. Modified the `handleCreate` method to capture the returned project and navigate to `/projects/${project.id}/template` after successfully closing the modal

Now when a project is created, the user is automatically routed to the template builder page for that project.
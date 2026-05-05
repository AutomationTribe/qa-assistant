#Issue 01 - ✅ FIXED
Error: http://localhost:3001/api/v1/projects 500 (Internal Server Error) after login

**Root cause:** projectService.listProjects() was trying to count `testCases` in the `_count` select, but Project model doesn't have a direct relation to TestCase—only to Ticket. TestCases belong to Tickets.

**Solution:** Removed `testCases: true` from the _count select in listProjects method, keeping only `tickets: true` which is the valid relationship.
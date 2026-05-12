# Fix 11 — Zephyr Scale Token + How to Get It

## Root cause of the 400 error
The error "The token was expected to have 3 parts, but got 0" means
the API token is arriving at the Zephyr API as an empty string.
This happens because our connection test is calling Zephyr BEFORE
saving, and the token is not being passed correctly in that test call.

The fix is in server/src/controllers/zephyrController.ts and
server/src/services/zephyrService.ts.

---

## Fix 1 — server/src/controllers/zephyrController.ts

The saveConnection controller must log what it receives and pass
the token correctly. Replace the saveConnection method:

```typescript
saveConnection: async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { apiToken, jiraProjectKey, fieldMapping } = req.body

    // Validate all required fields are present and non-empty
    if (!apiToken || typeof apiToken !== 'string' || !apiToken.trim()) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'apiToken is required and must be a non-empty string',
        },
      })
    }
    if (!jiraProjectKey || !jiraProjectKey.trim()) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'jiraProjectKey is required',
        },
      })
    }
    if (!fieldMapping || !fieldMapping.name || !fieldMapping.steps) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'fieldMapping must include "name" and "steps" keys',
        },
      })
    }

    const trimmedToken = apiToken.trim()

    // Test the connection before saving
    const valid = await zephyrService.testConnection(trimmedToken)
    if (!valid) {
      return res.status(400).json({
        error: {
          code: 'INVALID_TOKEN',
          message:
            'Could not connect to Zephyr Scale. Check your API token and try again.',
        },
      })
    }

    const conn = await zephyrService.saveConnection(
      req.params.projectId,
      req.user!.workspaceId,
      {
        apiToken: trimmedToken,
        jiraProjectKey: jiraProjectKey.trim().toUpperCase(),
        fieldMapping,
      }
    )

    return res.json({
      connection: {
        id: conn.id,
        jiraProjectKey: conn.jiraProjectKey,
        fieldMapping: conn.fieldMapping,
        connected: true,
      },
    })
  } catch (err) {
    next(err)
  }
},
```

## Fix 2 — server/src/services/zephyrService.ts

Update the testConnection function to use a reliable endpoint
and handle all error cases correctly:

```typescript
async testConnection(apiToken: string): Promise<boolean> {
  if (!apiToken || !apiToken.trim()) return false

  try {
    const response = await axios.get(
      `${ZEPHYR_BASE}/projects?maxResults=1`,
      {
        headers: {
          Authorization: `Bearer ${apiToken.trim()}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
        validateStatus: (status) => status < 500, // don't throw on 4xx
      }
    )
    // 200 or 404 = token is valid (404 just means no projects)
    // 401 or 403 = token is invalid
    return response.status !== 401 && response.status !== 403
  } catch (err: any) {
    // Network error or timeout
    console.error('Zephyr connection test error:', {
      message: err.message,
      code: err.code,
    })
    return false
  }
},
```

---

## How to get your Zephyr Scale API token (exact steps)

The token is generated from inside Jira — not from the Zephyr Scale
website or SmartBear separately.

### Method A — Via your Jira profile icon (fastest)
1. Open your Jira instance in the browser
   e.g. https://your-company.atlassian.net
2. Click your **profile picture / avatar** in the bottom-left or top-right
3. In the dropdown look for **"Zephyr Scale API Access Tokens"**
   — it appears as a menu item only if Zephyr Scale is installed
4. Click **Create access token**
5. A popup appears with the token
6. Click **Copy** immediately — the token is shown only once
7. Paste it into Regi's Zephyr setup panel

### Method B — Via Jira Settings
1. Click the **⚙ Settings** gear icon (top right of Jira)
2. Click **General Settings**
3. In the left sidebar scroll to the **Apps** section
4. Click **Zephyr Scale API Access Tokens**
5. Click **Create access token**
6. Copy immediately

### Method C — Direct URL
Go directly to:
```
https://YOUR-COMPANY.atlassian.net/jira/software/projects
```
Then click your avatar → **Zephyr Scale API Access Tokens**

---

## What the token looks like
A valid Zephyr Scale API token is a long string, typically starting with
eyJ (it is a JWT format internally). Example length: 200+ characters.

If what you copied is short (under 50 characters) it is probably the
wrong token — likely your Atlassian account API token instead.

---

## How to verify the token works before using Regi
Run this curl command in your terminal, replacing the values:

```bash
curl -X GET "https://api.zephyrscale.smartbear.com/v2/projects?maxResults=1" \
  -H "Authorization: Bearer YOUR_ZEPHYR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -s | json_pp
```

Expected response if token is valid:
```json
{
  "values": [...],
  "total": 1
}
```

Expected response if token is wrong:
```json
{
  "error": "Unauthorized"
}
```

Run this test before trying to connect in Regi.
If it fails, the token is wrong — generate a new one using Method A above.

---

## After applying the code fixes

1. Restart the server: cd server && npm run dev
2. First verify your token with the curl command above
3. If curl returns projects, go to the test cases page in Regi
4. Click Connect Zephyr
5. Paste the token — confirm it is the full long string
6. Enter your Jira project key (e.g. MAP)
7. Map the template fields
8. Click Connect to Zephyr
9. Confirm success toast: "Zephyr Scale connected"

Do not modify any other files.

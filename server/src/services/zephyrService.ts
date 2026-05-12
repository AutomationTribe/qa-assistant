import axios from 'axios'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/encryption'
import { NotFoundError, UnauthorizedError } from '@/lib/errors'

const ZEPHYR_BASE = 'https://api.zephyrscale.smartbear.com/v2'

function mapPriority(raw: any): string {
  const s = String(raw || '').toUpperCase()
  if (s.includes('HIGH') || s.includes('CRITICAL')) return 'High'
  if (s.includes('LOW')) return 'Low'
  return 'Medium'
}

export const zephyrService = {

  // ── Connection management ────────────────────────────────

  async getConnection(projectId: string, workspaceId: string) {
    if (!prisma) {
      throw new Error('Prisma client is not initialized')
    }
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })
    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundError('Project not found')
    }
    const conn = await prisma.zephyrConnection.findUnique({
      where: { projectId },
    })
    if (!conn) return null
    return {
      id: conn.id,
      jiraProjectKey: conn.jiraProjectKey,
      fieldMapping: conn.fieldMapping,
      connected: true,
    }
  },

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
          validateStatus: (status) => status < 500,
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

  async saveConnection(
    projectId: string,
    workspaceId: string,
    data: {
      apiToken: string
      jiraProjectKey: string
      fieldMapping: Record<string, string>
    }
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })
    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundError('Project not found')
    }
    const encryptedToken = encrypt(data.apiToken)
    return prisma.zephyrConnection.upsert({
      where: { projectId },
      create: {
        projectId,
        apiToken: encryptedToken,
        jiraProjectKey: data.jiraProjectKey.toUpperCase().trim(),
        fieldMapping: data.fieldMapping,
      },
      update: {
        apiToken: encryptedToken,
        jiraProjectKey: data.jiraProjectKey.toUpperCase().trim(),
        fieldMapping: data.fieldMapping,
      },
    })
  },

  async deleteConnection(projectId: string, workspaceId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })
    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundError('Project not found')
    }
    await prisma.zephyrConnection.delete({ where: { projectId } })
  },

  async getProjectFolders(
    projectId: string,
    workspaceId: string
  ): Promise<Array<{ id: number; name: string; parentId: number | null }>> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { zephyrConnection: true },
    })
    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundError('Project not found')
    }
    const conn = project.zephyrConnection
    if (!conn) return []

    const apiToken = decrypt(conn.apiToken)

    try {
      const allFolders: Array<{ id: number; name: string; parentId: number | null }> = []
      let startAt = 0
      const maxResults = 500

      while (true) {
        const response = await axios.get(
          `${ZEPHYR_BASE}/folders?projectKey=${conn.jiraProjectKey}&folderType=TEST_CASE&maxResults=${maxResults}&startAt=${startAt}`,
          {
            headers: {
              Authorization: `Bearer ${apiToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
            validateStatus: s => s < 500,
          }
        )

        if (response.status !== 200) break

        const values = response.data?.values || []
        if (values.length === 0) break

        allFolders.push(
          ...values.map((f: any) => ({
            id: f.id as number,
            name: f.name as string,
            parentId: f.parentId ?? null,
          }))
        )

        if (values.length < maxResults) break
        startAt += maxResults
      }

      return allFolders
    } catch {
      return []
    }
  },

  async createOrGetFolder(
    apiToken: string,
    jiraProjectKey: string,
    folderName: string,
    parentId?: number | null
  ): Promise<number | null> {
    try {
      // Step 1 — search for existing folder with same name + parent (paginate to get all)
      const allFolders: any[] = []
      let startAt = 0
      const maxResults = 500

      while (true) {
        const searchRes = await axios.get(
          `${ZEPHYR_BASE}/folders?projectKey=${jiraProjectKey}&folderType=TEST_CASE&maxResults=${maxResults}&startAt=${startAt}`,
          {
            headers: {
              Authorization: `Bearer ${apiToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
            validateStatus: () => true,
          }
        )

        if (searchRes.status !== 200) break

        const values = searchRes.data?.values || []
        if (values.length === 0) break

        allFolders.push(...values)

        if (values.length < maxResults) break
        startAt += maxResults
      }

      console.log(`[Zephyr] Searching ${allFolders.length} folders for: "${folderName}" (parent: ${parentId ?? 'root'})`)

      // Match by name AND parentId
      const existing = allFolders.find(f => {
        const nameMatch = f.name === folderName
        const parentMatch = parentId != null
          ? f.parentId === parentId
          : (f.parentId === null || f.parentId === undefined)
        return nameMatch && parentMatch
      })

      if (existing) {
        console.log(`[Zephyr] Reusing existing folder: "${folderName}" (id: ${existing.id}, parent: ${existing.parentId})`)
        return existing.id as number
      }

      // Step 2 — folder not found, create it
      const body: Record<string, any> = {
        projectKey: jiraProjectKey,
        name: folderName,
        folderType: 'TEST_CASE',
      }
      if (parentId != null) {
        body.parentId = parentId
      }

      console.log(`[Zephyr] Creating folder: "${folderName}" (parent: ${parentId ?? 'root'})`)

      const createRes = await axios.post(
        `${ZEPHYR_BASE}/folders`,
        body,
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
          validateStatus: () => true,
        }
      )

      if (createRes.status === 201 || createRes.status === 200) {
        console.log(`[Zephyr] Created folder: "${folderName}" (id: ${createRes.data.id}, parent: ${parentId ?? 'root'})`)
        return createRes.data.id as number
      }

      console.log('[Zephyr] Folder create failed:', createRes.status, createRes.data)
      return null

    } catch (err: any) {
      console.error('[Zephyr] createOrGetFolder error:', err.message)
      return null
    }
  },

  // ── Export ────────────────────────────────────────────────

  async exportTestCases(
    featureId: string,
    testCaseIds: string[] | 'all',
    workspaceId: string,
    parentFolderId?: number | null
  ) {
    const feature = await prisma.feature.findUnique({
      where: { id: featureId },
      include: {
        project: {
          include: {
            zephyrConnection: true,
            template: {
              include: {
                fields: { orderBy: { order: 'asc' } },
              },
            },
          },
        },
      },
    })

    if (!feature) throw new NotFoundError('Feature not found')
    if (feature.project.workspaceId !== workspaceId) {
      throw new UnauthorizedError('Unauthorized')
    }

    const conn = feature.project.zephyrConnection
    if (!conn) {
      throw new Error(
        'NO_ZEPHYR: No Zephyr connection configured for this project. ' +
        'Go to project settings to connect.'
      )
    }

    const apiToken = decrypt(conn.apiToken)
    const mapping = conn.fieldMapping as Record<string, string>
    const jiraProjectKey = conn.jiraProjectKey

    // Load test cases — skip ones already in Zephyr
    const whereClause: any = {
      featureId,
      deletedAt: null,
      zephyrKey: null,
    }
    if (testCaseIds !== 'all') {
      whereClause.id = { in: testCaseIds }
    }

    const testCases = await prisma.testCase.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
    })

    if (testCases.length === 0) {
      return {
        results: [],
        successCount: 0,
        failCount: 0,
        total: 0,
        message: 'All selected test cases are already in Zephyr Scale.',
      }
    }

    // Create or get the feature folder (sanitized name)
    const sanitisedFolderName = feature.name
      .replace(/[<>:"|?*]/g, '')
      .slice(0, 255)
      .trim()

    const folderId = await this.createOrGetFolder(
      apiToken,
      jiraProjectKey,
      sanitisedFolderName,
      parentFolderId ?? null
    )

    // Export each one sequentially to avoid rate limits
    const results: Array<{
      testCaseId: string
      zephyrKey: string
      success: boolean
      error?: string
    }> = []

    for (const tc of testCases) {
      const fv = tc.fieldValues as Record<string, any>

      const name = String(fv[mapping.name] || 'Untitled test case')
      const objective = mapping.objective ? String(fv[mapping.objective] || '') : ''
      const precondition = mapping.precondition
        ? String(fv[mapping.precondition] || '')
        : ''
      const priorityRaw = mapping.priority ? fv[mapping.priority] : null

      // ── Build steps array ──────────────────────────────────────
      const rawSteps = mapping.steps ? fv[mapping.steps] : null

      console.log('[Zephyr] raw steps value:', JSON.stringify(rawSteps))
      console.log('[Zephyr] steps field key:', mapping.steps)
      console.log('[Zephyr] fieldValues keys:', Object.keys(fv))

      let stepsArray: string[] = []

      if (Array.isArray(rawSteps)) {
        // Normal case — array of strings or array of objects
        stepsArray = rawSteps
          .map(s => {
            if (typeof s === 'string') return s.trim()
            if (typeof s === 'object' && s !== null) {
              // Could be { description: '...' } or { text: '...' } or { step: '...' }
              return String(
                s.description || s.text || s.step || s.action ||
                Object.values(s)[0] || ''
              ).trim()
            }
            return String(s || '').trim()
          })
          .filter(s => s.length > 0)

      } else if (typeof rawSteps === 'string' && rawSteps.trim()) {
        // Could be a JSON stringified array
        try {
          const parsed = JSON.parse(rawSteps)
          if (Array.isArray(parsed)) {
            stepsArray = parsed
              .map(s => String(s || '').trim())
              .filter(s => s.length > 0)
          } else {
            // Plain string with newlines
            stepsArray = rawSteps
              .split('\n')
              .map(s => s.replace(/^\d+[\.\)]\s*/, '').trim())
              .filter(s => s.length > 0)
          }
        } catch {
          // Not JSON — treat as newline-separated plain text
          stepsArray = rawSteps
            .split('\n')
            .map(s => s.replace(/^\d+[\.\)]\s*/, '').trim())
            .filter(s => s.length > 0)
        }
      }

      console.log('[Zephyr] parsed stepsArray:', stepsArray)

      // Fallback — if no steps found at all, use objective as single step
      if (stepsArray.length === 0 && objective) {
        stepsArray = [String(objective)]
      }

      // Build Zephyr step objects
      // description = the action the tester performs
      // expectedResult = what should happen (only on last step)
      const zephyrSteps = stepsArray.map((stepText, i) => ({
        description: stepText,
        expectedResult: i === stepsArray.length - 1
          ? String(objective || '')
          : '',
      }))

      console.log('[Zephyr] zephyrSteps to send:', JSON.stringify(zephyrSteps))
      // ── End steps ──────────────────────────────────────────────

      try {
        const tcBody: Record<string, any> = {
          projectKey: jiraProjectKey,
          name: String(name),
          objective: String(objective),
          precondition: String(precondition),
          statusName: 'Draft',
          labels: ['regi-generated'],
        }

        // Use priority from test case if specified, otherwise omit it
        if (priorityRaw) {
          tcBody.priorityName = String(priorityRaw).trim()
        }

        // Add folder if available
        if (folderId) {
          tcBody.folderId = folderId
        }

        // Create test case
        const response = await axios.post(
          `${ZEPHYR_BASE}/testcases`,
          tcBody,
          {
            headers: {
              Authorization: `Bearer ${apiToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          }
        )

        const zephyrKey: string = response.data.key
        const zephyrId: number = response.data.id

        console.log(`[Zephyr] Created test case: ${zephyrKey}`)

        // Add steps via dedicated endpoint
        if (zephyrSteps.length > 0) {
          await this.addTestSteps(apiToken, zephyrKey, zephyrSteps)
        }

        // Persist Zephyr identifiers
        await prisma.testCase.update({
          where: { id: tc.id },
          data: { zephyrKey, zephyrId },
        })

        results.push({ testCaseId: tc.id, zephyrKey, success: true })

      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.errorMessage ||
          err.message ||
          'Unknown error'
        console.error(`[Zephyr] Export failed for test case ${tc.id}:`, msg)
        results.push({
          testCaseId: tc.id,
          zephyrKey: '',
          success: false,
          error: msg,
        })
      }
    }

    return {
      results,
      successCount: results.filter(r => r.success).length,
      failCount: results.filter(r => !r.success).length,
      total: testCases.length,
    }
  },

  // ── Add test steps via dedicated endpoint ────────────────────

  async addTestSteps(
    apiToken: string,
    testCaseKey: string,
    steps: Array<{ description: string; expectedResult: string }>
  ): Promise<void> {
    if (steps.length === 0) return

    try {
      const payload = {
        mode: 'OVERWRITE',
        items: steps.map(step => ({
          inline: {
            description: step.description,
            testData: '',
            expectedResult: step.expectedResult || '',
          },
        })),
      }

      const response = await axios.post(
        `${ZEPHYR_BASE}/testcases/${testCaseKey}/teststeps`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
          validateStatus: () => true,
        }
      )

      if (response.status === 200 || response.status === 201) {
        console.log(`[Zephyr] Added ${steps.length} steps to ${testCaseKey}`)
      } else {
        console.log(
          `[Zephyr] Steps failed (${response.status}):`,
          JSON.stringify(response.data).slice(0, 300)
        )
      }
    } catch (err: any) {
      console.error(`[Zephyr] addTestSteps error for ${testCaseKey}:`, err.message)
    }
  },
}

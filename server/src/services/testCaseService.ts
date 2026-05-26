import { prisma } from '@/lib/prisma'
import { TestCase } from '@prisma/client'
import OpenAI from 'openai'
import { buildTestCaseGenerationPrompt, buildBackendTestCasePrompt, ApiEndpoint } from '@/services/llm/prompts'
import { NotFoundError, UnauthorizedError } from '@/lib/errors'

export const testCaseService = {
  async listTestCases(featureId: string, workspaceId: string) {
    const feature = await prisma.feature.findUnique({
      where: { id: featureId },
      include: {
        project: {
          include: {
            template: {
              include: { fields: { orderBy: { order: 'asc' } } }
            }
          }
        }
      },
    })

    if (!feature) throw new NotFoundError('Feature not found')
    if (feature.project.workspaceId !== workspaceId) {
      throw new UnauthorizedError('Unauthorized')
    }

    const testCases = await prisma.testCase.findMany({
      where: { featureId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    })

    return {
      testCases,
      fields: feature.project.template?.fields ?? [],
    }
  },

  async updateTestCase(
    testCaseId: string,
    workspaceId: string,
    data: { fieldValues: Record<string, any> }
  ): Promise<TestCase> {
    const testCase = await prisma.testCase.findUnique({
      where: { id: testCaseId },
      include: { feature: { include: { project: true } } },
    })

    if (!testCase) throw new NotFoundError('Test case not found')
    if (!testCase.feature || testCase.feature.project.workspaceId !== workspaceId) {
      throw new UnauthorizedError('Unauthorized')
    }

    return prisma.testCase.update({
      where: { id: testCaseId },
      data: { fieldValues: data.fieldValues },
    })
  },

  async deleteTestCase(testCaseId: string, workspaceId: string): Promise<void> {
    const testCase = await prisma.testCase.findUnique({
      where: { id: testCaseId },
      include: { feature: { include: { project: true } } },
    })

    if (!testCase) throw new NotFoundError('Test case not found')
    if (!testCase.feature || testCase.feature.project.workspaceId !== workspaceId) {
      throw new UnauthorizedError('Unauthorized')
    }

    await prisma.testCase.update({
      where: { id: testCaseId },
      data: { deletedAt: new Date() },
    })
  },

  async generateTestCases(featureId: string, workspaceId: string) {
    const feature = await prisma.feature.findUnique({
      where: { id: featureId },
      include: {
        project: {
          include: {
            template: {
              include: { fields: { orderBy: { order: 'asc' } } }
            }
          }
        }
      },
    })

    if (!feature) throw new NotFoundError('Feature not found')
    if (feature.project.workspaceId !== workspaceId) {
      throw new UnauthorizedError('Unauthorized')
    }
    if (!feature.project.template || feature.project.template.fields.length === 0) {
      throw new Error('NO_TEMPLATE: No template defined for this project. Create a template first.')
    }

    // Guard: if test cases already exist, return them instead of generating new ones
    const existing = await prisma.testCase.findMany({
      where: { featureId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    })

    if (existing.length > 0) {
      console.log(`[Generate] Feature ${featureId} already has ${existing.length} test cases — skipping generation`)
      return {
        testCases: existing,
        fields: feature.project.template.fields,
        alreadyExisted: true,
      }
    }

    const fields = feature.project.template.fields
    const baseUrl = feature.project.baseUrl || null

    let systemPrompt: string
    let userPrompt: string

    if (feature.type === 'BACKEND_API') {
      const endpoints = (feature.endpoints as ApiEndpoint[]) || []
      if (endpoints.length === 0) {
        throw new Error('NO_ENDPOINTS: Backend features require at least one endpoint.')
      }
      const result = buildBackendTestCasePrompt(
        {
          name: feature.name,
          description: feature.description || null,
          acceptanceCriteria: feature.acceptanceCriteria || null,
          testData: feature.testData || null,
        },
        endpoints,
        fields,
        baseUrl
      )
      systemPrompt = result.systemPrompt
      userPrompt = result.userPrompt
    } else {
      const style = (feature.project.templateConfig as any)?.style ?? 'step_by_step'
      const result = buildTestCaseGenerationPrompt(
        {
          name: feature.name,
          description: feature.description || null,
          type: feature.type,
          acceptanceCriteria: feature.acceptanceCriteria || null,
          uiNotes: feature.uiNotes || null,
          testData: feature.testData || null,
        },
        fields,
        style,
        baseUrl
      )
      systemPrompt = result.systemPrompt
      userPrompt = result.userPrompt
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // Build messages array — add images if present
    const contextImages = feature.contextImages as string[] | null
    const hasImages = contextImages && contextImages.length > 0

    let messages: any[]

    if (hasImages) {
      // Send images alongside the prompt for visual context
      const imageContent = contextImages!.map(img => ({
        type: 'image_url',
        image_url: {
          url: img.startsWith('data:') ? img : `data:image/png;base64,${img}`,
          detail: 'high',
        },
      }))

      messages = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            ...imageContent,
            {
              type: 'text',
              text: 'Use the UI screenshots above to extract exact button labels, field names, URLs, and error messages. Incorporate them into the test steps.',
            },
          ],
        },
      ]
    } else {
      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]
    }

    const completion = await openai.chat.completions.create({
      model: process.env.DEFAULT_LLM_MODEL || 'gpt-4o',
      messages,
      temperature: 0.3,
      max_tokens: 4000,
    })

    const raw = completion.choices[0].message.content || '[]'

    let parsed: Record<string, any>[]
    try {
      const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const obj = JSON.parse(clean)
      parsed = Array.isArray(obj) ? obj : Object.values(obj)[0] as any[]
    } catch {
      throw new Error('LLM returned invalid JSON. Try regenerating.')
    }

    const requiredKeys = fields.filter(f => f.required).map(f => f.key)
    const validItems = parsed.filter(item =>
      requiredKeys.every(key => key in item)
    )

    if (validItems.length === 0) {
      throw new Error('LLM output did not match template fields. Try regenerating.')
    }

    // Re-check inside transaction to prevent race condition where multiple requests
    // both pass the initial guard but try to create duplicates
    const { testCases: created, wasRaceCondition } = await prisma.$transaction(async (tx) => {
      const recheck = await tx.testCase.findMany({
        where: { featureId, deletedAt: null },
      })

      if (recheck.length > 0) {
        console.log(`[Generate] Race condition prevented: test cases were created while this request was processing`)
        return { testCases: recheck, wasRaceCondition: true }
      }

      const newTestCases = await Promise.all(
        validItems.map(item =>
          tx.testCase.create({
            data: {
              featureId,
              fieldValues: item,
              generatedBy: 'LLM',
            }
          })
        )
      )

      return { testCases: newTestCases, wasRaceCondition: false }
    })

    return { testCases: created, fields, alreadyExisted: wasRaceCondition }
  },
}

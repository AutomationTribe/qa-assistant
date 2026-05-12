import { prisma } from '@/lib/prisma'
import { TestCase } from '@prisma/client'
import OpenAI from 'openai'
import { buildTestCaseGenerationPrompt } from '@/services/llm/prompts'
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

    const fields = feature.project.template.fields
    const style = (feature.project.templateConfig as any)?.style ?? 'step_by_step'

    const { systemPrompt, userPrompt } = buildTestCaseGenerationPrompt(
      {
        name: feature.name,
        description: feature.description || null,
        type: feature.type,
      },
      fields,
      style
    )

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const completion = await openai.chat.completions.create({
      model: process.env.DEFAULT_LLM_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
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

    const created = await prisma.$transaction(
      validItems.map(item =>
        prisma.testCase.create({
          data: {
            featureId,
            fieldValues: item,
            generatedBy: 'LLM',
          }
        })
      )
    )

    return { testCases: created, fields }
  },
}

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

class TemplateError extends Error {
  constructor(public code: string, message: string) {
    super(message)
    this.name = 'TemplateError'
  }
}

interface FieldInput {
  name: string
  key?: string
  type: 'TEXT' | 'TEXTAREA' | 'STEPS' | 'SELECT' | 'MULTISELECT' | 'BOOLEAN' | 'NUMBER'
  description?: string
  required?: boolean
  order?: number
  options?: string[]
}

const generateKeyFromName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

export const templateService = {
  async getTemplate(projectId: string, workspaceId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project || project.deletedAt) {
      throw new TemplateError('PROJECT_NOT_FOUND', 'Project not found')
    }

    if (project.workspaceId !== workspaceId) {
      throw new TemplateError('FORBIDDEN', 'Access denied')
    }

    const template = await prisma.testCaseTemplate.findUnique({
      where: { projectId },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return template
  },

  async createTemplate(projectId: string, workspaceId: string, fields: FieldInput[]) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project || project.deletedAt) {
      throw new TemplateError('PROJECT_NOT_FOUND', 'Project not found')
    }

    if (project.workspaceId !== workspaceId) {
      throw new TemplateError('FORBIDDEN', 'Access denied')
    }

    const existingTemplate = await prisma.testCaseTemplate.findUnique({
      where: { projectId },
    })

    if (existingTemplate) {
      throw new TemplateError('TEMPLATE_EXISTS', 'Template already exists for this project')
    }

    if (!fields || fields.length === 0) {
      throw new TemplateError('INVALID_INPUT', 'At least one field is required')
    }

    // Validate and normalize fields
    const normalizedFields = fields.map((field, idx) => ({
      ...field,
      key: field.key || generateKeyFromName(field.name),
      order: field.order ?? idx,
    }))

    // Check for duplicate keys
    const keys = normalizedFields.map((f) => f.key)
    if (new Set(keys).size !== keys.length) {
      throw new TemplateError('DUPLICATE_KEYS', 'Field keys must be unique')
    }

    const template = await prisma.testCaseTemplate.create({
      data: {
        projectId,
        fields: {
          createMany: {
            data: normalizedFields.map((f) => ({
              name: f.name,
              key: f.key,
              type: f.type,
              description: f.description || null,
              required: f.required ?? true,
              order: f.order,
              options: f.options ? f.options : null,
            })),
          },
        },
      },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return template
  },

  async updateTemplate(templateId: string, projectId: string, workspaceId: string, fields: FieldInput[]) {
    const template = await prisma.testCaseTemplate.findUnique({
      where: { id: templateId },
    })

    if (!template) {
      throw new TemplateError('TEMPLATE_NOT_FOUND', 'Template not found')
    }

    if (template.projectId !== projectId) {
      throw new TemplateError('FORBIDDEN', 'Access denied')
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project || project.workspaceId !== workspaceId) {
      throw new TemplateError('FORBIDDEN', 'Access denied')
    }

    if (!fields || fields.length === 0) {
      throw new TemplateError('INVALID_INPUT', 'At least one field is required')
    }

    // Normalize fields
    const normalizedFields = fields.map((field, idx) => ({
      ...field,
      key: field.key || generateKeyFromName(field.name),
      order: field.order ?? idx,
    }))

    // Check for duplicate keys
    const keys = normalizedFields.map((f) => f.key)
    if (new Set(keys).size !== keys.length) {
      throw new TemplateError('DUPLICATE_KEYS', 'Field keys must be unique')
    }

    // Delete all existing fields and recreate
    await prisma.testCaseField.deleteMany({
      where: { templateId },
    })

    const updatedTemplate = await prisma.testCaseTemplate.update({
      where: { id: templateId },
      data: {
        fields: {
          createMany: {
            data: normalizedFields.map((f) => ({
              name: f.name,
              key: f.key,
              type: f.type,
              description: f.description || null,
              required: f.required ?? true,
              order: f.order,
              options: f.options ? f.options : null,
            })),
          },
        },
      },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return updatedTemplate
  },

  async addField(templateId: string, projectId: string, workspaceId: string, field: FieldInput) {
    const template = await prisma.testCaseTemplate.findUnique({
      where: { id: templateId },
      include: {
        fields: true,
      },
    })

    if (!template) {
      throw new TemplateError('TEMPLATE_NOT_FOUND', 'Template not found')
    }

    if (template.projectId !== projectId) {
      throw new TemplateError('FORBIDDEN', 'Access denied')
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project || project.workspaceId !== workspaceId) {
      throw new TemplateError('FORBIDDEN', 'Access denied')
    }

    const key = field.key || generateKeyFromName(field.name)

    // Check for duplicate key
    if (template.fields.some((f) => f.key === key)) {
      throw new TemplateError('DUPLICATE_KEY', 'Field key already exists')
    }

    const order = field.order ?? template.fields.length

    const updatedTemplate = await prisma.testCaseTemplate.update({
      where: { id: templateId },
      data: {
        fields: {
          create: {
            name: field.name,
            key,
            type: field.type,
            description: field.description || null,
            required: field.required ?? true,
            order,
            options: field.options ? field.options : null,
          },
        },
      },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return updatedTemplate
  },

  async removeField(fieldId: string, templateId: string, workspaceId: string) {
    const field = await prisma.testCaseField.findUnique({
      where: { id: fieldId },
    })

    if (!field) {
      throw new TemplateError('FIELD_NOT_FOUND', 'Field not found')
    }

    if (field.templateId !== templateId) {
      throw new TemplateError('FORBIDDEN', 'Access denied')
    }

    const template = await prisma.testCaseTemplate.findUnique({
      where: { id: templateId },
    })

    if (!template) {
      throw new TemplateError('TEMPLATE_NOT_FOUND', 'Template not found')
    }

    const project = await prisma.project.findUnique({
      where: { id: template.projectId },
    })

    if (!project || project.workspaceId !== workspaceId) {
      throw new TemplateError('FORBIDDEN', 'Access denied')
    }

    // Delete field
    await prisma.testCaseField.delete({
      where: { id: fieldId },
    })

    // Reorder remaining fields
    const remainingFields = await prisma.testCaseField.findMany({
      where: { templateId },
      orderBy: { order: 'asc' },
    })

    for (let i = 0; i < remainingFields.length; i++) {
      await prisma.testCaseField.update({
        where: { id: remainingFields[i].id },
        data: { order: i },
      })
    }

    const updatedTemplate = await prisma.testCaseTemplate.findUnique({
      where: { id: templateId },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return updatedTemplate!
  },

  async reorderFields(templateId: string, workspaceId: string, fieldIds: string[]) {
    const template = await prisma.testCaseTemplate.findUnique({
      where: { id: templateId },
    })

    if (!template) {
      throw new TemplateError('TEMPLATE_NOT_FOUND', 'Template not found')
    }

    const project = await prisma.project.findUnique({
      where: { id: template.projectId },
    })

    if (!project || project.workspaceId !== workspaceId) {
      throw new TemplateError('FORBIDDEN', 'Access denied')
    }

    // Verify all field IDs belong to this template
    const fields = await prisma.testCaseField.findMany({
      where: { templateId },
    })

    const validIds = new Set(fields.map((f) => f.id))
    if (!fieldIds.every((id) => validIds.has(id))) {
      throw new TemplateError('INVALID_FIELDS', 'Invalid field IDs provided')
    }

    // Update order for each field
    const updates = fieldIds.map((fieldId, idx) =>
      prisma.testCaseField.update({
        where: { id: fieldId },
        data: { order: idx },
      })
    )

    await Promise.all(updates)

    const updatedTemplate = await prisma.testCaseTemplate.findUnique({
      where: { id: templateId },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return updatedTemplate!
  },
}

export { TemplateError }

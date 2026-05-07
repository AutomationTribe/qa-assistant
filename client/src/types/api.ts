export type AuthUser = {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'QA_LEAD' | 'QA_ENGINEER' | 'VIEWER'
  workspaceId: string
}

export type TemplateConfig = {
  style: 'bdd' | 'step_by_step' | 'exploratory'
}

export type ProjectLogin = {
  username: string
  password: string
  role?: string
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

export type FieldType = 'TEXT' | 'TEXTAREA' | 'STEPS' | 'SELECT' | 'MULTISELECT' | 'BOOLEAN' | 'NUMBER'

export type TestCaseField = {
  id: string
  name: string
  key: string
  type: FieldType
  description?: string
  required: boolean
  order: number
  options?: string[]
}

export type TestCaseTemplate = {
  id: string
  projectId: string
  fields: TestCaseField[]
  createdAt: string
  updatedAt: string
}

export type ApiError = {
  error: { code: string; message: string }
}

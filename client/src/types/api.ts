export type AuthUser = {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'QA_LEAD' | 'QA_ENGINEER' | 'VIEWER'
  workspaceId: string
}

export type TemplateConfig = {
  style: 'waterfall' | 'agile_scrum' | 'agile_kanban'
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
  _count?: { tickets: number; features?: number }
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

export type FeatureType = 'NEW_FEATURE' | 'BUG' | 'BACKEND_API'
export type FeatureStatus = 'DRAFT' | 'FINAL'

export type ApiType = 'REST' | 'GRAPHQL' | 'WEBSOCKET'

export type ApiEndpoint = {
  id: string
  apiType: ApiType
  method: string
  path: string
  requestBody?: string
  expectedResponse?: string
  authRequired: boolean
  authType?: 'Bearer' | 'API_Key' | 'Basic' | 'None'
  notes?: string
}

export type Feature = {
  id: string
  name: string
  description: string
  acceptanceCriteria?: string | null
  uiNotes?: string | null
  testData?: string | null
  contextImages?: string[] | null
  endpoints?: ApiEndpoint[] | null
  type: FeatureType
  status: FeatureStatus
  projectId: string
  createdAt: string
  updatedAt: string
  _count?: {
    testCases: number
  }
}

export type Priority = 'HIGH' | 'MEDIUM' | 'LOW'
export type TestCaseType = 'POSITIVE' | 'NEGATIVE' | 'EDGE_CASE'
export type GeneratedBy = 'LLM' | 'HUMAN'

export type TestCase = {
  id: string
  featureId: string
  fieldValues: Record<string, any>
  generatedBy: GeneratedBy
  zephyrKey?: string | null
  zephyrId?: number | null
  createdAt: string
  updatedAt: string
}

export type ZephyrFieldMapping = {
  name: string
  steps: string
  objective?: string
  priority?: string
  precondition?: string
}

export type ZephyrConnection = {
  id: string
  jiraProjectKey: string
  fieldMapping: ZephyrFieldMapping
  connected: boolean
}

export type ZephyrExportResult = {
  results: Array<{
    testCaseId: string
    zephyrKey: string
    success: boolean
    error?: string
  }>
  successCount: number
  failCount: number
  total: number
  message?: string
}

export type ApiError = {
  error: { code: string; message: string }
}

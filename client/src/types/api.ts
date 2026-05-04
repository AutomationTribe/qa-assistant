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

export type Project = {
  id: string
  name: string
  workspaceId: string
  templateConfig: TemplateConfig
  createdAt: string
  _count?: { tickets: number }
}

export type ApiError = {
  error: { code: string; message: string }
}

import apiClient from './client'
import { TestCase, TestCaseField } from '@/types/api'

interface TestCasesResponse {
  testCases: TestCase[]
  fields: TestCaseField[]
}

export const testCasesAPI = {
  async listTestCases(featureId: string): Promise<TestCasesResponse> {
    const res = await apiClient.get<TestCasesResponse>(
      `/features/${featureId}/testcases`
    )
    return res.data
  },

  async generateTestCases(featureId: string): Promise<TestCasesResponse & { count: number; alreadyExisted: boolean }> {
    const res = await apiClient.post<TestCasesResponse & { count: number; alreadyExisted: boolean }>(
      `/features/${featureId}/testcases/generate`
    )
    return res.data
  },

  async updateTestCase(
    testCaseId: string,
    fieldValues: Record<string, any>
  ): Promise<TestCase> {
    const res = await apiClient.patch<{ testCase: TestCase }>(
      `/testcases/${testCaseId}`,
      { fieldValues }
    )
    return res.data.testCase
  },

  async deleteTestCase(testCaseId: string): Promise<void> {
    await apiClient.delete(`/testcases/${testCaseId}`)
  },
}

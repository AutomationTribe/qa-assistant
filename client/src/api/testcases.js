import apiClient from './client';
export const testCasesAPI = {
    async listTestCases(featureId) {
        const res = await apiClient.get(`/features/${featureId}/testcases`);
        return res.data;
    },
    async generateTestCases(featureId) {
        const res = await apiClient.post(`/features/${featureId}/testcases/generate`);
        return res.data;
    },
    async updateTestCase(testCaseId, fieldValues) {
        const res = await apiClient.patch(`/testcases/${testCaseId}`, { fieldValues });
        return res.data.testCase;
    },
    async deleteTestCase(testCaseId) {
        await apiClient.delete(`/testcases/${testCaseId}`);
    },
};

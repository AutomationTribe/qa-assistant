import { create } from 'zustand';
import { testCasesAPI } from '@/api/testcases';
export const useTestCaseStore = create((set) => ({
    testCases: [],
    fields: [],
    loading: false,
    generating: false,
    error: null,
    fetchTestCases: async (featureId) => {
        set({ loading: true, error: null });
        try {
            const { testCases, fields } = await testCasesAPI.listTestCases(featureId);
            set({ testCases, fields, loading: false });
        }
        catch {
            set({ error: 'Failed to load test cases', loading: false });
        }
    },
    generateTestCases: async (featureId) => {
        set({ generating: true, error: null });
        try {
            const { testCases, fields, alreadyExisted } = await testCasesAPI.generateTestCases(featureId);
            set({ testCases, fields, generating: false });
            return { testCases, fields, alreadyExisted: alreadyExisted || false };
        }
        catch (err) {
            const msg = err?.response?.data?.error?.message || 'Generation failed';
            set({ error: msg, generating: false });
            throw err;
        }
    },
    updateTestCase: async (id, fieldValues) => {
        const updated = await testCasesAPI.updateTestCase(id, fieldValues);
        set(state => ({
            testCases: state.testCases.map(tc => tc.id === id ? updated : tc)
        }));
    },
    deleteTestCase: async (id) => {
        await testCasesAPI.deleteTestCase(id);
        set(state => ({
            testCases: state.testCases.filter(tc => tc.id !== id)
        }));
    },
    clearTestCases: () => set({ testCases: [], fields: [], error: null }),
}));

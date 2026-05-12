export class LLMOrchestrator {
  async generateTestCases(featureName: string, description?: string) {
    throw new Error('LLM test case generation is not yet implemented')
  }
}

export const llmOrchestrator = new LLMOrchestrator()

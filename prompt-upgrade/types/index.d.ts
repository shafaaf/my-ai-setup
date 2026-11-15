export type UpgradeQuestion = { question: string; options: string[] }
export type UpgradeResult = {
  diagnosis: string
  improvedPrompt: string
  embeddedQuestions: string
  keyUpgrades: string[]
}
export type UpgradeRun = {
  phase: 'idle' | 'thinking' | 'questions' | 'done' | 'error'
  stage: 'check' | 'rewrite'
  token: number
  draft: string
  questions: UpgradeQuestion[]
  answers: string[]
  typingFor: number
  result: UpgradeResult | null
  error: string
  showDiagnosis: boolean
  editing: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'prompt-upgrade': { run: Shaped<UpgradeRun> }
  }
}

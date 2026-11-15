import { expect, test } from 'claude-code/testing'
import { buildPrompt } from './register'

const TEMPLATE = `You are a world-class prompt engineer. I will give you a rough prompt. Diagnose why it will underperform, then rewrite it into a prompt that reliably produces a dramatically better result.

My rough prompt:
[PASTE YOUR PROMPT]

What I actually want out of it: [THE OUTCOME OR DECISION THIS PROMPT SERVES]
Who or what will run it: [e.g. ChatGPT, Claude, an app, a coding agent], and who reads the output: [AUDIENCE]

If my goal is unclear enough to change the rewrite, ask me up to 2 clarifying questions first. Otherwise proceed.

Deliver:
1. DIAGNOSIS: what the original is missing or doing wrong, checked against role, context, specific task, constraints, output format, examples, and success criteria. Be concrete about what each gap costs in the output.
2. IMPROVED PROMPT: a clean, copy-paste-ready rewrite. Give it an expert role, the needed context, a precise task, explicit constraints, and an exact output format. Use clearly labeled [PLACEHOLDERS] for anything I must supply so the prompt stays reusable. Do not use em dashes.
3. CLARIFYING QUESTIONS TO EMBED: if the task benefits from it, the 1 to 3 questions the AI should ask the user before answering, written into the prompt itself.
4. KEY UPGRADES: a short bullet list, one line each, naming what you changed and why it improves the result.

Quality bar: the rewritten prompt should be specific, unambiguous, and self-contained enough that a stranger could paste it and get a strong result on the first try. Prefer clarity over length, but do not leave it thin.`

test('sends the template word for word, with only the rough prompt filled in', () => {
  expect(buildPrompt('write a blog post')).toBe(TEMPLATE.replace('[PASTE YOUR PROMPT]', 'write a blog post'))
})

test('Outcome, Runner and Audience lines fill their placeholders', () => {
  const sent = buildPrompt('write a blog post\nOutcome: signups\nRunner: Claude\nAudience: customers')
  expect(sent).toBe(
    TEMPLATE.replace('[PASTE YOUR PROMPT]', 'write a blog post')
      .replace('[THE OUTCOME OR DECISION THIS PROMPT SERVES]', 'signups')
      .replace('[e.g. ChatGPT, Claude, an app, a coding agent]', 'Claude')
      .replace('[AUDIENCE]', 'customers'),
  )
})

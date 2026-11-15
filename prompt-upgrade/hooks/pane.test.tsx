import { expect, mock, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'
import { parseReply } from './register'

const PANE = {
  plugin: 'prompt-upgrade',
  component: 'Pane',
  requestId: 'prompt-upgrade',
  props: { title: 'Prompt Upgrade', isFocused: true, bodyColumns: 100, placement: 'dock', scroll: { offset: 0, bodyRows: 60 }, view: {} },
} as const

const usage = { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }
const QUESTIONS = JSON.stringify({
  questions: [
    { question: 'What is the main goal?', options: ['More online orders', 'Brand awareness'] },
    { question: 'What budget?', options: ['Under $500', '$500 to $2,000'] },
  ],
})
const RESULT = JSON.stringify({
  diagnosis: '- No goal',
  improved_prompt: 'You are an expert restaurant marketer. Write [TOPIC].',
  embedded_questions: '',
  key_upgrades: ['Set the goal', 'Added a budget'],
})
const DRAFT = 'Build me a 30-day marketing plan for a pizza company.'

function setup($: Parameters<TestBody>[0], on: Parameters<TestBody>[1]) {
  const clock = mock.clock(on)
  mock.store(on)
  const seen = { prompts: [] as string[], filled: [] as string[], submitted: [] as string[] }
  const replies = [QUESTIONS, RESULT]
  on('command.register', () => ({ value: { command: 'prompt-upgrade' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.close', () => ({ value: undefined }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('model.complete', (_, e) => {
    seen.prompts.push(e.prompt)
    return { value: { isAnswered: true, text: replies.shift() ?? '', usage } }
  })
  on('prompt.fill', (_, e) => {
    seen.filled.push(e.text)
    return { isFilled: true, text: e.text, cursor: e.text.length }
  })
  on('prompt.submit', (_, e) => {
    seen.submitted.push(e.text)
    return { text: e.text }
  })
  const start = async () => {
    await $.command.run({
      command: 'prompt-upgrade',
      args: DRAFT,
      origin: { kind: 'composer' },
      presentation: { isFullscreen: false, columns: 100 },
    })
    const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
    expect(await ui.find({ type: 'Text', text: /Checking what would make this better/ })).toBeDefined()
    await clock.advance(20)
    expect(await ui.find({ type: 'Text', text: /What is the main goal/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /0 of 2 answered/ })).toBeDefined()
    return ui
  }
  return { clock, seen, start }
}

test('parseReply reads questions, results and bad replies', () => {
  expect('questions' in parseReply(QUESTIONS, true)).toBe(true)
  expect('result' in parseReply('```json\n' + RESULT + '\n```', true)).toBe(true)
  expect('error' in parseReply('no json here', true)).toBe(true)
  expect('error' in parseReply(QUESTIONS, false)).toBe(true)
})

test('answer every question, review side by side, edit inline in the pane', async ($, on) => {
  const { seen, start } = setup($, on)
  const ui = await start()
  expect(seen.prompts[0]).toContain(`My rough prompt:\n${DRAFT}`)

  await ui.press({ key: 'q0-o0' })
  expect(await ui.find({ type: 'Text', text: /1 of 2 answered/ })).toBeDefined()
  await ui.press({ key: 'q1-o1' })
  expect(seen.prompts[1]).toContain('A: More online orders')
  expect(seen.prompts[1]).toContain('A: $500 to $2,000')

  expect(await ui.find({ type: 'Text', text: /2 details added/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /YOUR PROMPT/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /You are an expert restaurant marketer/ })).toBeDefined()

  // Edit opens an editor in the pane; nothing goes to the main prompt box.
  await ui.press({ key: 'edit' })
  expect(seen.filled).toEqual([])
  await ui.input({ key: 'edit-box', kind: 'change', text: 'Edited prompt with [BUDGET].' })
  await ui.press({ key: 'save' })
  expect(await ui.find({ type: 'Text', text: /Edited prompt with \[BUDGET\]/ })).toBeDefined()

  // Edit again and discard: the saved version stays.
  await ui.press({ key: 'edit' })
  await ui.input({ key: 'edit-box', kind: 'change', text: 'Thrown away' })
  await ui.press({ key: 'discard' })
  expect(await ui.find({ type: 'Text', text: /Thrown away/ })).toBeUndefined()

  // Enter in the editor saves too.
  await ui.press({ key: 'edit' })
  await ui.input({ key: 'edit-box', text: 'Saved with Enter.' })
  expect(await ui.find({ type: 'Text', text: /Saved with Enter\./ })).toBeDefined()
  await ui.unmount()
})

test('Skip the rest upgrades with placeholders, Run it sends the prompt', async ($, on) => {
  const { clock, seen, start } = setup($, on)
  const ui = await start()

  await ui.press({ key: 'q0-o0' })
  await ui.press({ key: 'skip-rest' })
  expect(seen.prompts[1]).toContain('A: More online orders')
  expect(seen.prompts[1]).toContain('(skipped, use a [PLACEHOLDER])')

  // Run it sends the edited version.
  await ui.press({ key: 'edit' })
  await ui.input({ key: 'edit-box', kind: 'change', text: 'My edited prompt.' })
  await ui.press({ key: 'save' })
  await ui.press({ key: 'run' })
  await clock.advance(20)
  expect(seen.submitted).toEqual(['My edited prompt.'])
  await ui.unmount()
})

test('a model call that throws shows an error instead of hanging', async ($, on) => {
  const clock = mock.clock(on)
  on('command.register', () => ({ value: { command: 'prompt-upgrade' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.model', () => ({ value: 'not-a-real-model' }))
  on('model.complete', () => ({ deny: 'model not allowed' }))
  await $.command.run({
    command: 'prompt-upgrade',
    args: DRAFT,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 100 },
  })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await clock.advance(20)
  expect(await ui.find({ type: 'Text', text: /Prompt Upgrade failed: .*model not allowed/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Something went wrong/ })).toBeDefined()
  await ui.unmount()
})

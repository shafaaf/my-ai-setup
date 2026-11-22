import { expect, test } from 'claude-code/testing'

// my-notifications-mod watches tool calls and prompts only to draw its cards.
// It must never stand in the way: if its own work fails (here, the clock it
// reads), the tool call and the prompt still go through.

test('a failing clock never blocks AskUserQuestion', async ($, on) => {
  let clockReads = 0
  on('clock.now', () => {
    clockReads++
    throw new Error('clock down')
  })
  let ran = false
  on('tool.call', () => {
    ran = true
    return { result: 'answered' }
  })
  await $.tool.call({ tool: 'AskUserQuestion' })
  // The mod did reach for the clock (and failed), yet the question still ran.
  expect(clockReads).toBeGreaterThan(0)
  expect(ran).toBe(true)
})

test('a failing clock never blocks an ordinary tool call', async ($, on) => {
  on('clock.now', () => {
    throw new Error('clock down')
  })
  let ran = false
  on('tool.call', () => {
    ran = true
    return { result: 'ok' }
  })
  await $.tool.call({ tool: 'Bash', command: 'ls' })
  expect(ran).toBe(true)
})

import { expect, test } from 'claude-code/testing'

test('/wave-pane opens the Wave status pane without a Claude turn', async ($, on) => {
  const opened: string[] = []
  // Stands for the app opening a pane.
  on('ui.open', (_, e) => {
    opened.push(e.id)
    return { value: undefined }
  })
  const result = await $.command.run({ command: 'wave-pane', args: '' })
  expect(opened).toEqual(['wave-status'])
  expect(result?.text).toBe('Wave status pane opened.')
})

import { findingsText, reviewText } from './register'

test('the Review cell names the model of each round and marks a risky PR', () => {
  expect(reviewText({ reviewModels: ['Claude', 'Codex'], reviewRound: 2 })).toBe('Claude r1 → Codex r2')
  expect(reviewText({ risky: true, reviewModels: ['Claude'] })).toBe('⚠️ risky · Claude r1')
  expect(reviewText({ risky: true })).toBe('⚠️ risky · not yet')
  // An older status file without reviewModels still shows its round count.
  expect(reviewText({ reviewRound: 3 })).toBe('round 3')
  expect(reviewText({})).toBe('not yet')
})

test('the Findings cell lists open 🔴 then 🟠 titles after the counts', () => {
  expect(
    findingsText({
      red: 1,
      orange: 1,
      yellow: 2,
      openFindings: [
        { level: 'orange', title: 'Missing index on run_id' },
        { level: 'red', title: 'No rollback path' },
      ],
    }),
  ).toBe('🔴 1 🟠 1 🟡 2: 🔴 No rollback path; 🟠 Missing index on run_id')
  expect(findingsText({ yellow: 2 })).toBe('🟡 2')
  expect(findingsText({})).toBe('none')
  // Blank titles are skipped.
  expect(findingsText({ red: 1, openFindings: [{ level: 'red', title: '  ' }] })).toBe('🔴 1')
})

test('the pane shows the models, the risky marker and open finding titles', async ($, on) => {
  const wave = {
    sessionIds: ['s-1'],
    ticket: 'BOTFOOD-1',
    stage: '4. Review round 2',
    updatedAt: '2026-11-22T00:00:00Z',
    repos: [
      {
        name: 'wave-cea',
        repo: 'ContentEvaluationAgent',
        stage: 'Fixing round-2 findings',
        risky: true,
        reviewRound: 2,
        reviewModels: ['Claude', 'Codex'],
        red: 1,
        openFindings: [{ level: 'red', title: 'Old desktops break on the new field' }],
      },
    ],
  }
  on('session.id', () => ({ value: 's-1' }))
  on('session.cwd', () => ({ value: '/elsewhere' }))
  on('fs.list', () => ({ value: [{ name: 'BOTFOOD-1', kind: 'dir' }] }))
  on('fs.exists', () => ({ value: true }))
  on('fs.read', () => ({ value: JSON.stringify(wave) }))
  on('ui.open', () => ({ value: undefined }))
  on('clock.now', () => ({ value: Date.parse('2026-11-22T00:05:00Z') }))
  // No PR on this row, so gh is never asked; answer anyway in case it is.
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '' } }))
  await $.command.run({ command: 'wave-pane', args: '' })
  const pane = await $.ui.mount({ plugin: 'my-workflow-wave-status', component: 'Pane', props: {}, requestId: 'wave-status', surface: 'desktop' })
  const md = (await pane.find({ type: 'Markdown' }))?.props as { children?: string; text?: string } | undefined
  const text = String(md?.children ?? md?.text ?? '')
  expect(text).toContain('⚠️ risky · Claude r1 → Codex r2')
  expect(text).toContain('🔴 1: 🔴 Old desktops break on the new field')
  await pane.unmount()
})

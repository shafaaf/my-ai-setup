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

import { ciText, findingsText, localReviewText, prText, reviewTags, reviewText, roundsText } from './register'

test('older status files: the Review cell names the model of each round and marks a risky PR', () => {
  expect(reviewText({ reviewModels: ['Claude', 'Codex'], reviewRound: 2 })).toBe('Claude r1 → Codex r2')
  expect(reviewText({ risky: true, reviewModels: ['Claude'] })).toBe('⚠️ Risky · Claude r1')
  expect(reviewText({ risky: true })).toBe('⚠️ Risky · not yet')
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
  expect(text).toContain('| Session | Stage | PR | Local review | CI/CD | Summary |')
  expect(text).not.toContain('Findings')
  expect(text).toContain('⚠️ Risky · Claude r1 → Codex r2 · 🔴 1: 🔴 Old desktops break on the new field')
  // This row has no PR, so CI/CD says so.
  expect(text).toContain('| No PR |')
  await pane.unmount()
})

const live = (over: Partial<import('../types').PrLive>) => ({
  state: 'OPEN', isDraft: false, pass: 0, fail: 0, pending: 0, total: 0, failed: [], checkedAt: 0, ...over,
})

test('the CI/CD cell is green, running, or red with what fails', () => {
  const pr = { pr: 'https://github.com/o/r/pull/1', stage: 'Ready for review' }
  expect(ciText(pr, live({ pass: 41, total: 41 }))).toBe('✅ Green · 41 passed')
  expect(ciText({ ...pr, stage: 'Merged and on DEV' }, live({ state: 'MERGED', pass: 3, total: 3 }))).toBe('✅ Green · 3 passed · on DEV')
  expect(ciText(pr, live({ pass: 6, pending: 3, total: 9 }))).toBe('⏳ Running · 6 of 9 done')
  // Red without a note names the failing checks (three at most).
  expect(ciText(pr, live({ fail: 4, total: 41, failed: ['windows-bdd', 'mac-bdd', 'lint', 'unit'] }))).toBe(
    '🔴 Red · 4 failed: Failing: windows-bdd, mac-bdd, lint +1 more',
  )
  // The coordinator's note explains it instead.
  expect(
    ciText({ ...pr, ciNote: 'Windows BDD fails at app launch, 3 runs in a row' }, live({ fail: 1, total: 41, failed: ['windows-bdd'] })),
  ).toBe('🔴 Red · 1 failed: Windows BDD fails at app launch, 3 runs in a row')
  // A note left over after CI turned green is not shown.
  expect(ciText({ ...pr, ciNote: 'old reason' }, live({ pass: 41, total: 41 }))).toBe('✅ Green · 41 passed')
  expect(ciText({ stage: 'Building' }, undefined)).toBe('No PR')
  expect(ciText(pr, undefined)).toBe('—')
})

test('the PR cell shows the link and its state', () => {
  const r = { pr: 'https://github.com/o/r/pull/7', prNumber: 7 }
  expect(prText(r, live({ isDraft: true }))).toBe('[#7](https://github.com/o/r/pull/7) · draft')
  expect(prText(r, live({}))).toBe('[#7](https://github.com/o/r/pull/7) · ready')
  expect(prText(r, live({ state: 'MERGED' }))).toBe('[#7](https://github.com/o/r/pull/7) · merged')
  expect(prText(r, undefined)).toBe('[#7](https://github.com/o/r/pull/7)')
  expect(prText({}, undefined)).toBe('—')
})

test('the Local review cell joins the rounds and what is still open', () => {
  const base = { name: 'x', repo: 'web', stage: 's' }
  expect(localReviewText({ ...base })).toBe('not yet')
  expect(localReviewText({ ...base, reviewModels: ['Claude'] })).toBe('Claude r1 · no open findings')
  expect(localReviewText({ ...base, reviewRound: 2, yellow: 1 })).toBe('round 2 · 🟡 1')
})

test('the tags say risky (with why), large or small', () => {
  expect(reviewTags({ risky: true, riskReason: 'vault, sign-in', size: 'large' })).toBe('⚠️ Risky · vault, sign-in · Large')
  expect(reviewTags({ risky: true })).toBe('⚠️ Risky')
  // A risky PR runs the risky flow, so "Small" would only confuse.
  expect(reviewTags({ risky: true, size: 'small' })).toBe('⚠️ Risky')
  expect(reviewTags({ size: 'small' })).toBe('Small')
  expect(reviewTags({ size: 'large' })).toBe('Large')
  expect(reviewTags({})).toBe('')
})

test('each round shows its number, the model and how many 🔴 it found', () => {
  const reviews = [
    { round: 1, model: 'Claude', red: 0, yellow: 2 },
    { round: 2, model: 'Codex', red: 3 },
    { round: 3, model: 'Codex', red: 1, orange: 1 },
    { round: 4, model: 'Codex', red: 0 },
  ]
  expect(roundsText({ reviews })).toBe('R1 Claude 0 🔴 → R2 Codex 3 🔴 → R3 Codex 1 🔴 1 🟠 → R4 Codex 0 🔴')
  // reviews wins over the older fields.
  expect(roundsText({ reviews: [{ round: 1, model: 'Claude' }], reviewModels: ['X', 'Y'], reviewRound: 5 })).toBe('R1 Claude 0 🔴')
})

test('the Local review cell ends with passed, or what is still open', () => {
  const base = { name: 'desktop', repo: 'RaLHF-local', stage: 'Merged', risky: true, riskReason: 'vault, sign-in', size: 'large' as const }
  expect(
    localReviewText({ ...base, reviews: [{ round: 1, model: 'Claude', red: 0 }, { round: 2, model: 'Codex', red: 3 }, { round: 3, model: 'Codex', red: 0 }] }),
  ).toBe('⚠️ Risky · vault, sign-in · Large · R1 Claude 0 🔴 → R2 Codex 3 🔴 → R3 Codex 0 🔴 · passed')
  expect(
    localReviewText({ ...base, red: 1, openFindings: [{ level: 'red', title: 'No rollback path' }], reviews: [{ round: 1, model: 'Codex', red: 1 }] }),
  ).toBe('⚠️ Risky · vault, sign-in · Large · R1 Codex 1 🔴 · 🔴 1: 🔴 No rollback path')
  expect(localReviewText({ name: 'cea', repo: 'CEA', stage: 's', size: 'small' })).toBe('Small · not yet')
})

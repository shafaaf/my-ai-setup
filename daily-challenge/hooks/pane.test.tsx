import { expect, mock, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

import { CHALLENGES, TOTAL } from './challenges'
import { coachRequest } from './logic'
import { bigNumber, layout } from './register'

const pane = (bodyColumns: number) =>
  ({
    plugin: 'daily-challenge',
    component: 'Pane',
    requestId: 'daily-challenge',
    props: {
      title: 'Daily Challenge',
      isFocused: true,
      bodyColumns,
      placement: 'dock',
      scroll: { offset: 0, bodyRows: 60 },
      view: {},
    },
  }) as const

const HINT = {
  plugin: 'daily-challenge',
  component: 'PromptHint',
  props: { isDraft: false, isWorking: false, hint: '? for shortcuts' },
} as const

// 9am local time on Thursday 19 November 2026.
const NOW = new Date(2026, 10, 19, 9, 0).getTime()

function day(offset: number): string {
  const d = new Date(2026, 10, 19 + offset, 12)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type Extra = { isStoreBroken?: boolean; drawsHint?: boolean }

async function setup($: Parameters<TestBody>[0], on: Parameters<TestBody>[1], stored?: unknown, extra: Extra = {}) {
  const clock = mock.clock(on, { now: NOW })
  if (extra.isStoreBroken) on('store.get', () => ({ deny: 'store unavailable' }))
  else mock.store(on, stored === undefined ? {} : { progress: stored })
  // Stands for the engine's own hint line beneath the plugin.
  if (extra.drawsHint) {
    on('ui.render', ($$, e) => {
      const { Text } = $$.ui.resolve(e)
      return <Text>? for shortcuts</Text>
    })
  }
  const seen = { opened: [] as string[], closed: [] as string[], filled: [] as string[] }
  on('command.register', () => ({ value: { command: 'challenge' } }))
  on('ui.open', (_, e) => {
    seen.opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  on('ui.close', (_, e) => {
    seen.closed.push(e.id)
    return { value: undefined }
  })
  on('prompt.fill', (_, e) => {
    seen.filled.push(e.text)
    return { isFilled: true, text: e.text, cursor: e.text.length }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const run = (args: string) =>
    $.command.run({
      command: 'challenge',
      args,
      origin: { kind: 'composer' },
      presentation: { isFullscreen: false, columns: 100 },
    })
  return { clock, seen, run }
}

const title = (id: number) => CHALLENGES[id]?.title ?? ''

test('/challenge opens the pane inside the command; the status bar button opens it too', async ($, on) => {
  const { clock, seen, run } = await setup($, on, undefined, { drawsHint: true })
  const reply = await run('')
  expect(reply.text).toBe("Opened today's challenge.")
  // Opened inside the command (asked), not from a timer.
  expect(seen.opened).toEqual(['daily-challenge'])
  await clock.advance(20)
  expect(seen.opened).toEqual(['daily-challenge'])

  const hint = await $.ui.mount({ ...HINT, surface: 'terminal' })
  await hint.press({ key: 'daily-challenge-open' })
  expect(seen.opened).toEqual(['daily-challenge', 'daily-challenge'])
  await hint.unmount()
})

test('Mark complete, then Undo, in the pane', async ($, on) => {
  const { run } = await setup($, on)
  const ui = await $.ui.mount({ ...pane(100), surface: 'desktop' })

  expect(await ui.find({ type: 'Text', text: title(0) })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Completed today/ })).toBeUndefined()
  expect(await ui.find({ key: 'another' })).toBeDefined()

  await ui.press({ key: 'complete' })
  expect(await ui.find({ type: 'Text', text: /Completed today/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /A new one is waiting tomorrow/ })).toBeDefined()
  expect(await ui.find({ key: 'complete' })).toBeUndefined()
  expect(await ui.find({ key: 'another' })).toBeUndefined()
  expect(await ui.find({ key: 'undo' })).toBeDefined()
  // The card outline turns green.
  const green = await ui.findAll({ type: 'Box' })
  expect(green.some(b => b.props.borderColor === '#3DD68C')).toBe(true)

  // It was saved: the command reads the store and sees it.
  expect((await run('done')).text).toMatch(/already complete\. Streak: 1 day\. 1 of 365 completed/)

  await ui.press({ key: 'undo' })
  expect(await ui.find({ type: 'Text', text: /Completed today/ })).toBeUndefined()
  expect(await ui.find({ key: 'complete' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: title(0) })).toBeDefined()
  await ui.unmount()
})

test('Give me another swaps to one never completed and remembers it', async ($, on) => {
  // Challenges 0 to 4 done on earlier days: today is number 6.
  const done = [0, 1, 2, 3, 4].map(id => ({ id, day: day(id - 6) }))
  const { run } = await setup($, on, { done, swap: null })
  const ui = await $.ui.mount({ ...pane(100), surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: title(5) })).toBeDefined()

  await ui.press({ key: 'another' })
  expect(await ui.find({ type: 'Text', text: title(5) })).toBeUndefined()
  for (const id of [0, 1, 2, 3, 4]) {
    expect(await ui.find({ type: 'Text', text: title(id) })).toBeUndefined()
  }
  // The command sees the same swapped challenge, so it was saved.
  const reply = await run('done')
  expect(reply.text).toMatch(/^Completed: /)
  expect(reply.text).not.toContain(title(5))
  await ui.unmount()
})

test('Coach me through it closes the pane and fills the prompt box', async ($, on) => {
  const { seen } = await setup($, on)
  const ui = await $.ui.mount({ ...pane(100), surface: 'desktop' })
  await ui.press({ key: 'coach' })
  expect(seen.closed).toEqual(['daily-challenge'])
  expect(seen.filled).toEqual([coachRequest(0)])
  expect(seen.filled[0]).toContain('one step at a time')
  expect(seen.filled[0]).toContain('wait for me')
  expect(seen.filled[0]).toContain(title(0))
  await ui.unmount()
})

test('Give me another is hidden when nothing else is left', async ($, on) => {
  const done = Array.from({ length: TOTAL - 1 }, (_, i) => ({ id: i, day: `2025-01-01` }))
    .map((c, i) => ({ id: c.id, day: new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10) }))
  await setup($, on, { done, swap: null })
  const ui = await $.ui.mount({ ...pane(100), surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: title(TOTAL - 1) })).toBeDefined()
  expect(await ui.find({ key: 'complete' })).toBeDefined()
  expect(await ui.find({ key: 'another' })).toBeUndefined()
  await ui.unmount()
})

test('the finished screen once all 365 are done', async ($, on) => {
  const done = Array.from({ length: TOTAL }, (_, i) => ({
    id: i,
    day: new Date(Date.UTC(2025, 10, 1 + i)).toISOString().slice(0, 10),
  }))
  const { run } = await setup($, on, { done, swap: null })
  const ui = await $.ui.mount({ ...pane(100), surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /ALL 365 COMPLETE/ })).toBeDefined()
  expect(await ui.find({ key: 'complete' })).toBeUndefined()
  expect(await ui.find({ key: 'another' })).toBeUndefined()
  expect(await ui.find({ key: 'coach' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /0 to go/ })).toBeDefined()
  expect((await run('done')).text).toMatch(/All 365 challenges are complete/)
  expect((await run('another')).text).toMatch(/no other challenge/)
  await ui.unmount()
})

test('the tiles show the streak, completed and best streak', async ($, on) => {
  // Done on the 3 days before today, and a 4-day run earlier.
  const done = [
    { id: 0, day: day(-20) }, { id: 1, day: day(-19) }, { id: 2, day: day(-18) }, { id: 3, day: day(-17) },
    { id: 4, day: day(-3) }, { id: 5, day: day(-2) }, { id: 6, day: day(-1) },
  ]
  const { run } = await setup($, on, { done, swap: null })
  const ui = await $.ui.mount({ ...pane(100), surface: 'desktop' })
  const texts = (await ui.findAll({ type: 'Text' })).map(t => t.text)
  for (const n of [3, 7, 4]) {
    for (const row of bigNumber(n)) expect(texts).toContain(row)
  }
  expect((await run('done')).text).toMatch(/Streak: 4 days\. 8 of 365 completed/)
  await ui.unmount()
})

test('every full-width row fits the pane at a narrow and a wide width', async ($, on) => {
  await setup($, on, { done: [{ id: 0, day: day(-1) }], swap: null })
  for (const columns of [40, 48, 120]) {
    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ ...pane(columns), surface })
      const rows = (await ui.findAll({ type: 'Text' })).map(t => t.text)
      const drawn = rows.filter(r => /[─━■□┏┃┗╺╻]/.test(r))
      expect(drawn.length).toBeGreaterThan(5)
      for (const r of drawn) {
        expect(r.includes('\n')).toBe(false)
        expect(r.length <= columns, `"${r}" is ${r.length} wide at ${columns}`).toBe(true)
      }
      // Tile captions fit their tile too.
      const L = layout(columns)
      for (const r of rows.filter(r => /in a row|^days?$|^of 365$/.test(r))) {
        expect(r.length <= L.tileWidth - 4, `caption "${r}" at ${columns}`).toBe(true)
      }
      for (const n of [0, 1, 365]) {
        for (const row of bigNumber(n)) expect(row.length <= L.tileWidth - 4).toBe(true)
      }
      await ui.unmount()
    }
  }
})

test('a broken store turns into a plain sentence, not nothing', async ($, on) => {
  const { run } = await setup($, on, undefined, { isStoreBroken: true })
  const reply = await run('done')
  expect(reply.text).toMatch(/^Daily Challenge hit a problem and changed nothing: /)
})

test('an unknown word shows the usage', async ($, on) => {
  const { run } = await setup($, on)
  expect((await run('help')).text).toContain('/challenge done')
})

test('the look: date, challenge count, theme dot, year line and done chip', async ($, on) => {
  await setup($, on)
  const ui = await $.ui.mount({ ...pane(100), surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: 'Thursday, Nov 19' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /TODAY'S CHALLENGE ─+ challenge 1 of 365$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '● PROMPTING' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /YOUR YEAR ─+ 0%$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '0 done  ·  365 to go  ·  none repeat' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'days in a row' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '✓ Mark complete' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '↻ Give me another' })).toBeDefined()

  await ui.press({ key: 'complete' })
  expect(await ui.find({ type: 'Text', text: '✓ Completed today' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /TODAY'S CHALLENGE ─+ done$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'day in a row' })).toBeDefined()
  expect(await ui.find({ key: 'coach' })).toBeUndefined()
  await ui.unmount()
})

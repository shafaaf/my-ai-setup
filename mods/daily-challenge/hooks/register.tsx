import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Progress } from '../types'

import { CHALLENGES, THEMES, TOTAL } from './challenges'
import {
  EMPTY, bestStreak, coachRequest, complete, completedOn, currentStreak, dayKey,
  isFinished, lastDays, normalize, swap, swapChoices, todayId, undo,
} from './logic'

const PANE = 'daily-challenge'
const COMMAND = 'challenge'
const STORE_KEY = 'progress'
const TITLE = 'DAILY CHALLENGE'

// The look.
const GOLD = '#F2C46D'
const HAIRLINE = '#262B33'
const MUTED = '#7D8590'
const MAIN = '#E6EDF3'
const GREEN = '#3DD68C'
const AMBER = '#E3B341'
const DARK = '#0D1117'
const BLUE = '#79C0FF'
const EMPTY_DAY = '#3D444D'

const USAGE = [
  'Daily Challenge commands:',
  "  /challenge          open today's challenge",
  "  /challenge done     mark today's challenge complete",
  '  /challenge another  swap it for a different one',
].join('\n')

// The pane draws from this; the store is the copy that survives restarts.
const progress = atom({ plugin: 'daily-challenge', key: 'progress' } as const, EMPTY, { shape: 'progress-1' })

// ---------- Changing state: only from a command, a button press or an event ----------

async function loadStored($: EngineInterface): Promise<Progress> {
  return normalize(await $.store.get(STORE_KEY))
}

// Reads the store fresh (another chat may have changed it), applies the
// change, saves it, and refreshes what the pane draws.
async function change($: EngineInterface, fn: (p: Progress, today: string) => Progress): Promise<{ p: Progress; today: string; isChanged: boolean }> {
  const today = dayKey(await $.clock.now())
  const before = await loadStored($)
  const p = fn(before, today)
  const isChanged = p !== before
  if (isChanged) await $.store.set(STORE_KEY, p)
  await update($, progress, () => p)
  return { p, today, isChanged }
}

async function sync($: EngineInterface): Promise<void> {
  const stored = await loadStored($)
  await update($, progress, () => stored)
}

async function openPane($: EngineInterface): Promise<void> {
  // Open first, while the person's command or press is still behind the
  // call, so it counts as asked and is placed at any width.
  const opened = await $.ui.open({ id: PANE, title: 'Daily Challenge', focus: true })
  await sync($)
  // A note for diagnosing a pane that does not show; never read by the mod.
  await $.store.set('last-open', { ...opened, at: await $.clock.now() }).catch(() => undefined)
  // Only speak up when the pane cannot be shown: that needs the person.
  if (!opened.isPlaced) $.ui.toast(`Daily Challenge pane is waiting to be shown: ${opened.reason}`)
}

async function coach($: EngineInterface): Promise<void> {
  const today = dayKey(await $.clock.now())
  const id = todayId(await loadStored($), today)
  if (id < 0) return
  await $.ui.close({ id: PANE })
  const filled = await $.prompt.fill({ text: coachRequest(id) })
  if (!filled.isFilled) $.ui.toast('Daily Challenge could not reach your prompt box. Close any open dialog and try again.')
}

function randomSwap(p: Progress, today: string): Progress {
  return swap(p, today, Math.random)
}

// Runs a button's work; a failure becomes one plain sentence instead of nothing.
async function guarded($: EngineInterface, work: () => Promise<unknown>): Promise<void> {
  try {
    await work()
  } catch (err) {
    $.ui.toast(`Daily Challenge hit a problem: ${reason(err)}`)
  }
}

function reason(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

// ---------- Drawing helpers: they build text, they save nothing ----------

const DIGITS: Record<string, [string, string, string]> = {
  '0': ['┏━┓', '┃ ┃', '┗━┛'],
  '1': ['╺┓ ', ' ┃ ', '╺┻╸'],
  '2': ['╺━┓', '┏━┛', '┗━╸'],
  '3': ['╺━┓', ' ━┫', '╺━┛'],
  '4': ['╻ ╻', '┗━┫', '  ╹'],
  '5': ['┏━╸', '┗━┓', '╺━┛'],
  '6': ['┏━╸', '┣━┓', '┗━┛'],
  '7': ['╺━┓', '  ┃', '  ╹'],
  '8': ['┏━┓', '┣━┫', '┗━┛'],
  '9': ['┏━┓', '┗━┫', '╺━┛'],
}

// A number drawn three rows tall with heavy box-drawing characters.
export function bigNumber(n: number): [string, string, string] {
  const glyphs = String(Math.max(0, Math.floor(n)))
    .split('')
    .map(ch => DIGITS[ch] ?? ['┏━┓', '┃ ┃', '┗━┛'])
  const row = (i: 0 | 1 | 2) => glyphs.map(g => g[i]).join(' ')
  return [row(0), row(1), row(2)]
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// "Thursday, Nov 19", or "Nov 19" when the pane is narrow.
export function dateLabel(day: string, isWide: boolean): string {
  const [y = 1970, m = 1, d = 1] = day.split('-').map(Number)
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  const short = `${MONTHS[m - 1]} ${d}`
  return isWide ? `${DAY_NAMES[wd]}, ${short}` : short
}

// The sizes every row is cut to, from the pane's width, so nothing wraps.
export function layout(columns: number) {
  const w = Math.max(24, Math.floor(columns))
  const tilesInRow = w >= 47
  return {
    w,
    tilesInRow,
    tileWidth: tilesInRow ? Math.floor((w - 2) / 3) : w,
    buttonsInRow: w >= 60,
    cell: w >= 56 ? 4 : w >= 42 ? 3 : 2,
    isWideDate: w >= 40,
  }
}

// The longer wording when it fits the room, else the shorter, so nothing wraps.
export function fit(long: string, short: string, room: number): string {
  return long.length <= room ? long : short
}

// The full-width rows, as text, so a test can measure them.
export function titleRule(w: number): { gold: string; dim: string } {
  return { gold: '━'.repeat(TITLE.length), dim: '─'.repeat(Math.max(0, w - TITLE.length)) }
}
// The hairline between a heading and its right-hand note.
export function headingRule(label: string, w: number, right = ''): string {
  const room = w - label.length - 1 - (right ? right.length + 1 : 0)
  return '─'.repeat(Math.max(0, room))
}
export function yearBar(done: number, w: number): { filled: string; rest: string } {
  const filled = Math.round((Math.min(done, TOTAL) / TOTAL) * w)
  return { filled: '━'.repeat(filled), rest: '─'.repeat(w - filled) }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    try {
      await $.command.register({
        name: COMMAND,
        description: "Open today's Claude Code challenge (or: done, another)",
        argumentHint: '[done | another]',
      })
      await sync($)
    } catch {
      // The pane reads the store again whenever it is opened.
    }
    return next(e)
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    try {
      const arg = e.args.trim().toLowerCase()

      if (arg === '' || arg === 'open') {
        // Opened inside the command, so it counts as asked and is placed at
        // any width (an open from a timer counts as unasked and waits for a
        // 144-column terminal). Opening takes a moment, then the reply shows.
        try {
          await openPane($)
        } catch (err) {
          return { text: `Daily Challenge could not open its pane: ${reason(err)}` }
        }
        return { text: "Opened today's challenge." }
      }

      if (arg === 'done' || arg === 'complete') {
        const { p, today, isChanged } = await change($, complete)
        const total = `${p.done.length} of ${TOTAL} completed`
        const streak = plural(currentStreak(p, today), 'day', 'days')
        if (!isChanged && completedOn(p, today)) {
          return { text: `Today's challenge is already complete. Streak: ${streak}. ${total}.` }
        }
        if (!isChanged) return { text: `All ${TOTAL} challenges are complete. Nothing left to mark.` }
        const done = CHALLENGES[completedOn(p, today)?.id ?? -1]
        return { text: `Completed: ${done?.title ?? 'today\'s challenge'}. Streak: ${streak}. ${total}. A new one is waiting tomorrow.` }
      }

      if (arg === 'another' || arg === 'swap') {
        const today = dayKey(await $.clock.now())
        const before = await loadStored($)
        if (completedOn(before, today)) return { text: "Today's challenge is already complete. A new one is waiting tomorrow." }
        if (swapChoices(before, today).length === 0) return { text: 'There is no other challenge left to swap in.' }
        const { p } = await change($, randomSwap)
        const c = CHALLENGES[todayId(p, today)]
        return { text: c ? `Swapped. Today's challenge: ${c.title}. ${c.task}` : 'Swapped.' }
      }

      return { text: USAGE }
    } catch (err) {
      return { text: `Daily Challenge hit a problem and changed nothing: ${reason(err)}` }
    }
  }).catch((_, __, next) => ({ text: `Daily Challenge hit a problem: ${reason(next.error)}` }))

  // The status bar button: at the right of the line under the prompt.
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const engine = await next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    const press = async () => {
      try {
        await openPane($)
      } catch (err) {
        $.ui.toast(`Daily Challenge could not open its pane: ${reason(err)}`)
      }
    }
    return (
      <Box flexDirection="row" justifyContent="space-between">
        <Box flexGrow={1}>{engine}</Box>
        <Box marginLeft={2} marginRight={2}>
          <Button key="daily-challenge-open" plain label="Daily challenge" onPress={press}>
            <Text color={GOLD}>Daily challenge</Text>
          </Button>
        </Box>
      </Box>
    )
  })

  // The pane. Reads only: every change happens in a button's onPress.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const p = await read($, progress)
    const today = dayKey(await $.clock.now())
    const L = layout(e.props.bodyColumns)
    const w = L.w

    const finished = isFinished(p)
    const doneToday = completedOn(p, today)
    const id = todayId(p, today)
    const c = id >= 0 ? CHALLENGES[id] : undefined
    const streak = currentStreak(p, today)
    const best = bestStreak(p)
    const total = p.done.length
    const canSwap = !doneToday && swapChoices(p, today).length > 0

    // Every press reads the store fresh, changes it and saves it.
    const onComplete = () => guarded($, () => change($, complete))
    const onUndo = () => guarded($, () => change($, undo))
    const onSwap = () => guarded($, () => change($, randomSwap))
    const onCoach = () => guarded($, () => coach($))

    const heading = (label: string, right = '') => (
      <Text>
        <Text color={MUTED}>{label} </Text>
        <Text color={HAIRLINE}>{headingRule(label, w, right)}</Text>
        {right ? <Text color={MUTED}> {right}</Text> : null}
      </Text>
    )

    const chip = (key: string, label: string, shown: string, onPress: () => void, isMain: boolean) => (
      <Box backgroundColor={isMain ? GOLD : HAIRLINE} paddingX={1}>
        <Button key={key} plain label={label} onPress={onPress}>
          <Text color={isMain ? DARK : MAIN} bold={isMain}>{shown}</Text>
        </Button>
      </Box>
    )

    const tile = (label: string, n: number, caption: string, color: string) => {
      const rows = bigNumber(n)
      return (
        <Box flexDirection="column" borderStyle="round" borderColor={HAIRLINE} paddingX={1} width={L.tileWidth}>
          <Text color={MUTED}>{label}</Text>
          <Text color={color}>{rows[0]}</Text>
          <Text color={color}>{rows[1]}</Text>
          <Text color={color}>{rows[2]}</Text>
          <Text color={MUTED}>{caption}</Text>
        </Box>
      )
    }

    const rule = titleRule(w)
    const date = dateLabel(today, L.isWideDate)

    // Today's card.
    let card
    if (finished) {
      card = (
        <Box flexDirection="column" borderStyle="round" borderColor={GREEN} paddingX={1} width={w}>
          <Text color={GREEN} bold>ALL {TOTAL} COMPLETE</Text>
          <Text color={MAIN}>You have finished every challenge. There are no more to give you.</Text>
          <Text color={MUTED}>Your progress and best streak stay here.</Text>
        </Box>
      )
    } else if (c) {
      const theme = THEMES[c.theme]
      const color = theme?.color ?? MAIN
      card = (
        <Box flexDirection="column" borderStyle="round" borderColor={doneToday ? GREEN : GOLD} paddingX={1} width={w}>
          <Text color={color} bold>● {(theme?.name ?? '').toUpperCase()}</Text>
          <Text color={MAIN} bold>{c.title}</Text>
          <Text color={MAIN}>{c.task}</Text>
        </Box>
      )
    } else {
      card = <Text color={AMBER}>No challenge could be found for today.</Text>
    }

    // The buttons under the card.
    let buttons = null
    if (!finished && c) {
      const items = doneToday
        ? [
            <Box backgroundColor={GREEN} paddingX={1}>
              <Text color={DARK} bold>✓ Completed today</Text>
            </Box>,
            <Text color={MUTED}>A new one is waiting tomorrow.</Text>,
            <Button key="undo" plain dimColor label="Undo" onPress={onUndo} />,
          ]
        : [
            chip('complete', 'Mark complete', '✓ Mark complete', onComplete, true),
            chip('coach', 'Coach me through it', 'Coach me through it', onCoach, false),
            ...(canSwap ? [chip('another', 'Give me another', '↻ Give me another', onSwap, false)] : []),
          ]
      buttons = (
        <Box flexDirection={L.buttonsInRow ? 'row' : 'column'} columnGap={2} rowGap={1} alignItems="flex-start" marginTop={1}>
          {items}
        </Box>
      )
    }

    // Last 14 days.
    const days = lastDays(p, today, 14)
    const pad = (s: string) => s.padEnd(L.cell).slice(0, L.cell)
    const squares = (
      <Text>
        {days.map(d => (
          <Text color={d.isDone ? GOLD : EMPTY_DAY}>{pad(d.isDone ? '■' : '□')}</Text>
        ))}
      </Text>
    )
    const labels = (
      <Text>
        {days.map(d => (
          <Text color={d.day === today ? MAIN : MUTED} bold={d.day === today}>
            {pad(DAY_INITIALS[d.weekday] ?? '')}
          </Text>
        ))}
      </Text>
    )

    const bar = yearBar(total, w)
    const togo = Math.max(0, TOTAL - total)
    const pct = `${Math.floor((Math.min(total, TOTAL) / TOTAL) * 100)}%`
    const challengeNote = finished ? 'all done' : doneToday ? 'done' : `challenge ${total + 1} of ${TOTAL}`

    return (
      <Box flexDirection="column" width={w}>
        <Box flexDirection="row" justifyContent="space-between" width={w}>
          <Text color={MAIN} bold>{TITLE}</Text>
          <Text color={MUTED}>{date}</Text>
        </Box>
        <Text>
          <Text color={GOLD}>{rule.gold}</Text>
          <Text color={HAIRLINE}>{rule.dim}</Text>
        </Text>

        <Box flexDirection={L.tilesInRow ? 'row' : 'column'} columnGap={1} marginTop={1}>
          {tile('DAY STREAK', streak, fit(streak === 1 ? 'day in a row' : 'days in a row', streak === 1 ? 'day' : 'days', L.tileWidth - 4), GOLD)}
          {tile('COMPLETED', total, `of ${TOTAL}`, BLUE)}
          {tile('BEST STREAK', best, best === 1 ? 'day' : 'days', GREEN)}
        </Box>

        <Box marginTop={1}>{heading("TODAY'S CHALLENGE", challengeNote)}</Box>
        {card}
        {buttons}

        <Box marginTop={1}>{heading('LAST 14 DAYS')}</Box>
        {squares}
        {labels}

        <Box marginTop={1}>{heading('YOUR YEAR', pct)}</Box>
        <Text>
          <Text color={GOLD}>{bar.filled}</Text>
          <Text color={HAIRLINE}>{bar.rest}</Text>
        </Text>
        <Text>
          <Text color={MAIN} bold>{total} done</Text>
          <Text color={MUTED}>{'  ·  '}{togo} to go{'  ·  '}none repeat</Text>
        </Text>

        <Box marginTop={1}>
          <Text color={MUTED}>If a command is not on your version, ask Claude how to do it.</Text>
        </Box>
      </Box>
    )
  })
}

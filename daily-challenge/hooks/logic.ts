// Pure rules: no `$`, no saving. Every function takes the progress and returns
// an answer or a new progress value, so it can be tested on its own.
import type { Completion, Progress } from '../types'

import { CHALLENGES, TOTAL } from './challenges'

export const EMPTY: Progress = { done: [], swap: null }

// The local calendar day of a moment, as YYYY-MM-DD.
export function dayKey(ms: number): string {
  const d = new Date(ms)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function parts(day: string): [number, number, number] {
  const [y, m, d] = day.split('-').map(Number)
  return [y ?? 1970, (m ?? 1) - 1, d ?? 1]
}

// Calendar arithmetic on day keys (done in UTC so clock changes never matter).
export function addDays(day: string, n: number): string {
  const [y, m, d] = parts(day)
  const t = new Date(Date.UTC(y, m, d + n))
  const mm = String(t.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(t.getUTCDate()).padStart(2, '0')
  return `${t.getUTCFullYear()}-${mm}-${dd}`
}

// 0 = Sunday ... 6 = Saturday.
export function weekday(day: string): number {
  const [y, m, d] = parts(day)
  return new Date(Date.UTC(y, m, d)).getUTCDay()
}

// Whatever the store held, made safe to use: bad entries are dropped.
export function normalize(raw: unknown): Progress {
  if (!raw || typeof raw !== 'object') return EMPTY
  const value = raw as { done?: unknown; swap?: unknown }
  const seen = new Set<number>()
  const done: Completion[] = []
  if (Array.isArray(value.done)) {
    for (const item of value.done) {
      const c = item as { id?: unknown; day?: unknown }
      if (typeof c?.id !== 'number' || typeof c.day !== 'string') continue
      if (c.id < 0 || c.id >= TOTAL || seen.has(c.id)) continue
      if (!/^\d{4}-\d{2}-\d{2}$/.test(c.day)) continue
      seen.add(c.id)
      done.push({ id: c.id, day: c.day })
    }
  }
  const s = value.swap as { id?: unknown; day?: unknown } | null | undefined
  const swap =
    s && typeof s.id === 'number' && typeof s.day === 'string' && s.id >= 0 && s.id < TOTAL
      ? { id: s.id, day: s.day }
      : null
  return { done, swap }
}

export function doneIds(p: Progress): Set<number> {
  return new Set(p.done.map(c => c.id))
}

export function isFinished(p: Progress): boolean {
  return doneIds(p).size >= TOTAL
}

export function completedOn(p: Progress, day: string): Completion | undefined {
  return p.done.find(c => c.day === day)
}

// The next challenge in order that has never been completed, or -1 when none.
export function nextInOrder(p: Progress): number {
  const done = doneIds(p)
  for (let id = 0; id < TOTAL; id++) if (!done.has(id)) return id
  return -1
}

// Today's challenge: the one completed today, else today's swap, else the
// next one in order. -1 once all are done.
export function todayId(p: Progress, today: string): number {
  const finished = completedOn(p, today)
  if (finished) return finished.id
  if (p.swap && p.swap.day === today && !doneIds(p).has(p.swap.id)) return p.swap.id
  return nextInOrder(p)
}

// What "Give me another" may offer: never completed, and not today's.
export function swapChoices(p: Progress, today: string): number[] {
  if (completedOn(p, today)) return []
  const done = doneIds(p)
  const current = todayId(p, today)
  const out: number[] = []
  for (let id = 0; id < TOTAL; id++) if (!done.has(id) && id !== current) out.push(id)
  return out
}

// Swaps today's challenge for a random one never completed. `random` returns
// a number in [0, 1), like Math.random.
export function swap(p: Progress, today: string, random: () => number): Progress {
  const choices = swapChoices(p, today)
  if (choices.length === 0) return p
  const pick = choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))]
  return pick === undefined ? p : { ...p, swap: { id: pick, day: today } }
}

// Marks today's challenge complete. One per day; nothing changes when today's
// is already complete or all are done.
export function complete(p: Progress, today: string): Progress {
  if (completedOn(p, today)) return p
  const id = todayId(p, today)
  if (id < 0) return p
  return { ...p, done: [...p.done, { id, day: today }] }
}

// Takes back today's completion.
export function undo(p: Progress, today: string): Progress {
  if (!completedOn(p, today)) return p
  return { ...p, done: p.done.filter(c => c.day !== today) }
}

// Days in a row with a completion, ending today. Before today's is done it
// still counts through yesterday.
export function currentStreak(p: Progress, today: string): number {
  const days = new Set(p.done.map(c => c.day))
  let day = days.has(today) ? today : addDays(today, -1)
  let n = 0
  while (days.has(day)) {
    n++
    day = addDays(day, -1)
  }
  return n
}

// The longest run of days in a row ever.
export function bestStreak(p: Progress): number {
  const days = [...new Set(p.done.map(c => c.day))].sort()
  let best = 0
  let run = 0
  let prev = ''
  for (const day of days) {
    run = prev && addDays(prev, 1) === day ? run + 1 : 1
    best = Math.max(best, run)
    prev = day
  }
  return best
}

// The last `count` days ending today, oldest first.
export function lastDays(p: Progress, today: string, count = 14): { day: string; weekday: number; isDone: boolean }[] {
  const days = new Set(p.done.map(c => c.day))
  const out = []
  for (let i = count - 1; i >= 0; i--) {
    const day = addDays(today, -i)
    out.push({ day, weekday: weekday(day), isDone: days.has(day) })
  }
  return out
}

export function coachRequest(id: number): string {
  const c = CHALLENGES[id]
  if (!c) return ''
  return (
    `Coach me through today's Claude Code challenge. It is called "${c.title}": ${c.task} ` +
    'Take me through it one step at a time, wait for me after each step, and tell me what I should notice.'
  )
}

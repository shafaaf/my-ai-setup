import { expect, test } from 'claude-code/testing'

import type { Progress } from '../types'

import { TOTAL } from './challenges'
import {
  EMPTY, addDays, bestStreak, complete, completedOn, currentStreak, dayKey, isFinished,
  lastDays, nextInOrder, normalize, swap, swapChoices, todayId, undo,
} from './logic'

// A repeatable "random" so a failing run can be replayed.
function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

const D1 = '2026-11-19'

test('the first challenge is number 1, and a missed day keeps the same one waiting', () => {
  expect(todayId(EMPTY, D1)).toBe(0)
  // Nothing done yesterday or today: the same challenge waits.
  expect(todayId(EMPTY, addDays(D1, 3))).toBe(0)
  const p = complete(EMPTY, D1)
  expect(todayId(p, D1)).toBe(0)
  expect(todayId(p, addDays(D1, 1))).toBe(1)
  expect(todayId(p, addDays(D1, 9))).toBe(1)
})

test('the next pick is always one never completed', () => {
  const random = seeded(7)
  let p: Progress = EMPTY
  let day = D1
  for (let i = 0; i < 400; i++) {
    const done = new Set(p.done.map(c => c.id))
    const id = todayId(p, day)
    if (isFinished(p)) {
      expect(id).toBe(-1)
      break
    }
    expect(done.has(id)).toBe(false)
    if (random() < 0.3) p = swap(p, day, random)
    p = complete(p, day)
    day = addDays(day, random() < 0.2 ? 2 : 1)
  }
  expect(isFinished(p)).toBe(true)
  expect(new Set(p.done.map(c => c.id)).size).toBe(TOTAL)
})

test('the swap never offers a completed one, and holds for the rest of the day', () => {
  const random = seeded(42)
  let p: Progress = EMPTY
  let day = D1
  for (let i = 0; i < 300; i++) {
    p = complete(p, day)
    day = addDays(day, 1)
    const done = new Set(p.done.map(c => c.id))
    for (let k = 0; k < 3; k++) {
      const before = todayId(p, day)
      p = swap(p, day, random)
      const after = todayId(p, day)
      expect(done.has(after)).toBe(false)
      expect(after).not.toBe(before)
      expect(swapChoices(p, day).every(id => !done.has(id))).toBe(true)
    }
    // Same day, asked again: the swap is remembered.
    expect(todayId(p, day)).toBe(p.swap?.id ?? -2)
  }
  // The swap ends with the day: tomorrow is back to the next in order.
  expect(todayId(p, addDays(day, 1))).toBe(nextInOrder(p))
})

test('with one challenge left there is nothing to swap, and then the finished state', () => {
  const done = Array.from({ length: TOTAL - 1 }, (_, i) => ({ id: i + 1, day: addDays('2025-01-01', i) }))
  let p: Progress = { done, swap: null }
  expect(todayId(p, D1)).toBe(0)
  expect(swapChoices(p, D1)).toEqual([])
  expect(swap(p, D1, Math.random)).toBe(p)
  expect(isFinished(p)).toBe(false)
  p = complete(p, D1)
  expect(isFinished(p)).toBe(true)
  expect(todayId(p, addDays(D1, 1))).toBe(-1)
  expect(complete(p, addDays(D1, 1))).toBe(p)
})

test('streaks across several days', () => {
  let p: Progress = EMPTY
  p = complete(p, '2026-11-01')
  p = complete(p, '2026-11-02')
  p = complete(p, '2026-11-03')
  expect(currentStreak(p, '2026-11-03')).toBe(3)
  // Before today's is done, the streak still counts through yesterday.
  expect(currentStreak(p, '2026-11-04')).toBe(3)
  // A whole missed day resets it.
  expect(currentStreak(p, '2026-11-05')).toBe(0)
  p = complete(p, '2026-11-05')
  expect(currentStreak(p, '2026-11-05')).toBe(1)
  expect(bestStreak(p)).toBe(3)
  // Across a month end.
  p = complete(p, '2026-11-06')
  for (const d of ['2026-11-07', '2026-11-08', '2026-11-09']) p = complete(p, d)
  expect(currentStreak(p, '2026-11-09')).toBe(5)
  expect(bestStreak(p)).toBe(5)
  let q: Progress = EMPTY
  for (const d of ['2026-12-30', '2026-12-31', '2027-01-01']) q = complete(q, d)
  expect(currentStreak(q, '2027-01-01')).toBe(3)
})

test('one completion per day, and undo takes it back', () => {
  let p = complete(EMPTY, D1)
  expect(complete(p, D1)).toBe(p)
  expect(completedOn(p, D1)?.id).toBe(0)
  p = undo(p, D1)
  expect(p.done).toEqual([])
  expect(todayId(p, D1)).toBe(0)
  expect(undo(p, D1)).toBe(p)
})

test('the last 14 days end today, with weekdays', () => {
  const p = complete(complete(EMPTY, '2026-11-18'), D1)
  const days = lastDays(p, D1, 14)
  expect(days.length).toBe(14)
  expect(days[13]?.day).toBe(D1)
  expect(days[13]?.weekday).toBe(4) // Thursday
  expect(days[0]?.day).toBe('2026-11-06')
  expect(days.filter(d => d.isDone).length).toBe(2)
})

test('local calendar day keys and bad stored data', () => {
  expect(dayKey(new Date(2026, 10, 19, 23, 59).getTime())).toBe('2026-11-19')
  expect(dayKey(new Date(2026, 10, 20, 0, 1).getTime())).toBe('2026-11-20')
  expect(normalize(undefined)).toEqual(EMPTY)
  expect(normalize({ done: [{ id: 3, day: D1 }, { id: 3, day: D1 }, { id: 999, day: D1 }, 'x'], swap: { id: 'no' } })).toEqual({
    done: [{ id: 3, day: D1 }],
    swap: null,
  })
})

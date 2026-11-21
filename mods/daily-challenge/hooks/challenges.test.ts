import { expect, test } from 'claude-code/testing'

import { BY_THEME, CHALLENGES, CLOSER_THEME, THEMES, TOTAL, VERIFIED_COMMANDS } from './challenges'

test('there are exactly 365 challenges and no title or task repeats', () => {
  expect(TOTAL).toBe(365)
  expect(CHALLENGES.length).toBe(365)
  const titles = new Set(CHALLENGES.map(c => c.title.trim().toLowerCase()))
  const tasks = new Set(CHALLENGES.map(c => c.task.trim().toLowerCase()))
  expect(titles.size).toBe(365)
  expect(tasks.size).toBe(365)
  CHALLENGES.forEach((c, i) => expect(c.id).toBe(i))
})

test('seven themes of 52, plus one closer on the last day', () => {
  expect(THEMES.length).toBe(7)
  for (const list of BY_THEME) expect(list.length).toBe(52)
  for (let t = 0; t < 7; t++) {
    const count = CHALLENGES.slice(0, 364).filter(c => c.theme === t).length
    expect(count).toBe(52)
  }
  expect(CHALLENGES[364]?.theme).toBe(CLOSER_THEME)
})

test('any seven days in a row touch all seven themes', () => {
  // The 364 dealt challenges; the closer is the single extra day at the end.
  for (let start = 0; start + 7 <= 364; start++) {
    const themes = new Set(CHALLENGES.slice(start, start + 7).map(c => c.theme))
    expect(themes.size).toBe(7)
  }
})

test('titles are two to five words, tasks one or two sentences', () => {
  for (const c of CHALLENGES) {
    const words = c.title.trim().split(/\s+/).length
    expect(words >= 2 && words <= 5, `title "${c.title}" has ${words} words`).toBe(true)
    const sentences = (c.task.match(/[.?!]['"]?(\s|$)/g) ?? []).length
    expect(sentences >= 1 && sentences <= 2, `task "${c.task}" has ${sentences} sentences`).toBe(true)
  }
})

test('every slash command named was confirmed on this version', () => {
  for (const c of CHALLENGES) {
    for (const m of c.task.matchAll(/(?:^|\s)\/([a-z][a-z-]*)/g)) {
      expect(VERIFIED_COMMANDS.includes(m[1] ?? ''), `"/${m[1]}" in "${c.title}"`).toBe(true)
    }
  }
})

test('the wording never talks down', () => {
  const banned = /\b(lazy|dumb|stupid|silly|obviously|idiot|just)\b/i
  for (const c of CHALLENGES) {
    expect(banned.test(`${c.title} ${c.task}`), `"${c.title}"`).toBe(false)
  }
})

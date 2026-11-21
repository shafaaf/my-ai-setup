import { expect, test } from 'claude-code/testing'

const HINT = { plugin: 'my-tools', component: 'PromptHint', props: { isDraft: false, isWorking: false, hint: '? for shortcuts' } } as const
const BAND = { plugin: 'my-tools', component: 'AbovePrompt', props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 20, bodyColumns: 80, scroll: { offset: 0, bodyRows: 20 }, view: {} } } as const

test('terminal: the footer pill opens the menu', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  const closed = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await closed.find({ type: 'Text', text: /Prompt Upgrade/ })).toBeUndefined()
  await closed.unmount()

  const hint = await $.ui.mount({ ...HINT, surface: 'terminal' })
  await hint.press({ key: 'my-tools-pill' })
  await hint.unmount()

  const open = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await open.find({ type: 'Text', text: /Prompt Upgrade/ })).toBeDefined()
  await open.press({ key: 'close' })
  await open.unmount()
})

test('desktop: the pill sits above the prompt and opens the menu in place', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await band.find({ type: 'Text', text: /Prompt Upgrade/ })).toBeUndefined()
  await band.press({ key: 'my-tools-pill' })
  expect(await band.find({ type: 'Text', text: /Prompt Upgrade/ })).toBeDefined()
  await band.press({ key: 'close' })
  expect(await band.find({ type: 'Text', text: /Prompt Upgrade/ })).toBeUndefined()
  await band.unmount()
})

test('the Daily Challenge row closes the menu and runs /challenge', async ($, on) => {
  const ran: { command: string; args: string }[] = []
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  // Stands for the daily-challenge mod's own command.
  on('command.run', (_, e) => {
    ran.push({ command: e.command, args: e.args })
    return { text: "Opening today's challenge." }
  })
  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await band.press({ key: 'my-tools-pill' })
  expect(await band.find({ type: 'Text', text: /Daily Challenge/ })).toBeDefined()
  await band.press({ key: 'mod-daily-challenge' })
  expect(ran).toEqual([{ command: 'challenge', args: '' }])
  expect(await band.find({ type: 'Text', text: /Daily Challenge/ })).toBeUndefined()
  await band.unmount()
})

test('the Helper Desk row closes the menu and runs /helpers', async ($, on) => {
  const ran: { command: string; args: string }[] = []
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  // Stands for the helper-desk mod's own command.
  on('command.run', (_, e) => {
    ran.push({ command: e.command, args: e.args })
    return { text: 'Helper Desk opened.' }
  })
  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await band.press({ key: 'my-tools-pill' })
  expect(await band.find({ type: 'Text', text: /Helper Desk/ })).toBeDefined()
  await band.press({ key: 'mod-helper-desk' })
  expect(ran).toEqual([{ command: 'helpers', args: '' }])
  expect(await band.find({ type: 'Text', text: /Helper Desk/ })).toBeUndefined()
  await band.unmount()
})

test('the Cache Board row closes the menu and runs /board', async ($, on) => {
  const ran: { command: string; args: string }[] = []
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  // Stands for cache-keeper's own command.
  on('command.run', (_, e) => {
    ran.push({ command: e.command, args: e.args })
    return { text: 'Board opened.' }
  })
  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await band.press({ key: 'my-tools-pill' })
  expect(await band.find({ type: 'Text', text: /Cache Board/ })).toBeDefined()
  await band.press({ key: 'mod-cache-board' })
  expect(ran).toEqual([{ command: 'board', args: '' }])
  expect(await band.find({ type: 'Text', text: /Cache Board/ })).toBeUndefined()
  await band.unmount()
})

test('the All Mods row closes the menu and runs /mods', async ($, on) => {
  const ran: { command: string; args: string }[] = []
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  // Stands for Ben AI's mods plugin's own command.
  on('command.run', (_, e) => {
    ran.push({ command: e.command, args: e.args })
    return { text: 'Opened the Mods pane.' }
  })
  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await band.press({ key: 'my-tools-pill' })
  expect(await band.find({ type: 'Text', text: /^All Mods$/ })).toBeDefined()
  await band.press({ key: 'mod-mods' })
  expect(ran).toEqual([{ command: 'mods', args: '' }])
  expect(await band.find({ type: 'Text', text: /^All Mods$/ })).toBeUndefined()
  await band.unmount()
})

test('the menu shows three mods per row, All Mods first, and wraps when narrow', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await band.press({ key: 'my-tools-pill' })
  const boxes = (await band.findAll({ type: 'Box' })).map(b => b.key ?? '')
  expect(boxes.filter(k => k.startsWith('menu-row-'))).toEqual(['menu-row-0', 'menu-row-1'])
  // A narrow window wraps a row onto more lines instead of cutting mods off.
  for (const key of ['menu-row-0', 'menu-row-1']) {
    expect((await band.find({ key }))?.props, `${key} wraps`).toMatchObject({ flexDirection: 'row', flexWrap: 'wrap' })
  }
  const cell = (await band.find({ key: 'cell-mods' }))?.props as { width?: unknown } | undefined
  expect(typeof cell?.width, 'cells have a fixed width in cells, not a % that squeezes').toBe('number')
  const buttons = (await band.findAll({ type: 'Button' })).map(b => b.key ?? '').filter(k => k.startsWith('mod-'))
  expect(buttons).toEqual(['mod-mods', 'mod-prompt-upgrade', 'mod-daily-challenge', 'mod-helper-desk', 'mod-cache-board'])
  await band.unmount()
})

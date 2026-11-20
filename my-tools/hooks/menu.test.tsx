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

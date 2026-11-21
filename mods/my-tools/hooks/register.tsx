import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const TITLE = "Shafaaf's Tools"

const PER_ROW = 3
// Each mod's cell, in terminal cells: fits the longest row ("● Prompt Upgrade  better prompts").
const CELL = 34

const isOpen = atom({ plugin: 'my-tools', key: 'isOpen' } as const, false)

// One row per mod; clicking the row runs it. To add a mod: add a row here, then a case in runMod below.
const MODS = [
  { key: 'mods', name: 'All Mods', blurb: '' },
  { key: 'prompt-upgrade', name: 'Prompt Upgrade', blurb: 'better prompts' },
  { key: 'daily-challenge', name: 'Daily Challenge', blurb: 'one a day' },
  { key: 'helper-desk', name: 'Helper Desk', blurb: '(subagents)' },
  { key: 'cache-board', name: 'Cache Board', blurb: '(All sessions)' },
]

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'tools', description: `Open or close the ${TITLE} menu` })
    return next(e)
  })

  on('command.run', { command: 'tools' }, async $ => {
    const was = await read($, isOpen)
    await update($, isOpen, () => !was)
    return { text: was ? `${TITLE} closed.` : `${TITLE} opened.` }
  })

  // Terminal: the pill sits at the right of the footer line under the prompt.
  // The desktop app never asks a mod to draw that line, so there the pill
  // lives in the band above the prompt instead (see below).
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const engine = await next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    const open = await read($, isOpen)
    return (
      <Box flexDirection="row" justifyContent="space-between">
        <Box flexGrow={1}>{engine}</Box>
        <Button key="my-tools-pill" plain onPress={() => update($, isOpen, () => !open)}>
          <Text color="warning">◆ </Text>
          {TITLE} {open ? '▼' : '▲'}
        </Button>
      </Box>
    )
  })

  // The menu box, above the prompt while open.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const open = await read($, isOpen)
    const { Box, Button, Text } = $.ui.resolve(e)

    // Closed: off the terminal, a one-line row with the pill on the right.
    if (!open) {
      if (e.surface === 'terminal') return next(e)
      return (
        <Box flexDirection="row" justifyContent="flex-end">
          {/* The desktop app paints a button's own text white, so the colour
              lives on the background and the glyphs around it. No border:
              it adds two rows of height. */}
          <Box flexDirection="row" alignItems="center" backgroundColor="#3A2A12" paddingX={1}>
            <Text color="warning" bold>◆ </Text>
            <Button key="my-tools-pill" plain label={TITLE} onPress={() => update($, isOpen, () => true)} />
            <Text color="warning" bold> ▲</Text>
          </Box>
        </Box>
      )
    }

    const runMod = async (key: string) => {
      if (key === 'prompt-upgrade') {
        const draft = (await $.prompt.read()).text.trim()
        if (!draft) {
          $.ui.toast('Prompt Upgrade: type a prompt in the box first.')
          return
        }
        await update($, isOpen, () => false)
        await $.command.run({ command: 'prompt-upgrade', args: draft })
      }
      if (key === 'daily-challenge') {
        await update($, isOpen, () => false)
        await $.command.run({ command: 'challenge', args: '' })
      }
      // Ben AI's mods plugin: /mods opens its pane that turns each mod on or off.
      if (key === 'mods') {
        await update($, isOpen, () => false)
        await $.command.run({ command: 'mods', args: '' })
      }
      // Ben AI's helper-desk mod: /helpers opens its side pane of subagent cards.
      if (key === 'helper-desk') {
        await update($, isOpen, () => false)
        await $.command.run({ command: 'helpers', args: '' })
      }
      // Nate Herk's cache-keeper: /board opens its Sessions pane.
      if (key === 'cache-board') {
        await update($, isOpen, () => false)
        await $.command.run({ command: 'board', args: '' })
      }
    }

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="warning" paddingX={1}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold color="warning">◆ {TITLE.toUpperCase().split('').join(' ')}</Text>
          <Button key="close" plain dimColor onPress={() => update($, isOpen, () => false)}>
            {e.surface === 'terminal' ? '[-]' : `${TITLE} ▼`}
          </Button>
        </Box>
        <Text dimColor>── M O D S</Text>
        {/* Three mods per row, in MODS order. A row wraps onto more lines when the
            window is too narrow, so no mod is cut off. The whole cell is the button:
            no separate button on the right, which overlapped the rows in the desktop app. */}
        {Array.from({ length: Math.ceil(MODS.length / PER_ROW) }, (_, r) => MODS.slice(r * PER_ROW, r * PER_ROW + PER_ROW)).map((row, r) => (
          <Box key={`menu-row-${r}`} flexDirection="row" flexWrap="wrap">
            {row.map(mod => (
              <Box key={`cell-${mod.key}`} width={CELL}>
                <Button key={`mod-${mod.key}`} plain onPress={() => runMod(mod.key)}>
                  <Text color="success">● </Text>
                  <Text bold>{mod.name}</Text>
                  {mod.blurb ? <Text dimColor>  {mod.blurb}</Text> : null}
                </Button>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    )
  })
}

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { PrLive, WaveStatus } from '../types'

const PANE = 'wave-status'
const ROOT = '/Users/shafaafhossain/Desktop/bot-food-work/worktrees'
const STATUS_FILE = 'WAVE-STATUS.json'

const status = atom({ plugin: 'my-workflow-wave-status', key: 'status' } as const, null, { shape: 'status-1' })
const file = atom({ plugin: 'my-workflow-wave-status', key: 'file' } as const, '', { shape: 'file-1' })
const live = atom({ plugin: 'my-workflow-wave-status', key: 'live' } as const, {}, { shape: 'live-2' })
const error = atom({ plugin: 'my-workflow-wave-status', key: 'error' } as const, '', { shape: 'error-1' })

type Ctx = EngineInterface

/**
 * This session's WAVE-STATUS.json, or null. A session owns a wave when the
 * file lists its id in `sessionIds` (the coordinator writes its own id there),
 * or when the session runs inside that wave's task folder (worktrees/<task>/…,
 * where the child sessions work). Another session's wave is never shown.
 */
async function sessionStatusFile($: Ctx): Promise<string | null> {
  const id = await $.session.id()
  const cwd = await $.session.cwd()
  const dirs = await $.fs.list(ROOT)
  let byFolder: string | null = null
  for (const dir of dirs) {
    if (dir.kind !== 'dir') continue
    const path = `${ROOT}/${dir.name}/${STATUS_FILE}`
    if (!(await $.fs.exists(path))) continue
    try {
      const wave = JSON.parse(await $.fs.read(path)) as WaveStatus
      if (wave.sessionIds?.includes(id)) return path
    } catch {
      // An unreadable file can still match by folder below.
    }
    const folder = `${ROOT}/${dir.name}`
    if (cwd === folder || cwd.startsWith(`${folder}/`)) byFolder = path
  }
  return byFolder
}

async function refreshFile($: Ctx) {
  try {
    const path = await sessionStatusFile($)
    if (!path) {
      await update($, status, () => null)
      await update($, error, () => '')
      return
    }
    const parsed = JSON.parse(await $.fs.read(path)) as WaveStatus
    const before = await read($, status)
    await update($, file, () => path)
    await update($, status, () => parsed)
    await update($, error, () => '')
    // This session's wave just started: open the pane without being asked.
    if (!before) void $.ui.open({ id: PANE, title: 'Wave status' })
  } catch (cause) {
    await update($, error, () => `Couldn't read the wave status: ${String(cause)}`)
  }
}

/** PR state and check counts from gh, for every PR the wave lists. */
async function refreshPrs($: Ctx) {
  const wave = await read($, status)
  if (!wave) return
  for (const repo of wave.repos) {
    if (!repo.prNumber || !repo.repoSlug) continue
    const key = `${repo.repoSlug}#${repo.prNumber}`
    try {
      const view = await $.process.run(
        ['gh', 'pr', 'view', String(repo.prNumber), '--repo', repo.repoSlug, '--json', 'state,isDraft', '-q', '.state + " " + (.isDraft|tostring)'],
        { timeoutMs: 20000 },
      )
      const checks = await $.process.run(
        ['gh', 'pr', 'checks', String(repo.prNumber), '--repo', repo.repoSlug],
        { timeoutMs: 20000 },
      )
      const buckets = checks.stdout
        .split('\n')
        .map(line => line.split('\t')[1])
        .filter(Boolean)
      const [state = '?', draft = 'false'] = view.stdout.trim().split(' ')
      const entry: PrLive = {
        state,
        isDraft: draft === 'true',
        pass: buckets.filter(b => b === 'pass').length,
        fail: buckets.filter(b => b === 'fail').length,
        pending: buckets.filter(b => b === 'pending').length,
        checkedAt: await $.clock.now(),
      }
      await update($, live, all => ({ ...all, [key]: entry }))
    } catch {
      // gh missing or offline: keep the last known value.
    }
  }
}

function ago(iso: string, now: number) {
  const ms = now - Date.parse(iso)
  if (!Number.isFinite(ms)) return iso
  const min = Math.round(ms / 60000)
  return min < 1 ? 'just now' : min < 60 ? `${min} min ago` : `${Math.round(min / 60)} h ago`
}

function ciText(entry: PrLive | undefined) {
  if (!entry) return '—'
  if (entry.state === 'MERGED') return '✅ merged'
  if (entry.state === 'CLOSED') return '⛔ closed'
  const stage = entry.isDraft ? '📝 draft' : '👀 ready'
  if (entry.fail > 0) return `${stage} · 🔴 ${entry.fail} failed`
  if (entry.pending > 0) return `${stage} · ⏳ ${entry.pending} running`
  return entry.pass > 0 ? `${stage} · ✅ ${entry.pass} passed` : stage
}

function findingsText(r: { red?: number; orange?: number; yellow?: number }) {
  const parts = [
    r.red ? `🔴 ${r.red}` : '',
    r.orange ? `🟠 ${r.orange}` : '',
    r.yellow ? `🟡 ${r.yellow}` : '',
  ].filter(Boolean)
  return parts.length ? parts.join(' ') : 'none'
}

const cell = (text: string) => text.replace(/\|/g, '\\|').replace(/\n/g, ' ')

// The folder's SKILL.md already gives Claude the /my-workflow-wave-status
// command, so the pane opens when that skill runs rather than registering a
// second command of the same name.
async function openPane($: Ctx) {
  await refreshFile($)
  void refreshPrs($)
  await $.ui.open({ id: PANE, title: 'Wave status' })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await refreshFile($)
    void refreshPrs($)
    $.clock.every(20000, () => refreshFile($))
    $.clock.every(120000, () => refreshPrs($))
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    if (/^\/(my-workflow-wave-status:)?my-workflow-wave-status\b/.test(e.text.trim())) await openPane($)
    return next(e)
  })

  on('tool.call', { tool: 'Skill' }, async ($, e, next) => {
    if (e.skill.endsWith('my-workflow-wave-status')) await openPane($)
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Markdown, Text } = $.ui.resolve(e)
    const wave = await read($, status)
    const prs = await read($, live)
    const problem = await read($, error)
    const now = await $.clock.now()

    if (!wave) {
      return (
        <Box flexDirection="column">
          <Text dimColor>No wave in this session. A wave shows here when this session runs it (its id is in the wave's WAVE-STATUS.json) or works inside its worktrees/&lt;task&gt;/ folder.</Text>
          {problem ? <Text color="red">{problem}</Text> : null}
        </Box>
      )
    }

    const rows = wave.repos.map(r => {
      const key = r.prNumber && r.repoSlug ? `${r.repoSlug}#${r.prNumber}` : ''
      const pr = r.pr ? `[#${r.prNumber ?? 'PR'}](${r.pr})` : '—'
      const round = r.reviewRound ? `round ${r.reviewRound}` : 'not yet'
      return `| ${cell(r.name)} | ${cell(r.stage)} | ${pr} | ${ciText(prs[key])} | ${round} | ${findingsText(r)} | ${cell(r.notes ?? '')} |`
    })
    const flags = (wave.flags ?? []).filter(Boolean)
    const md = [
      `**${wave.ticket}**: ${cell(wave.stage)} · updated ${ago(wave.updatedAt, now)}`,
      '',
      '| Session | Stage | PR | PR state · CI | Review | Findings | Notes |',
      '|---|---|---|---|---|---|---|',
      ...rows,
      '',
      flags.length ? `**🚩 Red flags**\n${flags.map(f => `- ${f}`).join('\n')}` : '🚩 No red flags',
      wave.next ? `\n**Next:** ${wave.next}` : '',
    ].join('\n')

    return (
      <Box flexDirection="column">
        <Markdown text={md} />
        {problem ? <Text color="red">{problem}</Text> : null}
      </Box>
    )
  })
}

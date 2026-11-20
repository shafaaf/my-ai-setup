import type { Register } from 'claude-code'

// my-notifications-mod: when another Claude chat needs you, every other chat
// shows a card above the prompt with the chat's name, an "open" link that jumps
// to it, and "dismiss". A dismiss is saved in this mod's shared store, so the
// card goes away in every chat.
//
// Each chat writes a heartbeat (hb:<id>) to the shared store; every chat reads
// all heartbeats to build its cards. Alerts:
//   waiting  - a permission prompt or a question is open in that chat
//   cooling  - a big chat's prompt cache is about to expire
//   finished - that chat finished its turn and is waiting for your reply

const MIN = 60000
const TICK_MS = 5000
const STALE_MS = 3 * MIN // a chat silent this long is skipped
const GONE_MS = 60 * MIN // a chat silent this long has its heartbeat removed
const FINISHED_FOR_MS = 30 * MIN // a "finished" card stays at most this long
const DISMISS_KEEP_MS = 24 * 60 * MIN
const SESSIONS_DIR = 'Library/Application Support/Claude/claude-code-sessions'

type Beat = {
  id: string
  hostId: string
  label: string
  state: 'working' | 'waiting' | 'idle'
  waitingFor: string
  waitingSince: number
  lastTurnEnd: number
  lastActivity: number
  ctx: number
  ttlMin: number
  updatedAt: number
}

type Alert = { key: string; beat: Beat; color: string; text: string }

type Settings = { on: boolean; finished: boolean; cooling: boolean; bigTokens: number; ttlMin: number }

const settings: Settings = { on: true, finished: true, cooling: true, bigTokens: 150000, ttlMin: 60 }

const S = {
  id: '',
  hostId: '',
  home: '',
  cwdName: '',
  firstPrompt: '',
  title: '',
  sessionFile: '',
  working: false,
  waitingFor: '',
  waitingSince: 0,
  lastTurnEnd: 0,
  lastActivity: 0,
  ctx: 0,
}

let now = 0
let others: Beat[] = []
let dismissed: Record<string, number> = {}

function basename(p: string): string {
  const parts = String(p || '').split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 1] || ''
}

function clip(s: string, n: number): string {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

function tokens(n: number): string {
  return n >= 1000 ? Math.round(n / 1000) + 'k' : String(n || 0)
}

function minutes(ms: number): string {
  return Math.max(1, Math.round(ms / MIN)) + 'm'
}

function ago(ms: number): string {
  const m = Math.round(ms / MIN)
  return m < 1 ? 'just now' : m + 'm ago'
}

function parseTokens(text: string): number | null {
  const m = String(text || '').trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([km]?)$/)
  if (!m) return null
  return Math.round(Number(m[1]) * (m[2] === 'm' ? 1e6 : m[2] === 'k' ? 1e3 : 1))
}

// The desktop app's link that opens a chat; empty outside the desktop app
function openHref(b: Beat): string {
  return /^local_[A-Za-z0-9-]{1,64}$/.test(b.hostId || '') ? `claude://code/continue?session=${b.hostId}` : ''
}

function label(): string {
  if (S.title) return S.title
  return S.firstPrompt ? `${S.cwdName} · ${S.firstPrompt}` : S.cwdName
}

function myBeat(): Beat {
  let state: Beat['state'] = 'idle'
  if (S.waitingSince) state = 'waiting'
  else if (S.working) state = 'working'
  return {
    id: S.id,
    hostId: S.hostId,
    label: label(),
    state,
    waitingFor: S.waitingFor,
    waitingSince: S.waitingSince,
    lastTurnEnd: S.lastTurnEnd,
    lastActivity: S.lastActivity,
    ctx: S.ctx,
    ttlMin: settings.ttlMin,
    updatedAt: now,
  }
}

// The chat's title as the desktop app shows it in the sidebar
async function readTitle($: any): Promise<void> {
  if (!S.hostId || !S.home) return
  try {
    if (!S.sessionFile) {
      const root = `${S.home}/${SESSIONS_DIR}`
      for (const a of await $.fs.list(root)) {
        if (a.kind !== 'dir') continue
        for (const b of await $.fs.list(`${root}/${a.name}`)) {
          if (b.kind !== 'dir') continue
          const file = `${root}/${a.name}/${b.name}/${S.hostId}.json`
          if (await $.fs.exists(file)) {
            S.sessionFile = file
            break
          }
        }
        if (S.sessionFile) break
      }
    }
    if (!S.sessionFile) return
    const data = JSON.parse(await $.fs.read(S.sessionFile))
    const title = data && typeof data.title === 'string' ? data.title.trim() : ''
    // the app's placeholder says nothing about the chat: keep the first prompt
    S.title = title && title !== 'New session' ? title : ''
  } catch {
    // no desktop session file: keep the folder name and first prompt
  }
}

async function heartbeat($: any): Promise<void> {
  now = await $.clock.now()
  if (S.id) await $.store.set('hb:' + S.id, myBeat())
}

async function readOthers($: any): Promise<void> {
  now = await $.clock.now()
  const list: Beat[] = []
  for (const k of await $.store.keys()) {
    if (!k.startsWith('hb:')) continue
    const b = (await $.store.get(k)) as Beat | undefined
    if (!b || typeof b !== 'object' || b.id === S.id) continue
    if (now - (b.updatedAt || 0) > GONE_MS) {
      await $.store.delete(k)
      continue
    }
    list.push(b)
  }
  others = list
  dismissed = ((await $.store.get('dismissed')) as Record<string, number>) || {}
}

function alertFor(b: Beat): Alert | null {
  const name = `"${clip(b.label || b.id, 48)}"`
  if (b.state === 'waiting') {
    return { key: `wait:${b.id}:${b.waitingSince}`, beat: b, color: 'magenta', text: `⏳ ${name} needs you${b.waitingFor ? ': ' + b.waitingFor : ''}` }
  }
  if (settings.cooling && b.state === 'idle' && b.lastActivity && (b.ctx || 0) >= settings.bigTokens) {
    const left = (b.ttlMin || 60) * MIN - (now - b.lastActivity)
    if (left > 0 && left <= 5 * MIN) {
      return { key: `cool:${b.id}:${b.lastActivity}`, beat: b, color: 'yellow', text: `◐ ${name}: ${tokens(b.ctx)} cache goes cold in ${minutes(left)}` }
    }
  }
  if (settings.finished && b.state === 'idle' && b.lastTurnEnd && now - b.lastTurnEnd < FINISHED_FOR_MS) {
    return { key: `done:${b.id}:${b.lastTurnEnd}`, beat: b, color: 'green', text: `✓ ${name} finished ${ago(now - b.lastTurnEnd)}, your turn` }
  }
  return null
}

function alertList(): Alert[] {
  if (!settings.on) return []
  const list: Alert[] = []
  for (const b of others) {
    if (now - (b.updatedAt || 0) > STALE_MS) continue
    const a = alertFor(b)
    if (a && !dismissed[a.key]) list.push(a)
  }
  const rank: Record<string, number> = { wait: 0, cool: 1, done: 2 }
  const order = (a: Alert) => rank[a.key.slice(0, 4)] ?? 3
  return list.sort((x, y) => order(x) - order(y))
}

// A link drawn in a mod doesn't open claude:// in the desktop app, so ask macOS to open it
// Opening a chat also dismisses its card: by then you've seen it
async function openChat($: any, href: string, key: string): Promise<void> {
  const r = await $.process.run(['open', href], { timeoutMs: 10000 })
  if (r.exitCode !== 0) {
    $.ui.toast('Could not open that chat: ' + clip(r.stderr || 'open failed', 80))
    return
  }
  await dismiss($, [key])
}

async function dismiss($: any, keys: string[]): Promise<void> {
  now = await $.clock.now()
  const saved = ((await $.store.get('dismissed')) as Record<string, number>) || {}
  const kept: Record<string, number> = {}
  for (const [k, at] of Object.entries(saved)) if (now - at < DISMISS_KEEP_MS) kept[k] = at
  for (const k of keys) kept[k] = now
  dismissed = kept
  await $.store.set('dismissed', kept)
  $.ui.invalidate('ui.render')
}

async function tick($: any): Promise<void> {
  await readTitle($)
  await heartbeat($)
  await readOthers($)
  $.ui.invalidate('ui.render')
}

function statusText(): string {
  const lines = [
    `my-notifications-mod: ${settings.on ? 'on' : 'off'}. Finished cards: ${settings.finished ? 'on' : 'off'}. Cooling cards: ${settings.cooling ? 'on' : 'off'} (chats over ${tokens(settings.bigTokens)}, ${settings.ttlMin}-min cache).`,
    `This chat: "${label()}"${S.hostId ? '' : ' (no desktop id, so other chats cannot link to it)'}.`,
    `Watching ${others.filter((b) => now - (b.updatedAt || 0) <= STALE_MS).length} other chat(s). Cards showing: ${alertList().length}.`,
    'Settings: /notify on|off, /notify finished on|off, /notify cooling on|off, /notify big 150k, /notify ttl 5|60, /notify clear (dismiss all).',
  ]
  return lines.join('\n')
}

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    now = await $.clock.now()
    S.id = await $.session.id()
    S.cwdName = basename(await $.session.cwd())
    S.home = (await $.env.get('HOME')) || (await $.env.get('USERPROFILE')) || ''
    S.hostId = (await $.env.get('CLAUDE_CODE_HOST_SESSION_ID')) || ''
    const saved = await $.store.get('settings')
    if (saved && typeof saved === 'object') Object.assign(settings, saved)
    await $.command.register({ name: 'notify', description: 'my-notifications-mod: status and settings', argumentHint: '[on|off] [finished on|off] [cooling on|off] [big 150k] [ttl 5|60] [clear]' }).catch(() => {})
    await tick($).catch(() => {})
    $.clock.every(TICK_MS, () => {
      tick($).catch(() => {})
    })
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    if (S.id) await $.store.delete('hb:' + S.id).catch(() => {})
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    if (!S.firstPrompt && e.origin && e.origin.kind === 'composer' && e.text && !String(e.text).trim().startsWith('/')) {
      S.firstPrompt = clip(e.text, 40)
    }
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    S.working = true
    await heartbeat($).catch(() => {})
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    if (!e.agentId) S.lastActivity = await $.clock.now()
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (e.agentId) return r
    now = await $.clock.now()
    S.working = false
    S.waitingSince = 0
    S.waitingFor = ''
    S.lastTurnEnd = now
    try {
      const usage = await $.session.usage()
      if (usage.context && usage.context.tokens) S.ctx = usage.context.tokens
    } catch {
      // usage unavailable: keep the last figure
    }
    await readTitle($)
    await heartbeat($).catch(() => {})
    return r
  })

  // Waiting on you: a permission prompt or a question
  on('tool.check', async ($, e, next) => {
    const d = await next(e)
    if (d && d.decision === 'ask' && !S.waitingSince) {
      S.waitingSince = await $.clock.now()
      S.waitingFor = 'permission for ' + e.tool
      await heartbeat($).catch(() => {})
    }
    return d
  })

  on('tool.call', async ($, e, next) => {
    if (!e.agentId && e.tool === 'AskUserQuestion') {
      S.waitingSince = await $.clock.now()
      S.waitingFor = 'a question'
      await heartbeat($).catch(() => {})
    }
    try {
      return await next(e)
    } finally {
      if (S.waitingSince) {
        S.waitingSince = 0
        S.waitingFor = ''
      }
    }
  })

  on('command.run', { command: 'notify' }, async ($, e) => {
    now = await $.clock.now()
    const [key, value] = String(e.args || '').trim().toLowerCase().split(/\s+/)
    if (key === 'on' || key === 'off') settings.on = key === 'on'
    else if (key === 'finished' || key === 'cooling') settings[key] = value !== 'off'
    else if (key === 'big') {
      const n = parseTokens(value || '')
      if (n) settings.bigTokens = n
    } else if (key === 'ttl') settings.ttlMin = value === '5' ? 5 : 60
    else if (key === 'clear') await dismiss($, alertList().map((a) => a.key))
    if (key && key !== 'clear') await $.store.set('settings', settings)
    await readOthers($)
    $.ui.invalidate('ui.render')
    return { text: statusText() }
  })

  // The cards, above the prompt
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    if (e.props && e.props.hasSurvey) return below
    const alerts = alertList()
    if (!alerts.length) return below
    const { Box, Text, Button } = $.ui.resolve(e)
    const shown = alerts.slice(0, 3)
    const cards = shown.map((a) => {
      const href = openHref(a.beat)
      return (
        <Box key={'card-' + a.key} flexDirection="row" justifyContent="space-between" columnGap={2}>
          <Text color={a.color}>{a.text}</Text>
          <Box flexDirection="row" columnGap={2}>
            {href ? <Button key={'open-' + a.key} plain label="open" onPress={() => openChat($, href, a.key).catch(() => {})} /> : <Text dimColor>no link</Text>}
            <Button key={'dismiss-' + a.key} plain dimColor label="dismiss" onPress={() => dismiss($, [a.key]).catch(() => {})} />
          </Box>
        </Box>
      )
    })
    const more = alerts.length - shown.length
    const box = (
      <Box flexDirection="column" borderStyle="round" borderColor="warning" paddingX={1}>
        {cards}
        {more > 0 ? <Text dimColor>+{more} more · /notify clear dismisses all</Text> : null}
      </Box>
    )
    return below ? <Box flexDirection="column">{box}{below}</Box> : box
  })
}

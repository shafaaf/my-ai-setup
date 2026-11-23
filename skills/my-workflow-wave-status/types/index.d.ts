/** One open review finding: its colour and a one-line title. */
export type OpenFinding = { level: 'red' | 'orange'; title: string }

/** One child session / repo in a wave, as the coordinator records it in WAVE-STATUS.json. */
export type WaveRepo = {
  name: string
  repo: string
  stage: string
  pr?: string
  prNumber?: number
  repoSlug?: string
  reviewRound?: number
  /** The model that ran each review round, in order, e.g. ["Claude", "Codex"]. */
  reviewModels?: string[]
  /** True for a risky PR (vault, sign-in probe, auth, cross-repo contract or API, migration, billing). */
  risky?: boolean
  /** One-line titles of the 🔴/🟠 findings still open. */
  openFindings?: OpenFinding[]
  red?: number
  orange?: number
  yellow?: number
  /** When CI is red: one short line on what fails and why, written by the coordinator. Clear it once CI is green. */
  ciNote?: string
  /** 2-3 short plain sentences: code done? tested? reviewed? PR stuck, merged, or waiting for release? */
  summary?: string
  /** Older field; the pane no longer shows it. */
  notes?: string
}

/** The coordinator's WAVE-STATUS.json for one wave. */
export type WaveStatus = {
  /** Claude session ids (CLAUDE_CODE_SESSION_ID) whose pane shows this wave: the coordinator's at least. */
  sessionIds?: string[]
  ticket: string
  stage: string
  updatedAt: string
  repos: WaveRepo[]
  /** 2-3 short plain sentences: where the whole wave is at a glance. */
  summary?: string
  /** How much of the wave is done, 0-100. Without it the pane estimates from the rows. */
  percent?: number
  flags?: string[]
  /** Next steps: a list, or one string with steps split by "; ". */
  next?: string | string[]
}

/** Live GitHub state of one PR, keyed by "<repoSlug>#<prNumber>". */
export type PrLive = {
  state: string
  isDraft: boolean
  pass: number
  fail: number
  pending: number
  /** Checks that count (skipped ones left out). */
  total: number
  /** Names of the failing checks. */
  failed: string[]
  checkedAt: number
}

declare module 'claude-code' {
  interface PluginState {
    'my-workflow-wave-status': {
      status: Shaped<WaveStatus | null>
      file: Shaped<string>
      live: Shaped<Record<string, PrLive>>
      error: Shaped<string>
    }
  }
}

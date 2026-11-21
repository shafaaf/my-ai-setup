/** One child session / repo in a wave, as the coordinator records it in WAVE-STATUS.json. */
export type WaveRepo = {
  name: string
  repo: string
  stage: string
  pr?: string
  prNumber?: number
  repoSlug?: string
  reviewRound?: number
  red?: number
  orange?: number
  yellow?: number
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
export type PrLive = { state: string; isDraft: boolean; pass: number; fail: number; pending: number; checkedAt: number }

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

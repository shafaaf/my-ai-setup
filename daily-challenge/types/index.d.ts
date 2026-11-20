// One completed challenge: which one (its index in the deal order) and the
// local calendar day it was completed on (YYYY-MM-DD).
export type Completion = { id: number; day: string }

// "Give me another": the challenge swapped in, and the day the swap holds for.
export type Swap = { id: number; day: string }

// Everything the mod remembers. Saved in the mod's store ($.store) under
// "progress" so it survives restarts, and mirrored in $.state so the pane
// redraws when it changes.
export type Progress = { done: Completion[]; swap: Swap | null }

declare module 'claude-code' {
  interface PluginState {
    'daily-challenge': { progress: Shaped<Progress> }
  }
}

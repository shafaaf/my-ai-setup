# Changes to Nate Herk's mods

> cache-keeper and collision-guard come from Nate Herk's video [Claude Code Mods Are Game Changers. Set Up These 5 NOW.](https://www.youtube.com/watch?v=9hetShMMp2s).

Nate Herk's Claude Code mods (cache-keeper, collision-guard, goal-meter, recording-mode) are **not** in this repo. He shares them as a zip. On my Mac they live in `~/.claude/nateherk-mods/`.

I run them **exactly as Nate wrote them**, with **two** small changes, listed below. This folder keeps those changes so it can be put back after installing a new zip from Nate, which replaces his files.

## The changes

| Date | Mod | Version | What changed |
|---|---|---|---|
| 2026-11-19 | cache-keeper | 1.0.0 → 1.0.1 | The line above the prompt shows context as a **percentage** of the context window (`ctx 39%`) instead of a token count (`ctx 393k`). Until the window size is known, it falls back to the token count. |
| 2026-11-21 | cache-keeper | 1.0.1 → 1.0.2 | `/board` names each chat by its **sidebar title** in the desktop app (`Doc updates - ticket panning`) instead of the folder name (`bot-food-work · fix the…`). It re-reads the title every 30 s, so renames show up. Outside the desktop app (terminal) it keeps Nate's label. |

- **1.0.1, ctx %:** `cache-keeper/hooks/register.mjs`, one line (line 723 in Nate's 1.0.0), in the band drawn above the prompt. Diff: [`cache-keeper-ctx-percent.diff`](cache-keeper-ctx-percent.diff)
- **1.0.2, board titles:** `cache-keeper/hooks/register.mjs`: a `readTitle` helper that reads the chat's title from the desktop app's session file (`~/Library/Application Support/Claude/claude-code-sessions/…/<CLAUDE_CODE_HOST_SESSION_ID>.json`), called from `heartbeat`, and the heartbeat's `label` uses that title when there is one. Each added line is marked `[Shafaaf 1.0.2]`. Diff: [`cache-keeper-board-titles.diff`](cache-keeper-board-titles.diff)
- Everything else (keep warm, handoff, cache timer, rewrite cost, plan limits, alerts, `/board`) is Nate's code, unchanged.

**Before / after:**

```
● cache warm 60m | ctx 393k | rewrite ≈ $3.15 | 5h 15% · week 93% | session $24     (Nate's)
● cache warm 60m | ctx 39%  | rewrite ≈ $3.15 | 5h 15% · week 93% | session $24     (with this change)
```

## Putting it back after a new zip from Nate

1. Install Nate's new zip as his `INSTALL-FOR-CLAUDE.md` says. It goes in `~/.claude/nateherk-mods/`.
2. Apply the diff:

   ```
   cd ~/.claude/nateherk-mods
   patch -p1 < ~/.agents/mods/mods/nate-herk-changes/cache-keeper-ctx-percent.diff
   patch -p1 < ~/.agents/mods/mods/nate-herk-changes/cache-keeper-board-titles.diff
   ```

   If `patch` says the hunk failed, Nate changed that line. Open `cache-keeper/hooks/register.mjs`, find the part that draws ``ctx ${tokens(S.ctx)}``, and make the same edit by hand.
3. Bump `version` in `cache-keeper/.claude-plugin/plugin.json` (for example `1.0.0` → `1.0.2`). Claude Code only reinstalls when the version changes.
4. Reinstall:

   ```
   claude plugin marketplace update nateherk-mods
   claude plugin update cache-keeper@nateherk-mods
   ```

5. Type `/reload-plugins` in open chats, then send any message. The line hides after a reload until the next message, which is how Nate's code works.
6. Copy this file to `~/.claude/nateherk-mods/CHANGES.md` so the local copy has the record too.

## Why the changes are in Nate's file and not in my own mod

A mod can only draw its **own** row. It can't change the text inside another mod's row. The only way to make Nate's `ctx` show a percentage is this one-line edit in his file.

The same goes for `/board`: the Sessions pane is drawn by cache-keeper from heartbeats only cache-keeper writes, so the session names have to come from cache-keeper itself.

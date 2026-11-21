# Changes to Ben AI's mods

> brain-dump (`/shape`), helper-desk (`/helpers`) and mods (`/mods`) come from Ben AI's video [9 Insane Claude Mods I Already Can't Live Without](https://www.youtube.com/watch?v=bTqizdva04g).

Ben AI's mods are **not** in this repo. On my Mac they live in `~/.claude/benai-mods/` (a folder marketplace named `benai-mods`).

I run them **exactly as Ben wrote them**, with **one** change to the `/mods` pane, listed below. This folder keeps that change so it can be put back after a new copy from Ben replaces his files.

## The change

| Date | Mod | Version | What changed |
|---|---|---|---|
| 2026-11-21 | mods (the `/mods` pane) | 0.4.0 (not bumped) | 1. Ben's own mods (Cache Clock, Handoff, Screen-Share Mode, Brain-Dump Shaper, Reflect, Helper Desk, Chat Inventory) show **only when installed**. Before, all seven always showed. 2. The pane also finds mods in `~/.claude/skills`, such as my Wave status mod, which loads from there. 3. Each row shows **who made the mod** in brackets after its name, from `plugin.json` `author` (for example `Helper Desk (Ben AI)`, `Cache Keeper (Nate Herk)`). A mod with no author gets no brackets. |

- **Code:** `plugins/mods/hooks/register.tsx`. In `scan()`, a known mod is skipped when it isn't found on disk, and `<config>/skills` is scanned like the other mod folders. In `inspect()`, `author` is read from `plugin.json`, and the row draws it dimmed after the title.
- **Tests:** `plugins/mods/hooks/register.test.tsx`. Ben's tests expected all seven mods with nothing installed, so they now "install" the seven on the fake disk first (`installKnown`). There is one new test (desktop and terminal) for the three changes. It fails on Ben's code and passes with the change. Run them with `claude plugin test ~/.claude/benai-mods/plugins/mods` (12 pass).
- Diff: [`mods-pane.diff`](mods-pane.diff)

**Before / after on my Mac:**

| | Before | After |
|---|---|---|
| Ben's mods I haven't installed (Cache Clock, Handoff, Screen-Share Mode, Reflect, Chat Inventory) | Listed | Gone |
| Wave status (`~/.claude/skills/my-workflow-wave-status`) | Missing | Listed (with the "Not switchable yet" note, since it has no on/off switch) |
| Who made each mod | Not shown | `Brain-Dump Shaper (Ben AI)`, `Cache Keeper (Nate Herk)`, `My Tools (Shafaaf)`, `Botfood Panes (Brendan Stennett)`, `Next Steps (Thariq Shihipar)` |

## Putting it back after a new copy from Ben

1. Install Ben's new copy into `~/.claude/benai-mods/` as he says.
2. Apply the diff:

   ```
   cd ~/.claude/benai-mods
   patch -p1 < ~/.agents/mods/mods/ben-ai-changes/mods-pane.diff
   ```

   If `patch` says a hunk failed, Ben changed that part. Open `plugins/mods/hooks/register.tsx`, find `scan()` and `inspect()`, and make the same edits by hand.
3. Copy the two changed files into the installed copy too, `~/.claude/plugins/cache/benai-mods/mods/<version>/hooks/`, or bump `version` in `plugins/mods/.claude-plugin/plugin.json` and run `claude plugin update mods@benai-mods`.
4. Type `/reload-plugins` in open chats, then open `/mods`.

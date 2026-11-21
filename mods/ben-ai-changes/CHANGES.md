# Changes to Ben AI's mods

> brain-dump (`/shape`), helper-desk (`/helpers`) and mods (`/mods`) come from Ben AI's video [9 Insane Claude Mods I Already Can't Live Without](https://www.youtube.com/watch?v=bTqizdva04g).

Ben AI's mods are **not** in this repo. On my Mac they live in `~/.claude/benai-mods/` (a folder marketplace named `benai-mods`).

I run them **exactly as Ben wrote them**, with the changes listed below: one to the `/mods` pane and one to brain-dump's `/shape`. This folder keeps those changes so they can be put back after a new copy from Ben replaces his files.

## The changes

| Date | Mod | Version | What changed |
|---|---|---|---|
| 2026-11-21 | mods (the `/mods` pane) | 0.4.0 (not bumped) | 1. Ben's own mods (Cache Clock, Handoff, Screen-Share Mode, Brain-Dump Shaper, Reflect, Helper Desk, Chat Inventory) show **only when installed**. Before, all seven always showed. 2. The pane also finds mods in `~/.claude/skills`, such as my Wave status mod, which loads from there. 3. Each row shows **who made the mod** in brackets after its name, from `plugin.json` `author` (for example `Helper Desk (Ben AI)`, `Cache Keeper (Nate Herk)`). A mod with no author gets no brackets. 4. The **commands you type** sit alone on the **last line** of each row (`/helpers`, `/cache, /board`), with only the description above. A description that starts with its command (`/challenge: one small…`) loses that prefix. Commands are also found from `command.run` hooks (Nate's `/cache`, `/board`, `/guard`; aliases like `ck-cache` left out) and from a skill folder's `SKILL.md` name (`/my-workflow-wave-status`). Ben's own rows say just the command (`/helpers`, not `/helpers to open`), and Brain-Dump shows `/shape`. 5. **On and Off are both buttons**: the current state is marked (`● On` in green or `● Off` in red), and pressing the other one switches to it. Before, there was one button that showed only the current state. 6. **Open shows only while a pane mod is On and Shown.** When it's Hidden or Off, there's no Open at all. Before, a greyed-out Open that couldn't be pressed stayed visible. |
| 2026-11-21 | brain-dump (`/shape`) | 0.3.0 (not bumped) | **`/shape` and the `/mods` switch are now one switch.** `/shape` turns brain-dump on or off in every chat by writing the same `switches.json` the `/mods` pane uses. Before, `/shape` kept a second, private switch and refused to do anything while `/mods` had the mod off ("Turn it on with /mods"), so it could never turn it back on. |

- **Code:** `plugins/mods/hooks/register.tsx`. In `scan()`, a known mod is skipped when it isn't found on disk, and `<config>/skills` is scanned like the other mod folders. In `inspect()`, `author` is read from `plugin.json`, and the row draws it dimmed after the title. `commandsIn()` also reads `command.run` hooks, `splitWhat()` takes a leading command off the description, `skillCommand()` reads `SKILL.md`, and the commands line is drawn last.
- **Tests:** `plugins/mods/hooks/register.test.tsx`. Ben's tests expected all seven mods with nothing installed, so they now "install" the seven on the fake disk first (`installKnown`). There is one new test (desktop and terminal) for the four changes. It fails on Ben's code and passes with the change. Run them with `claude plugin test ~/.claude/benai-mods/plugins/mods` (12 pass).
- **brain-dump code:** `plugins/brain-dump/hooks/register.tsx`: a `setSwitch()` writes `switches.json` (off is `false`, on deletes the key, like `/mods`), `/shape` flips it, and `isOn()` reads only that switch. **Test:** Ben's "does nothing when switched off" test now also checks that `/shape` turns it on and off in `switches.json` and that the next brain dump gets (or doesn't get) the offer. Run with `claude plugin test ~/.claude/benai-mods/plugins/brain-dump` (10 pass).
- Diffs: [`mods-pane.diff`](mods-pane.diff) and [`brain-dump-shape-switch.diff`](brain-dump-shape-switch.diff)

**Before / after on my Mac:**

| | Before | After |
|---|---|---|
| Ben's mods I haven't installed (Cache Clock, Handoff, Screen-Share Mode, Reflect, Chat Inventory) | Listed | Gone |
| Wave status (`~/.claude/skills/my-workflow-wave-status`) | Missing | Listed (with the "Not switchable yet" note, since it has no on/off switch) |
| Commands | In the middle, with extra words (`/helpers to open`); Nate's, `/shape` and skills missing | Alone on the last line: `/helpers`, `/handoff, /cache, /keepwarm, /board`, `/guard`, `/challenge`, `/my-workflow-wave-status` |
| On/off | One button showing the current state | `On` and `Off` buttons, the current one marked |
| Open on a Hidden or Off pane mod | Greyed out, can't be pressed | Not shown |
| `/shape` while off | "Turn it on with /mods" (did nothing) | Turns it on; `/shape` again turns it off |
| Who made each mod | Not shown | `Brain-Dump Shaper (Ben AI)`, `Cache Keeper (Nate Herk)`, `My Tools (Shafaaf)`, `Botfood Panes (Brendan Stennett)`, `Next Steps (Thariq Shihipar)` |

## Putting it back after a new copy from Ben

1. Install Ben's new copy into `~/.claude/benai-mods/` as he says.
2. Apply the diff:

   ```
   cd ~/.claude/benai-mods
   patch -p1 < ~/.agents/mods/mods/ben-ai-changes/mods-pane.diff
   patch -p1 < ~/.agents/mods/mods/ben-ai-changes/brain-dump-shape-switch.diff
   ```

   If `patch` says a hunk failed, Ben changed that part. Open `plugins/mods/hooks/register.tsx`, find `scan()`, `inspect()`, `commandsIn()` and the row drawing, and make the same edits by hand.
3. Copy the changed `hooks/` files into the installed copies too (`~/.claude/plugins/cache/benai-mods/mods/<version>/hooks/` and `.../brain-dump/<version>/hooks/`), or bump each `version` in its `.claude-plugin/plugin.json` and run `claude plugin update mods@benai-mods` and `claude plugin update brain-dump@benai-mods`.
4. Type `/reload-plugins` in open chats, then open `/mods`.

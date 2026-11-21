# my-ai-setup

Shafaaf's own **Claude Code mods** and **skills**, in one repository.

| Folder | What's in it |
|---|---|
| [`mods/`](mods/) | **Mods**: small plugins that change what Claude Code shows or does (a menu, a side pane, a card above the prompt). Installed through this repo's plugin marketplace. |
| [`skills/`](skills/) | **Skills**: instructions Claude Code and Codex follow when you call them by name (`/name` in Claude, `$name` in Codex). See [`skills/README.md`](skills/README.md). |
| [`settings/`](settings/) | **Settings**: my shortcuts, custom commands and Claude settings. See [`settings/README.md`](settings/README.md). |
| [`.claude-plugin/`](.claude-plugin/) | The marketplace file that lists the mods. |

This repository (`my-ai-setup`, formerly `my-mods`) is also a **plugin marketplace** named `my-mods`, so Claude Code can install any of the mods below straight from GitHub. The marketplace keeps the old name so installed mods (`<mod>@my-mods`) keep working.

## Mods

| Mod | In one line |
|---|---|
| [my-tools](#1-my-tools-shafaafs-tools-menu) | A pop-out **Shafaaf's Tools** menu that holds the other mods |
| [prompt-upgrade](#2-prompt-upgrade) | Turns a rough prompt into a strong one, in a side pane |
| [my-notifications-mod](#3-my-notifications-mod) | A card above the prompt when **another** Claude chat needs you |
| [daily-challenge](#4-daily-challenge) | One small Claude Code exercise a day, with your streak, in a side pane |
| [nate-herk-changes](mods/nate-herk-changes/CHANGES.md) | Not a mod: the small changes made to Nate Herk's cache-keeper mod |
| [ben-ai-changes](mods/ben-ai-changes/CHANGES.md) | Not a mod: the changes made to Ben AI's `/mods` pane (only installed mods, who made each, commands last, On and Off buttons) and to `/shape` (one shared on/off switch) |

## Where the mods come from

I found these mods in three videos. Mods by other people are **not** in this repo: install them from their own marketplace.

| Video | Mods | Commands | In this repo? |
|---|---|---|---|
| [Nate Herk: Claude Code Mods Are Game Changers. Set Up These 5 NOW.](https://www.youtube.com/watch?v=9hetShMMp2s) | cache-keeper, collision-guard | `/cache`, `/board`, `/guard` (also `/collision-guard`) | No: Nate's mods, from the `nateherk-mods` marketplace. My small cache-keeper changes are in [nate-herk-changes](mods/nate-herk-changes/CHANGES.md). |
| [Tristen O'Brien: 5 MORE Claude Code MODS You Need](https://www.youtube.com/watch?v=aD-h7Bcn5OY) | Prompt master, Daily challenge | `/prompt-upgrade`, `/challenge` | Yes: my own versions, [prompt-upgrade](#2-prompt-upgrade) and [daily-challenge](#4-daily-challenge), built from his ideas. **More of his mods:** [tristenobrien.ai](https://tristenobrien.ai/) |
| [Ben AI: 9 Insane Claude Mods I Already Can't Live Without](https://www.youtube.com/watch?v=bTqizdva04g) | brain-dump, helper-desk, mods | `/shape`, `/helpers`, `/mods` (the "switchboard" pane) | No: Ben's mods, from the `benai-mods` marketplace. My changes to `/mods` and `/shape` are in [ben-ai-changes](mods/ben-ai-changes/CHANGES.md). |

## Skills

| Skill | What it does |
|---|---|
| my-easy-explain | Explains code and workflows simply, for a new engineer |
| my-storm-stanford-research | Multi-perspective, citation-checked HTML research briefing |
| my-repos-sync | Pulls the default branch in every repo under a folder |
| my-onboarding-guides-code | Beginner and intermediate onboarding guides for a repo |
| my-cleanup-workstation | Cleans up local disk, worktrees and caches |
| my-workflow-wave | Runs an approved multi-repo plan end to end |
| my-workflow-wave-status | Shows where a running wave is (Claude pane, or Codex table) |
| my-walkthrough-guide | Hands-on walkthroughs, one real example per turn |
| my-review-all | Reviews every changed repo of a task together |
| my-hello-interview-botfood-notes | Interview-study notes linking a Hello Interview guide to real BotFood examples |

How to install them for Claude and Codex, and the rules for writing them, are in [`skills/README.md`](skills/README.md).

---

## Install the mods

You need Claude Code. The mods work best in the **Claude desktop app**; most also work in the terminal (see each mod).

**Steps:**

1. Open a Claude Code chat.
2. Type the install line for the mod you want, at the prompt:

   ```
   /plugin install my-tools --marketplace shafaaf/my-ai-setup
   /plugin install prompt-upgrade --marketplace shafaaf/my-ai-setup
   /plugin install my-notifications-mod --marketplace shafaaf/my-ai-setup
   /plugin install daily-challenge --marketplace shafaaf/my-ai-setup
   ```

3. The first time, Claude Code asks whether to add the `shafaaf/my-ai-setup` marketplace. Answer `y`.
4. Pick a scope. `user` means "in every project on this computer", which is usually what you want.
5. Load it:
   - **New chats** load the mod on their own.
   - **Chats that are already open:** type `/reload-plugins`.

**Example:** to get just the notification cards, run step 2 with only the third line, answer `y`, choose `user`, then `/reload-plugins`.

**Update later:** when this repository changes, run:

```
claude plugin marketplace update my-mods
claude plugin update my-notifications-mod@my-mods
```

Then `/reload-plugins` in open chats.

**Remove:** `claude plugin uninstall <mod>@my-mods`.

---

## 1. my-tools (Shafaaf's Tools menu)

**What it is:** a small orange **◆ Shafaaf's Tools ▲** pill. Click it and a menu opens with one row per mod and a button to run it. It is a home screen for the other mods, so you don't have to remember their commands.

**Where it shows:**
- Desktop app: on its own row, above the prompt box.
- Terminal: at the right end of the line under the prompt.

**How to use it:**

1. Click **◆ Shafaaf's Tools ▲** (or type `/tools`).
2. The menu opens:

   ```
   ◆ S H A F A A F ' S   T O O L S                 Shafaaf's Tools ▼
   ── M O D S
   ● All Mods                        ● Prompt Upgrade  better prompts  ● Daily Challenge  one a day
   ● Helper Desk  (subagents)        ● Cache Board  (All sessions)
   ```

   Three mods per row; in a narrow window a row wraps onto more lines, so nothing is cut off. This menu is **quick access** to the mods you use most. **All Mods** opens the Mods pane of Ben AI's `mods` plugin (the same as `/mods`): the full list of every mod you have, who made it, its commands, and On/Off. **Helper Desk** opens the side pane of Ben AI's `helper-desk` mod (the same as `/helpers`). Both are from his video [9 Insane Claude Mods](https://www.youtube.com/watch?v=bTqizdva04g) and aren't in this repo; install them from the `benai-mods` marketplace first, or the buttons do nothing.

3. Click a row to run that mod.
4. Click **Shafaaf's Tools ▼** (or `/tools` again) to close it.

**Commands:**

| Command | What it does |
|---|---|
| `/tools` | Opens or closes the menu |

**Options:** none.

**Adding a mod to the menu (for developers):** add a row to `MODS` in `mods/my-tools/hooks/register.tsx`, then a matching `case` in `runMod`.

---

## 2. prompt-upgrade

> Idea from Tristen O'Brien's video [5 MORE Claude Code MODS You Need](https://www.youtube.com/watch?v=aD-h7Bcn5OY) (he calls it Prompt master). More of his mods: [tristenobrien.ai](https://tristenobrien.ai/).

**What it is:** you write a rough prompt; it opens a side pane, asks you a few quick multiple-choice questions, then writes a stronger version you can send.

- **Short prompt (under 40 words):** it always asks **3** questions first (2 at least, 4 at most).
- **Detailed prompt (40+ words):** it asks up to 4 only if the answers would change the rewrite; otherwise it goes straight to the result.

**Example:**

- You type: `fix the login bug`
- It asks things like *"Which login? web or desktop?"* and *"What do you see when it fails?"* (each with one-click answers, **Other (type it)** or **Skip**).
- It returns a fuller prompt, shows **how many words** it went from and to, and lists **WHAT I ADDED**.

**How to use it:**

1. Type your rough prompt in the message box (don't send it).
2. Start it, either way:
   - Open **Shafaaf's Tools** and click **Prompt Upgrade**, or
   - Type `/prompt-upgrade fix the login bug`.
3. Answer the questions in the pane. Click **Skip the rest, upgrade now** if you're in a hurry.
4. Read the result, then pick one:
   - **▶ Run it**: puts the upgraded prompt in your message box. Press Enter to send it.
   - **Edit**: change it first, then **Save edits** (Enter saves, Shift+Enter adds a new line).
   - **Copy**: copies it to your clipboard.
   - **Cancel**: closes the pane, nothing changes.

**Commands:**

| Command | What it does |
|---|---|
| `/prompt-upgrade <rough prompt>` | Upgrades that prompt in a side pane |

**Options:** none. It uses the same Claude model as your chat.

---

## 3. my-notifications-mod

**What it is:** when you run several Claude chats at once, it's easy to miss one that is waiting for you. This mod puts a **card above the prompt in your other chats**, naming the chat that needs you, with **open** and **dismiss** buttons. There are no pop-up toasts.

**The three kinds of card:**

| Card | Shows when | Example |
|---|---|---|
| ⏳ needs you (magenta) | That chat has a **question** or a **permission prompt** open | `⏳ "Fix sign-in" needs you: a question` |
| ◐ cache cold (yellow) | A **big** chat (over 150k tokens) has been idle long enough that its prompt cache expires in 5 minutes or less | `◐ "Wiki refactor": 180k cache goes cold in 4m` |
| ✓ finished (green) | That chat **finished its turn** and is waiting for your reply | `✓ "Fix sign-in" finished 2m ago, your turn` |

Each chat shows at most one card (needs you, then cache cold, then finished). The first 3 cards show; more say `+N more`.

**The rules (what happens when):**

1. A chat **never** shows a card about itself. Cards appear in your *other* chats.
2. If you were **looking at** a chat when it finished, it makes **no** card. You already saw it.
3. A ✓ finished card **stays until you act on it**. There is no time limit, and visiting the chat from the sidebar does not clear it.
4. **dismiss** clears the card in **every** chat (within about 5 seconds).
5. **open** jumps straight to that chat **and** clears the card everywhere.
6. Chats check each other every **5 seconds**.

**How to use it (example):**

1. You have two chats: **"Fix sign-in"** and **"Docs"**. You ask "Fix sign-in" to do something, then switch to "Docs".
2. "Fix sign-in" finishes. Within about 5 seconds, "Docs" shows:

   ```
   ✓ "Fix sign-in" finished just now, your turn          open   dismiss
   ```

3. Click **open**: you land in "Fix sign-in" and the card is gone everywhere.
   Or click **dismiss** to clear it without switching.

**Commands and options:**

| Command | What it does | Default |
|---|---|---|
| `/notify` | Shows status: on/off, which cards are on, how many chats it watches, how many cards show | |
| `/notify on` / `/notify off` | Turns all cards on or off | on |
| `/notify finished on` / `off` | ✓ finished cards | on |
| `/notify cooling on` / `off` | ◐ cache cold cards | on |
| `/notify big 150k` | How big a chat must be for ◐ cards (`80k`, `1m`, ...) | `150k` |
| `/notify ttl 5` / `/notify ttl 60` | Your prompt-cache window in minutes, for ◐ timing | `60` |
| `/notify clear` | Dismisses every card showing now, in every chat | |

Settings are saved and apply to every chat.

**Examples:**

```
/notify finished off     # only "needs you" and "cache cold" cards from now on
/notify big 80k          # warn about smaller chats too
/notify clear            # clean slate
```

**Good to know:**

- **Chat names** come from the desktop app's sidebar title (the default "New session" is skipped). Without a title, the name is the folder plus your first message, like `bot-food-work · fix the login bug`.
- **open** only works in the **desktop app on macOS**. It runs `open "claude://code/continue?session=<id>"`. In the terminal, cards show "no link".
- In **Bypass permissions** mode there are no permission prompts, so ⏳ cards mostly mean a chat asked you a question.
- If you answer a question within about 5 seconds, its ⏳ card may never appear. That's expected.

**How it works (for developers):** each chat writes a small heartbeat (its name, state, and when it last finished, asked, or was looked at) to the mod's shared store, which every chat on the computer can read. Every 5 seconds each chat reads the others' heartbeats and draws cards. Dismissed cards are saved in the same store, which is why a dismiss reaches every chat. The code is in `mods/my-notifications-mod/hooks/register.tsx`.

---

## 4. daily-challenge

> Idea from Tristen O'Brien's video [5 MORE Claude Code MODS You Need](https://www.youtube.com/watch?v=aD-h7Bcn5OY) (he calls it Daily challenge). More of his mods: [tristenobrien.ai](https://tristenobrien.ai/).

**What it is:** a side pane that gives you **one small Claude Code exercise a day**, about 5 minutes each, no coding needed. There are **365** challenges and none ever repeat. It tracks how many you've done and your **streak**.

The challenges rotate through seven themes, so any 7 days in a row cover all of them:

| Theme | Example challenge |
|---|---|
| Prompting | **Say the goal first**: open your request with one sentence saying what the result is for |
| Files | **Summarise a PDF**: ask for a five-bullet summary with page numbers |
| Commands | **See your context**: type `/context` and note the biggest part |
| Memory | **Add one preference**: save one line about how you like answers |
| Agents | **Run two at once**: ask Claude to look into two questions in parallel |
| Build | **A countdown page**: have Claude make a web page counting down to a date |
| Habits | **Read the diff**: after an edit, type `/diff` and read it yourself |

**The pane:**

```
DAILY CHALLENGE                                          Thursday, Nov 19
━━━━━━━━━━━━━━━──────────────────────────────────────────────────────────
╭─────────────────────╮ ╭─────────────────────╮ ╭─────────────────────╮
│ DAY STREAK          │ │ COMPLETED           │ │ BEST STREAK         │
│ ╺━┓                 │ │ ╺━┓                 │ │ ╺━┓                 │
│ ┏━┛                 │ │ ┏━┛                 │ │ ┏━┛                 │
│ ┗━╸                 │ │ ┗━╸                 │ │ ┗━╸                 │
│ days in a row       │ │ of 365              │ │ days                │
╰─────────────────────╯ ╰─────────────────────╯ ╰─────────────────────╯

TODAY'S CHALLENGE ──────────────────────────────────── challenge 3 of 365
╭───────────────────────────────────────────────────────────────────────╮
│ ● COMMANDS                                                            │
│ Open the help                                                         │
│ Type /help and read the list. Pick one command you have never used    │
│ and ask Claude what it does.                                          │
╰───────────────────────────────────────────────────────────────────────╯
 ✓ Mark complete    Coach me through it    ↻ Give me another

LAST 14 DAYS ────────────────────────────────────────────────────────────
□   □   □   □   □   □   □   □   □   □   □   ■   ■   □
F   S   S   M   T   W   T   F   S   S   M   T   W   T

YOUR YEAR ────────────────────────────────────────────────────────── 0%
─────────────────────────────────────────────────────────────────────────
2 done  ·  363 to go  ·  none repeat
```

**How to use it:**

1. Open the pane, any of these ways:
   - Open **Shafaaf's Tools** and click **Daily Challenge**,
   - click **Daily challenge** at the right of the line under the prompt (terminal), or
   - type `/challenge`.
2. Read today's challenge in the gold card.
3. Pick one:
   - **Do it yourself**, in this chat or any other.
   - **Coach me through it**: closes the pane and puts a ready request in your message box. Press Enter and Claude walks you through it **one step at a time**, waiting for you after each step.
   - **↻ Give me another**: swaps it for a random one you've never done. The swap holds for the rest of the day.
4. When you're done, click **✓ Mark complete** (or type `/challenge done`). The card turns green, the streak goes up, and it says *A new one is waiting tomorrow.* Clicked by mistake? Click **Undo**.
5. Come back tomorrow for the next one.

**Example:** today's challenge is *"Open the help"*. You click **Coach me through it**, press Enter, and Claude says *"Step 1 of 3: type /help ..."*. You do each step, then click **✓ Mark complete**. Day streak shows 1.

**The rules (what happens when):**

1. Today's challenge is the **next one in order that you've never completed**. It isn't tied to the date.
2. **Miss a day?** The same challenge waits for you. Only the streak resets.
3. A completed challenge is **never offered again**, by the daily pick or by **Give me another**.
4. **One completion per day.**
5. **Day streak** = days in a row with a completion, ending today. Until you've done today's, it still counts through yesterday, so you don't lose it in the morning.
6. **Best streak** = your longest run ever.
7. Days follow your **local calendar** (midnight where you are).
8. After all 365, the pane shows **ALL 365 COMPLETE** instead of a challenge.

**Commands:**

| Command | What it does |
|---|---|
| `/challenge` | Opens the pane |
| `/challenge done` | Marks today's complete and replies with your streak and total |
| `/challenge another` | Swaps today's for a random one you've never done |

**Options:** none.

**Good to know:**

- Progress is saved in the mod's own store, so it **survives restarts** and is shared by every chat on this computer.
- Some challenges name a slash command or a key. Each one was checked on Claude Code 2.1.317. If one isn't on your version, ask Claude how to do it.
- The **Daily challenge** button under the prompt shows in the terminal. In the desktop app, use the Shafaaf's Tools row or `/challenge`.

**How it works (for developers):** the challenges are in `mods/daily-challenge/hooks/challenges.ts`, the rules (pick, swap, undo, streaks) in `hooks/logic.ts`, and the pane in `hooks/register.tsx`. Run the tests with `claude plugin test mods/daily-challenge`. They check 365 unique challenges, all 7 themes in any week, never repeating a completed one, streaks, the finished state, and every button.

---

## Works well with: Nate Herk's cache-keeper

**cache-keeper is not in this repo.** It is one of Nate Herk's Claude Code mods (he shares them as a zip), from his video [Claude Code Mods Are Game Changers](https://www.youtube.com/watch?v=9hetShMMp2s). This section explains it because it pairs with my-notifications-mod: cache-keeper watches the cost of **the chat you're in**, and my-notifications-mod watches **your other chats**.

### What the "prompt cache" is, in plain words

1. Every time you send a message, Claude re-reads **the whole chat**, not just your new message.
2. To make that cheap, the chat is kept in a **prompt cache** for a while (here: **60 minutes** after the last message).
3. **Cache warm:** re-reading comes from the cache, at about 1/20 of the normal price.
4. **Cache cold:** after 60 minutes of silence the cache expires. The next message has to **rebuild** it, at about **2×** the normal price.
5. Going cold does **not** add tokens. The same tokens are sent. Only the **price per token** changes.

**Example** (a 400k-token chat on Opus 5.5, Claude API prices):

| What happens | Price per million tokens | Cost to re-read 400k |
|---|---|---|
| Cache warm (read) | $0.20 | ≈ $0.08 |
| Cache cold (rebuild into a 1-hour cache) | $8.00 | ≈ $3.20 |

So one cold message costs about 40× a warm one. Bigger chats pay a bigger penalty: a 50k chat rebuilds for about $0.40.

On a subscription you aren't billed these dollars directly, but big rebuilds still use up your plan limits faster.

### The line above your prompt

```
● cache warm 60m | ctx 39% | rewrite ≈ $3.15 | 5h 15% · week 93% | session $24      [H] handoff
```

| Part | Meaning |
|---|---|
| `● cache warm 60m` | Minutes until the cache expires. **◐ yellow** in the last 5 minutes, **○ red** once cold |
| `ctx 39%` | How full the context window is |
| `rewrite ≈ $3.15` | What your next message would cost if the cache went cold |
| `5h 15% · week 93%` | Your plan limits used. Yellow above 80%, red above 95% |
| `session $24` | What this chat has cost so far, at API prices |
| `handoff` | Summarize this chat and continue in a fresh, small one |

After `/reload-plugins` the line hides until your next message. That's normal.

### How to use it, step by step

1. **Before you step away**, glance at the line. Is `ctx` big? Will you be gone close to an hour?
2. **Back within the hour?** Do nothing. Any message restarts the 60-minute timer.
3. **Away longer, and you want this chat?** Type `/keepwarm 3` (hours, 1 to 24). About 8 minutes before the cache would expire, cache-keeper sends a tiny ping that keeps it warm. The line shows `◆ kept warm · 2 pings $0.16 · until 6:30 PM`. It stops at that time, or with `/keepwarm off`.
4. **Chat getting huge?** Click **handoff** (or press **H**). It writes a summary, then offers **Clear and continue**: a fresh chat that starts from the summary only. A 10k chat is far cheaper per message than a 400k one.
5. **Sending to a chat that already went cold?** For chats over 150k, cache-keeper **asks first**: send anyway (pay the rebuild once) or cancel. This is the **cold-send guard**.
6. **Running several chats?** Type `/board` for one pane with every chat: state, context, cache time left, cost, and a **keep warm** button per chat.

**Example:** you're at 380k and leaving for a 2-hour meeting.
- `/keepwarm 3`: a few pings cost cents and you come back warm.
- Or **handoff**, then **Clear and continue**: you come back to a small, cheap chat.
- Doing nothing: your first message after the meeting costs about $3 extra.

### What happens when a chat you're NOT in is about to go cold

1. **About 5 minutes before** (big chats only, over 150k):
   - cache-keeper pops a toast in your other chats: *"…: 180k-token cache goes cold in 5m … open /board to keep it warm."*
   - my-notifications-mod shows a card: `◐ "<chat>": 180k cache goes cold in 4m   open   dismiss`
2. **Choose:**
   - **Keep it:** click **open** and send a short message, or press **keep warm** on its row in `/board`.
   - **Let it go:** do nothing. Fine if you're done with that chat.
3. **At 0 minutes:** the cache expires. **No charge** yet.
4. **Later:** you pay the rebuild **once**, only when that chat runs again. If you never go back, you never pay.

**Catch:** a chat can wake up by itself (a background command finishing, a side session reporting back, a scheduled check). That wake-up is a request too and pays the rebuild. The cold-send guard only stops messages you type.

### Why keep-warm isn't automatic

Each ping is a cache read, about $0.08 per hour at 400k:

| 400k chat | Keep warm 24 h | Let it go cold, come back once |
|---|---|---|
| You do come back | ≈ $1.90 | ≈ $3.20 |
| You never come back | ≈ $1.90 wasted | $0 |

Keeping every chat warm forever would spend money on chats you've left behind, so keep-warm is something you turn on, for a set number of hours.

### Settings (`/cache`)

| Command | What it does | Default |
|---|---|---|
| `/cache` | Status: context, cache window, warm time left, plan limits, cost | |
| `/cache ttl auto` / `60` / `5` | The cache window. `auto` learns it from what actually happens | `auto` (starts at 60) |
| `/cache guard on` / `off` | The ask-before-cold-send question | on |
| `/cache big 150k` | How big a chat must be for the guard and alerts | `150k` |
| `/cache alerts on` / `off` | The "goes cold in 5m" toasts | on |
| `/keepwarm 3` / `/keepwarm off` | Keep this chat warm for N hours (max 24), or stop | |
| `/board` | All chats in one pane | |

**Tip:** leave `/cache ttl` on `auto`. Setting `5` when your chats really use a 60-minute cache makes every chat say "cools in 5m" for no reason.

**Local changes:** in this setup, cache-keeper has two small edits: `ctx` shows a **percentage** instead of a token count (Nate's shows `ctx 393k`), and `/board` names each chat by its **sidebar title** instead of the folder name. Shafaaf's Tools has a **Cache Board** row that opens `/board`. The changes and how to re-apply them are in [`mods/nate-herk-changes/`](mods/nate-herk-changes/CHANGES.md).

---

## Developing these mods

A new mod goes in `mods/<name>/`, with a matching entry in `.claude-plugin/marketplace.json` (`"source": "./mods/<name>"`).


1. The code lives in one folder per mod: `mods/<mod>/hooks/register.tsx` (the main file) and `mods/<mod>/.claude-plugin/plugin.json` (name and version).
2. After a change, **bump `version`** in `plugin.json`. Claude Code only reinstalls when the version changes.
3. Check it: `claude plugin validate mods/<mod>`, then run its tests with `claude plugin test mods/<mod>`.
4. Install it from your local copy:

   ```
   claude plugin marketplace update my-mods
   claude plugin update <mod>@my-mods
   ```

5. `/reload-plugins` in open chats to load the new version.

# Daily Challenge

**What it is:** a side pane that gives you **one small Claude Code exercise a day**. Each takes about 5 minutes and needs no coding. There are **365** challenges and none ever repeat. The pane tracks how many you've done and your **streak**.

There are seven themes: **Prompting, Files, Commands, Memory, Agents, Build, Habits**. They're dealt in turn, so any 7 days in a row cover all of them.

## How to use it

1. Open the pane, any of these ways:
   - Open **Shafaaf's Tools** and click **Open today's challenge**.
   - In the terminal, click **Daily challenge** at the right of the line under the prompt.
   - Type `/challenge`.
2. Read today's challenge in the gold card.
3. Pick one:
   - **Do it yourself**, in this chat or any other.
   - **Coach me through it**: this closes the pane and puts a ready request in your message box. Press Enter, and Claude walks you through it **one step at a time**, waiting for you after each step.
   - **↻ Give me another**: this swaps it for a random challenge you've never done. The swap holds for the rest of the day.
4. When you're done, click **✓ Mark complete** or type `/challenge done`. The card turns green, the streak goes up, and the pane says *A new one is waiting tomorrow.* If you clicked by mistake, click **Undo**.
5. Come back tomorrow for the next one.

**Example:** today's challenge is *"Open the help"*. You click **Coach me through it**, then press Enter. Claude says *"Step 1 of 3: type /help ..."*. You do each step, then click **✓ Mark complete**. Day streak shows 1.

## The rules

1. Today's challenge is the **next one in order that you've never completed**. It isn't tied to the date.
2. **If you miss a day**, the same challenge waits for you. Only the streak resets.
3. A completed challenge is **never offered again**, either as the daily pick or by **Give me another**.
4. You can complete **one challenge per day**.
5. **Day streak** is the number of days in a row with a completion, ending today. Until you've done today's, it still counts through yesterday, so you don't lose it in the morning.
6. **Best streak** is your longest run ever.
7. Days follow your **local calendar**, so a new day starts at your midnight.
8. After all 365, the pane shows **ALL 365 COMPLETE** instead of a challenge.

## Commands

| Command | What it does |
|---|---|
| `/challenge` | Opens the pane |
| `/challenge done` | Marks today's challenge complete and replies with your streak and total |
| `/challenge another` | Swaps today's challenge for a random one you've never done |

**Options:** none.

## Good to know

- Progress is saved in the mod's own store. It **survives restarts**, and every chat on this computer shares it.
- Some challenges name a slash command or a key. Each one was checked on Claude Code 2.1.317. If one isn't on your version, ask Claude how to do it.
- The **Daily challenge** button under the prompt shows in the terminal. In the desktop app, use the Shafaaf's Tools row or `/challenge`.

## Install

```bash
claude plugin marketplace update my-mods
claude plugin install daily-challenge@my-mods
```

Then type `/reload-plugins` in any chat that is already open.

## For developers

- **Where things are:**
  - `hooks/challenges.ts` holds the 365 challenges and their themes.
  - `hooks/logic.ts` holds the rules: today's pick, the swap, undo and streaks.
  - `hooks/register.tsx` holds the pane, the `/challenge` command and the status bar button.
- **Tests:** run `claude plugin test ~/.agents/mods/daily-challenge`. They check:
  - exactly 365 challenges, with no repeated titles or tasks
  - all 7 themes in any 7 days in a row
  - a completed challenge is never offered again
  - streaks across several days
  - the finished screen
  - every button in the pane
- **Opening the pane:** call `$.ui.open` before any other `await` in a command or button press. If it runs later, or from a timer, Claude Code treats the open as unrequested and doesn't show the pane in windows narrower than 144 columns.

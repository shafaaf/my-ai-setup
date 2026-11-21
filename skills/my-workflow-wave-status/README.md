# wave-status

A pane beside the chat that shows the current `/my-workflow-wave` at a glance, so you don't have to ask "where are we?".

It reads this session's own `~/Desktop/bot-food-work/worktrees/<task>/WAVE-STATUS.json` (the one listing this session in `sessionIds`, or the task folder the session works in; never another session's wave) (the wave coordinator rewrites it whenever something changes) every 20 seconds. Every 2 minutes it also asks `gh` for each PR's state and checks.

At the top it lists each ticket on its own row; click one to open it in Chrome.

The pane shows one row per child session, with these columns:
- session name
- stage
- PR link
- PR state (📝 draft / 👀 ready / merged) and live CI (✅ passed / ⏳ running / 🔴 failed)
- review round
- 🔴/🟠/🟡 findings
- summary: 2-3 short, plain sentences on where it stands (code done? tested? reviewed? PR stuck, merged, or waiting for a release?). The coordinator writes it; without one the pane builds a short one from the other columns.

Under the table it lists any red flags and what happens next.

Open it with `/my-workflow-wave-status`. It also opens itself when this session's wave exists at session start, or as soon as this session's wave first writes its file.

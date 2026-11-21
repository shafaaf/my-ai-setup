---
name: my-workflow-wave-status
description: "Show where the current /my-workflow-wave is: one row per child session with stage, PR link, draft/ready state and CI, review round, red/orange/yellow findings, notes, plus red flags and the next step. Use when the user runs /my-workflow-wave-status or asks where a running wave is at."
disable-model-invocation: true
---

# Wave status

Shows the running `/my-workflow-wave` at a glance. The data comes from `~/Desktop/bot-food-work/worktrees/<task>/WAVE-STATUS.json`, which the wave coordinator rewrites whenever something changes (see my-workflow-wave's "Wave status file"), plus live PR state and CI from `gh`. Each session's pane shows only its own wave: the one whose `sessionIds` lists this session (the coordinator), or whose `worktrees/<task>/` folder the session works in (its child sessions). Other sessions' waves never show.

- **Claude Code:** this folder is also a Claude plugin, loaded automatically through the `~/.claude/skills/my-workflow-wave-status` link (do not also list it in `CLAUDE_CODE_PLUGIN_DIRS`: the second copy fails to load). `/my-workflow-wave-status` opens the live "Wave status" pane, which refreshes by itself. Do not run `status.py` or repeat the table in chat: reply in one line that the pane is open beside the chat. Run the script only if the user says the pane did not appear, or asks for the status as text.
- **Codex (ChatGPT), or Claude when the user says the pane did not appear:** (in Codex, call this skill with `$my-workflow-wave-status`) run `python3 ~/.agents/skills/my-workflow-wave-status/scripts/status.py` and show its Markdown output to the user as it is. Pass a task folder name (e.g. `BOTFOOD-4236`) to pick a wave; with no argument it uses the most recently updated one.

Edit this one folder only; Claude and Codex both read it from here.

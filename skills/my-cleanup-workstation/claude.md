# Cleanup workstation — Claude Code

- **Sessions in use:** `list_sessions` (desktop app) and `ListAgents`. Every session reports the workspace root as its cwd, so match a session to its worktree by the ticket, task folder or branch name in its title or recent messages; a session still open (even idle or paused) means *keep*. When you can't tell which worktree an open session works in, every worktree it might be in is *Keep (unclear session)*, never Finished.
- **Jira status:** the atlassian MCP `getJiraIssue` with the cloudId from `SKILL.md`; pass `fields: ["status"]` and `fieldsByKeys: true` to keep the answer short.
- **Step 2 question:** one `AskUserQuestion` call with up to four questions, one per non-empty group: Finished, Idle, Leftover (each `multiSelect: true`) and the Docker choice. It takes at most 4 options per question, so a group of 1–3 rows gets one option per row (label `#<n> <task>/<repo>`); a bigger group gets "All N <group>", "Pick by number" (the user types the row numbers under Other) and "None".
- **Docker:** after the prune, tell sessions with a stopped stack with `SendMessage` what happened; after a disk-full reset, tell every session that uses Docker.

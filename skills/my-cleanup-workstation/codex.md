# Cleanup workstation — Codex

- **Sessions in use:** Codex can't list Claude Code sessions. Rely on the scan's `in_use` column, and before removing any worktree ask the user whether a Claude or Codex session is still working in it.
- **Jira status:** use the Atlassian MCP if this Codex has it configured; otherwise list the tickets and ask the user for their status.
- **Step 2 question:** ask in chat with a numbered list of removable rows (finished, idle or leftover) and the Docker choice; the user replies with the numbers to remove.
- **Docker:** after the prune or a disk-full reset, tell the user which sessions use Docker, so they can bring those stacks back up.

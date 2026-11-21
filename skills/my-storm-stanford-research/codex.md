# Storm research — Codex

- **Topic:** take it from the user's message.
- **Research agents:** with the collaboration API, use `collaboration.spawn_agent`, `send_message` and `wait_agent`: five lens subagents, queued within the available slots. Don't assume Claude's `Agent`, `general-purpose` or `Write` tools exist.
- **No collaboration API:** run the five lenses and a separate skeptical verification pass one after another, and say that verification was done by the same agent.
- **Files:** use the session's file-editing tools. Resolve `assets/report-template.html` relative to this skill folder.
- `agents/openai.yaml` holds the Codex display name and default prompt.

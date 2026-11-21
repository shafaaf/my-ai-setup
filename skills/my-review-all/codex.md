# Review all — Codex

- **Arguments:** take `report` and any `BOTFOOD-NNNN` keys from the user's message; `$ARGUMENTS` is not filled in.
- **The plugin's skills:** the `botfood` plugin is a Claude Code plugin, so Codex can't invoke `botfood:pr-review` or `auto-review` by name. Read them by path instead: the scan's last line names `auto-review`'s SKILL.md, and `pr-review`'s is `../pr-review/SKILL.md` beside it. Wherever they say "invoke the `botfood:pr-review` skill", read and follow that file. Where they mention `CLAUDE.md`, read the repo's `AGENTS.md` too.
- **Fresh reviewers:** start one `codex exec` per repo in the background, all at once, so each is a new process with no memory of writing the code:

  ```bash
  codex exec -C <repo worktree> -o <scratch>/<repo>-round<N>.md --ephemeral \
    "Read and follow <pr-review SKILL.md path> with the arguments <START> <TICKETS>. <section 2a's extra lines>. Do not edit, stage or commit anything. Return the complete review output verbatim, and nothing else." &
  ```

  Then `wait`, and read each `-o` file as that repo's review. If `codex exec` fails, review in this session and say in the report that the reviews were not independent.
- **Stop-and-ask:** ask in chat, one numbered question per repo that needs it, and wait for the answer.

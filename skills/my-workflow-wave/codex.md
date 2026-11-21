# Ship a wave — Codex

- **Arguments:** take the task name or `BOTFOOD-NNNN` and the plan file from the user's message; `$ARGUMENTS` is not filled in. With no plan file named, use the plan approved in this conversation and write it to `~/Desktop/bot-food-work/worktrees/<task>/PLAN.md`. Never start without one.
- **Plan for the children:** they read `worktrees/<task>/PLAN.md`. Keep it current: every contract answer goes into it.
- **Child sessions:** one background `codex exec` per repo, all started at once:

  ```bash
  codex exec -C ~/Desktop/bot-food-work/worktrees/<task>/<repo> \
    -o ~/Desktop/bot-food-work/worktrees/<task>/<repo>.last.md \
    "<the brief from step 3>" > ~/Desktop/bot-food-work/worktrees/<task>/<repo>.log 2>&1 &
  ```

  Record each child's session id (the log's first lines) in `PLAN.md`.
- **Messaging children:** a `codex exec` child can't receive messages while it runs, so add to its brief: "If you need to deviate from the contract, write the question to `worktrees/<task>/QUESTIONS.md`, then stop." When a child stops, read its `-o` file and `QUESTIONS.md`, answer by updating `PLAN.md`, and continue the child with `codex exec resume <session id> "<answer, and what to do next>"`. Send each review round's findings (step 4) the same way.
- **CI and review comments** (Codex has no Auto-fix): the child's brief ends at opening the PR. The coordinator watches each PR with `gh pr checks <n>` and `gh pr view <n> --comments`, and resumes that repo's child to fix a failure or answer a comment.
- **Review:** step 4's `/my-review-all` is the shared `my-review-all` skill (start it with `$my-review-all <TICKET>`); follow its `codex.md`.
- **Archiving children:** a `codex exec` child has already exited, so there's no session to archive. Mark each child "archived" next to its session id in `PLAN.md` instead.
- **Jira:** use the Atlassian MCP. For step 0 (assign, active sprint, In Progress), follow the same calls as `claude.md`'s Jira line.
- **Jira comment (step 7):** use the Atlassian MCP's `addOrEditJiraIssueComment` on each ticket in scope only, the same way as `claude.md`.
- **Review rounds (step 4, one reviewer per round):** a normal round is a fresh `$my-review-all` reviewer. For a risky PR's other-model round, the other model is **Claude**: run it read-only, e.g. `claude -p "Review the changes in <worktree> against origin/main with the botfood:pr-review skill; report 🔴/🟠/🟡 only; do not edit"`.
- **Skills in steps 3 and 7:** `tdd`, `diagnosing-bugs` and `resolving-merge-conflicts` are shared in `~/.agents/skills`; call them as `$tdd`, `$diagnosing-bugs`, `$resolving-merge-conflicts`. For the spec comment (step 0c), read `~/.agents/skills/to-spec/SKILL.md` for its layout.

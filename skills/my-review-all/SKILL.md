---
name: my-review-all
description: Run the botfood plugin's review-and-fix loop across every repo this session changed, together. `/my-review-all report` reviews without fixing. Use when the user asks for my-review-all, or when an approved plan or the user's instructions say to run it (e.g. "my-review-all before opening PRs"); do not start it on your own initiative otherwise.
argument-hint: "[report] [BOTFOOD-NNNN ...]"
disable-model-invocation: true
---

# Review all

Runs the `botfood` plugin's review across every changed repo in this session's **task folder** at once. The plugin's skills own the review bar and the loop; this skill finds the repos and runs them side by side, so each repo's reviewer reads the sibling worktrees as the other side of its contracts.

Arguments: `$ARGUMENTS`. `report` means review only. Any `BOTFOOD-NNNN` keys are the tickets in scope.

This skill runs in Claude Code and Codex. Read the note for your tool before step 1: `claude.md` in Claude Code, `codex.md` in Codex. It maps the fresh reviewers, the `pr-review` call and the stop-and-ask question to your tool.

## 1. Find the task folder

The task folder is the `worktrees/<task>/` directory this session has been working in, holding one git worktree per repo (e.g. `~/Desktop/bot-food-work/worktrees/BOTFOOD-3363/`). Take it from the paths this conversation has used. Done when you hold one absolute path; when the conversation points at several or none, ask once which one.

## 2. Scan it

Run `~/.agents/skills/my-review-all/scripts/scan.sh <task folder>`. It fetches each repo, prints one line per repo (`changed|clean`, path, branch, base SHA, commits ahead, uncommitted files, ticket keys), and a last line naming the installed plugin's `auto-review` SKILL.md.

- **Changed repos** are the `changed` lines. None: say so and stop.
- **Tickets** are the keys in the arguments when given; otherwise every `BOTFOOD-N` key this conversation worked on, plus the scan's. The first is the **primary ticket**. None found: run without one and say so in the report.

Tell the user the changed repos and the tickets in one line each, then carry on.

## 3. Run the loop

Read the `auto-review` SKILL.md the scan named and follow it for every changed repo in lockstep: each round covers all of them. Where it speaks of one repo, apply it to each:

- **Set up** each repo as its section 1 says, with the scan's base SHA as `START` when the repo has commits ahead, and uncommitted mode otherwise. Gather every repo that needs its stop-and-ask into one question.
- **Review** with one fresh reviewer per repo (your tool note says how), all running in parallel. Each gets section 2a's brief for its repo, plus:
  > Other tickets in scope: `<the rest>`. Read each one and check the change against it exactly as you do the primary ticket. Sibling worktrees in this change: `<path (branch)>` for each other changed repo. Read them as the other side of any contract, alongside `origin/main`.
- **Fix, gate and commit** each repo as sections 2c–2e say. A finding that spans repos is fixed in the repo its `file:line` names.
- A repo whose review has no 🔴/🟠/🟡 is **done** and leaves later rounds. The loop ends when every repo is done, or at round 5 under its cap rule.
- **`report` mode** runs round 1's reviews and goes straight to the report.

## 4. Report

One combined report, in `auto-review`'s section 4 shape:

1. One outcome line per repo.
2. **Between repos:** every finding that involves two repos.
3. Each repo's own sections under its name. In `report` mode, each repo's review output instead.

---
name: my-workflow-wave
description: "Ship an approved multi-repo plan end to end without blocking on the user: confirm the ticket(s) in scope are assigned to the user and In Progress, write the plan as an easy-explain Obsidian note, pull main in every repo, fresh worktrees, fewest PRs, parallel child sessions, /my-review-all on the ticket, PRs with Auto-fix, merge on green, monitor until everything is on ralhf-dev, comment on the Jira ticket(s), then stop for the user's tests and QA. Use when the user asks to ship/run a wave or an approved plan says to; never on your own initiative."
argument-hint: "<task-name or BOTFOOD-NNNN> [plan file]"
disable-model-invocation: true
---

# Ship a wave

Arguments: `$ARGUMENTS`. The first BOTFOOD key is the ticket (if there is none, see below). The task name names the worktree folder. The plan is the approved plan file (default: this session's plan file).

Only start after the user has approved the plan. Stop and ask if there is none.

**Don't block.** After plan approval, run every step through to the hand-over without waiting for the user. When a decision comes up, make the sensible call, record it in the plan, and tell the user in one line, rather than asking. Share screenshots and progress as you go; they never gate a step. The only stops are plan approval at the start and the hand-over at the end (step 8).

## Wave status file
Keep `~/Desktop/bot-food-work/worktrees/<task>/WAVE-STATUS.json` current from step 1 to the hand-over; the user's `/my-workflow-wave-status` pane (and its Codex script) reads it (and checks each PR's CI itself). Each session's pane shows only its own wave: put your session id (`echo $CLAUDE_CODE_SESSION_ID`; leave `sessionIds` out in Codex, which has no pane) in `sessionIds` when you first write the file, and keep it on every rewrite. Child sessions working inside `worktrees/<task>/` see the wave without being listed. Rewrite it whenever something changes: a child starts or reports, a PR opens, a review round ends, CI fails, a merge or deploy happens, or a red flag appears. Shape:

```json
{ "sessionIds": ["<coordinator's CLAUDE_CODE_SESSION_ID>"],
  "ticket": "BOTFOOD-1234", "stage": "4. Review round 1", "updatedAt": "<ISO time>",
  "summary": "<2-3 short plain sentences on the whole wave>", "percent": 60,
  "repos": [ { "name": "<child name>", "repo": "web", "stage": "PR open, fixing round-1 findings",
               "pr": "<url>", "prNumber": 123, "repoSlug": "botfoodai/web",
               "risky": true, "reviewRound": 2, "reviewModels": ["Claude", "Codex"],
               "red": 1, "orange": 0, "yellow": 2,
               "openFindings": [ { "level": "red", "title": "<one-line title>" } ],
               "ciNote": "<only while CI is red: what fails and why, one line>",
               "summary": "<2-3 short plain sentences>" } ],
  "flags": ["<red flag, e.g. CI failing for a non-flake reason, Docker read-only, a child blocked>"],
  "next": ["<next step>", "<next step, e.g. wave 2: ...>"] }
```

`summary` is what the user reads first: 2-3 short sentences in easy words saying where that piece stands: is the code done, has it been tested, has the independent review run, and is the PR stuck, merged or waiting for a release. No paths, worktrees or SHAs. Example: "Code done and tested. Review round 3 passed. PR waits on one last test before merge." The top-level `summary` is the same idea for the whole wave, shown at the top of the pane with `percent` (0-100, how much of the whole wave is done, counting what is left: reviews, merges, releases, QA, later waves). Example: "3 of 4 pieces are merged and 2 are on DEV. The last desktop PR waits on one test, then 4702 still needs its PR. Paused for the night." For each repo, `risky` marks a risky PR (see step 4), `reviewModels` names the model that ran each round in order (the pane shows "Claude r1 → Codex r2"), and `openFindings` lists every 🔴/🟠 still open as `{ "level": "red" | "orange", "title": "<one line>" }`. Update all three after every review round and drop a finding once it's fixed; 🟡 stay as a count only. The pane's **Local review** column shows these, and its **CI/CD** column reads each PR's checks from GitHub itself (green, running, or red with the failing check names). When CI goes red, write `ciNote` as soon as you know why (e.g. "Windows BDD fails at app launch, 3 runs in a row; passed on 5 earlier commits"), and remove it once CI is green again. `next` is the list of next steps, shown under the red flags; name a planned next wave there. Put several tickets in `ticket` as comma-separated keys; the pane shows each as its own link.

## 0. Tickets in scope
Work only with the ticket(s) this wave is for: the BOTFOOD keys in the arguments, the plan or the conversation. Never scan, change or report other tickets on the board; the user may have tickets there they aren't working on.
1. Name the ticket(s) in scope in one line before step 1.
2. If the work has no ticket at all, create one in Jira project BOTFOOD from the plan (short summary, the plan's context as the description) and use its key.
3. For each ticket in scope: assign it to the user (the signed-in Jira account) unless someone else is assigned (then leave it and say so); put it in the active sprint unless it's already there; move it to **In Progress** unless it's already In Progress or later (In Review, IN QA, Done).
4. Tell the user in one line per ticket: key, assignee, sprint, status. If a step is refused, say so and carry on.

## 0b. Plan note in Obsidian
Before step 1, write the approved plan as a note at the root of the Obsidian vault, `~/Desktop/bot-food-work/my-notes/`.
- **Name:** the ticket key first, then the task name: `<TICKET> - <task name>` (e.g. `BOTFOOD-4703 - Ian WhatsApp re-add sign-in`). For the task name use this session's title (in Claude Code, `mcp__ccd_session_mgmt__get_session` with `"self"`; in Codex, the task name) without a ticket key it already starts with, with the characters Obsidian refuses in note names (`: * " \ / < > | ?`) replaced by `-`. If a note with that name exists, it's the user's: read it and update it in place, and keep anything the user added.
- **Audience and style (e-e):** explain the plan in the user's easy-explain style: simple language, summarized with context, with examples, before and after if applicable, relevant diagrams if needed with numbers, numbered step by steps, as if explaining to a new SDE on this project. Give a concrete example for every change.
- **Sections, in order:**
  1. a dated header line (written date, the `main` SHA it was read from, the ticket links) and a one-line **Status**;
  2. **At a glance:** a table with one column per ticket and rows for context, the bug or need in simple words, example, before, after, repo, main files, risk and review, and who decides;
  3. **How they fit together:** a diagram with numbered steps showing order and dependencies, followed by numbered steps explaining it;
  4. **PR plan:** a table with PR, tickets, repo and worktree, depends on, and review;
  5. **Per-ticket plan:** for each one, the change as numbered steps, before and after with an example, done when, tests, docs, and security review where the files are vault-sensitive;
  6. **Open decisions:** a table with question, who decides, and what it blocks;
  7. **Out of scope.**
- **Format to copy:** `example-plan-note.md` in this skill's folder is a note the user approved (2026-11-16). Copy its layout and level of detail, not its content. Don't add an H1 title, because Obsidian shows the note name as the title.
- Use tables and fenced code-block diagrams that render in Obsidian: every table starts with a non-empty header cell, and every diagram keeps its line breaks.
- Tell the user the note's path in one line. Keep its **Status** line current at each later step, and add the PRs, merge SHAs and DEV versions at the hand-over (step 8).

This skill runs in Claude Code and Codex. Read the note for your tool before step 1: `claude.md` in Claude Code, `codex.md` in Codex. It maps the plan file, the child sessions, messaging them and Auto-fix to your tool.

## 0c. Spec comment on Jira
After the plan is approved and before building starts, post one comment on each ticket in scope saying what we're building. Use `to-spec`'s spec layout if you can read it (`~/.agents/skills/to-spec/SKILL.md`), synthesized from the ticket and everything discussed with the user, with no new interview. Write it in the user's easy-explain style:

> Simple language, summarized with context, with examples, before and after if applicable, relevant diagrams if needed with numbers, numbered step by steps, as if explaining to a new SDE on this project.

Keep it short: **Summary**, **Before and after** (with a concrete example), **What we'll change** (numbered steps, one per repo or PR), **Out of scope**. Use `addOrEditJiraIssueComment` (markdown). Don't change the ticket's status here. Tell the user in one line, with the link.

## 1. Fresh code
1. In `~/Desktop/bot-food-work/ralhf-app`, pull `main` in **every** BotFood repo (ff-only), always including `universal-extractor`, even when the plan doesn't touch it. Never stash or reset someone's work; report a dirty checkout instead.
2. Create `~/Desktop/bot-food-work/worktrees/<task>/<repo>` from `origin/main` on branch `codex/<task-slug>`, one per repo the plan touches.
   Use absolute paths with `git -C <repo> worktree add <abs-path>`: a relative path resolves against the repo, not your cwd.
3. Install deps (web `npm ci`; desktop `NODE_AUTH_TOKEN=$(gh auth token) npm ci`, because the private `@botfoodai/panda` package needs it; CEA `uv sync`). Skip baseline test runs.

## 2. Fewest PRs
One PR per repo, never more, unless the user said otherwise. **Squash rule:** each PR is one squashed commit on its branch. Squash all work-in-progress into that one commit before every push, and force-push with `--force-with-lease` when the branch already has commits. Describe the separate concerns in the PR description's "What changed" list, not as separate commits. The PR is squash-merged (step 5), so it lands on `main` as one commit and reverts as one. Write a cross-repo contract (field names, triggers, flags, capability gates) into the plan before building, so the repos can be built in parallel.

## 3. Build in parallel child sessions
Start one child session per repo, the way your tool note says. Copy the plan to where your tool note says the children can read it, and point each brief at it. Each brief says to:
- work only in its worktree and touch no other folder;
- write tests first with the `tdd` skill (red, green, refactor), each failing on the old code (prove it), at the layer the repo's guidelines name;
- when CI goes red or a bug shows up, use the `diagnosing-bugs` skill to find the root cause before changing code; never re-run a real failure as a flake;
- when a rebase on `origin/main` hits conflicts, use the `resolving-merge-conflicts` skill;
- not break existing behaviour: run the repo's full local gates (web: format, build, lint, test:unit and affected Playwright; desktop: typecheck, build and unit tests, while BDD runs only in PR CI; CEA: black, flake8, mypy, the non-pipeline suite and the pipeline E2E);
- update the owning docs/PRD when behaviour changes;
- squash its work into one commit, rebase on `origin/main`, push and open the PR **as a draft** (`gh pr create --draft`) titled `<TICKET>: …`, with the description written as in "PR descriptions" below, plus the attribution line. Every later fix (review rounds, CI, comments) is squashed into that same commit and force-pushed with `--force-with-lease`;
- keep its PR's CI and review comments handled, the way your tool note says;
- never merge, never `gh --auto`, no Jira changes, no prod;
- never weaken, skip or platform-gate a failing test to get green (see "Never weaken a test" in the rules); ask the coordinator before changing an existing BDD scenario;
- message the coordinator before deviating from the contract.

Answer the children's contract questions quickly, update the plan file, and tell every child that's affected. Children don't wake on green CI, so the coordinator watches CI.

### PR descriptions
Every PR description is written for a new engineer on the project, in the /my-easy-explain style: easy language, summarized, with concrete examples. Sections in this order:
1. **Summary:** two or three plain sentences on what changed and why, with the ticket key.
2. **What changed:** a numbered list, one item per concern, each with a concrete example (a request and its response, a field value, or what a user clicks and sees).
3. **Before and after:** for each behaviour change, what happened before and what happens now.
4. **Screenshots:** for any UI/UX change, a before and an after screenshot of each changed screen, each with a one-line caption. Take them from the local build or the dev preview (never opening visible windows on the user's screen), commit them under `docs/qa/screenshots/<TICKET>/` where that's the repo's convention, and embed them with commit-SHA links. If a screenshot can't be taken, say why.
5. **Scenarios:** a table of every case (scenario → what the user sees or what the system does → when), whenever there's more than one case.
6. **AWS architecture:** what changes in infrastructure (services, queues, buckets, IAM, alarms), or "None".
7. **Database migrations:** each migration file, the tables and columns it adds or changes, whether it backfills, and whether it's safe to roll back; or "No database schema changes or migrations".
8. **API changes:** each endpoint, field or enum added, changed or removed, with an example request/response, and how older clients stay compatible; or "None".
9. **Deploy order and risks:** which repo must deploy first, any feature flag, and anything on-call should know for prod.
10. **How to test:** the automated tests added, and a numbered "how to see it on ralhf-dev" list.
11. **Follow-ups:** anything left out on purpose.

Sections 6–8 are always present, even when the answer is "None".

## 4. Review
**Draft first:** every PR stays a draft while it's reviewed. CI, desktop BDD and Auto-fix run on the draft and screenshots get their commit links, but reviewers aren't pinged with unreviewed code. Code changes from review are normal: the child squashes each fix into the PR's one commit and force-pushes, CI re-runs, and the next round reviews the new commit (re-point any commit-SHA screenshot links).

Once every repo has its commits (pushed or local), run `/my-review-all <TICKET>` across the task folder: a fresh independent reviewer per repo. **One round = one reviewer**; never two reviewers in the same round. After each round the child fixes every 🔴 and 🟠 and any cheap 🟡; other 🟡 go under the PR's Follow-ups (tell the user in one line). Rounds per repo (this replaces `/my-review-all`'s own cap):

**Same model** is the tool running this wave; **other model** is the other one:

| Running in | Same model | Other model | How the other model runs (review-only, no edits) |
| --- | --- | --- | --- |
| Claude Code | Claude | Codex | the `codex:codex-rescue` agent; use its adversarial/design-challenge mode for contracts |
| Codex | Codex | Claude | `claude -p` with the `botfood:pr-review` skill (see `codex.md`) |

| PR | Round 1 | Round 2 | More rounds |
| --- | --- | --- | --- |
| Normal | Same model | Only if round 1 found a 🔴: same model on the fix. No 🔴 → stop | Only while a 🔴 is still open, same model |
| **Risky**: security-sensitive files (vault, sign-in probe, auth), a cross-repo contract or API, a database migration, billing | Same model | No 🔴 in round 1 → **other model**. A 🔴 in round 1 → same model on the fix, then the other model once no 🔴 is left | A 🔴 from the other model earns one more round on the fix |

- Normal PRs never use the other model. Risky PRs always get exactly one other-model round once the same model finds no 🔴.
- Tell the user in one line each time a 🔴 earns an extra round, naming the model.

Send each repo's 🔴/🟠/🟡 to its child to fix (tests first, then squash the fix into the PR's one commit and force-push with `--force-with-lease`). If the review tool commits each round, squash those commits too before pushing. The coordinator decides any judgement calls and records them in the plan. A 🟡 that needs no code change becomes a PR-description note (e.g. deploy order).

## 5. Merge on green
- **Ready for review:** once a PR's review has no 🔴/🟠 left (at most 3 🟡, listed as follow-ups), mark it ready (`gh pr ready <n>`), then wait for its **full** CI to go green before merging. Some repos skip heavy jobs on drafts: ContentEvaluationAgent's CI skips build-image, behavior and pipeline tests, checker tests and container scan while the PR is a draft. So a green draft there is not green; only the run after `gh pr ready` counts. A draft can't be merged.
- Check each PR: 0 pending, 0 failed (`gh pr checks`). Re-run checks that failed for environment reasons (a DEV outage, a known flake on main) without code changes, and say so.
- Merge in the dependency order the contract implies (usually backend → web → desktop) as soon as checks are green; don't wait for the user. Always squash-merge (`gh pr merge <n> --squash`), in every repo, even where rebase-merge is allowed: one commit on `main` per PR.
- Regenerate the web API schema from DEV after the backend deploys, before merging web.

## 6. Monitor until on ralhf-dev
- Backend: watch `Deploy DEV to AWS` for the merge SHA. Web: watch `Deploy to AWS Dev S3`. Desktop: run `gh workflow run release-dev.yml -r main` and watch it, including the BDD gate, until the dev-latest assets are updated. Note the version.
- Prod deploys are on-call's: never approve or trigger them; only point out the deploy order in the PRs.
- If something fails, use the `diagnosing-bugs` skill to find the root cause before changing anything; if our change caused it, revert rather than patch.

## 7. Comment on the Jira ticket(s)
Once every PR is merged and on ralhf-dev, add one comment to each ticket in scope, using the Atlassian MCP. Write it in easy language, summarized, with examples:
- what was done and why, in two or three sentences;
- before and after behaviour, with a concrete example;
- every scenario, as a table, when there's more than one;
- the PRs (links and merge SHAs) and what's on DEV (versions);
- how to see it on ralhf-dev, as a short numbered list.

Comment only: don't change the ticket's status. The final summary comment and the move to Done come after QA (step 9).

## 8. Stop and hand over
Update the plan note from step 0b (Status, PRs, merge SHAs, DEV versions). As soon as everything is on ralhf-dev, tell the user in plain language that **we're on DEV and QA can start**: each PR (link, merge SHA), what's on DEV (versions), any feature flag to turn on, a short numbered "how to test on ralhf-dev" list, and the **follow-ups** (see below). Then **stop** and wait. The user runs QA (guide them through it if they ask) and tells you when QA is done. Don't move Jira tickets before that.

## 9. After QA: Done and summary
When the user says QA is done (their words in chat, not a child's or a note's):
1. Move each ticket in scope to **Done** (`listJiraIssueTransitions`, then `transitionJiraIssue`).
2. Add one final comment per ticket in the same easy-explain style as step 0c: a short **Summary** of what we did and why, **Before and after** with a concrete example, the PRs (links and merge SHAs), what's on DEV, and a **Follow-ups** list.
3. Update the plan note's Status to Done, and tell the user in one line, repeating the follow-ups.

### Follow-ups
Keep one running list of follow-ups through the wave: work that is needed or may be needed but is out of this ticket's scope (review 🟡 left over, gaps QA found, deferred parts, risks to watch). Each item says what, why, and whether it is **needed** or **maybe**. Show it in four places:
1. **The plan note:** a "Follow-ups" section, kept current from step 7 on.
2. **The QA hand-over (step 8):** tell the user the list.
3. **The Done message (step 9):** tell the user the list again.
4. **The final Jira comment (step 9):** a "Follow-ups" section.
Don't create follow-up tickets unless the user asks; suggest them.

Once every PR is merged and on ralhf-dev (step 6 done) and the Jira comment is posted, archive the child sessions, the way your tool note says. Don't ask first: their work is on `main` and their reports are in the plan. Say in one line which ones you archived. Leave a child open only if its PR isn't merged or its deploy failed, and say why.

## Rules that always hold
- **Never weaken a test to make CI green.** When a test fails (BDD, e2e or unit, on any OS), find the root cause with `diagnosing-bugs` first. Fix the product if the product is wrong. Change a test only when the behaviour it checks has really, intentionally changed, or when the test itself is provably wrong (e.g. a fixture that doesn't model the real world). Then say why in the PR, in one line per changed test. Never skip, tag-out, quarantine or platform-gate a scenario (macOS, Windows or Linux), loosen an assertion, widen a timeout, or add a retry just to pass. Existing BDD scenarios stay as they are unless the plan changes the behaviour they cover; tell the user in one line before changing one. A real flake is re-run without code changes, never merged over.
- Watch disk and Docker: two CEA stacks can fill the disk. If Docker goes read-only, ask the user to Quit and reopen Docker Desktop (never force-quit).
- Never enter passwords; never touch prod; never `gh --auto`.
- **No pop-up windows:** never run desktop BDD, headed Playwright or anything else that opens app or browser windows on the user's screen. Desktop BDD runs in PR CI, and Playwright runs headless.
- **Squash, always:** one squashed commit per PR before every push (force-push with `--force-with-lease`), and squash-merge every PR (`gh pr merge <n> --squash`). This holds in every repo and in both Claude Code and Codex.
- Stay inside the plan's scope; note anything new as a follow-up.

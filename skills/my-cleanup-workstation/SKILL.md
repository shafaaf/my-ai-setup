---
name: my-cleanup-workstation
description: Free disk space on the BotFood workstation — finished worktrees, Docker data (including when Docker Desktop won't start because the disk is full), and dev caches — and bring the main repo clones up to date with their default branch.
argument-hint: "[worktrees|docker|caches|repos]"
disable-model-invocation: true
---

# Cleanup workstation

Arguments: `$ARGUMENTS`. A section name limits the run to that section; none means all four. `repos` needs no scan or question: it runs straight to step 3's **Repos** and step 4.

The workspace is `~/Desktop/bot-food-work`: repos in `ralhf-app/<repo>`, task checkouts in `worktrees/<task>/<repo>`, or one level deeper for parallel runs (`worktrees/<task>/p1/<repo>`).

This skill runs in Claude Code and Codex. Read the note for your tool before step 1: `claude.md` in Claude Code, `codex.md` in Codex. It maps the session check, the Jira lookup and the question in step 2 to your tool.

## 1. Scan

Gather three things, all read-only:
- Run `~/.agents/skills/my-cleanup-workstation/scripts/scan.sh`.
- Note every worktree an open agent session (Claude or Codex) works in, the way your tool note describes.
- Look up the Jira status of every ticket in the worktree table (Jira cloudId `bdb2ccd3-dc1c-40a8-93c5-903d5b3e3fc6`; your tool note says how). The scan takes the ticket from the task folder's name, or else from the branch name; `?` means it found none.

Done when you hold all three.

## 2. Propose

Show one table per section with a verdict and reason per row, numbering the rows across all tables so the user can pick by number, then ask the user which rows to clean, letting them pick several. Nothing is removed before that answer.

**Worktrees.** Each row gets one verdict:
- **Finished** (removable) when every check passes:
  - **Ticket Done**: its Jira status is Done. Any other status (In Review, In QA, In Progress…) fails this check, even when the PR is merged: the user moves tickets to Done after checking the work on DEV.
  - **Not in use**: `in_use` is `no` or only `docker-exited`, and no open session works in it. `process` or `docker-running` fails it.
  - **Code merged**: its PR is `MERGED`, or `unmerged` is 0 (every file it changed, committed or not, already matches the remote default branch). PRs are squash-merged, so `ahead` stays above 0 after merging; trust the PR state and `unmerged`. A merged PR with `dirty` above 0 passes only when `unmerged` is 0 too; otherwise those edits were never merged. A `CLOSED` PR, or no PR, passes only on `unmerged` 0.
- **Idle** (offered as "removable if you want", never preselected) when only *Ticket Done* fails: no open session, not in use, code merged. The ticket may be parked or abandoned (To Do, or no ticket at all), so the user decides.
- **Keep** otherwise, with the failing check as the reason. For a Done ticket whose `unmerged` is above 0, say how many files would be lost.

When every checkout in a task folder is Finished, the task is Finished: offer it as one row together with its notes (the plan, logs and screenshots beside the checkouts), listing them. Removing the task removes the notes too.

A detached web checkout (the pinned renderer for e2e or `desktop:dev`) follows the verdict of the checkouts beside it.

**Leftover task folders** (the scan's list of folders with no git checkout inside) hold files git can't restore, so show their contents and offer them only for a Done ticket or when the user picks them.

**Docker.** Report `docker system df`, `Docker.raw` and which working directory each container belongs to. Two directories sharing one compose project name (the default `contentevaluationagent`, for example) share containers and databases: flag it, and suggest a per-worktree `COMPOSE_PROJECT_NAME` (like `cea3365w35`).

What a prune does on Docker 23+: `docker system prune --all --volumes` removes stopped containers, images no container uses, the build cache and *anonymous* volumes. Running containers and *named* volumes (the databases) always survive. A stopped stack's next `docker compose up` re-creates its containers and, after a full prune, rebuilds its images first; its data stays. Offer the user a choice:
- **Full prune**: frees the most.
- **Safe prune**: keeps every image a remaining worktree's compose setup needs (the scan lists them), so those stacks start without a rebuild.
- **Leave Docker**.

When the daemon is down and the scan shows *disk full*, Docker cannot start and no prune can run: the cure is the disk-full reset in step 3.

**Other space.** From *biggest space users*, give a "What / Size / Safe?" table:
- Tool caches: npm, uv, Homebrew, pnpm, stale updater folders (`*-updater`, `*.ShipIt` of apps other than a running Claude). Safe; they rebuild.
- Browser runtimes `ms-playwright`, `camoufox`, `puppeteer`: *keep*. The desktop e2e lane and extraction need them.
- Other apps' caches (Chrome, Sublime, Codex, WhatsApp…): the user's call, listed with sizes only.

## 3. Clean

Record `df -h ~ | tail -1` first.

**Worktrees**, per approved row, re-checking `in_use`, `dirty` and `unmerged` (rerun `scan.sh`) right before removal:
1. If it has a stopped Docker stack, `docker compose down -v` in it, unless another directory shares its project name (that would delete the other's data).
2. `git -C <main clone> worktree remove --force <absolute path>`, where `<main clone>` is `dirname "$(git -C <path> rev-parse --path-format=absolute --git-common-dir)"`: usually `ralhf-app/<repo>`, sometimes `repos/<repo>`. Use an absolute path, since a relative one resolves against the repo. `--force` is safe here because step 2 verified the code is merged; it clears ignored files (`node_modules`, `.venv`) and edits already on main.
3. Delete its local branch with `git branch -D`.
4. Remove the emptied `pN` folder, then the task folder: `rm -rf` when the whole task was approved (its notes go with it), else `rmdir`.

**Leftover folders**, approved ones only: `rm -rf` the folder.

**Docker**, after the user picks a prune: `~/.agents/skills/my-cleanup-workstation/scripts/docker-prune.sh full` (or `safe`). It refuses while a Docker build runs. Then tell every session with a stopped stack that its next `docker compose up` re-creates it (and rebuilds, after a full prune), with its data intact.

**Disk-full reset** (daemon down) deletes all Docker data, databases included. Give the user the steps, each in its own `bash` block, to run themselves once no session is testing in Docker:
1. Quit Docker Desktop (Quit on the error dialog), then make sure it's stopped: `osascript -e 'quit app "Docker"'; pkill -f com.docker.backend`
2. Delete Docker's data file: `rm ~/Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw`
3. Start Docker again, which creates a fresh, empty data file: `open -a Docker`
4. Check free space: `df -h ~ | tail -1`

Afterwards, tell every session that uses Docker that its stack and databases are gone: it rebuilds with `docker compose up` plus migrations, starting empty. Its code is untouched.

**Caches**, approved ones only: `npm cache clean --force` (and `rm -rf ~/.npm/_npx`), `uv cache prune` (`uv cache clean` only when no session runs uv), `brew cleanup -s` (or the whole `$(brew --cache)`), `pnpm store prune` (or its cache folder when pnpm isn't installed), and `rm -rf` of approved updater folders.

**Repos**, always, without asking, after the worktree removals: `~/.agents/skills/my-cleanup-workstation/scripts/sync-repos.sh`. It moves every git clone in `ralhf-app/` (the BotFood repos, the `web` website and the labs) to the latest commit of its remote default branch, fast-forward only. It never discards local changes, never pushes, and skips a repo with uncommitted changes on another branch or local commits on its default branch, saying why. Nothing under `worktrees/` is touched.

## 4. Report

Free space before and after, then one line per section: what was removed, what was kept and its failing check, and any Docker steps still waiting on the user. For repos, one line per repo from the sync script: its branch, old → new commit, or why it was skipped. `Docker.raw` is a sparse file: its size on disk drops as Docker releases pruned space, and macOS reports that space free a few minutes later. Done when every approved row is removed or explained.

When Docker was left alone, end with the full prune and its reclaimable size from `docker system df`, in its own `bash` block, for whenever the user wants it:

```bash
~/.agents/skills/my-cleanup-workstation/scripts/docker-prune.sh full
```

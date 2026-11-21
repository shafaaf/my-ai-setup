---
name: my-repos-sync
description: Discover Git repositories in the current folder and nested folders, switch them to their remote default branches, and pull the latest changes while preserving local work. Use when asked to sync repositories or update all repos to mainline.
disable-model-invocation: true
---

# Repos Sync

This skill uses Git directly and does not depend on a project-specific script or repository list.

## Discover and inspect

Use the user's specified directory, otherwise the current working directory. Recursively inventory repository roots, including the starting directory itself. Recognize both `.git` directories and `.git` files. Continue into repository subdirectories to find nested repositories; never descend into `.git` internals or follow directory symlinks outside the selected tree. Skip dependency/cache directories such as `node_modules`, `.venv`, and `__pycache__`, and report these exclusions. Bare repositories are not checkouts: report them separately without mutation.

Record each checkout's branch, HEAD, status, and common Git directory. Identify linked worktrees and submodules. Process ordinary nested repositories deepest-first. Do not silently treat multiple worktrees of one repository as independent clones: update the checkout already holding mainline, or the primary checkout if mainline is free; report other linked worktrees as preserved. Keep submodules pinned to their parent repository's recorded commit unless the user explicitly requests independent branch updates.

## Sync each repository

1. Prefer `origin`; if absent, use the sole remote. Report ambiguous or missing remotes as blockers. Determine mainline from that remote's advertised symbolic HEAD (`git ls-remote --symref <remote> HEAD`); do not assume `main` or `master` or guess when HEAD is unavailable.
2. Check for unfinished merges, rebases, cherry-picks, reverts, or bisects. Leave affected repositories untouched and report the active operation. Check whether the default branch is held in another worktree before changing anything.
3. Fetch the remote default branch. Inspect ahead/behind state for both the current HEAD and local default branch. Preserve detached or local-only commits with a unique `rescue/repos-sync-<timestamp>-<label>` branch before switching.
4. Preserve staged, unstaged, and ordinary untracked changes using `git stash push --include-untracked` with a descriptive message. Record the stash object ID and original branch/HEAD. Keep the stash after syncing rather than applying feature work to mainline. Ignore-rule-protected files remain in place. If there are nested repositories, inspect their boundaries before stashing; stop the parent checkout if preservation would touch or omit nested work. Never force-remove nested repositories.
5. Switch to the local default branch using checkout protection for ignored files (`git checkout --no-overwrite-ignore <branch>`), or create a tracking branch from the fetched remote branch if absent. Fast-forward to the fetched commit with `git merge --ff-only <fetched-commit>`. Fetch plus fast-forward is the pull operation and avoids an extra fetch race.
6. If local mainline has diverged or contains local-only commits, preserve it and report that it could not match the remote without a branch reset. Do not force-reset, discard changes, auto-rebase, or create merge commits. Continue with other independent repositories.
7. Verify the branch and HEAD against the fetched target and inspect final status. Do not equate an ahead-only branch with a successful exact sync. Record failures and any recovery stash/branches.

For read-only or dry-run requests, inventory and inspect remote HEAD without fetching, stashing, or switching. Use explicit working directories and safely quote paths. Avoid concurrent mutation of the same common Git directory and do not overlap another sync process.

## Finish

Report how many repositories synced, any skipped or blocked checkouts, and where local work was preserved. “Latest” means the fetched remote tip for this run. Ordinary sync does not install dependencies, build, test, launch apps, delete worktrees, or push. Perform those only when separately requested.

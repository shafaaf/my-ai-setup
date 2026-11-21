#!/usr/bin/env bash
# Bring every main clone in ralhf-app/ to the latest commit of its remote default branch, for /cleanup-workstation.
# Usage: sync-repos.sh [workspace]   (default: ~/Desktop/bot-food-work)
# Fast-forward only: it never discards local changes, never pushes, and leaves worktrees/ alone.
# A repo with uncommitted changes on another branch, or with local commits on its default branch, is skipped and reported.
set -u
WS="${1:-$HOME/Desktop/bot-food-work}"

echo "## repos (repo|branch|before|after|result)"
for repo in "$WS"/ralhf-app/*/; do
  repo="${repo%/}"; name=$(basename "$repo")
  if ! git -C "$repo" rev-parse --git-dir >/dev/null 2>&1; then echo "$name|-|-|-|skipped: not a git repo"; continue; fi
  if ! git -C "$repo" fetch -q origin 2>/dev/null; then echo "$name|-|-|-|skipped: fetch failed"; continue; fi
  default=$(git -C "$repo" symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null)
  [ -n "$default" ] || { git -C "$repo" remote set-head origin -a >/dev/null 2>&1; default=$(git -C "$repo" symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null); }
  [ -n "$default" ] || { echo "$name|-|-|-|skipped: no origin default branch"; continue; }
  branch="${default#origin/}"
  current=$(git -C "$repo" branch --show-current)
  before=$(git -C "$repo" rev-parse --short HEAD)
  dirty=$(git -C "$repo" status --short | wc -l | tr -d ' ')

  if [ "$current" != "$branch" ]; then
    [ "$dirty" = 0 ] || { echo "$name|${current:-detached}|$before|$before|skipped: $dirty uncommitted changes on ${current:-detached HEAD}"; continue; }
    # The old branch and its commits stay; only the checkout moves.
    git -C "$repo" switch -q "$branch" 2>/dev/null || { echo "$name|${current:-detached}|$before|$before|skipped: can't switch to $branch (checked out in a worktree?)"; continue; }
  fi
  if [ "$(git -C "$repo" rev-list --count "$default..HEAD")" != 0 ]; then
    echo "$name|$branch|$before|$(git -C "$repo" rev-parse --short HEAD)|skipped: local commits on $branch not on $default"; continue
  fi
  # git refuses the merge, changing nothing, if it would overwrite an uncommitted change.
  if git -C "$repo" merge -q --ff-only "$default" >/dev/null 2>&1; then result="ok"; else result="skipped: update would overwrite uncommitted changes"; fi
  after=$(git -C "$repo" rev-parse --short HEAD)
  [ "$result" = ok ] && [ "$before" = "$after" ] && [ "$current" = "$branch" ] && result="already current"
  [ "$dirty" != 0 ] && result="$result ($dirty uncommitted changes kept)"
  echo "$name|$branch|$before|$after|$result"
done

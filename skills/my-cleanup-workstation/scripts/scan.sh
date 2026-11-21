#!/usr/bin/env bash
# Read-only inventory for /cleanup-workstation. Prints facts; deletes nothing.
# Usage: scan.sh [workspace]   (default: ~/Desktop/bot-food-work)
set -u
WS="${1:-$HOME/Desktop/bot-food-work}"

echo "## disk"
df -h "$HOME" | tail -1 | awk '{print "free="$4" used="$5}'

tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
# Command lines first, before this scan starts its own git and du jobs in the worktrees.
busy_cwds=$(lsof -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | sort -u)
# Padded with a space so a path at the end of a line matches "$wt ".
commands=$(ps -axo command= | sed 's/$/ /')

git_entries=$(find "$WS/worktrees" -mindepth 3 -maxdepth 4 -name .git 2>/dev/null | sort)
# Each checkout's main clone, which may live outside ralhf-app/ (repos/ralhf-website, for example).
main_repo() { dirname "$(git -C "$1" rev-parse --path-format=absolute --git-common-dir)"; }
# Fetch and list PRs once per main clone, in parallel: every worktree shares its clone's refs and PRs.
mkdir "$tmp/prs"
for repo in $( { ls -d "$WS"/ralhf-app/*/; for g in $git_entries; do main_repo "$(dirname "$g")"; done; } | sed 's:/$::' | sort -u); do
  key=$(echo "$repo" | tr '/' '_')
  git -C "$repo" fetch -q origin 2>/dev/null &
  (cd "$repo" && gh pr list --state all --limit 300 --json headRefName,number,state \
    > "$tmp/prs/$key.json" 2>/dev/null || rm -f "$tmp/prs/$key.json") &
done
wait
# Docker use per directory, from the labels compose puts on every container (running beats exited).
docker_dirs=$(docker ps -a --format '{{.State}}|{{.Label "com.docker.compose.project.working_dir"}}|{{.Label "com.docker.compose.project"}}' 2>/dev/null)

echo
echo "## worktrees (task|ticket|repo|branch|dirty|ahead|unmerged|pr|in_use|compose_project|size)"
# unmerged: files this checkout changed (committed, uncommitted or untracked) whose content is not on the
# remote default branch. 0 means every change is already merged; it errs high if main later moved a file.
# Checkouts sit at worktrees/<task>/<repo>, or one level deeper for parallel runs (worktrees/<task>/p1/<repo>).
# One background job per checkout (du and git status are slow on node_modules), printed in order.
worktree_row() {
  wt="$1"
  rel="${wt#"$WS"/worktrees/}"
  task="${rel%%/*}"; repo="${rel#*/}"
  branch=$(git -C "$wt" branch --show-current)
  # The ticket is in the task folder's name, or else in the branch name (codex/botfood-3676-…).
  ticket=$(printf '%s %s' "$task" "$branch" | grep -oiE 'botfood-[0-9]+' | head -1 | tr '[:lower:]' '[:upper:]')
  dirty=$(git -C "$wt" status --short | wc -l | tr -d ' ')
  def=$(git -C "$wt" symbolic-ref -q --short refs/remotes/origin/HEAD 2>/dev/null || echo origin/main)
  ahead=$(git -C "$wt" rev-list --count "$def"..HEAD 2>/dev/null || echo "?")
  unmerged="?"
  if base=$(git -C "$wt" merge-base HEAD "$def" 2>/dev/null); then
    unmerged=0
    while IFS= read -r f; do
      [ -z "$f" ] && continue
      here=none; [ -e "$wt/$f" ] && here=$(git -C "$wt" hash-object -- "$f" 2>/dev/null)
      there=$(git -C "$wt" rev-parse -q --verify "$def:$f" 2>/dev/null || echo none)
      [ "$here" = "$there" ] || unmerged=$((unmerged + 1))
    done < <( { git -C "$wt" diff --name-only "$base"; git -C "$wt" ls-files --others --exclude-standard; } | sort -u)
  fi
  pr="none"
  prs="$tmp/prs/$(main_repo "$wt" | tr '/' '_').json"
  if [ ! -f "$prs" ]; then pr="?"
  elif [ -n "$branch" ]; then
    # gh lists newest first, so the first match is the branch's latest PR.
    pr=$(jq -r --arg b "$branch" 'map(select(.headRefName == $b)) | if length==0 then "none" else (.[0]|"#\(.number):\(.state)") end' "$prs")
  fi
  in_use=""
  # A process works here if its cwd is inside the checkout or its command line names it (`cd … &&`, `-C`, `--prefix`).
  { echo "$busy_cwds" | grep -q "^$wt\(/\|$\)" || echo "$commands" | grep -qF -e "$wt/" -e "$wt "; } && in_use="process"
  states=$(echo "$docker_dirs" | awk -F'|' -v d="$wt" '$2 == d {print $1}' | sort -u)
  if echo "$states" | grep -q running; then in_use="${in_use:+$in_use+}docker-running"
  elif [ -n "$states" ]; then in_use="${in_use:+$in_use+}docker-exited"; fi
  project=$(echo "$docker_dirs" | awk -F'|' -v d="$wt" '$2 == d {print $3}' | head -1)
  size=$(du -sh "$wt" 2>/dev/null | cut -f1)
  echo "$task|${ticket:-?}|$repo|${branch:-detached}|$dirty|$ahead|$unmerged|$pr|${in_use:-no}|${project:--}|$size"
}
i=0
for git_entry in $git_entries; do
  i=$((i + 1))
  worktree_row "$(dirname "$git_entry")" > "$tmp/row.$(printf '%03d' "$i")" &
done
wait
cat "$tmp"/row.* 2>/dev/null

echo
echo "## leftover task folders (no git checkout inside; deleting them is final)"
for task in "$WS"/worktrees/*/; do
  task="${task%/}"
  [ -n "$(find "$task" -mindepth 2 -maxdepth 3 -name .git -print -quit 2>/dev/null)" ] && continue
  echo "$(basename "$task")|$(du -sh "$task" 2>/dev/null | cut -f1)|$(ls -A "$task" | head -5 | tr '\n' ' ')"
done

echo
echo "## docker"
raw="$HOME/Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw"
[ -f "$raw" ] && echo "Docker.raw on disk: $(du -sh "$raw" | cut -f1)"
if docker info >/dev/null 2>&1; then
  docker system df
  echo "containers by compose project (count state|working dir|project; two dirs sharing a project share its data):"
  [ -n "$docker_dirs" ] && echo "$docker_dirs" | sort | uniq -c || echo "  none"
  echo "named volumes (project|volume|used by):"
  for v in $(docker volume ls -q); do
    echo "$(docker volume inspect -f '{{index .Labels "com.docker.compose.project"}}' "$v")|$v|$(docker ps -a --filter "volume=$v" --format '{{.Names}}' | tr '\n' ' ')"
  done
  echo "images each remaining worktree's compose setup needs (a safe prune keeps these):"
  find "$WS/worktrees" -mindepth 3 -maxdepth 4 \( -name docker-compose.yml -o -name compose.yaml \) 2>/dev/null | sort | while read -r f; do
    echo "$(dirname "$f"): $(docker compose -f "$f" config --images 2>/dev/null | sort -u | tr '\n' ' ')"
  done
  echo "docker builds in progress: $(ps -axo command | grep -E 'docker(-buildx| build| compose .*build)|buildkitd' | grep -vc grep)"
else
  echo "daemon=down"
  log="$HOME/Library/Containers/com.docker.docker/Data/log/host/com.docker.backend.log"
  grep -q "no space left on device" "$log" 2>/dev/null && echo "last error: no space left on device (disk full)"
fi

echo
echo "## biggest space users"
du -sh "$HOME/Library/Caches" "$HOME/.cache" "$HOME/.npm" "$WS/ralhf-app" "$WS"/worktrees/* 2>/dev/null | sort -rh

echo
echo "## caches (detail)"
du -sh "$HOME/.npm" "$HOME/.cache"/* "$HOME/Library/Caches"/* 2>/dev/null | sort -rh | head -20

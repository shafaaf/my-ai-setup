#!/usr/bin/env bash
# Usage: scan.sh <task-folder>
# Fetches every repo worktree directly inside <task-folder>, then prints one tab-separated line per repo:
#   changed|clean  path  branch  base-sha  commits-ahead  uncommitted-files  ticket-keys
# and a last line naming the installed botfood plugin's auto-review skill:
#   auto-review  <path to SKILL.md>
set -u

folder=$(cd "${1:?usage: scan.sh <task-folder>}" && pwd -P) || exit 1

for dir in "$folder"/*/; do
  dir=${dir%/}
  [ "$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null)" = "$dir" ] || continue
  git -C "$dir" fetch --quiet origin || echo "warn: git fetch failed in $dir" >&2
  default=$(git -C "$dir" symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null || echo origin/main)
  base=$(git -C "$dir" merge-base HEAD "$default")
  ahead=$(git -C "$dir" rev-list --count "$default..HEAD")
  dirty=$(git -C "$dir" status --porcelain | wc -l | tr -d ' ')
  branch=$(git -C "$dir" branch --show-current)
  tickets=$({ echo "$branch"; git -C "$dir" log --format='%s%n%b' "$default..HEAD"; } \
    | grep -oiE 'botfood-[0-9]+' | tr '[:lower:]' '[:upper:]' | sort -u | paste -sd, -)
  status=clean
  if [ "$ahead" -gt 0 ] || [ "$dirty" -gt 0 ]; then status=changed; fi
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$status" "$dir" "$branch" "$base" "$ahead" "$dirty" "${tickets:-none}"
done

install=$(python3 -I -c 'import json, os
d = json.load(open(os.path.expanduser("~/.claude/plugins/installed_plugins.json")))
print(d["plugins"]["botfood@botfood"][0]["installPath"])' 2>/dev/null)
if [ -n "$install" ] && [ -f "$install/skills/auto-review/SKILL.md" ]; then
  printf 'auto-review\t%s\n' "$install/skills/auto-review/SKILL.md"
else
  echo "auto-review	missing: the botfood plugin is not installed (claude plugin install botfood@botfood)"
fi

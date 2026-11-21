#!/usr/bin/env bash
# Guarded Docker prune for /my-cleanup-workstation, run after the user picks a mode.
# Usage: docker-prune.sh full|safe [workspace]   (default workspace: ~/Desktop/bot-food-work)
#   full: docker system prune --all --volumes: stopped containers, unused images, build cache, anonymous volumes.
#   safe: the same, but keeps every image a remaining worktree's compose setup needs, so its next
#         `docker compose up` starts without a rebuild.
# Neither touches running containers or named volumes (the databases): on Docker 23+ `--volumes`
# prunes only anonymous volumes. It stops, pruning nothing, while a Docker build is in progress.
set -u
mode="${1:-}"; WS="${2:-$HOME/Desktop/bot-food-work}"
case "$mode" in full|safe) ;; *) echo "usage: docker-prune.sh full|safe [workspace]"; exit 2 ;; esac
docker info >/dev/null 2>&1 || { echo "STOPPED: Docker is not running. Nothing pruned."; exit 1; }
builds=$(ps -axo command | grep -E 'docker(-buildx| build| compose .*build)|buildkitd' | grep -vc grep)
[ "$builds" = "0" ] || { echo "STOPPED: a Docker build is in progress. Nothing pruned."; exit 1; }

echo "before: $(df -h "$HOME" | tail -1 | awk '{print $4" free"}')"
if [ "$mode" = full ]; then
  docker system prune --all --volumes --force | tail -1
else
  docker container prune --force | tail -1
  docker builder prune --all --force | tail -1
  docker volume prune --force | tail -1
  # Images the remaining worktrees need, by repository (local copies of pinned images have no tag).
  keep=$(find "$WS/worktrees" -mindepth 3 -maxdepth 4 \( -name docker-compose.yml -o -name compose.yaml \) 2>/dev/null | while read -r f; do
    docker compose -f "$f" config --images 2>/dev/null
  done | sed -E 's/@.*//; s/:[^:/]+$//' | sort -u)
  docker images --format '{{.Repository}}|{{.ID}}' | while IFS='|' read -r repository id; do
    echo "$keep" | grep -qx "$repository" && { echo "kept $repository"; continue; }
    [ -z "$(docker ps -a -q --filter "ancestor=$id")" ] && docker rmi "$id" >/dev/null 2>&1 && echo "removed $repository"
  done
fi
docker system df
echo "after: $(df -h "$HOME" | tail -1 | awk '{print $4" free"}') (macOS can take a few minutes to show space Docker released)"

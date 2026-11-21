#!/usr/bin/env python3
"""Print the current /my-workflow-wave status as a Markdown table.

Reads ~/Desktop/bot-food-work/worktrees/<task>/WAVE-STATUS.json (newest, or the
task named as the first argument) and asks gh for each PR's state and checks.
"""
import json, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path.home() / "Desktop/bot-food-work/worktrees"


def newest():
    files = list(ROOT.glob("*/WAVE-STATUS.json"))
    return max(files, key=lambda p: p.stat().st_mtime) if files else None


def gh(args):
    try:
        return subprocess.run(["gh", *args], capture_output=True, text=True, timeout=20).stdout
    except Exception:
        return ""


def pr_cell(repo):
    n, slug = repo.get("prNumber"), repo.get("repoSlug")
    if not (n and slug):
        return "—"
    view = gh(["pr", "view", str(n), "--repo", slug, "--json", "state,isDraft", "-q", '.state + " " + (.isDraft|tostring)']).split()
    state, draft = (view + ["?", "false"])[:2]
    if state == "MERGED":
        return "✅ merged"
    if state == "CLOSED":
        return "⛔ closed"
    buckets = [line.split("\t")[1] for line in gh(["pr", "checks", str(n), "--repo", slug]).splitlines() if "\t" in line]
    stage = "📝 draft" if draft == "true" else "👀 ready"
    fail, pending, passed = buckets.count("fail"), buckets.count("pending"), buckets.count("pass")
    if fail:
        return f"{stage} · 🔴 {fail} failed"
    if pending:
        return f"{stage} · ⏳ {pending} running"
    return f"{stage} · ✅ {passed} passed" if passed else stage


def cell(text):
    return str(text or "").replace("|", "\\|").replace("\n", " ")


def ago(iso):
    try:
        mins = round((datetime.now(timezone.utc) - datetime.fromisoformat(iso.replace("Z", "+00:00"))).total_seconds() / 60)
        return "just now" if mins < 1 else f"{mins} min ago" if mins < 60 else f"{round(mins / 60)} h ago"
    except Exception:
        return iso


def main():
    path = ROOT / sys.argv[1] / "WAVE-STATUS.json" if len(sys.argv) > 1 else newest()
    if not path or not path.exists():
        print("No wave running (no worktrees/<task>/WAVE-STATUS.json).")
        return
    wave = json.loads(path.read_text())
    print(f"**{wave['ticket']}**: {cell(wave.get('stage'))} · updated {ago(wave.get('updatedAt', ''))}\n")
    print("| Session | Stage | PR | PR state · CI | Review | Findings | Notes |")
    print("|---|---|---|---|---|---|---|")
    for r in wave.get("repos", []):
        pr = f"[#{r.get('prNumber', 'PR')}]({r['pr']})" if r.get("pr") else "—"
        rnd = f"round {r['reviewRound']}" if r.get("reviewRound") else "not yet"
        found = " ".join(x for x in [f"🔴 {r['red']}" if r.get("red") else "", f"🟠 {r['orange']}" if r.get("orange") else "", f"🟡 {r['yellow']}" if r.get("yellow") else ""] if x) or "none"
        print(f"| {cell(r.get('name'))} | {cell(r.get('stage'))} | {pr} | {pr_cell(r)} | {rnd} | {found} | {cell(r.get('notes'))} |")
    flags = [f for f in wave.get("flags", []) if f]
    print("\n" + ("**🚩 Red flags**\n" + "\n".join(f"- {f}" for f in flags) if flags else "🚩 No red flags"))
    if wave.get("next"):
        print(f"\n**Next:** {wave['next']}")


if __name__ == "__main__":
    main()

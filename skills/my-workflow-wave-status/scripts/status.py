#!/usr/bin/env python3
"""Print the current /my-workflow-wave status as a Markdown table.

Reads ~/Desktop/bot-food-work/worktrees/<task>/WAVE-STATUS.json (newest, or the
task named as the first argument) and asks gh for each PR's state and checks.
"""
import json, re, subprocess, sys
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


JIRA = "https://botfood.atlassian.net/browse/"


def pr_live(repo):
    """(state, draft, fail, pending, passed, failed_names, total) from gh, or None without a PR."""
    n, slug = repo.get("prNumber"), repo.get("repoSlug")
    if not (n and slug):
        return None
    view = gh(["pr", "view", str(n), "--repo", slug, "--json", "state,isDraft", "-q", '.state + " " + (.isDraft|tostring)']).split()
    state, draft = (view + ["?", "false"])[:2]
    rows = [line.split("\t") for line in gh(["pr", "checks", str(n), "--repo", slug]).splitlines() if "\t" in line]
    buckets = [c[1] for c in rows if len(c) > 1]
    failed = [c[0].strip() for c in rows if len(c) > 1 and c[1] == "fail"]
    total = sum(1 for b in buckets if b != "skipping")
    return state, draft == "true", buckets.count("fail"), buckets.count("pending"), buckets.count("pass"), failed, total


def pr_cell(r, live):
    """The PR cell: the link, then merged / closed / draft / ready."""
    if not r.get("pr"):
        return "—"
    link = f"[#{r.get('prNumber', 'PR')}]({r['pr']})"
    if not live:
        return link
    state, draft = live[0], live[1]
    word = "merged" if state == "MERGED" else "closed" if state == "CLOSED" else "draft" if draft else "ready"
    return f"{link} · {word}"


def ci_cell(r, live):
    """The CI/CD cell: green, running or red; red says what fails (ciNote, else the failing check names)."""
    if not r.get("pr"):
        return "No PR"
    if not live:
        return "—"
    state, draft, fail, pending, passed, failed, total = live
    if fail:
        shown = ", ".join(failed[:3]) + (f" +{len(failed) - 3} more" if len(failed) > 3 else "")
        why = (r.get("ciNote") or "").strip() or (f"Failing: {shown}" if shown else "")
        return f"🔴 Red · {fail} failed" + (f": {why}" if why else "")
    if pending:
        return f"⏳ Running · {total - pending} of {total} done"
    if state == "CLOSED":
        return "—"
    if passed:
        on_dev = re.search(r"on dev|active on dev|deployed", (r.get("stage") or "").lower())
        return f"✅ Green · {passed} passed" + (" · on DEV" if on_dev else "")
    return "—"


def summary(r, live):
    """The coordinator's plain-words summary, else one built from the row."""
    if (r.get("summary") or "").strip():
        return r["summary"].strip()
    stage = (r.get("stage") or "").lower()
    state, draft, fail, pending, passed = (live or ("", False, 0, 0, 0))[:5]
    merged = state == "MERGED" or re.search(r"\bmerged\b", stage)
    parts = ["Code done and merged." if merged else ("Code written; PR is a draft." if draft else "Code written; PR open.") if r.get("pr") else "No PR."]
    if state == "OPEN":
        if fail:
            parts.append(f"Tests: {fail} CI check{'' if fail == 1 else 's'} failing.")
        elif pending:
            parts.append("Tests: CI still running.")
        elif passed:
            parts.append("Tests: CI all green.")
    n = r.get("reviewRound")
    parts.append(f"Reviewed ({n} round{'' if n == 1 else 's'})." if n else "Not reviewed yet.")
    if "paus" in stage:
        parts.append("Paused for now.")
    elif re.search(r"on dev|active on dev|deployed", stage):
        parts.append("Live on DEV.")
    elif merged and re.search(r"release|wait", stage):
        parts.append("Waiting for a release.")
    return " ".join(parts)


def row_progress(r, live):
    stage = (r.get("stage") or "").lower()
    state, draft, fail, pending, passed = (live or ("", False, 0, 0, 0))[:5]
    if re.search(r"on dev|active on dev|deployed", stage):
        return 1
    if state == "MERGED" or re.search(r"\bmerged\b", stage):
        return 0.9
    if not r.get("pr"):
        return 0.2
    if r.get("reviewRound") and not fail and not pending and passed:
        return 0.8
    return 0.7 if r.get("reviewRound") else 0.5


def wave_percent(wave, lives):
    if isinstance(wave.get("percent"), (int, float)):
        return max(0, min(100, round(wave["percent"]))), False
    repos = wave.get("repos", [])
    if not repos:
        return 0, True
    # The rows miss work still ahead, so each open next step takes 5% off (down to 60% of it).
    ahead = max(0.6, 1 - 0.05 * len(next_steps(wave.get("next"))))
    return round(sum(row_progress(r, l) for r, l in zip(repos, lives)) / len(repos) * ahead * 100), True


def wave_summary(wave, lives):
    if (wave.get("summary") or "").strip():
        return wave["summary"].strip()
    repos = wave.get("repos", [])
    done = sum(1 for r, l in zip(repos, lives) if row_progress(r, l) >= 0.9)
    open_ = sum(1 for r, l in zip(repos, lives) if r.get("pr") and row_progress(r, l) < 0.9)
    n = len(repos)
    text = f"{done} of {n} piece{'' if n == 1 else 's'} merged or on DEV" + (f"; {open_} PR{'' if open_ == 1 else 's'} still open" if open_ else "") + "."
    stage = (wave.get("stage") or "").strip().rstrip(".")
    return text + (f" Right now: {stage}." if stage else "")


def next_steps(nxt):
    items = nxt if isinstance(nxt, list) else re.split(r";\s+", nxt or "")
    return [x.strip() for x in items if x and x.strip()]


def cell(text):
    return str(text or "").replace("|", "\\|").replace("\n", " ")


def ago(iso):
    try:
        mins = round((datetime.now(timezone.utc) - datetime.fromisoformat(iso.replace("Z", "+00:00"))).total_seconds() / 60)
        return "just now" if mins < 1 else f"{mins} min ago" if mins < 60 else f"{round(mins / 60)} h ago"
    except Exception:
        return iso



def review_tags(r):
    """The tags in front of the rounds: "⚠️ Risky · vault, sign-in", "Large", "Small"."""
    tags = []
    if r.get("risky"):
        why = (r.get("riskReason") or "").strip()
        tags.append(f"⚠️ Risky · {why}" if why else "⚠️ Risky")
    if r.get("size") == "large":
        tags.append("Large")
    elif r.get("size") == "small" and not r.get("risky"):
        tags.append("Small")
    return " · ".join(tags)


def rounds_text(r):
    """The rounds: "R1 Claude 0 🔴 → R2 Codex 3 🔴", with 🟠 only when a round found some."""
    rounds = [x for x in (r.get("reviews") or []) if (x.get("model") or "").strip()]
    if rounds:
        return " → ".join(f"R{x.get('round')} {x['model'].strip()} {x.get('red') or 0} 🔴" + (f" {x['orange']} 🟠" if x.get("orange") else "") for x in rounds)
    models = [m.strip() for m in (r.get("reviewModels") or []) if m and m.strip()]
    if models:
        return " → ".join(f"{m} r{i}" for i, m in enumerate(models, 1))
    return f"round {r['reviewRound']}" if r.get("reviewRound") else "not yet"


def review_text(r):
    """Tags, then the rounds."""
    return " · ".join(x for x in (review_tags(r), rounds_text(r)) if x)


def local_review_text(r):
    """The Local review cell: tags, rounds, then what is still open (or passed)."""
    review = review_text(r)
    if rounds_text(r) == "not yet":
        return review
    found = findings_text(r)
    if found != "none":
        return f"{review} · {found}"
    last = (r.get("reviews") or [None])[-1]
    passed = bool(last) and not last.get("red") and not last.get("orange")
    return f"{review} · {'passed' if passed else 'no open findings'}"


def findings_text(r):
    """The Findings cell: the open counts, then the one-line titles of open 🔴/🟠 findings."""
    counts = " ".join(x for x in [f"🔴 {r['red']}" if r.get("red") else "", f"🟠 {r['orange']}" if r.get("orange") else "", f"🟡 {r['yellow']}" if r.get("yellow") else ""] if x) or "none"
    found = [f for f in (r.get("openFindings") or []) if f.get("level") in ("red", "orange") and (f.get("title") or "").strip()]
    found.sort(key=lambda f: 0 if f["level"] == "red" else 1)
    titles = [f"{'🔴' if f['level'] == 'red' else '🟠'} {f['title'].strip()}" for f in found]
    return f"{counts}: {'; '.join(titles)}" if titles else counts

def main():
    path = ROOT / sys.argv[1] / "WAVE-STATUS.json" if len(sys.argv) > 1 else newest()
    if not path or not path.exists():
        print("No wave running (no worktrees/<task>/WAVE-STATUS.json).")
        return
    wave = json.loads(path.read_text())
    keys = list(dict.fromkeys(re.findall(r"[A-Z][A-Z0-9]+-\d+", wave.get("ticket", ""))))
    if keys:
        print("**Tickets**\n")
        for k in keys:
            print(f"- [{k}]({JIRA}{k})")
        print()
    else:
        print(f"**{cell(wave.get('ticket'))}**\n")
    repos = wave.get("repos", [])
    lives = [pr_live(r) for r in repos]
    pct, est = wave_percent(wave, lives)
    filled = round(pct / 10)
    print(f"**Wave summary** · `{'█' * filled}{'░' * (10 - filled)}` {'about ' if est else ''}{pct}% done · updated {ago(wave.get('updatedAt', ''))}\n")
    print(wave_summary(wave, lives) + "\n")
    print("| Session | Stage | PR | Local review | CI/CD | Summary |")
    print("|---|---|---|---|---|---|")
    for r, live in zip(repos, lives):
        local = local_review_text(r)
        print(f"| {cell(r.get('name'))} | {cell(r.get('stage'))} | {pr_cell(r, live)} | {cell(local)} | {cell(ci_cell(r, live))} | {cell(summary(r, live))} |")
    flags = [f for f in wave.get("flags", []) if f]
    print("\n**🚩 Red flags**\n")
    print("\n".join(f"- {f}" for f in flags) if flags else "None.")
    steps = next_steps(wave.get("next"))
    print("\n**➡️ Next steps**\n")
    print("\n".join(f"{i}. {x}" for i, x in enumerate(steps, 1)) if steps else "Nothing planned yet.")


if __name__ == "__main__":
    main()

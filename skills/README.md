# My skills: one copy for Claude and Codex

Every skill I wrote lives **here**, in `skills/<name>/` of the `my-ai-setup` repo. Both tools read these exact files, so one edit reaches both.

## How the two tools find them

On my Mac the repo is cloned at `~/.agents/mods`. Two links point each tool at it:

```
~/.claude/skills/<name>  ──►  ~/.agents/skills/<name>  ──►  ~/.agents/mods/skills/<name>   (real files, in git)
        Claude Code                 Codex 0.160+
```

1. **Codex** reads `~/.agents/skills` natively and follows the link into this repo.
2. **Claude Code** reads `~/.claude/skills`. Its link points to `~/.agents/skills/<name>`, which points here.
3. `~/.agents/skills/MY-SKILLS.md` is a link to this file.

`my-workflow-wave-status` is also a Claude plugin (the live pane). Claude takes `/my-workflow-wave-status` through the skill link. In Codex, call it `$my-workflow-wave-status`: Codex has no per-skill slash commands.

## Set up on a new computer

```bash
git clone git@github.com:shafaaf/my-ai-setup.git ~/.agents/mods
mkdir -p ~/.agents/skills ~/.claude/skills
for d in ~/.agents/mods/skills/*/; do n=$(basename "$d"); ln -sfn ../mods/skills/$n ~/.agents/skills/$n; ln -sfn ../../.agents/skills/$n ~/.claude/skills/$n; done
ln -sfn ../mods/skills/README.md ~/.agents/skills/MY-SKILLS.md
```

## The skills

| Skill | What it does |
|---|---|
| my-easy-explain | Explains code and workflows simply, for a new engineer |
| my-storm-stanford-research | Multi-perspective, citation-checked HTML research briefing |
| my-repos-sync | Pulls the default branch in every repo under a folder |
| my-onboarding-guides-code | Beginner and intermediate onboarding guides for a repo |
| my-cleanup-workstation | Cleans up local disk, worktrees and caches |
| my-workflow-wave | Runs an approved multi-repo plan end to end |
| my-workflow-wave-status | Shows where a running wave is (Claude pane, or Codex table) |
| my-walkthrough-guide | Hands-on walkthroughs, one real example per turn |
| my-review-all | Reviews every changed repo of a task together |
| my-hello-interview-botfood-notes | Interview-study notes linking a Hello Interview guide to real BotFood examples |

Skills installed from other people's repos (`npx skills add …`) stay as real folders in `~/.agents/skills` and are **not** in this repo; `npx skills update` refreshes them.

## Rules

- **Manual-only.** Each skill runs only when called by name (`/name` in Claude, `$name` in Codex). Each `SKILL.md` has `disable-model-invocation: true`, and each `agents/openai.yaml` has `policy: allow_implicit_invocation: false`. Add both to every new skill. (Because of this, Codex leaves them out of its automatic skill list; `$name` still runs them.)
- **Tool-neutral.** Keep `SKILL.md` the same for both tools. Put tool-specific steps in `claude.md` and `codex.md` beside it, with one line in `SKILL.md` pointing to them.
- **No copies.** Never put a copy in `~/.codex/skills` (Codex's old location) or a real folder in `~/.claude/skills`.
- **New skill:**
  1. Create `~/.agents/mods/skills/<name>/` with `SKILL.md` and `agents/openai.yaml`.
  2. Link it: `ln -s ../mods/skills/<name> ~/.agents/skills/<name>` and `ln -s ../../.agents/skills/<name> ~/.claude/skills/<name>`.
  3. Add it to the tables here and in the repo's main `README.md`, then commit.

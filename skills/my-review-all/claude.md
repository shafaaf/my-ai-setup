# Review all — Claude Code

- **Arguments** arrive in `$ARGUMENTS`.
- **Fresh reviewers:** one `Agent` call per repo (general-purpose), all in a single message so they run in parallel. Each brief is `auto-review` section 2a's, which invokes the `botfood:pr-review` skill.
- **Stop-and-ask:** one `AskUserQuestion` call covering every repo that needs it.

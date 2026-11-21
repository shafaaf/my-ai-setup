# Storm research — Claude Code

- **Topic:** arrives in `$ARGUMENTS`; if it's empty, ask.
- **Research agents:** five `Agent` calls (built-in `general-purpose`) in a **single message**, so they run in parallel; one per lens.
- **Verification agents:** one `general-purpose` `Agent` per citation cluster, also in one message.
- **Files:** write the report with the `Write` tool. Read the template from this skill folder (`assets/report-template.html`).

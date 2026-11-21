---
name: my-storm-stanford-research
description: 'Use when someone asks to run Storm Research, use the my-storm-stanford-research skill, run the STORM method on a topic, says "storm research this" / "storm report on X" / "give me a STORM briefing on X", or wants a multi-perspective, citation-verified HTML research briefing on a topic. Runs a 4-phase pipeline: five expert lenses (Practitioner, Academic, Skeptic, Economist, Historian) -> contradiction map -> synthesized HTML report -> adversarial peer review + primary-source verification. Best for topics where multiple viewpoints and fact-checked claims matter; overkill for a simple factual lookup.'
argument-hint: "[topic to research]"
disable-model-invocation: true
---

# Storm Stanford Research

## What this does

Turns one topic into a verified, multi-perspective HTML briefing. It simulates five expert lenses on the topic, maps where they contradict each other, synthesizes everything into a single self-contained HTML report, then adversarially peer-reviews its own output and verifies every citation against its primary source before delivering. The output is one HTML briefing with explicit evidence limits and claim-level verification status. This is a STORM-inspired adaptation of the supplied workflow, not an official Stanford implementation or an affiliated Stanford product.

Run the full pipeline end to end. Do not shortcut a phase. This is heavier than a quick web lookup; that is the point.

## Portability

This skill runs in Claude Code and Codex. It uses the session's web research, file-writing and sub-agent tools, plus [assets/report-template.html](assets/report-template.html). It needs no Stanford STORM package or paid services. **Read the note for your tool first: `claude.md` in Claude Code, `codex.md` in Codex.** It says how to spawn the research agents and write files. Resolve asset paths relative to this skill directory, not the working directory.

Use the tools exposed in the current session, the way your tool note says. Keep the current model and reasoning settings unless the user specifies otherwise. Limit active research agents to available concurrency slots, queue excess clusters, and await completed results before synthesis. The five lens tasks are independent and may run concurrently; verification starts only after a draft and claim list exist.

When sub-agents are unavailable or delegation is prohibited by higher-priority instructions, perform the five lenses and a separate skeptical verification pass sequentially. Disclose that verification used the same agent, and do not label it independent. If web access is unavailable, explain the limitation; do not produce a completed verified briefing from memory.

Use `web` search/open or equivalent available tools to retrieve sources. Retain primary URLs and the text supporting each material claim. Research and drafting do not authorize sending messages, publishing the report, account changes, or credential generation.

## Phase 0: Scope the topic

1. If the user's request or the skill's arguments include the topic, use it. Otherwise ask what to research.
2. State your interpretation of the topic in one line and proceed. Only ask a clarifying question if the topic is genuinely ambiguous in a way that changes the research. Default to proceeding.
3. Identify the **reader's role** so the actionable section can target it. Infer it from the topic and any stated context; if unclear, ask in one line, or default to "a practitioner or decision-maker in this field."
4. Derive a kebab-case `topic-slug` from the topic for the filename.
5. Tell the user the pipeline is running (5 lenses, then verify). One line.

## Phase 1: Five expert lenses (parallel agents)

When sub-agents are available, spawn **five research agents**, one per lens, so they run concurrently (your tool note says how). Otherwise use the sequential fallback described above. Each gets the SAME topic framing plus its own lens. Use these lens prompts as task guidance, substituting `{TOPIC}` and a one-line `{TOPIC_FRAME}` (your Phase 0 interpretation):

**1. THE PRACTITIONER** — `You are THE PRACTITIONER for: {TOPIC} ({TOPIC_FRAME}). You work with this daily. Do real web research (prioritize recent sources, case studies, practitioner threads, operator data). Surface the GAP between what hands-on operators know and what academics/pundits miss, and the practical realities (workflow friction, what actually works, where it breaks) that get ignored. Return EXACTLY: 1) CORE POSITION in 2 sentences. 2) STRONGEST EVIDENCE, 3-5 bullets each with a concrete data point/case/named source + URL. 3) THE ONE THING only a practitioner would say. Cite real sources with URLs. Under 400 words.`

**2. THE ACADEMIC** — `You are THE ACADEMIC for: {TOPIC} ({TOPIC_FRAME}). You care about peer-reviewed evidence and effect sizes, not anecdotes. Do real web research (peer-reviewed studies, arXiv, university and research-institute reports, journals). Answer: what does the rigorous evidence ACTUALLY say vs popular belief, and where does it CONTRADICT the hype. Return EXACTLY: 1) CORE POSITION in 2 sentences. 2) STRONGEST EVIDENCE, 3-5 bullets each tied to a named study/report + URL with the actual finding/effect size. 3) THE ONE THING only an academic would say. Flag where evidence is thin or contested, and note peer-review status (published vs preprint). Under 400 words.`

**3. THE SKEPTIC** — `You are THE SKEPTIC for: {TOPIC} ({TOPIC_FRAME}). You think the mainstream view is overstated or wrong. Build the STRONGEST steelman bear case. Do real web research for backlash, failures, contradicting data, policy/regulatory changes, debunkings. Answer: the strongest counterargument, and what proponents conveniently ignore. Return EXACTLY: 1) CORE POSITION in 2 sentences. 2) STRONGEST EVIDENCE, 3-5 bullets each with a concrete source + URL. 3) THE ONE THING only a skeptic would say. Be rigorous, not contrarian for sport. Cite real sources with URLs. Under 400 words.`

**4. THE ECONOMIST** — `You are THE ECONOMIST for: {TOPIC} ({TOPIC_FRAME}). You follow the money. Do real web research for revenues, valuations, market size, funding flows, unit economics, incentives. Answer: who profits from the current narrative, and what financial incentives shape the research and hype. Return EXACTLY: 1) CORE POSITION in 2 sentences. 2) STRONGEST EVIDENCE, 3-5 bullets each with a real number (revenue/valuation/market size/funding) + named source + URL. 3) THE ONE THING only an economist would say (the follow-the-money insight). Cite real figures with URLs. Under 400 words.`

**5. THE HISTORIAN** — `You are THE HISTORIAN for: {TOPIC} ({TOPIC_FRAME}). You have seen disruption cycles before and look for patterns. Do real web research for genuine historical parallels (prior technologies, manias, market shifts). Answer: what parallels actually fit, and what we learn from how they played out (who won, who lost, what stabilized). Return EXACTLY: 1) CORE POSITION in 2 sentences. 2) STRONGEST EVIDENCE, 3-5 bullets each a specific historical case with dates/outcomes + a source URL. 3) THE ONE THING only a historian would say (the pattern no one else surfaces). Cite sources with URLs. Under 400 words.`

When all five return, post a 2-3 line note in chat: which way they converge, and the sharpest disagreement. Keep raw briefs out of chat; retain them for synthesis and verification. Each brief should distinguish observation from inference, and provide publication dates and relevant limitations. For technical claims, use primary sources; secondary commentary may guide discovery or document a viewpoint but is not proof of a technical fact.

## Phase 2: Map the contradictions

Working only from the five briefs, determine (do this inline, no agents):

1. **Direct conflicts** — where two or more lenses claim opposite things. Name the specific clashing claims, not just topics.
2. **Strongest vs weakest evidence** — which lens is best-supported (assess relevance, study design, source independence, recency, sample, and limitations; causal studies support causal claims, official records support reported facts, and anecdotes/analogies have narrower reach) and which is weakest, with why.
3. **The resolving question** — the single empirical question that would settle the biggest contradiction.
4. **Universal agreement** — what every lens supports, even opponents. If none exists, say so; shared agreement is not independent proof.
5. **The blind spot** — what NO lens addressed. This becomes the "missing 6th lens" and feeds the Frontier Question.

This map is not a separate deliverable. It is the raw material for the report's findings (supports/challenges), hidden connection, 6th-lens box, and frontier question.

## Phase 3: Synthesize the HTML report

1. Read `assets/report-template.html` relative to this skill folder. Clone it; do not rebuild the CSS.
2. Fill every section. Mapping from the phases:
   - **60-second summary** — decision-maker-grade, nuance not headline. Lead with the best-supported fact, then the contested interpretation.
   - **5 key findings, ranked by reliability** — most important things now known, highest reliability first. Each carries a 1-10 confidence score (set in Phase 4) and Supported-by / Challenged-by chips drawn from the contradiction map.
   - **Hidden connection** — the non-obvious link from Phase 2 that only appears across all five lenses.
   - **Key assumption / missing 6th lens** — the blind spot from Phase 2, framed as the lens that could change the conclusions.
   - **Actionable insight** — 3-6 specific moves for the reader's role identified in Phase 0. Specific, not abstract.
   - **Claim safety guide** — assert / caveat / avoid, populated after Phase 4 verification.
   - **Frontier question** — the one question that would change everything.
   - **References** — every citation with a verification-status tag (set in Phase 4).
3. Use available file-editing tools to write to `storm-reports/{topic-slug}-briefing.html` (relative to the current working directory; create the folder if needed).

## Phase 4: Adversarial peer review + verification (do not skip)

This is what separates Storm Research from a normal report. Run it before delivering.

**4a. Self-review (inline).** Score each of the 5 findings 1-10 for reliability and justify. Identify the weakest link and what would verify it. Run a bias check (which lens dominated the synthesis, what got underweighted). Name the missing 6th perspective. Assign an honest overall grade.

**4b. Verify every citation and material factual claim.** Build a claim ledger containing the exact claim, citation URL, supporting passage or table, verdict, correction, and limitations. Include factual claims introduced during synthesis, not just those inherited from lens briefs. A single source may support several distinct claims; verify each use.

When sub-agents are available, spawn verification agents, one per distinct citation cluster (usually 4–6 total, queued within available slots). Give each verifier the claims and cited sources without the desired verdict or lens conclusions. They must fetch sources themselves. Otherwise perform a separate sequential skeptical pass and disclose the lack of independent review. Each verifier prompt:

`Independently verify a citation against its PRIMARY source. Be skeptical; do not trust secondary blog summaries. CLAIM: {claim + cited figure + named source}. Find the actual primary source. Confirm or correct: exact title/authors/venue/year/URL, the real figure or effect size as published, sample/method and any author-stated limits, and peer-review status (published vs preprint). For any contested claim, find the strongest credible counter-source. Return: VERDICT = CONFIRMED / PARTIALLY CONFIRMED (list corrections) / UNVERIFIED / FALSE, then the corrected one-line citation, then 2-4 bullets of specifics with the primary URL. Under 280 words.`

**4c. Apply corrections.** Edit the report:
- Fix any wrong figures, titles, dates, or mischaracterizations.
- Downgrade confidence scores where evidence turned out thin; move weakly supported or materially contested claims into the "Contested signal" sidebar.
- Re-attribute single-survey or commissioned stats honestly.
- Fill the verification banner and per-citation status tags from the ledger. Report checked/total citations and claim verdicts: confirmed, partially confirmed/corrected, unverified, false, and demoted. A blocked or inaccessible source is unverified, not fabricated. Use “fabricated” only when evidence establishes an invented source or detail. Avoid claiming all sources were confirmed merely because all were inspected.
- Populate the claim safety guide from the verdicts.

## Output

1. Final deliverable: `storm-reports/{topic-slug}-briefing.html` (the v2, post-verification version).
2. Open it for the user with the platform's default opener: Prefer `open_in_codex` for a local file when available. Otherwise use a supported default opener with a safely quoted path, or give a clickable absolute file link. Confirm the file exists before reporting delivery.
3. In chat, give: the file path, the truthful verification tally (checked/total, confirmed, corrected, unverified, false, demoted), the one universal finding, the frontier question, and the claim safety summary (what is safe to assert vs avoid). Keep it tight.

## Notes & guardrails

- **Real research only.** Every lens and every citation must trace to a real, fetched source. No invented studies, numbers, or URLs. If a figure can't be verified, demote or cut it; never paper over it.
- **The panel is author-built.** Always disclose this in the report. Agreement across lenses is a strong hypothesis, not independent proof. Do not present convergence as consensus of the field.
- **Verification is mandatory.** A report delivered without Phase 4 is not a Storm Research report. The verification banner must be truthful.
- **Reliability = evidence quality, not model confidence.** Score claim-specific evidence quality: relevance, methods, sample, independence, recency, and limits. Clearly mark preprints and commissioned studies, but do not automatically rank a well-designed preprint below an analogy. Scores are editorial assessments, not calibrated probabilities.
- **Target the reader, not a default person.** The actionable insight and claim safety guide speak to the role identified in Phase 0. Keep them generic if no role is given.
- **Cost.** A parallel run typically uses five lens agents and 4–6 verifier tasks. Respect available concurrency and user constraints; use one verifier per citation cluster rather than one per claim.
- **Design.** Clean white and professional (Montserrat / Roboto Mono, blue accent). Keep the template CSS verbatim. Do not swap in a different visual style.

## Final artifact checks

Before delivery, confirm that all template tokens and instructional comments are replaced, reference links resolve to cited sources, and the ledger supports the displayed verification totals. Preview the generated HTML in an available browser or rendering tool when possible, and check readability, responsive layout, and broken links. If preview is unavailable, report that limitation rather than claiming visual verification. The template uses hosted Google Fonts with system-font fallbacks; it is a single HTML file, but full typography is not offline self-contained. Keep the template CSS unchanged.

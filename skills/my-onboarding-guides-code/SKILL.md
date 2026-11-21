---
name: my-onboarding-guides-code
description: Create personal beginner and intermediate Markdown onboarding guides for a repository or multi-repository project. Use for conceptual system understanding and new-SDE onboarding.
disable-model-invocation: true
---

# My Onboarding Guides Code

Create two concise, plain-language guides: one for a beginner software development engineer (SDE) and one for an intermediate SDE. Help each reader understand the product, why its technologies are used, and how its parts work together. Keep both documents local and personal.

## 1. Inspect privately, explain conceptually

- Establish the requested repository or project from the user's context and current checkout. For multiple repositories, identify their actual roles and relationships; sibling folders are not automatically part of one project. Ask only about scope that inspection cannot resolve.
- Read applicable repository instructions and required references. Inspect current source, manifests, configuration, and relevant tests to establish runtime facts. Distinguish active implementations from historical documents and prototypes.
- Trace the main customer journey and at least one end-to-end system flow. For multiple repositories, understand what information crosses their boundaries and why.
- Use source evidence internally; translate findings into explanations of roles, behavior, and information flow. Separate implemented behavior from planned features and label material uncertainty briefly.
- Date each generated guide or architecture explanation near its title: show when the document was created or last updated and when the architecture was inspected. Combine these into one line when the dates match, such as “Updated and inspected: YYYY-MM-DD”. Reuse an existing date statement rather than duplicating it, preserve a known creation date, and keep the inspection date unchanged when editing only presentation. These dates describe the document and its evidence, not when the system itself was built. Keep detailed commit metadata and investigation notes out of the reader's introduction. Never copy secrets, credentials, customer data, or private logs.

Guide creation uses read-only investigation, including authorized AWS resource-metadata lookups when needed to identify deployed resources. Installing dependencies, starting the app, running live audits, and modifying application code remain outside guide creation.

## 2. Place the guides and keep them personal

Honor an explicit user destination. Otherwise use:

- **One repository, including a monorepo:** `<repo-root>/guides/`.
- **A project spanning multiple repositories:** `<project-parent>/guides/`, alongside and outside the constituent repository folders. Use the established project parent; ask for the destination only when the repositories are scattered and no parent is apparent.

Create two Markdown deliverables: `<project-slug>-beginner-guide.md` and `<project-slug>-intermediate-guide.md`. Refresh existing files when authorized; otherwise preserve them and choose unused names with a date or numeric suffix for the requested deliverables.

Before writing, check whether the paths are tracked, staged, or inside any enclosing Git repository:

1. Keep tracked or staged files untouched and choose unused filenames. Ignore rules cannot protect already tracked files.
2. Inside a Git worktree, add narrowly scoped entries for the requested files to the local exclude file resolved with `git rev-parse --git-path info/exclude`. Preserve existing entries and avoid duplicates. Check any enclosing repository that could also stage them.
3. Verify the files are untracked with `git ls-files -- <paths>` and ignored with `git check-ignore -v -- <paths>`, relative to each repository root. Outside all Git worktrees, local excludes are unnecessary.

Never stage, commit, push, publish, or upload these documents. Do not change shared `.gitignore` files or Git's index to hide them. If writing the documents or local excludes requires permission, request it rather than claiming protection. Local exclusion prevents ordinary accidental staging, not a forced add. These are authoring safeguards, not sections to include in the documents.

## 3. Draft the two guides in parallel

The main agent establishes the shared evidence before drafting: current architecture and source references, one fictional customer and journey, terminology, inspection dates, requested AWS environments and resource links, and material uncertainties. Give both writers this same brief and this skill's instructions.

- Start two writing agents concurrently. Assign one exclusive ownership of the beginner Markdown file and the other exclusive ownership of the intermediate Markdown file. Give each its destination, audience, and relevant read-only source access.
- Each writer creates or refreshes only its assigned guide and follows the narrative, diagram, date, and AWS-link requirements below. The main agent owns shared evidence and local Git exclusions. Writers report evidence gaps or conflicts to the main agent, which resolves them and sends any correction to both writers.
- After both writers finish, the main agent reviews the two guides together for factual consistency, the same customer journey and terminology, distinct audience depth, readable flow, and matching diagram/step numbers. Reconcile discrepancies and complete the verification section before delivery.

If the environment cannot run parallel agents, disclose that limitation and produce the two guides sequentially using the same shared evidence and final review.

## 4. Write for understanding

Use short sections, familiar words, concrete customer scenarios, and numbered explanations of product behavior. Define unfamiliar technical terms when introduced. A single-repository beginner guide may fit in approximately 800–1,200 words; a multi-repository guide may expand to roughly 1,500–2,200 words when current-versus-historical behavior, storage boundaries, or a complete end-to-end flow genuinely require it. Aim for approximately 1,000–1,500 words for the intermediate guide, expanding only when understanding requires it.

### Narrative and wording

- Build a connected explanation: what the customer wants, what happens next, which part does the work, and why. Complete each thought before introducing another topic. Keep customer walkthroughs focused on actions and visible results; introduce the machinery in the later system explanation.
- Use familiar verbs and short sentences. Explain a new architectural idea through its effect on the journey before naming its mechanism. For example, “Only the primary desktop collects app data; other computers can view the same Cloud knowledge.” Add the technical detail only where it helps explain the next step.
- Keep the main journey easy to follow. Place optional behavior, rare failures, feature gates, and configuration qualifications after the relevant explanation in a brief note when they matter. A walkthrough step should move the story forward rather than catalogue navigation, settings, or exceptions.
- Use tables to summarize responsibilities and technology roles, with short cells. Keep operational identifiers and inspection references subordinate to the explanation. Each section should remain readable as prose without following a link.
- Give each concept a clear home. The customer and system walkthroughs revisit the same journey at different levels; other sections add needed understanding rather than repeat the same facts or accumulate implementation detail. Length is justified by clearer understanding, not by the amount of source inspected.

Both guides explain:

- **Purpose:** who uses the product, what problem it solves, and the outcome it provides.
- **Customer journey:** what the customer does and what the system does in response, step by step.
- **Main parts:** each component's responsibility and how it connects to the others, using understandable role names.
- **Technologies:** a table of technology, what it does, and where it fits in the system. For example, “Electron provides the desktop window,” rather than a filename. Prioritize technologies needed to understand runtime behavior; omit build/test-tool inventories.
- **Two connected walkthroughs:** use the same clearly fictional customer for two separate numbered examples in each guide. First show how they use the product, from their starting goal through actions, waits, decisions and outcome. Then trace those same actions from the system's perspective: which parts receive information, process it, save it and produce the result. Place the customer example early and the technical example after the relevant components are explained. Technical means system behavior and data flow, not code or development instructions.
- **Programmed work versus AI:** where AI is relevant, distinguish fixed rules, local calculations and browser/data requests from model inference. Explain whether AI is the main mechanism, an optional interpretation step, or a fallback. Describe what input it receives, what it returns, and how the application checks or limits its work.
- **AI usage and authentication:** when verifiable, explain which authenticated account or configured credential supplies model usage. Distinguish the account being inspected from the account running the AI helper; do not assume they match. Define tokens as units of model input and output, distinguish application request/retry limits from provider allowances, and state when exact usage or billing cannot be established. Do not invent prices or account details. Omit this topic for products without AI.
- **Output technologies:** explain unfamiliar output concepts where results become visible or shareable: what the technology is, how the product uses it, and how the output differs from underlying private data. Clarify programmed rendering versus AI generation where applicable, rather than merely listing a library name.
- **Relevant boundaries:** explain how data is stored, processed, shared, or recovered where that materially affects product understanding. Describe behavior rather than instructions for developers.

Exclude code pointers, source file/folder maps, source-code links, function names, endpoint identifiers, code snippets, commands, setup/build/test instructions, ticket workflows, acceptance criteria, editor rules, and release procedures. AWS resource names, data locations, and console links belong in the guides as described below. Mermaid fences are diagrams, not code examples. Write the output as conceptual system guides.

### AWS resources, data, and logs

When explaining a topic that uses AWS, connect the explanation to the actual resources a new SDE can inspect. Apply this in both guides, keeping the beginner version selective and the intermediate version more detailed.

- Add resource-specific console links at the end of a completed explanation, using a short line such as “DEV: app files · Wiki queue · worker logs.” Use descriptive labels such as “MCP service” or “processing logs”; retain exact resource names in Markdown link titles for hover inspection. A short bucket or database name may be the visible label when it helps orient the reader. Briefly explain that hover titles contain exact names. Add links to an existing technology table when they fit naturally; keep large inspection tables out of the narrative.
- Establish names, AWS account, region, and environment from infrastructure configuration, deployment outputs, canonical documentation, or authorized read-only AWS metadata. Honor the requested environment scope. Give account, region, sign-in requirements, and verification date once in a compact note for each environment. Distinguish configured names, confirmed resource identities, and tested console navigation; state gaps briefly without repeating caveats beside every link. Never invent resource names or working links.
- Explain where the topic's data actually lives and what the reader can see there. For S3, link the bucket and relevant non-sensitive prefix and explain the objects stored there. For RDS or another database service, link the instance/cluster and identify the relevant database and central tables when evidenced. Explain how to view record contents through an available authorized database viewer or query interface; an RDS resource page alone does not display table rows. Keep object bytes, database records, queue messages, and generated output distinct.
- Link the runtime resources involved, such as the ECS cluster and service or Lambda function, and their CloudWatch log groups. Explain what each log contains and which time range, service/task, or correlation identifier helps follow one fictional request. Link relevant CloudWatch metrics, alarms, or dashboards and explain the signal to inspect. For SQS, link the exact queue and dead-letter queue when present, explain their role and visible backlog/failure signals, and use metadata views for inspection rather than receiving or deleting messages.
- Verify console URL formats and encode resource names and paths correctly. Make the account and region context clear, note that sign-in and permissions are required, and state what a link opens. Use non-sensitive locations and fictional identifiers in examples; keep credentials, signed URLs, private payloads, and real customer identifiers out of the guides.

Include only resources involved in the explained flow. Keep inspection notes short enough that a reader can continue the story without visiting AWS. Explain inspection in plain language without turning the guide into a deployment, credential-setup, or troubleshooting runbook.

### Beginner guide

Assume basic programming knowledge and no project familiarity. Build understanding progressively rather than presenting an architecture inventory. Use this sequence by default, adapting headings to the product:

1. Explain the product outcome and the role of each repository or major component.
2. State the current operating model early. Resolve any likely contradiction caused by historical names, retired implementations, prototypes, or stale documentation.
3. Walk one fictional customer from their goal through ingestion, waiting or processing, viewing results, and using the result.
4. Summarize the main parts in a responsibility-and-connections table, followed by a selective technology-and-purpose table.
5. Explain the most confusion-prone boundary before the detailed system flow, such as local versus cloud, desktop versus hosted service, or raw storage versus generated output.
6. Trace the customer's journey through one complete labeled workflow. Name the technologies inside their functional boxes when that helps the reader connect product behavior to implementation responsibility.
7. Follow the diagram with numbered prose explaining every connection, then retell the same journey as a concise system walkthrough.
8. Separate programmed work from AI work and identify the relevant accounts or credentials. End with storage, privacy, recovery, and a short glossary containing only terms used in the guide.

When the product has materially different ingestion paths, show the main path in full and briefly contrast the shorter or alternative path. Keep the narrative usable without rendered diagrams: a new SDE should still understand what starts each step, what crosses each boundary, where it is stored, what processes it, and how the final result becomes available.

### Intermediate guide

Assume software-development experience but no knowledge of this system. Keep a brief purpose overview and customer walkthrough, then explain component interactions, data movement, state, background work, recovery, and privacy boundaries in greater depth where relevant. Use the connected system walkthrough to show why these arrangements matter. Avoid repeating introductory explanations wholesale or drifting into implementation instructions.

Where the system uses them, include a selective high-level map of its core platform dependencies:

- **Database choices:** identify the main database technologies, what kind of information each holds, and why each choice fits its role.
- **Important schema concepts:** explain only the central entities or records and their meaningful relationships. Show enough structure to help a developer locate the deeper area relevant to a feature without cataloguing every table, field, or migration.
- **API boundaries:** describe the important internal or external API groups, who calls them, what information crosses each boundary, and their purpose. Keep endpoint names and request details out unless a name is necessary to explain the product concept.
- **AWS services:** identify the important AWS services, what responsibility each owns, and where it participates in the product flow. Connect them to the inspection locations specified in **AWS resources, data, and logs**. Omit unused services and deployment inventory that does not help explain runtime behavior.

Connect these pieces with one or more small labeled diagrams when they form a meaningful flow. Every arrow must state what request, event, or data moves between the database, API, AWS service, and application component, followed by a short explanation of why that connection exists. Prefer the smallest representative flow that gives a developer enough context to investigate a specific feature or ticket.

### Diagrams and their explanations

- Use small Mermaid diagrams, or ASCII when Mermaid is unsuitable. Each diagram answers one question, such as “How does an export become a report?”
- Prefer about three to six boxes per diagram with plain role names. A central end-to-end multi-repository flow may be larger when it is grouped into clearly labeled zones such as device, handoff, cloud processing, and retrieval. Split it when grouping does not keep the path readable.
- Label every arrow with the action or information it carries. Distinguish movement of data from control actions or sequence. Prefer separate directional arrows over ambiguous bidirectional lines.
- When a diagram accompanies numbered steps, prefix each arrow label with the number of the step that explains it, such as “3. send collected files”. Use the same numbers in the adjacent prose. Several arrows may share a number when one step explains their connected actions; briefly state that convention. Keep the number and action together so readers can match the picture to the explanation directly.
- Immediately below each diagram, explain every connection in short sentences: where it starts, where it goes, what moves or happens, and why it matters. The prose must work without a diagram renderer.
- Make customer actions visibly distinct from automatic processing. Explain important branches or pauses without turning the diagram into an exhaustive state machine.
- Check that arrow direction reflects the real behavior, and that box names match the adjacent explanations.

## 5. Verify and deliver

- Check both guides exist in the correct location and serve distinct experience levels.
- Verify technology roles and behavior against inspected source without exposing code references in the guides. Keep uncertainties explicit and brief.
- Verify the beginner guide establishes the current operating model before its detailed flow, resolves important historical-versus-current confusion, and connects customer actions to concrete technology, storage, processing, and retrieval responsibilities.
- Check every diagram arrow has a label and a matching explanation. For diagrams with numbered steps, verify that every arrow number maps to the correct prose step and every numbered step appears in the diagram. Verify any retained links between the two guides.
- Confirm each guide has both numbered walkthroughs for the same customer, and that programmed work, AI involvement, usage attribution and output creation are explained where relevant without unsupported certainty.
- For the intermediate guide, verify that important database choices, schema relationships, API boundaries, and AWS services are explained when present, with representative labeled flows rather than exhaustive inventories.
- Read each guide from the customer's goal to the final result, checking narrative continuity as well as factual accuracy. Heading order alone does not establish good flow. Check that technical terms appear when needed, walkthrough steps stay focused, and optional details or AWS references do not interrupt a connected explanation.
- Verify each explained AWS flow has evidenced resource names in short labels or hover titles, environment/account/region context, and correctly targeted console links for its data, runtime, and logs/monitoring where applicable. Check title-to-resource matching and URL encoding, distinguish checked destinations from unverified links, and describe database-row access accurately.
- Review for accidental engineering instructions, unnecessary implementation identifiers, unexplained jargon, or duplicated sections; remove them while retaining the required AWS resource names and inspection locations.
- Recheck local-only Git status wherever applicable. Preserve existing work and leave application source and shared configuration untouched.
- Return links to the created or updated deliverables with a brief purpose distinction and accurate personal/local status. Do not create a commit or pull request.

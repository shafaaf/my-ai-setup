# Ship a wave — Claude Code

- **Arguments** arrive in `$ARGUMENTS`. The default plan is this session's plan file.
- **Child sessions:** `start_session` once per repo with `initiation: user_asked`, `context: fresh`, and no `cwd`. Copy the plan into the shared notes folder and point each brief at it.
- **Messaging children:** `SendMessage` with the child's `local_…` id. Children can message the coordinator before they deviate from the contract.
- **Archiving children:** `archive_session` with each child's `local_…` id. Find them with `list_sessions` `{"linked": true}`.
- **CI and review comments:** each child turns Auto-fix on for its PR (`set_monitor` with auto_fix and address_comments). Auto-fix may push its own fix commits; that's fine, because the PR is squash-merged and lands on `main` as one commit. When a child pushes its own changes again, it squashes the branch back to one commit first.
- **Jira (step 0):** use the Atlassian MCP, getting the cloudId from `getAccessibleAtlassianResources`.
  - **The user:** `atlassianUserInfo` gives their accountId.
  - **New ticket:** `createJiraIssue` in BOTFOOD with `assignToSprint: "active"` and the assignee set to that accountId.
  - **Existing ticket:** assign it with `editJiraIssue`. Find the active sprint with `executeRead` `getJiraBoardSprintData` (`projectKeyOrId: "BOTFOOD"`, `includeIssues: false`).
  - **Status:** take the In Progress id from `executeRead` `listJiraIssueTransitions`, then move it with `transitionJiraIssue`. Pass `sprintId` in the same call when it isn't in the sprint yet.
- **Jira comment (step 7):** `addOrEditJiraIssueComment` with `contentFormat: html` when embedding screenshots, or markdown otherwise. Comment on each ticket in scope only.



Written 2026-11-16 from the four Jira tickets and RaLHF-local `main` at `e84e3a3d9` (2026-11-16).
Session: "Sign in issues: 4489, 4408, 4384, 4490".
Background on how sign-in works: [[Sign in experience]].

**Status:** planning. Nothing is built yet. No worktrees or PRs until the plan is approved.

## 1. The four tickets at a glance

| | **4489**: AI runs on a login page | **4490**: page read hangs | **4384**: "couldn't tell" turns into "signed out" | **4408**: a signed-out user sees "Collecting" |
| --- | --- | --- | --- | --- |
| **Jira** | [BOTFOOD-4489](https://botfood.atlassian.net/browse/BOTFOOD-4489) · Bug · High · Small | [BOTFOOD-4490](https://botfood.atlassian.net/browse/BOTFOOD-4490) · Bug · Medium · Small | [BOTFOOD-4384](https://botfood.atlassian.net/browse/BOTFOOD-4384) · Bug · Medium | [BOTFOOD-4408](https://botfood.atlassian.net/browse/BOTFOOD-4408) · Task · Medium |
| **Raised by** | Brendan (review of desktop #1945) | Brendan (review of desktop #1945) | Nitin (PROD reports, 2026-11-10) | Shafaaf (testing sign-in wave 1) |
| **Context** | When the user clicks "I'm signed in", RaLHF runs one quick check. If it can't confirm, it asks the AI. On a login page it's supposed to skip the AI | To check the user's own page, RaLHF asks the browser to read it in three steps. None of them has a time limit or a Cancel | When a check can't get a real answer (blocked, slow machine, network down), RaLHF should say "unsure", not "signed out" | Before a run, RaLHF checks the vault. Some "signed out" answers are downgraded to "couldn't tell" on purpose, because they look like a slow or blocked site. "Couldn't tell" lets the run start |
| **The bug, simply** | It skips the AI only when the check says "signed out". When the page check says "still waiting" ("couldn't tell"), the AI still runs on a login page | If the browser never answers, the read waits forever. The window looks stuck and Cancel does nothing | Blocked, slow, challenged or network-failed checks end as "signed out", so signed-in apps get parked at **Needs sign in** | A signed-out user sees "Queued → Collecting" for 15-60 s, then "Sign-in required" |
| **Example** | Netflix: the user clicks "I'm signed in" on the login page before typing a password. The AI runs for about 40 s and costs money | Amazon: the user is on Your Orders, the page freezes while RaLHF reads it, and Cancel doesn't stop the check | Oakville Hydro (PROD): the account API was silent for 2 min after sign-in → "network failure" → AI said "signed out" → parked. **Try again** passed in 0.25 s | WhatsApp: the user logged out from the phone and re-added the app. The check saw the QR code ("couldn't tell"), and the panel said "Collecting" for about 20 s |
| **Before** | Login page + "couldn't tell" → **AI called** | Frozen page → **waits forever**, Cancel ignored | "Couldn't tell" → **"signed out"** → parked | Signed out, but the pre-check can't tell → **"Collecting"** |
| **After** | Login page + anything other than "signed in" → **no AI**, one short check (8 s at most) | Each browser step has a **time limit and listens to Cancel**. A timeout gives "couldn't tell" | A real **"couldn't tell"** answer → recheck, then **unsure park**. Only a real sign-out parks as definite | Pre-check "couldn't tell" → still try the run, but show **"Checking sign-in"**, not "Collecting" |
| **Repo** | RaLHF-local | RaLHF-local | RaLHF-local | RaLHF-local, plus **web** for the panel label (Nitin's area) |
| **Main files** | `declaredProbeSignIn.ts` (login-page rule) | `signInPageObservation.ts` | `authProbeVerdict.ts`, `signInProbeCadence.ts`, `storedSessionCheck.ts`, `destinationSessionCheck.ts` | `declaredProbeSignIn.ts` (`INCONCLUSIVE_SESSION_RULES`), the panel state, web label |
| **Risk and review** | Low. Normal review | **Vault-sensitive**: written reason + independent security review | Medium-high. **Vault-sensitive**. A new answer type touches every reader | Medium. Needs a team OK. Shares the new answer with 4384 |
| **Who decides** | Fixed code | Fixed code | Fixed code | Fixed code. Panel wording is Nitin's |

## 2. How they fit together

```
  ① 4489  (AI rule on the login page)    ─┐
                                          ├─ independent: can run at the same time
  ② 4490  (time limit on the page read)  ─┘
                │
                ▼
  ③ 4384 + 4408 together: one new "couldn't tell" answer
        ├─ during a run       → recheck, then unsure park   (4384)
        └─ before collecting  → "Checking sign-in"          (4408)
                │
                ▼
  ④ web: label for "Checking sign-in" (check with Nitin first)
```

1. **4489 and 4490** are small, touch different files, and can go in parallel.
2. **4384 and 4408** go in one PR, because both depend on the new "couldn't tell" answer. Done separately, they would undo each other.
3. **Web** gets one small change: a label for "Checking sign-in".

## 3. PR plan

| PR | Tickets | Repo / worktree | Depends on | Review |
| --- | --- | --- | --- | --- |
| A | 4489 | RaLHF-local · `worktrees/BOTFOOD-4489/RaLHF-local` | — | One fresh reviewer |
| B | 4490 | RaLHF-local · `worktrees/BOTFOOD-4490/RaLHF-local` | — | Fresh reviewer + security review (vault-sensitive) |
| C | 4384 + 4408 | RaLHF-local · `worktrees/BOTFOOD-4384/RaLHF-local` | A merged (same file) | Fresh reviewer + security review (vault-sensitive) |
| D | 4408 label | web · `worktrees/BOTFOOD-4408/web` | C's new panel state; Nitin's OK | One fresh reviewer |

Order: A and B in parallel → C → D. Each lands on DEV, gets QA, and only then moves to Done.

## 4. Per-ticket plan

### A. 4489: no AI on a login page

- **Change:** the login-page rule in "I'm signed in" stops the AI for **any** answer that isn't "signed in", including "still waiting" from the page check.
- **Done when:** an "I'm signed in" click on a login page never starts the AI, and answers within 8 s.
- **Tests:** a public authentication test using the real "still waiting" answer. The existing test missed it because its fake page check always returned nothing. The test must fail on today's code.
- **Docs:** none, because the product rule ("8 s at most, no AI on a login page") is already written.

### B. 4490: page read always finishes

- **Change:** the three browser calls that read the user's page get a time limit and listen to Cancel. A timeout gives "couldn't tell". It must not close the user's sign-in tab.
- **Done when:** a browser that never answers can't hold the check past its limit, and Cancel settles at once.
- **Tests:** three cases: browser never answers, quick-check limit runs out, user cancels.
- **Security:** vault-sensitive file, so the PR needs a written reason. It adds no new reads, only limits on existing ones.

### C. 4384 + 4408: a real "couldn't tell" answer

**4384 part (during a run and after sign-in):**
- Add a real "couldn't tell" answer. Use it for:
  - a bot-block (403 or 429 on a challenge page, such as a redirect to robots.txt);
  - a check that runs out of time;
  - a security check straight after a confirmed sign-in;
  - a network failure.
- **Recheck before deciding:** after "couldn't tell", wait (for example 30 s, then 60 s) and check again before asking the AI.
- **AI on an empty copy:** if the session copy is empty or failed, the AI returns "couldn't tell", not a guess.
- "Couldn't tell" never parks an app as a definite sign-out. Recovery runs first (vault check, copy, one retry). Park only if that also fails, and then as **unsure**.
- Give checks more time on a busy machine, or retry once with a longer limit.

**4408 part (before collecting):**
- Pre-check "couldn't tell" → still try the run, but the panel says **"Checking sign-in"** instead of "Collecting".
- Never leave an in-run sign-in window open with nothing watching it.

**Done when:**
- A bot-block, a timeout, a challenge right after sign-in, or a short network failure never parks a signed-in app by itself.
- An app whose API is briefly down right after sign-in is detected as signed in without **Try again**.
- A real sign-out still parks, after recovery.
- A signed-out user never sees "Collecting".

**Tests:**
- Unit tests on the verdict rules.
- A BDD scenario for each trigger (runs in PR CI, not locally).

**Docs:** update the app-extraction PRD, because what the user sees changes.

### D. web: "Checking sign-in" label

- Show the new panel state from C.
- Wording is Nitin's call, so ask him first.

## 5. Open decisions

| # | Question | Who | Blocks |
| --- | --- | --- | --- |
| 1 | 4408: is "still try the run, but show 'Checking sign-in'" the behaviour we want? Or is today's "Collecting" expected? | Team (sign-in owners) | C (4408 part), D |
| 2 | Wording for "Checking sign-in" | Nitin | D |
| 3 | Recheck timing after "couldn't tell" (30 s then 60 s?) | Team | C |

## 6. Out of scope

- **Pizza Pizza's one-tab sign-in.** Its sign-in lives in one tab's storage, so it needs the in-window check fix (BOTFOOD-4381) or carrying that storage into the app profile. That's separate work.
- **Package declaration audit.** Adding "didn't end on the login page" to apps like Uber Eats, so they give a clear "signed out". It's optional, done per app, and needs coordinating with Nitin's schema.org migration.
- **Prod deploy.** On-call handles it.

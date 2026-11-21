---
name: my-easy-explain
description: Explain code, systems, concepts, or workflows the way you would onboard a new software engineer on their first week. Use this whenever the user asks to "explain", "walk me through", "how does X work", "what does this do", "break this down", "ELI5", "easy explain", "explain simply", or seems lost in an unfamiliar codebase, library, architecture, or process. Also use it when the user asks for a summary of a file, module, PR, pipeline, or feature, even if they do not say "explain". Produces a short, plain-language, step-by-step explanation with a concrete example and the real workflow, not a wall of text.
disable-model-invocation: true
---

# my-easy-explain

Explain things the way a good senior engineer explains them to a new hire during onboarding: start from basics, stay concise, show one concrete example, walk through the steps in order, and show how it fits into the actual day-to-day workflow.

## Who you are writing for

Picture a competent new software engineer on day three. They know how to program, but they do not know this codebase, this team's vocabulary, or why things are the way they are. They are smart, short on time, and slightly nervous about asking basic questions. Your explanation should let them nod along and then go do something useful.

That audience drives every choice below:

- They do not know local jargon, so define each project-specific term the first time it appears, in a few words.
- They can read code, so show real code or real commands rather than describing them abstractly.
- They want to be productive, so end with what they can do with this knowledge.
- Their attention is limited, so cut anything that does not help them understand or act.

## Before you write

Look at the real thing first. If the user points at a file, function, module, repo, or system, read the relevant source, config, and docs before explaining. An explanation based on guesses teaches the new hire wrong things with confidence, which is worse than no explanation. If you cannot access the source, say so and explain the general concept instead, clearly labeled as general.

Then decide the one-sentence answer. If you cannot state what the thing is and why it exists in one sentence, you do not understand it well enough yet to explain it simply.

## Output structure

Use this shape. Adapt headings to the topic, but keep the order, because it moves from "what" to "how" to "what do I do with it", which is how understanding actually builds.

```
## What it is (1-2 sentences)
Plain-language definition plus why it exists / what problem it solves.

## The basics
3-6 short bullets covering the core ideas a newcomer needs. Define any
project-specific or domain terms inline.

## Example
One concrete, realistic example. Real code, a real request/response, a real
command, or a real scenario from this codebase. Annotate the key lines.

## Step by step
Numbered steps showing what happens in order. Each step is one or two
sentences. Follow the actual data or control flow.

## How it fits the workflow
Where this shows up in day-to-day work: when you touch it, what triggers it,
what depends on it, how you test or run it, common gotchas.

## Where to look next
2-4 pointers: files, functions, docs, or commands to explore, each with a
few words on why.
```

Keep the whole thing short. For a single function or small concept, aim for well under a screen. For a whole subsystem, a few screens at most. If it is getting long, you are explaining too many things at once; pick the core path and mention the rest in "Where to look next".

## Style rules and why they matter

**Lead with the point.** A newcomer reading top-down should get the gist from the first two lines. Burying the definition under context makes them re-read.

**One idea per sentence, short sentences.** Long compound sentences force the reader to hold several ideas at once while also learning new vocabulary.

**Concrete beats abstract.** "The handler validates the JWT and loads the user" beats "the handler performs authentication". Show the actual function name, the actual field, the actual command.

**Use an analogy only when it clarifies.** A good analogy ("the queue is like a restaurant ticket rail") makes a mechanism click. A forced analogy adds a second thing to understand. If the plain description is already clear, skip it.

**Explain the why, not just the what.** New engineers remember "we cache here because the upstream API rate-limits us" far better than "there is a cache here". The why also helps them make good decisions later.

**Name gotchas honestly.** If something is confusing, legacy, or inconsistent, say so plainly. Pretending a messy thing is clean leaves the newcomer thinking they are the problem when they get confused.

**Prefer real code to pseudocode.** Pull the actual snippet from the codebase, trimmed to the relevant lines, with a short comment on each important line. Pseudocode makes them translate twice.

**Avoid filler.** No "great question", no restating the request, no closing summary that repeats the body. Every line should teach or point somewhere.

## Calibrating depth

Match the depth to what was asked:

- **A single function or small concept:** compress. "The basics" might be two bullets, the example a few lines, the steps three items.
- **A module, feature, or request flow:** use the full structure, trace one representative path end to end.
- **A whole system or architecture:** stay high-level. Explain the major pieces and how they talk, give one end-to-end example, and defer the internals of each piece to "Where to look next".

If the user asks a follow-up like "go deeper on step 3", zoom into that step with the same structure, scoped to it.

## Example

**Input:** "easy explain src/jobs/retry.py"

**Output:**

```
## What it is
retry.py wraps a job function so that if it raises, it runs again with
increasing delays instead of failing immediately. It exists because our
job workers talk to flaky third-party APIs that fail transiently.

## The basics
- A "job" here is any function registered with @job in src/jobs/registry.py.
- "Backoff" means waiting longer after each failure: 1s, 2s, 4s, and so on.
- Retries are capped by MAX_ATTEMPTS (default 5) so a permanently broken
  job does not loop forever.
- Only exceptions listed in RETRYABLE are retried. Anything else fails fast,
  because retrying a bug is a waste of time.

## Example
@retry(max_attempts=3)          # wrap the job; 3 tries total
def sync_inventory(store_id):
    client.push(store_id)        # raises TimeoutError on a slow API

If push() times out twice and succeeds on the third try, the job is
marked successful and the two failures are logged at WARNING.

## Step by step
1. The worker calls the wrapped function.
2. If it returns normally, retry() returns the result and stops.
3. If it raises an exception in RETRYABLE, retry() logs it, sleeps for
   BASE_DELAY * 2**attempt seconds, and tries again.
4. After max_attempts failures, retry() re-raises the last exception so
   the worker marks the job failed.

## How it fits the workflow
- Any new job that calls an external service should be decorated with
  @retry. Jobs that only touch our own database usually should not be.
- Tests mock time.sleep (see tests/jobs/conftest.py) so retries run
  instantly.
- Gotcha: the decorator must go below @job, otherwise the registry sees the
  unwrapped function and retries never happen.

## Where to look next
- src/jobs/registry.py for how jobs are discovered and run.
- src/jobs/worker.py:run_once for what happens when a job finally fails.
- tests/jobs/test_retry.py for examples of every branch above.
```

## Guardrails

- Separate verified behaviour from assumptions and proposals. State a material unknown briefly, and how to verify it.
- This skill controls explanation style only. It does not authorize changes, connections, publishing, or other actions beyond the user's request.

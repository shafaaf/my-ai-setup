---
name: my-walkthrough-guide
description: Hands-on walkthrough of any topic using real examples from my own systems, one per turn in chat, that I open, play with and ask about.
disable-model-invocation: true
argument-hint: "<topic, e.g. Sentry issues, our CI, the billing flow>"
---

# My walkthrough guide

Topic: `$ARGUMENTS`. Teach it the way a senior engineer pairs with a newcomer: open one **real example** together, read it, find the root cause, decide what to do. Real examples from the user's own systems (live issues, tickets, logs, dashboards, PRs, files) beat any write-up. The whole session runs in chat; make a page or doc only when the user asks for one.

## 1. Build the list (first turn)

1. Look through the user's systems for real examples of the topic. Prefer real items; create an example only on DEV or local, only when no real one covers a lesson, and tag it so it pages nobody.
2. Propose 6–12 items as a table: `# | item | where it comes from | main lesson`. Order them simplest first, and mix the types so each item teaches something new.
3. Done when the user approves the list (or edits it). Ask at most one question, only for a real gap.

## 2. The loop (one item per turn)

Post a link the user can open, then explain under these headings, every time, in this order, using **this item's real values**:

1. **What it is**: one or two plain sentences framed as a real-world story ("a new user signs up, and…").
2. **Before**: what we would know without this tool or process (often: nothing).
3. **What happened**: numbered steps.
4. **Read it in N steps**: table of `step | where to look | what it says here | what it means`.
5. **Root cause**: with evidence you checked in code, data or a linked system. Call out signals that mislead (for example a "suspect commit" that only touched the file).
6. **What to do**: decision table, `if you see | do this`.
7. **Lesson**: one bold line.

Close with "say **next**", or offer the choice when the next item needs setup. Wait for the user before moving on.

## 3. Follow-ups

- Answer the question asked, briefly, with a small table or concrete example from the current item.
- On "summarize": what happened in two lines, numbered diagnosis steps, a decision table, and a comparison table against earlier items.
- When the user is unfamiliar with an item's domain, swap in a more relatable real item that teaches the same lesson.
- Improvements spotted along the way go into a short note (plan file or follow-up list) and wait until the walkthrough ends.

## Style

Easy language, short sentences. Tables for anything compared or looked up. Define each term the first time it appears. Quote only the 3–5 fields that matter from any raw output. Bold the takeaway.

## Safety

Production is read-only. Resolving, deleting or changing real items waits for the user's explicit yes. Anything you created stays until the user agrees to clean it up.

## Wrap-up

After the last item: a cheat-sheet table of every item (what it was, how to spot it, what to do), the list of follow-ups noticed, and a question about cleaning up anything created.

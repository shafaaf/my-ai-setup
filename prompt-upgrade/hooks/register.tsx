import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { UpgradeQuestion, UpgradeResult, UpgradeRun } from '../types'

const COMMAND = 'prompt-upgrade'
const PANE = 'prompt-upgrade'
const SKIPPED = '(skipped)'

const IDLE: UpgradeRun = {
  phase: 'idle', stage: 'check', token: 0, draft: '', questions: [], answers: [], typingFor: -1,
  result: null, error: '', showDiagnosis: false, editing: false,
}
const run = atom({ plugin: 'prompt-upgrade', key: 'run' } as const, IDLE, { shape: 'run-3' })

const STEPS = ['Your prompt', 'Questions', 'Rewrite', 'Review']
const TIMEOUT_MS = 120_000

function failure(reply: { reason: string; status?: number | null; error?: unknown }): string {
  if (reply.reason === 'aborted') return 'The model took longer than 2 minutes, so it was stopped. Try again.'
  const detail = reply.status ? ` (HTTP ${reply.status})` : ''
  return `The model call failed: ${reply.reason}${detail}.`
}

// What the person has typed in the inline editor so far; read when they save.
let editBuffer = ''

function words(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

const USAGE = [
  'Usage: /prompt-upgrade <your rough prompt>',
  'Optional, on their own lines after the prompt:',
  '  Outcome: what you actually want out of it',
  '  Runner: who or what will run it (ChatGPT, Claude, an app, a coding agent)',
  '  Audience: who reads the output',
].join('\n')

function pick(lines: string[], label: string): string | undefined {
  const re = new RegExp(`^\\s*${label}\\s*:\\s*(.+)$`, 'i')
  for (const line of lines) {
    const m = re.exec(line)
    if (m) return m[1].trim()
  }
  return undefined
}

// The user's template, word for word, with the placeholders they gave filled in.
export function buildPrompt(args: string): string {
  const lines = args.split('\n')
  const outcome = pick(lines, 'outcome')
  const runner = pick(lines, 'runner')
  const audience = pick(lines, 'audience')
  const rough = lines
    .filter(l => !/^\s*(outcome|runner|audience)\s*:/i.test(l))
    .join('\n')
    .trim()
  return `You are a world-class prompt engineer. I will give you a rough prompt. Diagnose why it will underperform, then rewrite it into a prompt that reliably produces a dramatically better result.

My rough prompt:
${rough}

What I actually want out of it: ${outcome ?? '[THE OUTCOME OR DECISION THIS PROMPT SERVES]'}
Who or what will run it: ${runner ?? '[e.g. ChatGPT, Claude, an app, a coding agent]'}, and who reads the output: ${audience ?? '[AUDIENCE]'}

If my goal is unclear enough to change the rewrite, ask me up to 2 clarifying questions first. Otherwise proceed.

Deliver:
1. DIAGNOSIS: what the original is missing or doing wrong, checked against role, context, specific task, constraints, output format, examples, and success criteria. Be concrete about what each gap costs in the output.
2. IMPROVED PROMPT: a clean, copy-paste-ready rewrite. Give it an expert role, the needed context, a precise task, explicit constraints, and an exact output format. Use clearly labeled [PLACEHOLDERS] for anything I must supply so the prompt stays reusable. Do not use em dashes.
3. CLARIFYING QUESTIONS TO EMBED: if the task benefits from it, the 1 to 3 questions the AI should ask the user before answering, written into the prompt itself.
4. KEY UPGRADES: a short bullet list, one line each, naming what you changed and why it improves the result.

Quality bar: the rewritten prompt should be specific, unambiguous, and self-contained enough that a stranger could paste it and get a strong result on the first try. Prefer clarity over length, but do not leave it thin.`
}

// How the pane gets machine-readable answers back. Kept apart from the template.
const JSON_RULES = `Reply with one JSON object and nothing else (no code fences).

If you need clarifying questions first, reply:
{"questions": [{"question": "...", "options": ["...", "...", "..."]}]}
with at most 2 questions, each with 2 to 4 short multiple-choice options. Ask only what would change the rewrite (goal, audience, constraints, budget, format).

Otherwise reply:
{"diagnosis": "...", "improved_prompt": "...", "embedded_questions": "...", "key_upgrades": ["...", "..."]}
where diagnosis is plain text (short paragraphs or "- " bullets), improved_prompt is the full copy-paste-ready prompt with the embedded clarifying questions already written into it, embedded_questions lists those questions (empty string if none), and key_upgrades has one short line per detail you added (under 60 characters each, starting with a verb).`

export function askPrompt(draft: string, questions: UpgradeQuestion[], answers: string[]): string {
  const base = buildPrompt(draft)
  if (questions.length === 0) return `${base}\n\n${JSON_RULES}`
  const qa = questions
    .map((q, i) => `Q: ${q.question}\nA: ${answers[i] && answers[i] !== SKIPPED ? answers[i] : '(skipped, use a [PLACEHOLDER])'}`)
    .join('\n\n')
  return `${base}\n\nYou already asked your clarifying questions. My answers:\n\n${qa}\n\nDo not ask anything else. Deliver the final result now.\n\n${JSON_RULES}`
}

type Parsed = { questions: UpgradeQuestion[] } | { result: UpgradeResult } | { error: string }

export function parseReply(text: string, allowQuestions: boolean): Parsed {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return { error: 'The model did not reply with JSON.' }
  let data: Record<string, unknown>
  try {
    data = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>
  } catch {
    return { error: 'The model replied with JSON that could not be read.' }
  }
  if (allowQuestions && Array.isArray(data.questions) && data.questions.length > 0) {
    const questions = (data.questions as unknown[]).slice(0, 2).flatMap(q => {
      const one = q as { question?: unknown; options?: unknown }
      if (typeof one.question !== 'string') return []
      const options = Array.isArray(one.options)
        ? one.options.filter((o): o is string => typeof o === 'string').slice(0, 4)
        : []
      return [{ question: one.question, options }]
    })
    if (questions.length > 0) return { questions }
  }
  if (typeof data.improved_prompt !== 'string' || !data.improved_prompt.trim()) {
    return { error: 'The model did not return an improved prompt.' }
  }
  return {
    result: {
      diagnosis: typeof data.diagnosis === 'string' ? data.diagnosis : '',
      improvedPrompt: data.improved_prompt.trim(),
      embeddedQuestions: typeof data.embedded_questions === 'string' ? data.embedded_questions : '',
      keyUpgrades: Array.isArray(data.key_upgrades)
        ? data.key_upgrades.filter((u): u is string => typeof u === 'string')
        : [],
    },
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description: 'Upgrade a rough prompt in a side pane',
      argumentHint: '<rough prompt>',
    })
    return next(e)
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    const draft = e.args.trim()
    if (!draft) return { text: USAGE }

    const before = await read($, run)
    const token = before.token + 1
    await update($, run, () => ({ ...IDLE, phase: 'thinking' as const, stage: 'check' as const, token, draft }))
    await $.ui.open({ id: PANE, title: 'Prompt Upgrade', focus: true })

    // The model call runs after this hook returns, so the command answers at once.
    $.clock.after(10, async () => {
      try {
        const model = await $.session.model()
        await $.store.set('last-call', { stage: 'check', model, at: await $.clock.now() }).catch(() => undefined)
        const reply = await $.model.complete({ model, prompt: askPrompt(draft, [], []), maxTokens: 8000, timeoutMs: TIMEOUT_MS })
        const now = await read($, run)
        if (now.token !== token || now.phase !== 'thinking') return
        if (!reply.isAnswered) {
          await $.store.set('last-call', { stage: 'check', model, reply }).catch(() => undefined)
          await update($, run, r => ({ ...r, phase: 'error' as const, error: failure(reply) }))
          return
        }
        const parsed = parseReply(reply.text, true)
        if ('questions' in parsed) {
          await update($, run, r => ({ ...r, phase: 'questions' as const, questions: parsed.questions, answers: parsed.questions.map(() => '') }))
        } else if ('result' in parsed) {
          await update($, run, r => ({ ...r, phase: 'done' as const, result: parsed.result }))
        } else {
          await $.store.set('last-call', { stage: 'check', model, text: reply.text.slice(0, 4000) }).catch(() => undefined)
          await update($, run, r => ({ ...r, phase: 'error' as const, error: parsed.error }))
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        await $.store.set('last-error', { stage: 'check', error }).catch(() => undefined)
        await update($, run, r => ({ ...r, phase: 'error' as const, error: `Prompt Upgrade failed: ${error}` }))
      }
    })

    return { text: 'Prompt Upgrade opened in a side pane.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Input, Text } = $.ui.resolve(e)
    const r = await read($, run)

    const cancel = async () => {
      await update($, run, x => ({ ...IDLE, token: x.token + 1 }))
      await $.ui.close({ id: PANE })
    }

    const rewrite = async (answers: string[]) => {
      const current = await read($, run)
      const token = current.token
      await update($, run, x => ({ ...x, phase: 'thinking' as const, stage: 'rewrite' as const, answers, typingFor: -1 }))
      try {
        const model = await $.session.model()
        await $.store.set('last-call', { stage: 'rewrite', model, at: await $.clock.now() }).catch(() => undefined)
        const reply = await $.model.complete({
          model,
          prompt: askPrompt(current.draft, current.questions, answers),
          maxTokens: 8000,
          timeoutMs: TIMEOUT_MS,
        })
        if ((await read($, run)).token !== token) return
        if (!reply.isAnswered) {
          await $.store.set('last-call', { stage: 'rewrite', model, reply }).catch(() => undefined)
          await update($, run, x => ({ ...x, phase: 'error' as const, error: failure(reply) }))
          return
        }
        const parsed = parseReply(reply.text, false)
        if ('result' in parsed) {
          await update($, run, x => ({ ...x, phase: 'done' as const, result: parsed.result }))
        } else {
          const error = 'error' in parsed ? parsed.error : 'The model asked more questions instead of answering.'
          await $.store.set('last-call', { stage: 'rewrite', model, text: reply.text.slice(0, 4000) }).catch(() => undefined)
          await update($, run, x => ({ ...x, phase: 'error' as const, error }))
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        await $.store.set('last-error', { stage: 'rewrite', error }).catch(() => undefined)
        await update($, run, x => ({ ...x, phase: 'error' as const, error: `Prompt Upgrade failed: ${error}` }))
      }
    }

    const answer = async (index: number, value: string) => {
      const text = value.trim()
      if (!text) return
      const current = await read($, run)
      const answers = current.answers.map((a, i) => (i === index ? text : a))
      if (answers.every(a => a)) {
        await rewrite(answers)
      } else {
        await update($, run, x => ({ ...x, answers, typingFor: -1 }))
      }
    }
    const change = (index: number) =>
      update($, run, x => ({ ...x, answers: x.answers.map((a, i) => (i === index ? '' : a)) }))
    const typeOwn = (index: number) => update($, run, x => ({ ...x, typingFor: index }))
    const skipRest = async () => {
      const current = await read($, run)
      await rewrite(current.answers.map(a => a || SKIPPED))
    }

    // Header: title, the four steps, and a status line on the right.
    const step = r.phase === 'done' ? 3 : r.phase === 'thinking' && r.stage === 'rewrite' ? 2 : 1
    const answered = r.answers.filter(a => a).length
    const status =
      r.phase === 'thinking' ? (r.stage === 'check' ? 'Reading your prompt' : 'Writing the upgrade')
        : r.phase === 'questions' ? `${answered} of ${r.questions.length} answered`
          : r.phase === 'done' ? 'Ready to use'
            : r.phase === 'error' ? 'Something went wrong' : ''
    const header = (
      <Box flexDirection="column" marginBottom={1}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold>PROMPT UPGRADE</Text>
          <Text dimColor>{status}</Text>
        </Box>
        <Box flexDirection="row" flexWrap="wrap">
          {STEPS.map((name, i) => (
            <Text
              color={i < step ? 'success' : i === step ? 'warning' : undefined}
              dimColor={i > step}
              bold={i === step}
            >
              {i < step ? '✓' : i === step ? '●' : '○'} {name}{i < STEPS.length - 1 ? '  ──  ' : ''}
            </Text>
          ))}
        </Box>
      </Box>
    )
    const yourPrompt = (
      <Box flexDirection="column" borderStyle="round" paddingX={1} marginBottom={1}>
        <Text dimColor>YOUR PROMPT</Text>
        <Text>{r.draft}</Text>
      </Box>
    )

    if (r.phase === 'idle') {
      return (
        <Box flexDirection="column">
          {header}
          <Text dimColor>Type a prompt in the box, then click Upgrade my draft in Shafaaf's Tools, or run /prompt-upgrade with your prompt.</Text>
        </Box>
      )
    }

    if (r.phase === 'thinking') {
      return (
        <Box flexDirection="column">
          {header}
          {yourPrompt}
          <Text bold color="warning">◆ {r.stage === 'check' ? 'Checking what would make this better' : 'Writing your upgraded prompt'}</Text>
          <Text dimColor>This usually takes a few seconds.</Text>
          <Box marginTop={1}>
            <Button key="cancel" plain dimColor label="Cancel" onPress={cancel} />
          </Box>
        </Box>
      )
    }

    if (r.phase === 'error') {
      return (
        <Box flexDirection="column">
          {header}
          {yourPrompt}
          <Text color="error">{r.error}</Text>
          <Box marginTop={1}>
            <Button key="close" label="Close" onPress={cancel} />
          </Box>
        </Box>
      )
    }

    if (r.phase === 'questions') {
      return (
        <Box flexDirection="column">
          {header}
          {yourPrompt}
          <Box flexDirection="row" justifyContent="space-between">
            <Text bold>A FEW QUICK QUESTIONS</Text>
            <Text dimColor>pick one each, or skip</Text>
          </Box>
          {r.questions.map((q, i) => {
            const done = r.answers[i]
            return (
              <Box flexDirection="row" marginTop={1}>
                <Box width={4}>
                  <Text color={done ? 'success' : 'warning'} bold>{done ? '[✓]' : `[${i + 1}]`}</Text>
                </Box>
                <Box flexDirection="column" flexGrow={1}>
                  <Text bold>{q.question}</Text>
                  {done ? (
                    <Box flexDirection="row">
                      <Text color={done === SKIPPED ? undefined : 'success'} dimColor={done === SKIPPED}>{done}  </Text>
                      <Button key={`q${i}-change`} plain dimColor label="change" onPress={() => change(i)} />
                    </Box>
                  ) : (
                    <Box flexDirection="column">
                      <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
                        {q.options.map((opt, j) => (
                          <Button key={`q${i}-o${j}`} plain label={opt} onPress={() => answer(i, opt)} />
                        ))}
                        <Button key={`q${i}-other`} plain dimColor label="Other (type it)" onPress={() => typeOwn(i)} />
                        <Button key={`q${i}-skip`} plain dimColor label="Skip" onPress={() => answer(i, SKIPPED)} />
                      </Box>
                      {r.typingFor === i && (
                        <Input
                          key={`q${i}-input`}
                          placeholder="Type your answer"
                          submitLabel="Answer"
                          autoFocus
                          onSubmit={value => answer(i, value)}
                        />
                      )}
                    </Box>
                  )}
                </Box>
              </Box>
            )
          })}
          <Box flexDirection="row" marginTop={1}>
            <Box marginRight={2}>
              <Button key="skip-rest" variant="primary" label="Skip the rest, upgrade now" onPress={skipRest} />
            </Box>
            <Button key="cancel" plain dimColor label="Cancel" onPress={cancel} />
          </Box>
        </Box>
      )
    }

    const res = r.result
    if (!res) return <Text dimColor>No result.</Text>

    const runIt = async () => {
      const text = res.improvedPrompt
      await $.ui.close({ id: PANE })
      // Sent once this press has settled, as the user's own message.
      $.clock.after(10, async () => {
        try {
          await $.prompt.submit({ text, asUser: true })
          await $.prompt.fill({ text: '' })
        } catch {
          await $.prompt.fill({ text })
          $.ui.toast('Prompt Upgrade: the upgraded prompt is in your box. Press Enter to send it.')
        }
      })
    }
    const edit = async () => {
      editBuffer = res.improvedPrompt
      await update($, run, x => ({ ...x, editing: true }))
    }
    const save = async (value?: string) => {
      const text = (value ?? editBuffer).trim()
      if (!text) {
        $.ui.toast('The prompt cannot be empty.')
        return
      }
      await update($, run, x => (x.result ? { ...x, editing: false, result: { ...x.result, improvedPrompt: text } } : x))
      $.ui.toast('Edits saved.')
    }
    const discard = () => update($, run, x => ({ ...x, editing: false }))
    const copy = async () => {
      const done = await $.ui.copy({ text: res.improvedPrompt, surface: e.surface })
      $.ui.toast(done.isCopied ? 'Upgraded prompt copied.' : `Could not copy: ${done.reason}`)
    }
    const toggleDiagnosis = () => update($, run, x => ({ ...x, showDiagnosis: !x.showDiagnosis }))
    const sideBySide = e.props.bodyColumns >= 70

    return (
      <Box flexDirection="column">
        {header}
        <Box flexDirection="row" marginBottom={1}>
          <Text dimColor>{words(r.draft)} words  ──  </Text>
          <Text bold>{words(res.improvedPrompt)} words</Text>
          <Text color="success">{'    '}{res.keyUpgrades.length} details added</Text>
        </Box>
        {r.editing ? (
          <Box flexDirection="row" marginBottom={1} columnGap={2}>
            <Button key="save" variant="primary" label="Save edits" onPress={() => save()} />
            <Button key="discard" plain dimColor label="Discard" onPress={discard} />
            <Text dimColor>Enter saves, Shift+Enter adds a new line</Text>
          </Box>
        ) : (
          <Box flexDirection="row" marginBottom={1} columnGap={2}>
            <Button key="run" variant="primary" label="▶ Run it" onPress={runIt} />
            <Button key="edit" plain label="Edit" onPress={edit} />
            <Button key="copy" plain label="Copy" onPress={copy} />
            <Button key="cancel" plain dimColor label="Cancel" onPress={cancel} />
          </Box>
        )}

        {res.keyUpgrades.length > 0 && (
          <Box flexDirection="column" marginBottom={1}>
            <Text bold>WHAT I ADDED</Text>
            {res.keyUpgrades.map(u => (
              <Text><Text color="success">+ </Text>{u}</Text>
            ))}
          </Box>
        )}

        <Box flexDirection={sideBySide ? 'row' : 'column'} columnGap={1}>
          <Box flexDirection="column" borderStyle="round" paddingX={1} width={sideBySide ? '50%' : undefined}>
            <Text dimColor>YOUR PROMPT</Text>
            <Text>{r.draft}</Text>
          </Box>
          <Box flexDirection="column" borderStyle="round" borderColor="warning" paddingX={1} width={sideBySide ? '50%' : undefined}>
            <Text bold color="warning">✦ UPGRADED{r.editing ? ' (editing)' : ''}</Text>
            {r.editing ? (
              <Input
                key="edit-box"
                value={res.improvedPrompt}
                rows={Math.max(8, Math.min(30, e.props.scroll.bodyRows - 14))}
                submitLabel="save"
                autoFocus
                onInput={value => {
                  editBuffer = value
                }}
                onSubmit={value => save(value)}
              />
            ) : (
              <Text>{res.improvedPrompt}</Text>
            )}
          </Box>
        </Box>

        <Box flexDirection="column" marginTop={1}>
          <Button
            key="diagnosis"
            plain
            dimColor
            label={r.showDiagnosis ? '▼ Why the original underperforms' : '▶ Why the original underperforms'}
            onPress={toggleDiagnosis}
          />
          {r.showDiagnosis && <Text>{res.diagnosis}</Text>}
        </Box>
      </Box>
    )
  })
}

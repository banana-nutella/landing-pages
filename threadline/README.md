# Threadline

A brainstorming tool for convergent thinkers. Dump raw ideas, let the AI find non-obvious, typed connections between them (and explain why), accept or reject them, then converge on the three strongest threads.

## Setup

Requires Node 20+ (tested on 22).

```bash
cd threadline
npm install
cp .env.example .env.local      # then put your key in it:
# ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

Open http://localhost:3000. The first visit loads ten example ideas (marked "example"); press **Clear** on the yellow banner to start with your own.

The key is only read on the server (`app/api/*`), never sent to the browser.

## How it works

1. **Ideas**: type an idea and press Enter. Paste a multi-line block to add one idea per line (list markers like `-`, `*`, `1.` are stripped). Hover (or tap on mobile) to edit or delete.
2. **Find connections**: sends all ideas, plus your accepted and rejected connections, to `POST /api/connect`. The AI returns up to 12 connections, each with a type, the 2–3 ideas involved, a one-sentence "why" and a confidence score.
3. **Review**: Accept or Reject each one. Rejected connections disappear and are sent on every later run as "do not suggest anything similar". Running again replaces unreviewed suggestions and keeps accepted ones.
4. **Converge**: sends accepted connections to `POST /api/converge`, which returns up to 3 threads, each with a title, synthesis, the ideas it draws on and one next action.

Everything is stored in your browser's `localStorage` (key `threadline:v1`). There are no accounts and no database.

### Connection types

| Type | Meaning |
|---|---|
| Shared mechanism | different ideas, same underlying cause |
| Inverse | one is the opposite of the other |
| Hidden assumption | both depend on something unstated |
| Combination | A plus B makes something new |
| Contradiction | these can't both be true |

## AI details

- Model: `claude-sonnet-5-5`, with adaptive thinking (effort `high` for connections, `medium` for converging).
- Structured output: the response format is generated from a zod schema (`lib/threadline.ts`) and the SDK validates the reply with zod. Extra checks (every idea label must exist, no duplicates) run after parsing. If the output is invalid JSON, fails the schema, fails a check, or is cut off, the call is retried once with a note on what was wrong; a second failure shows an error.
- Ideas are sent to the model as short labels (`I1`, `I2`, ...) and mapped back to their ids on the server, which avoids mistyped ids.
- Refusals: requests use Anthropic's server-side fallback (`fallbacks: "default"`), so if a safety classifier declines, the API retries on a recommended fallback model. If everything declines, the UI shows an error.
- Prompts live in `lib/threadline.ts`; the API wrapper and retry logic in `lib/ai.ts`.

## Checking AI output quality

With the dev server running, in another terminal:

```bash
npm run try-examples
```

This runs the example ideas through Connect, accepts connections with confidence ≥ 0.5 and rejects the rest, runs Connect again with those rejections, then Converges, printing everything.

## Files

```
app/page.tsx              page shell
components/Threadline.tsx the whole UI (client component, localStorage)
app/api/connect/route.ts  POST: find connections
app/api/converge/route.ts POST: converge on threads
lib/threadline.ts         prompts, zod schemas, label mapping
lib/ai.ts                 Anthropic client, structured call with one retry, error messages
lib/examples.ts           example ideas
scripts/try-examples.mjs  run the example set end to end from the terminal
```

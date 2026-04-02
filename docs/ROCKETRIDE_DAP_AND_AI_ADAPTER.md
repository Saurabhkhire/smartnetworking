# RocketRide (DAP) and the Smart Networking AI adapter

## What RocketRide is in *this* repo

Smart Networking uses the **RocketRide Node SDK** (`rocketride` npm package) to connect to a **DAP (Data / AI Pipeline) host**, load a **pipeline** defined as JSON (`.pipe` file), obtain a **session token**, and send **chat** requests. The pipeline wires **chat input → prompt → LLM (e.g. Mistral) → answers**.

This is **not** the legacy `https://api.rocketride.ai/v1/chat` REST shape unless you configure that URL yourself; the current code expects a **cloud or local RocketRide engine** URI such as `https://cloud.rocketride.ai` or `http://127.0.0.1:5565`.

## Files and flow

### Pipeline definition

- **`pipelines/smartnetworking-ai.pipe`** — JSON graph of nodes:
  - `chat_1` — source of user questions
  - `prompt_1` — system-style instructions
  - `llm_mistral_1` — Mistral provider; API key placeholder `${ROCKETRIDE_MISTRAL_KEY}`
  - `response_1` — collects `answers` for the client

Alternate pipeline **`smartnetworking-ai-openai.pipe`** can be selected via `ROCKETRIDE_PIPELINE_FILE` if you route LLM calls through OpenAI inside RocketRide.

### Server adapter

- **`server/src/ai/adapter.js`**
  - Reads `ROCKETRIDE_URI` / `ROCKETRIDE_BASE_URL`, `ROCKETRIDE_APIKEY` / `ROCKETRIDE_API_KEY`
  - **Skips** RocketRide when the key looks like a **placeholder** (`rr-xxxxxxxx…`) or when `AI_SKIP_ROCKETRIDE=true`
  - `RocketRideClient.connect()` → `use({ filepath })` → `chat({ token, question })`
  - Builds a `Question` with **System** instruction + user text (same content as chatbot prompts)
  - Parses `response.answers[0]` (string or `{ text }`)
  - **Fallback:** `OPENAI_API_KEY` direct to OpenAI Chat Completions API
  - **Last resort:** returns a clear message if OpenAI also fails (no uncaught throw for `callAI`)

### Routes using `callAI` / `callAICached`

- **`server/src/routes/personalization.js`** — event discovery & per-event **chatbot** (large prompts with attendee context)
- **`server/src/routes/ai.js`** — why-cards, icebreakers, briefings, etc.

### Environment variables (summary)

| Variable | Role |
|----------|------|
| `ROCKETRIDE_URI` | DAP host base URL |
| `ROCKETRIDE_APIKEY` | Bearer / API key for the SDK |
| `ROCKETRIDE_PIPELINE_FILE` | Which `.pipe` file under `/pipelines` to load |
| `ROCKETRIDE_MISTRAL_KEY` | Substituted into pipeline JSON for Mistral node |
| `AI_SKIP_ROCKETRIDE` | `true` = only OpenAI path |
| `OPENAI_API_KEY` | Direct OpenAI fallback for chat completions |
| `OPENAI_TIMEOUT_MS` | **OpenAI** HTTP timeout in ms (default **120000**). The old 8s `ROCKETRIDE_TIMEOUT_MS` was applied to OpenAI and caused *aborted due to timeout* on large personalization prompts. |
| `AI_FALLBACK_MODE` | `true` = stub text, no external calls |
| `OPENAI_ONLY` | `true` = same as skipping RocketRide — OpenAI only |

## Why the chatbot showed “assistant not available”

Typical causes:

1. **Placeholder** `ROCKETRIDE_APIKEY` (`rr-xxxxxxxx…`) — connection fails or returns empty answers.
2. **Invalid or missing** `OPENAI_API_KEY` when RocketRide is skipped or fails.
3. **Timeouts** (`ROCKETRIDE_TIMEOUT_MS`) too low on slow networks.

The adapter now treats placeholder RocketRide keys as **absent**, prefers **OpenAI** when configured, and returns a **structured error message** instead of throwing when the last provider fails. The personalization route **appends offline attendee summaries** when that degraded message is detected so the UI still shows useful lists.

## Recommended local setup

1. Set a **real** `OPENAI_API_KEY` for reliable chatbot behavior.
2. Either set **`AI_SKIP_ROCKETRIDE=true`** to skip DAP, **or** configure a valid RocketRide cloud/local key and working pipeline keys (`ROCKETRIDE_MISTRAL_KEY` etc. per your pipeline file).
3. Keep `AI_FALLBACK_MODE=false` unless you explicitly want stub replies.

## Further reading

- RocketRide product docs: [https://docs.rocketride.org](https://docs.rocketride.org)
- Pipeline file in repo: `pipelines/smartnetworking-ai.pipe`

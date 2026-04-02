# RocketRide (DAP) and the Smart Networking AI adapter

## What RocketRide is in *this* repo

Smart Networking uses the **RocketRide Node SDK** (`rocketride` npm package) to connect to a **DAP (Data / AI Pipeline) host**, load a **pipeline** defined as JSON (`.pipe` file), obtain a **session token**, and send **chat** requests. The pipeline wires **chat input → prompt → LLM (e.g. Mistral) → answers**.

This is **not** the legacy `https://api.rocketride.ai/v1/chat` REST shape unless you configure that URL yourself; the current code expects a **cloud or local RocketRide engine** URI such as `https://cloud.rocketride.ai` or `http://127.0.0.1:5565`.

## Files and flow

### Pipeline definition

- **`pipelines/new-pipeline.pipe`** — JSON graph of nodes used for **local RocketRide** development:
  - `webhook_1` / `question_1` and `chat_1`: ingest text prompts
  - `db_neo4j_1`: connects to Neo4j (credentials come from env placeholders)
  - `llm_openai_1`: calls OpenAI (API key comes from env placeholder)
  - `response_answers_1`: returns the final answer payload

Important: `new-pipeline.pipe` must **never** contain raw secrets. It should only reference env placeholders like:

- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`
- `OPENAI_API_KEY`

### Server adapter

- **`server/src/ai/adapter.js`**
  - Defaults to **local RocketRide engine** (`ROCKETRIDE_URI=http://127.0.0.1:5565`) and the local pipeline `new-pipeline.pipe`
  - **Local engine does not require** `ROCKETRIDE_APIKEY` (cloud does)
  - `AI_SKIP_ROCKETRIDE=true` or `OPENAI_ONLY=true` forces OpenAI-direct fallback (bypasses RocketRide)
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
| `ROCKETRIDE_URI` | RocketRide engine base URL (local default: `http://127.0.0.1:5565`) |
| `ROCKETRIDE_APIKEY` | Only needed for RocketRide cloud (not local engine) |
| `ROCKETRIDE_PIPELINE_FILE` | Which `.pipe` file under `/pipelines` to load (default: `new-pipeline.pipe`) |
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

1. Start the RocketRide engine locally and set `ROCKETRIDE_URI=http://127.0.0.1:5565`.
2. Set `ROCKETRIDE_PIPELINE_FILE=new-pipeline.pipe`.
3. Set `OPENAI_API_KEY` and `NEO4J_URI` / `NEO4J_USER` / `NEO4J_PASSWORD` so the pipeline can call OpenAI + Neo4j.
4. Keep `AI_FALLBACK_MODE=false` unless you explicitly want stub replies.

## Further reading

- RocketRide product docs: [https://docs.rocketride.org](https://docs.rocketride.org)
- Pipeline file in repo: `pipelines/new-pipeline.pipe`

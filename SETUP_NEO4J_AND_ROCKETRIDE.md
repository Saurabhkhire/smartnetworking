# Neo4j and RocketRide — full setup guide

This document walks through everything needed to run the **Smart Networking / VentureGraph** backend: graph database schema, reference data, environment variables, and the RocketRide AI API used for “why-cards” and related text.

**See also:** [RocketRide DAP + AI adapter (current SDK & pipelines)](./docs/ROCKETRIDE_DAP_AND_AI_ADAPTER.md) · [Algorithm technical deep dive](./docs/ALGORITHM_TECHNICAL_DEEP_DIVE.md) · [Mock data & emails](./docs/MOCK_DATA_REFERENCE.md)

---

## Part A — Neo4j (graph database)

### A.1 What you need installed or provisioned

| Item | Purpose |
|------|---------|
| A **Neo4j 5.x** database | AuraDB Free (cloud) or Neo4j Desktop / Docker locally |
| **Credentials** | URI, username, password (Aura shows these once at creation) |
| **Neo4j Browser** or **cypher-shell** | Run schema and optional Cypher seeds |

This app uses the official `neo4j-driver` and expects variables: `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `NEO4J_DATABASE` (default database name is usually `neo4j` on Aura).

### A.2 Step 1 — Create the database

**Option 1 — Neo4j Aura (recommended for demos)**

1. Open [Neo4j Aura Console](https://console.neo4j.io) and sign in (or create an account).
2. Click **New instance** → choose **AuraDB Free** (or a paid tier if your org requires it).
3. Choose a region close to your users and give the instance a name (e.g. `venturegraph` or `smart-networking`).
4. When provisioning finishes, **copy and store securely**:
   - **Connection URI** — looks like `neo4j+s://xxxx.databases.neo4j.io`
   - **Username** — typically `neo4j`
   - **Password** — **shown only once**; reset it in the console if you lose it.
5. Wait until instance status is **Running** (often 1–3 minutes).
6. Open **Open with Neo4j Browser** (or use the URI in Neo4j Browser / Workspace).
7. Connect with the username and password you saved.
8. Sanity check: run:

```cypher
RETURN 1 AS test;
```

You should see one row with `test = 1`.

**Option 2 — Local Neo4j**

1. Install [Neo4j Desktop](https://neo4j.com/download/) or run Neo4j from Docker using the official image.
2. Create a DBMS, set a password, and start it.
3. Use a bolt URI such as `neo4j://localhost:7687` or `bolt://localhost:7687` depending on your setup (match what the Neo4j UI shows for “connect”).

### A.3 Step 2 — Apply uniqueness constraints

Constraints enforce one node per logical id for each label the app uses. Run **each** statement below in Neo4j Browser (or run them one-by-one in cypher-shell). Wait for success before the next.

```cypher
CREATE CONSTRAINT person_id   IF NOT EXISTS FOR (p:Person)         REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT skill_id    IF NOT EXISTS FOR (s:Skill)          REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT event_id    IF NOT EXISTS FOR (e:Event)          REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT company_id  IF NOT EXISTS FOR (c:Company)        REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT group_id    IF NOT EXISTS FOR (g:Group)          REQUIRE g.id IS UNIQUE;
CREATE CONSTRAINT insight_id  IF NOT EXISTS FOR (i:PersonaInsight) REQUIRE i.id IS UNIQUE;
```

**Verify:**

```cypher
SHOW CONSTRAINTS;
```

You should see **6** constraint rows (names may vary slightly by Neo4j version, but count should match).

### A.4 Step 3 — Create indexes

Indexes speed up matching and lookups on common properties and relationship types.

**Core person, skill, and event indexes:**

```cypher
CREATE INDEX person_company  IF NOT EXISTS FOR (p:Person) ON (p.companyName);
CREATE INDEX person_purpose  IF NOT EXISTS FOR (p:Person) ON (p.purpose);
CREATE INDEX skill_category  IF NOT EXISTS FOR (s:Skill)  ON (s.category);
CREATE INDEX event_type      IF NOT EXISTS FOR (e:Event)  ON (e.type, e.date);
```

**Optional but recommended — indexes on `MET` relationships** (used heavily for ratings and event ties):

```cypher
CREATE INDEX met_event       IF NOT EXISTS FOR ()-[r:MET]-() ON (r.eventId);
CREATE INDEX met_rating      IF NOT EXISTS FOR ()-[r:MET]-() ON (r.rating);
CREATE INDEX met_wma         IF NOT EXISTS FOR ()-[r:MET]-() ON (r.wouldMeetAgain);
```

**Verify:**

```cypher
SHOW INDEXES;
```

You should see your custom indexes listed (exact count depends on Neo4j version and whether relationship property indexes are supported in your edition; if a `MET` index fails, check your Neo4j version docs — Neo4j 5 supports relationship indexes for these patterns).

### A.5 Step 4 — Seed the 60 canonical `Skill` nodes

The product expects a fixed taxonomy of **60** skills (`Skill` nodes with `id`, `name`, `category`). You can seed in either of two ways.

**Way 1 — Cypher in Neo4j Browser**

Paste and run the full `UNWIND` block from the project spec (also in `VentureGraph.md` section *Step 4 — Seed all 60 skill nodes*). It merges each skill by `id` and sets `name` and `category`.

**Way 2 — Node script from this repo (constraints + base indexes + skills)**

1. Install server dependencies: from the repo root, `npm install --prefix server`.
2. Ensure your `.env` file is visible to the Node process (see **Part C** — for `npm run dev` under `server/`, use `server/.env`).
3. From the **`server`** directory run:

```bash
node src/db/seed.js
```

This script (`server/src/db/seed.js`) will:

- Verify connectivity with `RETURN 1`
- Create the **six** constraints
- Create **four** person/skill/event indexes (it does **not** currently add the three `MET` relationship indexes — add those manually in Browser if you use them)
- `MERGE` all **60** `Skill` nodes from the embedded list

**Verify skill count:**

```cypher
MATCH (s:Skill) RETURN count(s) AS skills;
```

Expected: **60**.

### A.6 Step 5 — What counts as “fully set up” for Neo4j

| Check | Expected |
|--------|-----------|
| `SHOW CONSTRAINTS` | 6 uniqueness constraints on the labels above |
| `MATCH (s:Skill) RETURN count(s)` | 60 |
| App can connect | Server logs `✓ Neo4j connected` on startup |

**Note:** `Person`, `Event`, `Company`, `Group`, `PersonaInsight`, and relationships like `MET`, `HAS_SKILL`, etc. are created by **application flows and APIs** as users and events are used — the baseline **reference data** you must preload for a fresh DB is primarily the **constraints**, **indexes**, and **60 skills**.

---

## Part B — RocketRide AI

RocketRide is an external LLM API. This server calls it over HTTP to generate short explanations (“why-cards”) and similar copy. Implementation: `server/src/ai/adapter.js` (`POST {ROCKETRIDE_BASE_URL}/chat` with Bearer token).

### B.1 Step 1 — Create an account and API key

1. Sign up on the **RocketRide** platform (use the official site / console linked from your RocketRide onboarding).
2. In the product UI, open **Settings** → **API Keys** (or equivalent).
3. **Create a new API key**; name it something identifiable (e.g. `smart-networking-local`).
4. Copy the key immediately and store it in a password manager. Treat it like a password.

### B.2 Step 2 — Environment variables

Add these to the **server** environment (see **Part C** for file location). Use `.env.example` at the repo root as a template.

| Variable | Typical value | Meaning |
|----------|----------------|---------|
| `ROCKETRIDE_API_KEY` | `rr-...` | Bearer token for the API |
| `ROCKETRIDE_BASE_URL` | `https://api.rocketride.ai/v1` | API base path |
| `ROCKETRIDE_MODEL` | `rocketride-pro` | Model id sent in the JSON body |
| `ROCKETRIDE_TIMEOUT_MS` | `8000` | Request timeout in milliseconds |
| `AI_FALLBACK_MODE` | `false` | If `true`, skips real API calls and returns stub text (also skips if key is missing) |

**Behavior:** If `AI_FALLBACK_MODE=true` **or** `ROCKETRIDE_API_KEY` is empty, `adapter.js` returns a short placeholder string instead of calling RocketRide — useful for UI work without billing or keys.

### B.3 Step 3 — Test the API (curl)

**Linux / macOS / Git Bash** (export the key first):

```bash
export ROCKETRIDE_API_KEY="rr-your-actual-key-here"
curl -X POST "https://api.rocketride.ai/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ROCKETRIDE_API_KEY" \
  -d "{\"model\":\"rocketride-pro\",\"messages\":[{\"role\":\"user\",\"content\":\"Say: API connected.\"}],\"max_tokens\":20}"
```

**Windows PowerShell** (use the real key instead of the placeholder):

```powershell
$key = "rr-your-actual-key-here"
curl.exe -X POST "https://api.rocketride.ai/v1/chat" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $key" `
  -d '{\"model\":\"rocketride-pro\",\"messages\":[{\"role\":\"user\",\"content\":\"Say: API connected.\"}],\"max_tokens\":20}'
```

You should get a JSON response with a `choices[0].message.content` field. If you see `401` or `403`, the key or URL is wrong. If you see connection errors, check firewall/VPN.

### B.4 Step 4 — Confirm the app uses RocketRide

1. Start the API with `AI_FALLBACK_MODE=false` and a valid `ROCKETRIDE_API_KEY`.
2. Trigger any route that calls `callAI` / `callAICached` (e.g. AI or matching features that generate text).
3. On failure, the adapter throws with `RocketRide API error <status>: ...` — use that message to debug.

---

## Part C — Wire `.env` to the Node server

The server entrypoint is `server/src/index.js` and calls `require('dotenv').config()` with **no custom path**. That loads `.env` from the **current working directory** when Node processes start.

The root `package.json` runs:

`npm run dev --prefix server`

That sets the working directory to **`server/`**, so **place your variables in `server/.env`**.

**Practical steps:**

1. Copy `server/.env.example` or the repo `.env.example` to **`server/.env`**.
2. Fill in Neo4j and RocketRide values.
3. Never commit real passwords or API keys; keep `server/.env` gitignored.

Minimum Neo4j block:

```env
NEO4J_URI=neo4j+s://xxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
NEO4J_DATABASE=neo4j
```

---

## Part D — End-to-end verification

1. **Neo4j:** Run constraints, indexes, seed skills; confirm `count(Skills) = 60`.
2. **Env:** `server/.env` complete.
3. **Install:** `npm install --prefix server` (and client if you run the full app).
4. **Start API:** From `server/`, `npm run dev` — confirm console shows `✓ Neo4j connected`.
5. **RocketRide:** `curl` test succeeds; `AI_FALLBACK_MODE=false` and exercise an AI route.

---

## Reference files in this repo

| File | Role |
|------|------|
| `.env.example` | Template for all env vars |
| `server/.env.example` | Server-focused template |
| `server/src/db/neo4j.js` | Driver and `runQuery` |
| `server/src/db/seed.js` | Programmatic constraints + indexes + 60 skills |
| `server/src/ai/adapter.js` | RocketRide HTTP client + fallback |
| `VentureGraph.md` | Full product spec including Cypher blocks and RocketRide section |

---

*Document generated for the Smart Networking / VentureGraph codebase. Update URLs or UI paths if RocketRide or Neo4j change their consoles.*

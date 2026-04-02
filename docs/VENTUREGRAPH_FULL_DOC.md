# VentureGraph — Complete Technical Documentation
### HackWithBay 2.0 · AI-Powered Professional Networking Platform

---

# PART 1 — ARCHITECTURE & TECHNOLOGY STACK

## 1.1 System Overview

VentureGraph is a full-stack networking platform that uses AI, graph databases, and a multi-layer matching algorithm to connect the right people at the right events. The system handles event creation, attendee registration, real-time check-in, intelligent group matching, personalized scheduling, and AI-powered chatbot discovery.

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + Vite | SPA with real-time updates |
| Styling | CSS variables + inline styles | Dual dark/light theme |
| Routing | React Router v6 | Client-side navigation |
| Backend | Node.js + Express | REST API + WebSocket server |
| Database (SQLite) | better-sqlite3 | Local development, zero-config |
| Database (Neo4j) | AuraDB + neo4j-driver | Production graph DB |
| AI (primary) | RocketRide SDK | Pipeline-based LLM orchestration |
| AI (fallback) | OpenAI gpt-4o-mini | Direct REST fallback |
| Email | nodemailer + Gmail SMTP | Schedule delivery |
| Real-time | ws (WebSocket) | Live check-in broadcasts |

---

## 1.2 Architecture Diagram

```
BROWSER (React SPA)
├── EventsCalendar    [AI sidebar chat, date+time filters, Luma import]
├── EventRoom         [Breakout groups, My Schedule, Attendees, AI chat]
├── EventJoin         [Registration form + floating AI chatbot]
├── MyEvents          [Hosted + registered events dashboard]
├── ProfilePage       [Profile, Skills, Experience, Event History tabs]
├── Checkin           [Host check-in interface with dropdown]
└── OrganizerDashboard [Scoring + group assignment controls]
        │
        │  HTTP JSON  /api/*
        │  WebSocket  ws://
        ▼
EXPRESS SERVER (:4000)
├── /api/auth          [email-only login/register, no passwords]
├── /api/events        [CRUD, by-date-range, Luma import, timesheets]
├── /api/events        [compute-scores, assign-groups, my-schedule]
├── /api/personalization [multi-event + single-event AI chat]
├── /api/ai            [icebreaker, why-card, briefing cards]
├── /api/email         [send personalized schedule to all attendees]
├── /api/profiles      [get/save extended profile]
└── /api/connections   [post-event connection ratings]
        │
        ├── DAL Layer (DB_DRIVER env var)
        │   ├── sqlite-dal.js  ← when DB_DRIVER=sqlite
        │   └── neo4j-dal.js   ← when DB_DRIVER=neo4j
        │
        ├── AI Adapter (adapter.js)
        │   ├── RocketRide session (if ROCKETRIDE_APIKEY set)
        │   └── OpenAI REST fallback (OPENAI_API_KEY)
        │
        └── Email Service (nodemailer)
            └── Gmail SMTP

DATABASES
├── SQLite  venturegraph.db (local file)
└── Neo4j   AuraDB cloud instance
```

---

## 1.3 Frontend Pages & Chatbot Locations

### AI Chatbot Surfaces

| Location | Type | Access Requirements |
|----------|------|---------------------|
| EventsCalendar sidebar | Multi-event discovery | Just be logged in |
| EventRoom floating button | Single-event deep | Just click the event (no check-in needed) |
| EventJoin floating button | Single-event preview | No check-in, no registration needed |

### Key UI Features
- **Date/time smart queries**: Sidebar AI understands "events April 1-10" or "best event on April 3 after 6pm"
- **Markdown rendering**: Bold, bullets, numbered lists, code snippets all render properly
- **Quick chips**: Pre-built question chips that populate the input on click
- **Chat history**: Last 8 turns preserved per session
- **Clear button**: Reset conversation at any time

---

# PART 2 — MATCHING ALGORITHM

## 2.1 Overview

The matching system converts a room of N strangers into optimized groups using two scoring stages and a round-planning algorithm. It runs in under 200ms for 60 attendees.

```
attendees (checked in)
     ↓
Layer 1: Role-Seek Filter    → drops pairs with 0 role overlap
     ↓
Layer 2: Deep Profile Scoring → skills, reconnect, persona, stage
     ↓
Group Planner                → N rounds, anti-repeat, balanced groups
     ↓
Timesheets                   → per-person: Round | Time | Group | Names
     ↓
Email delivery               → schedule sent to every attendee
```

---

## 2.2 Layer 1 — Role-Seek Scoring

**What it does:** Quickly identifies pairs where at least one person seeks the other's role. Any pair with zero overlap is excluded before the expensive Layer 2 computation.

**Inputs used:**
- `person.roles[]` — what you ARE (e.g. Founder, Investor, Engineer)
- `person.seeksRoles[]` — who you WANT to meet
- `wants_to_meet` — explicit "I want to meet this person" flag

**Formula:**
```
score = 0
if A.seeksRoles ∩ B.roles ≠ ∅:       score += 25
if B.seeksRoles ∩ A.roles ≠ ∅:       score += 25
if A explicitly wants to meet B:       score += 40
if B explicitly wants to meet A:       score += 40

Result range: 0 – 130
Pairs with score = 0 are DROPPED (not scored further)
```

**Example:**
```
Alice (Founder, seeks: Investor) meets Bob (Angel Investor, seeks: Founder)
Alice seeks Investor → Bob is Angel Investor: +25
Bob seeks Founder → Alice is Founder:         +25
Layer 1 score = 50
```

---

## 2.3 Layer 2 — Deep Profile Scoring

**What it does:** Enriches Layer 1 pairs using skills, past history, persona type, and company stage.

**Components:**

| Scoring Component | Points | Logic |
|------------------|--------|-------|
| Skill overlap (A→B) | +8 per shared skill | A HAS a skill B SEEKS |
| Skill overlap (B→A) | +8 per shared skill | B HAS a skill A SEEKS |
| Bidirectional skill bonus | +4 | Both directions have at least 1 overlap |
| Reconnect bonus | +20 | Both have met before AND openToRematch=true |
| Persona match | +10 | Same persona archetype (technical, operational, etc.) |
| Company stage match | +5 | Both at same funding stage |

**Total formula:**
```
totalScore = layer1Score
           + Σ(skillOverlapBonuses)
           + reconnectBonus (if applicable)
           + personaBonus
           + stageBonus
```

**Score interpretation:**
- 0–25: No significant match (usually filtered out in Layer 1)
- 25–50: Weak match (placed together only if no better option)
- 51–100: Good match (placed in Round 1 or 2)
- 101–180: Strong match (highest priority pairing)

**Continuing the Alice + Bob example:**
```
Bob has: Finance, Fundraising    → Alice seeks Finance: +8
Alice has: React, Python, ML     → Bob seeks ML:        +8
Both at Seed stage:                                      +5
Persona match (technical + financial): +10
Layer 2 additions: +31

Total score: 50 + 31 = 81 (Good match)
```

---

## 2.4 Group Planning Algorithm

**Purpose:** Given M rounds × N minutes each, assign all attendees into groups so everyone meets their best matches without repeating pairs.

### Constants
- **MAIN_ROLES**: Founder, Co-Founder, Investor, Angel Investor, VC Partner, Engineer, Product Manager, Designer, Marketing, Growth, Sales
- **OPTIONAL_ROLES**: Recruiter, Analyst, Advisor, Executive, etc.
- Main-role attendees are guaranteed a spot every round. Optional-role attendees fill gaps.

### Setup
```
numRounds = floor(durationMins / roundMins)      e.g. floor(60/10) = 6 rounds
nGroups   = ceil(mainAttendees / groupSizeMax)    e.g. ceil(60/6) = 10 groups
```

### Round-Robin Interest Distribution

Before each round, every person's "interest list" (people they scored highest with) is distributed evenly across rounds:

```
Person Alice has 10 high-interest targets, 6 rounds:
Round 1: targets [1, 7]
Round 2: targets [2, 8]
Round 3: targets [3, 9]
Round 4: targets [4, 10]
Round 5: targets [5]
Round 6: targets [6]

This prevents Alice from meeting all her top choices in round 1
and having no good options in rounds 5-6.
```

### Per-Round Phases

**Phase 1 — Seed groups**
- Sort main attendees by "how many targets fall in THIS round"
- First `nGroups` attendees each start their own group

**Phase 2 — Fill main attendees**
- Remaining main people join the group with highest `fitScore`
- `fitScore(candidate, existing_group_members)`:
  ```
  score = 0
  for each member m in group:
    if candidate already MET m:          score -= 80
    if candidate WANTS to meet m now:    score += 15
    if m WANTS to meet candidate now:    score += 15
    score += pairScore(candidate, m) × 0.25
  
  small-group bonus: (groupSizeMax - group.length) × 2
  ```

**Phase 3 — Fill from optional attendees**
- Groups under `groupSizeMin` get best-fit optional people added

**Phase 4 — Merge undersized groups**
- Any group still below minimum is merged into the smallest compatible group
- (Only reached if optional pool is exhausted)

**Phase 5 — Distribute remaining optional people**
- Leftover optional people join the smallest available group

### Anti-Repeat Mechanism
```
metPairs = new Set()

After each round:
  For each group, for each pair (a, b) in group:
    metPairs.add(canonical(a, b))

Before adding candidate to group:
  if metPairs.has(candidate + member): fitScore -= 80
```

The -80 penalty strongly discourages repeats but doesn't forbid them when attendee count is low.

---

## 2.5 Timesheet Generation

After group assignment, `buildAllPersonTimesheets()` creates a personalized schedule row for every attendee:

**Output per person:**
```
Person: Alice Chen (Founder @ Nexus AI)
  Round 1 | 18:00–18:10 | Group 3 | With: Bob Patel, Mia Johnson, Dev Sharma
  Round 2 | 18:10–18:20 | Group 1 | With: Sam Lee, Jordan Kim
  Round 3 | 18:20–18:30 | Group 5 | With: Priya Mehta, Alex Wang, Chris Yu
  ...
  Tip: Prioritize Bob Patel — score 142, you both have ML skills, he's seeking founders to fund
```

**Time formula:**
```
roundStart(r) = eventStartTime + (r-1) × roundMins
roundEnd(r)   = eventStartTime + r × roundMins
```

---

## 2.6 1-on-1 Schedule (Personal Events)

For `type=personal` (speed-networking), instead of groups:

```
slots = floor(durationMins / roundMins)

mySchedule = scoredPairs
  .filter(p => I'm in this pair)
  .sort(desc by totalScore)
  .slice(0, slots)
  .map(slot, partner, score)
```

---

# PART 3 — LLM & AI WORKFLOW

## 3.1 AI Adapter

All AI calls go through one function: `callAI(system, user, maxTokens)`

```
callAI(systemPrompt, userPrompt, maxTokens)
  │
  ├── AI_FALLBACK_MODE=true → return stub text (no LLM called)
  │
  ├── AI_SKIP_ROCKETRIDE=false → try RocketRide pipeline first
  │     │
  │     ├── Session OK → answer via pipeline → return
  │     └── Session fail → fall through to OpenAI
  │
  └── OpenAI Direct
        POST /v1/chat/completions
        model: gpt-4o-mini
        timeout: 8000ms
```

---

## 3.2 Multi-Event Discovery Chat — Full Flow

**Trigger:** User asks anything in the EventsCalendar AI sidebar.

**Example query:** "Top 3 events from April 1 to April 5 with most founders"

```
Step 1: Parse date/time from query (server-side, before LLM)
        extractDateTimeFilters(question)
        → { startDate: '2026-04-01', endDate: '2026-04-05', topN: 3 }

Step 2: Parallel DB calls
        Promise.allSettled([
          loadMergedPersonForAi(personId),   ← person profile + past events
          db.listEvents(),                    ← all 60 events
        ])

Step 3: Pre-filter events
        preFilterEvents(allEvents, { startDate, endDate })
        → 8 events in that date range

Step 4: Build cross-event attendee index (parallel)
        Promise.allSettled(
          top20Events.map(ev => db.getAttendees(ev.id))
        )
        → { eventId: { name, attendees: [{name, company, roles}] } }

Step 5: Build prompts
        system = "You are VentureGraph AI... rules... format..."
        user   = {
          person profile block,
          full event catalog (60 events),
          PRE-FILTERED EVENTS BLOCK (8 events, April 1-5),   ← KEY
          cross-event attendee index
        }

Step 6: callAI(system, user, 1000)
        → OpenAI returns ranked answer

Step 7: res.json({ answer }) → client renders markdown
```

---

## 3.3 Single-Event Chat — Full Flow

**Trigger:** User clicks AI button in EventRoom or EventJoin.

**Example query:** "Give me icebreakers for the top 5 people I should meet"

```
Step 1: Parallel DB calls
        Promise.allSettled([
          loadMergedPersonForAi(personId),
          db.getEvent(eventId),
          db.getAttendees(eventId),
        ])

Step 2: Load attendee profiles in parallel (top 25)
        Promise.allSettled(
          attendees.slice(0,25).map(a => db.getPersonWithSkillsForProfile(a.id))
        )
        → profiles: { skillsHave, skillsSeek, workExperience, projects, headline }

Step 3: Build attendee context string
        buildAttendeeContext(attendees, profiles)
        → "• Alice Chen | roles: Founder | company: Nexus AI (Seed) |
            headline: Building AI-powered CRM | work: CEO @ Nexus AI; PM @ Google |
            goal: Fundraising | skills: React, Python, ML | seeks: Finance, Fundraising |
            portfolio: SmartCRM: AI tool that auto-qualifies leads | bio: ..."

Step 4: Build prompts
        system = rules for icebreakers, top-people, role queries
        user   = event details + person profile + 60 attendee profiles

Step 5: callAI(system, user, 1200)

Step 6: Answer includes named icebreakers:
        "• Bob Patel: 'I heard you're funding early-stage AI companies —
          I'm building SmartCRM and just hit $50K MRR. What's your current
          thesis for Series A AI tools?'"
```

---

## 3.4 Email Flow

```
Host: "Run Matching & Send Emails"
  │
  ├─ POST /compute-scores → Layer 1 + 2 scoring (in memory)
  ├─ POST /assign-groups  → planIcebreakerRounds() + save to DB
  │
  └─ POST /send-schedule
        │
        ├─ Load attendees + saved groups from DB
        ├─ buildAllPersonTimesheets() → per-person schedules
        │
        └─ For each attendee:
              subject = "Your schedule for {event.name}"
              html body = {
                event header (name, date, location, host),
                group schedule table (Round | Time | Group | With),
                personalization tip (top match + reason),
                footer (VentureGraph branding)
              }
              nodemailer.sendMail({ to: person.email, ... })
              
        → returns { sent: N } count
```

---

## 3.5 RocketRide vs OpenAI Direct

| Capability | Direct OpenAI | With RocketRide |
|-----------|--------------|-----------------|
| LLM routing | Fixed model | Visual config, any model |
| DB tool blocks | Coded manually | Drag-drop Neo4j/Postgres connectors |
| Retry logic | Manual | Built-in exponential backoff |
| Response caching | Manual Map | Cached lane in pipeline |
| Cost visibility | API dashboard | Per-pipeline cost tracking |
| Prompt versioning | Git commits | Pipeline version history |
| Streaming | Manual SSE | Built-in streaming block |

**To enable RocketRide:**
1. Set `AI_SKIP_ROCKETRIDE=false` in `server/.env`
2. Configure `ROCKETRIDE_APIKEY` and `ROCKETRIDE_URI`
3. Pipeline file: `pipelines/smartnetworking-ai.pipe`

**RocketRide pipeline block structure:**
```
[Webhook Input Block]
  receives: { system, user, maxTokens }
        ↓
[Context Enrichment Block] (optional)
  queries Neo4j for additional context
        ↓
[LLM Block]
  provider: Mistral or OpenAI
  uses: ROCKETRIDE_MISTRAL_KEY or ROCKETRIDE_OPENAI_KEY
        ↓
[Output Formatter Block]
  returns: { answers: [{ text: "..." }] }
        ↓
adapter.js calls firstAnswerText() → clean string
```

---

# PART 4 — NEO4J GRAPH DATABASE FLOW

## 4.1 Graph Model

VentureGraph's graph has 7 node types and 10 relationship types:

### Nodes
```
(:Person)  ← core entity: attendee, host, registered user
(:Event)   ← networking event with all metadata
(:Skill)   ← e.g. "Python", "Fundraising", "Machine Learning"
(:Goal)    ← what a person wants from a specific event
(:Group)   ← one round-group assignment (e.g. Round 2, Group 3)
(:Company) ← employer with name + funding stage
(:Profile) ← extended profile data (headline, projects, certs)
```

### Relationships
```
(Person)-[:ATTENDED {checkedInAt}]──────► (Event)
(Person)-[:HAS_SKILL {level}]────────────► (Skill)
(Person)-[:SEEKS_SKILL {urgency}]────────► (Skill)
(Person)-[:WANTS_TO_MEET]────────────────► (Person)
(Person)-[:BLOCKED]──────────────────────► (Person)
(Person)-[:MET {rating, notes, metAt}]───► (Person)
(Person)-[:WORKS_AT {current}]───────────► (Company)
(Person)-[:HAS_GOAL]─────────────────────► (Goal)
(Group)-[:HAS_MEMBER]────────────────────► (Person)
```

---

## 4.2 Why Graph for Networking

**Mutual connection lookup (2-hop traversal):**
```cypher
MATCH path = (me:Person {id: $myId})-[:MET*1..2]-(target:Person {id: $targetId})
RETURN path ORDER BY length(path) LIMIT 1
```
This tells you "you both know Jordan Kim" — impossible with simple SQL without 4+ JOINs.

**Warm introduction finder:**
```cypher
MATCH (me:Person {id: $myId})-[:MET]->(connector)-[:MET]->(investor:Person)
WHERE 'Investor' IN investor.roles AND NOT (me)-[:MET]->(investor)
RETURN investor.name, connector.name AS introducedBy
```

---

## 4.3 Attendee Email Reference

Neo4j seed email format: `{firstname}.{lastname}.{globalIndex}@techfounder.dev`

**Bay Area Founders Mixer** attendees start at global index 120:
- `alex.rodriguez.120@techfounder.dev`
- `jordan.davis.121@techfounder.dev`
- `morgan.white.122@techfounder.dev`
- `taylor.kim.123@techfounder.dev`
- `casey.johnson.124@techfounder.dev`

Login with any of these emails (no password — email-only auth system).

Host login: `saurabhskhire@gmail.com`

---

# PART 5 — DEMO & TESTING

## 5.1 Running the Project

```bash
# Install dependencies
npm run install:all

# Start in SQLite mode (easiest, no DB setup)
npm run dev

# Start in Neo4j mode (requires AuraDB credentials in server/.env)
npm run dev:neo4j

# Seed SQLite with demo data (60 events, 240 rich attendees)
npm run db:mock:sqlite

# Seed Neo4j with demo data
npm run db:mock

# Kill ports 4000 and 5173
npm run stop:dev
```

## 5.2 Demo Walkthrough

1. **Login** as `saurabhskhire@gmail.com` (host account)
2. **Events page** — see 60 events; use AI sidebar to ask "best events April 1-5"
3. **Bay Area Founders Mixer** → click to open event room
4. **AI chatbot** → ask "Who are top 5 people I should meet and why?"
5. **My Events** → click "Run Matching & Send Emails" on the mixer event
6. **Event Room tabs** → see Breakout Groups, My Schedule, All Attendees
7. **Profile page** → view and edit your Skills, Experience, Projects tabs
8. **EventJoin** → click floating 🤖 button without registering → ask "Who are the investors?"

## 5.3 Key Configuration Options

| Setting | Value | Effect |
|---------|-------|--------|
| `DB_DRIVER=sqlite` | Default dev | Local file, no DB setup |
| `DB_DRIVER=neo4j` | Production | AuraDB graph queries |
| `AI_SKIP_ROCKETRIDE=true` | Default | Uses OpenAI directly |
| `AI_FALLBACK_MODE=true` | Testing | Returns stub text, no API calls |
| `OPENAI_API_KEY` | Required for AI | Any gpt-4o-mini compatible key |

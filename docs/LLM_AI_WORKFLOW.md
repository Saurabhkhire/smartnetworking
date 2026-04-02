# VentureGraph — LLM & AI Workflow

> How every AI-powered feature works: from user prompt to database to LLM to answer (and email).

---

## 1. AI Adapter — The Entry Point

All AI calls in the codebase go through one function:

```js
// server/src/ai/adapter.js
async function callAI(systemPrompt, userPrompt, maxTokens = 300)
```

The adapter tries **RocketRide first**, then falls back to **direct OpenAI**:

```
callAI(system, user, maxTokens)
        │
        ├─── AI_SKIP_ROCKETRIDE=true?  ─── YES ──► OpenAI Direct
        │
        ├─── Try RocketRide session
        │         │
        │         ├─ Session OK → client.chat({ token, question }) → answer
        │         │
        │         └─ Session fail / timeout → fallback
        │
        └─── OpenAI Direct
              POST https://api.openai.com/v1/chat/completions
              model: gpt-4o-mini (configurable)
              timeout: 8 seconds (ROCKETRIDE_TIMEOUT_MS)
```

---

## 2. Full Flow: User Question → Database → LLM → Answer

### 2A. Multi-Event Chatbot (EventsCalendar page)

```
User types: "Best event on April 3 between 6pm and 9pm"
            │
            │  POST /api/personalization/chat
            │  { mode: 'events', personId, question, chatHistory }
            │
            ▼
┌─────────────────────────────────────────────────────┐
│  SERVER: personalization.js                         │
│                                                     │
│  1. extractDateTimeFilters(question)                │
│     → { startDate: '2026-04-03', endDate: '2026-04-03', │
│           startTime: '18:00', endTime: '21:00' }    │
│                                                     │
│  2. Parallel DB calls:                              │
│     Promise.allSettled([                            │
│       loadMergedPersonForAi(personId),  ← person   │
│       db.listEvents(),                  ← all events│
│     ])                                              │
│                                                     │
│  3. preFilterEvents(allEvents, filters)             │
│     → only events on April 3, 18:00–21:00           │
│     → e.g. ["Bay Area Founders Mixer", "SaaS Happy  │
│               Hour", "Investor Office Hours"]        │
│                                                     │
│  4. buildEventAttendeeIndex(allEvents, 20, 15)      │
│     → parallel: getAttendees(ev.id) for top 20 evts │
│     → builds cross-event index: who's at which event│
│                                                     │
│  5. Build system + user prompts with:               │
│     - Full event catalog (all 60 events)            │
│     - PRE-FILTERED events block (highlighted)       │
│     - Cross-event attendee index                    │
│     - Person's full profile (skills, goals, past)   │
│                                                     │
│  6. callAI(systemPrompt, userPrompt, 1000)          │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
               ┌──────────────────────┐
               │  OpenAI gpt-4o-mini  │
               │  system: rules+ctx   │
               │  user: filtered data │
               │  max_tokens: 1000    │
               └──────────┬───────────┘
                          │
                          ▼
               Answer: "**Bay Area Founders Mixer** is your top pick for April 3 at 6pm...
                        ...60 founders registered, strong investor-to-founder ratio..."
                          │
                          ▼
               res.json({ answer }) → client → ChatMessageBody renders markdown
```

---

### 2B. Single-Event Chatbot (EventRoom / EventJoin)

```
User clicks "Get Icebreaker" on Jordan Kim's card
User asks: "Give me an icebreaker for Jordan Kim"
            │
            │  POST /api/personalization/chat
            │  { mode: 'event', eventId: 'evt_123', personId, question }
            │
            ▼
┌─────────────────────────────────────────────────────┐
│  SERVER: personalization.js                         │
│                                                     │
│  1. Parallel DB calls:                              │
│     Promise.allSettled([                            │
│       loadMergedPersonForAi(personId),              │
│       db.getEvent(eventId),                         │
│       db.getAttendees(eventId),                     │
│     ])                                              │
│                                                     │
│  2. loadProfilesForAttendees(attendees, 25)         │
│     → Promise.allSettled of getPersonWithSkills()   │
│     → 25 parallel DB calls, not 25 sequential!     │
│     → returns { personId: { skillsHave, workExp,   │
│                              projects, headline }}  │
│                                                     │
│  3. buildAttendeeContext(attendees, profiles)       │
│     → formats all 60 attendees into one long string │
│     → includes: name, roles, company, headline,     │
│       work history, skills, projects, bio           │
│                                                     │
│  4. Build rich system prompt:                       │
│     - "You are AI for event Bay Area Founders Mixer"│
│     - Rules for icebreakers, top-people, role queries│
│     - Person's full profile                         │
│     - All 60 attendee profiles                      │
│                                                     │
│  5. callAI(systemPrompt, userPrompt, 1200)          │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
               ┌──────────────────────┐
               │  OpenAI gpt-4o-mini  │
               │  max_tokens: 1200    │
               └──────────┬───────────┘
                          │
                          ▼
               Answer: "Great opener for Jordan Kim:
                        'I saw you're building Nexus AI — I'm also working on
                         LLM tooling at Forge AI. What's the hardest part of
                         getting enterprise customers to trust AI outputs?'"
```

---

## 3. How Emails Are Sent

```
Host clicks "Run Matching & Send Emails"
            │
            ├─ POST /api/events/:id/compute-scores
            │     → computeScores() → Layer 1 + Layer 2 pairs
            │
            ├─ POST /api/events/:id/assign-groups
            │     → planIcebreakerRounds()
            │     → buildAllPersonTimesheets()
            │     → db.saveGroupRounds()  (persists to DB)
            │
            └─ POST /api/email/send-schedule
                  { eventId, scheduleType: 'groups' | 'schedule' }
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│  server/src/routes/email.js                         │
│                                                     │
│  1. db.getAttendees(eventId)   → all attendees      │
│  2. db.loadGroupRounds(eventId) → saved round data  │
│  3. buildAllPersonTimesheets() → per-person schedule│
│                                                     │
│  For each person:                                   │
│    subject = "Your schedule for {event.name}"       │
│    body = HTML email with:                          │
│      - Event details (date, location, host)         │
│      - Their group schedule: Round | Time | Group   │
│      - Names of people in each group                │
│      - Personalization tip (top match + reason)     │
│                                                     │
│  nodemailer.sendMail({                              │
│    from: EMAIL_FROM,                                │
│    to: person.email,                                │
│    subject, html                                    │
│  })                                                 │
└─────────────────────────────────────────────────────┘
            │
            ▼
   Person receives email:
   ┌────────────────────────────────────────────────┐
   │ 🎯 Your schedule for Bay Area Founders Mixer   │
   │                                                │
   │ Round 1 · 6:00–6:10 · Group 3                 │
   │ You're with: Bob Patel, Mia Johnson, Dev Sharma│
   │                                                │
   │ Round 2 · 6:10–6:20 · Group 1                 │
   │ You're with: Sam Lee, Jordan Kim               │
   │                                                │
   │ 💡 Tip: Prioritise Bob Patel — you both have   │
   │    ML skills and he's an Angel Investor.       │
   └────────────────────────────────────────────────┘
```

---

## 4. RocketRide Workflow — Current vs. Future

### Current Flow (OpenAI Direct)

```
Personalization Route
      │
      ▼
callAI(system, user, maxTokens)
      │  (AI_SKIP_ROCKETRIDE=true)
      ▼
POST https://api.openai.com/v1/chat/completions
      │
      ▼
answer (plain text with markdown)
```

### RocketRide Pipeline Flow (when enabled)

RocketRide is a **pipeline builder** that connects blocks: webhooks, database tools, LLM calls, and output formatters into a visual DAG.

```
ROCKETRIDE PIPELINE: smartnetworking-ai.pipe
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌──────────────────┐
  │   INPUT BLOCK    │
  │ webhook / prompt │  ← receives { system, user, maxTokens } from adapter.js
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  CONTEXT BLOCK   │
  │  (optional)      │  ← could inject extra DB context from Neo4j tool
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │    LLM BLOCK     │
  │  Mistral / GPT   │  ← calls LLM with system+user prompts
  │  (configured in  │     uses ROCKETRIDE_MISTRAL_KEY or ROCKETRIDE_OPENAI_KEY
  │   pipeline JSON) │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  OUTPUT BLOCK    │
  │  (format answer) │  ← returns { answers: [{ text: "..." }] }
  └────────┬─────────┘
           │
           ▼
  adapter.js receives response, calls firstAnswerText()
  returns clean string to route → client
```

**To switch from OpenAI to RocketRide:**
1. Set `AI_SKIP_ROCKETRIDE=false` in `server/.env`
2. Set `ROCKETRIDE_APIKEY=rr-your-key`
3. Set `ROCKETRIDE_MISTRAL_KEY=your-mistral-key` (or configure OpenAI in the pipeline)
4. The pipeline file `pipelines/smartnetworking-ai.pipe` defines the block DAG

**Why use RocketRide instead of direct OpenAI?**

| Feature | Direct OpenAI | RocketRide Pipeline |
|---------|--------------|---------------------|
| Visual pipeline editor | No | Yes |
| Built-in DB tools | No | Yes (connect to Neo4j/Postgres) |
| Retry + fallback blocks | Manual | Built-in |
| Caching layer | Manual | Built-in |
| Cost tracking | API dashboard | Pipeline dashboard |
| Streaming responses | Manual | Block output |
| Prompt versioning | Git only | Pipeline versioning |
| Multi-model routing | Code | Config |

---

## 5. Prompt Architecture

### System Prompt Design

Every system prompt follows this structure:

```
1. PERSONA LINE
   "You are VentureGraph AI — a senior event discovery assistant..."

2. CAPABILITY RULES (numbered)
   "1. DATE/TIME QUERIES: When question mentions April 3..."
   "2. TOP N QUERIES: Return exactly N, ranked by..."
   "3. PERSON LOOKUPS: Scan PER-EVENT ATTENDEE LISTS..."

3. FORMAT RULES
   "Use numbered list for ranked answers..."
   "End EVERY reply with: **Reasoning:** ..."

4. NEGATIVE RULES
   "NEVER claim you lack information present in context"
   "NEVER give generic advice"
```

### User Prompt Structure

```
PERSON ASKING (full profile):
  Name, Roles, Company, Headline, Work, Goals, Skills, Projects, Bio, Past Events

=== FULL EVENT CATALOG (N events) ===
  One line per event: name | type | date+time | location | attendees | description

=== PRE-FILTERED EVENTS (if date/time query) ===
  Only the events matching the user's date/time criteria

=== CROSS-EVENT ATTENDEE LISTS (top events) ===
  Per event: "Event Name [type · date · location]: Alice (Nexus AI) [Founder], Bob (DataFlow) [Investor]..."

Conversation history (last 8 turns)

QUESTION: [user's actual question]
```

---

## 6. Date/Time Query Parsing (Server-Side)

The backend pre-parses the question **before calling the LLM**, so the AI receives already-filtered data instead of having to figure out dates itself.

```js
extractDateTimeFilters("Best event on April 3 between 6pm and 9pm")
→ {
    startDate: '2026-04-03',
    endDate:   '2026-04-03',
    startTime: '18:00',
    endTime:   '21:00',
  }

preFilterEvents(allEvents, filters)
→ [events where date='2026-04-03' AND startTime between 18:00-21:00]
```

Supported patterns:
- `"April 1 to April 10"` → date range
- `"Apr 1-10"` → compact date range
- `"April 3"` → single day
- `"6pm to 9pm"` → time range
- `"6pm–9pm"` / `"between 6 and 9pm"` → time range
- `"after hours"` / `"evening"` → startTime ≥ 17:00
- `"morning"` → 06:00–12:00
- `"top 3"` / `"best 5"` → topN = 3 or 5

---

## 7. Token Budget Strategy

| Mode | Max Tokens | Why |
|------|-----------|-----|
| Multi-event discovery | 1000 | Needs space for ranked event list + reasoning |
| Single event (icebreakers) | 1200 | Needs per-person openers for 5-8 people |
| Why-card / briefing | 300 | Short cards, fast responses |
| Group rationale | 300 | One paragraph per group |

Context window usage per request (~8,000 tokens typical for 60-attendee event):
```
System prompt:      ~400 tokens
Person profile:     ~200 tokens
60 attendee rows:   ~4,800 tokens (80 tokens/person avg)
Event metadata:     ~300 tokens
History (8 turns):  ~600 tokens
User question:      ~50 tokens
─────────────────
Total input:        ~6,350 tokens + max_tokens output
```

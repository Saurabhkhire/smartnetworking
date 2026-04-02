# VentureGraph — Smart Networking Platform

> **HackWithBay 2.0 · Track 9: Neo4j + RocketRide AI**

Graph-powered event networking with AI-driven attendee matching, personalised recommendations, rotating breakout groups, and real-time Luma event import.

---

## What It Does

VentureGraph turns chaotic networking events into structured, high-value interactions.

- **Smart Matching** — Two-layer scoring engine pairs attendees by role-seek alignment and deep profile compatibility (skills, work history, company stage)
- **AI Chatbot** — Date/time-aware event discovery across all events or deep intelligence for a single event; accessible before check-in
- **Rotating Groups** — Greedy round-robin group planner with anti-repeat tracking generates per-person timesheets
- **Luma Import** — Apify scraper pulls live events + full attendee profiles (name, email, LinkedIn, bio) and dual-writes to both SQLite and Neo4j
- **Email Blasts** — AI-personalised match emails sent to every attendee post-algorithm

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, react-router-dom v6 |
| Backend | Node.js + Express (port 4000), WebSocket (ws) |
| Graph DB | Neo4j AuraDB — Cypher queries |
| Embedded DB | SQLite — better-sqlite3 |
| AI / LLM | OpenAI GPT-4o-mini · RocketRide SDK pipeline |
| Event Import | Apify (lexis-solutions~lu-ma-scraper) |
| Email | nodemailer (SMTP) |
| Auth | Email-only identity, JWT, personId in localStorage |

---

## Project Structure

```
smartnetworking/
├── client/                   # React + Vite frontend
│   └── src/
│       ├── pages/            # EventsCalendar, EventRoom, EventJoin, Profile, ...
│       └── components/       # Card, ChatMessageBody, RoleBadge, ...
├── server/                   # Express API
│   └── src/
│       ├── routes/           # events, matching, personalization, auth, email, ...
│       ├── db/               # DAL abstraction — neo4j-dal.js / sqlite-dal.js
│       ├── ai/               # adapter.js — OpenAI / RocketRide switching
│       └── services/         # lumaImport.js, matching.js
├── docs/                     # Architecture, Algorithm, LLM workflow, Neo4j docs
├── pipelines/                # RocketRide pipeline definitions
└── .env.example              # All required environment variables
```

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/Saurabhkhire/smartnetworking.git
cd smartnetworking
npm run install:all
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

| Variable | Required | Description |
|---|---|---|
| `NEO4J_URI` | Neo4j mode | AuraDB connection string |
| `NEO4J_USER` / `NEO4J_PASSWORD` | Neo4j mode | AuraDB credentials |
| `OPENAI_API_KEY` | Yes | GPT-4o-mini for AI chatbot |
| `APIFY_TOKEN` | Luma import | Apify API token |
| `EMAIL_USER` / `EMAIL_PASS` | Email blasts | Gmail SMTP credentials |
| `AI_SKIP_ROCKETRIDE` | Optional | Set `true` to use OpenAI directly |

> Get a free Neo4j AuraDB instance at [console.neo4j.io](https://console.neo4j.io)

### 3. Seed demo data

```bash
# SQLite (default — no external DB needed)
npm run db:mock:sqlite

# Neo4j AuraDB
npm run db:mock
```

This creates **60 events** and **240 attendees** including 4 live matchable events.

### 4. Run

```bash
# SQLite (recommended for local dev)
npm run dev

# Neo4j AuraDB
npm run dev:neo4j
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:4000](http://localhost:4000)

---

## Demo Logins

No password needed — just enter the email at the login screen.

| Role | Email |
|---|---|
| Host | `saurabhskhire@gmail.com` |
| Bay Area Founders Mixer attendee | `kendall.kim.13@techfounder.dev` |
| AI & ML Builders attendee | `alex.rodriguez.120@techfounder.dev` |

**Attendee email pattern:** `{firstname}.{lastname}.{index}@techfounder.dev`

| Event | Index range |
|---|---|
| Tech Startup 1-on-1s | 0 to 59 |
| AI & ML Builders Meetup | 60 to 119 |
| Bay Area Founders Mixer | 120 to 179 |
| Investor Office Hours | 180 to 239 |

---

## Event Modes

| Mode | Description |
|---|---|
| `mixer` | Rotating breakout groups — matching algorithm + group planner |
| `personal` | 1-on-1 schedule — matching algorithm assigns individual pairs |
| `normal` | No algorithm — AI personalisation chatbot only |

---

## Matching Algorithm

**Layer 1 — Role-Seek Scoring**
- Attendee A seeks "Investor" role and Attendee B is an investor: +10 pts
- Bidirectional match: score doubled
- `whoYouSeek` keyword overlap: +5 pts

**Layer 2 — Deep Profile Scoring**
- Skills have vs skills seek: +8 pts each
- Shared company stage: +6 pts
- `whoYouAre` / `whoYouSeek` semantic match: +10 pts
- Past work history overlap: +4 pts

**Group Planner** — greedy round-robin: sort all pairs by score, fill groups highest-value first, track seen pairs per round to prevent repeats, generate per-person timesheets.

---

## AI Chatbot

The chatbot runs in two modes:

**Multi-event** (`/events` page sidebar)
- Parses date ranges, time windows, and top-N requests server-side before calling the LLM
- Example: "Best events April 1-10 after 6pm" filters to matching events then ranks by your profile

**Single-event** (`/event/:id/join` and `/event/:id/room`)
- Deep attendee intelligence: who to meet, icebreakers, common ground
- Accessible before check-in

Uses `Promise.allSettled` for parallel DB loading, capped at 25 attendee profiles and 20 events to prevent Neo4j timeouts.

---

## Luma Event Import

Import real events from Luma.ai via Apify:

1. Go to **Events Calendar** and click **Import from Luma**
2. Enter a search query and optional date range
3. Events + attendees are dual-written to both SQLite and Neo4j

Each imported person captures: name, email, LinkedIn URL, job title, company, bio, work experience, and networking intent.

---

## API Routes

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create person + user account |
| `POST` | `/api/auth/login` | Email-only login |
| `GET` | `/api/events/list` | All events |
| `GET` | `/api/events/by-date-range` | Filter by date range |
| `POST` | `/api/events/:id/register` | Register for event |
| `POST` | `/api/events/:id/checkin` | Check in |
| `POST` | `/api/events/:id/compute-scores` | Run matching algorithm |
| `POST` | `/api/events/:id/assign-groups` | Generate breakout groups |
| `GET` | `/api/events/:id/timesheets` | Per-person schedules |
| `POST` | `/api/events/luma-import` | Apify Luma scraper |
| `POST` | `/api/personalization/chat` | AI chatbot |
| `POST` | `/api/email/blast` | Send personalised emails |

---

## NPM Scripts

```bash
npm run dev              # Start with SQLite
npm run dev:neo4j        # Start with Neo4j
npm run stop:dev         # Kill ports 4000 + 5173
npm run db:mock:sqlite   # Seed SQLite with demo data
npm run db:mock          # Seed Neo4j with demo data
npm run db:clear:sqlite  # Clear SQLite
npm run db:clear         # Clear Neo4j
npm run docs:word        # Generate combined DOCX from all /docs markdown files
```

---

## Documentation

Full technical docs are in [`/docs`](./docs):

| File | Contents |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Full stack overview, data models, env vars |
| [ALGORITHM.md](docs/ALGORITHM.md) | Layer 1 & 2 scoring, group planner deep dive |
| [LLM_AI_WORKFLOW.md](docs/LLM_AI_WORKFLOW.md) | Prompt flow, date/time parsing, RocketRide vs OpenAI |
| [NEO4J_FLOW.md](docs/NEO4J_FLOW.md) | Graph model, Cypher queries, node/relationship types |
| [VENTUREGRAPH_FULL_DOC.md](docs/VENTUREGRAPH_FULL_DOC.md) | Master document — all topics combined |

---

## Graph Data Model (Neo4j)

**Nodes:** `Person` · `Event` · `Skill` · `Company` · `Goal` · `User` · `Profile`

**Relationships:** `ATTENDED` · `REGISTERED_FOR` · `HAS_SKILL` · `SEEKS_SKILL` · `SEEKS_ROLE` · `WORKS_AT` · `WANTS_TO_MEET` · `BLOCKS`

The graph enables 2-hop traversal queries impractical with relational joins — e.g. find people who have skills that your target connections are seeking.

---

## License

MIT

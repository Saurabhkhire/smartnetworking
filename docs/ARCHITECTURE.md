# VentureGraph — Architecture & Technology Flow

> HackWithBay 2.0 · Full-Stack AI-Powered Networking Platform

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER (React + Vite)                       │
│  EventsCalendar · EventRoom · EventJoin · MyEvents · ProfilePage    │
│  Chat UI (floating + sidebar) · Auth Context · API client           │
└────────────────────────┬────────────────────────────────────────────┘
                         │ HTTP + WebSocket (ws://)
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     EXPRESS SERVER  :4000                           │
│                                                                     │
│  /api/auth          /api/events       /api/matching                 │
│  /api/personalization  /api/ai        /api/email                    │
│  /api/profiles      /api/connections                                │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  DAL Layer   │  │  AI Adapter  │  │  Email Service (nodemailer)│ │
│  │ sqlite-dal.js│  │ adapter.js   │  │  SMTP → Gmail             │  │
│  │ neo4j-dal.js │  │              │  └──────────────────────────┘  │
│  └──────┬───────┘  └──────┬───────┘                                │
└─────────┼─────────────────┼───────────────────────────────────────-┘
          │                 │
     ┌────▼────┐       ┌────▼──────────────────┐
     │ SQLite  │       │ RocketRide AI Pipeline │
     │ .db file│       │  ─ or ─               │
     └─────────┘       │ OpenAI Chat API        │
                       └───────────────────────-┘
     ┌─────────┐
     │  Neo4j  │
     │ AuraDB  │
     └─────────┘
```

---

## 2. Frontend Architecture

### Stack
| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| Routing | React Router v6 |
| State | React Context (AuthContext) + local useState |
| Styling | CSS variables (theme.css) + inline styles |
| API | Native `fetch` via `api.js` wrapper |
| Real-time | WebSocket (check-in broadcasts) |

### Pages & Their Roles

| Page | Route | Description |
|------|-------|-------------|
| `EventsCalendar` | `/events` | Browse all events + AI sidebar chat |
| `EventRoom` | `/event/:id/room` | Registered attendee + host view; groups, schedule, AI chat |
| `EventJoin` | `/event/:id/join` | Registration form + floating AI chatbot |
| `MyEvents` | `/my-events` | Personal dashboard; hosted + registered events |
| `ProfilePage` | `/profile` | Full profile with Skills, Experience, Event History tabs |
| `CreateEvent` | `/create-event` | Event creation form |
| `Checkin` | `/checkin` | Host check-in interface |
| `OrganizerDashboard` | `/organizer` | Admin panel for scoring + group assignment |

### Key Components

- `ChatMessageBody.jsx` — Full markdown renderer (bold, bullets, numbered lists, inline code, headers)
- `ChatTypingIndicator.jsx` — Animated dot-pulse while AI responds
- `RoleBadge.jsx` — Colour-coded role pill (Founder=purple, Investor=green, Engineer=blue)
- `ScoreBadge.jsx` — Compatibility score chip

---

## 3. Backend Architecture

### Express Routes

```
/api/auth
  POST /login          — Email-only login (no password)
  POST /register       — Create person + user record
  GET  /me             — Fetch full person profile

/api/events
  GET  /list           — All events (with host + attendee counts)
  GET  /by-date-range  — Date-filtered event list
  GET  /:id            — Single event details
  POST /:id/register   — Register for event
  POST /:id/checkin    — Mark attendance
  GET  /:id/attendees  — All checked-in people
  GET  /:id/timesheets — Breakout groups + per-person schedule
  POST /luma-import    — Pull events from Luma API

/api/events (matching)
  POST /:id/compute-scores   — Run Layer 1 + Layer 2 scoring
  POST /:id/assign-groups    — Plan icebreaker rounds + save groups
  GET  /:id/my-schedule      — Personalized 1-on-1 schedule for one person

/api/personalization
  POST /chat           — AI chatbot (single-event OR multi-event mode)

/api/ai
  POST /icebreaker     — One-off icebreaker for a pair
  POST /why-card       — "Why you should meet X" card
  POST /briefing       — Pre-event person briefing

/api/email
  POST /send-schedule  — Email personalized schedule to all attendees

/api/profiles
  GET  /:personId      — Load profile (headline, work, certs, projects)
  PUT  /:personId      — Save / update profile

/api/connections
  POST /rate           — Rate a post-event connection
```

### DAL (Data Access Layer)

The server uses a **driver abstraction** controlled by `DB_DRIVER` env var:

```js
// server/src/db/index.js
const driver = process.env.DB_DRIVER === 'neo4j' ? require('./neo4j-dal') : require('./sqlite-dal');
module.exports = driver;
```

Both DALs expose the **same function signatures** — routes never know which DB they use.

---

## 4. Data Models

### Person
```
id, name, email, roles[], companyName, companyStage,
purpose, seeksRoles[], eventIntent, summary, headline,
linkedinUrl, workExperience[], certifications[], projects[],
skillsHave (via HAS_SKILL), skillsSeek (via SEEKS_SKILL)
```

### Event
```
id, name, type (mixer|personal|normal), date, startTime, endTime,
durationMins, roundMins, groupSizeMin, groupSizeMax,
hostId, description, location, blasts[]
```

### Group / Round (after algorithm runs)
```
Round → [Group → [member PersonIds]]
Stored in: groups_tbl + group_members (SQLite) OR :Group nodes (Neo4j)
```

---

## 5. Real-Time (WebSocket)

WebSocket server runs on the same HTTP port (4000).

```
client CONNECT → server
client → { type: 'checkin', eventId, personId }
server broadcasts → { type: 'checkin_update', eventId, checkedIn: [...] }
All EventRoom clients receive live check-in count updates
```

---

## 6. Environment Variables

```ini
# Database
DB_DRIVER=sqlite|neo4j
SQLITE_PATH=./venturegraph.db
NEO4J_URI=neo4j+s://xxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=...

# AI
OPENAI_API_KEY=sk-...
OPENAI_FALLBACK_MODEL=gpt-4o-mini
AI_SKIP_ROCKETRIDE=true          # set false to use RocketRide pipeline
ROCKETRIDE_APIKEY=rr-...
ROCKETRIDE_URI=https://cloud.rocketride.ai
ROCKETRIDE_PIPELINE_FILE=smartnetworking-ai.pipe
ROCKETRIDE_TIMEOUT_MS=8000

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your@gmail.com
EMAIL_PASS=app-password
```

---

## 7. Running the Project

```bash
# Install all deps
npm run install:all

# SQLite mode (default, no DB setup needed)
npm run dev

# Neo4j mode
npm run dev:neo4j

# Seed demo data
npm run db:mock:sqlite       # SQLite: 60 events, 240 attendees
npm run db:mock              # Neo4j: same data in graph DB

# Kill all ports
npm run stop:dev
```

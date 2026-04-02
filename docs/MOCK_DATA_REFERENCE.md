# Mock data — quick reference

## SQLite (`DB_DRIVER=sqlite`)

Run from repo root:

```bash
npm run db:clear:sqlite
npm run db:mock:sqlite
```

- **Saurabh Khire** (`saurabhskhire@gmail.com`) is **host only** on:
  - **`Bay Area Founders Mixer`** (mixer / icebreaker-style) — **60** checked in  
  - **`Tech Startup 1-on-1s`** (1:1 schedule) — **60** checked in  
- **All other events:** **10** checked-in guests each, **no** host id.
- **Sample attendee login (generated):** First Bay Area mixer guest (index `0`) is named **Alex Chen** with email **`alex.chen.0@techfounder.dev`** (see `pickName` / `pickEmail` in `server/scripts/seed-mock-sqlite.js`). Use **Login** with that email after a fresh SQLite mock seed.

To list emails from the DB after seeding, query SQLite `users` or `persons` tables, or inspect the seed script’s `pickEmail` output for index `0`.

## Neo4j (`DB_DRIVER=neo4j`)

```bash
npm run db:mock --prefix server
```

- Same rules as SQLite: Saurabh hosts only **`Bay Area Founders Mixer`** and **`Tech Startup 1-on-1s`** (60 checked-in each); other events have **10** checked-in guests.
- **Host profile:** Saurabh Khire — login email **`saurabhskhire@gmail.com`** (`Person` + `Profile`).
- **SQLite seed** creates `users` rows for generated attendees (login by email). **Neo4j seed** does not create `User` nodes for guests (Neo4j auth stubs); use Saurabh’s email or add users if you need guest login under Neo4j.

## Mode reminder

- `npm run dev` (root) → **SQLite**
- `npm run dev:neo4j` (root) → **Neo4j**

Use the DB that matches how you seeded data.

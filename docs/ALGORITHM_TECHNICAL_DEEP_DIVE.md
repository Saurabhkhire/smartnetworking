# Matching algorithm — technical deep dive

This document mirrors the implementation in `server/src/services/matching.js` and the graph-layer scoring in `server/src/db/neo4j-dal.js` / `server/src/db/sqlite-dal.js`.

## Data model (short)

- **People** (`Person`) have `roles`, `seeksRoles`, skills (`HAS_SKILL` / `SEEKS_SKILL`), optional blocks (`BLOCKED`), past meetings (`MET` with rating).
- **Events** (`Event`) have type (`mixer`, `personal`, `normal`), timing, and optional `hostId`.
- Only people with an **`ATTENDED`** relationship (check-in) participate in scoring.

## Layer 1 — role gate + named wants

Implemented in SQL/Cypher as `computeLayer1Pairs`:

- Consider all unordered pairs `(a, b)` at the event who checked in.
- Exclude pairs with `BLOCKED` in either direction.
- Exclude pairs where rematch rules apply (both not open to rematch and already met — Neo4j path).
- **Gate:** keep the pair only if at least one person’s `seeksRoles` intersects the other’s `roles`.
- **Score:** `WANTS_TO_MEET` edges add +40 each direction; each valid “A seeks a role B has” adds +25 (max both directions).

Pairs that fail the gate never reach Layer 2.

## Layer 2 — skills, reconnect, persona

Implemented as `computeLayer2Scores` on the Layer-1-valid pairs:

- **Skill score:** For each direction, count skills A seeks that B has (and vice versa), ×4 each, capped so each direction contributes at most 10 points to the skill subtotal.
- **Reconnect:** Prior `MET` ratings adjust score (+10 mutual high, +4 one-sided high, −10 if either rated ≤2).
- **Persona:** `PersonaInsight` nodes with `insightType: 'prefers_role'` and confidence ≥0.6 boost when B’s roles match.

**Total** = Layer1 + skill + reconnect + persona (integer).

## Icebreaker (mixer) — group planning

`planIcebreakerRounds` in `matching.js`:

- Builds a **pair score map** from Layer 2 results.
- For each person, orders “people whose roles I seek” by pair score (interest list).
- Classifies attendees into **main roles** (Founder, Investor, Engineer, …) vs optional roles; main-role attendees are prioritized for placement every round.
- **Round-robin** spreads each person’s interest targets across rounds so no single round hoards all high-value intros.
- **Greedy group fill** maximizes within-group pair scores while avoiding repeat co-groupings across rounds (see code for `pairSeenTogether` tracking).

Output: rounds → groups → member IDs, used to persist `Group` / `IN_GROUP` (Neo4j) or SQLite equivalents.

## Personal (1-on-1) scheduling

From sorted pair scores involving each person, allocate top-N slots by event duration / slot length (see routes and `buildPersonalSchedule` patterns in matching service).

## Normal / open networking

No pair optimization in the same path; attendees rely on the personalization chatbot and manual networking.

## Operational notes

- **Compute scores** must run before **Assign groups** for mixer flows (scores live in memory store until recomputed).
- **Server restart** clears in-memory score cache — re-run compute.
- SQLite and Neo4j DALs implement the same Layer 1 / 2 logic; graph vs SQL differs only in query shape.

## File map

| File | Responsibility |
|------|------------------|
| `server/src/services/matching.js` | Icebreaker round planner, timesheets, schedule assembly |
| `server/src/db/*-dal.js` | `computeLayer1Pairs`, `computeLayer2Scores`, persistence |
| `server/src/routes/matching.js` | HTTP: compute-scores, assign-groups, timesheets |

# VentureGraph — Matching Algorithm Deep Dive

> How the platform decides who meets whom, in which group, at what time.

---

## Overview

The matching system has **two scoring layers** (computing compatibility) followed by a **group planning algorithm** (scheduling who sits together each round). These run sequentially when a host clicks "Run Matching & Send Emails".

```
Attendees (checked in)
       │
       ▼
┌─────────────────────┐
│  Layer 1 Scoring    │  Role-seek + explicit wants
│  (fast filter)      │
└────────┬────────────┘
         │  scored pairs
         ▼
┌─────────────────────┐
│  Layer 2 Scoring    │  Skills overlap + reconnect bonus + persona
│  (deep match)       │
└────────┬────────────┘
         │  fully scored pairs
         ▼
┌─────────────────────┐
│  Group Planner      │  Round-robin, anti-repeat, balanced groups
│  (N rounds)         │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Timesheets         │  Per-person: "Round 1 · 6:00–6:10 · Group 2 · With: Alice, Bob"
└─────────────────────┘
```

---

## Layer 1 — Role-Seek Scoring

**Purpose:** Quickly identify pairs where at least one person seeks the other's role. Pairs with zero mutual role overlap are dropped before the expensive Layer 2 calculation.

**Inputs:** `seeksRoles[]` and `roles[]` from each attendee's profile.

**Scoring formula:**

```
baseScore = 0

if A.seeksRoles ∩ B.roles ≠ ∅:  baseScore += 25
if B.seeksRoles ∩ A.roles ≠ ∅:  baseScore += 25

if A wants_to_meet B (explicit):  baseScore += 40
if B wants_to_meet A (explicit):  baseScore += 40

Layer 1 score = baseScore   (range: 0 – 130)
```

Pairs where `baseScore == 0` are **filtered out** — they never enter Layer 2.

**Implementation:** In SQLite this is pure JavaScript iteration. In Neo4j this is a single Cypher query using graph pattern matching:

```cypher
MATCH (a:Person)-[:ATTENDED]->(e:Event {id: $eventId})
MATCH (b:Person)-[:ATTENDED]->(e)
WHERE a.id < b.id
  AND NOT (a)-[:BLOCKED]->(b)
  AND size([r IN a.seeksRoles WHERE r IN b.roles]) > 0
    OR size([r IN b.seeksRoles WHERE r IN a.roles]) > 0
WITH a, b,
  CASE WHEN (a)-[:WANTS_TO_MEET]->(b) THEN 40 ELSE 0 END +
  CASE WHEN (b)-[:WANTS_TO_MEET]->(a) THEN 40 ELSE 0 END +
  CASE WHEN size([r IN a.seeksRoles WHERE r IN b.roles]) > 0 THEN 25 ELSE 0 END +
  CASE WHEN size([r IN b.seeksRoles WHERE r IN a.roles]) > 0 THEN 25 ELSE 0 END AS layer1Score
RETURN a.id AS personA, b.id AS personB, layer1Score
```

---

## Layer 2 — Deep Profile Scoring

**Purpose:** Enrich each Layer 1 pair's score using skills overlap, past meeting history, persona/archetype similarity, and event-specific tags.

**Scoring components:**

| Component | Points | Logic |
|-----------|--------|-------|
| **Skill overlap (have→seek)** | +8 per shared skill | A has a skill B is seeking (or vice versa) |
| **Bidirectional skill match** | +4 bonus | Both A→B and B→A have overlapping skills |
| **Reconnect bonus** | +20 | They've met before AND openToRematch=true on both sides |
| **Persona/archetype match** | +10 | Both categorised as the same "persona" (e.g. technical, operational) |
| **Same company stage** | +5 | Both at Seed, or both at Series A, etc. |
| **Layer 1 base** | inherited | Carries forward role-seek score from Layer 1 |

**Final formula:**

```
totalScore = layer1Score
           + (skillsOverlapScore × 8)
           + (bidirectionalSkillBonus)
           + (reconnectBonus if applicable)
           + (personaMatchBonus)
           + (companyStageBonus)
```

**Typical score ranges:**
- Weak match: 25–50
- Good match: 51–100
- Strong match: 101–180

---

## Group Planning Algorithm (Icebreaker Rounds)

**Purpose:** Given N rounds of M minutes each, assign all attendees into groups per round so that:
1. Every core-role attendee is in a group every round (no idle slots).
2. Each person meets their highest-scoring matches.
3. Pairs do not repeat across rounds.
4. Groups are balanced in size (between `groupSizeMin` and `groupSizeMax`).

### Terminology

- **Round:** One 10-minute (configurable) period.
- **Group:** 3–6 (configurable) people meeting during a round.
- **MAIN_ROLES:** Founder, Co-Founder, Investor, Angel Investor, VC Partner, Engineer, Product Manager, Designer, Marketing, Growth, Sales — always placed.
- **Optional roles:** Recruiter, Analyst, Advisor, Executive, etc. — fill gaps.

### Phase-by-Phase Walkthrough

**Setup:**
```
numRounds = floor(durationMins / roundMins)
nGroups   = ceil(mainAttendees.length / groupSizeMax)
```

**For each round:**

```
Phase 1 — Seed groups
  ├─ Sort main attendees by "how many of their targets fall in THIS round"
  └─ First nGroups attendees become one-person seeds

Phase 2 — Fill main attendees
  ├─ Remaining main people join the group with best fitScore
  ├─ fitScore(candidate, group) =
  │     sum over existing members m:
  │       -80  if candidate already met m this event
  │       +15  if candidate wants to meet m (from interest list)
  │       +15  if m wants to meet candidate
  │       +0.25 × pairScore(candidate, m)
  └─ Small-group bonus: (groupSizeMax - group.length) × 2  (keeps sizes balanced)

Phase 3 — Fill from optional attendees
  └─ Groups under groupSizeMin get filled by best-fit optional people

Phase 4 — Merge undersized groups
  └─ Any group still < groupSizeMin after Phase 3 merges with the smallest
     compatible group (combined size ≤ groupSizeMax)

Phase 5 — Distribute remaining optional attendees
  └─ Any leftover optional people join the smallest group with room
```

**Round-robin interest distribution (the fairness mechanism):**

```
For each person P with interests = [X1, X2, X3, X4, X5, X6] across 4 rounds:
  Round 1 gets: X1, X5
  Round 2 gets: X2, X6
  Round 3 gets: X3
  Round 4 gets: X4

This ensures P meets their top interests early, not all in round 1.
```

### Anti-Repeat Tracking

```js
const metPairs = new Set();
// After each round, mark all group pairs as "met"
for each (a, b) in group:
  metPairs.add(canonicalize(a, b))

// fitScore penalises already-met pairs:
if hasMet(candidate, m): score -= 80
```

The -80 penalty discourages (but doesn't forbid) repeats when attendee count is low.

---

## Timesheet Generation

After groups are assigned, `buildAllPersonTimesheets()` creates a row for every person:

```
Person: Alice Chen
  Round 1 | 18:00–18:10 | Group 3 | With: Bob Patel, Mia Johnson, Dev Sharma
  Round 2 | 18:10–18:20 | Group 1 | With: Sam Lee, Jordan Kim
  Round 3 | 18:20–18:30 | Group 5 | With: Priya Mehta, Alex Wang, Chris Yu, Dana Park
  Personalization tip: Prioritize meeting Bob Patel — score 142 (mutual ML skills + both seeking investors)
```

**Time calculation:**
```
roundStart(r) = eventStartTime + (r - 1) × roundMins
roundEnd(r)   = eventStartTime + r × roundMins
```

---

## 1-on-1 Schedule (Personal Events)

For `type=personal` (speed-networking format), the algorithm instead produces a simple sorted list:

```
personSlots = scoredPairs
  .filter(p => p.personA === myId || p.personB === myId)
  .sort(desc by totalScore)
  .slice(0, numSlots)

Slot 1 (18:00–18:10): Meet Jordan Kim  [score: 138]
Slot 2 (18:10–18:20): Meet Priya Singh [score: 125]
Slot 3 (18:20–18:30): Meet Alex Nguyen [score: 117]
```

---

## Scoring Example

**Alice Chen** (Founder, seeks: Investor, Angel Investor) meets **Bob Patel** (Angel Investor, seeks: Founder):

```
Layer 1:
  Alice seeks Investor → Bob is Angel Investor:  +25
  Bob seeks Founder → Alice is Founder:           +25
  Subtotal L1:                                     50

Layer 2:
  Alice has: React, Python, ML    Bob seeks: ML      → +8
  Bob has:   Finance, Fundraising Alice seeks: Finance → +8
  Both at Seed stage:                                 → +5
  Persona match (technical-operator pair):            → +10
  Subtotal L2:                                        31

Total score: 50 + 31 = 81  (Good match — likely placed together in Round 1)
```

---

## Persona Insights (Post-Event)

After an event, the platform computes `PersonaInsight` nodes based on connection patterns:

```
If person always connects with Founders → label: "community anchor"
If person connects across many roles    → label: "connector"
If person has high average connection ratings → label: "high-signal networker"
```

These insights feed back into future event matching via the `+10 persona match bonus`.

---

## Performance Characteristics

| Attendees | Layer 1 pairs | Layer 2 scored | Rounds (60 min, 10 min) |
|-----------|--------------|----------------|------------------------|
| 20        | ~80          | ~60            | 6                      |
| 60        | ~600         | ~400           | 6                      |
| 200       | ~6,000       | ~3,000         | 6                      |

All scoring runs **in-memory in Node.js** for SQLite mode. For Neo4j, Layer 1 uses a Cypher query; Layer 2 enrichment runs in JS after fetching the candidate pairs.

Typical runtime for 60 attendees: **< 200ms** total.

# VentureGraph — Architecture & Implementation Guide v3

**HackWithBay 2.0 | Track 9 | Neo4j + RocketRide AI**

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Profile & Registration](#2-profile--registration)
3. [Neo4j Graph Schema](#3-neo4j-graph-schema)
4. [Two-Layer Matching Algorithm](#4-two-layer-matching-algorithm)
5. [Event Modes](#5-event-modes)
6. [Results Window](#6-results-window)
7. [RocketRide AI — Configuration & Prompts](#7-rocketride-ai--configuration--prompts)
8. [Full API Reference](#8-full-api-reference)
9. [End-to-End Data Flow](#9-end-to-end-data-flow)
10. [Team Roles](#10-team-roles)
11. [Three-Minute Demo Script](#11-three-minute-demo-script)

---

## 1. Platform Overview

VentureGraph is a graph-powered event networking platform. Every attendee registers with a rich profile — multiple roles, skills they have, skills they seek, roles they want to meet. The platform uses a two-layer matching algorithm and presents each person with a personalised schedule of who to meet and why.

**Two event modes:**
- **Icebreaker** — rotating groups of 3–6, algorithmically assigned and rotated
- **Open Networking** — each person gets a personal 1-on-1 schedule

**Results window:** after the algorithm runs, any attendee can be clicked to see their exact group assignments, time schedule, and AI-generated reasoning.

### What is new in v3

| Change | Detail |
|--------|--------|
| Multi-select roles | A person can simultaneously be Founder, Investor, and Engineer |
| Lean registration form | Past connections, energy preference, and availability come from platform history — not the form |
| Skills I Seek field | Separate from Skills I Have — drives secondary matching |
| Expanded skill list | 20 Engineering + 40 other canonical skills |
| Primary matching | Revolves entirely around mutual role and goal want |
| Secondary intelligence | Skill overlap, company context, purpose alignment, personalisation from past patterns |
| Personalisation engine | Detects patterns ('15 of your 20 past matches were Founders') and adjusts recommendations |
| Results window | Click any attendee to see full match breakdown, schedule, AI rationale |

---

## 2. Profile & Registration

The registration form is completed at every event. It captures **present-tense intent only**.

### 2.1 Registration form fields

| Field | Input type | Details |
|-------|-----------|---------|
| Full name | Text | Required |
| Roles | Multi-select checkbox | Founder, Co-Founder, Investor, Angel Investor, VC Partner, Engineer, Product Manager, Designer, Marketing, Growth, Sales, Recruiter, Analyst, Advisor, Mentor, Executive, CXO, Other |
| Company name | Text | Optional. Builds company graph node. |
| Company stage | Dropdown | Idea, Pre-seed, Seed, Series A, Series B, Series C+, Growth, Public, Corporate, Agency, Independent, Student |
| Skills I have | Multi-select (60 skills) | See Section 2.2 |
| Skills I am seeking | Multi-select (same 60) | Separate field — what you want in others |
| Roles I want to meet | Multi-select | Same roles list |
| Specific people I want to meet | Name search | Named people get priority boost |
| Purpose at this event | Dropdown | Fundraising, Hiring, Being Hired, Finding Co-founder, Partnerships, Learning, Customer Discovery, Recruiting, Selling, Buying, General Networking |
| Open to re-meeting past connections | Toggle | Defaults Yes. If No, past-met people suppressed unless both opt in with 4+ rating. |
| Blocklist | Name search | Hard constraint. Never matched under any circumstances. |

### Fields NOT in the form (derived from history)

> These come from the platform's stored graph data — never ask the user to re-enter them.

- **Past connections** — known via `MET` relationships from prior events
- **Energy preference** — inferred from ratings of different session formats
- **Availability window** — defined by check-in timestamp + event end time
- **Connection patterns** — computed from MET history ('you tend to rate Founders 4+')
- **Meeting style preferences** — inferred from `wouldMeetAgain: true` patterns

---

### 2.2 Master skills list — 60 canonical skills

#### Engineering (20)

| ID | Name | Category |
|----|------|----------|
| sk_python | Python | Engineering |
| sk_js | JavaScript | Engineering |
| sk_ts | TypeScript | Engineering |
| sk_go | Go / Golang | Engineering |
| sk_rust | Rust | Engineering |
| sk_java | Java | Engineering |
| sk_cpp | C / C++ | Engineering |
| sk_react | React / Frontend | Engineering |
| sk_node | Node.js / Backend | Engineering |
| sk_cloud | Cloud / AWS / GCP | Engineering |
| sk_devops | DevOps / CI-CD | Engineering |
| sk_ml | Machine Learning | Engineering |
| sk_datascience | Data Science | Engineering |
| sk_cv | Computer Vision | Engineering |
| sk_nlp | NLP / LLMs | Engineering |
| sk_blockchain | Blockchain / Web3 | Engineering |
| sk_mobile_ios | Mobile iOS | Engineering |
| sk_mobile_and | Mobile Android | Engineering |
| sk_db | Database / SQL | Engineering |
| sk_sysdesign | System Design | Engineering |

#### Product, Design & Analytics (10)

| ID | Name | Category |
|----|------|----------|
| sk_prodstrat | Product Strategy | Product |
| sk_prodanlyt | Product Analytics | Product |
| sk_roadmap | Roadmap Planning | Product |
| sk_uxresearch | UX Research | Design |
| sk_uxdesign | UX / UI Design | Design |
| sk_prototyping | Prototyping | Design |
| sk_dataanlyt | Data Analysis | Analytics |
| sk_bizintel | Business Intelligence | Analytics |
| sk_growth | Growth Hacking | Product |
| sk_ab_test | A/B Testing | Analytics |

#### Business & Go-to-market (15)

| ID | Name | Category |
|----|------|----------|
| sk_fundraise | Fundraising | Business |
| sk_gtm | Go-to-market | Business |
| sk_salesb2b | Sales B2B | Business |
| sk_salesb2c | Sales B2C | Business |
| sk_entsales | Enterprise Sales | Business |
| sk_mktgstrat | Marketing Strategy | Business |
| sk_content | Content Marketing | Business |
| sk_perfmktg | Performance Marketing | Business |
| sk_brand | Brand Building | Business |
| sk_pr | PR / Communications | Business |
| sk_bizdev | Business Development | Business |
| sk_partnerships | Partnerships | Business |
| sk_custsucc | Customer Success | Business |
| sk_finance | Finance / CFO | Business |
| sk_ops | Operations | Business |

#### People, Legal & Domain (15)

| ID | Name | Category |
|----|------|----------|
| sk_hr | HR / People Ops | People |
| sk_recruit | Recruiting | People |
| sk_exechire | Executive Hiring | People |
| sk_legal | Legal / Compliance | People |
| sk_fintech | Fintech | Domain |
| sk_healthtech | HealthTech | Domain |
| sk_edtech | EdTech | Domain |
| sk_cleantech | CleanTech | Domain |
| sk_saas | SaaS B2B | Domain |
| sk_ecomm | E-commerce | Domain |
| sk_deeptech | DeepTech | Domain |
| sk_biotech | Biotech | Domain |
| sk_proptech | PropTech | Domain |
| sk_govtech | GovTech | Domain |
| sk_gaming | Gaming | Domain |

### 2.3 Role-to-skills guidance

| Role | Typical relevant skills |
|------|------------------------|
| Founder / Co-Founder | Any — especially Fundraising, GTM, Sales, Engineering domains |
| Investor / Angel / VC | Fundraising, Finance, Business Dev, domain skills for portfolio focus |
| Engineer | Engineering (20) + domain expertise + System Design |
| Product Manager | Product skills, Data Analysis, UX Research, A/B Testing, Growth |
| Marketing / Growth | Marketing Strategy, Content, Performance Marketing, Brand, GTM |
| Analyst | Data Analysis, Business Intelligence, Finance, domain skills |
| Recruiter | Recruiting, Executive Hiring, HR / People Ops |
| Designer | UX Design, UX Research, Prototyping + domain |
| Sales | Sales B2B/B2C, Enterprise Sales, Customer Success, Partnerships |

---

## 3. Neo4j Graph Schema

### 3.1 Node labels

| Label | Properties | Purpose |
|-------|-----------|---------|
| `Person` | id, name, roles[] (array), companyName, companyStage, purpose, openToRematch | Core user node. `roles` is an array. Persists across all events. |
| `Skill` | id, name, category | Canonical skill node. Created once. Never duplicated. |
| `Event` | id, name, type, date, durationMins, roundMins, groupSizeMin, groupSizeMax, priorityTheme | One node per event. `type` = 'icebreaker' or 'networking'. |
| `Goal` | id, personId, eventId, purposeTag, description | What a person wants at a specific event. Fresh per event. |
| `Group` | id, eventId, roundNumber | A breakout group in icebreaker mode. |
| `Company` | id, name, stage | Optional enrichment. |
| `PersonaInsight` | id, personId, insightType, value, confidence, computedAt | Stored pattern insights from MET history. |

### 3.2 Relationship types

| Relationship | Direction | Key properties |
|-------------|----------|----------------|
| `HAS_SKILL` | Person → Skill | `level`: beginner/mid/expert |
| `SEEKS_SKILL` | Person → Skill | `urgency`: high/medium/low |
| `SEEKS_ROLE` | Person → (role string) | Roles this person wants to meet |
| `WORKS_AT` | Person → Company | `current`: bool |
| `HAS_GOAL` | Person → Goal | Per-event goal |
| `ATTENDED` | Person → Event | `checkedInAt`, `leftAt` |
| `MET` | Person → Person | `eventId`, `rating` (1–5), `wouldMeetAgain` (bool), `notes`, `metAt` |
| `WANTS_TO_MEET` | Person → Person | Specific named request — hard priority boost |
| `BLOCKED` | Person → Person | `createdAt` — hard constraint, never matched |
| `IN_GROUP` | Person → Group | `roundNumber` |
| `SCHEDULED_WITH` | Person → Person | `eventId`, `slotNumber`, `startTime`, `durationMins` |
| `HAS_INSIGHT` | Person → PersonaInsight | `computedAt` |

---

### 3.3 Neo4j setup — complete procedure

#### Step 1 — Create AuraDB instance

1. Go to [console.neo4j.io](https://console.neo4j.io), sign up or log in
2. Click **New instance** → select **AuraDB Free**
3. Name it: `venturegraph`
4. **CRITICAL:** When credentials appear, copy all three values immediately — shown only once:

```
NEO4J_URI      = neo4j+s://xxxxxxxx.databases.neo4j.io
NEO4J_USER     = neo4j
NEO4J_PASSWORD = <save this now>
```

5. Wait for status **Running** (1–3 min), then click **Open with Neo4j Browser**
6. Verify: type `RETURN 1 AS test` and press `Ctrl+Enter` — should return a result row

#### Step 2 — Run constraints

Run each separately in Neo4j Browser. Wait for green tick before next.

```cypher
CREATE CONSTRAINT person_id   IF NOT EXISTS FOR (p:Person)         REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT skill_id    IF NOT EXISTS FOR (s:Skill)          REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT event_id    IF NOT EXISTS FOR (e:Event)          REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT company_id  IF NOT EXISTS FOR (c:Company)        REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT group_id    IF NOT EXISTS FOR (g:Group)          REQUIRE g.id IS UNIQUE;
CREATE CONSTRAINT insight_id  IF NOT EXISTS FOR (i:PersonaInsight) REQUIRE i.id IS UNIQUE;
```

Verify: `SHOW CONSTRAINTS;` → should return 6 rows

#### Step 3 — Run indexes

```cypher
CREATE INDEX person_company  IF NOT EXISTS FOR (p:Person) ON (p.companyName);
CREATE INDEX person_purpose  IF NOT EXISTS FOR (p:Person) ON (p.purpose);
CREATE INDEX skill_category  IF NOT EXISTS FOR (s:Skill)  ON (s.category);
CREATE INDEX event_type      IF NOT EXISTS FOR (e:Event)  ON (e.type, e.date);
CREATE INDEX met_event       IF NOT EXISTS FOR ()-[r:MET]-() ON (r.eventId);
CREATE INDEX met_rating      IF NOT EXISTS FOR ()-[r:MET]-() ON (r.rating);
CREATE INDEX met_wma         IF NOT EXISTS FOR ()-[r:MET]-() ON (r.wouldMeetAgain);
```

#### Step 4 — Seed all 60 skill nodes

```cypher
UNWIND [
  {id:'sk_python',name:'Python',cat:'Engineering'},
  {id:'sk_js',name:'JavaScript',cat:'Engineering'},
  {id:'sk_ts',name:'TypeScript',cat:'Engineering'},
  {id:'sk_go',name:'Go / Golang',cat:'Engineering'},
  {id:'sk_rust',name:'Rust',cat:'Engineering'},
  {id:'sk_java',name:'Java',cat:'Engineering'},
  {id:'sk_cpp',name:'C / C++',cat:'Engineering'},
  {id:'sk_react',name:'React / Frontend',cat:'Engineering'},
  {id:'sk_node',name:'Node.js / Backend',cat:'Engineering'},
  {id:'sk_cloud',name:'Cloud / AWS / GCP',cat:'Engineering'},
  {id:'sk_devops',name:'DevOps / CI-CD',cat:'Engineering'},
  {id:'sk_ml',name:'Machine Learning',cat:'Engineering'},
  {id:'sk_datascience',name:'Data Science',cat:'Engineering'},
  {id:'sk_cv',name:'Computer Vision',cat:'Engineering'},
  {id:'sk_nlp',name:'NLP / LLMs',cat:'Engineering'},
  {id:'sk_blockchain',name:'Blockchain / Web3',cat:'Engineering'},
  {id:'sk_mobile_ios',name:'Mobile iOS',cat:'Engineering'},
  {id:'sk_mobile_and',name:'Mobile Android',cat:'Engineering'},
  {id:'sk_db',name:'Database / SQL',cat:'Engineering'},
  {id:'sk_sysdesign',name:'System Design',cat:'Engineering'},
  {id:'sk_prodstrat',name:'Product Strategy',cat:'Product'},
  {id:'sk_prodanlyt',name:'Product Analytics',cat:'Product'},
  {id:'sk_roadmap',name:'Roadmap Planning',cat:'Product'},
  {id:'sk_uxresearch',name:'UX Research',cat:'Design'},
  {id:'sk_uxdesign',name:'UX / UI Design',cat:'Design'},
  {id:'sk_prototyping',name:'Prototyping',cat:'Design'},
  {id:'sk_dataanlyt',name:'Data Analysis',cat:'Analytics'},
  {id:'sk_bizintel',name:'Business Intelligence',cat:'Analytics'},
  {id:'sk_growth',name:'Growth Hacking',cat:'Product'},
  {id:'sk_ab_test',name:'A/B Testing',cat:'Analytics'},
  {id:'sk_fundraise',name:'Fundraising',cat:'Business'},
  {id:'sk_gtm',name:'Go-to-market',cat:'Business'},
  {id:'sk_salesb2b',name:'Sales B2B',cat:'Business'},
  {id:'sk_salesb2c',name:'Sales B2C',cat:'Business'},
  {id:'sk_entsales',name:'Enterprise Sales',cat:'Business'},
  {id:'sk_mktgstrat',name:'Marketing Strategy',cat:'Business'},
  {id:'sk_content',name:'Content Marketing',cat:'Business'},
  {id:'sk_perfmktg',name:'Performance Marketing',cat:'Business'},
  {id:'sk_brand',name:'Brand Building',cat:'Business'},
  {id:'sk_pr',name:'PR / Communications',cat:'Business'},
  {id:'sk_bizdev',name:'Business Development',cat:'Business'},
  {id:'sk_partnerships',name:'Partnerships',cat:'Business'},
  {id:'sk_custsucc',name:'Customer Success',cat:'Business'},
  {id:'sk_finance',name:'Finance / CFO',cat:'Business'},
  {id:'sk_ops',name:'Operations',cat:'Business'},
  {id:'sk_hr',name:'HR / People Ops',cat:'People'},
  {id:'sk_recruit',name:'Recruiting',cat:'People'},
  {id:'sk_exechire',name:'Executive Hiring',cat:'People'},
  {id:'sk_legal',name:'Legal / Compliance',cat:'People'},
  {id:'sk_fintech',name:'Fintech',cat:'Domain'},
  {id:'sk_healthtech',name:'HealthTech',cat:'Domain'},
  {id:'sk_edtech',name:'EdTech',cat:'Domain'},
  {id:'sk_cleantech',name:'CleanTech',cat:'Domain'},
  {id:'sk_saas',name:'SaaS B2B',cat:'Domain'},
  {id:'sk_ecomm',name:'E-commerce',cat:'Domain'},
  {id:'sk_deeptech',name:'DeepTech',cat:'Domain'},
  {id:'sk_biotech',name:'Biotech',cat:'Domain'},
  {id:'sk_proptech',name:'PropTech',cat:'Domain'},
  {id:'sk_govtech',name:'GovTech',cat:'Domain'},
  {id:'sk_gaming',name:'Gaming',cat:'Domain'}
] AS s
MERGE (sk:Skill {id: s.id})
SET sk.name = s.name, sk.category = s.cat;
```

Verify: `MATCH (s:Skill) RETURN count(s);` → should return **60**

#### Step 5 — Verify full setup

```cypher
SHOW CONSTRAINTS;   -- Expected: 6 rows
SHOW INDEXES;       -- Expected: 7+ custom indexes
MATCH (s:Skill) RETURN count(s) AS skills;  -- Expected: 60
```

---

## 4. Two-Layer Matching Algorithm

### 4.1 Layer 1 — Primary matching: mutual role and goal want

A pair is **valid only if** at least one person seeks the other's role. Pairs with no role basis are suppressed before Layer 2 runs.

**Scoring:**

| Signal | Points | Logic |
|--------|--------|-------|
| Person A seeks a role that Person B has | +25 | `intersection(A.seeksRoles, B.roles).length > 0` |
| Person B seeks a role that Person A has | +25 | `intersection(B.seeksRoles, A.roles).length > 0` |
| Specific named want (A wants to meet B) | +40 | A has `WANTS_TO_MEET → B` edge |
| Specific named want (B wants to meet A) | +40 | B has `WANTS_TO_MEET → A` edge |
| Neither seeks the other's role | SUPPRESSED | Pair excluded from Layer 2 |

**Hard exclusions (always applied first):**
- `BLOCKED` relationship in either direction → score `-9999`
- Either person has `openToRematch: false` AND they have a `MET` edge → score `-9999`

#### Layer 1 Cypher query

```cypher
MATCH (a:Person)-[:ATTENDED]->(e:Event {id: $eventId})
MATCH (b:Person)-[:ATTENDED]->(e)
WHERE a.id < b.id
  AND NOT (a)-[:BLOCKED]->(b)
  AND NOT (b)-[:BLOCKED]->(a)
  AND NOT (
    (NOT coalesce(a.openToRematch, true) OR NOT coalesce(b.openToRematch, true))
    AND ((a)-[:MET]->(b) OR (b)-[:MET]->(a))
  )

WITH a, b,
  CASE WHEN (a)-[:WANTS_TO_MEET]->(b) THEN 40 ELSE 0 END +
  CASE WHEN (b)-[:WANTS_TO_MEET]->(a) THEN 40 ELSE 0 END AS namedBonus,
  size([r IN a.seeksRoles WHERE r IN b.roles]) AS aWantsBCount,
  size([r IN b.seeksRoles WHERE r IN a.roles]) AS bWantsACount

WHERE aWantsBCount > 0 OR bWantsACount > 0  -- Layer 1 gate

WITH a, b,
  namedBonus +
  (CASE WHEN aWantsBCount > 0 THEN 25 ELSE 0 END) +
  (CASE WHEN bWantsACount > 0 THEN 25 ELSE 0 END) AS layer1Score

RETURN a.id AS pA, b.id AS pB, layer1Score
ORDER BY layer1Score DESC;
```

---

### 4.2 Layer 2 — Secondary intelligence scoring

Applied only to pairs that passed Layer 1.

| Signal | Max pts | Logic |
|--------|---------|-------|
| Skill complementarity | 20 | A seeks skills B has: +4 per skill (cap 10). B seeks skills A has: +4 per skill (cap 10). |
| Purpose alignment | 10 | Mutually compatible purposes (Fundraising + Investing, Hiring + Being Hired, etc.) |
| Company stage signal | 8 | Investor + target stage match; same stage peer match |
| Reconnect bonus | 10 | Both rated 4+, both `wouldMeetAgain: true` → +10. One-sided 4+ → +4. Either rated ≤2 → -10. |
| Personalisation boost | 10 | B's roles match A's historically preferred roles from `PersonaInsight` (confidence ≥ 0.6) |

**Purpose compatibility matrix:**

| Purpose A | Purpose B that earns +10 |
|-----------|--------------------------|
| Fundraising | Investing (VC Partner, Angel Investor roles) |
| Hiring | Being Hired |
| Finding Co-founder | Also Finding Co-founder |
| Customer Discovery | Selling |
| Partnerships | Business Development |
| Recruiting | Hiring |
| Learning | Mentoring / Advising |

#### Layer 2 Cypher query

```cypher
UNWIND $validPairs AS pair
MATCH (a:Person {id: pair.pA})
MATCH (b:Person {id: pair.pB})

WITH a, b, pair,
  size([(a)-[:SEEKS_SKILL]->(s:Skill)<-[:HAS_SKILL]-(b) | s]) * 4 AS aSeeksBHas,
  size([(b)-[:SEEKS_SKILL]->(s:Skill)<-[:HAS_SKILL]-(a) | s]) * 4 AS bSeeksAHas

WITH a, b, pair,
  (CASE WHEN aSeeksBHas < 10 THEN aSeeksBHas ELSE 10 END) +
  (CASE WHEN bSeeksAHas < 10 THEN bSeeksAHas ELSE 10 END) AS skillScore

OPTIONAL MATCH (a)-[prevA:MET]->(b)
OPTIONAL MATCH (b)-[prevB:MET]->(a)
WITH a, b, pair, skillScore,
  CASE
    WHEN prevA IS NOT NULL AND prevA.rating >= 4
     AND prevB IS NOT NULL AND prevB.rating >= 4
     AND prevA.wouldMeetAgain = true AND prevB.wouldMeetAgain = true THEN 10
    WHEN (prevA IS NOT NULL AND prevA.rating >= 4) OR
         (prevB IS NOT NULL AND prevB.rating >= 4) THEN 4
    WHEN (prevA IS NOT NULL AND prevA.rating <= 2) OR
         (prevB IS NOT NULL AND prevB.rating <= 2) THEN -10
    ELSE 0
  END AS reconnectBonus

OPTIONAL MATCH (a)-[:HAS_INSIGHT]->(ins:PersonaInsight {insightType: 'prefers_role'})
WHERE ins.value IN b.roles AND ins.confidence >= 0.6
WITH a, b, pair, skillScore, reconnectBonus,
  coalesce(max(ins.confidence) * 10, 0) AS personaBonus

RETURN pair.pA AS personA, pair.pB AS personB,
  pair.layer1Score + skillScore + reconnectBonus + toInteger(personaBonus) AS totalScore
ORDER BY totalScore DESC;
```

---

### 4.3 Personalisation engine

After every event, the system computes `PersonaInsight` nodes for each attendee.

#### Post-event insight computation

```cypher
MATCH (p:Person)-[m:MET]->(other:Person)
WHERE m.rating IS NOT NULL
WITH p, other, m,
     [r IN other.roles WHERE r IS NOT NULL] AS otherRoles

UNWIND otherRoles AS role
WITH p, role,
     count(*) AS totalMeetings,
     sum(CASE WHEN m.rating >= 4 THEN 1 ELSE 0 END) AS highRated
WHERE totalMeetings >= 3

WITH p, role, totalMeetings, highRated,
     toFloat(highRated) / toFloat(totalMeetings) AS confidence
WHERE confidence >= 0.5

MERGE (ins:PersonaInsight {
  id: p.id + '_prefers_' + role,
  personId: p.id,
  insightType: 'prefers_role'
})
SET ins.value = role,
    ins.confidence = confidence,
    ins.totalMeetings = totalMeetings,
    ins.highRated = highRated,
    ins.computedAt = datetime()
MERGE (p)-[:HAS_INSIGHT]->(ins);
```

**Example insights shown in UI:**
- *"Out of your last 20 connections, 15 were Founders — Founders have been boosted in your schedule tonight."*
- *"You rate Engineers 4+ stars 80% of the time. Engineers are prioritised."*
- *"You've rated Recruiters below 3 in 7 of 8 past meetings. Recruiters are deprioritised."*

---

## 5. Event Modes

### 5.1 Icebreaker mode — rotating groups

```
rounds = floor(durationMins / roundMins)
groupsPerRound = floor(N / groupSize)
```

**Algorithm:**
1. For each round, pick a seed person (highest unmet potential)
2. Greedily fill the group: highest total group score, no repeats
3. Leftover attendees (< groupSize) absorbed into smallest groups
4. Register all pairs as met for this event
5. Repeat for next round — no two people share a group twice

**Example — Jay + Roy + Molly:**

| Person | Roles | Seeking |
|--------|-------|---------|
| Jay | Founder | Investor + Engineer |
| Roy | Investor | Founder |
| Molly | Engineer | Founder |

- Jay↔Roy: roleScore = 50 (mutual want)
- Jay↔Molly: roleScore = 50 (mutual want)
- Roy↔Molly: roleScore = 25 (Molly seeks Founder, Roy is not Founder)
- **Total group score: 125 — strong group**

### 5.2 Open networking mode — personalised 1-on-1 schedule

```
slots = floor(durationMins / slotMins)
```

Each person gets their top-N matches from all attendees. Every schedule is unique.

**Example: 60 minutes, 5-min slots = 12 meetings from 50 people**

---

## 6. Results Window

After the algorithm runs, clicking any attendee shows their full breakdown.

### 6.1 What the results window shows

| Panel | Contents |
|-------|----------|
| Attendee list | All checked-in people with match quality indicator |
| Person header | Name, roles, company stage, purpose, personalisation summary |
| Personalisation banner | Pattern summary: *"15 of your 20 past connections were Founders"* |
| Icebreaker schedule | Round-by-round groups with compatibility score + AI rationale |
| 1-on-1 schedule | Slot, time, person, total score, score breakdown, why-card, icebreaker |
| Score breakdown | Exactly how each match score was computed (Layer 1 pts + Layer 2 pts) |

### 6.2 API response shape

```
GET /api/events/:eventId/results/:personId

Response: {
  person: { id, name, roles[], company, stage, purpose },
  personalisationInsights: [
    { text, type, value, confidence }
  ],
  icebreakerSchedule: [
    {
      round, startTime,
      groupMembers: [{ id, name, roles[], company, score }],
      groupScore,
      aiRationale
    }
  ],
  networkingSchedule: [
    {
      slot, startTime, durationMins,
      match: { id, name, roles[], company, stage },
      totalScore,
      scoreBreakdown: {
        layer1: { roleMatchScore, namedWantBonus },
        layer2: { skillScore, purposeScore, reconnectBonus, personaBonus }
      },
      whyCard,
      icebreaker
    }
  ]
}
```

### 6.3 Personalised summary — "Out of 50, here are your 12"

```
There are 47 other people here tonight.
Based on your profile and history, here are your 12 conversations:

7:00 — Priya Sharma (VC Partner, BlueSky)  |  Score 88  |  'She backs pre-seed AI — exactly your stage'
7:05 — Ankit Rao (Engineer, Freelance)     |  Score 81  |  'ML engineer open to equity'
7:10 — Leah Chen (Co-founder, Stealth)     |  Score 74  |  'Looking for technical co-founder'
... 9 more

Your pattern: You've rated 15 of 20 past Founders 4+ stars.
3 more Founders are in your extended list if slots open up.
```

---

## 7. RocketRide AI — Configuration & Prompts

### 7.1 Account setup

#### Step 1 — Create account and get API key
1. Go to the RocketRide platform and sign up
2. Navigate to **Settings → API Keys → Create new key**
3. Name it: `VentureGraph`
4. Copy the key and add to `.env`:

```
ROCKETRIDE_API_KEY=rr-xxxxxxxxxxxxxxxxxxxxxxxx
ROCKETRIDE_BASE_URL=https://api.rocketride.ai/v1
ROCKETRIDE_MODEL=rocketride-pro
ROCKETRIDE_TIMEOUT_MS=8000
AI_FALLBACK_MODE=false
```

#### Step 2 — Test the API

```bash
curl -X POST https://api.rocketride.ai/v1/chat \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $ROCKETRIDE_API_KEY' \
  -d '{
    "model": "rocketride-pro",
    "messages": [{ "role": "user", "content": "Say: API connected." }],
    "max_tokens": 20
  }'
```

Expected: `{ "choices": [{ "message": { "content": "API connected." } }] }`

#### Step 3 — Swappable adapter

```javascript
// ai/adapter.js — change only this function to swap AI provider

async function callAI(systemPrompt, userPrompt, maxTokens = 300) {
  // ── RocketRide ─────────────────────────────────────────────
  const res = await fetch(`${process.env.ROCKETRIDE_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.ROCKETRIDE_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.ROCKETRIDE_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt }
      ],
      max_tokens: maxTokens
    }),
    signal: AbortSignal.timeout(8000)
  });
  const data = await res.json();
  return data.choices[0].message.content.trim();

  // ── To swap to OpenAI: ─────────────────────────────────────
  // const { OpenAI } = require('openai');
  // const r = await new OpenAI().chat.completions.create({
  //   model: 'gpt-4o-mini', messages: [...], max_tokens });
  // return r.choices[0].message.content.trim();

  // ── To swap to Anthropic Claude: ──────────────────────────
  // const r = await anthropic.messages.create({
  //   model: 'claude-haiku-4-5-20251001', system: systemPrompt,
  //   messages: [{ role:'user', content: userPrompt }], max_tokens });
  // return r.content[0].text.trim();
}

// Cache wrapper — same pair+event never calls AI twice
const cache = new Map();
async function callAICached(cacheKey, systemPrompt, userPrompt, maxTokens) {
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const result = await callAI(systemPrompt, userPrompt, maxTokens);
  cache.set(cacheKey, result);
  return result;
}

module.exports = { callAI, callAICached };
```

---

### 7.2 Prompt templates

#### Prompt 1 — Why-card

```
SYSTEM:
You are a sharp professional networking advisor. Write exactly 2 sentences explaining
why two specific people should meet. Be specific — name actual skills, goals, signals.
Never use: synergy, opportunity, leverage, excited, great match.
Sound like a knowledgeable friend briefing someone before a conversation.

USER:
Person A: {nameA}, roles: {rolesA}, company: {companyA} ({stageA})
  Purpose tonight: {purposeA}
  Skills they have: {skillsHasA}
  Skills they are seeking: {skillsSeeksA}
  Roles they want to meet: {seeksRolesA}

Person B: {nameB}, roles: {rolesB}, company: {companyB} ({stageB})
  Purpose tonight: {purposeB}
  Skills they have: {skillsHasB}
  Skills they are seeking: {skillsSeeksB}
  Roles they want to meet: {seeksRolesB}

Match signals:
  Role match score: {roleScore}/50 — {roleMatchDetail}
  Skill overlap (A seeks from B): {skillsASeeksFromB}
  Skill overlap (B seeks from A): {skillsBSeeksFromA}
  Purpose alignment: {purposeAlignmentNote}
  Past connection: {pastConnectionNote}

Write the 2-sentence why-card:
```

#### Prompt 2 — Icebreaker

```
SYSTEM:
Write exactly one sentence for Person A to open a conversation with Person B.
Rules: reference something specific. Start with an action or observation.
Maximum 20 words. Natural tone. No questions. No generic openers.
Do not start with: I, So, Hey, Hi.

USER:
Why they should meet: {whyCardText}
Person A: {nameA}, {rolesA}
Person B: {nameB}, {rolesB} at {companyB}
Event context: {eventTheme}

One-sentence icebreaker:
```

#### Prompt 3 — Group rationale

```
SYSTEM:
Explain in 2 sentences why these people were grouped at a networking event.
Focus on what each person gains from the others. Be specific about roles and needs.

USER:
Group members:
{- name (roles): wants to meet [seeksRoles], offers [topSkills]}

Group compatibility score: {groupScore}
Key signals: {topSignals}

Why were these {N} people grouped together?
```

#### Prompt 4 — Personal event briefing

```
SYSTEM:
You are a direct networking coach. Write a 3-sentence pre-event briefing.
Sentence 1: who to find first and why (name them).
Sentence 2: the second priority and why.
Sentence 3: one tactical tip for their situation tonight.
Under 60 words total. Use names. Sound like a coach.

USER:
Attendee: {name}, roles: {roles}, company: {company} ({stage})
Goal tonight: {purpose}
Personalisation note: {personaInsightText}
Event: {eventName}, {eventType}, {durationMins} min, {totalAttendees} attendees

Top 5 matches:
1. {m1Name} ({m1Roles}) — score {m1Score} — {m1WhyShort}
2. {m2Name} ({m2Roles}) — score {m2Score} — {m2WhyShort}
3. {m3Name} ({m3Roles}) — score {m3Score} — {m3WhyShort}
4. {m4Name} ({m4Roles}) — score {m4Score}
5. {m5Name} ({m5Roles}) — score {m5Score}

3-sentence briefing:
```

#### Prompt 5 — Personalisation insight

```
SYSTEM:
Write one sentence telling a person what their networking pattern shows.
Be specific with numbers. Explain how this affects their schedule tonight.
Tone: informative, not judgmental. Maximum 30 words.

USER:
Person: {name}
Total past connections rated: {totalRated}
Most common high-rated role: {topRole} ({topRoleCount} of {totalRated}, rated 4+)
Least favoured role: {bottomRole} ({bottomRoleCount} rated below 3)
Top stage of high-rated connections: {topStage}

One-sentence personalisation insight:
```

---

## 8. Full API Reference

### Event management

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/events/create` | Create event — writes Event node to Neo4j |
| `GET` | `/api/events/:id` | Fetch event config |
| `POST` | `/api/events/:id/register` | Register attendee — writes Person + all edges |
| `POST` | `/api/events/:id/checkin` | Mark arrival — writes ATTENDED edge, WebSocket broadcast |
| `GET` | `/api/events/:id/attendees` | All checked-in attendees |

### Matching engine

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/events/:id/compute-scores` | Run Layer 1 + Layer 2 for all pairs |
| `POST` | `/api/events/:id/assign-groups` | Icebreaker — write Group nodes + IN_GROUP edges |
| `GET` | `/api/events/:id/my-schedule?personId=X` | Networking — top-N schedule for one person |
| `GET` | `/api/events/:id/results/:personId` | Full results window breakdown |
| `POST` | `/api/connections/rate` | Write MET relationship; trigger insight recomputation |

### AI endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/ai/why-card` | Why-card + icebreaker for a pair |
| `POST` | `/api/ai/briefing` | Personal event briefing |
| `POST` | `/api/ai/group-rationale` | Group composition explanation |
| `POST` | `/api/ai/persona-insight` | Human-readable pattern summary |

---

## 9. End-to-End Data Flow

| Phase | What happens | Neo4j writes | AI calls |
|-------|-------------|--------------|----------|
| 1. Event setup | Organiser creates event | Event node | None |
| 2. Registration | Attendee fills form | Person, HAS_SKILL, SEEKS_SKILL, HAS_GOAL, WORKS_AT | None |
| 3. Check-in | Attendee scans QR | ATTENDED edge | None |
| 4. Score computation | System runs Layer 1 + 2 | Score matrix in memory (ephemeral) | None |
| 5a. Icebreaker | planIcebreakerRounds() | Group nodes + IN_GROUP edges | Group rationale per group |
| 5b. Networking | planNetworkingSchedule() | SCHEDULED_WITH edges | Why-card + icebreaker per match; briefing |
| 6. Results window | Read-only fetch | None | Persona insight text |
| 7. Rating | Attendee rates meetings | MET relationship written/updated | None |
| 8. Insight computation | Post-event analysis | PersonaInsight nodes written/updated | None |

---

## 10. Team Roles

| Person | Level | Role | Must deliver by hour 3 | Must deliver by hour 7 |
|--------|-------|------|------------------------|------------------------|
| 1 | Good | The Coder — all code via Cursor + Claude | Registration API + Neo4j reads/writes + matching engine on seed data | Full app: both modes, AI live, UI wired |
| 2 | Good | Neo4j Engineer | AuraDB live, constraints + indexes + 60 skills seeded, 4 Cypher queries tested | 30-person dataset loaded, graph verified |
| 3 | Good | RocketRide Engineer | API live, all 5 prompts tested with demo personas | All AI outputs quality-checked, fallbacks ready |
| 4 | Decent | Data & Personas | 30 profiles designed, JSON ready | Demo event configured, Jay+Priya+Ankit pairing verified |
| 5 | Beginner | Demo & Pitch | Deck drafted, script written and timed | Full rehearsal done, Q&A answers prepared |

### Critical handoffs

| Time | What must happen |
|------|-----------------|
| Hour 1 | Person 2 → Person 1: Neo4j URI + password |
| Hour 1 | Person 3 → Person 1: ROCKETRIDE_API_KEY |
| Hour 2 | Person 2 → Person 1: 4 tested Cypher queries |
| Hour 2 | Person 3 → Person 1: all 5 tested prompt templates |
| Hour 3 | Person 4 → Person 1 + 2: 30-person seed JSON |
| Hour 6 | Person 1 → Person 5: stable running app — no breaking changes after this |

---

## 11. Three-Minute Demo Script

| Time | What to say and do |
|------|--------------------|
| 0:00–0:20 | *"There are 47 people here tonight. Without VentureGraph, you'll guess who to talk to. With it — [check in as Jay] — you have a ranked schedule in one second."* |
| 0:20–0:50 | *"Jay's top match is Priya — a VC who backs exactly his stage. Score: 88. [tap card] Here's why. [read why-card aloud]. And the exact first thing Jay should say to her: [read icebreaker]."* |
| 0:50–1:10 | *"This isn't random. The graph knows Jay needs Fundraising and ML. Priya has both. [show Neo4j browser] — every node is a person, every edge is a skill, a meeting, a goal."* |
| 1:10–1:35 | *"Organiser view. One click — 30 people into groups of 5. Jay, Priya, Ankit in group 1. [show group] Founder + Investor + Engineer. All three benefit."* |
| 1:35–2:00 | *"[Click Jay's results window] The system noticed: 15 of Jay's 20 past connections were Founders. So it's surfaced 2 more Founders in his extended list."* |
| 2:00–2:20 | *"[Neo4j browser] A relational database cannot do this traversal efficiently. A graph can. This is why Neo4j is the right tool."* |
| 2:20–2:40 | *"Every event makes your graph richer. Every rating teaches it what works for you. VentureGraph is not just tonight — it's a networking layer that compounds. Thank you."* |

### Judge Q&A answers

| Question | Answer |
|----------|--------|
| Why Neo4j and not PostgreSQL? | Finding "who needs what Jay has, who has what Jay needs" requires joining 6 tables in SQL. In Neo4j it's one Cypher traversal across edges. Graph is the natural structure. |
| How does AI actually use the graph? | Neo4j finds structural matches. RocketRide receives that match data and explains it in human language. Neither alone is sufficient. |
| What about 500 people? | O(N²) — 500 people = 124,750 pairs. Pre-compute at check-in close. For very large events, batch compute incrementally as people arrive. |
| Is openToRematch private? | Yes — set by each individual. The host never sees it and cannot override it. The algorithm honours it silently. |
| Business model? | B2B SaaS — organiser pays per event or per attendee. ROI is measurable via post-event connection ratings. |

---

*VentureGraph — Architecture & Implementation Guide v3*
*HackWithBay 2.0 | Track 9 | Neo4j + RocketRide AI*

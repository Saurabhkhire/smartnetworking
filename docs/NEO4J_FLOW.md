# VentureGraph — Neo4j Graph Database Flow

> How people, events, skills, and connections are modelled as a property graph.

---

## 1. Graph Data Model

### Node Types

```
(:Person)
  id, name, email, roles[], companyName, companyStage,
  purpose, seeksRoles[], openToRematch, eventIntent,
  summary, headline, linkedinUrl,
  workExperience (JSON string), certifications (array),
  projects (JSON string)

(:Event)
  id, name, type, date, startTime, endTime,
  durationMins, roundMins, groupSizeMin, groupSizeMax,
  priorityTheme, hostId, description, location, blasts[]

(:Skill)
  id, name, category

(:Goal)
  id, personId, eventId, purposeTag

(:Group)
  id, eventId, roundNumber

(:Company)
  id, name, stage

(:Profile)
  personId, email, headline, description, linkedinUrl,
  previousCompanies (JSON), certifications (JSON), projects (JSON)
```

### Relationship Types

```
(Person)-[:ATTENDED {checkedInAt}]->(Event)
(Person)-[:HAS_GOAL]->(Goal)
(Person)-[:HAS_SKILL {level}]->(Skill)
(Person)-[:SEEKS_SKILL {urgency}]->(Skill)
(Person)-[:WANTS_TO_MEET]->(Person)
(Person)-[:BLOCKED {createdAt}]->(Person)
(Person)-[:MET {rating, wouldMeetAgain, notes, metAt}]->(Person)
(Person)-[:WORKS_AT {current}]->(Company)
(Group)-[:HAS_MEMBER]->(Person)
```

---

## 2. Graph Diagram

```
                    [:HAS_SKILL]
     (Person) ─────────────────────► (Skill)
         │                               ▲
         │ [:SEEKS_SKILL]                │
         └───────────────────────────────┘
         │
         │ [:ATTENDED]
         ▼
      (Event)
         │
         │ [:HAS_MEMBER via Group]
         ▼
      (Group) ──[:HAS_MEMBER]──► (Person)
                                  (Person)
                                  (Person)

     (Person) ──[:WANTS_TO_MEET]──► (Person)
     (Person) ──[:BLOCKED]──────────► (Person)
     (Person) ──[:MET {rating}]──────► (Person)
     (Person) ──[:WORKS_AT]──────────► (Company)
```

---

## 3. Key Cypher Queries

### Find all attendees of an event with their skills

```cypher
MATCH (p:Person)-[:ATTENDED]->(e:Event {id: $eventId})
OPTIONAL MATCH (p)-[:HAS_SKILL]->(s:Skill)
OPTIONAL MATCH (p)-[:SEEKS_SKILL]->(sk:Skill)
RETURN p, collect(DISTINCT s.name) AS skillsHave,
          collect(DISTINCT sk.name) AS skillsSeek
```

### Layer 1 Scoring — Role-seek pairs

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
WHERE aWantsBCount > 0 OR bWantsACount > 0
RETURN a.id AS personA, b.id AS personB,
  namedBonus +
  CASE WHEN aWantsBCount > 0 THEN 25 ELSE 0 END +
  CASE WHEN bWantsACount > 0 THEN 25 ELSE 0 END AS layer1Score
```

### Layer 2 — Skill overlap enrichment

```cypher
MATCH (a:Person {id: $personA})-[:HAS_SKILL]->(s:Skill)<-[:SEEKS_SKILL]-(b:Person {id: $personB})
RETURN count(s) AS aToB_skills

MATCH (b:Person {id: $personB})-[:HAS_SKILL]->(s:Skill)<-[:SEEKS_SKILL]-(a:Person {id: $personA})
RETURN count(s) AS bToA_skills
```

### Find top people to meet at an event (graph traversal)

```cypher
MATCH (me:Person {id: $myId})-[:ATTENDED]->(e:Event {id: $eventId})
MATCH (other:Person)-[:ATTENDED]->(e)
WHERE other.id <> me.id
  AND NOT (me)-[:BLOCKED]->(other)
WITH me, other,
  size([r IN me.seeksRoles WHERE r IN other.roles]) AS roleMatch,
  size([r IN other.seeksRoles WHERE r IN me.roles]) AS reverseMatch
OPTIONAL MATCH (me)-[:HAS_SKILL]->(ms:Skill)<-[:SEEKS_SKILL]-(other)
OPTIONAL MATCH (other)-[:HAS_SKILL]->(os:Skill)<-[:SEEKS_SKILL]-(me)
RETURN other.name, other.roles, other.companyName,
       roleMatch, reverseMatch,
       count(DISTINCT ms) AS mySkillsTheyNeed,
       count(DISTINCT os) AS theirSkillsINeed
ORDER BY (roleMatch + reverseMatch + count(DISTINCT ms) + count(DISTINCT os)) DESC
LIMIT 10
```

### Save a group assignment

```cypher
CREATE (g:Group {id: $groupId, eventId: $eventId, roundNumber: $round})
WITH g
UNWIND $memberIds AS memberId
MATCH (p:Person {id: memberId})
CREATE (g)-[:HAS_MEMBER]->(p)
```

### Load all group rounds for an event

```cypher
MATCH (g:Group {eventId: $eventId})-[:HAS_MEMBER]->(p:Person)
RETURN g.id AS groupId, g.roundNumber AS round, p.id AS personId, p.name AS personName
ORDER BY g.roundNumber, g.id
```

### Record a post-event connection

```cypher
MATCH (a:Person {id: $fromId})
MATCH (b:Person {id: $toId})
MERGE (a)-[r:MET {eventId: $eventId}]->(b)
SET r.rating = $rating,
    r.wouldMeetAgain = $wouldMeetAgain,
    r.notes = $notes,
    r.metAt = datetime()
```

### Persona insight computation

```cypher
MATCH (p:Person)-[:ATTENDED]->(:Event)
WITH p, count(*) AS eventsAttended
MATCH (p)-[:MET]->(o:Person)
WITH p, eventsAttended, count(DISTINCT o) AS uniqueConnections,
     collect(DISTINCT o.roles) AS connectedRoles
RETURN p.id, eventsAttended, uniqueConnections,
       size(apoc.coll.flatten(connectedRoles)) AS roleVariety
```

---

## 4. Neo4j vs SQLite — Decision Matrix

| Scenario | SQLite | Neo4j |
|----------|--------|-------|
| Local development, quick demo | ✅ Best | Overkill |
| Finding shared connections | Slow (JOIN) | Fast (graph traversal) |
| "Who has Alice met?" | 3 JOINs | 1 hop |
| "Friends-of-friends" for introductions | 5+ JOINs | 2-hop MATCH |
| Scale > 10,000 attendees | Limited | Handles well |
| Real-time check-in updates | ✅ Fine | ✅ Fine |
| Storing JSON (workExperience) | Native JSON1 | JSON string property |
| Hackathon demo (no setup) | ✅ Zero config | Needs AuraDB account |

---

## 5. Neo4j Seed Data Flow

```
npm run db:mock  (runs server/scripts/seed-mock.js)
        │
        ├─ Creates :Skill nodes (20 skills)
        ├─ Creates 60 :Event nodes
        │
        └─ For each LIVE event (4 events × 60 attendees):
              │
              ├─ Creates :Person {id, name, email, roles, companyName,
              │          workExperience (JSON), certifications, projects,
              │          headline, summary, linkedinUrl}
              │
              ├─ Creates [:HAS_SKILL] relationships (3 per person)
              ├─ Creates [:SEEKS_SKILL] relationships (2 per person)
              │
              ├─ Creates :Goal node
              ├─ Creates [:HAS_GOAL] relationship
              │
              └─ Creates [:ATTENDED {checkedInAt}] relationship
```

**Attendee email format:** `{first}.{last}.{idx}@techfounder.dev`

**Example for Bay Area Founders Mixer (global offset 120):**
```
alex.rodriguez.120@techfounder.dev
jordan.davis.121@techfounder.dev
morgan.white.122@techfounder.dev
...
```
Login with any of these emails (no password needed — email-only auth).

---

## 6. AuraDB Connection

```
NEO4J_URI=neo4j+s://xxxxxxxx.databases.neo4j.io  ← encrypted bolt
NEO4J_USER=neo4j
NEO4J_PASSWORD=...
NEO4J_DATABASE=neo4j
```

The driver (`server/src/db/neo4j.js`) creates one session pool shared across all requests. Each query uses `runQuery(cypher, params)` which:
1. Opens a session
2. Runs the query with APOC-safe parameter binding
3. Returns Neo4j `Record[]` for mapping

---

## 7. Graph Advantages for Networking

The killer feature of Neo4j for a networking platform:

```cypher
-- "Do I have a mutual connection with this person?"
MATCH path = (me:Person {id: $myId})-[:MET*1..2]-(target:Person {id: $targetId})
RETURN path, length(path)
ORDER BY length(path)
LIMIT 5

-- "Who could introduce me to investors I haven't met?"
MATCH (me:Person {id: $myId})-[:MET]->(connector:Person)
     -[:MET]->(investor:Person)
WHERE investor.roles CONTAINS 'Investor'
  AND NOT (me)-[:MET]->(investor)
  AND NOT (me)-[:BLOCKED]->(investor)
RETURN investor.name, investor.companyName, connector.name AS via
ORDER BY investor.companyName
LIMIT 10
```

These queries are single Cypher traversals vs. 4+ SQL JOINs with subqueries.

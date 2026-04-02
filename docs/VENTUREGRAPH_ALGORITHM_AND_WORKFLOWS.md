# VentureGraph — How It Works (explained so anyone can follow along)

**Note for adults:** This is the same logic as the code in `server/src/services/matching.js`. The words are simple on purpose so kids, newcomers, or non‑engineers can still “get it.”

**Also available (more technical):**

- [Algorithm — technical deep dive](./ALGORITHM_TECHNICAL_DEEP_DIVE.md)
- [RocketRide DAP + AI adapter](./ROCKETRIDE_DAP_AND_AI_ADAPTER.md)
- [Mock data & sample emails](./MOCK_DATA_REFERENCE.md)
- Combined Word export: run `npm run docs:word` from the repo root → `docs/generated/SmartNetworking_Algorithm_and_AI.docx`

---

## Picture the whole thing like a school party

Imagine your school is throwing a **networking party**. Lots of people show up. Each person has:

- **Jobs they say they do** (like: “I’m an artist” or “I’m a builder”).
- **Jobs they hope to meet** (like: “I want to talk to a scientist”).
- **Skills they have** and **skills they wish someone else had** (like: “I want to learn piano and I can teach math”).

The computer is like a **very fair helper teacher**. It does **not** pick friends for you like magic. It **adds up points** so that people who *should* have a useful conversation are more likely to sit together or meet in order.

We call that adding-up **scoring**. Higher score = **better match** for a conversation.

---

## What is saved in the “big notebook” (the graph database)?

Think of a giant notebook (**Neo4j**) where each page is a fact:

- **Who** came to **which party**.
- **What** they wrote about themselves (roles, skills, company).
- **Who said “I don’t want to meet that person again.”** (block list.)
- **Who already met whom before** and whether it went well (stars 1–5).
- For **rotation games**: **which table** someone sat at in **round 1, round 2**, …

The matching brain reads this notebook and updates it when the organizer runs the tools.

---

## The story in order (what happens step by step)

### Step 1 — Sign up (register)

You tell the app your name, what you do, what you want, and your skills.  
The notebook now knows **you exist** and **which party** you care about.

### Step 2 — “I’m here!” (check-in)

When you arrive, you check in. Now the notebook marks you as **really at the party**.

> **Why it matters:** The helper only scores people who **checked in**. People who only signed up but didn’t show up are skipped.

### Step 3 — The helper counts “friend points” (compute scores)

The organizer presses **Compute scores**.  
The computer looks at **every pair** of people at the party (two at a time) and gives them a **total score**.

### Step 4 — Two kinds of parties

**A) Icebreaker = small circles that rotate**  
Like musical chairs, but with **small groups**. Every 10 minutes (or whatever the grown-ups set), you move to a **new circle**. The helper tries to put you with people you **fit well with**, and it tries **not** to trap you with someone you already sat with in an earlier round if it can help it.

**B) Open networking = one-on-one chats**  
Like speed dating for work. You get a list: “First chat with Sam, then with Priya, then …” ordered by **best score first**.

### Step 5 — After you chat (optional ratings)

You can tap **how much you liked** meeting someone (1–5 stars).  
If lots of people say “I liked meeting engineers,” the notebook may remember: **“This person often enjoys meeting engineers.”** That can give a small bonus **next time**.

---

## How “friend points” are counted (still simple)

We use **two rounds of counting**. Think of it like a video game with **two levels**.

### Level 1 — “Do our jobs match what we want?”

The computer only keeps pairs where **at least one person’s ‘want list’ hits the other person’s job list.**

Examples:

- **Alex wants to meet an engineer.** **Blake says “I’m an engineer.”** → **Good. We keep this pair.**
- Neither side matches → **Skip.** No points wasted on random pairs.

Then we add **bonus stars**:

- **Gold star:** “I wrote down this **exact name** as someone I want to meet.” (+ big bonus.)
- **Silver stars:** Each direction where **what I want** lines up with **what you do** (+ medium bonus.)

**Level 1 score** = gold stars + silver stars.

### Level 2 — “What else makes this a smart match?”

We start from Level 1 and add more stars:

1. **Skill puzzle pieces**  
   *You wish you had skill X. The other person actually has skill X.*  
   That adds points (up to a cap so one trick doesn’t explode the score).

2. **Memory from last time**  
   If you met before:
   - Both liked it → **extra happy points.**
   - One liked it → **a few points.**
   - Someone really disliked it → **take points away** so we don’t force awkward reunions.

3. **“You usually like meeting doctors”** (persona)  
   If the notebook learned that from many past star ratings, and this person **is** a doctor → **small extra star.**

**Total score** = Level 1 + skills + memory + persona.

Then we **sort** all pairs from **highest score to lowest**, like a class leaderboard.

---

## Kid-style “recipe” for the computer (pseudocode)

### Recipe A — Score everyone at one party

```
FUNCTION score_party(party_id):
    list_all_pairs_who_checked_in(party_id)
    throw away pairs that are blocked or “not allowed”
    keep only pairs where at least one “want” matches the other “job”
    give each kept pair LEVEL_1 points

    for each kept pair:
        add LEVEL_2 points for skill fit
        add or subtract points for “met before” feelings
        add tiny points if “notebook says you like this type of person”

    sort pairs from biggest total to smallest total
    return the sorted list
```

### Recipe B — Size the tables (no table too tiny or too huge)

The grown-ups choose: **at least 3 chairs, at most 6 chairs** per table.

```
FUNCTION how_many_chairs_per_table(total_kids, smallest_table, biggest_table):
    try different numbers of tables
    split kids so every table is between smallest_table and biggest_table
    every kid sits exactly once
    return the list of table sizes   // e.g. 5,5,5,5 for 20 kids
```

So we **never** put **7** people at a **max‑6** table on purpose.

### Recipe C — Fill one table with the “best buddies” we can

```
FUNCTION fill_one_table(empty_seats_goal, everyone_still_waiting):
    sit the first waiting person
    while table not full and people still waiting:
        pick the waiting person who adds the MOST extra points with people already at the table
        if that person already sat with someone at this table in an earlier round:
               try someone else if possible
        sit that person
    remember: everyone at this table has now “met in the same circle” for next round’s rules
```

Repeat for **each table size** from Recipe B until everyone is seated.

### Recipe D — One-on-one list for open networking

```
FUNCTION who_do_I_meet_first(me, sorted_pairs, how_many_time_slots):
    take all pairs that include me
    sort by highest score
    take only the first “how_many_time_slots” people
    return them in order: “slot 1, slot 2, slot 3 …”
```

---

## Tiny story with numbers (made-up kids)

**Players:** Alex and Blake, both checked in.

- Alex **wants to meet** an **Engineer**. Blake **says** “I am an Engineer.”  
  → Level 1 gives **25** friendship points for that direction.

- Alex **wants to learn Python**. Blake **has Python** on their skill card.  
  → Level 2 adds more points (capped), say **+8**.

- They never met before.  
  → **0** from memory.

**Total might be around 33** — higher than a random pair with **0** match.

Now multiply this idea for **everyone** at the party. That’s the leaderboard.

**Icebreaker with 20 people, tables 3–6 seats:**  
The computer first decides **four tables of 5** (because 20 = 5+5+5+5 and every number is between 3 and 6). Then it fills each table using Recipe C.

---

## What the organizer clicks (for adults who run buttons)

1. **Compute scores** → runs Recipe A, keeps results in short‑term memory (**scoreStore**) until the server restarts.
2. **Assign groups** (icebreaker only) → deletes old saved circles, runs table recipes, saves new **Group** notes in Neo4j, returns **timesheets** (who sits where and when).
3. **View timesheets** → reads saved circles and rebuilds the printed schedule.

For **open networking**, skip “assign groups”; each person uses their **ordered meet list**.

---

## What a “timesheet” looks like in plain English

For each person at an **icebreaker** party, we print:

- **Your special tip:** “You and **Sam** have the **highest** match score — try hard to say hi.”
- **Round 1:** From **6:00 to 6:10**, you are in **Group 2** with **Lee, Jordan, …**
- **Round 2:** From **6:10 to 6:20**, new group, new names, …

Times come from **start time** + **round length**.

---

## “Gotchas” in normal words

- You must click **Compute scores** **before** **Assign groups**, or the helper says “I’m not ready.”
- If the **server restarts**, short‑term memory forgets scores — click **Compute scores** again.
- Only **checked‑in** guests join the game.

---

## Where the grown‑up code lives (map)

| File | Plain meaning |
|------|----------------|
| `server/src/services/matching.js` | All the math: levels 1–2, tables, schedules, timesheets, insights. |
| `server/src/routes/matching.js` | Web buttons: compute, assign groups, fetch timesheets. |
| `server/src/routes/events.js` | Sign‑up, check‑in, guest lists. |
| `server/src/routes/connections.js` | Star ratings after a chat. |

---

## Make a Word file again (optional)

If you have **Pandoc** installed, from your project folder you can run:

```bash
pandoc docs/VENTUREGRAPH_ALGORITHM_AND_WORKFLOWS.md -o docs/VENTUREGRAPH_ALGORITHM_AND_WORKFLOWS.docx
```

That makes a `.docx` copy of this same story.

---

*Simple words, same big ideas — Smart Networking / VentureGraph.*

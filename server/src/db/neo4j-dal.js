/**
 * Neo4j DAL — all domain functions using Cypher.
 * Extracted from routes and services.
 */
const { runQuery } = require('./neo4j');
const { v4: uuidv4 } = require('uuid');

/** Normalize Person node props (JSON strings from seeds → arrays/objects). */
function parseNeoPerson(raw) {
  if (!raw) return null;
  const p = { ...raw };
  for (const k of ['roles', 'seeksRoles', 'certifications']) {
    if (typeof p[k] === 'string') {
      try {
        p[k] = JSON.parse(p[k]);
      } catch {
        p[k] = [];
      }
    }
    if (!Array.isArray(p[k])) p[k] = p[k] == null ? [] : [p[k]];
  }
  for (const k of ['workExperience', 'projects']) {
    if (typeof p[k] === 'string') {
      try {
        p[k] = JSON.parse(p[k]);
      } catch {
        p[k] = [];
      }
    } else if (!Array.isArray(p[k])) p[k] = [];
  }
  return p;
}

// ── Events ──────────────────────────────────────────────────────────────────

async function createEvent(data) {
  const {
    name, type, date, startTime = '18:00', durationMins = 60,
    roundMins = 10, groupSizeMin = 3, groupSizeMax = 6, priorityTheme = '',
    hostId = null, description = '', location = '', blasts = [],
  } = data;
  const id = uuidv4();
  const totalMins = Number(durationMins);
  const startH = parseInt((startTime || '18:00').split(':')[0], 10);
  const startM = parseInt((startTime || '18:00').split(':')[1], 10);
  const endTotal = startH * 60 + startM + totalMins;
  const endTime = `${String(Math.floor(endTotal / 60) % 24).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`;

  await runQuery(
    `CREATE (e:Event {
      id: $id, name: $name, type: $type, date: $date,
      startTime: $startTime, endTime: $endTime,
      durationMins: $durationMins, roundMins: $roundMins,
      groupSizeMin: $groupSizeMin, groupSizeMax: $groupSizeMax,
      priorityTheme: $priorityTheme, hostId: $hostId,
      description: $description, location: $location, blasts: $blasts
    })`,
    { id, name, type, date, startTime: String(startTime), endTime, durationMins: Number(durationMins),
      roundMins: Number(roundMins), groupSizeMin: Number(groupSizeMin), groupSizeMax: Number(groupSizeMax),
      priorityTheme, hostId, description, location, blasts: Array.isArray(blasts) ? blasts : [] }
  );
  return { id, name, type, date, startTime, endTime, durationMins, roundMins, groupSizeMin, groupSizeMax, hostId, description, location, blasts };
}

function toNeoEvent(props, hostName = null, attendeesCount = 0) {
  if (!props) return null;
  return {
    ...props,
    hostName: hostName || null,
    attendeesCount: attendeesCount || 0,
    blasts: Array.isArray(props.blasts) ? props.blasts : [],
  };
}

async function getEvent(id) {
  const records = await runQuery(
    `MATCH (e:Event {id: $id})
     OPTIONAL MATCH (h:Person {id: e.hostId})
     WITH e, h, size([(p:Person)-[:ATTENDED]->(e) | p]) AS attendeesCount
     RETURN e, h.name AS hostName, attendeesCount`,
    { id }
  );
  if (!records.length) return null;
  return toNeoEvent(records[0].get('e').properties, records[0].get('hostName'), records[0].get('attendeesCount'));
}

async function listEvents() {
  const records = await runQuery(
    `MATCH (e:Event)
     OPTIONAL MATCH (h:Person {id: e.hostId})
     WITH e, h, size([(p:Person)-[:ATTENDED]->(e) | p]) AS attendeesCount
     RETURN e, h.name AS hostName, attendeesCount
     ORDER BY e.date ASC, e.startTime ASC`
  );
  return records.map(r => toNeoEvent(r.get('e').properties, r.get('hostName'), r.get('attendeesCount')));
}

async function listEventsByDate(date) {
  const records = await runQuery(
    `MATCH (e:Event {date: $date})
     OPTIONAL MATCH (h:Person {id: e.hostId})
     WITH e, h, size([(p:Person)-[:ATTENDED]->(e) | p]) AS attendeesCount
     RETURN e, h.name AS hostName, attendeesCount
     ORDER BY e.startTime ASC`,
    { date }
  );
  return records.map(r => toNeoEvent(r.get('e').properties, r.get('hostName'), r.get('attendeesCount')));
}

async function listEventsByDateRange(startDate, endDate) {
  const records = await runQuery(
    `MATCH (e:Event)
     WHERE e.date >= $startDate AND e.date <= $endDate
     OPTIONAL MATCH (h:Person {id: e.hostId})
     WITH e, h, size([(p:Person)-[:ATTENDED]->(e) | p]) AS attendeesCount
     RETURN e, h.name AS hostName, attendeesCount
     ORDER BY e.date ASC, e.startTime ASC`,
    { startDate, endDate }
  );
  return records.map(r => toNeoEvent(r.get('e').properties, r.get('hostName'), r.get('attendeesCount')));
}

// ── Persons ──────────────────────────────────────────────────────────────────

async function createOrMergePerson(personId, data) {
  const {
    name, roles = [], companyName = '', companyStage = '', purpose = '',
    seeksRoles = [], openToRematch = true, eventIntent = '',
    email = '', summary = '', headline = '', linkedinUrl = '',
    workExperience = [], certifications = [], projects = [],
  } = data;
  await runQuery(
    `MERGE (p:Person {id: $personId})
     SET p.name = $name, p.roles = $roles, p.companyName = $companyName,
         p.companyStage = $companyStage, p.purpose = $purpose,
         p.seeksRoles = $seeksRoles, p.openToRematch = $openToRematch,
         p.eventIntent = $eventIntent, p.email = $email,
         p.summary = $summary, p.headline = $headline, p.linkedinUrl = $linkedinUrl,
         p.workExperience = $workExperience, p.certifications = $certifications, p.projects = $projects`,
    {
      personId, name, roles, companyName, companyStage, purpose, seeksRoles, openToRematch, eventIntent,
      email, summary, headline, linkedinUrl, workExperience, certifications, projects,
    }
  );
}

async function getPerson(personId) {
  const records = await runQuery('MATCH (p:Person {id: $personId}) RETURN p', { personId });
  if (!records.length) return null;
  return parseNeoPerson(records[0].get('p').properties);
}

async function getPersonWithSkills(personId) {
  const pRec = await runQuery('MATCH (p:Person {id: $personId}) RETURN p', { personId });
  if (!pRec.length) return null;
  const person = parseNeoPerson(pRec[0].get('p').properties);
  const skillRec = await runQuery(
    `MATCH (p:Person {id: $personId})-[r:HAS_SKILL]->(s:Skill) RETURN s.id AS id, s.name AS name, r.level AS level
     UNION
     MATCH (p:Person {id: $personId})-[r:SEEKS_SKILL]->(s:Skill) RETURN s.id AS id, s.name AS name, 'seek' AS level`,
    { personId }
  );
  return { ...person, skills: skillRec.map(r => ({ id: r.get('id'), name: r.get('name'), level: r.get('level') })) };
}

async function getPersonWithSkillsForProfile(personId) {
  const pRec = await runQuery('MATCH (p:Person {id: $personId}) RETURN p', { personId });
  if (!pRec.length) return null;
  const person = parseNeoPerson(pRec[0].get('p').properties);
  const haveRec = await runQuery(
    `MATCH (p:Person {id: $personId})-[r:HAS_SKILL]->(s:Skill) RETURN s.id AS id, s.name AS skill_name, r.level AS level, s.category AS category`,
    { personId }
  );
  const seekRec = await runQuery(
    `MATCH (p:Person {id: $personId})-[r:SEEKS_SKILL]->(s:Skill) RETURN s.id AS id, s.name AS skill_name, r.urgency AS level, s.category AS category`,
    { personId }
  );
  const skillsHave = haveRec.map(r => ({ id: r.get('id'), name: r.get('skill_name'), level: r.get('level'), category: r.get('category') }));
  const skillsSeek = seekRec.map(r => ({ id: r.get('id'), name: r.get('skill_name'), level: r.get('level'), category: r.get('category') }));
  return { ...person, skillsHave, skillsSeek };
}

async function lookupPersonByNameInEvent(eventId, name) {
  const records = await runQuery(
    `MATCH (p:Person)-[:ATTENDED]->(e:Event {id: $eventId})
     WHERE toLower(trim(p.name)) = toLower(trim($name))
     RETURN p.id AS id`,
    { eventId, name }
  );
  if (!records.length) return null;
  return { id: records[0].get('id') };
}

async function ensureSkill(id, name, category) {
  await runQuery(
    `MERGE (s:Skill {id: $id}) ON CREATE SET s.name = $name, s.category = $category`,
    { id, name, category: category || 'general' }
  );
}

async function addPersonHasSkill(personId, skillId, level) {
  await runQuery(
    `MATCH (p:Person {id: $personId}) MATCH (s:Skill {id: $skillId})
     MERGE (p)-[:HAS_SKILL {level: $level}]->(s)`,
    { personId, skillId, level: level || 'mid' }
  );
}

async function addPersonSeeksSkill(personId, skillId, urgency) {
  await runQuery(
    `MATCH (p:Person {id: $personId}) MATCH (s:Skill {id: $skillId})
     MERGE (p)-[:SEEKS_SKILL {urgency: $urgency}]->(s)`,
    { personId, skillId, urgency: urgency || 'medium' }
  );
}

async function addWantsToMeet(personId, targetId) {
  await runQuery(
    `MATCH (p:Person {id: $personId}) MATCH (t:Person {id: $targetId})
     MERGE (p)-[:WANTS_TO_MEET]->(t)`,
    { personId, targetId }
  );
}

async function addBlock(personId, targetId) {
  await runQuery(
    `MATCH (p:Person {id: $personId}) MATCH (t:Person {id: $targetId})
     MERGE (p)-[:BLOCKED {createdAt: datetime()}]->(t)`,
    { personId, targetId }
  );
}

async function mergeCompany(companyName, companyStage, personId) {
  const companyId = uuidv4();
  await runQuery(
    `MERGE (c:Company {name: $companyName})
     ON CREATE SET c.id = $companyId, c.stage = $companyStage
     WITH c
     MATCH (p:Person {id: $personId})
     MERGE (p)-[:WORKS_AT {current: true}]->(c)`,
    { companyName, companyId, companyStage, personId }
  );
}

async function getPersonName(personId) {
  const records = await runQuery('MATCH (p:Person {id: $personId}) RETURN p.name AS name', { personId });
  return records[0]?.get('name') || '';
}

// ── Attendance ────────────────────────────────────────────────────────────────

async function createGoal(goalId, personId, eventId, purpose) {
  await runQuery(
    `MATCH (p:Person {id: $personId}) MATCH (e:Event {id: $eventId})
     CREATE (g:Goal {id: $goalId, personId: $personId, eventId: $eventId, purposeTag: $purpose})
     MERGE (p)-[:HAS_GOAL]->(g)`,
    { goalId, personId, eventId, purpose }
  );
}

async function checkIn(personId, eventId) {
  await runQuery(
    `MATCH (p:Person {id: $personId}) MATCH (e:Event {id: $eventId})
     MERGE (p)-[a:ATTENDED]->(e) SET a.checkedInAt = datetime()`,
    { personId, eventId }
  );
}

async function getAttendees(eventId) {
  const records = await runQuery(
    `MATCH (p:Person)-[:ATTENDED]->(e:Event {id: $eventId})
     RETURN p`,
    { eventId }
  );
  return records.map((r) => {
    const parsed = parseNeoPerson(r.get('p').properties);
    const company = parsed.companyName || '';
    return {
      ...parsed,
      company,
      companyName: company,
    };
  });
}

async function getPendingCheckin(eventId) {
  const records = await runQuery(
    `MATCH (p:Person)-[:HAS_GOAL]->(g:Goal {eventId: $eventId})
     WHERE NOT (p)-[:ATTENDED]->(:Event {id: $eventId})
     RETURN p.id AS id, p.name AS name ORDER BY toLower(p.name)`,
    { eventId }
  );
  return records.map(r => ({ id: r.get('id'), name: r.get('name') }));
}

// ── Matching ──────────────────────────────────────────────────────────────────

async function computeLayer1Pairs(eventId) {
  const records = await runQuery(
    `
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
    WITH a, b,
      namedBonus +
      (CASE WHEN aWantsBCount > 0 THEN 25 ELSE 0 END) +
      (CASE WHEN bWantsACount > 0 THEN 25 ELSE 0 END) AS layer1Score
    RETURN a.id AS pA, b.id AS pB, layer1Score
    ORDER BY layer1Score DESC
    `,
    { eventId }
  );
  return records.map(r => ({ pA: r.get('pA'), pB: r.get('pB'), layer1Score: r.get('layer1Score') }));
}

async function computeLayer2Scores(validPairs) {
  if (!validPairs.length) return [];
  const records = await runQuery(
    `
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
    ORDER BY totalScore DESC
    `,
    { validPairs }
  );
  return records.map(r => ({ personA: r.get('personA'), personB: r.get('personB'), totalScore: r.get('totalScore') }));
}

// ── Groups ────────────────────────────────────────────────────────────────────

async function deleteGroups(eventId) {
  await runQuery('MATCH (g:Group {eventId: $eventId}) DETACH DELETE g', { eventId });
}

async function createGroup(eventId, groupId, round, members) {
  await runQuery(
    `MATCH (e:Event {id: $eventId})
     CREATE (g:Group {id: $groupId, eventId: $eventId, roundNumber: $round})
     WITH g
     UNWIND $members AS pid
     MATCH (p:Person {id: pid})
     MERGE (p)-[:IN_GROUP {roundNumber: $round}]->(g)`,
    { eventId, groupId, round, members }
  );
}

async function loadGroupRounds(eventId) {
  const records = await runQuery(
    `MATCH (g:Group {eventId: $eventId})
     MATCH (p:Person)-[ig:IN_GROUP]->(g)
     WHERE ig.roundNumber = g.roundNumber
     WITH g.roundNumber AS round, g.id AS gid, collect(p.id) AS members
     RETURN round, gid, members
     ORDER BY round, gid`,
    { eventId }
  );
  const byRound = new Map();
  for (const r of records) {
    const round = r.get('round');
    const members = r.get('members');
    if (!byRound.has(round)) byRound.set(round, []);
    byRound.get(round).push({ members, score: 0 });
  }
  return Array.from(byRound.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([round, groups]) => ({ round, groups }));
}

// ── Connections ───────────────────────────────────────────────────────────────

async function rateConnection(fromId, toId, eventId, rating, wouldMeetAgain, notes) {
  await runQuery(
    `MATCH (a:Person {id: $fromId}) MATCH (b:Person {id: $toId})
     MERGE (a)-[m:MET {eventId: $eventId}]->(b)
     SET m.rating = $rating, m.wouldMeetAgain = $wouldMeetAgain,
         m.notes = $notes, m.metAt = datetime()`,
    { fromId, toId, eventId, rating, wouldMeetAgain, notes }
  );
}

// ── Insights ──────────────────────────────────────────────────────────────────

async function computePersonaInsights() {
  await runQuery(`
    MATCH (p:Person)-[m:MET]->(other:Person)
    WHERE m.rating IS NOT NULL
    WITH p, other, m, [r IN other.roles WHERE r IS NOT NULL] AS otherRoles
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
    SET ins.value = role, ins.confidence = confidence,
        ins.totalMeetings = totalMeetings, ins.highRated = highRated,
        ins.computedAt = datetime()
    MERGE (p)-[:HAS_INSIGHT]->(ins)
  `);
}

async function getPersonInsights(personId) {
  const records = await runQuery(
    `MATCH (p:Person {id: $personId})-[:HAS_INSIGHT]->(ins:PersonaInsight)
     RETURN ins.insightType AS type, ins.value AS value, ins.confidence AS confidence`,
    { personId }
  );
  return records.map(r => ({ type: r.get('type'), value: r.get('value'), confidence: r.get('confidence') }));
}

// ── Profile ───────────────────────────────────────────────────────────────────

async function saveProfile(personId, profile) {
  await runQuery(
    `MERGE (pr:Profile {personId: $personId})
     SET pr.email = $email, pr.headline = $headline, pr.description = $description,
         pr.linkedinUrl = $linkedinUrl, pr.previousCompanies = $previousCompanies,
         pr.certifications = $certifications, pr.projects = $projects`,
    {
      personId,
      email: profile.email || '',
      headline: profile.headline || '',
      description: profile.description || '',
      linkedinUrl: profile.linkedinUrl || '',
      previousCompanies: JSON.stringify(profile.previousCompanies || []),
      certifications: JSON.stringify(profile.certifications || []),
      projects: JSON.stringify(profile.projects || []),
    }
  );
}

async function getProfile(personId) {
  const records = await runQuery('MATCH (pr:Profile {personId: $personId}) RETURN pr', { personId });
  if (!records.length) return null;
  const p = records[0].get('pr').properties;
  return {
    ...p,
    previousCompanies: tryParse(p.previousCompanies, []),
    certifications: tryParse(p.certifications, []),
    projects: tryParse(p.projects, []),
  };
}

function tryParse(val, fallback) {
  try { return JSON.parse(val); } catch { return fallback; }
}

// ── Event Suggestions ─────────────────────────────────────────────────────────

async function getPersonForSuggestion(personId) {
  const pRec = await runQuery('MATCH (p:Person {id: $personId}) RETURN p', { personId });
  if (!pRec.length) return null;
  const person = parseNeoPerson(pRec[0].get('p').properties);
  const skillRec = await runQuery(
    `MATCH (p:Person {id: $personId})-[:HAS_SKILL]->(s:Skill) RETURN s.name AS name`,
    { personId }
  );
  const skillsHave = skillRec.map(r => r.get('name'));
  const seekRec = await runQuery(
    `MATCH (p:Person {id: $personId})-[:SEEKS_SKILL]->(s:Skill) RETURN s.name AS name`,
    { personId }
  );
  const skillsSeek = seekRec.map(r => r.get('name'));
  const evRec = await runQuery(
    `MATCH (p:Person {id: $personId})-[:ATTENDED]->(e:Event) RETURN e.id AS id`,
    { personId }
  );
  const previousEvents = evRec.map(r => r.get('id'));
  return { ...person, skillsHave, skillsSeek, previousEvents };
}

async function getPersonByEmail(email) {
  const records = await runQuery(
    `MATCH (p:Person)
     WHERE toLower(p.email) = toLower($email)
     RETURN p
     LIMIT 1`,
    { email }
  );
  if (!records.length) return null;
  return parseNeoPerson(records[0].get('p').properties);
}

async function getMyEvents(personId, hostId) {
  const hosted = hostId
    ? (await runQuery(
      `MATCH (e:Event {hostId: $hostId})
       OPTIONAL MATCH (h:Person {id: e.hostId})
       WITH e, h, size([(p:Person)-[:ATTENDED]->(e) | p]) AS attendeesCount
       RETURN e, h.name AS hostName, attendeesCount
       ORDER BY e.date ASC, e.startTime ASC`,
      { hostId }
    )).map(r => toNeoEvent(r.get('e').properties, r.get('hostName'), r.get('attendeesCount')))
    : [];

  const registered = personId
    ? (await runQuery(
      `MATCH (p:Person {id: $personId})
       MATCH (e:Event)
       WHERE ((p)-[:ATTENDED]->(e) OR (p)-[:HAS_GOAL]->(:Goal {eventId: e.id}))
         AND ($hostId = '' OR coalesce(e.hostId, '') <> $hostId)
       OPTIONAL MATCH (h:Person {id: e.hostId})
       WITH DISTINCT e, h, size([(att:Person)-[:ATTENDED]->(e) | att]) AS attendeesCount
       RETURN e, h.name AS hostName, attendeesCount
       ORDER BY e.date ASC, e.startTime ASC`,
      { personId, hostId: hostId || '' }
    )).map(r => toNeoEvent(r.get('e').properties, r.get('hostName'), r.get('attendeesCount')))
    : [];

  return { hosted, registered };
}

async function getHostedEvents(hostId) {
  const records = await runQuery(
    `MATCH (e:Event {hostId: $hostId})
     OPTIONAL MATCH (h:Person {id: e.hostId})
     WITH e, h, size([(p:Person)-[:ATTENDED]->(e) | p]) AS attendeesCount
     RETURN e, h.name AS hostName, attendeesCount
     ORDER BY e.date ASC, e.startTime ASC`,
    { hostId }
  );
  return records.map(r => toNeoEvent(r.get('e').properties, r.get('hostName'), r.get('attendeesCount')));
}

// Stub functions for Neo4j that are needed by auth routes
async function createUser() { return {}; }
async function getUserByEmail() { return null; }
async function getUserById() { return null; }
async function createEventRegistration() { return null; }
async function getEventRegistration() { return null; }
async function addPastEventHistory(personId, data) {
  const {
    eventName, eventDate, eventType = 'mixer', peopleMet = 0, connectionsMade = 0,
    highlights = '', rating = 4,
  } = data;
  const id = uuidv4();
  await runQuery(
    `MATCH (p:Person {id: $personId})
     CREATE (pe:PastEventRecord {
       id: $id, eventName: $eventName, eventDate: $eventDate, eventType: $eventType,
       peopleMet: $peopleMet, connectionsMade: $connectionsMade, highlights: $highlights, rating: $rating
     })
     MERGE (p)-[:PAST_EXPERIENCE]->(pe)`,
    {
      personId, id, eventName, eventDate, eventType,
      peopleMet: Number(peopleMet) || 0,
      connectionsMade: Number(connectionsMade) || 0,
      highlights: String(highlights || ''),
      rating: Number(rating) || 4,
    }
  );
}

async function getPastEventHistory(personId) {
  const records = await runQuery(
    `MATCH (p:Person {id: $personId})-[:PAST_EXPERIENCE]->(pe:PastEventRecord)
     RETURN pe ORDER BY pe.eventDate DESC`,
    { personId }
  );
  return records.map((r) => {
    const pe = r.get('pe').properties;
    return {
      id: pe.id,
      personId,
      eventName: pe.eventName,
      eventDate: pe.eventDate,
      eventType: pe.eventType,
      peopleMet: pe.peopleMet,
      connectionsMade: pe.connectionsMade,
      highlights: pe.highlights,
      rating: pe.rating,
    };
  });
}

module.exports = {
  // Users
  createUser, getUserByEmail, getUserById,
  // Events
  createEvent, getEvent, listEvents, listEventsByDate, listEventsByDateRange, getMyEvents, getHostedEvents,
  // Persons
  createOrMergePerson, getPerson, getPersonByEmail, getPersonWithSkills, getPersonWithSkillsForProfile, lookupPersonByNameInEvent,
  ensureSkill, addPersonHasSkill, addPersonSeeksSkill, addWantsToMeet, addBlock, mergeCompany, getPersonName,
  // Attendance
  createGoal, checkIn, getAttendees, getPendingCheckin,
  // Event Registrations
  createEventRegistration, getEventRegistration,
  // Past Event History
  addPastEventHistory, getPastEventHistory,
  // Matching
  computeLayer1Pairs, computeLayer2Scores,
  // Groups
  deleteGroups, createGroup, loadGroupRounds,
  // Connections
  rateConnection,
  // Insights
  computePersonaInsights, getPersonInsights,
  // Profile
  saveProfile, getProfile,
  // Suggestions
  getPersonForSuggestion,
};

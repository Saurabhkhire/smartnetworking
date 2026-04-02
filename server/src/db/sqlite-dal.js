/**
 * SQLite DAL — all domain functions using better-sqlite3.
 * Matching computed in-memory JavaScript.
 */
const path = require('path');
const { v4: uuidv4 } = require('uuid');

let db;

function getDb() {
  if (db) return db;
  const Database = require('better-sqlite3');
  const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '..', '..', 'venturegraph.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  initSchema(db);
  return db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      person_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY, name TEXT, type TEXT, date TEXT,
      start_time TEXT, end_time TEXT, duration_mins INTEGER, round_mins INTEGER,
      group_size_min INTEGER, group_size_max INTEGER, priority_theme TEXT,
      host_id TEXT DEFAULT NULL, description TEXT DEFAULT '', location TEXT DEFAULT '',
      blasts TEXT DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS persons (
      id TEXT PRIMARY KEY, name TEXT, roles TEXT DEFAULT '[]',
      company_name TEXT, company_stage TEXT, purpose TEXT,
      seeks_roles TEXT DEFAULT '[]', open_to_rematch INTEGER DEFAULT 1,
      event_intent TEXT,
      email TEXT DEFAULT '',
      summary TEXT DEFAULT '',
      headline TEXT DEFAULT '',
      linkedin_url TEXT DEFAULT '',
      work_experience TEXT DEFAULT '[]',
      certifications TEXT DEFAULT '[]',
      projects TEXT DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY, name TEXT, category TEXT
    );
    CREATE TABLE IF NOT EXISTS person_skills (
      person_id TEXT, skill_id TEXT, type TEXT, level TEXT,
      PRIMARY KEY(person_id, skill_id, type)
    );
    CREATE TABLE IF NOT EXISTS attendances (
      person_id TEXT, event_id TEXT, checked_in_at TEXT,
      PRIMARY KEY(person_id, event_id)
    );
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY, person_id TEXT, event_id TEXT, purpose_tag TEXT
    );
    CREATE TABLE IF NOT EXISTS wants_to_meet (
      person_id TEXT, target_id TEXT,
      PRIMARY KEY(person_id, target_id)
    );
    CREATE TABLE IF NOT EXISTS blocks (
      person_id TEXT, blocked_id TEXT,
      PRIMARY KEY(person_id, blocked_id)
    );
    CREATE TABLE IF NOT EXISTS connections (
      from_id TEXT, to_id TEXT, event_id TEXT, rating REAL,
      would_meet_again INTEGER, notes TEXT, met_at TEXT,
      PRIMARY KEY(from_id, to_id, event_id)
    );
    CREATE TABLE IF NOT EXISTS groups_tbl (
      id TEXT PRIMARY KEY, event_id TEXT, round_number INTEGER
    );
    CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT, person_id TEXT,
      PRIMARY KEY(group_id, person_id)
    );
    CREATE TABLE IF NOT EXISTS persona_insights (
      id TEXT PRIMARY KEY, person_id TEXT, insight_type TEXT,
      value TEXT, confidence REAL, total_meetings INTEGER, high_rated INTEGER
    );
    CREATE TABLE IF NOT EXISTS profiles (
      person_id TEXT PRIMARY KEY, email TEXT, headline TEXT,
      description TEXT, linkedin_url TEXT,
      previous_companies TEXT DEFAULT '[]',
      certifications TEXT DEFAULT '[]',
      projects TEXT DEFAULT '[]',
      work_experience TEXT DEFAULT '[]',
      summary TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS event_registrations (
      id TEXT PRIMARY KEY,
      person_id TEXT,
      event_id TEXT,
      who_you_are TEXT DEFAULT '',
      who_you_seek TEXT DEFAULT '',
      skills_you_seek TEXT DEFAULT '[]',
      purpose TEXT DEFAULT '',
      meet_same_people INTEGER DEFAULT 0,
      registered_at TEXT DEFAULT (datetime('now')),
      UNIQUE(person_id, event_id)
    );
    CREATE TABLE IF NOT EXISTS past_event_history (
      id TEXT PRIMARY KEY,
      person_id TEXT,
      event_name TEXT,
      event_date TEXT,
      event_type TEXT,
      people_met INTEGER DEFAULT 0,
      connections_made INTEGER DEFAULT 0,
      highlights TEXT DEFAULT '',
      rating INTEGER DEFAULT 4
    );
  `);

  // Migrate: add new columns to existing tables if missing
  const safeAlter = (table, col, def) => {
    try {
      const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
      if (!cols.includes(col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
    } catch {}
  };
  safeAlter('events', 'host_id', 'TEXT DEFAULT NULL');
  safeAlter('events', 'description', "TEXT DEFAULT ''");
  safeAlter('events', 'location', "TEXT DEFAULT ''");
  safeAlter('events', 'blasts', "TEXT DEFAULT '[]'");
  safeAlter('persons', 'email', "TEXT DEFAULT ''");
  safeAlter('persons', 'summary', "TEXT DEFAULT ''");
  safeAlter('persons', 'headline', "TEXT DEFAULT ''");
  safeAlter('persons', 'linkedin_url', "TEXT DEFAULT ''");
  safeAlter('persons', 'work_experience', "TEXT DEFAULT '[]'");
  safeAlter('persons', 'certifications', "TEXT DEFAULT '[]'");
  safeAlter('persons', 'projects', "TEXT DEFAULT '[]'");
  safeAlter('profiles', 'work_experience', "TEXT DEFAULT '[]'");
  safeAlter('profiles', 'summary', "TEXT DEFAULT ''");
}

function jp(v, fallback = []) {
  try { return JSON.parse(v); } catch { return fallback; }
}
function js(v) { return JSON.stringify(v); }

// ── Users ─────────────────────────────────────────────────────────────────────

function createUser(id, email, name, personId) {
  getDb().prepare(
    `INSERT INTO users (id, email, name, person_id) VALUES (?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET name=excluded.name, person_id=excluded.person_id`
  ).run(id, email.toLowerCase(), name, personId);
  return { id, email: email.toLowerCase(), name, personId };
}

function getUserByEmail(email) {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
}

function getUserById(id) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
}

// ── Events ──────────────────────────────────────────────────────────────────

function createEvent(data) {
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

  getDb().prepare(
    `INSERT INTO events (id,name,type,date,start_time,end_time,duration_mins,round_mins,group_size_min,group_size_max,priority_theme,host_id,description,location,blasts)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(id, name, type, date, String(startTime), endTime, Number(durationMins), Number(roundMins), Number(groupSizeMin), Number(groupSizeMax), priorityTheme, hostId, description, location, js(blasts));
  return { id, name, type, date, startTime, endTime, durationMins, roundMins, groupSizeMin, groupSizeMax, hostId, description, location, blasts };
}

function rowToEvent(row) {
  if (!row) return null;
  return {
    id: row.id, name: row.name, type: row.type, date: row.date,
    startTime: row.start_time, endTime: row.end_time,
    durationMins: row.duration_mins, roundMins: row.round_mins,
    groupSizeMin: row.group_size_min, groupSizeMax: row.group_size_max,
    priorityTheme: row.priority_theme,
    hostId: row.host_id || null,
    hostName: row.host_name || null,
    description: row.description || '',
    location: row.location || '',
    blasts: jp(row.blasts, []),
    attendeesCount: row.attendees_count || 0,
  };
}

function getEvent(id) {
  const row = getDb().prepare(`
    SELECT e.*, p.name AS host_name,
           (SELECT COUNT(*) FROM attendances a WHERE a.event_id = e.id) AS attendees_count
    FROM events e
    LEFT JOIN persons p ON p.id = e.host_id
    WHERE e.id = ?
  `).get(id);
  return rowToEvent(row);
}

function listEvents() {
  const rows = getDb().prepare(`
    SELECT e.*, p.name AS host_name,
           (SELECT COUNT(*) FROM attendances a WHERE a.event_id = e.id) AS attendees_count
    FROM events e
    LEFT JOIN persons p ON p.id = e.host_id
    ORDER BY e.date ASC, e.start_time ASC
  `).all();
  return rows.map(rowToEvent);
}

function listEventsByDate(date) {
  const rows = getDb().prepare(`
    SELECT e.*, p.name AS host_name,
           (SELECT COUNT(*) FROM attendances a WHERE a.event_id = e.id) AS attendees_count
    FROM events e
    LEFT JOIN persons p ON p.id = e.host_id
    WHERE e.date = ?
    ORDER BY e.start_time ASC
  `).all(date);
  return rows.map(rowToEvent);
}

function listEventsByDateRange(startDate, endDate) {
  const rows = getDb().prepare(`
    SELECT e.*, p.name AS host_name,
           (SELECT COUNT(*) FROM attendances a WHERE a.event_id = e.id) AS attendees_count
    FROM events e
    LEFT JOIN persons p ON p.id = e.host_id
    WHERE e.date >= ? AND e.date <= ?
    ORDER BY e.date ASC, e.start_time ASC
  `).all(startDate, endDate);
  return rows.map(rowToEvent);
}

function getMyEvents(personId, hostId) {
  const db = getDb();
  // Events hosted by this person (using host_id = personId for simplicity, since no userId)
  const hosted = hostId
    ? db.prepare(`
        SELECT e.*, p.name AS host_name,
               (SELECT COUNT(*) FROM attendances a WHERE a.event_id = e.id) AS attendees_count
        FROM events e
        LEFT JOIN persons p ON p.id = e.host_id
        WHERE e.host_id = ?
        ORDER BY e.date ASC, e.start_time ASC
      `).all(hostId).map(rowToEvent)
    : [];
  // Events the person registered for (has attendance or goal)
  let registered = [];
  if (personId) {
    registered = db.prepare(
      `SELECT DISTINCT e.*, p.name AS host_name,
              (SELECT COUNT(*) FROM attendances a WHERE a.event_id = e.id) AS attendees_count
       FROM events e
       LEFT JOIN persons p ON p.id = e.host_id
       LEFT JOIN attendances att ON att.event_id = e.id AND att.person_id = ?
       LEFT JOIN goals g ON g.event_id = e.id AND g.person_id = ?
       WHERE (att.person_id IS NOT NULL OR g.person_id IS NOT NULL)
         AND (e.host_id IS NULL OR e.host_id != ?)
       ORDER BY e.date ASC, e.start_time ASC`
    ).all(personId, personId, hostId || '').map(rowToEvent);
  }
  return { hosted, registered };
}

function getHostedEvents(hostId) {
  const rows = getDb().prepare(`
    SELECT e.*, p.name AS host_name,
           (SELECT COUNT(*) FROM attendances a WHERE a.event_id = e.id) AS attendees_count
    FROM events e
    LEFT JOIN persons p ON p.id = e.host_id
    WHERE e.host_id = ?
    ORDER BY e.date ASC, e.start_time ASC
  `).all(hostId);
  return rows.map(rowToEvent);
}

// ── Persons ──────────────────────────────────────────────────────────────────

function createOrMergePerson(personId, data) {
  const {
    name, roles = [], companyName = '', companyStage = '', purpose = '',
    seeksRoles = [], openToRematch = true, eventIntent = '',
    email = '', summary = '', headline = '', linkedinUrl = '',
    workExperience = [], certifications = [], projects = [],
  } = data;
  getDb().prepare(
    `INSERT INTO persons (id,name,roles,company_name,company_stage,purpose,seeks_roles,open_to_rematch,event_intent,email,summary,headline,linkedin_url,work_experience,certifications,projects)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET
       name=excluded.name, roles=excluded.roles, company_name=excluded.company_name,
       company_stage=excluded.company_stage, purpose=excluded.purpose,
       seeks_roles=excluded.seeks_roles, open_to_rematch=excluded.open_to_rematch,
       event_intent=excluded.event_intent, email=excluded.email, summary=excluded.summary,
       headline=excluded.headline, linkedin_url=excluded.linkedin_url,
       work_experience=excluded.work_experience, certifications=excluded.certifications,
       projects=excluded.projects`
  ).run(
    personId, name, js(roles), companyName, companyStage, purpose, js(seeksRoles),
    openToRematch ? 1 : 0, eventIntent, email, summary, headline, linkedinUrl,
    js(workExperience), js(certifications), js(projects)
  );
}

function rowToPerson(row) {
  if (!row) return null;
  return {
    id: row.id, name: row.name,
    roles: jp(row.roles, []),
    companyName: row.company_name, companyStage: row.company_stage,
    purpose: row.purpose, seeksRoles: jp(row.seeks_roles, []),
    openToRematch: !!row.open_to_rematch, eventIntent: row.event_intent,
    email: row.email || '',
    summary: row.summary || '',
    headline: row.headline || '',
    linkedinUrl: row.linkedin_url || '',
    workExperience: jp(row.work_experience, []),
    certifications: jp(row.certifications, []),
    projects: jp(row.projects, []),
  };
}

function getPerson(personId) {
  return rowToPerson(getDb().prepare('SELECT * FROM persons WHERE id=?').get(personId));
}

function getPersonByEmail(email) {
  const row = getDb().prepare('SELECT * FROM persons WHERE LOWER(email) = LOWER(?)').get(email);
  return rowToPerson(row);
}

function getPersonWithSkills(personId) {
  const person = getPerson(personId);
  if (!person) return null;
  const skills = getDb().prepare('SELECT skill_id,type,level FROM person_skills WHERE person_id=?').all(personId);
  return { ...person, skills };
}

function getPersonWithSkillsForProfile(personId) {
  const person = getPerson(personId);
  if (!person) return null;
  const db = getDb();
  const skillRows = db.prepare(
    `SELECT ps.skill_id, ps.type, ps.level, s.name AS skill_name, s.category
     FROM person_skills ps
     JOIN skills s ON s.id = ps.skill_id
     WHERE ps.person_id = ?`
  ).all(personId);
  const skillsHave = skillRows.filter(r => r.type === 'have').map(r => ({ id: r.skill_id, name: r.skill_name, level: r.level, category: r.category }));
  const skillsSeek = skillRows.filter(r => r.type === 'seek').map(r => ({ id: r.skill_id, name: r.skill_name, level: r.level, category: r.category }));
  return { ...person, skillsHave, skillsSeek };
}

function lookupPersonByNameInEvent(eventId, name) {
  const row = getDb().prepare(
    `SELECT p.id FROM persons p
     JOIN attendances a ON a.person_id=p.id AND a.event_id=?
     WHERE LOWER(TRIM(p.name))=LOWER(TRIM(?))`
  ).get(eventId, name);
  return row ? { id: row.id } : null;
}

function ensureSkill(id, name, category) {
  getDb().prepare(
    `INSERT INTO skills (id,name,category) VALUES (?,?,?) ON CONFLICT(id) DO NOTHING`
  ).run(id, name, category || 'general');
}

function addPersonHasSkill(personId, skillId, level) {
  getDb().prepare(
    `INSERT INTO person_skills (person_id,skill_id,type,level) VALUES (?,?,'have',?)
     ON CONFLICT(person_id,skill_id,type) DO UPDATE SET level=excluded.level`
  ).run(personId, skillId, level || 'mid');
}

function addPersonSeeksSkill(personId, skillId, urgency) {
  getDb().prepare(
    `INSERT INTO person_skills (person_id,skill_id,type,level) VALUES (?,?,'seek',?)
     ON CONFLICT(person_id,skill_id,type) DO UPDATE SET level=excluded.level`
  ).run(personId, skillId, urgency || 'medium');
}

function addWantsToMeet(personId, targetId) {
  getDb().prepare(
    `INSERT INTO wants_to_meet (person_id,target_id) VALUES (?,?) ON CONFLICT DO NOTHING`
  ).run(personId, targetId);
}

function addBlock(personId, targetId) {
  getDb().prepare(
    `INSERT INTO blocks (person_id,blocked_id) VALUES (?,?) ON CONFLICT DO NOTHING`
  ).run(personId, targetId);
}

function mergeCompany(_companyName, _companyStage, _personId) {
  // SQLite: company data stored on person row already
}

function getPersonName(personId) {
  const row = getDb().prepare('SELECT name FROM persons WHERE id=?').get(personId);
  return row?.name || '';
}

// ── Attendance ────────────────────────────────────────────────────────────────

function createGoal(goalId, personId, eventId, purpose) {
  getDb().prepare(
    `INSERT INTO goals (id,person_id,event_id,purpose_tag) VALUES (?,?,?,?)
     ON CONFLICT(id) DO NOTHING`
  ).run(goalId, personId, eventId, purpose);
}

function checkIn(personId, eventId) {
  const now = new Date().toISOString();
  getDb().prepare(
    `INSERT INTO attendances (person_id,event_id,checked_in_at) VALUES (?,?,?)
     ON CONFLICT(person_id,event_id) DO UPDATE SET checked_in_at=excluded.checked_in_at`
  ).run(personId, eventId, now);
}

function getAttendees(eventId) {
  const rows = getDb().prepare(
    `SELECT p.* FROM persons p
     JOIN attendances a ON a.person_id=p.id
     WHERE a.event_id=?`
  ).all(eventId);
  return rows.map(rowToPerson);
}

function getPendingCheckin(eventId) {
  const rows = getDb().prepare(
    `SELECT p.id, p.name FROM persons p
     JOIN goals g ON g.person_id=p.id AND g.event_id=?
     WHERE p.id NOT IN (SELECT person_id FROM attendances WHERE event_id=?)
     ORDER BY LOWER(p.name)`
  ).all(eventId, eventId);
  return rows;
}

// ── Event Registrations ───────────────────────────────────────────────────────

function createEventRegistration(data) {
  const { personId, eventId, whoYouAre = '', whoYouSeek = '', skillsYouSeek = [], purpose = '', meetSamePeople = false } = data;
  const id = uuidv4();
  getDb().prepare(
    `INSERT INTO event_registrations (id, person_id, event_id, who_you_are, who_you_seek, skills_you_seek, purpose, meet_same_people)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(person_id, event_id) DO UPDATE SET
       who_you_are=excluded.who_you_are, who_you_seek=excluded.who_you_seek,
       skills_you_seek=excluded.skills_you_seek, purpose=excluded.purpose,
       meet_same_people=excluded.meet_same_people`
  ).run(id, personId, eventId, whoYouAre, whoYouSeek, js(skillsYouSeek), purpose, meetSamePeople ? 1 : 0);
  return id;
}

function getEventRegistration(personId, eventId) {
  const row = getDb().prepare(
    `SELECT * FROM event_registrations WHERE person_id=? AND event_id=?`
  ).get(personId, eventId);
  if (!row) return null;
  return {
    id: row.id, personId: row.person_id, eventId: row.event_id,
    whoYouAre: row.who_you_are, whoYouSeek: row.who_you_seek,
    skillsYouSeek: jp(row.skills_you_seek, []),
    purpose: row.purpose, meetSamePeople: !!row.meet_same_people,
    registeredAt: row.registered_at,
  };
}

// ── Past Event History ────────────────────────────────────────────────────────

function addPastEventHistory(personId, data) {
  const { eventName, eventDate, eventType = 'mixer', peopleMet = 0, connectionsMade = 0, highlights = '', rating = 4 } = data;
  const id = uuidv4();
  getDb().prepare(
    `INSERT INTO past_event_history (id, person_id, event_name, event_date, event_type, people_met, connections_made, highlights, rating)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, personId, eventName, eventDate, eventType, peopleMet, connectionsMade, highlights, rating);
}

function getPastEventHistory(personId) {
  return getDb().prepare(
    `SELECT * FROM past_event_history WHERE person_id=? ORDER BY event_date DESC`
  ).all(personId).map(r => ({
    id: r.id, personId: r.person_id, eventName: r.event_name,
    eventDate: r.event_date, eventType: r.event_type,
    peopleMet: r.people_met, connectionsMade: r.connections_made,
    highlights: r.highlights, rating: r.rating,
  }));
}

// ── Matching (JS in-memory) ───────────────────────────────────────────────────

function isBlocked(aId, bId, blocks) {
  return blocks.some(bl =>
    (bl.person_id === aId && bl.blocked_id === bId) ||
    (bl.person_id === bId && bl.blocked_id === aId)
  );
}

function computeLayer1Pairs(eventId) {
  const attendees = getAttendees(eventId);
  const blocks = getDb().prepare('SELECT * FROM blocks').all();
  const wtmRows = getDb().prepare('SELECT * FROM wants_to_meet').all();
  const wantsToMeet = {};
  for (const r of wtmRows) {
    if (!wantsToMeet[r.person_id]) wantsToMeet[r.person_id] = [];
    wantsToMeet[r.person_id].push(r.target_id);
  }

  const pairs = [];
  for (let i = 0; i < attendees.length; i++) {
    for (let j = i + 1; j < attendees.length; j++) {
      const a = attendees[i], b = attendees[j];
      if (isBlocked(a.id, b.id, blocks)) continue;
      const aWantsB = (a.seeksRoles || []).some(r => (b.roles || []).includes(r));
      const bWantsA = (b.seeksRoles || []).some(r => (a.roles || []).includes(r));
      if (!aWantsB && !bWantsA) continue;
      let score = 0;
      if (wantsToMeet[a.id]?.includes(b.id)) score += 40;
      if (wantsToMeet[b.id]?.includes(a.id)) score += 40;
      if (aWantsB) score += 25;
      if (bWantsA) score += 25;
      pairs.push({ pA: a.id, pB: b.id, layer1Score: score });
    }
  }
  return pairs;
}

function computeLayer2Scores(validPairs) {
  if (!validPairs.length) return [];
  const db = getDb();

  const personIds = [...new Set(validPairs.flatMap(p => [p.pA, p.pB]))];
  const skillRows = db.prepare(
    `SELECT person_id, skill_id, type FROM person_skills WHERE person_id IN (${personIds.map(() => '?').join(',')})`
  ).all(...personIds);

  const personSkills = {};
  for (const r of skillRows) {
    if (!personSkills[r.person_id]) personSkills[r.person_id] = { have: new Set(), seek: new Set() };
    if (r.type === 'have') personSkills[r.person_id].have.add(r.skill_id);
    else personSkills[r.person_id].seek.add(r.skill_id);
  }

  const connRows = db.prepare('SELECT from_id, to_id, rating, would_meet_again FROM connections').all();
  const connMap = {};
  for (const r of connRows) {
    connMap[`${r.from_id}:${r.to_id}`] = r;
  }

  const insightRows = db.prepare(
    `SELECT person_id, value, confidence FROM persona_insights WHERE insight_type='prefers_role'`
  ).all();
  const insightMap = {};
  for (const r of insightRows) {
    if (!insightMap[r.person_id]) insightMap[r.person_id] = [];
    insightMap[r.person_id].push(r);
  }

  const persons = {};
  for (const id of personIds) {
    const p = getPerson(id);
    if (p) persons[id] = p;
  }

  return validPairs.map(pair => {
    const { pA, pB, layer1Score } = pair;
    const psA = personSkills[pA] || { have: new Set(), seek: new Set() };
    const psB = personSkills[pB] || { have: new Set(), seek: new Set() };

    const aSeeksBHas = [...psA.seek].filter(s => psB.have.has(s)).length * 4;
    const bSeeksAHas = [...psB.seek].filter(s => psA.have.has(s)).length * 4;
    const skillScore = Math.min(aSeeksBHas, 10) + Math.min(bSeeksAHas, 10);

    const prevAB = connMap[`${pA}:${pB}`];
    const prevBA = connMap[`${pB}:${pA}`];
    let reconnectBonus = 0;
    if (prevAB?.rating >= 4 && prevBA?.rating >= 4 && prevAB?.would_meet_again && prevBA?.would_meet_again) {
      reconnectBonus = 10;
    } else if ((prevAB?.rating >= 4) || (prevBA?.rating >= 4)) {
      reconnectBonus = 4;
    } else if ((prevAB?.rating <= 2) || (prevBA?.rating <= 2)) {
      reconnectBonus = -10;
    }

    const rolesB = persons[pB]?.roles || [];
    const insightsA = insightMap[pA] || [];
    const personaBonus = insightsA
      .filter(i => rolesB.includes(i.value) && i.confidence >= 0.6)
      .reduce((max, i) => Math.max(max, i.confidence), 0) * 10;

    return {
      personA: pA,
      personB: pB,
      totalScore: layer1Score + skillScore + reconnectBonus + Math.round(personaBonus),
    };
  }).sort((a, b) => b.totalScore - a.totalScore);
}

// ── Groups ────────────────────────────────────────────────────────────────────

function deleteGroups(eventId) {
  const db = getDb();
  const groups = db.prepare('SELECT id FROM groups_tbl WHERE event_id=?').all(eventId);
  for (const g of groups) {
    db.prepare('DELETE FROM group_members WHERE group_id=?').run(g.id);
  }
  db.prepare('DELETE FROM groups_tbl WHERE event_id=?').run(eventId);
}

function createGroup(eventId, groupId, round, members) {
  const db = getDb();
  db.prepare('INSERT INTO groups_tbl (id,event_id,round_number) VALUES (?,?,?)').run(groupId, eventId, round);
  for (const pid of members) {
    db.prepare('INSERT INTO group_members (group_id,person_id) VALUES (?,?) ON CONFLICT DO NOTHING').run(groupId, pid);
  }
}

function loadGroupRounds(eventId) {
  const db = getDb();
  const groups = db.prepare('SELECT * FROM groups_tbl WHERE event_id=? ORDER BY round_number,id').all(eventId);
  const byRound = new Map();
  for (const g of groups) {
    const members = db.prepare('SELECT person_id FROM group_members WHERE group_id=?').all(g.id).map(r => r.person_id);
    if (!byRound.has(g.round_number)) byRound.set(g.round_number, []);
    byRound.get(g.round_number).push({ members, score: 0 });
  }
  return Array.from(byRound.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([round, groups]) => ({ round, groups }));
}

// ── Connections ───────────────────────────────────────────────────────────────

function rateConnection(fromId, toId, eventId, rating, wouldMeetAgain, notes) {
  const now = new Date().toISOString();
  getDb().prepare(
    `INSERT INTO connections (from_id,to_id,event_id,rating,would_meet_again,notes,met_at)
     VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(from_id,to_id,event_id) DO UPDATE SET
       rating=excluded.rating, would_meet_again=excluded.would_meet_again,
       notes=excluded.notes, met_at=excluded.met_at`
  ).run(fromId, toId, eventId, rating, wouldMeetAgain ? 1 : 0, notes, now);
}

// ── Insights ──────────────────────────────────────────────────────────────────

function computePersonaInsights() {
  const db = getDb();
  const connRows = db.prepare('SELECT from_id, to_id, rating FROM connections WHERE rating IS NOT NULL').all();
  const stats = {};
  for (const conn of connRows) {
    const target = getPerson(conn.to_id);
    if (!target) continue;
    for (const role of (target.roles || [])) {
      if (!stats[conn.from_id]) stats[conn.from_id] = {};
      if (!stats[conn.from_id][role]) stats[conn.from_id][role] = { total: 0, high: 0 };
      stats[conn.from_id][role].total++;
      if (conn.rating >= 4) stats[conn.from_id][role].high++;
    }
  }
  for (const [personId, roles] of Object.entries(stats)) {
    for (const [role, s] of Object.entries(roles)) {
      if (s.total < 3) continue;
      const confidence = s.high / s.total;
      if (confidence < 0.5) continue;
      const id = `${personId}_prefers_${role}`;
      db.prepare(
        `INSERT INTO persona_insights (id,person_id,insight_type,value,confidence,total_meetings,high_rated)
         VALUES (?,?,?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET confidence=excluded.confidence,
           total_meetings=excluded.total_meetings, high_rated=excluded.high_rated`
      ).run(id, personId, 'prefers_role', role, confidence, s.total, s.high);
    }
  }
}

function getPersonInsights(personId) {
  return getDb().prepare(
    `SELECT insight_type AS type, value, confidence FROM persona_insights WHERE person_id=?`
  ).all(personId);
}

// ── Profile ───────────────────────────────────────────────────────────────────

function saveProfile(personId, profile) {
  getDb().prepare(
    `INSERT INTO profiles (person_id,email,headline,description,linkedin_url,previous_companies,certifications,projects,work_experience,summary)
     VALUES (?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(person_id) DO UPDATE SET
       email=excluded.email, headline=excluded.headline, description=excluded.description,
       linkedin_url=excluded.linkedin_url, previous_companies=excluded.previous_companies,
       certifications=excluded.certifications, projects=excluded.projects,
       work_experience=excluded.work_experience, summary=excluded.summary`
  ).run(
    personId, profile.email || '', profile.headline || '', profile.description || '',
    profile.linkedinUrl || '', js(profile.previousCompanies || []),
    js(profile.certifications || []), js(profile.projects || []),
    js(profile.workExperience || []), profile.summary || ''
  );
}

function getProfile(personId) {
  const row = getDb().prepare('SELECT * FROM profiles WHERE person_id=?').get(personId);
  if (!row) return null;
  return {
    personId: row.person_id, email: row.email, headline: row.headline,
    description: row.description, linkedinUrl: row.linkedin_url,
    previousCompanies: jp(row.previous_companies, []),
    certifications: jp(row.certifications, []),
    projects: jp(row.projects, []),
    workExperience: jp(row.work_experience, []),
    summary: row.summary || '',
  };
}

// ── Event Suggestions ─────────────────────────────────────────────────────────

function getPersonForSuggestion(personId) {
  const person = getPerson(personId);
  if (!person) return null;
  const db = getDb();
  const skillsHave = db.prepare(
    `SELECT s.name FROM skills s JOIN person_skills ps ON ps.skill_id=s.id WHERE ps.person_id=? AND ps.type='have'`
  ).all(personId).map(r => r.name);
  const skillsSeek = db.prepare(
    `SELECT s.name FROM skills s JOIN person_skills ps ON ps.skill_id=s.id WHERE ps.person_id=? AND ps.type='seek'`
  ).all(personId).map(r => r.name);
  const previousEvents = db.prepare(
    `SELECT event_id AS id FROM attendances WHERE person_id=?`
  ).all(personId).map(r => r.id);
  return { ...person, skillsHave, skillsSeek, previousEvents };
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
  // Direct DB access (for scripts)
  getDb,
};

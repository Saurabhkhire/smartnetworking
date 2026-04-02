/**
 * Luma event import via Apify (lexis-solutions~lu-ma-scraper / r5gMxLV2rOF3J1fxu).
 * Dual-writes every pulled event + attendee into BOTH SQLite and Neo4j
 * regardless of the DB_DRIVER setting.
 */
const { v4: uuidv4 } = require('uuid');

const APIFY_TOKEN = process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN || '';
const ACTOR_ID    = process.env.APIFY_ACTOR_ID || 'r5gMxLV2rOF3J1fxu';

// ── Lazy-load both DALs so the server still starts even if one DB is offline ──

let _sqlite = null;
let _neo4j  = null;

function getSqlite() {
  if (!_sqlite) {
    try { _sqlite = require('../db/sqlite-dal'); } catch { _sqlite = false; }
  }
  return _sqlite || null;
}

function getNeo4j() {
  if (!_neo4j) {
    try { _neo4j = require('../db/neo4j-dal'); } catch { _neo4j = false; }
  }
  return _neo4j || null;
}

// ── Try a DB call; swallow errors so one failing DB never blocks the other ────
async function tryDual(fn) {
  const results = await Promise.allSettled([
    (async () => {
      const s = getSqlite();
      return s ? fn(s) : null;
    })(),
    (async () => {
      const n = getNeo4j();
      return n ? fn(n) : null;
    })(),
  ]);
  const errs = results.filter(r => r.status === 'rejected').map(r => r.reason?.message);
  if (errs.length === 2) throw new Error(`Both DBs failed: ${errs.join(' | ')}`);
  return results;
}

// ── Normalise an Apify item to our Event shape ────────────────────────────────
function parseApifyEvent(item) {
  const startIso = item.startAt || item.start_at || item.startDate || '';
  const endIso   = item.endAt   || item.end_at   || item.endDate   || '';

  const parseDate = s => (s ? String(s).slice(0, 10) : null);
  const parseTime = s => {
    if (!s) return null;
    // handles "2026-04-01T18:00:00Z" or "18:00"
    if (s.includes('T')) return s.slice(11, 16);
    return s.slice(0, 5);
  };

  // Location — Apify gives nested objects
  const loc = item.location || item.geo || {};
  const locStr = [
    loc.name || loc.venueName || '',
    loc.city  || loc.cityName || '',
    loc.state || loc.region   || '',
  ].filter(Boolean).join(', ') || item.locationString || '';

  // Duration
  let durationMins = 60;
  if (startIso && endIso) {
    const diff = (new Date(endIso) - new Date(startIso)) / 60000;
    if (diff > 0 && diff < 1440) durationMins = Math.round(diff);
  }

  const startTime = parseTime(startIso) || '18:00';
  const endH   = parseInt((startTime || '18:00').split(':')[0], 10);
  const endMin = parseInt((startTime || '18:00').split(':')[1], 10);
  const endTotal = endH * 60 + endMin + durationMins;
  const endTime  = `${String(Math.floor(endTotal / 60) % 24).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`;

  return {
    id:           `luma_${item.id || item.eventId || item.api_id || uuidv4()}`,
    name:         item.name || item.title || item.eventName || 'Luma Event',
    type:         'normal',
    date:         parseDate(startIso) || new Date().toISOString().slice(0, 10),
    startTime,
    endTime,
    durationMins,
    roundMins:    10,
    groupSizeMin: 3,
    groupSizeMax: 6,
    hostId:       null,
    description:  String(item.description || item.about || '').slice(0, 2000),
    location:     locStr,
    blasts:       [],
    source:       'luma_apify',
    lumaUrl:      item.url || item.eventUrl || item.lumaUrl || '',
  };
}

// ── Normalise a Luma guest/host to our Person shape ───────────────────────────
function parseApifyPerson(raw, eventId) {
  const name    = raw.name || raw.fullName || raw.displayName || 'Unknown';
  const email   = raw.email || '';
  const linkedin = raw.linkedinUrl || raw.linkedin ||
    (raw.linkedinHandle ? `https://linkedin.com/in/${raw.linkedinHandle}` : '') ||
    (raw.socialLinks?.find(l => l.platform === 'linkedin')?.url || '');

  const roles = [];
  if (raw.roles)       roles.push(...(Array.isArray(raw.roles) ? raw.roles : [raw.roles]));
  if (raw.jobTitle)    roles.push(raw.jobTitle);
  if (raw.occupation)  roles.push(raw.occupation);

  return {
    id:          `luma_person_${raw.id || raw.userId || raw.guestId || uuidv4()}`,
    name,
    email,
    linkedinUrl:  linkedin,
    roles:        roles.length ? roles : ['Attendee'],
    companyName:  raw.company || raw.companyName || raw.organization || '',
    companyStage: '',
    purpose:      'General Networking',
    seeksRoles:   [],
    eventIntent:  raw.bio || raw.tagline || raw.about || '',
    summary:      raw.bio || raw.tagline || raw.about || '',
    headline:     raw.headline || raw.tagline || (raw.jobTitle ? `${raw.jobTitle} at ${raw.company || ''}` : ''),
    workExperience: raw.workExperience || (raw.jobTitle ? [{ title: raw.jobTitle, company: raw.company || '' }] : []),
    certifications: [],
    projects:     [],
    openToRematch: true,
    eventId,        // used to create attendance after person is saved
  };
}

// ── Persist one event + its attendees to a single DAL ───────────────────────
async function persistEventToDal(dal, eventData, persons) {
  // 1. Upsert event (create or skip if id already exists)
  let eventId = eventData.id;
  try {
    const existing = await (dal.getEvent ? dal.getEvent(eventId) : Promise.resolve(null));
    if (!existing) {
      const created = await dal.createEvent(eventData);
      eventId = created.id || eventId;
    }
  } catch {
    try {
      const created = await dal.createEvent(eventData);
      eventId = created.id || eventId;
    } catch { /* event already exists */ }
  }

  // 2. Upsert each person + register + check them in
  let saved = 0;
  for (const p of persons) {
    try {
      // Ensure skills table stubs exist for the person
      await dal.createOrMergePerson(p.id, {
        name:          p.name,
        email:         p.email,
        roles:         p.roles,
        companyName:   p.companyName,
        companyStage:  p.companyStage,
        purpose:       p.purpose,
        seeksRoles:    p.seeksRoles,
        eventIntent:   p.eventIntent,
        summary:       p.summary,
        headline:      p.headline,
        linkedinUrl:   p.linkedinUrl,
        workExperience: p.workExperience,
        certifications: p.certifications,
        projects:      p.projects,
        openToRematch: p.openToRematch,
      });

      // Create user record if email available
      if (p.email) {
        try {
          await dal.createUser(uuidv4(), p.email, p.name, p.id);
        } catch { /* user may already exist */ }
      }

      // Register (goal) + check in (attendance)
      try {
        const goalId = uuidv4();
        await dal.createGoal(goalId, p.id, eventId, p.purpose || 'General Networking');
      } catch {}
      try {
        await dal.checkIn(eventId, p.id);
      } catch {}

      saved++;
    } catch (err) {
      console.warn(`[lumaImport] person ${p.name} save failed: ${err.message}`);
    }
  }
  return { eventId, saved };
}

// ── Main export: run Apify scrape + dual-write ─────────────────────────────
async function runLumaImport({ query, location, startDate, endDate, maxItems = 20 }) {
  const { ApifyClient } = require('apify-client');
  const client = new ApifyClient({ token: APIFY_TOKEN });

  // Build Apify input
  const input = {
    query: query || location || 'networking',
    maxItems: Math.min(maxItems, 50),
  };
  if (location) input.location = location;
  if (startDate) input.startDate = startDate;
  if (endDate)   input.endDate   = endDate;

  console.log('[lumaImport] Starting Apify run:', input);
  const run = await client.actor(ACTOR_ID).call(input);
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  console.log(`[lumaImport] Apify returned ${items.length} items`);

  const results = [];
  let totalSaved = 0;

  for (const item of items) {
    // Each item may be an event or a guest record depending on actor version
    const isEvent = !!(item.name || item.title || item.eventName);
    if (!isEvent) continue;

    const eventData = parseApifyEvent(item);

    // Parse guests/hosts from nested arrays
    const rawGuests = [
      ...(item.guests     || []),
      ...(item.attendees  || []),
      ...(item.hosts      || []),
      ...(item.speakers   || []),
    ];
    const persons = rawGuests.map(g => parseApifyPerson(g, eventData.id));

    // Dual-write to SQLite + Neo4j
    const [sqliteResult, neo4jResult] = await tryDual(
      dal => persistEventToDal(dal, eventData, persons)
    );

    const sqliteSaved = sqliteResult.status === 'fulfilled' ? sqliteResult.value?.saved : 0;
    const neo4jSaved  = neo4jResult.status  === 'fulfilled' ? neo4jResult.value?.saved  : 0;
    totalSaved += Math.max(sqliteSaved || 0, neo4jSaved || 0);

    results.push({
      id:          eventData.id,
      name:        eventData.name,
      date:        eventData.date,
      startTime:   eventData.startTime,
      endTime:     eventData.endTime,
      location:    eventData.location,
      description: eventData.description.slice(0, 200),
      lumaUrl:     eventData.lumaUrl,
      attendees:   persons.length,
      savedToSqlite: sqliteResult.status === 'fulfilled',
      savedToNeo4j:  neo4jResult.status  === 'fulfilled',
    });
  }

  return { events: results, totalEvents: results.length, totalAttendees: totalSaved };
}

module.exports = { runLumaImport };

const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = Router();

// GET /api/events/list
router.get('/list', async (req, res) => {
  try {
    const events = await db.listEvents();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/by-date?date=YYYY-MM-DD
router.get('/by-date', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date query param required' });
    const events = await db.listEventsByDate(date);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/suggestions?date=YYYY-MM-DD&personId=X
router.get('/suggestions', async (req, res) => {
  try {
    const { date, personId } = req.query;
    if (!date) return res.status(400).json({ error: 'date required' });

    const events = await db.listEventsByDate(date);
    if (!events.length) return res.json([]);

    let personProfile = null;
    if (personId) {
      personProfile = await db.getPersonForSuggestion(personId);
    }

    const results = [];
    for (const event of events) {
      const attendees = await db.getAttendees(event.id);
      let score = 0;
      const explanations = [];

      if (personProfile) {
        for (const attendee of attendees) {
          const roleMatches = (personProfile.seeksRoles || []).filter(r => (attendee.roles || []).includes(r));
          if (roleMatches.length > 0) {
            score += roleMatches.length * 10;
            explanations.push(`${attendee.name} is a ${roleMatches.join('/')}`);
          }
          const skillMatches = (personProfile.skillsSeek || []).filter(s => (attendee.skillsHave || []).includes(s));
          score += skillMatches.length * 5;
        }
      }

      results.push({
        event,
        attendeeCount: attendees.length,
        score,
        explanations: explanations.slice(0, 3),
      });
    }

    results.sort((a, b) => b.score - a.score);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/lookup-attendee?eventName=&personName=
router.get('/lookup-attendee', async (req, res) => {
  try {
    const eventName = (req.query.eventName || '').trim();
    const personName = (req.query.personName || '').trim();
    if (!eventName || !personName) {
      return res.status(400).json({ error: 'eventName and personName query params required' });
    }

    const events = await db.listEvents();
    const evMatches = events.filter(e => e.name.trim().toLowerCase() === eventName.trim().toLowerCase());

    if (evMatches.length === 0) return res.status(404).json({ error: 'Event not found for that name' });
    if (evMatches.length > 1) return res.status(400).json({ error: 'Multiple events share that name' });

    const eventId = evMatches[0].id;
    const found = await db.lookupPersonByNameInEvent(eventId, personName);
    if (!found) return res.status(404).json({ error: 'No checked-in attendee with that name for this event' });

    res.json({ eventId, personId: found.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/my-events?personId=X&hostId=X
router.get('/my-events', async (req, res) => {
  try {
    const { personId, hostId } = req.query;
    const result = await db.getMyEvents(personId || null, hostId || null);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/hosted?hostId=X
router.get('/hosted', async (req, res) => {
  try {
    const { hostId } = req.query;
    if (!hostId) return res.status(400).json({ error: 'hostId required' });
    const events = await db.getHostedEvents(hostId);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/create
router.post('/create', async (req, res) => {
  try {
    const {
      name, type, date, durationMins = 60, roundMins = 10,
      groupSizeMin = 3, groupSizeMax = 6, priorityTheme = '',
      startTime = '18:00', hostId = null, description = '', location = '',
    } = req.body;

    if (!name || !type || !date) {
      return res.status(400).json({ error: 'name, type, and date are required' });
    }

    const event = await db.createEvent({
      name, type, date, startTime, durationMins, roundMins,
      groupSizeMin, groupSizeMax, priorityTheme, hostId, description, location,
    });

    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/by-date-range?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/by-date-range', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end query params required' });
    const events = await db.listEventsByDateRange(start, end);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/luma-import
// Uses Apify (lexis-solutions~lu-ma-scraper) — dual-writes to SQLite + Neo4j
router.post('/luma-import', async (req, res) => {
  try {
    const { startDate, endDate, location, query, maxItems = 20 } = req.body;
    const { runLumaImport } = require('../services/lumaImport');

    const result = await runLumaImport({ query, location, startDate, endDate, maxItems });
    res.json(result);
  } catch (err) {
    console.error('[luma-import]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:id
router.get('/:id', async (req, res) => {
  try {
    const event = await db.getEvent(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:id/registration?personId=X
router.get('/:id/registration', async (req, res) => {
  try {
    const { personId } = req.query;
    if (!personId) return res.status(400).json({ error: 'personId required' });
    const reg = await db.getEventRegistration(personId, req.params.id);
    res.json(reg || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/:id/register
router.post('/:id/register', async (req, res) => {
  try {
    const eventId = req.params.id;
    const {
      // If personId provided, use existing person (logged in user)
      personId: existingPersonId,
      name, roles = [], companyName = '', companyStage = '',
      skillsHave = [], skillsSeek = [], seeksRoles = [],
      wantsToMeet = [], purpose = '', openToRematch = true,
      blocklist = [], eventIntent = '',
      // Event-specific registration questions
      whoYouAre = '', whoYouSeek = '', skillsYouSeek = [], meetSamePeople = false,
    } = req.body;

    const personId = existingPersonId || uuidv4();
    const goalId = uuidv4();

    if (!existingPersonId && !name) return res.status(400).json({ error: 'name is required' });

    // Only create/merge person if not using an existing account
    if (!existingPersonId) {
      await db.createOrMergePerson(personId, { name, roles, companyName, companyStage, purpose, seeksRoles, openToRematch, eventIntent });
      if (companyName) await db.mergeCompany(companyName, companyStage, personId);
    } else {
      // Update event-specific fields on existing person
      const existing = await db.getPerson(personId);
      if (existing) {
        await db.createOrMergePerson(personId, {
          ...existing,
          seeksRoles: seeksRoles.length ? seeksRoles : existing.seeksRoles,
          eventIntent: eventIntent || existing.eventIntent,
          purpose: purpose || existing.purpose,
        });
      }
    }

    const SKILLS = [
      { id: 'sk_python', name: 'Python' }, { id: 'sk_js', name: 'JavaScript' }, { id: 'sk_ts', name: 'TypeScript' },
      { id: 'sk_go', name: 'Go / Golang' }, { id: 'sk_rust', name: 'Rust' }, { id: 'sk_react', name: 'React / Frontend' },
      { id: 'sk_node', name: 'Node.js / Backend' }, { id: 'sk_cloud', name: 'Cloud / AWS / GCP' },
      { id: 'sk_ml', name: 'Machine Learning' }, { id: 'sk_nlp', name: 'NLP / LLMs' },
      { id: 'sk_fundraise', name: 'Fundraising' }, { id: 'sk_gtm', name: 'Go-to-market' },
      { id: 'sk_salesb2b', name: 'Sales B2B' }, { id: 'sk_uxdesign', name: 'UX / UI Design' },
      { id: 'sk_prodstrat', name: 'Product Strategy' }, { id: 'sk_growth', name: 'Growth Hacking' },
      { id: 'sk_finance', name: 'Finance / CFO' }, { id: 'sk_recruit', name: 'Recruiting' },
      { id: 'sk_dataanlyt', name: 'Data Analysis' }, { id: 'sk_bizdev', name: 'Business Development' },
    ];
    for (const skill of SKILLS) await db.ensureSkill(skill.id, skill.name, 'general');

    for (const skillId of skillsHave) await db.addPersonHasSkill(personId, skillId, 'mid');
    for (const skillId of skillsSeek) await db.addPersonSeeksSkill(personId, skillId, 'medium');
    for (const targetId of wantsToMeet) await db.addWantsToMeet(personId, targetId);
    for (const targetId of blocklist) await db.addBlock(personId, targetId);

    await db.createGoal(goalId, personId, eventId, purpose || 'General Networking');

    // Store event-specific registration details
    await db.createEventRegistration({ personId, eventId, whoYouAre, whoYouSeek, skillsYouSeek, purpose, meetSamePeople });

    const personName = existingPersonId ? (await db.getPerson(personId))?.name || '' : name;
    res.status(201).json({ personId, name: personName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/:id/checkin
router.post('/:id/checkin', async (req, res) => {
  try {
    const eventId = req.params.id;
    const { personId } = req.body;
    if (!personId) return res.status(400).json({ error: 'personId required' });

    await db.checkIn(personId, eventId);
    const name = await db.getPersonName(personId);

    res.json({ checkedIn: true, personId, eventId, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:id/pending-checkin
router.get('/:id/pending-checkin', async (req, res) => {
  try {
    const list = await db.getPendingCheckin(req.params.id);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:id/attendees
router.get('/:id/attendees', async (req, res) => {
  try {
    const attendees = await db.getAttendees(req.params.id);
    res.json(attendees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

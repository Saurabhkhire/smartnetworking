const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const {
  computeScores,
  planIcebreakerRounds,
  planNetworkingSchedule,
  computePersonaInsights,
  buildAllPersonTimesheets,
  loadIcebreakerRoundsFromNeo4j,
} = require('../services/matching');

const router = Router();

// In-memory score store (keyed by eventId)
const scoreStore = new Map();

// POST /api/events/:id/compute-scores
router.post('/:id/compute-scores', async (req, res) => {
  try {
    const eventId = req.params.id;
    const scored = await computeScores(eventId);
    scoreStore.set(eventId, scored);
    res.json({ pairs: scored.length, sample: scored.slice(0, 5) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/:id/assign-groups  (mixer)
router.post('/:id/assign-groups', async (req, res) => {
  try {
    const eventId = req.params.id;
    const scored = scoreStore.get(eventId);
    if (!scored) return res.status(400).json({ error: 'Run compute-scores first' });

    const event = await db.getEvent(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const allAttendees = await db.getAttendees(eventId);
    const attendeeIds = allAttendees.map(a => a.id);
    const idToName = {};
    for (const a of allAttendees) idToName[a.id] = a.name;

    // Pass full attendee objects so the algorithm can use roles/seeksRoles
    const rounds = planIcebreakerRounds(
      eventId, scored, allAttendees,
      event.roundMins || 10,
      event.durationMins || 60,
      event.groupSizeMin || 3,
      event.groupSizeMax || 6
    );

    await db.deleteGroups(eventId);

    const { timesheets } = buildAllPersonTimesheets(attendeeIds, rounds, event, scored, idToName);

    for (const { round, groups } of rounds) {
      for (const { members } of groups) {
        const groupId = uuidv4();
        await db.createGroup(eventId, groupId, round, members);
      }
    }

    res.json({ rounds: rounds.length, groups: rounds, timesheets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:id/timesheets
router.get('/:id/timesheets', async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await db.getEvent(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const rounds = await loadIcebreakerRoundsFromNeo4j(eventId);
    if (!rounds.length) {
      return res.json({ eventId, timesheets: [], message: 'No groups assigned yet — run compute scores then assign groups.' });
    }

    const scored = scoreStore.get(eventId) || (await computeScores(eventId));
    if (!scoreStore.has(eventId)) scoreStore.set(eventId, scored);

    const attendeesArr = await db.getAttendees(eventId);
    const attendees = attendeesArr.map(a => a.id);
    const idToName = {};
    for (const a of attendeesArr) idToName[a.id] = a.name;

    const { timesheets } = buildAllPersonTimesheets(attendees, rounds, event, scored, idToName);
    res.json({ eventId, eventName: event.name, rounds, timesheets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:id/my-schedule?personId=X  (personal)
router.get('/:id/my-schedule', async (req, res) => {
  try {
    const eventId = req.params.id;
    const { personId } = req.query;
    if (!personId) return res.status(400).json({ error: 'personId required' });

    const scored = scoreStore.get(eventId) || await computeScores(eventId);

    const event = await db.getEvent(eventId);
    const slotMins = event?.roundMins || 5;
    const durationMins = event?.durationMins || 60;

    const schedule = planNetworkingSchedule(personId, scored, slotMins, durationMins);
    const matchIds = schedule.map(s => s.matchId);

    const allAttendees = await db.getAttendees(eventId);
    const personMap = {};
    for (const a of allAttendees) {
      if (matchIds.includes(a.id)) {
        personMap[a.id] = { id: a.id, name: a.name, roles: a.roles, company: a.company, purpose: a.purpose };
      }
    }

    const enriched = schedule.map(s => ({
      slot: s.slot,
      match: personMap[s.matchId] || { id: s.matchId },
      totalScore: s.totalScore,
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:id/results/:personId
router.get('/:id/results/:personId', async (req, res) => {
  try {
    const { id: eventId, personId } = req.params;

    const person = await db.getPerson(personId);
    if (!person) return res.status(404).json({ error: 'Person not found' });

    const personalisationInsights = await db.getPersonInsights(personId);

    // Icebreaker schedule from stored groups
    const allRounds = await db.loadGroupRounds(eventId);
    const icebreakerSchedule = [];
    const allAttendees = await db.getAttendees(eventId);
    const personById = {};
    for (const a of allAttendees) personById[a.id] = a;

    for (const { round, groups } of allRounds) {
      for (const group of groups) {
        if (group.members.includes(personId)) {
          const groupMembers = group.members
            .filter(id => id !== personId)
            .map(id => personById[id] || { id });
          icebreakerSchedule.push({ round, groupMembers });
        }
      }
    }

    // Networking schedule
    const event = await db.getEvent(eventId);
    const scored = scoreStore.get(eventId) || [];
    const schedule = planNetworkingSchedule(personId, scored, event?.roundMins || 5, event?.durationMins || 60);

    const networkingSchedule = schedule.map(s => ({
      slot: s.slot,
      match: personById[s.matchId] || { id: s.matchId },
      totalScore: s.totalScore,
    }));

    res.json({ person, personalisationInsights, icebreakerSchedule, networkingSchedule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/:id/recompute-insights
router.post('/:id/recompute-insights', async (req, res) => {
  try {
    await computePersonaInsights();
    res.json({ done: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

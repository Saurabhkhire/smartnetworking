const { Router } = require('express');
const db = require('../db');
const { computePersonaInsights } = require('../services/matching');

const router = Router();

// POST /api/connections/rate
router.post('/rate', async (req, res) => {
  try {
    const { fromPersonId, toPersonId, eventId, rating, wouldMeetAgain = false, notes = '' } = req.body;
    if (!fromPersonId || !toPersonId || !eventId || rating == null) {
      return res.status(400).json({ error: 'fromPersonId, toPersonId, eventId, rating required' });
    }

    await db.rateConnection(fromPersonId, toPersonId, eventId, rating, wouldMeetAgain, notes);

    computePersonaInsights().catch(console.error);

    res.json({ rated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

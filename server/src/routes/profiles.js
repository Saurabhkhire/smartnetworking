const { Router } = require('express');
const db = require('../db');

const router = Router();

// GET /api/profiles/:personId
router.get('/:personId', async (req, res) => {
  try {
    const profile = await db.getProfile(req.params.personId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/profiles/:personId
router.put('/:personId', async (req, res) => {
  try {
    await db.saveProfile(req.params.personId, req.body);
    res.json({ saved: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

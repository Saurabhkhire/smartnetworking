/**
 * Simple identity routes — no passwords, just email-based identification.
 * The client stores the returned personId in localStorage.
 */
const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = Router();

// POST /api/auth/register
// Creates a new person + user record. Returns the person profile.
router.post('/register', async (req, res) => {
  try {
    const {
      name, email, roles = [], companyName = '', companyStage = 'Seed',
      purpose = '', seeksRoles = [], summary = '', headline = '',
      linkedinUrl = '', workExperience = [], certifications = [],
      projects = [], skillsHave = [], skillsSeek = [],
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'name and email are required' });
    }

    // Check if email already registered
    const existing = await db.getPersonByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered. Please log in.' });
    }

    const personId = uuidv4();

    await db.createOrMergePerson(personId, {
      name, roles, companyName, companyStage, purpose, seeksRoles,
      email, summary, headline, linkedinUrl, workExperience, certifications, projects,
    });

    // Seed skills
    const SKILLS = [
      { id: 'sk_python', name: 'Python' }, { id: 'sk_js', name: 'JavaScript' },
      { id: 'sk_ts', name: 'TypeScript' }, { id: 'sk_go', name: 'Go / Golang' },
      { id: 'sk_rust', name: 'Rust' }, { id: 'sk_react', name: 'React / Frontend' },
      { id: 'sk_node', name: 'Node.js / Backend' }, { id: 'sk_cloud', name: 'Cloud / AWS / GCP' },
      { id: 'sk_ml', name: 'Machine Learning' }, { id: 'sk_nlp', name: 'NLP / LLMs' },
      { id: 'sk_fundraise', name: 'Fundraising' }, { id: 'sk_gtm', name: 'Go-to-market' },
      { id: 'sk_salesb2b', name: 'Sales B2B' }, { id: 'sk_uxdesign', name: 'UX / UI Design' },
      { id: 'sk_prodstrat', name: 'Product Strategy' }, { id: 'sk_growth', name: 'Growth Hacking' },
      { id: 'sk_finance', name: 'Finance / CFO' }, { id: 'sk_recruit', name: 'Recruiting' },
      { id: 'sk_dataanlyt', name: 'Data Analysis' }, { id: 'sk_bizdev', name: 'Business Development' },
    ];
    for (const skill of SKILLS) {
      await db.ensureSkill(skill.id, skill.name, 'general');
    }
    for (const skillId of skillsHave) {
      await db.addPersonHasSkill(personId, skillId, 'mid');
    }
    for (const skillId of skillsSeek) {
      await db.addPersonSeeksSkill(personId, skillId, 'medium');
    }

    // Save profile
    await db.saveProfile(personId, {
      email, headline, description: summary, linkedinUrl,
      previousCompanies: [], certifications, projects, workExperience, summary,
    });

    // Create user record for lookup
    await db.createUser(uuidv4(), email, name, personId);

    res.status(201).json({ personId, name, email, roles, companyName, companyStage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
// Looks up person by email. Returns their profile.
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const person = await db.getPersonByEmail(email);
    if (!person) {
      return res.status(404).json({ error: 'No account found with that email. Please register.' });
    }

    const profile = await db.getProfile(person.id);
    res.json({
      personId: person.id,
      name: person.name,
      email: person.email,
      roles: person.roles,
      companyName: person.companyName,
      companyStage: person.companyStage,
      headline: person.headline,
      linkedinUrl: person.linkedinUrl,
      profile,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me?personId=X
// Returns person profile for the given personId.
router.get('/me', async (req, res) => {
  try {
    const { personId } = req.query;
    if (!personId) return res.status(400).json({ error: 'personId required' });

    const person = await db.getPersonWithSkillsForProfile(personId);
    if (!person) return res.status(404).json({ error: 'Person not found' });

    let profile = null, history = [];
    try { profile = await db.getProfile(personId); } catch {}
    try { history = await db.getPastEventHistory(personId); } catch {}

    res.json({ ...person, ...(profile || {}), profile, history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

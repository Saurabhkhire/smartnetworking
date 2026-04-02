const { Router } = require('express');
const { callAICached } = require('../ai/adapter');

const router = Router();

// POST /api/ai/why-card
router.post('/why-card', async (req, res) => {
  try {
    const { personA, personB, matchSignals, eventId } = req.body;
    const cacheKey = `why:${eventId}:${[personA.id, personB.id].sort().join(':')}`;

    const system = `You are a sharp professional networking advisor. Write exactly 2 sentences explaining
why two specific people should meet. Be specific — name actual skills, goals, signals.
Never use: synergy, opportunity, leverage, excited, great match.
Sound like a knowledgeable friend briefing someone before a conversation.`;

    const user = `Person A: ${personA.name}, roles: ${(personA.roles || []).join(', ')}, company: ${personA.company || 'N/A'} (${personA.stage || ''})
  Purpose tonight: ${personA.purpose || ''}
  Skills they have: ${(personA.skillsHave || []).join(', ')}
  Skills they are seeking: ${(personA.skillsSeek || []).join(', ')}
  Roles they want to meet: ${(personA.seeksRoles || []).join(', ')}

Person B: ${personB.name}, roles: ${(personB.roles || []).join(', ')}, company: ${personB.company || 'N/A'} (${personB.stage || ''})
  Purpose tonight: ${personB.purpose || ''}
  Skills they have: ${(personB.skillsHave || []).join(', ')}
  Skills they are seeking: ${(personB.skillsSeek || []).join(', ')}
  Roles they want to meet: ${(personB.seeksRoles || []).join(', ')}

Match signals:
  Role match score: ${matchSignals?.roleScore || 0}/50
  Skill overlap (A seeks from B): ${(matchSignals?.skillsASeeksFromB || []).join(', ')}
  Skill overlap (B seeks from A): ${(matchSignals?.skillsBSeeksFromA || []).join(', ')}
  Purpose alignment: ${matchSignals?.purposeNote || 'N/A'}
  Past connection: ${matchSignals?.pastNote || 'First meeting'}

Write the 2-sentence why-card:`;

    const whyCard = await callAICached(cacheKey, system, user, 150);
    res.json({ whyCard });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/icebreaker
router.post('/icebreaker', async (req, res) => {
  try {
    const { personA, personB, whyCard, eventTheme, eventId } = req.body;
    const cacheKey = `ice:${eventId}:${[personA.id, personB.id].sort().join(':')}`;

    const system = `Write exactly one sentence for Person A to open a conversation with Person B.
Rules: reference something specific. Start with an action or observation.
Maximum 20 words. Natural tone. No questions. No generic openers.
Do not start with: I, So, Hey, Hi.`;

    const user = `Why they should meet: ${whyCard}
Person A: ${personA.name}, ${(personA.roles || []).join(', ')}
Person B: ${personB.name}, ${(personB.roles || []).join(', ')} at ${personB.company || 'their company'}
Event context: ${eventTheme || 'professional networking event'}

One-sentence icebreaker:`;

    const icebreaker = await callAICached(cacheKey, system, user, 60);
    res.json({ icebreaker });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/briefing
router.post('/briefing', async (req, res) => {
  try {
    const { attendee, topMatches, eventInfo, personaInsight } = req.body;
    const cacheKey = `brief:${eventInfo?.id}:${attendee.id}`;

    const system = `You are a direct networking coach. Write a 3-sentence pre-event briefing.
Sentence 1: who to find first and why (name them).
Sentence 2: the second priority and why.
Sentence 3: one tactical tip for their situation tonight.
Under 60 words total. Use names. Sound like a coach.`;

    const matchLines = (topMatches || []).slice(0, 5).map((m, i) =>
      `${i + 1}. ${m.name} (${(m.roles || []).join(', ')}) — score ${m.totalScore} — ${m.whyShort || ''}`
    ).join('\n');

    const user = `Attendee: ${attendee.name}, roles: ${(attendee.roles || []).join(', ')}, company: ${attendee.company || 'N/A'} (${attendee.stage || ''})
Goal tonight: ${attendee.purpose || ''}
Personalisation note: ${personaInsight || 'No prior data'}
Event: ${eventInfo?.name || 'Networking Event'}, ${eventInfo?.type || 'networking'}, ${eventInfo?.durationMins || 60} min, ${eventInfo?.totalAttendees || '?'} attendees

Top matches:
${matchLines}

3-sentence briefing:`;

    const briefing = await callAICached(cacheKey, system, user, 120);
    res.json({ briefing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/group-rationale
router.post('/group-rationale', async (req, res) => {
  try {
    const { groupMembers, groupScore, topSignals, eventId, groupId } = req.body;
    const cacheKey = `grp:${eventId}:${groupId}`;

    const system = `Explain in 2 sentences why these people were grouped at a networking event.
Focus on what each person gains from the others. Be specific about roles and needs.`;

    const memberLines = (groupMembers || []).map(m =>
      `- ${m.name} (${(m.roles || []).join(', ')}): wants to meet [${(m.seeksRoles || []).join(', ')}], offers [${(m.topSkills || []).join(', ')}]`
    ).join('\n');

    const user = `${memberLines}

Group compatibility score: ${groupScore || 'N/A'}
Key signals: ${(topSignals || []).join(', ')}

Why were these ${(groupMembers || []).length} people grouped together?`;

    const rationale = await callAICached(cacheKey, system, user, 100);
    res.json({ rationale });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/persona-insight
router.post('/persona-insight', async (req, res) => {
  try {
    const { person, stats } = req.body;
    const cacheKey = `persona:${person.id}`;

    const system = `Write one sentence telling a person what their networking pattern shows.
Be specific with numbers. Explain how this affects their schedule tonight.
Tone: informative, not judgmental. Maximum 30 words.`;

    const user = `Person: ${person.name}
Total past connections rated: ${stats?.totalRated || 0}
Most common high-rated role: ${stats?.topRole || 'N/A'} (${stats?.topRoleCount || 0} of ${stats?.totalRated || 0}, rated 4+)
Least favoured role: ${stats?.bottomRole || 'N/A'} (${stats?.bottomRoleCount || 0} rated below 3)
Top stage of high-rated connections: ${stats?.topStage || 'N/A'}

One-sentence personalisation insight:`;

    const insight = await callAICached(cacheKey, system, user, 60);
    res.json({ insight });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/match-prep  (why matched + icebreaker + talking points in one call)
router.post('/match-prep', async (req, res) => {
  try {
    const { personA, personB, eventId } = req.body;
    const cacheKey = `prep:${eventId}:${[personA.id, personB.id].sort().join(':')}`;

    const system = `You are a professional networking advisor. Given two people's profiles, output ONLY a valid JSON object with exactly these fields:
- "whyMatch": 2 sentences explaining why they should meet. Reference specific roles, skills, or goals. Sound like a knowledgeable friend.
- "icebreaker": 1 sentence (max 20 words) for Person A to open a conversation with Person B. Reference something specific from their profiles. Start with an action or observation. No questions. Do not start with: I, So, Hey, Hi.
- "talkingPoints": array of exactly 3 short strings — concrete topics they can discuss based on their actual profiles.
Output ONLY raw JSON. No markdown, no code fences, no explanation.`;

    const companyA = personA.company || personA.companyName || 'N/A';
    const companyB = personB.company || personB.companyName || 'N/A';
    const stageA = personA.stage || personA.companyStage || '';
    const stageB = personB.stage || personB.companyStage || '';

    const user = `Person A: ${personA.name}, roles: ${(personA.roles || []).join(', ')}, company: ${companyA}${stageA ? ` (${stageA})` : ''}
Purpose tonight: ${personA.purpose || ''}
Skills they offer: ${(personA.skillsHave || []).join(', ') || 'not specified'}
Skills they seek: ${(personA.skillsSeek || []).join(', ') || 'not specified'}
Roles they want to meet: ${(personA.seeksRoles || []).join(', ') || 'not specified'}

Person B: ${personB.name}, roles: ${(personB.roles || []).join(', ')}, company: ${companyB}${stageB ? ` (${stageB})` : ''}
Purpose tonight: ${personB.purpose || ''}
Skills they offer: ${(personB.skillsHave || []).join(', ') || 'not specified'}
Skills they seek: ${(personB.skillsSeek || []).join(', ') || 'not specified'}
Roles they want to meet: ${(personB.seeksRoles || []).join(', ') || 'not specified'}`;

    const raw = await callAICached(cacheKey, system, user, 300);

    let parsed;
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { whyMatch: raw, icebreaker: '', talkingPoints: [] };
    }

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/why-event
router.post('/why-event', async (req, res) => {
  try {
    const { event, personProfile, score, attendeeCount } = req.body;
    const cacheKey = `why-event:${event?.id}:${personProfile?.id || 'anon'}`;

    const system = `You are a professional networking advisor. Write exactly 2 sentences explaining
why a specific person should attend a particular event tonight. Be specific — mention roles, skills, goals.
Sound like a knowledgeable friend giving quick advice. Under 50 words.`;

    const user = `Person: ${personProfile?.name || 'Professional'}, roles: ${(personProfile?.roles || []).join(', ')}, seeking: ${(personProfile?.seeksRoles || []).join(', ')}
Skills they seek: ${(personProfile?.skillsSeek || []).join(', ')}

Event: "${event?.name}", type: ${event?.type}, ${attendeeCount} attendees, ${event?.durationMins} min
Match score: ${score}

Why should they attend?`;

    const explanation = await callAICached(cacheKey, system, user, 100);
    res.json({ explanation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

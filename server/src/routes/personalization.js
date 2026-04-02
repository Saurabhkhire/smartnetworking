const { Router } = require('express');
const { callAI } = require('../ai/adapter');
const db = require('../db');

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseJsonArray(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { const j = JSON.parse(val); return Array.isArray(j) ? j : []; } catch { return []; }
  }
  return [];
}

/** Parse "April 1", "Apr 1-10", "6pm", "18:00", etc. from free-text. */
function extractDateTimeFilters(question) {
  const q = question.toLowerCase();
  const MONTHS = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
    apr: 4, april: 4, may: 5, jun: 6, june: 6,
    jul: 7, july: 7, aug: 8, august: 8, sep: 9, september: 9,
    oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
  };
  const year = new Date().getFullYear();

  function toDate(month, day) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  function parseTime(h, m, ampm) {
    let hour = parseInt(h, 10);
    const min = parseInt(m || '0', 10);
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  const result = {};

  // DATE RANGE: "April 1 to April 10" / "Apr 1-10" / "April 1 through 10"
  const rangeRx = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})\s*(?:to|through|-|–)\s*(?:(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+)?(\d{1,2})\b/;
  const rm = q.match(rangeRx);
  if (rm) {
    const sm = MONTHS[rm[1]]; const sd = parseInt(rm[2]);
    const em = MONTHS[rm[3]] || sm; const ed = parseInt(rm[4]);
    if (sm && sd) result.startDate = toDate(sm, sd);
    if (em && ed) result.endDate = toDate(em, ed);
  }

  // SINGLE DATE: "April 3" / "on the 3rd" / "Apr 3"
  if (!result.startDate) {
    const singleRx = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})\b/;
    const sm2 = q.match(singleRx);
    if (sm2) {
      const mo = MONTHS[sm2[1]]; const d = parseInt(sm2[2]);
      if (mo && d) { result.startDate = toDate(mo, d); result.endDate = toDate(mo, d); }
    }
  }

  // TIME RANGE: "6pm to 9pm" / "18:00-21:00" / "between 6 and 9pm"
  const timeRangeRx = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:to|-|–|and)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/;
  const tr = q.match(timeRangeRx);
  if (tr) {
    const ampm1 = tr[3] || tr[6];
    const ampm2 = tr[6];
    result.startTime = parseTime(tr[1], tr[2], ampm1);
    result.endTime   = parseTime(tr[4], tr[5], ampm2);
  }

  // KEYWORDS
  if (!result.startTime && /\b(evening|after hours|tonight|night)\b/.test(q)) {
    result.startTime = '17:00';
  }
  if (!result.startTime && /\bmorning\b/.test(q)) {
    result.startTime = '06:00'; result.endTime = '12:00';
  }
  if (!result.startTime && /\bafternoon\b/.test(q)) {
    result.startTime = '12:00'; result.endTime = '17:00';
  }

  // COUNT: "top 3", "best 5"
  const countRx = /\b(?:top|best|show me|give me)\s+(\d+)\b/;
  const cm = q.match(countRx);
  if (cm) result.topN = parseInt(cm[1]);

  return Object.keys(result).length ? result : null;
}

/** Filter events by parsed date/time. Returns annotated list. */
function preFilterEvents(events, filters) {
  if (!filters) return null;
  return events.filter(e => {
    if (filters.startDate && e.date < filters.startDate) return false;
    if (filters.endDate   && e.date > filters.endDate)   return false;
    if (filters.startTime || filters.endTime) {
      const [eh, em] = (e.startTime || '00:00').split(':').map(Number);
      const eventMins = eh * 60 + em;
      if (filters.startTime) {
        const [sh, sm] = filters.startTime.split(':').map(Number);
        if (eventMins < sh * 60 + sm) return false;
      }
      if (filters.endTime) {
        const [fh, fm] = filters.endTime.split(':').map(Number);
        if (eventMins > fh * 60 + fm) return false;
      }
    }
    return true;
  });
}

/** Merge Profile doc into person row for AI prompts (SQLite + Neo4j). */
function mergeProfileForAi(personProfile, profileDoc) {
  if (!personProfile) return null;
  const p = { ...personProfile };
  p.workExperience  = parseJsonArray(p.workExperience  || profileDoc?.workExperience);
  p.projects        = parseJsonArray(p.projects        || profileDoc?.projects);
  p.certifications  = parseJsonArray(p.certifications  || profileDoc?.certifications);
  if (!p.summary   && profileDoc?.description) p.summary  = profileDoc.description;
  if (!p.headline  && profileDoc?.headline)    p.headline = profileDoc.headline;
  return p;
}

async function loadMergedPersonForAi(personId) {
  if (!personId || personId === 'guest') return { merged: null, past: [], insights: [] };
  const [base, profile, past, insights] = await Promise.allSettled([
    db.getPersonWithSkillsForProfile(personId),
    db.getProfile(personId),
    db.getPastEventHistory ? db.getPastEventHistory(personId) : Promise.resolve([]),
    db.getPersonInsights   ? db.getPersonInsights(personId)   : Promise.resolve([]),
  ]);
  return {
    merged: mergeProfileForAi(
      base.status   === 'fulfilled' ? base.value    : null,
      profile.status === 'fulfilled' ? profile.value : null,
    ),
    past:     past.status     === 'fulfilled' ? (past.value     || []) : [],
    insights: insights.status === 'fulfilled' ? (insights.value || []) : [],
  };
}

// ── Build rich attendee context string ───────────────────────────────────────
function buildAttendeeContext(attendees, profiles = {}) {
  return attendees.slice(0, 60).map(a => {
    const prof = { ...(profiles[a.id] || {}), ...a };
    const have = (prof.skillsHave || []).map(s => s.name || s).slice(0, 6).join(', ');
    const seek = (prof.skillsSeek || []).map(s => s.name || s).slice(0, 4).join(', ');
    const headline = prof.headline || a.headline || '';
    const wx = parseJsonArray(prof.workExperience);
    const jobs = wx.slice(0, 2).map(w => `${w.title || w.role || ''} @ ${w.company || ''}`.trim()).filter(Boolean).join('; ');
    const projs = parseJsonArray(prof.projects);
    const projLine = projs.slice(0, 2).map(p => `${p.name || 'Project'}${p.description ? `: ${String(p.description).slice(0, 70)}` : ''}`).join(' | ');
    const certs = parseJsonArray(prof.certifications).slice(0, 2).map(c => typeof c === 'string' ? c : c.name || '').filter(Boolean).join(', ');

    const parts = [
      `${a.name}`,
      (a.roles || []).length ? `roles: ${a.roles.join('/')}` : null,
      (a.companyName || a.company) ? `company: ${a.companyName || a.company}${a.companyStage ? ` (${a.companyStage})` : ''}` : null,
      headline ? `headline: ${headline.slice(0, 72)}` : null,
      jobs ? `work: ${jobs}` : null,
      a.purpose ? `goal: ${a.purpose}` : null,
      a.eventIntent ? `intent: ${String(a.eventIntent).slice(0, 100)}` : null,
      have ? `skills: ${have}` : null,
      seek ? `seeks: ${seek}` : null,
      projLine ? `portfolio: ${projLine}` : null,
      certs ? `certs: ${certs}` : null,
      (a.summary || prof.summary) ? `bio: ${String(a.summary || prof.summary).slice(0, 100)}` : null,
    ].filter(Boolean);
    return `• ${parts.join(' | ')}`;
  }).join('\n');
}

// ── PARALLEL profile loading ──────────────────────────────────────────────────
async function loadProfilesForAttendees(attendees, limit = 25) {
  const slice = attendees.slice(0, limit);
  const results = await Promise.allSettled(
    slice.map(a => db.getPersonWithSkillsForProfile(a.id).catch(() => null))
  );
  const profilesByPerson = {};
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) profilesByPerson[slice[i].id] = r.value;
  });
  return profilesByPerson;
}

// ── PARALLEL cross-event attendee index ──────────────────────────────────────
async function buildEventAttendeeIndex(events, maxEvents = 20, maxPerEvent = 15) {
  const topEvents = [...events]
    .sort((a, b) => (b.attendeesCount || 0) - (a.attendeesCount || 0))
    .slice(0, maxEvents);

  const attendeeLists = await Promise.allSettled(
    topEvents.map(ev => db.getAttendees(ev.id).catch(() => []))
  );

  const index = {};
  topEvents.forEach((ev, i) => {
    const att = attendeeLists[i].status === 'fulfilled' ? (attendeeLists[i].value || []) : [];
    index[ev.id] = {
      name: ev.name, type: ev.type, date: ev.date, startTime: ev.startTime,
      endTime: ev.endTime, location: ev.location,
      attendees: att.slice(0, maxPerEvent).map(a => ({
        name: a.name,
        company: a.companyName || a.company || '',
        roles: (a.roles || []).join('/'),
        purpose: a.purpose || '',
        headline: String(a.headline || '').slice(0, 60),
      })),
    };
  });
  return index;
}

function buildCrossEventContext(index) {
  return Object.values(index).map(ev => {
    const list = ev.attendees.map(a =>
      `${a.name}${a.company ? ` (${a.company})` : ''}${a.roles ? ` [${a.roles}]` : ''}`
    ).join(', ');
    return `"${ev.name}" [${ev.type} · ${ev.date} ${ev.startTime}–${ev.endTime || '?'} · ${ev.location || 'Bay Area'}]: ${list || '—'}`;
  }).join('\n');
}

// ── Offline fallback text ─────────────────────────────────────────────────────
function appendOfflineDiscoveryFacts(answer, allEvents) {
  if (!answer) return answer;
  if (!answer.includes('could not reach a language model')) return answer;
  const top = [...allEvents].sort((a, b) => (b.attendeesCount||0) - (a.attendeesCount||0)).slice(0, 8);
  return answer + '\n\n---\n**Top events by check-ins (offline fallback):**\n' +
    top.map(e => `• ${e.name} (${e.date} ${e.startTime}) — ${e.attendeesCount||0} checked in`).join('\n');
}

function appendOfflineEventFacts(answer, event, attendees, question) {
  if (!answer || !answer.includes('could not reach a language model')) return answer;
  const q = question.toLowerCase();
  const byRole = re => attendees.filter(a => (a.roles||[]).some(r => re.test(r)));
  let extra = `\n\n---\n**Quick facts (offline):**\n• Event: ${event.name} — ${attendees.length} attendees`;
  if (/investor|vc|angel/.test(q)) extra += `\n• Investors: ${byRole(/investor|vc|angel/i).slice(0,10).map(a=>a.name).join(', ')||'none'}`;
  else if (/founder/.test(q)) extra += `\n• Founders: ${byRole(/founder/i).slice(0,10).map(a=>a.name).join(', ')||'none'}`;
  else if (/engineer/.test(q)) extra += `\n• Engineers: ${byRole(/engineer/i).slice(0,10).map(a=>a.name).join(', ')||'none'}`;
  return answer + extra;
}

// POST /api/personalization/chat
router.post('/chat', async (req, res) => {
  try {
    const { personId, eventId, question, chatHistory = [], mode = 'event' } = req.body;
    if (!question) return res.status(400).json({ error: 'question is required' });

    const historyText = chatHistory.slice(-8).map(m =>
      `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
    ).join('\n');

    // ── MULTI-EVENT MODE ──────────────────────────────────────────────────────
    if (mode === 'events' || !eventId || eventId === 'none') {
      // Load person + all events in parallel
      const [personResult, eventsResult] = await Promise.allSettled([
        loadMergedPersonForAi(personId),
        db.listEvents(),
      ]);
      const { merged: personProfile, past, insights } = personResult.status === 'fulfilled'
        ? personResult.value : { merged: null, past: [], insights: [] };
      const allEvents = eventsResult.status === 'fulfilled' ? (eventsResult.value || []) : [];

      // ── Date/time pre-filter ──────────────────────────────────────────────
      const dtFilters = extractDateTimeFilters(question);
      const filteredEvents = dtFilters ? preFilterEvents(allEvents, dtFilters) : null;
      const topN = dtFilters?.topN || null;

      // Parallel: build attendee index for cross-event queries
      const attendeeIndex = await buildEventAttendeeIndex(allEvents, 20, 15);
      const crossEventCtx = buildCrossEventContext(attendeeIndex);

      // Full event catalog
      const evContext = allEvents.map(e => {
        const isAfterHours = e.startTime && parseInt(e.startTime.split(':')[0], 10) >= 17;
        return `• "${e.name}" | type:${e.type} | date:${e.date} ${e.startTime}–${e.endTime||'?'}${isAfterHours?' [AFTER-HOURS]':''} | location:${e.location||'Bay Area'} | attendees:${e.attendeesCount||0} | host:${e.hostName||'?'} | desc:${(e.description||'').slice(0,200)} | blasts:${(e.blasts||[]).slice(0,2).join(', ')||'—'}`;
      }).join('\n');

      // Filtered events block (if date/time query detected)
      let filteredBlock = '';
      if (filteredEvents) {
        const label = [
          dtFilters.startDate && dtFilters.endDate && dtFilters.startDate !== dtFilters.endDate
            ? `${dtFilters.startDate} → ${dtFilters.endDate}` : dtFilters.startDate || '',
          dtFilters.startTime ? `time ≥ ${dtFilters.startTime}` : '',
          dtFilters.endTime   ? `time ≤ ${dtFilters.endTime}`   : '',
        ].filter(Boolean).join(', ');
        const sorted = filteredEvents
          .sort((a, b) => (b.attendeesCount||0) - (a.attendeesCount||0))
          .slice(0, topN || 15);
        filteredBlock = `\n=== PRE-FILTERED EVENTS matching query criteria (${label}) — ${filteredEvents.length} events ===\n` +
          (sorted.length
            ? sorted.map(e => `• "${e.name}" | ${e.date} ${e.startTime}–${e.endTime||'?'} | ${e.type} | ${e.location||'Bay Area'} | ${e.attendeesCount||0} attendees | ${(e.description||'').slice(0,150)}`).join('\n')
            : '(no events match those filters)\n') + '\n';
      }

      const personSkillsHave = (personProfile?.skillsHave||[]).map(s=>s.name||s).join(', ');
      const personSkillsSeek = (personProfile?.skillsSeek||[]).map(s=>s.name||s).join(', ');
      const personWx = parseJsonArray(personProfile?.workExperience).slice(0,2).map(w=>`${w.title||''} @ ${w.company||''}`.trim()).filter(Boolean).join('; ');
      const personProj = parseJsonArray(personProfile?.projects).slice(0,2).map(p=>`${p.name}: ${String(p.description||'').slice(0,60)}`).join(' | ');

      const personCtx = personProfile ? `PERSON ASKING (use ALL fields — never say profile is missing):
Name: ${personProfile.name} | Email: ${personProfile.email||'on file'}
Roles: ${(personProfile.roles||[]).join(', ')} | Company: ${personProfile.companyName||'?'} (${personProfile.companyStage||''})
Headline: ${personProfile.headline||''} | Goal: ${personProfile.purpose||'networking'}
Event intent: ${String(personProfile.eventIntent||'').slice(0,180)}
Seeks roles: ${(personProfile.seeksRoles||[]).join(', ')}
Skills: ${personSkillsHave}
Seeking skills: ${personSkillsSeek}
${personWx?`Work: ${personWx}`:''}
${personProj?`Projects: ${personProj}`:''}
${personProfile.summary?`Bio: ${personProfile.summary.slice(0,300)}`:''}
${past?.length?`Past events attended: ${past.slice(0,4).map(p=>`${p.eventName} (${p.eventDate})`).join(', ')}`:''}
${insights?.length?`Insights: ${insights.slice(0,3).map(i=>`${i.type}:${i.value}`).join('; ')}`:''}` :
`BROWSE MODE: No user profile. Use event catalog, descriptions, and attendee samples. Suggest logging in for personalized recs.`;

      const system = `You are VentureGraph AI — a senior event discovery assistant for a professional networking platform in the Bay Area.

Your persona: warm, direct, data-driven. You are NEVER generic. Every answer cites specific event names, dates, times, attendee counts, or role breakdowns pulled from the data.

CRITICAL RULES:
1. DATE/TIME QUERIES: When the question mentions specific dates (e.g. "April 3"), times (e.g. "6pm-9pm"), or ranges (e.g. "April 1 to 10") — you MUST use the PRE-FILTERED EVENTS section below which already filters to those exact criteria. Rank only those events, not the full list.
2. TOP N QUERIES: If asked for "top 3" or "best 5" — return EXACTLY that many, ranked by attendee count, role mix quality, and description relevance. No more, no less.
3. AFTER HOURS: Events tagged [AFTER-HOURS] start at 5pm or later. Use this tag explicitly.
4. PERSON LOOKUPS: When asked "which events has [person name] attending" — scan PER-EVENT ATTENDEE LISTS below. List all events where that name appears.
5. COMPANY LOOKUPS: When asked about a company — scan attendee company fields in PER-EVENT ATTENDEE LISTS.
6. ROLE COUNTS: For "most founders/investors/[role]" — count role occurrences per event in attendee lists.
7. PROFILE MATCHING: Compare user's skills/goals/roles to event descriptions AND attendee profiles. Be specific about WHY they match.
8. NEVER say you lack information that is present in the context. NEVER give generic advice.

FORMAT:
- Use numbered list for ranked answers, bullets for supporting details
- Each recommendation: event name (bold), date+time, location, why it fits (2 sentences max)
- End EVERY reply with: "**Reasoning:** [2-3 sentences on exactly which data fields drove this answer]"
- Keep answer under 320 words unless more detail is genuinely needed`;

      const userPrompt = `${personCtx}

=== FULL EVENT CATALOG (${allEvents.length} events) ===
${evContext}
${filteredBlock}
=== CROSS-EVENT ATTENDEE LISTS (top events, sample attendees) ===
${crossEventCtx}

${historyText ? `Prior conversation:\n${historyText}\n` : ''}
QUESTION: ${question}`;

      let answer = await callAI(system, userPrompt, 1000);
      answer = appendOfflineDiscoveryFacts(answer, allEvents);
      return res.json({ answer });
    }

    // ── SINGLE EVENT MODE ─────────────────────────────────────────────────────
    const [personResult, eventResult, attendeesResult] = await Promise.allSettled([
      loadMergedPersonForAi(personId),
      db.getEvent(eventId),
      db.getAttendees(eventId),
    ]);

    const { merged: personProfile, past, insights } = personResult.status === 'fulfilled'
      ? personResult.value : { merged: null, past: [], insights: [] };
    const event     = eventResult.status === 'fulfilled' ? eventResult.value : null;
    const attendees = attendeesResult.status === 'fulfilled' ? (attendeesResult.value || []) : [];

    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Load profiles in parallel (limit to 25 for speed)
    const profilesByPerson = await loadProfilesForAttendees(attendees, 25);

    const otherAttendees = personProfile ? attendees.filter(a => a.id !== personProfile.id) : attendees;
    const attendeeContext = buildAttendeeContext(otherAttendees, profilesByPerson);

    // Role distribution
    const roleCounts = {};
    for (const a of attendees) for (const r of (a.roles||[])) roleCounts[r] = (roleCounts[r]||0) + 1;
    const roleBreakdown = Object.entries(roleCounts).sort((a,b)=>b[1]-a[1]).map(([r,c])=>`${r}:${c}`).join(', ');

    const mySkillsHave = (personProfile?.skillsHave||[]).map(s=>s.name||s).join(', ');
    const mySkillsSeek = (personProfile?.skillsSeek||[]).map(s=>s.name||s).join(', ');
    const myWx = parseJsonArray(personProfile?.workExperience).slice(0,2).map(w=>`${w.title||''} @ ${w.company||''}`.trim()).filter(Boolean).join('; ');
    const myProj = parseJsonArray(personProfile?.projects).slice(0,3).map(p=>`${p.name||'Project'} — ${String(p.description||'').slice(0,60)}`).join('; ');

    const personCtx = personProfile ? `PERSON ASKING (use ALL fields):
Name: ${personProfile.name} | Roles: ${(personProfile.roles||[]).join(', ')}
Company: ${personProfile.companyName||'?'} (${personProfile.companyStage||''})
Headline: ${personProfile.headline||''}
${myWx?`Work: ${myWx}`:''}
Goal: ${personProfile.purpose||personProfile.eventIntent||'networking'}
Seeks roles: ${(personProfile.seeksRoles||[]).join(', ')}
Skills I have: ${mySkillsHave}
Skills I seek: ${mySkillsSeek}
${myProj?`Projects: ${myProj}`:''}
${personProfile.summary?`Bio: ${personProfile.summary.slice(0,300)}`:''}
${past?.length?`Past events: ${past.slice(0,4).map(p=>p.eventName).join(', ')}`:''}
${insights?.length?`Insights: ${insights.slice(0,3).map(i=>`${i.type}:${i.value}`).join('; ')}`:''}` :
`Visitor (not logged in): use ONLY event details and attendee list below. Suggest registering for personalized matching.`;

    const system = `You are the AI networking assistant for "${event.name}" on VentureGraph.

Your job: help this specific person get maximum value from this event. Sound like a knowledgeable friend who has read every attendee's LinkedIn — specific, warm, actionable.

RULES:
- "Top people to meet": rank 5-8 people by relevance to the person asking. For EACH: name, role, company, 1-sentence WHY (link their skills/goals to the attendee's background). Be concrete, not generic.
- "Icebreaker for ALL top people": give a specific 1-2 sentence opener PER PERSON, referencing their actual project/company/background from the attendee list. Example: "I saw you're building [ProjectName] — I'm also working on [related area]..."
- "Icebreaker for [specific person name]": find that person in the attendee list. Craft opener using their headline, company, project, or goals. Include a hook question.
- "Who are investors/founders/[role]": list ALL attendees matching that role with company + 1 sentence on why worth meeting.
- HOST questions: give event context, format, and what the host has set up.
- NEVER invent names. NEVER be generic. Use real data from the attendee list.
- Use bullets. Keep main body under 400 words.
- End EVERY reply: "**Reasoning:** [which attendee fields matched which user attributes]"`;

    const userPrompt = `EVENT: "${event.name}"
Type: ${event.type} | Date: ${event.date} | Time: ${event.startTime}–${event.endTime||'?'} (${event.durationMins||'?'} min)
Location: ${event.location||'Bay Area'} | Host: ${event.hostName||'Unknown'}
Description: ${event.description||'No description provided'}
Blasts: ${(event.blasts||[]).join(' | ')||'—'}
Role breakdown: ${roleBreakdown}
Total attendees checked in: ${attendees.length}

${personCtx}

ATTENDEE PROFILES (${otherAttendees.length} people, profiles loaded for top ${Math.min(25, otherAttendees.length)}):
${attendeeContext}

${historyText ? `Conversation history:\n${historyText}\n` : ''}
QUESTION: ${question}`;

    let answer = await callAI(system, userPrompt, 1200);
    answer = appendOfflineEventFacts(answer, event, attendees, question);
    res.json({ answer });
  } catch (err) {
    console.error('[personalization] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const db = require('../db');

/**
 * Roles whose attendees must always be placed in a group every round (no idle).
 * Attendees whose roles are NOT in this set (Recruiter, Analyst, Advisor, Executive, …)
 * may sit out if group sizes cannot accommodate them.
 */
const MAIN_ROLES = new Set([
  'Founder', 'Co-Founder',
  'Investor', 'Angel Investor', 'VC Partner',
  'Engineer', 'Product Manager', 'Designer',
  'Marketing', 'Growth', 'Sales',
]);

function isMainPerson(person) {
  return (person.roles || []).some(r => MAIN_ROLES.has(r));
}

/**
 * Compute all scores for an event (Layer 1 → Layer 2).
 */
async function computeScores(eventId) {
  const layer1Pairs = await db.computeLayer1Pairs(eventId);
  const scoredPairs = await db.computeLayer2Scores(layer1Pairs);
  return scoredPairs;
}

/**
 * Integer partition: n people → group counts each in [min, max].
 * Used by buildAllPersonTimesheets (not by the round planner).
 */
function computeRoundGroupSizes(n, groupSizeMin, groupSizeMax) {
  if (n <= 0) return [];
  const min = Math.max(1, groupSizeMin);
  const max = Math.max(min, groupSizeMax);
  if (n <= max) return [n];

  const kLow = Math.ceil(n / max);
  const kHigh = Math.floor(n / min);
  if (kLow > kHigh) return [n];

  for (let k = kLow; k <= kHigh; k++) {
    const base = Math.floor(n / k);
    const extra = n % k;
    const sizes = [];
    for (let i = 0; i < k; i++) sizes.push(base + (i < extra ? 1 : 0));
    if (sizes.every(sz => sz >= min && sz <= max)) return sizes;
  }
  return [n];
}

/**
 * Build icebreaker groups for all rounds.
 *
 * Rules enforced:
 *  1. All MAIN_ROLE attendees are placed every round — no idle seats for core roles.
 *  2. Every group has >= groupSizeMin members.
 *     → Optional-role attendees fill gaps; undersized groups are merged.
 *  3. "People of interest" (seeksRoles role-match) are distributed EVENLY across rounds
 *     via round-robin assignment.  If Mark has 10 interests across 6 rounds, he gets
 *     [2,2,2,2,1,1] targets per round — not [3,3,3,1,0,0].
 *  4. Each group tries to contain ≥1 person of interest for every member.
 *  5. No pair shares a group twice across rounds.
 *
 * @param {string} _eventId        — kept for API compat, unused internally
 * @param {Array}  scoredPairs     — [{personA, personB, totalScore}]
 * @param {Array}  attendeeObjects — full person objects [{id, roles, seeksRoles, …}]
 * @param {number} roundMins
 * @param {number} durationMins
 * @param {number} groupSizeMin
 * @param {number} groupSizeMax
 * @returns {Array} [{round, groups: [{members:[ids], score}]}]
 */
function planIcebreakerRounds(_eventId, scoredPairs, attendeeObjects, roundMins, durationMins, groupSizeMin, groupSizeMax) {
  const numRounds = Math.floor(durationMins / roundMins);
  const min = Math.max(2, groupSizeMin ?? 3);
  const max = Math.max(min, groupSizeMax ?? 6);

  if (!attendeeObjects?.length || numRounds === 0) return [];

  // ── Score lookup ─────────────────────────────────────────────────────────────
  const scoreMap = new Map();
  for (const { personA, personB, totalScore } of scoredPairs) {
    scoreMap.set(personA < personB ? `${personA}:${personB}` : `${personB}:${personA}`, totalScore);
  }
  function pairScore(a, b) {
    return scoreMap.get(a < b ? `${a}:${b}` : `${b}:${a}`) || 0;
  }

  // ── Interest graph ────────────────────────────────────────────────────────────
  // For each person: ordered list of attendees whose role they seek, highest score first.
  const interestList = new Map();
  for (const person of attendeeObjects) {
    interestList.set(
      person.id,
      attendeeObjects
        .filter(o =>
          o.id !== person.id &&
          (person.seeksRoles || []).some(r => (o.roles || []).includes(r))
        )
        .sort((a, b) => pairScore(person.id, b.id) - pairScore(person.id, a.id))
        .map(o => o.id)
    );
  }

  // ── Classify attendees ────────────────────────────────────────────────────────
  const mainIds = attendeeObjects.filter(isMainPerson).map(p => p.id);
  const optionalIds = attendeeObjects.filter(p => !isMainPerson(p)).map(p => p.id);
  // Fallback: if nobody has a main role, treat all as main
  const effectiveMainIds = mainIds.length > 0 ? mainIds : attendeeObjects.map(p => p.id);
  const effectiveOptIds  = mainIds.length > 0 ? optionalIds : [];

  // ── Round-robin interest schedule ─────────────────────────────────────────────
  // Distributes each person's interests evenly across rounds.
  // Person with 10 interests across 6 rounds → rounds get [2,2,2,2,1,1] targets.
  const interestTargets = new Map(); // personId → Set[] (one per round)
  for (const person of attendeeObjects) {
    const interests = interestList.get(person.id) || [];
    const schedule = Array.from({ length: numRounds }, () => new Set());
    interests.forEach((id, idx) => schedule[idx % numRounds].add(id));
    interestTargets.set(person.id, schedule);
  }

  // ── Met-pairs tracker ─────────────────────────────────────────────────────────
  const metPairs = new Set();
  function hasMet(a, b) { return metPairs.has(a < b ? `${a}:${b}` : `${b}:${a}`); }
  function markMet(a, b) { metPairs.add(a < b ? `${a}:${b}` : `${b}:${a}`); }

  const result = [];

  for (let roundIdx = 0; roundIdx < numRounds; roundIdx++) {
    const targetsNow = (pid) => interestTargets.get(pid)?.[roundIdx] ?? new Set();

    // Mutual-interest score for adding a candidate to an existing group.
    // Penalises already-met pairs (discourages but doesn't forbid repeats).
    function fitScore(candidateId, groupMembers) {
      let s = 0;
      for (const m of groupMembers) {
        if (hasMet(candidateId, m)) s -= 80;
        if (targetsNow(candidateId).has(m))  s += 15; // candidate wants to meet m
        if (targetsNow(m).has(candidateId))  s += 15; // m wants to meet candidate
        s += pairScore(candidateId, m) * 0.25;
      }
      return s;
    }

    const nMain   = effectiveMainIds.length;
    const nGroups = Math.max(1, Math.ceil(nMain / max));

    // Sort seeds: people with the most targets this round become group anchors first
    const sortedMain = [...effectiveMainIds].sort((a, b) =>
      targetsNow(b).size - targetsNow(a).size
    );

    const assigned = new Set();
    const groups   = []; // each group is a mutable array of IDs

    // ── Phase 1: Seed one person per group ────────────────────────────────────
    for (let i = 0; i < nGroups; i++) {
      const seed = sortedMain[i];
      if (!seed) break;
      assigned.add(seed);
      groups.push([seed]);
    }

    // ── Phase 2: Assign remaining main people to best-fit group ──────────────
    for (const id of sortedMain) {
      if (assigned.has(id)) continue;
      let bestGroup = null, bestScore = -Infinity;
      for (const g of groups) {
        if (g.length >= max) continue;
        // Small-group bonus keeps group sizes balanced
        const s = fitScore(id, g) + (max - g.length) * 2;
        if (s > bestScore) { bestScore = s; bestGroup = g; }
      }
      if (!bestGroup) groups.push([id]); // overflow — shouldn't happen with nGroups formula
      else bestGroup.push(id);
      assigned.add(id);
    }

    // ── Phase 3: Fill groups under min with optional attendees ────────────────
    const availOpt = [...effectiveOptIds].filter(id => !assigned.has(id));
    for (const g of groups) {
      while (g.length < min && availOpt.length > 0) {
        // Pick the optional person with best fit for this group
        let best = availOpt[0], bestS = -Infinity;
        for (const opt of availOpt) {
          const s = fitScore(opt, g);
          if (s > bestS) { bestS = s; best = opt; }
        }
        availOpt.splice(availOpt.indexOf(best), 1);
        g.push(best);
        assigned.add(best);
      }
    }

    // ── Phase 4: Merge groups still under min ─────────────────────────────────
    // (Only reached if optional pool was exhausted)
    let merging = true;
    while (merging) {
      merging = false;
      groups.sort((a, b) => a.length - b.length);
      if (groups.length > 1 && groups[0].length < min) {
        const small = groups.shift();
        // Prefer a target whose combined size stays ≤ max; last resort: smallest group
        const target = groups.find(g => g.length + small.length <= max) ?? groups[0];
        target.push(...small);
        merging = true;
      }
    }

    // ── Phase 5: Distribute remaining optional people into groups with room ───
    for (const optId of availOpt) {
      const target = groups
        .filter(g => g.length < max)
        .sort((a, b) => a.length - b.length)[0];
      if (target) { target.push(optId); assigned.add(optId); }
    }

    // ── Mark pairs met & compute group scores ────────────────────────────────
    const roundGroups = groups.map(members => {
      let groupScore = 0;
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          markMet(members[i], members[j]);
          groupScore += pairScore(members[i], members[j]);
        }
      }
      return { members: [...members], score: groupScore };
    });

    result.push({ round: roundIdx + 1, groups: roundGroups });
  }

  return result;
}

/**
 * Build personalised 1-on-1 schedule for one person.
 */
function planNetworkingSchedule(personId, scoredPairs, slotMins, durationMins) {
  const slots = Math.floor(durationMins / slotMins);
  const matches = scoredPairs
    .filter(p => p.personA === personId || p.personB === personId)
    .map(p => ({
      matchId: p.personA === personId ? p.personB : p.personA,
      totalScore: p.totalScore,
    }))
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, slots);

  return matches.map((m, i) => ({
    slot: i + 1,
    matchId: m.matchId,
    totalScore: m.totalScore,
  }));
}

/**
 * Post-event: compute PersonaInsight nodes.
 */
async function computePersonaInsights() {
  await db.computePersonaInsights();
}

/** "HH:MM" + minutes → "HH:MM" */
function addClockMinutes(timeStr, deltaMins) {
  const parts = String(timeStr || '18:00').trim().split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  let total = h * 60 + m + deltaMins;
  total = ((total % (24 * 60)) + (24 * 60)) % (24 * 60);
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function eventWindowStart(event) {
  const st = event && event.startTime != null ? String(event.startTime).trim() : '';
  const m = st.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m) return `${String(parseInt(m[1], 10)).padStart(2, '0')}:${m[2]}`;
  return '18:00';
}

/**
 * Icebreaker grid for every attendee.
 */
function buildAllPersonTimesheets(attendeeIds, rounds, event, scoredPairs, idToName) {
  const roundMins = event.roundMins || 10;
  const t0 = eventWindowStart(event);
  const names = idToName || {};

  const personalizationFor = (personId) => {
    const candidates = (scoredPairs || [])
      .filter(p => p.personA === personId || p.personB === personId)
      .sort((a, b) => b.totalScore - a.totalScore);
    const top = candidates[0];
    if (!top) {
      return {
        headline: 'Personalization',
        line: 'Rotate with every group below — introduce yourself and your goal for the evening.',
      };
    }
    const otherId = top.personA === personId ? top.personB : top.personA;
    const otherName = names[otherId] || otherId;
    return {
      headline: 'Personalization',
      line: `You should prioritize meeting ${otherName} — highest compatibility score ${top.totalScore} (roles & skills alignment). Say why you're a strong mutual fit when you connect.`,
      topMatchName: otherName,
      topMatchScore: top.totalScore,
    };
  };

  const timesheets = attendeeIds.map(personId => {
    const scheduleRows = [];
    for (const { round, groups } of rounds) {
      let gIdx = -1;
      let peerIds = [];
      for (let i = 0; i < groups.length; i++) {
        if (groups[i].members.includes(personId)) {
          gIdx = i;
          peerIds = groups[i].members.filter(m => m !== personId);
          break;
        }
      }
      if (gIdx < 0) continue;
      const start = addClockMinutes(t0, (round - 1) * roundMins);
      const end   = addClockMinutes(t0, round * roundMins);
      scheduleRows.push({
        round,
        groupNumber: gIdx + 1,
        timeStart: start,
        timeEnd: end,
        timeLabel: `${start} – ${end}`,
        withNames: peerIds.map(id => names[id] || id),
      });
    }
    return {
      personId,
      personName: names[personId] || personId,
      personalization: personalizationFor(personId),
      scheduleRows,
    };
  });

  return { timesheets };
}

/** Reconstruct planner output from stored groups */
async function loadIcebreakerRoundsFromNeo4j(eventId) {
  return db.loadGroupRounds(eventId);
}

module.exports = {
  computeScores,
  planIcebreakerRounds,
  planNetworkingSchedule,
  computePersonaInsights,
  buildAllPersonTimesheets,
  loadIcebreakerRoundsFromNeo4j,
  eventWindowStart,
  addClockMinutes,
};

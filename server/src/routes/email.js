const { Router } = require('express');
const db = require('../db');
const { computeScores, planNetworkingSchedule } = require('../services/matching');

const router = Router();

function getTransporter() {
  const nodemailer = require('nodemailer');
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

function buildScheduleHtml(person, schedule, event) {
  const eventName = event?.name || 'Event';
  const rows = schedule.map((slot, i) => `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:8px 12px;color:#666">Slot ${i + 1}</td>
      <td style="padding:8px 12px;font-weight:bold">${slot.match?.name || slot.match?.id || 'TBD'}</td>
      <td style="padding:8px 12px;color:#888">${(slot.match?.roles || []).join(', ')}</td>
      <td style="padding:8px 12px;color:#555">${slot.match?.company || ''}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>${eventName} — Your Schedule</title></head>
    <body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9">
      <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <h1 style="color:#7c6fff;margin-bottom:4px">${eventName}</h1>
        <p style="color:#888;margin-bottom:24px">${event?.date || ''} ${event?.startTime ? `at ${event.startTime}` : ''}</p>
        <h2 style="color:#333;font-size:18px">Hi ${person.name},</h2>
        <p style="color:#555">Here is your personalized 1-on-1 schedule for tonight:</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px">
          <thead>
            <tr style="background:#f0efff;text-align:left">
              <th style="padding:8px 12px;color:#7c6fff">Slot</th>
              <th style="padding:8px 12px;color:#7c6fff">Name</th>
              <th style="padding:8px 12px;color:#7c6fff">Roles</th>
              <th style="padding:8px 12px;color:#7c6fff">Company</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color:#aaa;font-size:12px;margin-top:32px">Powered by VentureGraph</p>
      </div>
    </body>
    </html>
  `;
}

function buildGroupsHtml(person, rounds, event) {
  const eventName = event?.name || 'Event';
  const roundHtml = rounds.map(({ round, groupMembers }) => `
    <div style="margin-bottom:20px">
      <h3 style="color:#7c6fff">Round ${round}</h3>
      <ul style="list-style:none;padding:0">
        ${(groupMembers || []).map(m => `
          <li style="padding:6px 0;border-bottom:1px solid #eee">
            <strong>${m.name || m.id}</strong>
            ${m.roles ? `<span style="color:#888;margin-left:8px">${m.roles.join(', ')}</span>` : ''}
          </li>
        `).join('')}
      </ul>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>${eventName} — Your Groups</title></head>
    <body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9">
      <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <h1 style="color:#7c6fff;margin-bottom:4px">${eventName}</h1>
        <p style="color:#888;margin-bottom:24px">${event?.date || ''}</p>
        <h2 style="color:#333;font-size:18px">Hi ${person.name},</h2>
        <p style="color:#555">Here are your mixer group rotations for tonight:</p>
        ${roundHtml}
        <p style="color:#aaa;font-size:12px;margin-top:32px">Powered by VentureGraph</p>
      </div>
    </body>
    </html>
  `;
}

// POST /api/email/send-schedule
router.post('/send-schedule', async (req, res) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(400).json({ error: 'Email not configured. Set EMAIL_USER and EMAIL_PASS in .env' });
    }

    const { eventId, targetEmails = [], scheduleType = 'schedule' } = req.body;
    if (!eventId) return res.status(400).json({ error: 'eventId required' });

    const event = await db.getEvent(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const attendees = await db.getAttendees(eventId);
    const rounds = await db.loadGroupRounds(eventId);
    const transporter = getTransporter();

    const personById = {};
    for (const a of attendees) personById[a.id] = a;

    // For networking schedules: compute scores once, reuse per-person
    let scored = null;
    if (scheduleType !== 'groups') {
      scored = await computeScores(eventId);
    }

    let sent = 0;
    const errors = [];

    // Fetch profiles for emails
    const profileMap = {};
    await Promise.all(attendees.map(async a => {
      try {
        const profile = await db.getProfile(a.id);
        if (profile?.email) profileMap[a.id] = profile.email;
      } catch {}
    }));

    for (const attendee of attendees) {
      const email = profileMap[attendee.id];
      if (!email) continue;
      if (targetEmails.length > 0 && !targetEmails.includes(email)) continue;

      let html;
      let subject;

      if (scheduleType === 'groups') {
        const myRounds = rounds.map(({ round, groups }) => {
          for (const group of groups) {
            if (group.members.includes(attendee.id)) {
              return {
                round,
                groupMembers: group.members.filter(id => id !== attendee.id).map(id => personById[id] || { id }),
              };
            }
          }
          return null;
        }).filter(Boolean);

        html = buildGroupsHtml(attendee, myRounds, event);
        subject = `Your mixer groups — ${event.name}`;
      } else {
        const slotMins = event.roundMins || 5;
        const durationMins = event.durationMins || 60;
        const mySlots = planNetworkingSchedule(attendee.id, scored || [], slotMins, durationMins);
        const enrichedSchedule = mySlots.map(s => ({
          slot: s.slot,
          match: personById[s.matchId] || { id: s.matchId },
          totalScore: s.totalScore,
        }));
        html = buildScheduleHtml(attendee, enrichedSchedule, event);
        subject = `Your schedule — ${event.name}`;
      }

      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || `VentureGraph <${process.env.EMAIL_USER}>`,
          to: email,
          subject,
          html,
        });
        sent++;
      } catch (emailErr) {
        errors.push({ email, error: emailErr.message });
      }
    }

    res.json({ sent, errors: errors.length > 0 ? errors : undefined });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import Card from '../components/Card.jsx';
import RoleBadge from '../components/RoleBadge.jsx';
import ScoreBadge from '../components/ScoreBadge.jsx';

const input = {
  width: '100%', padding: '10px 14px', background: '#0f0f14', border: '1px solid #2a2a3e',
  borderRadius: 8, color: '#e8e8f0', fontSize: 14, outline: 'none', marginBottom: 12,
};
const label = { display: 'block', fontSize: 13, color: '#888', marginBottom: 4 };
const btn = (color = '#7c6fff') => ({
  padding: '9px 20px', background: color, color: color === '#facc15' ? '#0f0f14' : '#fff',
  border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13,
});

const TYPE_LABELS = { mixer: 'Mixer', personal: 'Personal (1-on-1)', normal: 'Open Networking' };

export default function OrganizerDashboard() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [scores, setScores] = useState(null);
  const [groups, setGroups] = useState(null);
  const [timesheets, setTimesheets] = useState(null);
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [emailStatus, setEmailStatus] = useState('');

  useEffect(() => {
    api.listEvents().then(setEvents).catch(() => setEvents([]));
  }, []);

  const idToName = Object.fromEntries(attendees.map((a) => [a.id, a.name]));

  async function loadEvent() {
    if (!eventId) return;
    setError(''); setLoading('event');
    setScores(null); setGroups(null); setTimesheets(null); setEmailStatus('');
    try {
      const [ev, att] = await Promise.all([api.getEvent(eventId), api.getAttendees(eventId)]);
      setEvent(ev); setAttendees(att);
    } catch (err) { setError(err.message); }
    setLoading('');
  }

  async function runScores() {
    setError(''); setLoading('scores');
    try {
      const d = await api.computeScores(eventId);
      setScores(d);
    } catch (err) { setError(err.message); }
    setLoading('');
  }

  async function runGroups() {
    setError(''); setLoading('groups');
    try {
      const d = await api.assignGroups(eventId);
      setGroups(d);
      setTimesheets(d.timesheets || null);
    } catch (err) { setError(err.message); }
    setLoading('');
  }

  async function refreshTimesheets() {
    setError(''); setLoading('ts');
    try {
      const d = await api.eventTimesheets(eventId);
      setTimesheets(d.timesheets || []);
    } catch (err) { setError(err.message); }
    setLoading('');
  }

  async function sendEmails(scheduleType) {
    setLoading('email'); setEmailStatus('');
    try {
      const d = await api.sendSchedule({ eventId, scheduleType });
      setEmailStatus(`Sent ${d.sent} email(s). ${d.errors?.length ? `${d.errors.length} error(s).` : ''}`);
    } catch (err) {
      setEmailStatus(`Error: ${err.message}`);
    }
    setLoading('');
  }

  const eventType = event?.type;
  const isMixer = eventType === 'mixer' || eventType === 'icebreaker';
  const isPersonal = eventType === 'personal' || eventType === 'networking';
  const isNormal = eventType === 'normal';

  return (
    <div>
      <h2 style={{ marginBottom: 24, fontSize: 24, fontWeight: 700 }}>Organizer Dashboard</h2>

      <Card title="Select event">
        <label style={label}>Event</label>
        <select style={input} value={eventId} onChange={(e) => setEventId(e.target.value)}>
          <option value="">Choose event…</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name} — {ev.date} [{TYPE_LABELS[ev.type] || ev.type}]
            </option>
          ))}
        </select>
        {error && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <button type="button" style={btn()} onClick={loadEvent} disabled={!eventId || loading === 'event'}>
          {loading === 'event' ? 'Loading...' : 'Load Event'}
        </button>
      </Card>

      {event && (
        <>
          <Card title="Event info">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 16 }}>
              {[
                ['Name', event.name],
                ['Mode', TYPE_LABELS[event.type] || event.type],
                ['Date', event.date],
                ['Start', event.startTime || '18:00'],
                ['End', event.endTime || '—'],
                ['Duration', `${event.durationMins} min`],
                ['Round', `${event.roundMins} min`],
                ['Attendees', attendees.length],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{k}</div>
                  <div style={{ fontWeight: 600 }}>{v}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title={`Attendees (${attendees.length})`}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              {/* Mixer mode: compute scores + assign groups */}
              {isMixer && (
                <>
                  <button type="button" style={btn()} onClick={runScores} disabled={loading === 'scores'}>
                    {loading === 'scores' ? 'Computing...' : 'Compute Scores'}
                  </button>
                  <button type="button" style={btn('#facc15')} onClick={runGroups} disabled={!scores || loading === 'groups'}>
                    {loading === 'groups' ? 'Assigning...' : 'Assign Groups + Timesheets'}
                  </button>
                  <button type="button" style={btn('#22c55e')} onClick={refreshTimesheets} disabled={loading === 'ts'}>
                    {loading === 'ts' ? 'Loading...' : 'Reload timesheets'}
                  </button>
                </>
              )}

              {/* Personal (1-on-1) mode: compute scores for personal schedules */}
              {isPersonal && (
                <button type="button" style={btn()} onClick={runScores} disabled={loading === 'scores'}>
                  {loading === 'scores' ? 'Computing...' : 'Compute Scores'}
                </button>
              )}

              {/* Normal mode: no algorithm buttons */}
              {isNormal && (
                <div style={{ fontSize: 13, color: '#f59e0b', padding: '8px 12px', background: '#f59e0b11', border: '1px solid #f59e0b33', borderRadius: 8 }}>
                  Open networking mode — no algorithm. Attendees use the Personalization chatbot for guidance.
                </div>
              )}

              {/* Email button for all modes */}
              <button
                type="button"
                style={btn('#6366f1')}
                onClick={() => sendEmails(isMixer ? 'groups' : 'schedule')}
                disabled={loading === 'email'}
              >
                {loading === 'email' ? 'Sending...' : 'Send Email Schedules'}
              </button>
            </div>

            {emailStatus && (
              <p style={{ fontSize: 13, color: emailStatus.startsWith('Error') ? '#f87171' : '#4ade80', marginBottom: 12 }}>
                {emailStatus}
              </p>
            )}

            {scores && (
              <p style={{ fontSize: 13, color: '#4ade80', marginBottom: 12 }}>
                {scores.pairs} pairs scored.
                {scores.sample?.length > 0 && (
                  <>
                    {' '}Sample:{' '}
                    {scores.sample.map((p) => `${idToName[p.personA] || 'A'} ↔ ${idToName[p.personB] || 'B'} (${p.totalScore})`).join(' · ')}
                  </>
                )}
              </p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
              {attendees.map((a) => (
                <div
                  key={a.id}
                  role="button"
                  tabIndex={0}
                  style={{ background: '#0f0f14', border: '1px solid #2a2a3e', borderRadius: 8, padding: 14, cursor: 'pointer' }}
                  onClick={() => navigate(`/results/${encodeURIComponent(event.name)}/${encodeURIComponent(a.name)}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/results/${encodeURIComponent(event.name)}/${encodeURIComponent(a.name)}`); }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 6, color: '#e8e8f0', fontSize: 14 }}>{a.name}</div>
                  <div style={{ marginBottom: 6 }}>
                    {(a.roles || []).map((r) => <RoleBadge key={r} role={r} />)}
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>{a.company || ''} {a.purpose ? `· ${a.purpose}` : ''}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Mixer: show groups */}
          {groups && (
            <Card title="Mixer groups (by round)">
              {groups.groups?.map(({ round, groups: gs }) => (
                <div key={round} style={{ marginBottom: 20 }}>
                  <h4 style={{ marginBottom: 10, color: '#c0bfff' }}>Round {round}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
                    {gs.map((g, i) => (
                      <div key={i} style={{ background: '#0f0f14', border: '1px solid #2a2a3e', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Score <ScoreBadge score={g.score} /></div>
                        {g.members.map((id) => {
                          const p = attendees.find((x) => x.id === id);
                          return <div key={id} style={{ fontSize: 13, marginBottom: 2, color: '#e8e8f0', fontWeight: 500 }}>{p?.name || id.slice(0, 8)}</div>;
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </Card>
          )}

          {/* Mixer: show timesheets */}
          {(timesheets && timesheets.length > 0) && (
            <Card title="Per-person schedule & personalization (mixer)">
              <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
                Each block shows the time window for that rotation, group number, who else is in the pod, and a one-line priority suggestion from scores.
              </p>
              {timesheets.map((ts) => (
                <div key={ts.personId} style={{ marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #2a2a3e' }}>
                  <h3 style={{ fontSize: 18, marginBottom: 8, color: '#e8e8f0' }}>{ts.personName}</h3>
                  <div style={{ background: '#7c6fff14', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: '#a5b4fc', marginBottom: 4 }}>{ts.personalization?.headline || 'Personalization'}</div>
                    <div style={{ fontSize: 14, lineHeight: 1.5 }}>{ts.personalization?.line}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {ts.scheduleRows.map((row) => (
                      <div key={row.round} style={{ background: '#0f0f14', border: '1px solid #2a2a3e', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontWeight: 600, color: '#c0bfff', marginBottom: 6 }}>
                          Group {row.groupNumber} — {row.timeLabel}
                        </div>
                        <div style={{ fontSize: 13, color: '#aaa' }}>
                          With {row.withNames.length ? row.withNames.join(', ') : '(solo)'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </Card>
          )}

          {/* Normal mode: show personalization info */}
          {isNormal && attendees.length > 0 && (
            <Card title="Personalization Info (Open Networking)">
              <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
                In normal mode, attendees get AI-powered guidance through the Personalization chatbot on their Results page.
                Click any attendee card above to view their personalized chatbot.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
                {attendees.slice(0, 6).map(a => (
                  <div key={a.id} style={{ background: '#0f0f14', border: '1px solid #2a2a3e', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>
                      {a.purpose || a.eventIntent || 'No goal specified'}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

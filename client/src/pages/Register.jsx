import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import Card from '../components/Card.jsx';

const ROLES = ['Founder','Co-Founder','Investor','Angel Investor','VC Partner','Engineer',
  'Product Manager','Designer','Marketing','Growth','Sales','Recruiter','Analyst','Advisor','Mentor','Executive','CXO','Other'];

const input = {
  width: '100%', padding: '10px 14px', background: '#0f0f14', border: '1px solid #2a2a3e',
  borderRadius: 8, color: '#e8e8f0', fontSize: 14, outline: 'none', marginBottom: 12,
};
const label = { display: 'block', fontSize: 13, color: '#888', marginBottom: 4 };
const btn = { padding: '11px 24px', background: '#7c6fff', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 };

function MultiSelect({ options, value, onChange, label: labelText }) {
  function toggle(v) {
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  }
  return (
    <div style={{ marginBottom: 12 }}>
      <span style={label}>{labelText}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
        {options.map(o => {
          const id = typeof o === 'string' ? o : o.id;
          const name = typeof o === 'string' ? o : o.name;
          const selected = value.includes(id);
          return (
            <button key={id} type="button" onClick={() => toggle(id)} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
              background: selected ? '#7c6fff22' : '#0f0f14', color: selected ? '#7c6fff' : '#666',
              border: `1px solid ${selected ? '#7c6fff' : '#2a2a3e'}`,
            }}>{name}</button>
          );
        })}
      </div>
    </div>
  );
}

export default function Register() {
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [form, setForm] = useState({
    name: '', roles: [], seeksRoles: [], eventIntent: '', openToRematch: true,
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    api.listEvents().then(setEvents).catch(() => setEvents([]));

    // Load from localStorage profile
    try {
      const stored = localStorage.getItem('vg_profile');
      if (stored) {
        const p = JSON.parse(stored);
        setForm(f => ({
          ...f,
          name: p.name || f.name,
          roles: p.roles || f.roles,
          seeksRoles: p.seeksRoles || f.seeksRoles,
          openToRematch: p.openToRematch !== undefined ? p.openToRematch : f.openToRematch,
        }));
        setProfileLoaded(true);
      }
    } catch {}
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setArr = k => v => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      // Pull extra profile data from localStorage for full registration
      let extra = {};
      try {
        const stored = localStorage.getItem('vg_profile');
        if (stored) {
          const p = JSON.parse(stored);
          extra = {
            companyName: p.companyName || '',
            companyStage: p.companyStage || '',
            skillsHave: (p.skillsHave || []),
            skillsSeek: (p.skillsSeek || []),
          };
        }
      } catch {}

      const data = await api.register(eventId, { ...form, ...extra, purpose: form.eventIntent });
      setResult(data);
    } catch (err) { setError(err.message); }
    setLoading(false);
  }

  const selectedEvent = events.find(e => e.id === eventId);

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700 }}>Register for Event</h2>
        <Link to="/profile" style={{ fontSize: 13, color: '#7c6fff', textDecoration: 'none' }}>
          Edit full profile →
        </Link>
      </div>

      {profileLoaded && (
        <div style={{ background: '#7c6fff14', border: '1px solid #7c6fff33', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#a5b4fc' }}>
          Profile pre-filled from your saved profile. You can adjust for this event.
        </div>
      )}

      <Card>
        <form onSubmit={submit}>
          <label style={label}>Event *</label>
          <select style={input} value={eventId} onChange={e => setEventId(e.target.value)} required>
            <option value="">Choose event…</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>
                {ev.name} — {ev.date} {ev.startTime ? `@ ${ev.startTime}` : ''}
              </option>
            ))}
          </select>

          {selectedEvent && (
            <div style={{ fontSize: 12, color: '#666', marginBottom: 12, padding: '6px 10px', background: '#0f0f14', borderRadius: 6 }}>
              Mode: <strong style={{ color: '#a5b4fc' }}>{selectedEvent.type}</strong>
              {selectedEvent.durationMins ? ` · ${selectedEvent.durationMins} min` : ''}
              {selectedEvent.endTime ? ` · ends ${selectedEvent.endTime}` : ''}
            </div>
          )}

          <label style={label}>Full name *</label>
          <input style={input} value={form.name} onChange={set('name')} required placeholder="Your name" />

          <MultiSelect label="Your roles *" options={ROLES} value={form.roles} onChange={setArr('roles')} />

          <MultiSelect label="Roles you seek to meet" options={ROLES} value={form.seeksRoles} onChange={setArr('seeksRoles')} />

          <label style={label}>What are you looking for at this event? (2-3 sentences)</label>
          <textarea
            style={{ ...input, minHeight: 80, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
            value={form.eventIntent}
            onChange={set('eventIntent')}
            placeholder="I'm looking to connect with investors interested in AI infrastructure. Hoping to find potential advisors with SaaS scaling experience..."
          />

          <label style={{ ...label, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <input type="checkbox" checked={form.openToRematch}
              onChange={e => setForm(f => ({ ...f, openToRematch: e.target.checked }))} />
            Open to re-meeting past connections
          </label>

          {error && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button style={btn} type="submit" disabled={loading}>{loading ? 'Registering...' : 'Register'}</button>
        </form>
      </Card>

      {result && (
        <Card title="Registered!">
          <p style={{ marginTop: 4, fontWeight: 700, fontSize: 18 }}>{result.name}</p>
          <p style={{ fontSize: 13, color: '#888', marginTop: 8 }}>
            Use <strong>Check In</strong> and pick this event — you'll appear by name.
            Results open by event + your name.
          </p>
        </Card>
      )}
    </div>
  );
}

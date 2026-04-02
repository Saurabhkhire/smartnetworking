import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const EVENT_MODES = [
  { value: 'mixer', label: 'Mixer', icon: '🔄', description: 'Rotating group rounds. Attendees move through small groups optimized by role and skills.' },
  { value: 'personal', label: '1-on-1s', icon: '🤝', description: 'Personalized 1-on-1 schedule. Algorithm pairs each person with their best matches.' },
  { value: 'normal', label: 'Open Networking', icon: '🌐', description: 'Free networking with AI personalization chatbot guiding each attendee.' },
];

const DURATIONS = [
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
];

export default function CreateEvent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', type: 'mixer', date: '', startTime: '18:00',
    durationMins: 60, roundMins: 10, groupSizeMin: 3, groupSizeMax: 6,
    description: '', location: '',
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const startH = parseInt((form.startTime || '18:00').split(':')[0], 10) || 18;
  const startM = parseInt((form.startTime || '18:00').split(':')[1], 10) || 0;
  const endTotal = startH * 60 + startM + Number(form.durationMins);
  const endTime = `${String(Math.floor(endTotal / 60) % 24).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`;

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.createEvent({
        ...form,
        durationMins: +form.durationMins, roundMins: +form.roundMins,
        groupSizeMin: +form.groupSizeMin, groupSizeMax: +form.groupSizeMax,
        hostId: user?.personId || null,
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  if (result) return (
    <div className="page-narrow" style={{ textAlign: 'center', paddingTop: 40 }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>🎉</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Event Created!</h2>
      <div className="card" style={{ padding: '24px 28px', marginBottom: 24, textAlign: 'left' }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{result.name}</div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
          <span>📅 {result.date}</span>
          <span>🕐 {result.startTime} – {result.endTime}</span>
          <span>⏱ {result.durationMins} min</span>
        </div>
        <div className="badge badge-accent">You are the host of this event</div>
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => navigate('/my-events')}>View My Events</button>
        <button className="btn btn-secondary" onClick={() => navigate('/checkin')}>Manage Check-in</button>
        <button className="btn btn-ghost" onClick={() => { setResult(null); setForm({ name: '', type: 'mixer', date: '', startTime: '18:00', durationMins: 60, roundMins: 10, groupSizeMin: 3, groupSizeMax: 6, description: '', location: '' }); }}>
          Create Another
        </button>
      </div>
    </div>
  );

  return (
    <div className="page-narrow">
      <div style={{ marginBottom: 28 }}>
        <h1 className="section-title">Create Event</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>You'll become the host and admin of this event</p>
      </div>

      <div className="card" style={{ padding: 32 }}>
        {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

        <form onSubmit={submit} className="stack">
          <div className="form-group">
            <label className="form-label">Event Name *</label>
            <input className="form-input" value={form.name} onChange={set('name')} required placeholder="Bay Area Founders Mixer" />
          </div>

          <div className="form-group">
            <label className="form-label">Event Mode</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EVENT_MODES.map(mode => (
                <label key={mode.value} style={{
                  display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 16px',
                  background: form.type === mode.value ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                  border: `1px solid ${form.type === mode.value ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  <input type="radio" name="type" value={mode.value} checked={form.type === mode.value} onChange={set('type')} style={{ marginTop: 3 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: form.type === mode.value ? 'var(--accent)' : 'var(--text-primary)' }}>
                      {mode.icon} {mode.label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>{mode.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input className="form-input" type="date" value={form.date} onChange={set('date')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input className="form-input" type="time" value={form.startTime} onChange={set('startTime')} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Duration</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {DURATIONS.map(d => (
                <button key={d.value} type="button" onClick={() => setForm(f => ({ ...f, durationMins: d.value }))}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                    background: form.durationMins === d.value ? 'var(--accent)' : 'var(--bg-secondary)',
                    color: form.durationMins === d.value ? '#fff' : 'var(--text-muted)',
                    border: `1px solid ${form.durationMins === d.value ? 'var(--accent)' : 'var(--border)'}`,
                    fontWeight: form.durationMins === d.value ? 600 : 400, transition: 'all 0.15s',
                  }}>
                  {d.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Ends at: {endTime}</div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Round Duration (min)</label>
              <input className="form-input" type="number" value={form.roundMins} onChange={set('roundMins')} min={5} max={30} />
            </div>
            <div className="form-group">
              <label className="form-label">Group Size (min / max)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" type="number" value={form.groupSizeMin} onChange={set('groupSizeMin')} placeholder="min" min={2} max={10} />
                <input className="form-input" type="number" value={form.groupSizeMax} onChange={set('groupSizeMax')} placeholder="max" min={2} max={20} />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Location (optional)</label>
            <input className="form-input" value={form.location} onChange={set('location')} placeholder="e.g. Galvanize SF, 44 Tehama St" />
          </div>

          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea className="form-input" value={form.description} onChange={set('description')} placeholder="What is this event about?" style={{ minHeight: 72 }} />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Creating…</> : '🚀 Create Event'}
          </button>
        </form>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

function formatDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}
function typeLabel(type) {
  return { mixer: 'Mixer', personal: '1-on-1s', normal: 'Networking' }[type] || type;
}

function EventCard({ event, isHosted, onManage, onView }) {
  return (
    <div className="card" style={{ padding: '20px 24px', borderLeft: `4px solid ${isHosted ? 'var(--accent)' : 'var(--success)'}`, transition: 'all 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
    >
      {/* Blasts */}
      {(event.blasts || []).length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {event.blasts.map((b, i) => (
            <span key={i} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100, background: 'var(--warning-soft)', color: 'var(--warning)', fontWeight: 600 }}>{b}</span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{event.name}</span>
            <span className="badge" style={{ background: isHosted ? 'var(--accent-soft)' : 'var(--success-soft)', color: isHosted ? 'var(--accent)' : 'var(--success)' }}>
              {isHosted ? '👑 Host' : '✓ Registered'}
            </span>
            <span className="badge badge-muted">{typeLabel(event.type)}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 6 }}>
            <span>📅 {formatDate(event.date)}</span>
            <span>🕐 {formatTime(event.startTime)} – {formatTime(event.endTime)}</span>
            <span>⏱ {event.durationMins} min</span>
            {event.location && <span>📍 {event.location}</span>}
            {event.attendeesCount > 0 && <span>👥 {event.attendeesCount} registered</span>}
            {event.hostName && !isHosted && <span>👤 {event.hostName}</span>}
          </div>
          {event.description && <p style={{ marginTop: 4, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{event.description}</p>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, alignItems: 'flex-end' }}>
          {isHosted ? (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => onManage(event)}>
                🚀 Run Matching & Send Emails
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => onView(event)}>
                View Room →
              </button>
            </>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={() => onView(event)}>
              View Room →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyEvents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hosted, setHosted] = useState([]);
  const [registered, setRegistered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [runningMatch, setRunningMatch] = useState({});
  const [matchStatus, setMatchStatus] = useState({});

  useEffect(() => {
    if (!user?.personId) return;
    api.myEvents(user.personId, user.personId)
      .then(data => {
        setHosted(data.hosted || []);
        setRegistered(data.registered || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.personId]);

  async function handleRunMatchAndEmail(event) {
    setRunningMatch(prev => ({ ...prev, [event.id]: true }));
    setMatchStatus(prev => ({ ...prev, [event.id]: 'Computing scores…' }));
    try {
      await api.computeScores(event.id);
      setMatchStatus(prev => ({ ...prev, [event.id]: 'Assigning groups…' }));
      await api.assignGroups(event.id);
      setMatchStatus(prev => ({ ...prev, [event.id]: 'Sending emails…' }));
      const emailResp = await api.sendSchedule({ eventId: event.id, scheduleType: event.type === 'mixer' ? 'groups' : 'schedule' });
      const sent = emailResp.sent || 0;
      setMatchStatus(prev => ({ ...prev, [event.id]: `✓ Done! ${sent} emails sent.` }));
    } catch (err) {
      setMatchStatus(prev => ({ ...prev, [event.id]: `Error: ${err.message}` }));
    } finally {
      setRunningMatch(prev => ({ ...prev, [event.id]: false }));
    }
  }

  const allEvents = [
    ...hosted.map(e => ({ ...e, _isHosted: true })),
    ...registered.map(e => ({ ...e, _isHosted: false })),
  ].sort((a, b) => (a.date + a.startTime) < (b.date + b.startTime) ? -1 : 1);

  const displayed = tab === 'hosted' ? hosted.map(e => ({ ...e, _isHosted: true }))
    : tab === 'registered' ? registered.map(e => ({ ...e, _isHosted: false }))
    : allEvents;

  return (
    <div className="page">
      <div className="row-between" style={{ marginBottom: 28 }}>
        <div>
          <h1 className="section-title">My Events</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Events you've created or registered for</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/events')}>Browse Events</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/create-event')}>+ Create Event</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 28 }}>
        <div className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>{hosted.length}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Events Hosted</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--success)' }}>{registered.length}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Events Registered</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--info)' }}>{allEvents.length}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total Events</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[['all', `All (${allEvents.length})`], ['hosted', `Hosted (${hosted.length})`], ['registered', `Registered (${registered.length})`]].map(([key, label]) => (
          <button key={key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div>
      ) : displayed.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📅</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>No events yet</div>
          <p style={{ fontSize: 14, marginBottom: 20 }}>Create an event or register for one to get started.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => navigate('/create-event')}>Create Event</button>
            <button className="btn btn-secondary" onClick={() => navigate('/events')}>Browse Events</button>
          </div>
        </div>
      ) : (
        <div className="stack-sm">
          {displayed.map(event => (
            <div key={event.id}>
              <EventCard
                event={event}
                isHosted={event._isHosted}
                onManage={(ev) => handleRunMatchAndEmail(ev)}
                onView={(ev) => navigate(`/event/${ev.id}/room`)}
              />
              {runningMatch[event.id] && (
                <div style={{ padding: '8px 24px', fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="spinner" style={{ width: 14, height: 14 }} />
                  {matchStatus[event.id]}
                </div>
              )}
              {matchStatus[event.id] && !runningMatch[event.id] && (
                <div style={{ padding: '8px 24px', fontSize: 13 }} className={matchStatus[event.id].startsWith('Error') ? 'alert alert-error' : 'alert alert-success'}>
                  {matchStatus[event.id]}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function Checkin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hostedEvents, setHostedEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [pending, setPending] = useState([]);
  const [checkedIn, setCheckedIn] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState('');
  const [status, setStatus] = useState('');
  const [dropdownSelected, setDropdownSelected] = useState('');

  useEffect(() => {
    if (!user?.personId) return;
    api.hostedEvents(user.personId)
      .then(setHostedEvents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.personId]);

  useEffect(() => {
    if (!selectedEventId) return;
    loadLists();
  }, [selectedEventId]);

  async function loadLists() {
    const [p, a] = await Promise.all([
      api.pendingCheckin(selectedEventId).catch(() => []),
      api.getAttendees(selectedEventId).catch(() => []),
    ]);
    setPending(p);
    setCheckedIn(a);
  }

  async function handleCheckin(personId, name) {
    setCheckingIn(personId);
    setStatus('');
    try {
      await api.checkin(selectedEventId, { personId });
      setStatus(`✓ ${name} checked in successfully!`);
      await loadLists();
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setCheckingIn('');
    }
  }

  if (!user) return (
    <div className="page" style={{ textAlign: 'center', padding: 60 }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Please sign in to manage check-ins.</p>
      <button className="btn btn-primary" onClick={() => navigate('/login')}>Sign In</button>
    </div>
  );

  const selectedEvent = hostedEvents.find(ev => ev.id === selectedEventId);
  const totalRegistrations = pending.length + checkedIn.length;

  return (
    <div className="page">
      <div className="row-between" style={{ marginBottom: 28 }}>
        <div>
          <h1 className="section-title">Check-In Manager</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            Manage check-ins for events you are hosting
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div>
      ) : hostedEvents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>No events to manage</div>
          <p style={{ fontSize: 14, marginBottom: 20 }}>Create an event first to manage check-ins.</p>
          <button className="btn btn-primary" onClick={() => navigate('/create-event')}>Create Event</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>
          {/* Event sidebar */}
          <div>
            <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Your Events
            </div>
            <div className="stack-sm">
              {hostedEvents.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => { setSelectedEventId(ev.id); setStatus(''); setDropdownSelected(''); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '14px 16px',
                    background: selectedEventId === ev.id ? 'var(--accent-soft)' : 'var(--bg-card)',
                    border: `1px solid ${selectedEventId === ev.id ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14, color: selectedEventId === ev.id ? 'var(--accent)' : 'var(--text-primary)', marginBottom: 4 }}>
                    {ev.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {formatDate(ev.date)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {formatTime(ev.startTime)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div>
            {!selectedEventId ? (
              <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>👈</div>
                <div style={{ fontWeight: 600 }}>Select an event to manage check-ins</div>
              </div>
            ) : (
              <div className="stack">
                {/* Event header */}
                {selectedEvent && (
                  <div style={{ marginBottom: 4 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{selectedEvent.name}</h2>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {formatDate(selectedEvent.date)} · {formatTime(selectedEvent.startTime)}
                      {selectedEvent.location ? ` · ${selectedEvent.location}` : ''}
                    </div>
                  </div>
                )}

                {/* Status alert */}
                {status && (
                  <div className={`alert ${status.startsWith('Error') ? 'alert-error' : 'alert-success'}`}>
                    {status}
                  </div>
                )}

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--success)', lineHeight: 1 }}>{checkedIn.length}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Checked In</div>
                  </div>
                  <div className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--warning)', lineHeight: 1 }}>{pending.length}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Pending</div>
                  </div>
                  <div className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{totalRegistrations}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Total Registered</div>
                  </div>
                </div>

                {/* Progress bar */}
                {totalRegistrations > 0 && (
                  <div className="card" style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Check-in Progress</span>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {checkedIn.length} / {totalRegistrations} ({Math.round((checkedIn.length / totalRegistrations) * 100)}%)
                      </span>
                    </div>
                    <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 100, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${(checkedIn.length / totalRegistrations) * 100}%`,
                        background: 'var(--success)',
                        borderRadius: 100,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                )}

                {/* Quick check-in via dropdown */}
                {pending.length > 0 && (
                  <div className="card" style={{ padding: 20, background: 'var(--accent-soft)', border: '1px solid var(--accent)' }}>
                    <div style={{ fontWeight: 700, marginBottom: 12, color: 'var(--accent)' }}>⚡ Quick Check-In</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <select
                        className="form-input"
                        style={{ flex: 1 }}
                        value={dropdownSelected}
                        onChange={e => setDropdownSelected(e.target.value)}
                      >
                        <option value="">Select person to check in…</option>
                        {pending.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <button
                        className="btn btn-primary"
                        disabled={!dropdownSelected || checkingIn === dropdownSelected}
                        onClick={() => {
                          const person = pending.find(p => p.id === dropdownSelected);
                          if (person) {
                            handleCheckin(person.id, person.name).then(() => setDropdownSelected(''));
                          }
                        }}
                      >
                        {checkingIn === dropdownSelected && dropdownSelected
                          ? <span className="spinner" style={{ width: 14, height: 14 }} />
                          : '✓ Check In'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Pending list */}
                {pending.length > 0 && (
                  <div className="card" style={{ padding: 20 }}>
                    <div style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      Pending Check-in
                      <span className="badge badge-muted">{pending.length}</span>
                    </div>
                    <div className="stack-sm">
                      {pending.map(p => (
                        <div
                          key={p.id}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 10,
                            border: '1px solid var(--border)',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                            {p.company && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{p.company}</div>}
                          </div>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleCheckin(p.id, p.name)}
                            disabled={checkingIn === p.id}
                          >
                            {checkingIn === p.id
                              ? <span className="spinner" style={{ width: 14, height: 14 }} />
                              : '✓ Check In'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Checked in list */}
                {checkedIn.length > 0 && (
                  <div className="card" style={{ padding: 20 }}>
                    <div style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      Checked In
                      <span className="badge badge-success">{checkedIn.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {checkedIn.map(p => (
                        <span key={p.id} className="badge badge-success" style={{ fontSize: 13, padding: '5px 12px' }}>
                          ✓ {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {pending.length === 0 && checkedIn.length === 0 && (
                  <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
                    <div style={{ fontWeight: 600 }}>No registrations yet</div>
                    <p style={{ fontSize: 13, marginTop: 8 }}>Attendees will appear here once they register.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

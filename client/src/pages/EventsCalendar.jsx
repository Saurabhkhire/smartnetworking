import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ChatMessageBody, ChatTypingIndicator } from '../components/ChatMessageBody.jsx';

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

function typeColor(type) {
  const map = { mixer: 'var(--accent)', personal: 'var(--success)', normal: 'var(--info)' };
  return map[type] || 'var(--text-muted)';
}

function typeLabel(type) {
  return { mixer: 'Mixer', personal: '1-on-1s', normal: 'Networking' }[type] || type;
}

export default function EventsCalendar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const today = new Date().toISOString().slice(0, 10);
  const twoWeeksFromNow = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  })();

  const [allEvents, setAllEvents] = useState([]);
  const [myRegistered, setMyRegistered] = useState([]);
  const [myHosted, setMyHosted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('all');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(twoWeeksFromNow);
  const [startTimeFilter, setStartTimeFilter] = useState('');
  const [endTimeFilter, setEndTimeFilter] = useState('');
  const [lumaModal, setLumaModal] = useState(false);
  const [lumaLocation, setLumaLocation] = useState('San Francisco, CA');
  const [lumaLoading, setLumaLoading] = useState(false);
  const [lumaEvents, setLumaEvents] = useState([]);
  const [top3, setTop3] = useState([]);
  const [aiChat, setAiChat] = useState([]);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    loadEvents();
  }, [startDate, endDate]);

  useEffect(() => {
    if (user?.personId) loadMyEvents();
  }, [user?.personId]);

  async function loadEvents() {
    setLoading(true);
    try {
      const events = await api.eventsByDateRange(startDate, endDate);
      setAllEvents(Array.isArray(events) ? events : []);
    } catch {
      try {
        const all = await api.listEvents();
        setAllEvents((Array.isArray(all) ? all : []).filter(e => e.date >= startDate && e.date <= endDate));
      } catch {
        setAllEvents([]);
      }
    }
    setLoading(false);
  }

  async function loadMyEvents() {
    try {
      const data = await api.myEvents(user.personId, user.personId);
      setMyHosted((data.hosted || []).map(e => e.id));
      setMyRegistered((data.registered || []).map(e => e.id));
    } catch {}
  }

  const filtered = allEvents.filter(e => {
    if (filterTab === 'registered') return myRegistered.includes(e.id);
    if (filterTab === 'hosted') return myHosted.includes(e.id);
    if (filterTab === 'discover') return !myRegistered.includes(e.id) && !myHosted.includes(e.id);
    return true;
  }).filter(e => {
    if (!startTimeFilter && !endTimeFilter) return true;
    const [eh, em] = (e.startTime || '00:00').split(':').map(Number);
    const eventMins = eh * 60 + em;
    if (startTimeFilter) {
      const [sh, sm] = startTimeFilter.split(':').map(Number);
      if (eventMins < sh * 60 + sm) return false;
    }
    if (endTimeFilter) {
      const [fh, fm] = endTimeFilter.split(':').map(Number);
      if (eventMins > fh * 60 + fm) return false;
    }
    return true;
  });

  async function handleLumaImport() {
    setLumaLoading(true);
    try {
      const result = await api.lumaImport({
        query: lumaLocation,
        location: lumaLocation,
        startDate,
        endDate,
        maxItems: 20,
      });
      setLumaEvents(result.events || []);
      // Reload events list to show newly imported events
      if ((result.events || []).length > 0) loadEvents();
    } catch (err) {
      alert('Luma import failed: ' + err.message);
    }
    setLumaLoading(false);
  }

  async function handleAskAI(e) {
    e.preventDefault();
    if (!aiQuestion.trim()) return;
    const q = aiQuestion;
    setAiQuestion('');
    setAiChat(h => [...h, { role: 'user', content: q }]);
    setAiLoading(true);
    try {
      const resp = await api.chatPersonalization({
        personId: user?.personId || 'guest',
        eventId: 'none',
        question: q,
        chatHistory: aiChat.slice(-6),
        mode: 'events',
      });
      setAiChat(h => [...h, { role: 'assistant', content: resp.answer }]);
    } catch {
      setAiChat(h => [...h, { role: 'assistant', content: 'Unable to get AI response right now.' }]);
    }
    setAiLoading(false);
  }

  const discoverCount = allEvents.filter(e => !myRegistered.includes(e.id) && !myHosted.includes(e.id)).length;

  return (
    <div className="page-wide">
      {/* Header */}
      <div className="row-between" style={{ marginBottom: 28 }}>
        <div>
          <h1 className="section-title">Discover Events</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            Find and register for networking events in your area
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setLumaModal(true)}>
            🌐 Import from Luma
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/create-event')}>+ Create Event</button>
        </div>
      </div>

      {/* Date range + time filter bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start Date</label>
            <input type="date" className="form-input" style={{ width: 160 }} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>End Date</label>
            <input type="date" className="form-input" style={{ width: 160 }} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div style={{ width: 1, height: 40, background: 'var(--border)', alignSelf: 'center' }} />
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Event Start After</label>
            <input type="time" className="form-input" style={{ width: 140 }} value={startTimeFilter} onChange={e => setStartTimeFilter(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Event Start Before</label>
            <input type="time" className="form-input" style={{ width: 140 }} value={endTimeFilter} onChange={e => setEndTimeFilter(e.target.value)} />
          </div>
          {(startTimeFilter || endTimeFilter) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setStartTimeFilter(''); setEndTimeFilter(''); }}>
              Clear Time Filter
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {[
          ['all', `All Events (${allEvents.length})`],
          ['registered', `My Registered (${myRegistered.length})`],
          ['hosted', `My Hosted (${myHosted.length})`],
          ['discover', `Discover (${discoverCount})`],
        ].map(([key, label]) => (
          <button key={key} className={`tab ${filterTab === key ? 'active' : ''}`} onClick={() => setFilterTab(key)}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
        {/* Events list */}
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>
              {filtered.length} event{filtered.length !== 1 ? 's' : ''}
              {startDate === endDate
                ? ` on ${formatDate(startDate)}`
                : ` from ${formatDate(startDate)} to ${formatDate(endDate)}`}
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📅</div>
              No events found for this period.
            </div>
          ) : (
            <div className="stack-sm">
              {filtered.map(event => {
                const isRegistered = myRegistered.includes(event.id);
                const isHosted = myHosted.includes(event.id);
                return (
                  <div
                    key={event.id}
                    className="card"
                    style={{ padding: '20px 24px', cursor: 'pointer', transition: 'all 0.15s', position: 'relative' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    onClick={() => {
                      if (isHosted || isRegistered) navigate(`/event/${event.id}/room`);
                      else navigate(`/event/${event.id}/join`);
                    }}
                  >
                    {/* Blasts */}
                    {(event.blasts || []).length > 0 && (
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                        {event.blasts.map((b, i) => (
                          <span key={i} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 100, background: 'var(--warning-soft)', color: 'var(--warning)', fontWeight: 600 }}>
                            {b}
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 17 }}>{event.name}</span>
                          <span className="badge" style={{ fontSize: 11, background: `${typeColor(event.type)}20`, color: typeColor(event.type) }}>
                            {typeLabel(event.type)}
                          </span>
                          {isHosted && <span className="badge badge-accent">👑 Host</span>}
                          {isRegistered && !isHosted && <span className="badge badge-success">✓ Registered</span>}
                        </div>

                        <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
                          <span>📅 {formatDate(event.date)}</span>
                          <span>🕐 {formatTime(event.startTime)} – {formatTime(event.endTime)}</span>
                          {event.location && <span>📍 {event.location}</span>}
                          {event.hostName && <span>👤 Hosted by {event.hostName}</span>}
                        </div>

                        <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: event.description ? 10 : 0 }}>
                          {event.durationMins && <span>⏱ {event.durationMins} min</span>}
                          {event.attendeesCount > 0 && <span>👥 {event.attendeesCount} registered</span>}
                        </div>

                        {event.description && (
                          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 6 }}>
                            {event.description}
                          </p>
                        )}
                        {(event.blasts || []).length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                            {(event.blasts || []).map((b, i) => (
                              <span key={i} className="badge" style={{ fontSize: 11, background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600 }}>
                                {b}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, alignItems: 'flex-end' }}>
                        {isHosted ? (
                          <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); navigate('/my-events'); }}>
                            Manage →
                          </button>
                        ) : isRegistered ? (
                          <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); navigate(`/event/${event.id}/room`); }}>
                            Enter Room →
                          </button>
                        ) : (
                          <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); navigate(`/event/${event.id}/join`); }}>
                            Register →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Sidebar */}
        <div>
          <div style={{
            position: 'sticky', top: 80,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 20, overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(124,111,255,0.12)',
          }}>
            {/* Header bar */}
            <div style={{
              padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
              background: 'linear-gradient(135deg, rgba(124,111,255,0.15) 0%, rgba(59,130,246,0.08) 100%)',
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                background: 'linear-gradient(145deg, var(--accent), var(--info))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, color: '#fff', fontSize: 13,
                boxShadow: '0 4px 16px rgba(124,111,255,0.35)',
              }}>AI</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em' }}>VentureGraph AI</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>
                  Deep event discovery · date &amp; time aware
                </div>
              </div>
              {aiChat.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setAiChat([]); setAiQuestion(''); }}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer' }}
                  title="Clear conversation"
                >Clear</button>
              )}
            </div>

            {/* Suggested chips — hidden once chat starts */}
            {aiChat.length === 0 && (
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                  Try asking
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    'Top events I should attend',
                    'Best event April 1–5',
                    'Events on April 3 after 6pm',
                    'Events after hours this week',
                    'Events with most founders',
                    'Events matching my skills',
                    'AI & ML events',
                    'Best hackathon for engineers',
                    'Overlapping events — help choose',
                    'Events from [company name]',
                  ].map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setAiQuestion(q)}
                      style={{
                        padding: '5px 11px', borderRadius: 20, fontSize: 11.5, fontWeight: 500,
                        cursor: 'pointer', background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)', color: 'var(--text-secondary)',
                        transition: 'all 0.12s', whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-soft)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                    >{q}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat thread */}
            {aiChat.length > 0 && (
              <div style={{ maxHeight: 380, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {aiChat.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    {msg.role === 'assistant' && (
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        background: 'linear-gradient(145deg, var(--accent), var(--info))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 900, color: '#fff', marginTop: 2,
                      }}>AI</div>
                    )}
                    <div style={{
                      maxWidth: '87%', padding: '10px 14px',
                      borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                      background: msg.role === 'user'
                        ? 'linear-gradient(135deg, var(--accent), #6a5cf0)'
                        : 'var(--bg-secondary)',
                      color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                      border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                      boxShadow: msg.role === 'assistant' ? 'var(--shadow-sm)' : 'none',
                    }}>
                      <ChatMessageBody content={msg.content} isUser={msg.role === 'user'} />
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(145deg, var(--accent), var(--info))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#fff', flexShrink: 0 }}>AI</div>
                    <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: '4px 16px 16px 16px', border: '1px solid var(--border)' }}>
                      <ChatTypingIndicator label="Scanning events" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Input */}
            <div style={{ padding: '12px 14px', borderTop: aiChat.length > 0 ? '1px solid var(--border)' : 'none' }}>
              <form onSubmit={handleAskAI} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <textarea
                  className="form-input"
                  style={{ fontSize: 13, borderRadius: 12, flex: 1, minHeight: 44, maxHeight: 100, resize: 'none', lineHeight: 1.5, padding: '10px 14px' }}
                  value={aiQuestion}
                  onChange={e => setAiQuestion(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAskAI(e); } }}
                  placeholder="Ask anything — dates, times, roles, companies…"
                  disabled={aiLoading}
                  rows={1}
                />
                <button
                  type="submit"
                  disabled={aiLoading || !aiQuestion.trim()}
                  style={{
                    width: 44, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: aiQuestion.trim() ? 'linear-gradient(135deg, var(--accent), #6a5cf0)' : 'var(--bg-card-hover)',
                    color: aiQuestion.trim() ? '#fff' : 'var(--text-muted)',
                    fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 0.15s',
                    boxShadow: aiQuestion.trim() ? '0 2px 12px rgba(124,111,255,0.3)' : 'none',
                  }}
                >↑</button>
              </form>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
                Enter to send · Shift+Enter for new line
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Luma Import Modal */}
      {lumaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 24 }}>
          <div className="card" style={{ width: '100%', maxWidth: 480, padding: 28 }}>
            <div className="row-between" style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Import from Luma</h2>
              <button
                onClick={() => { setLumaModal(false); setLumaEvents([]); }}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ×
              </button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Pull events from Luma for a specific time period and location. Requires APIFY_TOKEN configured on the server.
            </p>
            <div className="stack-sm" style={{ marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>LOCATION</label>
                <input className="form-input" value={lumaLocation} onChange={e => setLumaLocation(e.target.value)} placeholder="San Francisco, CA" />
              </div>
              <div className="grid-2" style={{ gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>FROM DATE</label>
                  <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>TO DATE</label>
                  <input type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleLumaImport} disabled={lumaLoading}>
              {lumaLoading
                ? <><span className="spinner" style={{ width: 16, height: 16, marginRight: 8 }} />Fetching from Luma…</>
                : '🌐 Import Events from Luma'}
            </button>
            {lumaEvents.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>
                    {lumaEvents.length} event{lumaEvents.length !== 1 ? 's' : ''} imported
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    · {lumaEvents.reduce((s, e) => s + (e.attendees || 0), 0)} attendees saved
                  </span>
                </div>
                <div className="stack-sm" style={{ maxHeight: 340, overflowY: 'auto' }}>
                  {lumaEvents.map(ev => (
                    <div key={ev.id} className="card" style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{ev.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                        {formatDate(ev.date)} · {formatTime(ev.startTime)}
                        {ev.endTime && ` – ${formatTime(ev.endTime)}`}
                        {ev.location && ` · ${ev.location}`}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* Attendees badge */}
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                          background: 'var(--bg-secondary)', color: 'var(--text-muted)',
                        }}>
                          👥 {ev.attendees || 0} attendees
                        </span>
                        {/* SQLite badge */}
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                          background: ev.savedToSqlite ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)',
                          color: ev.savedToSqlite ? '#16a34a' : '#dc2626',
                        }}>
                          {ev.savedToSqlite ? '✓' : '✗'} SQLite
                        </span>
                        {/* Neo4j badge */}
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                          background: ev.savedToNeo4j ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)',
                          color: ev.savedToNeo4j ? '#16a34a' : '#dc2626',
                        }}>
                          {ev.savedToNeo4j ? '✓' : '✗'} Neo4j
                        </span>
                        {/* Luma link */}
                        {ev.lumaUrl && (
                          <a href={ev.lumaUrl} target="_blank" rel="noopener noreferrer" style={{
                            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                            background: 'rgba(99,102,241,0.12)', color: 'var(--accent)',
                            textDecoration: 'none',
                          }}>
                            ↗ Luma
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

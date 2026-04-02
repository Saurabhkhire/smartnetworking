import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function fmtMins(totalMins) {
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function RoleBadge({ role }) {
  const colors = {
    Founder: ['var(--tag-founder)', 'var(--accent)'],
    'Co-Founder': ['var(--tag-founder)', 'var(--accent)'],
    Investor: ['var(--tag-investor)', 'var(--success)'],
    'Angel Investor': ['var(--tag-investor)', 'var(--success)'],
    'VC Partner': ['var(--tag-investor)', 'var(--success)'],
    Engineer: ['var(--tag-engineer)', 'var(--info)'],
  };
  const [bg, color] = colors[role] || ['var(--bg-card-hover)', 'var(--text-muted)'];
  return (
    <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 12, fontWeight: 600, background: bg, color }}>
      {role}
    </span>
  );
}

function AttendeeCard({ person, onChatClick }) {
  return (
    <div
      className="card"
      style={{ padding: '16px 18px', transition: 'all 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(124,111,255,0.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--info))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
          {(person.name || '?')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {person.companyName}{person.companyStage ? ` · ${person.companyStage}` : ''}
          </div>
          {person.headline && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.35 }}>{person.headline}</div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {(person.roles || []).slice(0, 2).map(r => <RoleBadge key={r} role={r} />)}
      </div>
      {person.summary && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10 }}>
          {person.summary.slice(0, 90)}…
        </p>
      )}
      <button className="btn btn-ghost btn-sm" onClick={() => onChatClick(person)} style={{ width: '100%', justifyContent: 'center' }}>
        💬 Get Icebreaker
      </button>
    </div>
  );
}

export default function EventRoom() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('attendees');

  // Host + registration state
  const [isHost, setIsHost] = useState(false);
  const [timesheets, setTimesheets] = useState(null);
  const [rounds, setRounds] = useState(null);
  const [runningMatch, setRunningMatch] = useState(false);
  const [matchStatus, setMatchStatus] = useState('');
  const [registration, setRegistration] = useState(null);
  const [checkedIn, setCheckedIn] = useState(false);

  // Host timesheets view
  const [hostTimesheetPerson, setHostTimesheetPerson] = useState(null);

  // Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatTarget, setChatTarget] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [ev, att] = await Promise.all([api.getEvent(id), api.getAttendees(id)]);
        setEvent(ev);
        setAttendees(att);

        const userIsHost = !!(ev.hostId && user?.personId && ev.hostId === user.personId);
        setIsHost(userIsHost);

        if (user?.personId) {
          // Check registration
          try {
            const reg = await api.getEventRegistration(ev.id, user.personId);
            setRegistration(reg);
          } catch {}

          const isCI = att.some(a => a.id === user.personId);
          setCheckedIn(isCI);

          // Load timesheets for host AND registered/checked-in users
          if (userIsHost || isCI) {
            try {
              const ts = await api.getTimesheets(ev.id);
              setTimesheets(ts);
              if (ts.rounds && ts.rounds.length > 0) {
                setRounds(ts.rounds);
              }
            } catch {}
          }

          // Load my personal schedule
          try {
            const sched = await api.mySchedule(id, user.personId);
            setSchedule(Array.isArray(sched) ? sched : (sched?.slots || sched?.schedule || []));
          } catch {}
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [id, user?.personId]);

  async function handleRunMatch() {
    setRunningMatch(true);
    setMatchStatus('Computing scores…');
    try {
      await api.computeScores(event.id);
      setMatchStatus('Assigning groups…');
      const assignResult = await api.assignGroups(event.id);
      const newRounds = assignResult.groups || [];
      setRounds(newRounds);
      setMatchStatus('Sending emails…');
      const emailResp = await api.sendSchedule({
        eventId: event.id,
        scheduleType: event.type === 'mixer' ? 'groups' : 'schedule',
      });
      const sent = emailResp.sent || 0;
      setMatchStatus(`✓ Done! ${sent} emails sent.`);
      // Reload timesheets
      try {
        const ts = await api.getTimesheets(event.id);
        setTimesheets(ts);
        if (ts.rounds && ts.rounds.length > 0) setRounds(ts.rounds);
      } catch {}
      // Reload my schedule
      if (user?.personId) {
        try {
          const sched = await api.mySchedule(event.id, user.personId);
          setSchedule(Array.isArray(sched) ? sched : (sched?.slots || sched?.schedule || []));
        } catch {}
      }
    } catch (err) {
      setMatchStatus(`Error: ${err.message}`);
    }
    setRunningMatch(false);
  }

  async function sendChat(question) {
    if (!question.trim()) return;
    const q = question;
    setChatInput('');
    setChatHistory(h => [...h, { role: 'user', content: q }]);
    setChatLoading(true);
    try {
      const resp = await api.chatPersonalization({
        personId: user?.personId || 'guest',
        eventId: id,
        question: chatTarget ? `About ${chatTarget.name} (${(chatTarget.roles || []).join(', ')} at ${chatTarget.companyName || '?'}): ${q}` : q,
        chatHistory: chatHistory.slice(-6),
        mode: 'event',
      });
      setChatHistory(h => [...h, { role: 'assistant', content: resp.answer }]);
    } catch {
      setChatHistory(h => [...h, { role: 'assistant', content: 'Unable to get response. Please try again.' }]);
    }
    setChatLoading(false);
  }

  function openIcebreaker(person) {
    setChatTarget(person);
    setChatHistory([{
      role: 'assistant',
      content: `Hi — I’m here to help you connect with **${person.name}** (${(person.roles || []).join(', ') || 'attendee'} at ${person.companyName || 'their company'}).\n\nAsk for icebreakers, why you two should talk, or how to approach them. I’ll always explain **why** my suggestions fit what we know from the guest list.`,
    }]);
    setChatOpen(true);
    setChatInput(`Give me 3 icebreakers to start a conversation with ${person.name}`);
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
      <span className="spinner" style={{ width: 28, height: 28 }} />
      <div style={{ marginTop: 12 }}>Loading event room…</div>
    </div>
  );

  if (!event) return (
    <div className="page" style={{ textAlign: 'center', padding: 80 }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
      <h2>Event not found</h2>
      <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/events')}>Back to Events</button>
    </div>
  );

  const scheduleSlots = Array.isArray(schedule) ? schedule : [];
  const activeRounds = rounds || timesheets?.rounds || [];
  const allTimesheets = timesheets?.timesheets || [];
  // My personal group schedule from timesheets (better than 1-on-1 for mixer events)
  const myTimesheetRow = allTimesheets.find(ts => ts.personId === user?.personId);
  const myGroupSchedule = myTimesheetRow?.scheduleRows || [];
  const hasSchedule = scheduleSlots.length > 0 || myGroupSchedule.length > 0;
  const showScheduleTab = checkedIn || !!registration || hasSchedule;
  const showGroupsTab = isHost || activeRounds.length > 0;

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <button
          onClick={() => navigate('/my-events')}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer', marginBottom: 12, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          ← My Events
        </button>

        <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-secondary) 100%)', borderRadius: 16, border: '1px solid var(--border)', marginBottom: 20 }}>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>{event.name}</h1>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span>📅 {formatDate(event.date)}</span>
                <span>🕐 {formatTime(event.startTime)} – {formatTime(event.endTime)}</span>
                <span>👥 {attendees.length} checked in</span>
                {event.location && <span>📍 {event.location}</span>}
                {event.hostName && <span>👤 {event.hostName}</span>}
                <span className="badge badge-muted" style={{ alignSelf: 'center' }}>{event.type}</span>
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => setChatOpen(true)}>
              🤖 AI Assistant
            </button>
          </div>

          {event.description && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 8 }}>{event.description}</p>
          )}

          {(event.blasts || []).length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {event.blasts.map((b, i) => (
                <span key={i} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 100, background: 'var(--warning-soft)', color: 'var(--warning)', fontWeight: 600 }}>{b}</span>
              ))}
            </div>
          )}
        </div>

        {/* Status badges */}
        {user?.personId && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {isHost && <span className="badge badge-accent" style={{ padding: '6px 14px', fontSize: 13 }}>👑 You are the host</span>}
            {checkedIn && !isHost && <span className="badge badge-success" style={{ padding: '6px 14px', fontSize: 13 }}>✓ Checked in</span>}
            {registration && !checkedIn && !isHost && <span className="badge badge-muted" style={{ padding: '6px 14px', fontSize: 13 }}>📋 Registered — not yet checked in</span>}
          </div>
        )}

        {/* Host controls */}
        {isHost && (
          <div style={{ padding: '16px 20px', background: 'var(--accent-soft)', borderRadius: 12, border: '1px solid var(--accent)' }}>
            <div style={{ fontWeight: 700, marginBottom: 10, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>👑</span> Host Controls
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={handleRunMatch} disabled={runningMatch}>
                {runningMatch
                  ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 8 }} />{matchStatus}</>
                  : '🚀 Run Matching & Send Emails'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/checkin')}>
                📋 Manage Check-in
              </button>
              {matchStatus && !runningMatch && (
                <span style={{ fontSize: 13, color: matchStatus.startsWith('Error') ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                  {matchStatus}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        <button className={`tab ${tab === 'attendees' ? 'active' : ''}`} onClick={() => setTab('attendees')}>
          Attendees ({attendees.length})
        </button>
        {showScheduleTab && (
          <button className={`tab ${tab === 'schedule' ? 'active' : ''}`} onClick={() => setTab('schedule')}>
            My Schedule {hasSchedule ? `(${scheduleSlots.length})` : ''}
          </button>
        )}
        {showGroupsTab && (
          <button className={`tab ${tab === 'groups' ? 'active' : ''}`} onClick={() => setTab('groups')}>
            Breakout Groups {activeRounds.length > 0 ? `(${activeRounds.length} rounds)` : ''}
          </button>
        )}
        {isHost && allTimesheets.length > 0 && (
          <button className={`tab ${tab === 'timesheets' ? 'active' : ''}`} onClick={() => setTab('timesheets')}>
            All Schedules ({allTimesheets.length})
          </button>
        )}
        <button className={`tab ${tab === 'icebreakers' ? 'active' : ''}`} onClick={() => setTab('icebreakers')}>
          Icebreakers
        </button>
      </div>

      {/* Attendees tab */}
      {tab === 'attendees' && (
        <div>
          <div style={{ marginBottom: 16, fontSize: 14, color: 'var(--text-muted)' }}>
            {attendees.length} {attendees.length === 1 ? 'person' : 'people'} checked in to this event
          </div>
          {attendees.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
              No one has checked in yet.
            </div>
          ) : (
            <div className="grid-3">
              {attendees.map(a => (
                <AttendeeCard key={a.id} person={a} onChatClick={openIcebreaker} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Schedule tab */}
      {tab === 'schedule' && showScheduleTab && (
        <div className="stack">
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Your personalized networking schedule for this event
          </p>
          {!checkedIn && !hasSchedule && (
            <div className="card" style={{ padding: '16px 20px', background: 'var(--warning-soft)', border: '1px solid var(--warning)' }}>
              <div style={{ fontWeight: 600, color: 'var(--warning)', marginBottom: 4 }}>Not checked in yet</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Check in at the event to see your personalized schedule.</div>
            </div>
          )}

          {/* Group schedule (mixer events) — from timesheets */}
          {myGroupSchedule.length > 0 && (
            <div className="stack-sm">
              {myGroupSchedule.map((row, i) => (
                <div key={i} className="card" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent), var(--info))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                      R{row.round}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700 }}>Round {row.round} — Group {row.groupNumber}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 10px', borderRadius: 6 }}>
                          🕐 {row.timeLabel}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Meeting with:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {(row.withNames || []).map((name, ni) => {
                          const person = attendees.find(a => a.name === name);
                          return (
                            <div key={ni} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                                {name[0]}
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{name}</span>
                              {person && (
                                <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => openIcebreaker(person)}>💬</button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 1-on-1 schedule (personal events) */}
          {myGroupSchedule.length === 0 && !hasSchedule && (
            <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Schedule not yet generated</div>
              <p style={{ fontSize: 13 }}>The host needs to run the matching algorithm first.</p>
            </div>
          )}
          {myGroupSchedule.length === 0 && scheduleSlots.length > 0 && (
            <div className="stack-sm">
              {scheduleSlots.map((slot, i) => {
                const match = slot.match || attendees.find(a => a.id === slot.matchId);
                return (
                  <div key={i} className="card" style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--info))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700 }}>{match?.name || 'TBD'}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                          {(match?.roles || []).join(', ')}
                          {match?.companyName ? ` · ${match.companyName}` : ''}
                        </div>
                        {slot.timeStart && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            🕐 {formatTime(slot.timeStart || slot.startTime)}
                            {(slot.timeEnd || slot.endTime) ? ` – ${formatTime(slot.timeEnd || slot.endTime)}` : ''}
                          </div>
                        )}
                      </div>
                      {(slot.totalScore > 0) && (
                        <span className="badge badge-accent">Score {slot.totalScore}</span>
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          if (match) {
                            setChatTarget(match);
                            setChatInput(`Give me a conversation starter for ${match.name}`);
                            setChatOpen(true);
                          }
                        }}
                      >
                        💬 Prep
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Breakout Groups tab */}
      {tab === 'groups' && showGroupsTab && (
        <div className="stack">
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            {isHost ? 'Breakout group assignments for all attendees.' : 'Your group assignments across all rounds.'}
          </p>

          {activeRounds.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              {isHost ? (
                <>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>No groups assigned yet</div>
                  <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>
                    Run the matching algorithm to assign breakout groups
                  </p>
                  <button className="btn btn-primary" onClick={handleRunMatch} disabled={runningMatch}>
                    {runningMatch
                      ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 8 }} />{matchStatus}</>
                      : '🚀 Run Algorithm & Assign Groups'}
                  </button>
                </>
              ) : (
                <div style={{ color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
                  Groups not yet assigned — the host will run the algorithm soon.
                </div>
              )}
            </div>
          ) : (
            activeRounds.map((roundData) => {
              const [sh, sm] = (event.startTime || '00:00').split(':').map(Number);
              const roundStartMins = sh * 60 + sm + (roundData.round - 1) * (event.roundMins || 10);
              const roundEndMins = roundStartMins + (event.roundMins || 10);
              // For non-hosts, highlight their own groups
              const myGroupIndex = !isHost ? (roundData.groups || []).findIndex(g => (g.members || []).includes(user?.personId)) : -1;

              return (
                <div key={roundData.round} style={{ marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{ padding: '6px 18px', borderRadius: 100, background: 'linear-gradient(135deg, var(--accent), var(--info))', color: '#fff', fontWeight: 700, fontSize: 14 }}>
                      Round {roundData.round}
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      🕐 {formatTime(fmtMins(roundStartMins))} – {formatTime(fmtMins(roundEndMins))}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '3px 10px', borderRadius: 6 }}>
                      {event.roundMins || 10} min
                    </span>
                  </div>
                  <div className="grid-3">
                    {(roundData.groups || []).map((group, gi) => {
                      const isMyGroup = gi === myGroupIndex;
                      return (
                        <div key={gi} className="card" style={{ padding: 16, border: isMyGroup ? '2px solid var(--accent)' : '1px solid var(--border)', background: isMyGroup ? 'var(--accent-soft)' : undefined }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: isMyGroup ? 'var(--accent)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Group {gi + 1} {isMyGroup ? '• You' : ''}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(group.members || []).length} people</span>
                          </div>
                          <div className="stack-sm">
                            {(group.members || []).map(memberId => {
                              const person = attendees.find(a => a.id === memberId);
                              const isMe = memberId === user?.personId;
                              return (
                                <div
                                  key={memberId}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '7px 10px', borderRadius: 8,
                                    background: isMe ? 'var(--accent)' : 'var(--bg-secondary)',
                                    border: isMe ? 'none' : '1px solid var(--border)',
                                  }}
                                >
                                  <div style={{
                                    width: 26, height: 26, borderRadius: '50%',
                                    background: isMe ? 'rgba(255,255,255,0.25)' : 'var(--bg-card)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 11, fontWeight: 700,
                                    color: isMe ? '#fff' : 'var(--text-muted)',
                                    flexShrink: 0,
                                  }}>
                                    {(person?.name || memberId || '?')[0].toUpperCase()}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isMe ? '#fff' : 'var(--text-primary)' }}>
                                      {person?.name || memberId.slice(0, 8)} {isMe && '(You)'}
                                    </div>
                                    <div style={{ fontSize: 11, color: isMe ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {(person?.roles || []).slice(0, 1).join(', ')}
                                      {person?.companyName ? ` · ${person.companyName}` : ''}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Host All-Schedules tab */}
      {tab === 'timesheets' && isHost && (
        <div className="stack">
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Every attendee's personalized schedule — {allTimesheets.length} schedules generated
          </p>

          {/* Person selector */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
            <select
              className="form-input"
              style={{ maxWidth: 300 }}
              value={hostTimesheetPerson || ''}
              onChange={e => setHostTimesheetPerson(e.target.value || null)}
            >
              <option value="">View all schedules…</option>
              {allTimesheets.map(ts => (
                <option key={ts.personId} value={ts.personId}>{ts.personName}</option>
              ))}
            </select>
            {hostTimesheetPerson && (
              <button className="btn btn-ghost btn-sm" onClick={() => setHostTimesheetPerson(null)}>Show All</button>
            )}
          </div>

          <div className="stack-sm">
            {allTimesheets
              .filter(ts => !hostTimesheetPerson || ts.personId === hostTimesheetPerson)
              .map(ts => (
                <div key={ts.personId} className="card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--info))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                        {(ts.personName || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{ts.personName}</div>
                        {ts.personalization?.topMatchName && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Top match: {ts.personalization.topMatchName} (score {ts.personalization.topMatchScore})
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {ts.scheduleRows && ts.scheduleRows.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--border)' }}>
                            <th style={{ textAlign: 'left', padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Round</th>
                            <th style={{ textAlign: 'left', padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time</th>
                            <th style={{ textAlign: 'left', padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Group</th>
                            <th style={{ textAlign: 'left', padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Meeting With</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ts.scheduleRows.map((row, ri) => (
                            <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 600 }}>R{row.round}</td>
                              <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{row.timeLabel}</td>
                              <td style={{ padding: '8px 12px' }}><span className="badge badge-muted">Group {row.groupNumber}</span></td>
                              <td style={{ padding: '8px 12px' }}>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                  {(row.withNames || []).map((n, ni) => (
                                    <span key={ni} style={{ fontSize: 12, padding: '2px 8px', borderRadius: 6, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>{n}</span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No schedule rows available.</div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Icebreakers tab */}
      {tab === 'icebreakers' && (
        <div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
            Click on any attendee to get an AI-generated icebreaker.
          </p>
          <div className="grid-3">
            {attendees.slice(0, 18).map(a => (
              <div
                key={a.id}
                className="card"
                style={{ padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; }}
                onClick={() => openIcebreaker(a)}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--info))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                    {(a.name || '?')[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(a.roles || []).slice(0, 1).join(', ')}{a.companyName ? ` · ${a.companyName}` : ''}</div>
                  </div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>✨ Get icebreaker →</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating AI Chatbot */}
      {chatOpen && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, width: 432, maxHeight: '78vh',
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 22,
          boxShadow: '0 24px 64px rgba(0,0,0,0.45), var(--shadow-accent)', display: 'flex', flexDirection: 'column', zIndex: 1000,
          overflow: 'hidden',
        }}>
          {/* Chat header */}
          <div style={{
            padding: '14px 18px 14px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'linear-gradient(125deg, var(--accent-soft) 0%, transparent 55%)',
            borderRadius: '22px 22px 0 0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: 'linear-gradient(145deg, var(--accent), var(--info))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, boxShadow: '0 4px 14px rgba(124,111,255,0.35)',
              }}>✦</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em' }}>
                  {chatTarget ? chatTarget.name : 'VentureGraph AI'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontWeight: 500 }}>
                  {chatTarget
                    ? `${(chatTarget.roles || []).slice(0, 2).join(' · ')}${chatTarget.companyName ? ` · ${chatTarget.companyName}` : ''}`
                    : `${event.name} · contextual networking help`}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setChatOpen(false); setChatTarget(null); setChatHistory([]); }}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}
              aria-label="Close chat"
            >
              ×
            </button>
          </div>

          {/* Suggested questions */}
          {chatHistory.length <= 1 && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', maxHeight: 180, overflowY: 'auto' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                {chatTarget ? `Questions about ${chatTarget.name}` : 'Explore this event'}
              </div>
              {(chatTarget ? [
                `Give me 3 icebreakers for ${chatTarget.name}`,
                `Why should I meet ${chatTarget.name}?`,
                `What do ${chatTarget.name} and I have in common?`,
                `How should I approach ${chatTarget.name}?`,
              ] : [
                'Who are the top 5 people I should meet and why?',
                'Give me icebreakers for every top person I should meet',
                'Who are the investors at this event?',
                'Who are the founders I should connect with?',
                'Who has the most relevant skills for me?',
                'What\'s the best networking strategy for this event?',
                'Which attendees are from AI or ML companies?',
              ]).map(q => (
                <button key={q} type="button" onClick={() => sendChat(q)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', marginBottom: 4, fontSize: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.1s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 10px', background: 'var(--bg-secondary)' }}>
            {chatHistory.map((msg, i) => (
              <div key={i} style={{ marginBottom: 14, display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}>
                {msg.role === 'assistant' && (
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: 'linear-gradient(145deg, var(--accent), var(--info))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 800,
                  }}>AI</div>
                )}
                <div style={{
                  maxWidth: msg.role === 'user' ? '88%' : 'calc(100% - 36px)',
                  padding: msg.role === 'user' ? '11px 16px' : '12px 16px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '6px 18px 18px 18px',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, var(--accent), #6a5cf0)' : 'var(--bg-card)',
                  color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                  border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                  boxShadow: msg.role === 'user' ? '0 4px 16px rgba(124,111,255,0.25)' : 'var(--shadow-sm)',
                }}>
                  <ChatMessageBody content={msg.content} isUser={msg.role === 'user'} />
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ paddingLeft: 36, marginBottom: 8 }}>
                <ChatTypingIndicator />
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding: '12px 14px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <form onSubmit={e => { e.preventDefault(); sendChat(chatInput); }} style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
              <input
                className="form-input"
                style={{ fontSize: 14, borderRadius: 14, flex: 1 }}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask anything — I’ll explain why it matters…"
                autoFocus
                disabled={chatLoading}
              />
              <button type="submit" className="btn btn-primary" style={{ borderRadius: 14, minWidth: 48, padding: '0 14px' }} disabled={chatLoading || !chatInput.trim()}>Send</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ChatMessageBody, ChatTypingIndicator } from '../components/ChatMessageBody.jsx';

const SKILLS = [
  { id: 'sk_python', name: 'Python' }, { id: 'sk_js', name: 'JavaScript' },
  { id: 'sk_react', name: 'React / Frontend' }, { id: 'sk_node', name: 'Node.js / Backend' },
  { id: 'sk_cloud', name: 'Cloud / AWS / GCP' }, { id: 'sk_ml', name: 'Machine Learning' },
  { id: 'sk_nlp', name: 'NLP / LLMs' }, { id: 'sk_fundraise', name: 'Fundraising' },
  { id: 'sk_gtm', name: 'Go-to-market' }, { id: 'sk_salesb2b', name: 'Sales B2B' },
  { id: 'sk_uxdesign', name: 'UX / UI Design' }, { id: 'sk_prodstrat', name: 'Product Strategy' },
  { id: 'sk_growth', name: 'Growth Hacking' }, { id: 'sk_finance', name: 'Finance / CFO' },
  { id: 'sk_recruit', name: 'Recruiting' }, { id: 'sk_dataanlyt', name: 'Data Analysis' },
  { id: 'sk_bizdev', name: 'Business Development' },
];

const ROLES = ['Founder', 'Co-Founder', 'Investor', 'Angel Investor', 'VC Partner', 'Engineer', 'Product Manager', 'Designer', 'Marketing', 'Growth', 'Sales', 'Recruiter', 'Analyst', 'Advisor', 'Executive'];

const PURPOSES = ['Fundraising', 'Hiring', 'Finding Co-founder', 'Partnerships', 'Learning', 'Customer Discovery', 'General Networking'];

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function EventJoin() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // AI chatbot
  const [chatOpen, setChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  async function handleChatSubmit(e) {
    e.preventDefault();
    const q = chatQuestion.trim();
    if (!q) return;
    setChatQuestion('');
    setChatHistory(h => [...h, { role: 'user', content: q }]);
    setChatLoading(true);
    try {
      const resp = await api.chatPersonalization({
        personId: user?.personId || 'guest',
        eventId: id,
        question: q,
        chatHistory: chatHistory.slice(-6),
        mode: 'event',
      });
      setChatHistory(h => [...h, { role: 'assistant', content: resp.answer }]);
    } catch {
      setChatHistory(h => [...h, { role: 'assistant', content: 'Unable to get AI response right now.' }]);
    }
    setChatLoading(false);
  }

  // Attendees list (for display)
  const [attendees, setAttendees] = useState([]);

  // Form fields
  const [whoYouAre, setWhoYouAre] = useState('');
  const [whoYouSeek, setWhoYouSeek] = useState('');
  const [skillsYouSeek, setSkillsYouSeek] = useState([]);
  const [purpose, setPurpose] = useState('General Networking');
  const [meetSamePeople, setMeetSamePeople] = useState(false);
  const [seeksRoles, setSeeksRoles] = useState([]);
  const [blocklistText, setBlocklistText] = useState('');

  // Pre-fill from profile
  useEffect(() => {
    async function load() {
      try {
        const [ev, att] = await Promise.all([api.getEvent(id), api.getAttendees(id).catch(() => [])]);
        setEvent(ev);
        setAttendees(Array.isArray(att) ? att : []);
        if (user?.personId) {
          try {
            const me = await api.getMe(user.personId);
            if (me.seeksRoles?.length) setSeeksRoles(me.seeksRoles);
            if (me.purpose) setPurpose(me.purpose);
          } catch {}
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [id, user?.personId]);

  function toggleSkill(skillId) {
    setSkillsYouSeek(prev => prev.includes(skillId) ? prev.filter(s => s !== skillId) : [...prev, skillId]);
  }

  function toggleRole(role) {
    setSeeksRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.register(id, {
        personId: user?.personId,
        name: user?.name,
        roles: user ? undefined : [],
        seeksRoles,
        purpose,
        eventIntent: whoYouAre,
        skillsSeek: skillsYouSeek,
        whoYouAre,
        whoYouSeek,
        skillsYouSeek,
        meetSamePeople,
        blocklist: [],
        openToRematch: !meetSamePeople,
      });

      // Auto check-in
      if (user?.personId) {
        try { await api.checkin(id, { personId: user.personId }); } catch {}
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><span className="spinner" /></div>;
  if (!event) return <div className="page"><div className="alert alert-error">Event not found.</div></div>;

  if (success) return (
    <div className="page-narrow" style={{ textAlign: 'center', paddingTop: 60 }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>🎉</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>You're registered!</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
        You've successfully registered for <strong>{event.name}</strong>.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => navigate(`/event/${id}/room`)}>Go to Event Room</button>
        <button className="btn btn-secondary" onClick={() => navigate('/my-events')}>View My Events</button>
      </div>
    </div>
  );

  const quickChats = [
    'Who are the top people I should meet at this event?',
    'Who are the investors attending?',
    'Who are the founders I should connect with?',
    'Give me an icebreaker for the top 3 people I should meet',
    'What is the best way to introduce myself at this event?',
  ];

  return (
    <div className="page-narrow">
      <button onClick={() => navigate('/events')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer', marginBottom: 20 }}>
        ← Back to Events
      </button>

      {/* Event info */}
      <div className="card" style={{ padding: '22px 26px', marginBottom: 28, borderLeft: '4px solid var(--accent)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{event.name}</h1>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
          <span>📅 {event.date}</span>
          <span>🕐 {formatTime(event.startTime)}{event.endTime ? ` – ${formatTime(event.endTime)}` : ''}</span>
          <span>⏱ {event.durationMins} min</span>
          {event.location && <span>📍 {event.location}</span>}
          {event.hostName && <span>👤 Host: <strong style={{ color: 'var(--text-secondary)' }}>{event.hostName}</strong></span>}
          <span className="badge badge-muted">{event.type}</span>
        </div>
        {event.description && (
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, marginTop: 10, marginBottom: 12 }}>
            {event.description}
          </p>
        )}
        {(event.blasts || []).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {(event.blasts || []).map((b, i) => (
              <span key={i} className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>
                {b}
              </span>
            ))}
          </div>
        )}
        {attendees.length > 0 && (
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Checked-in guests ({attendees.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
              {attendees.map((a) => (
                <div key={a.id} style={{ fontSize: 13, padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{a.name}</strong>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                    {(a.roles || []).slice(0, 2).join(' · ')}
                    {(a.companyName || a.company) ? ` · ${a.companyName || a.company}` : ''}
                  </span>
                  {a.headline && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>{a.headline}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      <div className="card" style={{ padding: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Register for this event</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>Tell us about yourself and what you're looking for</p>

        <form onSubmit={handleSubmit} className="stack">
          <div className="form-group">
            <label className="form-label">Who are you at this event? *</label>
            <textarea
              className="form-input"
              value={whoYouAre}
              onChange={e => setWhoYouAre(e.target.value)}
              placeholder="e.g. I'm a Seed-stage founder building an AI-powered CRM. Looking to raise a $3M round."
              style={{ minHeight: 80 }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Who are you looking to meet?</label>
            <textarea
              className="form-input"
              value={whoYouSeek}
              onChange={e => setWhoYouSeek(e.target.value)}
              placeholder="e.g. Early-stage investors, B2B SaaS founders, technical advisors"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Roles you want to meet</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ROLES.map(r => (
                <button key={r} type="button" className="tag"
                  onClick={() => toggleRole(r)}
                  style={{ cursor: 'pointer', ...(seeksRoles.includes(r) ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent)' } : {}) }}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Skills you're looking for</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SKILLS.map(s => (
                <button key={s.id} type="button" className="tag"
                  onClick={() => toggleSkill(s.id)}
                  style={{ cursor: 'pointer', ...(skillsYouSeek.includes(s.id) ? { background: 'var(--info-soft)', color: 'var(--info)', borderColor: 'var(--info)' } : {}) }}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Purpose of attending</label>
            <select className="form-input" value={purpose} onChange={e => setPurpose(e.target.value)}>
              {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <input
              type="checkbox"
              id="meetSame"
              checked={meetSamePeople}
              onChange={e => setMeetSamePeople(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <label htmlFor="meetSame" style={{ cursor: 'pointer', fontSize: 14 }}>
              <strong>Open to meeting people I've met before</strong>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                If unchecked, the algorithm will prioritize new connections
              </div>
            </label>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={submitting}>
            {submitting ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Registering…</> : 'Register & Check In →'}
          </button>
        </form>
      </div>

      {/* Floating AI Chatbot */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
        {chatOpen && (
          <div className="card" style={{ width: 392, marginBottom: 12, padding: 0, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.4), var(--shadow-accent)', borderRadius: 20 }}>
            {/* Header */}
            <div style={{ padding: '14px 16px', background: 'linear-gradient(125deg, var(--accent) 0%, #5b4fd4 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 13 }}>AI</div>
                <div>
                  <div style={{ fontWeight: 800, color: '#fff', fontSize: 15, letterSpacing: '-0.02em' }}>VentureGraph AI</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>Answers include why — powered by your OpenAI key</div>
                </div>
              </div>
              <button type="button" onClick={() => setChatOpen(false)} style={{ background: 'rgba(0,0,0,0.15)', border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer', width: 30, height: 30, borderRadius: 8, lineHeight: 1 }} aria-label="Close">×</button>
            </div>

            {/* Quick questions */}
            {chatHistory.length === 0 && (
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Quick questions</div>
                {quickChats.map(q => (
                  <button key={q} type="button"
                    onClick={() => { setChatQuestion(q); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', marginBottom: 4, fontSize: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Chat messages */}
            {chatHistory.length > 0 && (
              <div style={{ maxHeight: 300, overflowY: 'auto', padding: '12px 12px', background: 'var(--bg-secondary)' }}>
                {chatHistory.map((msg, i) => (
                  <div key={i} style={{ marginBottom: 12, display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
                    {msg.role === 'assistant' && (
                      <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: 'linear-gradient(145deg, var(--accent), var(--info))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff' }}>AI</div>
                    )}
                    <div style={{
                      maxWidth: '86%', padding: '10px 14px',
                      borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                      background: msg.role === 'user' ? 'linear-gradient(135deg, var(--accent), #6a5cf0)' : 'var(--bg-card)',
                      color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                      border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                      boxShadow: msg.role === 'user' ? '0 3px 12px rgba(124,111,255,0.2)' : 'var(--shadow-sm)',
                    }}>
                      <ChatMessageBody content={msg.content} isUser={msg.role === 'user'} />
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ paddingLeft: 34 }}>
                    <ChatTypingIndicator />
                  </div>
                )}
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleChatSubmit} style={{ padding: '10px 12px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                style={{ fontSize: 14, flex: 1, borderRadius: 12 }}
                value={chatQuestion}
                onChange={e => setChatQuestion(e.target.value)}
                placeholder="Ask about this event — get reasons, not fluff…"
                autoFocus={chatOpen}
                disabled={chatLoading}
              />
              <button type="submit" className="btn btn-primary" style={{ borderRadius: 12, minWidth: 72 }} disabled={chatLoading || !chatQuestion.trim()}>Send</button>
            </form>
          </div>
        )}

        {/* Toggle button */}
        <button
          onClick={() => setChatOpen(o => !o)}
          style={{
            width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, var(--accent), #6a5cf0)',
            color: '#fff', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(124,111,255,0.4)', transition: 'all 0.2s',
            marginLeft: 'auto',
          }}
          title="Ask AI about this event"
        >
          {chatOpen ? '×' : '🤖'}
        </button>
      </div>
    </div>
  );
}

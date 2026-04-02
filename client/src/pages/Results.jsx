import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import Card from '../components/Card.jsx';
import RoleBadge from '../components/RoleBadge.jsx';
import ScoreBadge from '../components/ScoreBadge.jsx';
import { ChatMessageBody, ChatTypingIndicator } from '../components/ChatMessageBody.jsx';

const SUGGESTION_CHIPS = [
  'Who should I meet?',
  'Suggest top 3 people for me',
  "What's my strategy tonight?",
  'Who shares my interests?',
  'Who are the investors here?',
];

function ChatBox({ eventId, personId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(question) {
    if (!question.trim()) return;
    const userMsg = { role: 'user', content: question };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const { answer } = await api.chatPersonalization({
        personId,
        eventId,
        question,
        chatHistory: messages.slice(-6),
      });
      setMessages(m => [...m, { role: 'assistant', content: answer }]);
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: `Error: ${err.message}` }]);
    }
    setLoading(false);
  }

  return (
    <div>
      {messages.length === 0 && (
        <p style={{ color: '#888', fontSize: 13, marginBottom: 12, lineHeight: 1.55 }}>
          Ask who to meet, how to approach someone, or what to say next. Replies include a short <strong style={{ color: '#a5b4fc' }}>Why this answer</strong> section tied to your profile and the guest list.
        </p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {SUGGESTION_CHIPS.map(chip => (
          <button key={chip} type="button"
            onClick={() => send(chip)}
            disabled={loading}
            style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
              background: '#7c6fff18', color: '#a5b4fc',
              border: '1px solid #7c6fff33',
            }}>
            {chip}
          </button>
        ))}
      </div>

      {messages.length > 0 && (
        <div style={{ maxHeight: 360, overflowY: 'auto', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                marginBottom: 2,
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-end',
                gap: 8,
              }}
            >
              {msg.role === 'assistant' && (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    flexShrink: 0,
                    background: 'linear-gradient(145deg, #7c6fff, #38bdf8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    color: '#fff',
                    fontWeight: 800,
                  }}
                >
                  AI
                </div>
              )}
              <div
                style={{
                  maxWidth: msg.role === 'user' ? '88%' : 'calc(100% - 36px)',
                  padding: msg.role === 'user' ? '11px 16px' : '12px 16px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '6px 18px 18px 18px',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, #7c6fff, #6a5cf0)' : '#16161f',
                  color: msg.role === 'user' ? '#fff' : '#e8e8f0',
                  border: msg.role === 'assistant' ? '1px solid #2a2a3e' : 'none',
                  boxShadow: msg.role === 'user' ? '0 4px 16px rgba(124,111,255,0.22)' : '0 1px 0 rgba(0,0,0,0.2)',
                }}
              >
                <ChatMessageBody content={msg.content} isUser={msg.role === 'user'} />
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ paddingLeft: 36, marginBottom: 4 }}>
              <ChatTypingIndicator />
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
          disabled={loading}
          placeholder="Ask anything — I’ll explain why it fits your matches…"
          style={{
            flex: 1, padding: '10px 14px', background: '#0f0f14', border: '1px solid #2a2a3e',
            borderRadius: 8, color: '#e8e8f0', fontSize: 14, outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          style={{
            padding: '10px 18px', background: '#7c6fff', color: '#fff', border: 'none',
            borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14,
            opacity: loading || !input.trim() ? 0.5 : 1,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

function MatchPrepCard({ prep, loading }) {
  if (loading) {
    return (
      <div style={{ marginTop: 10, padding: '12px 14px', background: '#0f0f14', borderRadius: 8, border: '1px solid #1e1e2e' }}>
        <span style={{ color: '#555', fontSize: 12 }}>Loading match insights...</span>
      </div>
    );
  }
  if (!prep) return null;

  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {prep.whyMatch && (
        <div style={{ padding: '10px 14px', background: '#7c6fff0d', border: '1px solid #7c6fff22', borderRadius: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#7c6fff', letterSpacing: '0.08em', marginBottom: 4, textTransform: 'uppercase' }}>Why you match</div>
          <p style={{ fontSize: 13, color: '#c0bfff', lineHeight: 1.6, margin: 0 }}>{prep.whyMatch}</p>
        </div>
      )}
      {prep.icebreaker && (
        <div style={{ padding: '10px 14px', background: '#4ade8011', border: '1px solid #4ade8033', borderRadius: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', letterSpacing: '0.08em', marginBottom: 4, textTransform: 'uppercase' }}>Opening line</div>
          <p style={{ fontSize: 13, color: '#bbf7d0', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>"{prep.icebreaker}"</p>
        </div>
      )}
      {prep.talkingPoints?.length > 0 && (
        <div style={{ padding: '10px 14px', background: '#f59e0b0d', border: '1px solid #f59e0b22', borderRadius: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase' }}>What to talk about</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {prep.talkingPoints.map((point, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: '#f59e0b', fontSize: 12, marginTop: 1, flexShrink: 0 }}>•</span>
                <span style={{ fontSize: 13, color: '#fde68a', lineHeight: 1.5 }}>{point}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Results() {
  const { eventName, personName } = useParams();
  const decodedEvent = decodeURIComponent(eventName || '');
  const decodedPerson = decodeURIComponent(personName || '');

  const [resolved, setResolved] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [matchPreps, setMatchPreps] = useState({});
  const [loadingPreps, setLoadingPreps] = useState(new Set());
  const [ratings, setRatings] = useState({});

  useEffect(() => {
    let cancelled = false;
    setError('');
    setResolved(null);
    setData(null);
    api
      .lookupAttendee(decodedEvent, decodedPerson)
      .then((ids) => {
        if (cancelled) return;
        setResolved(ids);
        return api.results(ids.eventId, ids.personId);
      })
      .then((d) => {
        if (!cancelled && d) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => { cancelled = true; };
  }, [decodedEvent, decodedPerson]);

  // Auto-load match prep for all 1-on-1 networking matches
  useEffect(() => {
    if (!data || !resolved) return;
    const { networkingSchedule, person } = data;
    if (!networkingSchedule?.length) return;

    const personA = { ...person, id: resolved.personId };

    for (const { match } of networkingSchedule) {
      if (!match?.id) continue;
      const key = match.id;
      setLoadingPreps(prev => new Set([...prev, key]));
      api.matchPrep({ personA, personB: match, eventId: resolved.eventId })
        .then(prep => {
          setMatchPreps(prev => ({ ...prev, [key]: prep }));
        })
        .catch(() => {})
        .finally(() => {
          setLoadingPreps(prev => { const s = new Set(prev); s.delete(key); return s; });
        });
    }
  }, [data, resolved]);

  async function loadMixerPrep(member) {
    if (!resolved || !data || matchPreps[member.id] || loadingPreps.has(member.id)) return;
    const key = member.id;
    setLoadingPreps(prev => new Set([...prev, key]));
    try {
      const personA = { ...data.person, id: resolved.personId };
      const prep = await api.matchPrep({ personA, personB: member, eventId: resolved.eventId });
      setMatchPreps(prev => ({ ...prev, [key]: prep }));
    } catch {}
    setLoadingPreps(prev => { const s = new Set(prev); s.delete(key); return s; });
  }

  async function submitRating(toPersonId, rating, wouldMeetAgain) {
    if (!resolved) return;
    await api.rateConnection({
      fromPersonId: resolved.personId,
      toPersonId,
      eventId: resolved.eventId,
      rating,
      wouldMeetAgain,
    });
    setRatings((r) => ({ ...r, [toPersonId]: rating }));
  }

  if (error) return <p style={{ color: '#f87171' }}>{error}</p>;
  if (!data) return <p style={{ color: '#888' }}>Loading results for {decodedPerson} @ {decodedEvent}...</p>;

  const { person, personalisationInsights, icebreakerSchedule, networkingSchedule } = data;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>{decodedEvent}</p>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#e8e8f0' }}>{person.name}</h2>
        <div style={{ marginTop: 8 }}>
          {(person.roles || []).map((r) => <RoleBadge key={r} role={r} />)}
        </div>
        <p style={{ color: '#888', marginTop: 6, fontSize: 14 }}>
          {person.companyName} {person.companyStage ? `(${person.companyStage})` : ''} {person.purpose ? `· ${person.purpose}` : ''}
        </p>
      </div>

      {/* Personalization Chatbot */}
      {resolved && (
        <Card title="Personalization Assistant">
          <ChatBox eventId={resolved.eventId} personId={resolved.personId} />
        </Card>
      )}

      {personalisationInsights?.length > 0 && (
        <Card title="Your networking patterns">
          {personalisationInsights.map((ins, i) => (
            <div key={i} style={{ padding: '8px 12px', background: '#7c6fff11', borderRadius: 8, marginBottom: 8, fontSize: 14 }}>
              Prefers <strong>{ins.value}</strong> — confidence {Math.round(ins.confidence * 100)}%
            </div>
          ))}
        </Card>
      )}

      {networkingSchedule?.length > 0 && (
        <Card title={`Your 1-on-1 schedule (${networkingSchedule.length} meetings)`}>
          {networkingSchedule.map(({ slot, match, totalScore }) => (
            <div key={slot} style={{ padding: '14px 0', borderBottom: '1px solid #1e1e2e' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div>
                  <span style={{ color: '#666', fontSize: 13, marginRight: 12 }}>Slot {slot}</span>
                  <strong style={{ fontSize: 16, color: '#e8e8f0' }}>{match.name || match.id?.slice(0, 8)}</strong>
                  <div style={{ marginTop: 4 }}>
                    {(match.roles || []).map((r) => <RoleBadge key={r} role={r} />)}
                  </div>
                  {match.company && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{match.company}</div>}
                  {match.purpose && <div style={{ fontSize: 12, color: '#555', marginTop: 2, fontStyle: 'italic' }}>{match.purpose}</div>}
                </div>
                <ScoreBadge score={totalScore} />
              </div>

              <MatchPrepCard
                prep={matchPreps[match.id]}
                loading={loadingPreps.has(match.id) && !matchPreps[match.id]}
              />

              <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#555', marginRight: 4 }}>Rate this match:</span>
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => submitRating(match.id, r, r >= 4)}
                    style={{
                      width: 28, height: 28, borderRadius: 6, border: '1px solid #2a2a3e',
                      background: ratings[match.id] === r ? '#7c6fff' : '#0f0f14',
                      color: ratings[match.id] === r ? '#fff' : '#888',
                      cursor: 'pointer', fontSize: 13,
                    }}
                  >
                    {r}
                  </button>
                ))}
                {ratings[match.id] && <span style={{ fontSize: 12, color: '#4ade80' }}>Rated!</span>}
              </div>
            </div>
          ))}
        </Card>
      )}

      {icebreakerSchedule?.length > 0 && (
        <Card title="Mixer / Icebreaker schedule">
          {icebreakerSchedule.map(({ round, groupMembers }) => (
            <div key={round} style={{ marginBottom: 20 }}>
              <h4 style={{ color: '#c0bfff', marginBottom: 10 }}>Round {round}</h4>
              {(groupMembers || []).map((m) => (
                <div key={m.id} style={{ padding: '10px 0', borderBottom: '1px solid #1e1e2e' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <strong style={{ fontSize: 14, color: '#e8e8f0' }}>{m.name}</strong>
                      <span style={{ marginLeft: 8 }}>
                        {(m.roles || []).map((r) => <RoleBadge key={r} role={r} />)}
                      </span>
                      {m.company && <span style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>{m.company}</span>}
                    </div>
                    {!matchPreps[m.id] && !loadingPreps.has(m.id) && (
                      <button
                        type="button"
                        onClick={() => loadMixerPrep(m)}
                        style={{
                          padding: '4px 10px', background: 'transparent', color: '#4ade80',
                          border: '1px solid #4ade8033', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                        }}
                      >
                        Get icebreaker
                      </button>
                    )}
                  </div>
                  <MatchPrepCard
                    prep={matchPreps[m.id]}
                    loading={loadingPreps.has(m.id) && !matchPreps[m.id]}
                  />
                </div>
              ))}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

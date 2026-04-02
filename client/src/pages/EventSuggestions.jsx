import { useState, useEffect } from 'react';
import { api } from '../api.js';
import Card from '../components/Card.jsx';

const input = {
  padding: '10px 14px', background: '#0f0f14', border: '1px solid #2a2a3e',
  borderRadius: 8, color: '#e8e8f0', fontSize: 14, outline: 'none',
};
const btn = (color = '#7c6fff') => ({
  padding: '10px 20px', background: color, color: '#fff', border: 'none',
  borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14,
});

const TYPE_COLORS = {
  mixer: '#7c6fff',
  personal: '#22c55e',
  normal: '#f59e0b',
};

const TYPE_LABELS = {
  mixer: 'Mixer',
  personal: 'Personal (1-on-1)',
  normal: 'Open Networking',
};

function ScoreBar({ score, max = 100 }) {
  const pct = Math.min(100, Math.round((score / Math.max(max, 1)) * 100));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: '#1e1e2e', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#7c6fff', borderRadius: 3, transition: 'width .5s' }} />
      </div>
      <span style={{ fontSize: 12, color: '#7c6fff', fontWeight: 600, minWidth: 28 }}>{score}</span>
    </div>
  );
}

export default function EventSuggestions() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [whyCards, setWhyCards] = useState({});
  const [whyLoading, setWhyLoading] = useState({});
  const [personProfile, setPersonProfile] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('vg_profile');
      if (stored) setPersonProfile(JSON.parse(stored));
    } catch {}
  }, []);

  async function findEvents() {
    setLoading(true); setError(''); setResults(null);
    try {
      const data = await api.eventSuggestions(date, null);
      // Client-side scoring if profile available
      if (personProfile?.seeksRoles?.length > 0) {
        const seeksRoles = personProfile.seeksRoles || [];
        const skillsSeek = personProfile.skillsSeek || [];
        for (const result of data) {
          // Count attendees with matching roles
          // attendees data is not returned inline, use explanations as signal
          // Re-score based on event type alignment
          let bonus = 0;
          if (personProfile.roles?.some(r => ['Investor','Angel Investor','VC Partner'].includes(r)) && result.event.type === 'personal') bonus += 15;
          if (personProfile.roles?.some(r => ['Founder','Co-Founder'].includes(r)) && result.event.type === 'mixer') bonus += 10;
          result.score = (result.score || 0) + bonus;
        }
        data.sort((a, b) => b.score - a.score);
      }
      setResults(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function loadWhyEvent(result, idx) {
    if (whyCards[idx] || whyLoading[idx]) return;
    setWhyLoading(w => ({ ...w, [idx]: true }));
    try {
      const { explanation } = await api.whyEvent({
        event: result.event,
        personProfile,
        score: result.score,
        attendeeCount: result.attendeeCount,
      });
      setWhyCards(c => ({ ...c, [idx]: explanation }));
    } catch {
      setWhyCards(c => ({ ...c, [idx]: 'Unable to generate explanation.' }));
    }
    setWhyLoading(w => ({ ...w, [idx]: false }));
  }

  const maxScore = results ? Math.max(...results.map(r => r.score), 1) : 1;

  return (
    <div style={{ maxWidth: 720 }}>
      <h2 style={{ marginBottom: 8, fontSize: 24, fontWeight: 700 }}>Find Events</h2>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>
        Discover events on a given date and see which ones match your profile best.
      </p>

      {!personProfile && (
        <div style={{ background: '#f59e0b18', border: '1px solid #f59e0b44', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#f59e0b' }}>
          Set up your <a href="/profile" style={{ color: '#f59e0b' }}>profile</a> to get personalized match scores.
        </div>
      )}

      <Card>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 4 }}>Date</label>
            <input style={{ ...input }} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <button style={btn()} onClick={findEvents} disabled={loading}>
            {loading ? 'Finding...' : 'Find Events'}
          </button>
        </div>
      </Card>

      {error && <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>}

      {results !== null && results.length === 0 && (
        <Card>
          <p style={{ color: '#666', textAlign: 'center', padding: '24px 0' }}>
            No events found on {date}. Try a different date or create one.
          </p>
        </Card>
      )}

      {results && results.length > 0 && (
        <div>
          <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
            {results.length} event{results.length > 1 ? 's' : ''} found
            {personProfile ? ' · sorted by match score' : ''}
          </p>

          {results.map((result, idx) => {
            const { event, attendeeCount, score, explanations } = result;
            const isBest = idx === 0 && results.length > 1;
            const typeColor = TYPE_COLORS[event.type] || '#7c6fff';

            return (
              <div key={event.id} style={{
                background: '#16161f', border: `1px solid ${isBest ? '#7c6fff66' : '#2a2a3e'}`,
                borderRadius: 12, padding: 20, marginBottom: 16, position: 'relative',
              }}>
                {isBest && (
                  <div style={{
                    position: 'absolute', top: -10, left: 16,
                    background: '#7c6fff', color: '#fff', fontSize: 11, fontWeight: 700,
                    padding: '3px 10px', borderRadius: 10, letterSpacing: 0.5,
                  }}>
                    BEST FOR YOU
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, marginBottom: 6 }}>{event.name}</h3>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: `${typeColor}22`, color: typeColor, border: `1px solid ${typeColor}44`,
                      }}>
                        {TYPE_LABELS[event.type] || event.type}
                      </span>
                      <span style={{ fontSize: 13, color: '#666' }}>
                        {event.date} · {event.startTime || ''}{event.endTime ? ` – ${event.endTime}` : ''}
                      </span>
                      <span style={{ fontSize: 13, color: '#666' }}>{attendeeCount} attendees</span>
                    </div>
                  </div>

                  {personProfile && score > 0 && (
                    <div style={{ minWidth: 120 }}>
                      <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Match score</div>
                      <ScoreBar score={score} max={maxScore} />
                    </div>
                  )}
                </div>

                {explanations && explanations.length > 0 && (
                  <div style={{ marginTop: 12, padding: '10px 12px', background: '#7c6fff11', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: '#a5b4fc', marginBottom: 4, fontWeight: 600 }}>MATCHES IN THIS EVENT</div>
                    {explanations.map((exp, i) => (
                      <div key={i} style={{ fontSize: 13, color: '#c0bfff', marginBottom: 2 }}>· {exp}</div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 12 }}>
                  {!whyCards[idx] ? (
                    <button
                      type="button"
                      onClick={() => loadWhyEvent(result, idx)}
                      disabled={whyLoading[idx]}
                      style={{
                        padding: '6px 14px', background: 'transparent', color: '#7c6fff',
                        border: '1px solid #7c6fff44', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                      }}
                    >
                      {whyLoading[idx] ? 'Generating...' : 'Why attend this event? (AI)'}
                    </button>
                  ) : (
                    <div style={{ fontSize: 13, color: '#c0bfff', fontStyle: 'italic', lineHeight: 1.6, padding: '8px 12px', background: '#7c6fff0d', borderRadius: 6 }}>
                      {whyCards[idx]}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

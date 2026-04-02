import { Link } from 'react-router-dom';

const s = {
  hero: { textAlign: 'center', padding: '80px 0 60px' },
  h1: { fontSize: 52, fontWeight: 800, letterSpacing: -2, marginBottom: 16,
    background: 'linear-gradient(135deg, #7c6fff, #4ade80)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  sub: { fontSize: 18, color: '#888', maxWidth: 520, margin: '0 auto 40px' },
  actions: { display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' },
  btnPrimary: {
    padding: '12px 28px', borderRadius: 8, background: '#7c6fff', color: '#fff',
    textDecoration: 'none', fontWeight: 600, fontSize: 15,
  },
  btnSecondary: {
    padding: '12px 28px', borderRadius: 8, background: 'transparent', color: '#7c6fff',
    textDecoration: 'none', fontWeight: 600, fontSize: 15, border: '1px solid #7c6fff',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginTop: 60 },
  feature: { background: '#16161f', border: '1px solid #2a2a3e', borderRadius: 12, padding: 24 },
  icon: { fontSize: 32, marginBottom: 12 },
  fTitle: { fontWeight: 700, marginBottom: 8, color: '#c0bfff' },
  fDesc: { color: '#666', fontSize: 14, lineHeight: 1.6 },
};

const features = [
  { icon: '🔗', title: 'Graph-powered matching', desc: 'Neo4j traverses mutual role wants, skill complementarity, and past connection patterns in one Cypher query.' },
  { icon: '🤖', title: 'AI why-cards', desc: 'RocketRide generates a personalised 2-sentence reason for every match — specific, no corporate fluff.' },
  { icon: '🎯', title: 'Two event modes', desc: 'Icebreaker rotating groups or open networking 1-on-1 schedule — both algorithmically optimised.' },
  { icon: '📈', title: 'Personalisation engine', desc: 'Learns your networking patterns across events and boosts or deprioritises roles accordingly.' },
];

export default function Home() {
  return (
    <div>
      <div style={s.hero}>
        <h1 style={s.h1}>VentureGraph</h1>
        <p style={s.sub}>Graph-powered event networking. Every attendee gets a personalised schedule of who to meet — and exactly why.</p>
        <div style={s.actions}>
          <Link to="/create-event" style={s.btnPrimary}>Create Event</Link>
          <Link to="/register" style={s.btnSecondary}>Register as Attendee</Link>
        </div>
      </div>
      <div style={s.grid}>
        {features.map(f => (
          <div key={f.title} style={s.feature}>
            <div style={s.icon}>{f.icon}</div>
            <div style={s.fTitle}>{f.title}</div>
            <div style={s.fDesc}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

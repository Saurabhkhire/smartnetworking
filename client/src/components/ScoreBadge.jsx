export default function ScoreBadge({ score }) {
  const color = score >= 75 ? '#4ade80' : score >= 50 ? '#facc15' : '#f87171';
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 20,
      background: color + '22', color, fontWeight: 700, fontSize: 13,
    }}>
      {score}
    </span>
  );
}

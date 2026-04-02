const COLORS = {
  Founder: '#7c6fff', 'Co-Founder': '#7c6fff', Investor: '#4ade80',
  'Angel Investor': '#4ade80', 'VC Partner': '#4ade80', Engineer: '#38bdf8',
  'Product Manager': '#fb923c', Designer: '#f472b6', default: '#888',
};

export default function RoleBadge({ role }) {
  const color = COLORS[role] || COLORS.default;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 12,
      background: color + '22', color, border: `1px solid ${color}44`, marginRight: 4, marginBottom: 4,
    }}>
      {role}
    </span>
  );
}

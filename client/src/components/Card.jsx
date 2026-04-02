export default function Card({ title, children, style = {} }) {
  return (
    <div style={{
      background: '#16161f', border: '1px solid #2a2a3e', borderRadius: 12,
      padding: 24, marginBottom: 20, ...style,
    }}>
      {title && <h3 style={{ marginBottom: 16, color: '#c0bfff', fontSize: 15, fontWeight: 600 }}>{title}</h3>}
      {children}
    </div>
  );
}

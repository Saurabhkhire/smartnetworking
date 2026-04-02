import React from 'react';

/**
 * Full inline-markdown renderer: **bold**, *italic*, `code`, numbered lists,
 * bullet lists, horizontal rules, and section headers (lines ending with :).
 */
function renderInline(text) {
  if (!text) return null;
  // Split on bold (**...**), italic (*...*), and inline code (`...`)
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2)
      return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2)
      return (
        <code key={i} style={{
          fontFamily: 'monospace', fontSize: '0.9em',
          background: 'rgba(124,111,255,0.12)', color: 'var(--accent)',
          padding: '1px 5px', borderRadius: 4,
        }}>{part.slice(1, -1)}</code>
      );
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export function ChatMessageBody({ content, isUser }) {
  if (!content) return null;
  const lines = content.split('\n');
  const nodes = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // Skip empty
    if (!trimmed) { nodes.push(<div key={i} style={{ height: 6 }} />); i++; continue; }

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      nodes.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '8px 0' }} />);
      i++; continue;
    }

    // Heading: "## Text" or "# Text"
    if (/^#{1,3}\s/.test(trimmed)) {
      const level = (trimmed.match(/^(#+)/)?.[1] || '#').length;
      const txt = trimmed.replace(/^#+\s+/, '');
      nodes.push(
        <div key={i} style={{
          fontWeight: 700, fontSize: level === 1 ? 15 : 13.5,
          color: isUser ? '#fff' : 'var(--text-primary)',
          marginTop: 10, marginBottom: 2,
          borderBottom: level === 1 ? '1px solid rgba(124,111,255,0.25)' : 'none',
          paddingBottom: level === 1 ? 4 : 0,
        }}>
          {renderInline(txt)}
        </div>
      );
      i++; continue;
    }

    // Numbered list item: "1. text" or "1) text"
    if (/^\d+[.)]\s/.test(trimmed)) {
      const listItems = [];
      while (i < lines.length && /^\d+[.)]\s/.test(lines[i].trim())) {
        const num = lines[i].trim().match(/^(\d+)/)?.[1];
        const txt = lines[i].trim().replace(/^\d+[.)]\s+/, '');
        listItems.push({ num, txt });
        i++;
      }
      nodes.push(
        <ol key={`ol-${i}`} style={{ paddingLeft: 20, margin: '6px 0' }}>
          {listItems.map((item, idx) => (
            <li key={idx} style={{ marginBottom: 5, fontSize: 13, lineHeight: 1.55, color: isUser ? '#fff' : 'var(--text-primary)' }}>
              {renderInline(item.txt)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Bullet: "- text", "• text", "* text"
    if (/^[-•*]\s/.test(trimmed)) {
      const bullets = [];
      while (i < lines.length && /^[-•*]\s/.test(lines[i].trim())) {
        bullets.push(lines[i].trim().replace(/^[-•*]\s+/, ''));
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} style={{ paddingLeft: 16, margin: '4px 0', listStyle: 'none' }}>
          {bullets.map((b, idx) => (
            <li key={idx} style={{ marginBottom: 4, fontSize: 13, lineHeight: 1.55, color: isUser ? '#fff' : 'var(--text-primary)', display: 'flex', gap: 6 }}>
              <span style={{ color: isUser ? 'rgba(255,255,255,0.6)' : 'var(--accent)', flexShrink: 0, marginTop: 2 }}>›</span>
              <span>{renderInline(b)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Section label ending with ":" (bold treatment)
    if (/^[A-Z][^.!?]{0,60}:$/.test(trimmed) || /^\*\*[^*]+\*\*$/.test(trimmed)) {
      nodes.push(
        <div key={i} style={{
          fontWeight: 700, fontSize: 12, textTransform: 'uppercase',
          letterSpacing: '0.06em', marginTop: 10, marginBottom: 3,
          color: isUser ? 'rgba(255,255,255,0.8)' : 'var(--accent)',
        }}>
          {renderInline(trimmed.replace(/\*\*/g, '').replace(/:$/, ''))}
        </div>
      );
      i++; continue;
    }

    // Regular paragraph
    nodes.push(
      <p key={i} style={{ margin: '0 0 5px', fontSize: 13, lineHeight: 1.6, color: isUser ? '#fff' : 'var(--text-primary)', wordBreak: 'break-word' }}>
        {renderInline(trimmed)}
      </p>
    );
    i++;
  }

  return <div style={{ fontFeatureSettings: '"kern" 1' }}>{nodes}</div>;
}

export function ChatTypingIndicator({ label = 'Thinking' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 12.5 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {[0, 1, 2].map(j => (
          <div key={j} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--accent)',
            animation: 'chatDotPulse 1.2s ease-in-out infinite',
            animationDelay: `${j * 0.2}s`,
            opacity: 0.6,
          }} />
        ))}
      </div>
      <span style={{ fontStyle: 'italic', letterSpacing: '0.01em' }}>{label}…</span>
      <style>{`
        @keyframes chatDotPulse {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40% { transform: scale(1.1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/** Small chip for quick-question suggestions */
export function QuickChip({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '5px 12px', borderRadius: 20,
        fontSize: 12, fontWeight: 500, cursor: 'pointer',
        background: 'var(--accent-soft)', color: 'var(--accent)',
        border: '1px solid rgba(124,111,255,0.3)',
        transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-soft)'; e.currentTarget.style.color = 'var(--accent)'; }}
    >
      {label}
    </button>
  );
}

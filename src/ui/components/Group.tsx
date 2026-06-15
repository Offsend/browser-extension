import { Children, type ReactNode } from 'react';
import type { Theme } from '../theme';

interface GroupProps {
  t: Theme;
  title?: string;
  hint?: ReactNode;
  children: ReactNode;
}

/** Titled card that hairline-divides its direct children (rows). */
export function Group({ t, title, hint, children }: GroupProps) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <section style={{ marginBottom: 24 }}>
      {title && (
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: t.textMuted,
            marginBottom: 8,
            paddingLeft: 2,
          }}
        >
          {title}
        </div>
      )}
      {hint && (
        <div
          style={{
            fontSize: 12,
            color: t.textSub,
            marginBottom: 10,
            paddingLeft: 2,
            maxWidth: 520,
            lineHeight: 1.5,
          }}
        >
          {hint}
        </div>
      )}
      <div
        style={{
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          padding: '0 14px',
        }}
      >
        {rows.map((child, i) => (
          <div
            key={i}
            style={{ borderBottom: i < rows.length - 1 ? `1px solid ${t.border}` : 'none' }}
          >
            {child}
          </div>
        ))}
      </div>
    </section>
  );
}

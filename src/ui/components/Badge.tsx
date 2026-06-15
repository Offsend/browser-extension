import type { ReactNode } from 'react';
import { FONT_SANS, type Theme } from '../theme';

export type BadgeTone = 'ok' | 'warn' | 'danger' | 'neutral';

interface BadgeProps {
  t: Theme;
  tone?: BadgeTone;
  children: ReactNode;
  title?: string;
  dot?: boolean;
}

function palette(t: Theme, tone: BadgeTone): { bg: string; fg: string } {
  switch (tone) {
    case 'ok':
      return { bg: t.greenDim, fg: t.greenText };
    case 'warn':
      return { bg: t.amberDim, fg: t.amberText };
    case 'danger':
      return { bg: t.redDim, fg: t.redText };
    default:
      return { bg: t.bg3, fg: t.textSub };
  }
}

export function Badge({ t, tone = 'neutral', children, title, dot = false }: BadgeProps) {
  const { bg, fg } = palette(t, tone);
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: bg,
        color: fg,
        borderRadius: 999,
        padding: '2px 9px',
        fontSize: 11.5,
        fontWeight: 600,
        fontFamily: FONT_SANS,
        whiteSpace: 'nowrap',
      }}
    >
      {dot && (
        <span
          style={{ width: 6, height: 6, borderRadius: '50%', background: fg, flexShrink: 0 }}
        />
      )}
      {children}
    </span>
  );
}

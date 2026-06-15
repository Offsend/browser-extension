import type { ReactNode } from 'react';
import { FONT_MONO, type Theme } from '../theme';

interface KbdProps {
  t: Theme;
  children: ReactNode;
  sm?: boolean;
}

export function Kbd({ t, children, sm = false }: KbdProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: sm ? 18 : 22,
        height: sm ? 18 : 22,
        padding: sm ? '0 4px' : '0 6px',
        borderRadius: 5,
        background: t.bg2,
        border: `1px solid ${t.border2}`,
        fontFamily: FONT_MONO,
        fontSize: sm ? 10 : 11,
        fontWeight: 600,
        color: t.text,
        letterSpacing: '0.02em',
        boxShadow: `inset 0 -1px 0 ${t.border}`,
      }}
    >
      {children}
    </span>
  );
}

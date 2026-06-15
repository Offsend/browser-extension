import type { ReactNode } from 'react';
import type { Theme } from '../theme';

interface RowProps {
  t: Theme;
  label: ReactNode;
  hint?: ReactNode;
  children?: ReactNode;
  align?: 'center' | 'top';
}

/** Settings row: label + optional helper on the left, control on the right. */
export function Row({ t, label, hint, children, align = 'center' }: RowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: align === 'top' ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '12px 0',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: t.text, fontWeight: 500 }}>{label}</div>
        {hint && (
          <div style={{ fontSize: 11.5, color: t.textSub, marginTop: 3, lineHeight: 1.45 }}>
            {hint}
          </div>
        )}
      </div>
      {children !== undefined && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          {children}
        </div>
      )}
    </div>
  );
}

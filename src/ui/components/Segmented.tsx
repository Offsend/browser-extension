import type { ReactNode } from 'react';
import { FONT_SANS, type Theme } from '../theme';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedProps<T extends string> {
  t: Theme;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ t, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div
      style={{
        display: 'inline-flex',
        background: t.bg2,
        borderRadius: 7,
        padding: 2,
        border: `1px solid ${t.border}`,
        gap: 1,
      }}
    >
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 5,
              border: 'none',
              background: active ? t.bg0 : 'transparent',
              color: active ? t.text : t.textSub,
              fontSize: 11,
              fontWeight: 500,
              fontFamily: FONT_SANS,
              cursor: 'pointer',
              transition: 'all 0.12s',
              boxShadow: active ? `0 0 0 1px ${t.border2}` : 'none',
            }}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

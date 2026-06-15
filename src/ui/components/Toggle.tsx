import type { Theme } from '../theme';

interface ToggleProps {
  t: Theme;
  on: boolean;
  onChange: (next: boolean) => void;
  size?: 'sm' | 'md';
}

export function Toggle({ t, on, onChange, size = 'md' }: ToggleProps) {
  const w = size === 'sm' ? 30 : 36;
  const h = size === 'sm' ? 18 : 20;
  const knob = h - 4;
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: w,
        height: h,
        borderRadius: h / 2,
        border: 'none',
        background: on ? t.blue : t.bg3,
        position: 'relative',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 0.18s',
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: on ? w - knob - 2 : 2,
          width: knob,
          height: knob,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 2px oklch(0% 0 0 / 0.25)',
          transition: 'left 0.18s',
        }}
      />
    </button>
  );
}

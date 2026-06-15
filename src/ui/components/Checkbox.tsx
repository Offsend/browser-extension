import type { Theme } from '../theme';
import { ICheck } from './Icons';

interface CheckboxProps {
  t: Theme;
  on: boolean;
  onChange: (next: boolean) => void;
  size?: number;
}

export function Checkbox({ t, on, onChange, size = 16 }: CheckboxProps) {
  return (
    <button
      role="checkbox"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: size,
        height: size,
        borderRadius: 4,
        background: on ? t.blue : 'transparent',
        border: on ? `1px solid ${t.blue}` : `1.5px solid ${t.border2}`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        padding: 0,
        transition: 'all 0.12s',
      }}
    >
      {on && <ICheck size={11} color="#fff" />}
    </button>
  );
}

import { useState, type CSSProperties } from 'react';
import { FONT_SANS, FONT_MONO, type Theme } from '../theme';

function base(t: Theme, focused: boolean): CSSProperties {
  return {
    width: '100%',
    padding: '8px 10px',
    fontSize: 13,
    color: t.text,
    background: t.bg1,
    border: `1px solid ${focused ? t.blue : t.border2}`,
    borderRadius: 7,
    outline: 'none',
    boxShadow: focused ? `0 0 0 3px ${t.blueDim}` : 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.12s, box-shadow 0.12s',
  };
}

interface TextInputProps {
  t: Theme;
  type?: 'text' | 'number';
  value: string | number;
  min?: number;
  width?: number | string;
  onChange: (value: string) => void;
}

export function TextInput({ t, type = 'text', value, min, width, onChange }: TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      min={min}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ ...base(t, focused), width: width ?? '100%', fontFamily: FONT_SANS }}
    />
  );
}

interface TextAreaProps {
  t: Theme;
  value: string;
  rows?: number;
  mono?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}

export function TextArea({ t, value, rows = 4, mono = false, placeholder, onChange }: TextAreaProps) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...base(t, focused),
        resize: 'vertical',
        lineHeight: 1.5,
        fontFamily: mono ? FONT_MONO : FONT_SANS,
      }}
    />
  );
}

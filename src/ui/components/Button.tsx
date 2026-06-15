import { useState, type ReactNode } from 'react';
import { FONT_SANS, type Theme } from '../theme';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger-ghost';

interface ButtonProps {
  t: Theme;
  children: ReactNode;
  variant?: ButtonVariant;
  danger?: boolean;
  sm?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  onClick?: () => void;
}

export function Button({
  t,
  children,
  variant = 'primary',
  danger = false,
  sm = false,
  icon,
  fullWidth = false,
  onClick,
}: ButtonProps) {
  const [hov, setHov] = useState(false);

  let bg: string;
  let color: string;
  let border: string;
  if (variant === 'primary' && !danger) {
    bg = hov ? t.blueHover : t.blue;
    color = '#fff';
    border = 'none';
  } else if (variant === 'primary' && danger) {
    bg = hov ? t.redHover : t.red;
    color = '#fff';
    border = 'none';
  } else if (variant === 'outline') {
    bg = hov ? t.bg2 : t.bg1;
    color = t.text;
    border = `1px solid ${t.border2}`;
  } else if (variant === 'danger-ghost') {
    bg = hov ? t.redDim : 'transparent';
    color = t.redText;
    border = `1px solid ${t.redDim}`;
  } else {
    bg = hov ? t.bg2 : 'transparent';
    color = t.textSub;
    border = '1px solid transparent';
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: fullWidth ? 'flex' : 'inline-flex',
        width: fullWidth ? '100%' : undefined,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: sm ? '4px 10px' : '7px 14px',
        borderRadius: 7,
        border,
        background: bg,
        color,
        fontSize: sm ? 11 : 12,
        fontWeight: 500,
        fontFamily: FONT_SANS,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'background 0.12s',
      }}
    >
      {icon}
      {children}
    </button>
  );
}

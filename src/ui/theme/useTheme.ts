import { useEffect, useState } from 'react';
import { DARK, LIGHT, type Theme } from './tokens';

const QUERY = '(prefers-color-scheme: dark)';

/** Resolves the active token set from the OS color scheme and tracks changes. */
export function useTheme(): Theme {
  const [dark, setDark] = useState(() =>
    typeof matchMedia === 'function' ? matchMedia(QUERY).matches : false,
  );

  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return dark ? DARK : LIGHT;
}

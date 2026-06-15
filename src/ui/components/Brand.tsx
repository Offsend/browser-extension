import { FONT_SANS, FONT_MONO, type Theme } from '../theme';

interface BrandProps {
  t: Theme;
  name?: string;
  subtitle?: string;
  size?: number;
}

/** App identity lockup: the extension icon + name + optional subtitle. */
export function Brand({ t, name = 'Offsend', subtitle, size = 30 }: BrandProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <img
        src={browser.runtime.getURL('/icons/128.png')}
        alt=""
        width={size}
        height={size}
        style={{ borderRadius: size / 4.5, display: 'block', flexShrink: 0 }}
      />
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: FONT_SANS }}>
          {name}
        </div>
        {subtitle && (
          <div style={{ fontSize: 10.5, color: t.textMuted, fontFamily: FONT_MONO }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

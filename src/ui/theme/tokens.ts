/**
 * Design tokens lifted from the Offsend (PasteGuard) desktop app settings UI.
 * Same oklch palette and light/dark structure so the extension matches the app.
 */
export interface Theme {
  bg0: string;
  bg1: string;
  bg2: string;
  bg3: string;
  card: string;
  border: string;
  border2: string;

  blue: string;
  blueHover: string;
  blueDeep: string;
  blueDim: string;
  blueText: string;

  amber: string;
  amberDim: string;
  amberText: string;

  red: string;
  redHover: string;
  redDim: string;
  redText: string;

  green: string;
  greenDim: string;
  greenText: string;

  text: string;
  textSub: string;
  textMuted: string;

  popShadow: string;
}

export const DARK: Theme = {
  bg0: 'oklch(13% 0.012 250)',
  bg1: 'oklch(16% 0.014 250)',
  bg2: 'oklch(20% 0.016 250)',
  bg3: 'oklch(25% 0.018 250)',
  card: 'oklch(17% 0.014 250)',
  border: 'oklch(100% 0 0 / 0.06)',
  border2: 'oklch(100% 0 0 / 0.12)',

  blue: 'oklch(62% 0.19 240)',
  blueHover: 'oklch(67% 0.19 240)',
  blueDeep: 'oklch(48% 0.20 245)',
  blueDim: 'oklch(62% 0.19 240 / 0.18)',
  blueText: 'oklch(82% 0.12 240)',

  amber: 'oklch(76% 0.17 75)',
  amberDim: 'oklch(76% 0.17 75 / 0.16)',
  amberText: 'oklch(88% 0.10 75)',

  red: 'oklch(60% 0.22 20)',
  redHover: 'oklch(65% 0.22 20)',
  redDim: 'oklch(60% 0.22 20 / 0.18)',
  redText: 'oklch(82% 0.13 20)',

  green: 'oklch(68% 0.18 155)',
  greenDim: 'oklch(68% 0.18 155 / 0.16)',
  greenText: 'oklch(82% 0.10 155)',

  text: 'oklch(94% 0.005 250)',
  textSub: 'oklch(68% 0.012 250)',
  textMuted: 'oklch(48% 0.010 250)',

  popShadow: '0 12px 32px oklch(0% 0 0 / 0.5)',
};

export const LIGHT: Theme = {
  bg0: 'oklch(98% 0.004 250)',
  bg1: 'oklch(100% 0 0)',
  bg2: 'oklch(96% 0.006 250)',
  bg3: 'oklch(92% 0.008 250)',
  card: 'oklch(100% 0 0)',
  border: 'oklch(0% 0 0 / 0.07)',
  border2: 'oklch(0% 0 0 / 0.14)',

  blue: 'oklch(54% 0.20 240)',
  blueHover: 'oklch(48% 0.20 240)',
  blueDeep: 'oklch(40% 0.20 245)',
  blueDim: 'oklch(54% 0.20 240 / 0.10)',
  blueText: 'oklch(40% 0.18 240)',

  amber: 'oklch(60% 0.16 65)',
  amberDim: 'oklch(60% 0.16 65 / 0.12)',
  amberText: 'oklch(42% 0.14 65)',

  red: 'oklch(54% 0.22 20)',
  redHover: 'oklch(48% 0.22 20)',
  redDim: 'oklch(54% 0.22 20 / 0.10)',
  redText: 'oklch(42% 0.20 20)',

  green: 'oklch(50% 0.17 155)',
  greenDim: 'oklch(50% 0.17 155 / 0.12)',
  greenText: 'oklch(38% 0.14 155)',

  text: 'oklch(18% 0.010 250)',
  textSub: 'oklch(40% 0.012 250)',
  textMuted: 'oklch(58% 0.008 250)',

  popShadow: '0 12px 32px oklch(0% 0 0 / 0.14)',
};

// Web fonts (DM Sans/DM Mono) aren't bundled — staying local-first means no
// network fetch. Fall back to the platform UI stack the app would resolve to.
export const FONT_SANS = "system-ui, -apple-system, 'Segoe UI', 'DM Sans', sans-serif";
export const FONT_MONO = "ui-monospace, SFMono-Regular, Menlo, 'DM Mono', monospace";

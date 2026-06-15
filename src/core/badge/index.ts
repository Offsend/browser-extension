import type { HealthReply } from '@/core/messaging/protocol';

/**
 * Toolbar-icon indicator. A traffic light so users can read the extension's
 * state at a glance without opening the popup:
 *   - `inactive` (gray)   — not working on this tab
 *   - `preparing` (amber) — matched the site but not fully protecting yet
 *   - `active` (green)    — wired in and protecting
 */
export type BadgeState = 'inactive' | 'preparing' | 'active';

export interface BadgeStyle {
  /** Status-dot colour, painted onto the toolbar icon. Hex string. */
  readonly color: string;
  /** Icon tooltip, so colour is never the only signal (accessibility). */
  readonly title: string;
}

const STYLES: Record<BadgeState, BadgeStyle> = {
  inactive: { color: '#9CA3AF', title: 'Offsend — not active on this site' },
  preparing: { color: '#F59E0B', title: 'Offsend — getting ready…' },
  active: { color: '#22C55E', title: 'Offsend — active & protecting' },
};

export function badgeStyle(state: BadgeState): BadgeStyle {
  return STYLES[state];
}

/**
 * Map a tab's health snapshot to a badge state. Anything short of a healthy,
 * wired adapter is amber — staying honest that protection isn't yet complete.
 */
export function badgeStateForHealth(health: HealthReply): BadgeState {
  switch (health.status) {
    case 'ok':
      return 'active';
    case 'connecting':
    case 'degraded':
      return 'preparing';
    case 'inactive':
      return 'inactive';
  }
}

import { useMemo, useState } from 'react';
import type { Finding, FindingType } from '@/core/detection';
import { t as i18n } from '@/core/i18n';
import { maskText } from '@/core/masking';
import { Badge, Button, Checkbox, FONT_MONO, useTheme, type Theme } from '@/ui';

const M = i18n();

export interface ReviewState {
  readonly findings: readonly Finding[];
  /** Original, unmasked prompt text — used to preview masking as toggles change. */
  readonly text: string;
  readonly canSendAnyway: boolean;
  /** Primary action label; defaults to "Mask & send" (file flows override it). */
  readonly confirmLabel?: string;
  /** Bypass action label; defaults to "Send anyway". */
  readonly bypassLabel?: string;
  /** Called with only the findings the user left enabled. */
  readonly onMaskSend: (findings: readonly Finding[]) => void;
  readonly onSendAnyway: () => void;
  readonly onCancel: () => void;
}

export interface ToastState {
  readonly id: number;
  readonly text: string;
  readonly action?: { readonly label: string; readonly onClick: () => void };
}

export interface OverlayState {
  readonly review: ReviewState | null;
  readonly toasts: readonly ToastState[];
  /** Findings detected live while typing (empty → chip hidden). */
  readonly live: readonly Finding[];
}

const TYPE_LABEL: Record<FindingType, string> = M.type;

/** Same value+type always share one placeholder, so they're toggled as a group. */
function findingKey(f: Finding): string {
  return `${f.type}\u0000${f.value}`;
}

interface FindingGroup {
  readonly key: string;
  readonly type: FindingType;
  readonly value: string;
  readonly count: number;
}

function groupFindings(findings: readonly Finding[]): FindingGroup[] {
  const groups = new Map<string, FindingGroup>();
  for (const f of findings) {
    const key = findingKey(f);
    const existing = groups.get(key);
    if (existing) groups.set(key, { ...existing, count: existing.count + 1 });
    else groups.set(key, { key, type: f.type, value: f.value, count: 1 });
  }
  return [...groups.values()];
}

function truncate(value: string, max = 40): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function ReviewCard({ t, review }: { t: Theme; review: ReviewState }) {
  const total = review.findings.length;
  const groups = useMemo(() => groupFindings(review.findings), [review.findings]);
  const [disabledKeys, setDisabledKeys] = useState<ReadonlySet<string>>(new Set());
  const enabledFindings = useMemo(
    () => review.findings.filter((f) => !disabledKeys.has(findingKey(f))),
    [review.findings, disabledKeys],
  );
  const preview = useMemo(
    () => maskText(review.text, enabledFindings).masked,
    [review.text, enabledFindings],
  );

  const toggle = (key: string) => {
    setDisabledKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div
      role="dialog"
      aria-label="Offsend review"
      style={{
        width: 360,
        background: t.card,
        color: t.text,
        border: `1px solid ${t.border}`,
        borderRadius: 14,
        boxShadow: t.popShadow,
        padding: '14px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <img
          src={browser.runtime.getURL('/icons/128.png')}
          alt=""
          width={22}
          height={22}
          style={{ borderRadius: 6, display: 'block', flexShrink: 0 }}
        />
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{M.overlay.sensitiveFound(total)}</span>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          marginBottom: 10,
          maxHeight: 168,
          overflow: 'auto',
        }}
      >
        {groups.map((g) => {
          const on = !disabledKeys.has(g.key);
          return (
            <div
              key={g.key}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 2px' }}
            >
              <Checkbox t={t} on={on} onChange={() => toggle(g.key)} />
              <Badge t={t} tone={on ? 'warn' : 'neutral'}>
                {TYPE_LABEL[g.type]}
                {g.count > 1 ? ` ×${g.count}` : ''}
              </Badge>
              <span
                title={g.value}
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: 11.5,
                  fontFamily: FONT_MONO,
                  color: on ? t.textSub : t.textMuted,
                  textDecoration: on ? 'none' : 'line-through',
                }}
              >
                {truncate(g.value)}
              </span>
            </div>
          );
        })}
      </div>

      <pre
        style={{
          fontSize: 12,
          background: t.bg2,
          border: `1px solid ${t.border}`,
          borderRadius: 8,
          padding: 8,
          margin: '0 0 14px',
          maxHeight: 96,
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: FONT_MONO,
          color: t.textSub,
        }}
      >
        {preview}
      </pre>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button t={t} variant="ghost" sm onClick={review.onCancel}>
          {M.overlay.cancel}
        </Button>
        {review.canSendAnyway && (
          <Button t={t} variant="outline" sm onClick={review.onSendAnyway}>
            {review.bypassLabel ?? M.overlay.sendAnyway}
          </Button>
        )}
        <Button t={t} variant="primary" sm onClick={() => review.onMaskSend(enabledFindings)}>
          {review.confirmLabel ?? M.overlay.maskAndSend}
        </Button>
      </div>
    </div>
  );
}

/** Compact live indicator: what will be caught if the user sends right now. */
function LiveChip({ t, findings }: { t: Theme; findings: readonly Finding[] }) {
  const summary = useMemo(() => {
    const counts = new Map<FindingType, number>();
    for (const f of findings) counts.set(f.type, (counts.get(f.type) ?? 0) + 1);
    return [...counts.entries()]
      .map(([type, n]) => (n > 1 ? `${TYPE_LABEL[type]} ×${n}` : TYPE_LABEL[type]))
      .join(', ');
  }, [findings]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: t.card,
        color: t.text,
        border: `1px solid ${t.border2}`,
        borderRadius: 999,
        padding: '6px 12px',
        fontSize: 12,
        boxShadow: t.popShadow,
        maxWidth: 340,
      }}
    >
      <Badge t={t} tone="warn">
        {findings.length}
      </Badge>
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: t.textSub,
        }}
      >
        {M.overlay.liveChip(summary)}
      </span>
    </div>
  );
}

function Toast({ t, toast }: { t: Theme; toast: ToastState }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: t.card,
        color: t.text,
        border: `1px solid ${t.border2}`,
        borderRadius: 999,
        padding: '8px 14px',
        fontSize: 12.5,
        boxShadow: t.popShadow,
      }}
    >
      <span>{toast.text}</span>
      {toast.action && (
        <button
          onClick={toast.action.onClick}
          style={{
            background: 'transparent',
            border: 0,
            padding: 0,
            color: t.blueText,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 12.5,
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}

export function Overlay({ state }: { state: OverlayState }) {
  const t = useTheme();
  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 2147483647,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8,
        maxWidth: 360,
      }}
    >
      {state.review && <ReviewCard t={t} review={state.review} />}
      {!state.review && state.live.length > 0 && <LiveChip t={t} findings={state.live} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
        {state.toasts.map((toast) => (
          <Toast key={toast.id} t={t} toast={toast} />
        ))}
      </div>
    </div>
  );
}

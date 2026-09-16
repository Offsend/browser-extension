import { useMemo, useState } from 'react';
import type { Finding, FindingType } from '@/core/detection';
import { t as i18n, type Messages } from '@/core/i18n';
import type { FileCoverage } from '@/core/interceptor';
import { maskText } from '@/core/masking';
import { Badge, Button, Checkbox, FONT_MONO, useTheme, type Theme } from '@/ui';

export interface ReviewState {
  /** Stable id so React remounts the card (and resets toggles) per session. */
  readonly sessionId?: number;
  readonly findings: readonly Finding[];
  /** Original, unmasked prompt text — used to preview masking as toggles change. */
  readonly text: string;
  /** Per-file scan status when this review is about attachments. */
  readonly attachments?: readonly FileCoverage[];
  readonly canSendAnyway: boolean;
  /** Primary action label; defaults to "Mask & send" (file flows override it). */
  readonly confirmLabel?: string;
  /** Bypass action label; defaults to "Send anyway". */
  readonly bypassLabel?: string;
  /** Called with only the findings the user left enabled. */
  readonly onMaskSend: (findings: readonly Finding[]) => void | Promise<void>;
  readonly onSendAnyway: () => void | Promise<void>;
  readonly onCancel: () => void;
  /** Persist an exact value for this detector, then drop it from the review. */
  readonly onAlwaysAllow?: (finding: Finding) => void | Promise<void>;
}

export interface ReviewAskState {
  readonly protectedCount: number;
  readonly onReview: () => void;
  readonly onDismiss: () => void;
}

export interface ToastState {
  readonly id: number;
  readonly text: string;
  readonly action?: { readonly label: string; readonly onClick: () => void };
}

export interface OverlayState {
  readonly review: ReviewState | null;
  readonly reviewAsk: ReviewAskState | null;
  readonly toasts: readonly ToastState[];
  /** Findings detected live while typing (empty → chip hidden). */
  readonly live: readonly Finding[];
}

/** Same value+type always share one placeholder, so they're toggled as a group. */
function findingKey(f: Finding): string {
  return `${f.type}\u0000${f.value}`;
}

interface FindingGroup {
  readonly key: string;
  readonly type: FindingType;
  readonly value: string;
  readonly detector: string;
  readonly count: number;
  readonly sample: Finding;
}

function groupFindings(findings: readonly Finding[]): FindingGroup[] {
  const groups = new Map<string, FindingGroup>();
  for (const f of findings) {
    const key = findingKey(f);
    const existing = groups.get(key);
    if (existing) groups.set(key, { ...existing, count: existing.count + 1 });
    else groups.set(key, { key, type: f.type, value: f.value, detector: f.detector, count: 1, sample: f });
  }
  return [...groups.values()];
}

function explainFor(detector: string, M: Messages): string {
  const table = M.explain as Record<string, string>;
  return table[detector] ?? M.explain.fallback;
}

function truncate(value: string, max = 40): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function coverageTone(file: FileCoverage): 'ok' | 'warn' | 'danger' {
  if (file.status !== 'scanned') return 'warn';
  if (!file.maskable && file.findingCount > 0) return 'danger';
  return 'ok';
}

function coverageLabel(file: FileCoverage, M: Messages): string {
  if (file.status !== 'scanned') return M.overlay.attachmentNotScanned;
  if (!file.maskable && file.findingCount > 0) return M.overlay.attachmentFoundNotMasked;
  return M.overlay.attachmentScanned;
}

function ReviewCard({ t, review }: { t: Theme; review: ReviewState }) {
  const M = i18n();
  const total = review.findings.length;
  const groups = useMemo(() => groupFindings(review.findings), [review.findings]);
  const [disabledKeys, setDisabledKeys] = useState<ReadonlySet<string>>(new Set());
  const [allowedKeys, setAllowedKeys] = useState<ReadonlySet<string>>(new Set());
  const [openWhy, setOpenWhy] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const visibleGroups = useMemo(
    () => groups.filter((g) => !allowedKeys.has(g.key)),
    [groups, allowedKeys],
  );
  const enabledFindings = useMemo(
    () =>
      review.findings.filter(
        (f) => !disabledKeys.has(findingKey(f)) && !allowedKeys.has(findingKey(f)),
      ),
    [review.findings, disabledKeys, allowedKeys],
  );
  const preview = useMemo(
    () => maskText(review.text, enabledFindings).masked,
    [review.text, enabledFindings],
  );
  const cannotRewrite = (review.attachments ?? []).some(
    (file) => file.status === 'scanned' && !file.maskable && file.findingCount > 0,
  );

  const toggle = (key: string) => {
    if (busy) return;
    setDisabledKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const run = (action: () => void | Promise<void>) => {
    if (busy) return;
    setBusy(true);
    void Promise.resolve(action()).finally(() => setBusy(false));
  };

  return (
    <div
      role="dialog"
      aria-label={M.overlay.reviewAriaLabel}
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
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>
          {total > 0 ? M.overlay.sensitiveFound(total) : M.overlay.coverageTitle}
        </span>
      </div>

      {review.attachments && review.attachments.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            marginBottom: visibleGroups.length > 0 || review.text ? 10 : 14,
          }}
        >
          {review.attachments.map((file, i) => (
            <div
              key={`${file.name}:${i}`}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}
            >
              <span
                title={file.name}
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: 12,
                  color: t.text,
                }}
              >
                {file.name}
              </span>
              <Badge t={t} tone={coverageTone(file)}>
                {coverageLabel(file, M)}
              </Badge>
            </div>
          ))}
          {cannotRewrite ? (
            <p style={{ margin: '6px 0 0', fontSize: 11.5, lineHeight: 1.45, color: t.textSub }}>
              {M.overlay.attachmentCannotMask}
            </p>
          ) : null}
        </div>
      )}

      <div
        style={{
          display: visibleGroups.length > 0 ? 'flex' : 'none',
          flexDirection: 'column',
          gap: 6,
          marginBottom: 10,
          maxHeight: 220,
          overflow: 'auto',
        }}
      >
        {visibleGroups.map((g) => {
          const on = !disabledKeys.has(g.key);
          const whyOpen = openWhy === g.key;
          return (
            <div key={g.key} style={{ padding: '4px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {cannotRewrite ? null : (
                  <Checkbox t={t} on={on} onChange={() => toggle(g.key)} />
                )}
                <Badge t={t} tone={on ? 'warn' : 'neutral'}>
                  {M.type[g.type]}
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
              <div style={{ display: 'flex', gap: 10, margin: '4px 0 0 26px' }}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setOpenWhy(whyOpen ? null : g.key)}
                  style={{
                    background: 'none',
                    border: 0,
                    padding: 0,
                    color: t.blueText,
                    fontSize: 11,
                    cursor: busy ? 'default' : 'pointer',
                  }}
                >
                  {M.overlay.why}
                </button>
                {review.onAlwaysAllow && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (busy) return;
                      setBusy(true);
                      void Promise.resolve(review.onAlwaysAllow?.(g.sample))
                        .then(() => {
                          const next = new Set(allowedKeys);
                          next.add(g.key);
                          setAllowedKeys(next);
                          const remaining = groups.filter((x) => !next.has(x.key));
                          if (remaining.length === 0) {
                            void Promise.resolve(review.onMaskSend([])).finally(() =>
                              setBusy(false),
                            );
                            return;
                          }
                          setBusy(false);
                        })
                        .catch(() => setBusy(false));
                    }}
                    style={{
                      background: 'none',
                      border: 0,
                      padding: 0,
                      color: t.blueText,
                      fontSize: 11,
                      cursor: busy ? 'default' : 'pointer',
                    }}
                  >
                    {M.overlay.alwaysAllow}
                  </button>
                )}
              </div>
              {whyOpen && (
                <p
                  style={{
                    margin: '6px 0 0 26px',
                    fontSize: 11.5,
                    lineHeight: 1.45,
                    color: t.textSub,
                  }}
                >
                  {explainFor(g.detector, M)} {M.explain.localNote}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {review.text ? (
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
      ) : null}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button t={t} variant="ghost" sm disabled={busy} onClick={review.onCancel}>
          {M.overlay.cancel}
        </Button>
        {review.canSendAnyway && (
          <Button
            t={t}
            variant="outline"
            sm
            disabled={busy}
            onClick={() => run(review.onSendAnyway)}
          >
            {review.bypassLabel ?? M.overlay.sendAnyway}
          </Button>
        )}
        {cannotRewrite ? null : (
          <Button
            t={t}
            variant="primary"
            sm
            disabled={busy}
            onClick={() => run(() => review.onMaskSend(enabledFindings))}
          >
            {review.confirmLabel ?? M.overlay.maskAndSend}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Compact live indicator: what will be caught if the user sends right now. */
function LiveChip({ t, findings }: { t: Theme; findings: readonly Finding[] }) {
  const M = i18n();
  const counts = new Map<FindingType, number>();
  for (const f of findings) counts.set(f.type, (counts.get(f.type) ?? 0) + 1);
  const summary = [...counts.entries()]
    .map(([type, n]) => (n > 1 ? `${M.type[type]} ×${n}` : M.type[type]))
    .join(', ');

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

function ReviewAsk({ t, ask }: { t: Theme; ask: ReviewAskState }) {
  const M = i18n();
  return (
    <div
      role="dialog"
      aria-label={M.overlay.reviewAskCta}
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
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>
        {M.overlay.reviewAskTitle(ask.protectedCount)}
      </p>
      <p style={{ margin: '8px 0 0', fontSize: 12, color: t.textSub, lineHeight: 1.45 }}>
        {M.overlay.reviewAskBody}
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
        <Button t={t} variant="ghost" sm onClick={ask.onDismiss}>
          {M.overlay.reviewAskDismiss}
        </Button>
        <Button t={t} variant="primary" sm onClick={ask.onReview}>
          {M.overlay.reviewAskCta}
        </Button>
      </div>
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
      {state.review && (
        <ReviewCard
          key={state.review.sessionId ?? 'review'}
          t={t}
          review={state.review}
        />
      )}
      {!state.review && state.reviewAsk && <ReviewAsk t={t} ask={state.reviewAsk} />}
      {!state.review && !state.reviewAsk && state.live.length > 0 && (
        <LiveChip t={t} findings={state.live} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
        {state.toasts.map((toast) => (
          <Toast key={toast.id} t={t} toast={toast} />
        ))}
      </div>
    </div>
  );
}

import type { Finding, FindingType } from '@/core/detection';
import { Badge, Button, FONT_MONO, useTheme, type Theme } from '@/ui';

export interface ReviewState {
  readonly findings: readonly Finding[];
  readonly masked: string;
  readonly canSendAnyway: boolean;
  readonly onMaskSend: () => void;
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
}

const TYPE_LABEL: Record<FindingType, string> = {
  email: 'email',
  phone: 'phone',
  api_key: 'API key',
  token: 'token',
  private_key: 'private key',
  credit_card: 'card',
  ip_address: 'IP',
  uuid: 'UUID',
};

function countByType(findings: readonly Finding[]): Array<[FindingType, number]> {
  const counts = new Map<FindingType, number>();
  for (const f of findings) counts.set(f.type, (counts.get(f.type) ?? 0) + 1);
  return [...counts.entries()];
}

function ReviewCard({ t, review }: { t: Theme; review: ReviewState }) {
  const total = review.findings.length;
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
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>
          {total} sensitive {total === 1 ? 'value' : 'values'} found
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {countByType(review.findings).map(([type, n]) => (
          <Badge key={type} t={t} tone="warn">
            {TYPE_LABEL[type]}
            {n > 1 ? ` ×${n}` : ''}
          </Badge>
        ))}
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
        {review.masked}
      </pre>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button t={t} variant="ghost" sm onClick={review.onCancel}>
          Cancel
        </Button>
        {review.canSendAnyway && (
          <Button t={t} variant="outline" sm onClick={review.onSendAnyway}>
            Send anyway
          </Button>
        )}
        <Button t={t} variant="primary" sm onClick={review.onMaskSend}>
          Mask &amp; send
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
      {state.review && <ReviewCard t={t} review={state.review} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
        {state.toasts.map((toast) => (
          <Toast key={toast.id} t={t} toast={toast} />
        ))}
      </div>
    </div>
  );
}

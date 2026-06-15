import type { Finding, FindingType } from '@/core/detection';

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

function ReviewCard({ review }: { review: ReviewState }) {
  const total = review.findings.length;
  return (
    <div className="card" role="dialog" aria-label="Offsend review">
      <p className="card__title">
        <span className="card__brand">Offsend</span> — {total} sensitive{' '}
        {total === 1 ? 'value' : 'values'} found
      </p>
      <ul className="findings">
        {countByType(review.findings).map(([type, n]) => (
          <li key={type} className="chip">
            {TYPE_LABEL[type]}
            {n > 1 ? ` ×${n}` : ''}
          </li>
        ))}
      </ul>
      <pre className="preview">{review.masked}</pre>
      <div className="actions">
        <button className="btn" onClick={review.onCancel}>
          Cancel
        </button>
        {review.canSendAnyway && (
          <button className="btn" onClick={review.onSendAnyway}>
            Send anyway
          </button>
        )}
        <button className="btn btn--primary" onClick={review.onMaskSend}>
          Mask &amp; send
        </button>
      </div>
    </div>
  );
}

export function Overlay({ state }: { state: OverlayState }) {
  return (
    <div className="layer">
      {state.review && <ReviewCard review={state.review} />}
      <div className="toasts">
        {state.toasts.map((t) => (
          <div key={t.id} className="toast">
            <span>{t.text}</span>
            {t.action && (
              <button className="toast__action" onClick={t.action.onClick}>
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

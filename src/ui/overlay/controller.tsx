import { createRoot } from 'react-dom/client';
import { Overlay, type OverlayState, type ReviewState } from './Overlay';
import { OVERLAY_CSS } from './styles';

export interface ToastAction {
  readonly label: string;
  readonly onClick: () => void;
}

export interface OverlayController {
  showReview(review: ReviewState): void;
  hideReview(): void;
  toast(text: string, action?: ToastAction): void;
  destroy(): void;
}

/**
 * Mounts the overlay React tree inside a Shadow DOM root so the host site's
 * styles can't break our UI and ours can't leak into the page. Returns an
 * imperative controller the interceptor drives.
 */
export function mountOverlay(doc: Document = document): OverlayController {
  const host = doc.createElement('div');
  host.id = 'offsend-overlay-host';
  doc.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  const style = doc.createElement('style');
  style.textContent = OVERLAY_CSS;
  shadow.appendChild(style);
  const container = doc.createElement('div');
  shadow.appendChild(container);

  const root = createRoot(container);
  let state: OverlayState = { review: null, toasts: [] };
  let nextToastId = 1;
  const timers = new Set<ReturnType<typeof setTimeout>>();

  const render = () => root.render(<Overlay state={state} />);
  const set = (next: Partial<OverlayState>) => {
    state = { ...state, ...next };
    render();
  };

  render();

  return {
    showReview(review) {
      set({ review });
    },
    hideReview() {
      set({ review: null });
    },
    toast(text, action) {
      const id = nextToastId++;
      set({ toasts: [...state.toasts, { id, text, action }] });
      const timer = setTimeout(
        () => {
          set({ toasts: state.toasts.filter((t) => t.id !== id) });
          timers.delete(timer);
        },
        action ? 8000 : 3500,
      );
      timers.add(timer);
    },
    destroy() {
      timers.forEach(clearTimeout);
      timers.clear();
      root.unmount();
      host.remove();
    },
  };
}

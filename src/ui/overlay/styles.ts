/** CSS injected into the overlay's shadow root. Scoped — cannot leak in or out. */
export const OVERLAY_CSS = `
:host { all: initial; }
* { box-sizing: border-box; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }

.layer {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  max-width: 360px;
}

.card {
  width: 360px;
  background: #fff;
  color: #1f2328;
  border: 1px solid #d0d7de;
  border-radius: 12px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
  padding: 14px 16px;
}

.card__title { font-size: 14px; font-weight: 600; margin: 0 0 8px; }
.card__brand { color: #6e7781; font-weight: 500; }

.findings { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 10px; padding: 0; list-style: none; }
.chip {
  font-size: 12px;
  background: #fff1e6;
  color: #9a4a00;
  border-radius: 999px;
  padding: 2px 9px;
}

.preview {
  font-size: 12px;
  background: #f6f8fa;
  border: 1px solid #eaeef2;
  border-radius: 8px;
  padding: 8px;
  margin: 0 0 12px;
  max-height: 96px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.actions { display: flex; gap: 8px; justify-content: flex-end; }
.btn {
  font-size: 13px;
  border-radius: 8px;
  padding: 6px 12px;
  border: 1px solid #d0d7de;
  background: #fff;
  color: #1f2328;
  cursor: pointer;
}
.btn:hover { background: #f3f4f6; }
.btn--primary { background: #1f6feb; border-color: #1f6feb; color: #fff; }
.btn--primary:hover { background: #1a5fd0; }

.toasts { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #1f2328;
  color: #fff;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.22);
}
.toast__action {
  background: transparent;
  border: 0;
  color: #7cc0ff;
  font-weight: 600;
  cursor: pointer;
  font-size: 13px;
}

@media (prefers-color-scheme: dark) {
  .card { background: #1c1f24; color: #e6edf3; border-color: #30363d; }
  .preview { background: #0d1117; border-color: #30363d; }
  .btn { background: #21262d; color: #e6edf3; border-color: #30363d; }
  .btn:hover { background: #2a3037; }
}
`;

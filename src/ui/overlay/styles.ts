/**
 * Minimal reset injected into the overlay's shadow root. Visual styling lives
 * inline on the React tree (theme-token driven), so this only isolates the host
 * from the page and sets a sane font baseline.
 */
export const OVERLAY_CSS = `
:host { all: initial; }
* {
  box-sizing: border-box;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
}
`;

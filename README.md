# Offsend Browser Extension

[![CI](https://github.com/offsend/browser-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/offsend/browser-extension/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

Detects sensitive values (API keys, tokens, PII, …) **locally** in what you type
into web AI interfaces (ChatGPT, Claude, …) and lets you mask them **before** the
text leaves your device — with reversible Restore.

> Content never leaves the device. The network is used only for license/updates.

The architecture is summarized in [Architecture](#architecture) below.

## Status

**Phase 0 — skeleton & core** (done):

- WXT + TypeScript (strict) + React, Vitest, ESLint/Prettier, CI.
- `DetectionEngine` contract + `TsEngine` (regex detectors: emails, keys, tokens,
  private keys, cards w/ Luhn, IPs, UUIDs, phones).
- Deterministic masking (`{{TYPE_N}}`) with reversible mapping.
- `SiteAdapter` contract + registry + cascading selector resolver (soft degradation).
- Typed storage layer with schema migrations.

**Phase 1 — v1 P0** (in progress):

- Adapters: **ChatGPT** and **Claude** (declarative selector cascades).
- Capture-phase submit interception (Enter + Send button) with re-entrancy guard;
  text scanned at submit so typed & pasted content are both covered.
- Interceptor orchestrator: `warn` (review overlay) / `auto-mask` / `block`.
- Overlay UI in **Shadow DOM**: review banner, masked preview, toasts.
- Restore: AES-GCM encrypted, TTL'd mapping vault in the background (IndexedDB)
  + local in-page restore.
- Popup shows adapter health incl. **degraded** state; Options page for policy.

Drag&drop / file upload, native messaging, Firefox/Edge builds land in Phase 1.x.

## Architecture

```
src/
  core/
    adapters/    # SiteAdapter contract + registry
    detection/   # DetectionEngine (TS engine now, WASM later)
    masking/     # placeholders + mapping
    selectors/   # cascading resolver + strategies
    storage/     # typed layer + migrations
  entrypoints/   # background, content, popup (WXT)
tests/unit/      # engine, masking, selectors, storage, registry
```

Adding a new AI site = one adapter file + one line in `core/adapters/registry.ts`.

## Develop

```bash
npm install          # also runs `wxt prepare`
npm run dev          # Chrome dev build with HMR
npm run dev:firefox  # Firefox dev build
```

## Quality gates

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

`npm run test:e2e` runs local fixture flows for ChatGPT/Claude plus a network
assert that sensitive values are not sent in requests. Live-site canaries are
separate:

```bash
npm run test:canary
```

## Load unpacked (Chrome)

1. `npm run build`
2. Open `chrome://extensions`, enable Developer mode.
3. "Load unpacked" → select `.output/chrome-mv3`.

## Security

Found a vulnerability? Please follow [`SECURITY.md`](SECURITY.md) — do not open a
public issue for security reports.

## License

Licensed under the [Apache License 2.0](LICENSE).

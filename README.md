# Offsend for the Browser

[![CI](https://github.com/offsend/browser-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/offsend/browser-extension/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-v0.0.2-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/offsend/kaaoodakdpdbdjcbhdbcodfjpfaiaaig)

**Get it AI-ready before you hit send — right inside ChatGPT, Claude, Gemini,
DeepSeek, Perplexity, and Grok.**

Offsend already keeps your folders, files, and clipboard AI-ready on the Mac. Now
that same protection lives where you actually talk to AI: the browser. As you type
into a web AI chat, Offsend spots API keys, tokens, private keys, and personal data
**locally**, and lets you mask them **before** a single character leaves your device.
Changed your mind? One-click **Restore** brings the originals back.

> **Local-first by design.** Your prompts never leave the device for scanning. The
> network is used only for license, updates, and an optional anonymous "active
> install" ping (no content, no findings, no sites) — all verifiable with any
> network filter, and the ping is one toggle away from off.

```
No cloud account · No server-side scanning · No "trust us"
```

## Install

**[Add Offsend to Chrome](https://chromewebstore.google.com/detail/offsend/kaaoodakdpdbdjcbhdbcodfjpfaiaaig)** — available on the
[Chrome Web Store](https://chromewebstore.google.com/detail/offsend/kaaoodakdpdbdjcbhdbcodfjpfaiaaig).
Firefox and Edge builds are on the way.

Part of the [Offsend macOS app & CLI](https://offsend.io/) — same local-first
promise, same detectors, now in your AI chats.

## Supported sites

ChatGPT (chatgpt.com) · Claude (claude.ai) · Gemini (gemini.google.com) ·
DeepSeek (chat.deepseek.com) · Perplexity (perplexity.ai) · Grok (grok.com)

## Why you'll want it

- **Catch secrets before AI sees them.** Emails, phone numbers, API keys, tokens
  (JWT, Bearer, Slack, Stripe), private keys, database URLs with passwords, cards,
  IBANs, IPs, UUIDs, and high-entropy strings — detected the moment you hit send.
- **See findings as you type.** Sensitive values are underlined live in the
  composer, with a quiet chip summarising what will be masked on send.
- **Attachments are covered too.** Files added via the picker, drag-and-drop, or
  paste are scanned locally; masked copies replace the originals before the site
  ever sees them.
- **Your own rules.** Add custom regex detectors in Settings alongside the
  built-in set.
- **Mask, don't lose meaning.** Sensitive values become stable placeholders like
  `{{API_KEY_1}}`, so your prompt still reads clearly to the AI.
- **Reversible Restore.** Encrypted, time-limited mappings let you bring originals
  back — in the conversation and in the composer — the Offsend signature move.
- **Zero findings, zero friction.** Nothing sensitive in your text? Offsend stays
  out of your way completely.
- **Honest about coverage.** If a site changes its layout, Offsend tells you it's
  degraded instead of pretending you're protected.
- **Speaks your language.** UI is localised (English and Russian) based on the
  browser language.

## How it works

Offsend watches the way content actually leaves the page — typing, pasting,
Enter / Cmd+Enter, the Send button, and file attachments (picker, drag-and-drop,
paste) — and scans everything at submit time, all on your device:

1. You write or paste a prompt and press Enter (or click Send), or attach a file.
2. Offsend scans the text (and text-like files) locally for sensitive values.
3. Nothing found? It sends untouched.
4. Something found? You choose: **Mask**, **Send anyway**, or **Cancel** — or let
   auto-mask handle it with a quiet toast.
5. Masked values are saved as encrypted, TTL'd mappings so **Restore** can undo it.

Everything runs in the browser. Sensitive content is never uploaded for scanning —
the same promise as the desktop app, enforced by tests that assert nothing sensitive
hits the network.

## Architecture

```
src/
  core/
    adapters/    # SiteAdapter contract + registry (one file per AI site)
    badge/       # toolbar-icon traffic light (health → colour + tooltip)
    detection/   # DetectionEngine (TS engine now, shared WASM later)
    i18n/        # typed message catalogs (en, ru)
    interceptor/ # pure submit/file decisions (allow / auto-mask / review)
    masking/     # placeholders + reversible mapping
    messaging/   # content ↔ background protocol
    restore/     # encrypted TTL'd mapping vault (IndexedDB) + DOM restore
    selectors/   # cascading resolver with soft degradation
    storage/     # typed layer + schema migrations
    telemetry/   # optional anonymous "active install" ping
  entrypoints/   # background, content, popup, options (WXT)
  ui/            # shared components, Shadow-DOM overlay, live highlight
tests/
  unit/          # engine, masking, interceptor, selectors, storage, i18n, …
  e2e/           # Playwright: fixture flows, network assert, live canaries
```

Adding a new AI site is deliberately boring: one adapter file plus one line in
`core/adapters/registry.ts`. Each site is described by a **cascade of selector
strategies** (ARIA first, fragile selectors last) so layout changes degrade
gracefully instead of silently breaking.

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

`npm run test:e2e` runs local fixture flows for every supported site plus a network
assert that sensitive values are never sent in requests. Live-site canaries — which
catch real layout changes before users do — run separately:

```bash
npm run test:canary
```

## Load unpacked (Chrome)

1. `npm run build`
2. Open `chrome://extensions`, enable Developer mode.
3. "Load unpacked" → select `.output/chrome-mv3`.

## Telemetry

Offsend counts active installs and nothing else. When enabled (default, with an
opt-out in Settings → Privacy), the background worker sends at most one anonymous
ping per day to [TelemetryDeck](https://telemetrydeck.com/) (EU-hosted,
cookieless). The payload is only an app ID, a locally-hashed random id, and the
fixed event `app.alive` — never prompt content, findings, or which AI site you
use. The id is a random UUID stored on-device and SHA-256 hashed before it
leaves; TelemetryDeck hashes it again server-side. Counting is off entirely until
a public TelemetryDeck app ID is supplied at build time:

```bash
WXT_TELEMETRY_APP_ID=AAAA-BBBB-CCCC npm run build   # .env or a CI secret also work
```

## Security

Found a vulnerability? Please follow [`SECURITY.md`](SECURITY.md) — do not open a
public issue for security reports.

## License

Licensed under the [Apache License 2.0](LICENSE).

---

Part of [Offsend](https://offsend.io/)

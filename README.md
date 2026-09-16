# Offsend for the Browser

[![CI](https://github.com/offsend/browser-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/offsend/browser-extension/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-v0.2.2-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/offsend/kaaoodakdpdbdjcbhdbcodfjpfaiaaig)

**Get your prompts AI-ready before you hit send — right inside web AI chats.**

Offsend already keeps your folders, files, and clipboard AI-ready on the Mac. Now
that same protection lives where you actually talk to AI: the browser. As you type
into a web AI chat, Offsend spots API keys, tokens, private keys, and personal data
**locally**, and lets you mask them **before** a single character leaves your device.
Changed your mind? One-click **Restore** brings the originals back.

> **Local-first by design.** Scanning, masking, and Restore all run on your device.
> There is no Offsend account, no cloud scan API, and no prompt content in any
> network request. You can verify that — the source is public, and e2e tests assert
> secrets never appear in traffic.

```
No cloud account · No server-side scanning · No "trust us" — inspect the code
```

## Install

**[Add Offsend to Chrome](https://chromewebstore.google.com/detail/offsend/kaaoodakdpdbdjcbhdbcodfjpfaiaaig)** —
[Chrome Web Store](https://chromewebstore.google.com/detail/offsend/kaaoodakdpdbdjcbhdbcodfjpfaiaaig).
Firefox build is on the same release pipeline; see [Publishing](#publishing).

Part of the [Offsend macOS app & CLI](https://offsend.io/) — same local-first
promise, same idea, now in your AI chats.

## Trust at a glance

| Claim | Reality |
| --- | --- |
| Scans your prompts in the cloud? | **No.** Detection runs in the content script / extension process on your machine. |
| Needs an Offsend account? | **No.** Nothing to sign up for. |
| Sends findings / site names / prompt text? | **No.** E2e tests fail if a secret appears in any request (page or background). |
| Stores originals for Restore? | **Yes, locally.** Encrypted (AES-GCM) in IndexedDB, time-limited, never uploaded. |
| Talks to the network at all? | **Optionally.** At most one anonymous `app.alive` ping/day to TelemetryDeck (EU), opt-out in Settings → Privacy. Off entirely if no telemetry app ID was baked in at build time. |
| Broad browser permissions? | **No.** Only `storage`, `alarms`, and host access to the AI sites we support. |

**Verify yourself**

1. Read the source — start at [`wxt.config.ts`](wxt.config.ts) (permissions) and [`src/core/telemetry/`](src/core/telemetry/) (the only outbound client code).
2. Run `npm run test:e2e` — includes a network assert that sensitive values never leave in requests.
3. Point a network filter (Little Snitch, Proxyman, browser DevTools) at the extension; you should see either nothing or only `nom.telemetrydeck.com` with a tiny anonymous payload.

## Supported sites

chatgpt.com · claude.ai · gemini.google.com · chat.deepseek.com ·
perplexity.ai · grok.com · copilot.microsoft.com

Host permissions match this list exactly — Offsend does not request access to the
rest of the web. See [`wxt.config.ts`](wxt.config.ts).

## Why you'll want it

- **Catch secrets before AI sees them.** Emails, phones, API keys, tokens
  (JWT, Bearer, GitHub, Slack, Stripe, OpenAI, AWS), private keys, database URLs
  with passwords, cards (Luhn), IBANs, IPs, UUIDs, and high-entropy strings —
  scanned at send time. Full detector list: [`src/core/detection/detectors.ts`](src/core/detection/detectors.ts).
- **See findings as you type.** Sensitive values are underlined live in the
  composer, with a quiet chip summarising what will be masked on send.
- **Text-like attachments are covered.** Source, CSV, JSON, and other text files
  added via the picker, drag-and-drop, or paste are scanned locally; masked
  copies replace the originals. DOCX / XLSX / PPTX and text-based PDFs are
  extracted and scanned on device, but those files are not rewritten. Encrypted
  or image-only PDFs, images, and legacy `.doc` / `.xls` are **not** inspected
  — Offsend says so instead of pretending they were checked.
- **Your own rules.** Add custom regex detectors in Settings alongside the
  built-in set.
- **Optional Smart PII.** Off by default. On-device detection of person names,
  organizations, street addresses, and places that regex misses. Nothing is
  downloaded or uploaded.
- **Portable local policy.** Export or import mode, detectors, custom rules,
  trusted values, and the host allowlist as JSON. On/off and telemetry stay on
  the device. Not `.offsend.yml` yet.
- **Mask, don't lose meaning.** Sensitive values become stable placeholders like
  `{{API_KEY_1}}`, so your prompt still reads clearly to the AI.
- **Reversible Restore.** Encrypted, time-limited mappings bring originals back
  in the conversation automatically. Copy still uses placeholders — what the AI
  saw. Manual Restore still covers the composer.
- **Zero findings, zero friction.** Nothing sensitive? Offsend stays out of the way.
- **Honest about coverage.** If a site changes its layout, Offsend reports
  degraded health instead of pretending you're protected.
- **Speaks your language.** UI follows the browser language
  (en, de, es, fr, pt, ru).

## How it works

Offsend watches how content leaves the page — typing, pasting, Enter / Cmd+Enter,
the Send button, and file attachments — and scans at submit time, on device:

1. You write or paste a prompt and press Enter (or click Send), or attach a file.
2. Offsend scans the text (and text-like files) locally for sensitive values.
   Unsupported files are labelled not scanned so they never look protected.
3. Nothing found? It sends untouched.
4. Something found? You choose: **Mask**, **Send anyway**, or **Cancel** — or let
   auto-mask handle it with a quiet toast.
5. Masked values are saved as encrypted, TTL'd mappings so **Restore** can undo it.

Sensitive content is never uploaded for scanning. The same promise is enforced by
tests that assert nothing sensitive hits the network.

## Permissions (why each one)

Declared in [`wxt.config.ts`](wxt.config.ts):

| Permission | Why |
| --- | --- |
| `storage` | Settings, policy, and a random telemetry id (if telemetry is on). |
| `alarms` | Schedule the optional daily active-install ping. |
| Host access to supported AI sites only | Inject the content script, overlay, and live highlight on those chats. |
| `web_accessible_resources` → icon PNGs | Render the Offsend icon inside the on-page overlay. |

No `tabs`, no `<all_urls>`, no clipboard, no webRequest, no nativeMessaging,
no identity / OAuth. Firefox declares `data_collection_permissions.required: ['none']`.

## What stays on your device

| Data | Where | Notes |
| --- | --- | --- |
| Settings & masking policy | `browser.storage.local` | Under your control in Options. |
| Restore mappings (original ↔ placeholder) | IndexedDB, **AES-GCM encrypted** | TTL'd; capped (~100 batches); key created locally via WebCrypto. |
| Live prompt text / findings | Memory in the page / content script | Never persisted as plaintext for Restore; never sent to Offsend. |
| Optional anon install id | `browser.storage.local` | Random UUID, **SHA-256 hashed before any ping**; not linked to your identity. |

## Network profile

The extension code itself initiates network traffic only for optional telemetry:

| Destination | When | Payload |
| --- | --- | --- |
| `https://nom.telemetrydeck.com/v2/` | At most ~once per day, if telemetry is enabled **and** a public TelemetryDeck app ID was set at build time **and** the user has not opted out | `{ appID, clientUser: sha256(localUuid), type: "app.alive" }` |

- **Never included:** prompt text, findings, masked values, URLs of AI chats, site names.
- **Browser store updates** (Chrome / Firefox) are handled by the browser, not by Offsend application code.
- There is **no license server and no Offsend backend** in this repository.

Details and opt-out: [Telemetry](#telemetry).

## Architecture

```
src/
  core/
    adapters/    # SiteAdapter contract + registry (one file per AI site)
    badge/       # toolbar-icon traffic light (health → colour + tooltip)
    detection/   # DetectionEngine (TS engine now, shared WASM later)
    i18n/        # typed message catalogs (en, de, es, fr, pt, ru)
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
npm test             # Vitest unit + adapter tests
npm run test:e2e     # Playwright fixtures + network leak assert
npm run build
```

`npm run test:e2e` runs local fixture flows for every supported site plus a network
assert that sensitive values are never sent in requests. Live-site canaries — which
catch real layout changes before users do — run separately:

```bash
npm run test:canary
```

## Publishing

Store packages are produced with WXT:

```bash
npm run zip          # Chrome (MV3)
npm run zip:firefox  # Firefox (MV2) + sources zip for AMO review
npm run zip:all      # both
```

| Store | Artifact | Notes |
| --- | --- | --- |
| Chrome Web Store | `.output/offsend-extension-*-chrome.zip` | MV3 |
| Firefox Add-ons (AMO) | `.output/offsend-extension-*-firefox.zip` + `*-sources.zip` | MV2; sources zip required for review |

Automated submission (after secrets are configured): GitHub Actions → **Release** workflow.
Initialize store credentials once with `npx wxt submit init`.

**GitHub secrets for Firefox:** `FIREFOX_EXTENSION_ID` (`offsend@offsend.io`), `FIREFOX_JWT_ISSUER`, `FIREFOX_JWT_SECRET`

## Load unpacked (Chrome)

1. `npm run build`
2. Open `chrome://extensions`, enable Developer mode.
3. "Load unpacked" → select `.output/chrome-mv3`.

## Load unpacked (Firefox)

1. `npm run build:firefox`
2. Open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on…**
3. Select `.output/firefox-mv2/manifest.json`.

## Telemetry

Offsend counts active installs and nothing else. When enabled (default, with an
opt-out in Settings → Privacy), the background worker sends at most one anonymous
ping per day to [TelemetryDeck](https://telemetrydeck.com/) (EU-hosted,
cookieless). The payload is only an app ID, a locally-hashed random id, and the
fixed event `app.alive` — never prompt content, findings, or which AI site you
use. The id is a random UUID stored on-device and SHA-256 hashed before it
leaves; TelemetryDeck hashes it again server-side.

Counting is a hard no-op until a public TelemetryDeck app ID is supplied at build
time — no ID means **zero** telemetry requests:

```bash
WXT_TELEMETRY_APP_ID=AAAA-BBBB-CCCC npm run build   # .env or a CI secret also work
```

Implementation: [`src/core/telemetry/`](src/core/telemetry/).

## Security

Found a vulnerability? Please follow [`SECURITY.md`](SECURITY.md) — do not open a
public issue for security reports.

## License

Licensed under the [Apache License 2.0](LICENSE).

---

Part of [Offsend](https://offsend.io/) · Source: [github.com/offsend/browser-extension](https://github.com/offsend/browser-extension)

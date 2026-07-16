import { defineConfig } from 'wxt';

// Stable Firefox Add-ons ID — must not change after the first AMO submission.
const FIREFOX_EXTENSION_ID = 'offsend@offsend.io';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  // Icons are generated from a single source at src/assets/icon.png (1024×1024
  // PNG or SVG) into 16/32/48/128 and wired into the manifest automatically.
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  manifest: {
    // Name and description are localized via public/_locales/<lang>/messages.json.
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    homepage_url: 'https://offsend.io/',
    // Chrome ignores this block; Firefox AMO requires gecko.id and, for new
    // extensions, built-in data-collection consent (Firefox 140+).
    browser_specific_settings: {
      gecko: {
        id: FIREFOX_EXTENSION_ID,
        strict_min_version: '140.0',
        // AMO requires at least one `required` entry. `none` cannot be combined
        // with `optional` types (including technicalAndInteraction), so optional
        // anonymous telemetry is gated by the in-extension Settings toggle only.
        data_collection_permissions: {
          required: ['none'],
        },
      },
    },
    // Minimal host permissions: only the AI domains we actively support.
    host_permissions: [
      'https://chatgpt.com/*',
      'https://claude.ai/*',
      'https://gemini.google.com/*',
      'https://chat.deepseek.com/*',
      'https://www.perplexity.ai/*',
      'https://perplexity.ai/*',
      'https://grok.com/*',
      'https://www.grok.com/*',
    ],
    permissions: ['storage'],
    // The on-page overlay renders the extension icon, so it must be readable
    // from the supported host pages.
    web_accessible_resources: [
      {
        resources: ['icons/*.png'],
        matches: [
          'https://chatgpt.com/*',
          'https://claude.ai/*',
          'https://gemini.google.com/*',
          'https://chat.deepseek.com/*',
          'https://www.perplexity.ai/*',
          'https://perplexity.ai/*',
          'https://grok.com/*',
          'https://www.grok.com/*',
        ],
      },
    ],
  },
});

import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  // Icons are generated from a single source at src/assets/icon.png (1024×1024
  // PNG or SVG) into 16/32/48/128 and wired into the manifest automatically.
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  manifest: {
    name: 'Offsend — Mask Secrets Before Sending to AI',
    description:
      'Detect and mask API keys, tokens, private keys, emails, and personal data locally before sending prompts to ChatGPT, Claude, or Gemini.',
    // Minimal host permissions: only the AI domains we actively support.
    host_permissions: [
      'https://chatgpt.com/*',
      'https://claude.ai/*',
      'https://gemini.google.com/*',
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
        ],
      },
    ],
  },
});

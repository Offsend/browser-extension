import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Offsend',
    description:
      'Detect and mask sensitive data locally before it reaches web AI interfaces. Content never leaves your device.',
    // Minimal host permissions: only the AI domains we actively support.
    host_permissions: ['https://chatgpt.com/*', 'https://claude.ai/*'],
    permissions: ['storage'],
  },
});

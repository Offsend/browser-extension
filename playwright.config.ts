import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'fixtures',
      testMatch: /fixtures\.spec\.ts/,
    },
    {
      name: 'network',
      testMatch: /network\.spec\.ts/,
    },
    {
      name: 'canary',
      testMatch: /canary\.spec\.ts/,
      grepInvert: process.env.OFFSEND_CANARY ? undefined : /.*/,
    },
  ],
});

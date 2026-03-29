import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30000,
  retries: 0,
  workers: 1,
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  use: {
    headless: false,
    launchOptions: { slowMo: 50 },
    // Reuse single browser, close pages between tests
    contextOptions: { ignoreHTTPSErrors: true },
  },
});

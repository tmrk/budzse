import { defineConfig, devices } from '@playwright/test';

// Runs against the real production build, so routing is tested as GitHub Pages will serve it.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  // Visitors have already answered the cookie question, so the banner does not cover what other tests
  // click. The tests of the banner itself start from empty storage.
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'off',
    storageState: { cookies: [], origins: [{ origin: 'http://localhost:4173', localStorage: [{ name: 'budzse-analytics', value: 'denied' }] }] },
  },
  webServer: {
    command: 'node tests/e2e/static-server.mjs',
    port: 4173,
    reuseExistingServer: false,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'phone', use: { ...devices['iPhone 13 Mini'], defaultBrowserType: 'chromium', viewport: { width: 375, height: 667 } } },
  ],
});

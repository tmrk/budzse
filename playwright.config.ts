import { defineConfig, devices } from '@playwright/test';

// Runs against the real production build, so routing is tested as GitHub Pages will serve it.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173', trace: 'off' },
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

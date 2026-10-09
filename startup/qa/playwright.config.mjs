import { defineConfig, devices } from '@playwright/test';
import { BASE_URL, DIST, PORT } from './lib/config.mjs';
import { SERVE_SCRIPT } from './lib/server.mjs';

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.mjs$/,
  fullyParallel: true,
  workers: 4,
  reporter: [['line']],
  use: { baseURL: BASE_URL, reducedMotion: 'reduce' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `python3 "${SERVE_SCRIPT}" ${PORT} "${DIST}"`,
    url: `${BASE_URL}/`,
    reuseExistingServer: false,
  },
});

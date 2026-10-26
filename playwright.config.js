import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: { timeout: 30000 },
  use: {
    baseURL: 'http://127.0.0.1:4173/chess-web/',
    browserName: 'chromium',
    headless: true
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1',
    url: 'http://127.0.0.1:4173/chess-web/',
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  }
});

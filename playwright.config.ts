import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://127.0.0.1:4301', headless: true },
  webServer: {
    command: 'npm start -- --configuration e2e --host 127.0.0.1 --port 4301',
    url: 'http://127.0.0.1:4301',
    reuseExistingServer: false,
  },
  reporter: 'list',
});

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://localhost:4200', channel: 'chrome', trace: 'retain-on-failure' },
  webServer: { command: 'npm run start -- --port 4200', url: 'http://localhost:4200', reuseExistingServer: !process.env['CI'], timeout: 60000 }
});

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 10,
  timeout: 60000,
  reporter: [['html', { outputFolder: 'artifacts/reports/playwright' }]],
  globalSetup: './tests/global-setup.ts',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 30000,
    actionTimeout: 15000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Web server config - only auto-start in CI
  // For local development, manually run: npm run dev
  ...(process.env.CI ? {
    webServer: {
      command: 'npm run dev',
      url: process.env.BASE_URL || 'http://localhost:3000',
      reuseExistingServer: false,
      timeout: 120000,
    },
  } : {}),
});
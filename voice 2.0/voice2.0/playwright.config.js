import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for headed integration tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.BASE_URL || 'http://localhost:5052',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Timeout for each action
    actionTimeout: 10000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        headless: false, // Run headed by default
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          slowMo: 100, // Slow down by 100ms for better visibility
        }
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        headless: false,
        viewport: { width: 1920, height: 1080 },
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        headless: false,
        viewport: { width: 1920, height: 1080 },
      },
    },

    // Mobile viewports for responsive testing
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        headless: false,
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        headless: false,
      },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm start',
    url: 'http://localhost:5052',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

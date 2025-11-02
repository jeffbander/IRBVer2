# Playwright Testing Setup

## Overview

This directory contains Playwright end-to-end tests for the IRB Management System. The tests are configured for continuous integration and deployment (CI/CD) with automated authentication.

## Test Structure

- `auth.setup.ts` - Authentication setup that runs once before all tests
- `production-study-creation.spec.ts` - Production study creation workflow test
- Other test files...

## Authentication

The authentication system uses Playwright's storage state feature:

1. **Setup Phase**: `auth.setup.ts` logs in once and saves auth state to `playwright/.auth/user.json`
2. **Test Phase**: All tests reuse this stored auth state without re-logging in
3. **Benefits**: Faster tests, reduced rate limiting, consistent authentication

## Running Tests

### Local Development

```bash
# Run all tests (headless)
npx playwright test

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run specific test file
npx playwright test tests/production-study-creation.spec.ts

# Run with specific browser
npx playwright test --project=chromium

# Debug mode
npx playwright test --debug
```

### Production Testing

Tests run against production URL by default: `https://irb-management-system.vercel.app`

To test against a different environment:
```bash
BASE_URL=http://localhost:3000 npx playwright test
```

## CI/CD

GitHub Actions automatically runs tests on:
- Push to main branches (`main`, `working`, `AI-branch`, `001-research-study-management`)
- Pull requests to main branches

### Workflow Features

- Runs on Ubuntu latest
- Installs Playwright browsers automatically
- Uploads test reports and screenshots as artifacts
- Artifacts retained for 30 days (reports) or 7 days (screenshots/results)

### Viewing CI Results

1. Go to GitHub Actions tab
2. Click on the latest workflow run
3. Download artifacts:
   - `playwright-report` - HTML test report
   - `test-screenshots` - Screenshots (on failure)
   - `test-results` - Raw test results

## Configuration

### `playwright.config.ts`

Key settings:
- **Test directory**: `./tests`
- **Timeout**: 60 seconds per test
- **Retries**: 2 in CI, 1 locally
- **Workers**: 10 parallel workers
- **Browsers**: Chromium, Firefox, WebKit

### Authentication Setup

Projects configuration:
```typescript
projects: [
  {
    name: 'setup',
    testMatch: /.*\.setup\.ts/,
  },
  {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      storageState: 'playwright/.auth/user.json',
    },
    dependencies: ['setup'],
  },
  // ... other browsers
]
```

## Troubleshooting

### Tests failing with "Unauthorized" errors

1. Check if `playwright/.auth/user.json` exists
2. Delete the file and re-run tests to regenerate auth state
3. Verify production credentials are valid (`admin@test.com` / `admin123`)

### Rate limiting errors

- Production has `SKIP_RATE_LIMIT=true` environment variable set
- For local testing, add to your `.env.local`:
  ```
  SKIP_RATE_LIMIT=true
  ```

### Authentication state not loading

1. Clear browser storage: `npx playwright test --headed` and manually clear cookies
2. Delete `playwright/.auth/user.json`
3. Re-run the setup: `npx playwright test tests/auth.setup.ts`

## Best Practices

1. **Always use stored auth state** - Don't re-login in every test
2. **Use unique identifiers** - Protocol numbers should include timestamps
3. **Take screenshots** - Capture state before and after critical actions
4. **Wait for navigation** - Always wait for URL changes: `page.waitForURL('**/dashboard')`
5. **Check for errors** - Monitor console logs for JavaScript errors

## Adding New Tests

1. Create a new test file in `tests/`
2. Import Playwright test utilities:
   ```typescript
   import { test, expect } from '@playwright/test';
   ```
3. Tests automatically have access to authenticated state
4. No need to handle login logic

Example:
```typescript
test('my new test', async ({ page }) => {
  // You're already logged in!
  await page.goto('https://irb-management-system.vercel.app/studies');
  // ... your test logic
});
```

## Environment Variables

- `BASE_URL` - Target URL for tests (default: production)
- `CI` - Set by GitHub Actions, enables CI-specific behavior
- `SKIP_RATE_LIMIT` - Disable rate limiting (production only)

## Security

- Auth files are gitignored (`/playwright/.auth`)
- Production credentials are test-only accounts
- No sensitive data should be committed to the repository

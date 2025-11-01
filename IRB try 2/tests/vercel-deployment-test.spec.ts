import { test, expect } from '@playwright/test';

const DEPLOYMENT_URL = 'https://irb-management-system-dxcpuprmf-jeff-banders-projects.vercel.app';

test.describe('Vercel Deployment Tests', () => {
  test.use({
    viewport: { width: 1280, height: 720 },
    // Disable deployment protection for testing
    extraHTTPHeaders: {
      'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET || ''
    }
  });

  test('should load the login page', async ({ page }) => {
    console.log('Navigating to:', DEPLOYMENT_URL);

    const response = await page.goto(DEPLOYMENT_URL, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('Response status:', response?.status());
    console.log('Final URL:', page.url());

    // Take screenshot
    await page.screenshot({ path: 'vercel-deployment-01-initial-load.png', fullPage: true });

    // Check if we're on Vercel auth page or login page
    const title = await page.title();
    console.log('Page title:', title);

    const bodyText = await page.textContent('body');
    console.log('Page contains "Authentication":', bodyText?.includes('Authentication'));
    console.log('Page contains "Login":', bodyText?.includes('Login') || bodyText?.includes('login'));

    // Wait for either Vercel auth or app login
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'vercel-deployment-02-after-wait.png', fullPage: true });
  });

  test('should test login endpoint directly', async ({ request }) => {
    console.log('Testing login endpoint directly...');

    const response = await request.post(`${DEPLOYMENT_URL}/api/auth?action=login`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        email: 'admin@test.com',
        password: 'admin123'
      },
      failOnStatusCode: false
    });

    console.log('Login API Status:', response.status());
    console.log('Login API Headers:', await response.headers());

    const body = await response.text();
    console.log('Login API Response:', body.substring(0, 500));

    if (response.status() === 200) {
      console.log('✅ Login successful!');
      const json = JSON.parse(body);
      console.log('User:', json.user);
    } else if (response.status() === 401) {
      console.log('⚠️  401 Unauthorized - Likely Vercel deployment protection');
    } else if (response.status() === 500) {
      console.log('❌ 500 Server Error - Database or application error');
      console.log('Error details:', body);
    } else {
      console.log('⚠️  Unexpected status:', response.status());
    }
  });

  test('should check database health', async ({ request }) => {
    console.log('Checking database via health endpoint...');

    const response = await request.get(`${DEPLOYMENT_URL}/api/health`, {
      failOnStatusCode: false
    });

    console.log('Health API Status:', response.status());
    const body = await response.text();
    console.log('Health Response:', body);
  });

  test('should access login page and attempt login', async ({ page }) => {
    console.log('Attempting to access login page...');

    // Navigate to login page
    await page.goto(`${DEPLOYMENT_URL}/login`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.screenshot({ path: 'vercel-deployment-03-login-page.png', fullPage: true });

    console.log('Current URL:', page.url());
    console.log('Page title:', await page.title());

    // Try to find login form
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');

    const hasEmailInput = await emailInput.count() > 0;
    const hasPasswordInput = await passwordInput.count() > 0;
    const hasLoginButton = await loginButton.count() > 0;

    console.log('Has email input:', hasEmailInput);
    console.log('Has password input:', hasPasswordInput);
    console.log('Has login button:', hasLoginButton);

    if (hasEmailInput && hasPasswordInput && hasLoginButton) {
      console.log('Login form found! Attempting login...');

      await emailInput.fill('admin@test.com');
      await passwordInput.fill('admin123');
      await page.screenshot({ path: 'vercel-deployment-04-form-filled.png', fullPage: true });

      // Listen for network responses
      page.on('response', response => {
        if (response.url().includes('/api/auth')) {
          console.log('Auth API response:', response.status(), response.url());
        }
      });

      await loginButton.click();
      await page.waitForTimeout(3000);

      await page.screenshot({ path: 'vercel-deployment-05-after-login.png', fullPage: true });

      console.log('Post-login URL:', page.url());

      // Check for errors
      const errorText = await page.locator('text=/error|invalid|failed/i').first().textContent().catch(() => null);
      if (errorText) {
        console.log('Error message found:', errorText);
      }

      // Check if redirected to dashboard
      if (page.url().includes('/dashboard')) {
        console.log('✅ Successfully logged in and redirected to dashboard!');
      } else {
        console.log('⚠️  Not redirected to dashboard. Current URL:', page.url());
      }
    } else {
      console.log('⚠️  Login form not found. Might be on Vercel auth page.');

      // Check if it's Vercel authentication
      const bodyText = await page.textContent('body');
      if (bodyText?.includes('Vercel') && bodyText?.includes('Authentication')) {
        console.log('🔒 Vercel deployment protection is active');
      }
    }
  });
});

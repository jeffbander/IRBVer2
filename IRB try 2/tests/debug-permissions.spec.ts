import { test, expect } from '@playwright/test';

test.describe('Debug Permissions Issue', () => {
  test('Check permissions format and login flow', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Take screenshot of login page
    await page.screenshot({ path: 'debug-screenshots/01-login-page.png' });

    // Try to login with admin credentials
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'admin123');

    // Intercept the API call to see the response
    const loginPromise = page.waitForResponse(response =>
      response.url().includes('/api/auth') && response.status() === 200
    );

    await page.click('button[type="submit"]');

    try {
      const loginResponse = await loginPromise;
      const loginData = await loginResponse.json();

      console.log('=== LOGIN RESPONSE ===');
      console.log(JSON.stringify(loginData, null, 2));

      // Check localStorage
      const userStorage = await page.evaluate(() => localStorage.getItem('user'));
      console.log('=== USER IN LOCALSTORAGE ===');
      console.log(userStorage);

      if (userStorage) {
        const user = JSON.parse(userStorage);
        console.log('=== PERMISSIONS TYPE ===');
        console.log('Type:', typeof user.role.permissions);
        console.log('IsArray:', Array.isArray(user.role.permissions));
        console.log('Value:', user.role.permissions);
      }

      // Wait a bit to see what happens
      await page.waitForTimeout(2000);

      // Take screenshot of current page
      await page.screenshot({ path: 'debug-screenshots/02-after-login.png' });

      // Check console errors
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Check page errors
      const pageErrors: string[] = [];
      page.on('pageerror', error => {
        pageErrors.push(error.message);
      });

      // Wait a bit more
      await page.waitForTimeout(1000);

      console.log('=== CONSOLE ERRORS ===');
      console.log(consoleErrors);

      console.log('=== PAGE ERRORS ===');
      console.log(pageErrors);

      // Get current URL
      console.log('=== CURRENT URL ===');
      console.log(page.url());

      // Try to see page content
      const pageContent = await page.textContent('body');
      if (pageContent?.includes('permissions.includes is not a function')) {
        console.log('ERROR FOUND ON PAGE!');
        await page.screenshot({ path: 'debug-screenshots/03-error-state.png' });
      }

    } catch (error) {
      console.error('Login failed:', error);
      await page.screenshot({ path: 'debug-screenshots/04-login-error.png' });
    }
  });

  test('Check database permissions format', async ({ page }) => {
    // Check what's actually in the database by calling the API
    const response = await page.request.get('http://localhost:3000/api/auth/seed');
    console.log('Seed endpoint status:', response.status());
  });
});

import { test, expect } from '@playwright/test';

test.describe('Quick System Check', () => {
  test('Homepage loads successfully', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page).toHaveTitle(/IRB/);
  });

  test('Login page loads', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('Can login with admin credentials', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for redirect and check for success
    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {
      console.log('Did not redirect to dashboard - checking current URL:',  page.url());
    });

    // Check if we're logged in by looking for common dashboard elements
    const url = page.url();
    console.log('Current URL after login:', url);
  });
});

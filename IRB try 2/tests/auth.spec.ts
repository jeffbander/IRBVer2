import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Go directly to login page to avoid redirect timing issues
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
  });

  test('should show login page', async ({ page }) => {
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h1')).toContainText('Mount Sinai');
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL('/dashboard');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'wrong@email.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message div with correct styling
    await expect(page.locator('div.text-status-error')).toBeVisible({ timeout: 10000 });
  });

  test('should require email and password', async ({ page }) => {
    await page.click('button[type="submit"]');

    // Should stay on login page (HTML5 validation prevents submission)
    await expect(page).toHaveURL('/login');
    // Form should not have successfully submitted (still on login page)
    await expect(page.locator('h1')).toContainText('Mount Sinai');
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    await page.waitForURL('/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL('/dashboard');

    // Logout - click the logout icon (svg button)
    await page.click('button:has(svg path[d*="M17 16l4-4"])');

    // Should redirect to login
    await page.waitForURL('/login', { timeout: 10000 });
    await expect(page).toHaveURL('/login');
  });
});
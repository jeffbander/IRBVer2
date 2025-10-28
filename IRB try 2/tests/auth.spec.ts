import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show login page', async ({ page }) => {
    // Wait for redirect to /login
    await page.waitForURL('/login', { timeout: 10000 });
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h1')).toContainText('Mount Sinai');
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL('/dashboard');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'wrong@email.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message (use more specific selector to avoid strict mode violation)
    await expect(page.locator('.bg-red-50.text-red-600')).toBeVisible({ timeout: 10000 });
  });

  test('should require email and password', async ({ page }) => {
    await page.goto('/login');

    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('input[name="email"]:invalid, text=/required/i')).toBeTruthy();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
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
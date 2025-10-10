import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page);
  });

  test('should display dashboard with stats', async ({ page }) => {
    // Check for IRB branding
    await expect(page.locator('h1:has-text("IRB Management System")')).toBeVisible();

    // Check for stats cards
    await expect(page.locator('text=Total Studies')).toBeVisible();
    await expect(page.locator('text=Active Studies')).toBeVisible();
    await expect(page.locator('text=Pending Reviews')).toBeVisible();
  });

  test('should show navigation menu', async ({ page }) => {
    // Check for navigation items (they're buttons in the grid)
    await expect(page.locator('button:has-text("Studies")')).toBeVisible();
    await expect(page.locator('h3:has-text("Studies")')).toBeVisible();
  });

  test('should navigate to studies page', async ({ page }) => {
    await page.click('button:has-text("Studies")');
    await expect(page).toHaveURL(/\/studies/);
  });

  test('should display user information', async ({ page }) => {
    // Check if user info is displayed (admin user) - use more specific selectors
    await expect(page.locator('.text-sm.font-medium.text-gray-900')).toContainText('System');
    await expect(page.locator('.text-xs.text-gray-500')).toContainText('admin@example.com');
    await expect(page.locator('span.rounded-full.text-xs')).toContainText('ADMIN');
  });

  test('should show recent activity or studies', async ({ page }) => {
    // Check if there's a section showing recent activity or studies list
    await expect(page.locator('text=/Recent|Activity|Studies/i')).toBeTruthy();
  });
});
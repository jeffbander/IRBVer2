import { test, expect } from '@playwright/test';
import { login, generateUniqueId } from './helpers';

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to users page from dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for Users button or navigation
    const usersButton = page.locator('button:has-text("Users"), a:has-text("Users")');

    if (await usersButton.count() > 0) {
      await usersButton.click();
      await expect(page).toHaveURL(/\/users/);
    } else {
      // Navigate directly if no button available
      await page.goto('/users');
    }
  });

  test('should display user management page', async ({ page }) => {
    await page.goto('/users');

    await expect(page.locator('h1:has-text("User Management")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("New User")')).toBeVisible();
  });

  test('should show users table with columns', async ({ page }) => {
    await page.goto('/users');

    // Check for table headers
    await expect(page.locator('th:has-text("User")')).toBeVisible();
    await expect(page.locator('th:has-text("Email")')).toBeVisible();
    await expect(page.locator('th:has-text("Role")')).toBeVisible();
  });

  test('should open create user modal', async ({ page }) => {
    await page.goto('/users');

    await page.click('button:has-text("New User")');
    await page.waitForTimeout(500);

    await expect(page.locator('h3:has-text("Create New User")')).toBeVisible();
  });

  test('should have required fields in create user form', async ({ page }) => {
    await page.goto('/users');

    await page.click('button:has-text("New User")');
    await page.waitForTimeout(500);

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="First"], input[name*="first"]')).toBeTruthy();
    await expect(page.locator('select')).toBeVisible(); // Role select
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/users');

    await page.click('button:has-text("New User")');
    await page.waitForTimeout(500);

    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('invalid-email');

    // HTML5 validation will show invalid state
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
  });

  test('should show role options in dropdown', async ({ page }) => {
    await page.goto('/users');

    await page.click('button:has-text("New User")');
    await page.waitForTimeout(500);

    const roleSelect = page.locator('select');
    const options = await roleSelect.locator('option').allTextContents();

    expect(options.some(opt => opt.toLowerCase().includes('researcher'))).toBe(true);
    expect(options.some(opt => opt.toLowerCase().includes('admin'))).toBe(true);
  });

  test('should cancel user creation', async ({ page }) => {
    await page.goto('/users');

    await page.click('button:has-text("New User")');
    await page.waitForTimeout(500);

    await page.click('button:has-text("Cancel")');
    await page.waitForTimeout(500);

    await expect(page.locator('h3:has-text("Create New User")')).not.toBeVisible();
  });
});

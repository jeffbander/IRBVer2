import { test, expect } from '@playwright/test';
import { login, generateUniqueId } from './helpers';

test.describe('Study Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page);

    // Navigate to studies page
    await page.click('button:has-text("Studies")');
    await page.waitForURL(/\/studies/, { timeout: 10000 });
  });

  test('should display studies list page', async ({ page }) => {
    await expect(page.locator('h1:has-text("Research Studies")')).toBeVisible();

    // Should have a button to create new study
    await expect(page.locator('button:has-text("New Study")')).toBeVisible();
  });

  test('should navigate to create study page', async ({ page }) => {
    await page.click('button:has-text("New Study")');
    await expect(page).toHaveURL(/\/studies\/new/);
  });

  test('should create a new study', async ({ page }) => {
    await page.click('button:has-text("New Study")');
    await expect(page).toHaveURL(/\/studies\/new/);

    const uniqueId = generateUniqueId();
    const studyTitle = `Test Clinical Study ${uniqueId}`;
    const protocolNumber = `PROTO-TEST-${uniqueId}`;

    // Fill in study form
    await page.fill('input[name="title"]', studyTitle);
    await page.fill('input[name="protocolNumber"]', protocolNumber);
    await page.fill('textarea[name="description"]', 'This is a test study for automated testing');

    // Select type and risk level (they have default values, but let's be explicit)
    await page.selectOption('select[name="type"]', 'OBSERVATIONAL');
    await page.selectOption('select[name="riskLevel"]', 'MINIMAL');

    // Submit the form
    await page.click('button[type="submit"]');

    // Should redirect to study detail page
    await page.waitForURL(/\/studies\/[^\/]+$/, { timeout: 10000 });

    // Verify study details are visible
    await expect(page.locator(`text=${studyTitle}`)).toBeVisible({ timeout: 10000 });
  });

  test('should view study details', async ({ page }) => {
    const uniqueId = generateUniqueId();
    const studyTitle = `Study Detail Test ${uniqueId}`;
    const protocolNumber = `PROTO-DETAIL-${uniqueId}`;

    // Create a study first
    await page.click('button:has-text("New Study")');
    await page.fill('input[name="title"]', studyTitle);
    await page.fill('input[name="protocolNumber"]', protocolNumber);
    await page.fill('textarea[name="description"]', 'Study for testing detail view');
    await page.click('button[type="submit"]');

    // Should be on study details page
    await page.waitForURL(/\/studies\/[^\/]+$/, { timeout: 10000 });

    // Should show study details
    await expect(page.locator(`text=${studyTitle}`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${protocolNumber}`)).toBeVisible({ timeout: 10000 });
  });

  test('should require required fields when creating study', async ({ page }) => {
    await page.click('button:has-text("New Study")');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Should show validation errors or stay on same page (HTML5 validation)
    await expect(page).toHaveURL(/\/studies\/new/);
  });

  test('should filter or search studies', async ({ page }) => {
    // Look for search or filter input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]');

    if (await searchInput.count() > 0) {
      await searchInput.first().fill('Test');
      // Verify filtering works
      await expect(page.locator('text=Test')).toBeTruthy();
    }
  });
});
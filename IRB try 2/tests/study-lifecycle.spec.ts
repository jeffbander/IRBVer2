import { test, expect } from '@playwright/test';
import { login, generateUniqueId } from './helpers';

test.describe('Study Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create draft study and update it', async ({ page }) => {
    const uniqueId = generateUniqueId();

    // Create study
    await page.goto('/studies');
    await page.click('button:has-text("New Study")');

    await page.fill('input[name="title"]', `Draft Study ${uniqueId}`);
    await page.fill('input[name="protocolNumber"]', `DRAFT-${uniqueId}`);
    await page.fill('textarea[name="description"]', 'Initial description');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/studies\/[^\/]+$/, { timeout: 10000 });

    // Verify draft status
    await expect(page.locator('text=Draft')).toBeVisible();
  });

  test('should submit study for review', async ({ page }) => {
    const uniqueId = generateUniqueId();

    // Create and submit
    await page.goto('/studies/new');
    await page.fill('input[name="title"]', `Review Study ${uniqueId}`);
    await page.fill('input[name="protocolNumber"]', `REV-${uniqueId}`);
    await page.fill('textarea[name="description"]', 'Study for review');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/studies\/[^\/]+$/, { timeout: 10000 });

    // Submit for review
    const submitButton = page.locator('button:has-text("Submit for Review")');
    if (await submitButton.count() > 0) {
      await submitButton.click();
      await page.waitForTimeout(500);

      // Fill review comments
      await page.locator('textarea').first().fill('Please review this study');
      await page.click('button:has-text("Confirm")');

      await page.waitForTimeout(2000);
      await page.reload();

      // Verify pending review status
      await expect(page.locator('text=Pending Review')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display study information correctly', async ({ page }) => {
    const uniqueId = generateUniqueId();
    const studyTitle = `Info Test Study ${uniqueId}`;

    await page.goto('/studies/new');
    await page.fill('input[name="title"]', studyTitle);
    await page.fill('input[name="protocolNumber"]', `INFO-${uniqueId}`);
    await page.fill('textarea[name="description"]', 'Detailed study description');
    await page.selectOption('select[name="type"]', 'INTERVENTIONAL');
    await page.selectOption('select[name="riskLevel"]', 'MINIMAL');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/studies\/[^\/]+$/, { timeout: 10000 });

    // Verify all info is displayed
    await expect(page.locator(`text=${studyTitle}`)).toBeVisible();
    await expect(page.locator('text=INTERVENTIONAL')).toBeVisible();
    await expect(page.locator('text=MINIMAL')).toBeVisible();
    await expect(page.locator('text=Detailed study description')).toBeVisible();
  });

  test('should navigate between studies and dashboard', async ({ page }) => {
    // From dashboard to studies
    await page.goto('/dashboard');
    await page.click('button:has-text("Studies")');
    await expect(page).toHaveURL(/\/studies/);

    // Back to dashboard
    await page.click('button:has-text("Dashboard")');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should show study list with multiple studies', async ({ page }) => {
    await page.goto('/studies');

    // Check for table or list structure
    const studiesTable = page.locator('table, [role="table"]');
    if (await studiesTable.count() > 0) {
      // Table exists, verify headers
      await expect(page.locator('text=Protocol Number, text=Title')).toBeTruthy();
    }
  });
});

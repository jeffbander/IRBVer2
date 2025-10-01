import { test, expect } from '@playwright/test';
import { login, generateUniqueId } from './helpers';

test.describe('Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display export button on studies page', async ({ page }) => {
    await page.goto('/studies');

    const exportButton = page.locator('button:has-text("Export to CSV")');
    await expect(exportButton).toBeVisible({ timeout: 10000 });
  });

  test('should display export button on participants page', async ({ page }) => {
    // First create a study to navigate to
    const uniqueId = generateUniqueId();
    await page.goto('/studies/new');
    await page.fill('input[name="title"]', `Export Test Study ${uniqueId}`);
    await page.fill('input[name="protocolNumber"]', `EXP-${uniqueId}`);
    await page.fill('textarea[name="description"]', 'Study for export testing');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/studies\/[^\/]+$/, { timeout: 10000 });
    const studyId = page.url().split('/').pop()!;

    await page.goto(`/studies/${studyId}/participants`);

    const exportButton = page.locator('button:has-text("Export to CSV")');
    await expect(exportButton).toBeVisible({ timeout: 10000 });
  });

  test('should have download icon in export button', async ({ page }) => {
    await page.goto('/studies');

    const exportButton = page.locator('button:has-text("Export to CSV")');
    const icon = exportButton.locator('svg');

    await expect(icon).toBeVisible();
  });

  test('should trigger download when export button clicked on studies page', async ({ page }) => {
    await page.goto('/studies');

    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    await page.click('button:has-text("Export to CSV")');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('studies-export-');
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should export filtered studies', async ({ page }) => {
    await page.goto('/studies');

    // Apply status filter
    await page.selectOption('select:has-text("All Statuses")', 'DRAFT');
    await page.waitForTimeout(500);

    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export to CSV")');

    const download = await downloadPromise;
    expect(download).toBeTruthy();
  });

  test('should include current date in filename', async ({ page }) => {
    await page.goto('/studies');

    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export to CSV")');

    const download = await downloadPromise;
    const filename = download.suggestedFilename();
    const today = new Date().toISOString().split('T')[0];

    expect(filename).toContain(today);
  });
});

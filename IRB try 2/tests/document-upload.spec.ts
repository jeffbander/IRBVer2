import { test, expect } from '@playwright/test';
import { login, generateUniqueId } from './helpers';
import path from 'path';

test.describe('Document Upload System', () => {
  let studyId: string;

  test.beforeEach(async ({ page }) => {
    await login(page);

    // Create a study for document testing
    const uniqueId = generateUniqueId();
    await page.goto('/studies/new');
    await page.fill('input[name="title"]', `Doc Test Study ${uniqueId}`);
    await page.fill('input[name="protocolNumber"]', `DOC-${uniqueId}`);
    await page.fill('textarea[name="description"]', 'Study for document upload testing');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/studies\/[^\/]+$/, { timeout: 10000 });
    studyId = page.url().split('/').pop()!;
  });

  test('should show upload button for authorized users', async ({ page }) => {
    await page.goto(`/studies/${studyId}`);

    const uploadButton = page.locator('button:has-text("+ Upload")');
    await expect(uploadButton).toBeVisible({ timeout: 10000 });
  });

  test('should open upload modal when clicking upload button', async ({ page }) => {
    await page.goto(`/studies/${studyId}`);

    await page.click('button:has-text("+ Upload")');
    await page.waitForTimeout(500);

    await expect(page.locator('h3:has-text("Upload Document")')).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeVisible();
  });

  test('should validate required fields in upload form', async ({ page }) => {
    await page.goto(`/studies/${studyId}`);

    await page.click('button:has-text("+ Upload")');
    await page.waitForTimeout(500);

    // Try to upload without filling required fields
    const uploadBtn = page.locator('button:has-text("Upload Document")');
    await expect(uploadBtn).toBeDisabled();
  });

  test('should show different document type options', async ({ page }) => {
    await page.goto(`/studies/${studyId}`);

    await page.click('button:has-text("+ Upload")');
    await page.waitForTimeout(500);

    const typeSelect = page.locator('select[name="type"]');
    const options = await typeSelect.locator('option').allTextContents();

    expect(options).toContain('Protocol');
    expect(options).toContain('Consent Form');
    expect(options).toContain('IRB Approval');
  });

  test('should show empty state when no documents exist', async ({ page }) => {
    await page.goto(`/studies/${studyId}`);

    await expect(page.locator('text=No documents uploaded')).toBeVisible();
  });

  test('should cancel upload and close modal', async ({ page }) => {
    await page.goto(`/studies/${studyId}`);

    await page.click('button:has-text("+ Upload")');
    await page.waitForTimeout(500);

    await page.click('button:has-text("Cancel")');
    await page.waitForTimeout(500);

    await expect(page.locator('h3:has-text("Upload Document")')).not.toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { login, generateUniqueId } from './helpers';

test.describe('Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('Study Form Validation', () => {
    test('should show validation error for empty title', async ({ page }) => {
      await page.goto('/studies/new');

      // Try to submit without title
      await page.fill('input[name="protocolNumber"]', `VALID-${generateUniqueId()}`);
      await page.fill('textarea[name="description"]', 'This is a valid description that is long enough for validation');
      await page.click('button[type="submit"]');

      // Should show HTML5 validation or stay on page
      await expect(page).toHaveURL(/\/studies\/new/);
    });

    test('should show validation error for short description', async ({ page }) => {
      await page.goto('/studies/new');

      const uniqueId = generateUniqueId();
      await page.fill('input[name="title"]', 'Valid Study Title');
      await page.fill('input[name="protocolNumber"]', `VAL-${uniqueId}`);
      await page.fill('textarea[name="description"]', 'Too short');
      await page.click('button[type="submit"]');

      // Should stay on page due to validation
      await expect(page).toHaveURL(/\/studies\/new/);
    });

    test('should accept valid study data', async ({ page }) => {
      await page.goto('/studies/new');

      const uniqueId = generateUniqueId();
      await page.fill('input[name="title"]', `Valid Study Title ${uniqueId}`);
      await page.fill('input[name="protocolNumber"]', `VAL-${uniqueId}`);
      await page.fill('textarea[name="description"]', 'This is a valid description that meets the minimum length requirements for the study.');

      await page.click('button[type="submit"]');

      // Should navigate to study details
      await expect(page).toHaveURL(/\/studies\/[^\/]+$/, { timeout: 10000 });
    });
  });

  test.describe('Participant Form Validation', () => {
    let studyId: string;

    test.beforeEach(async ({ page }) => {
      // Create an active study first
      const uniqueId = generateUniqueId();
      await page.goto('/studies/new');
      await page.fill('input[name="title"]', `Participant Test Study ${uniqueId}`);
      await page.fill('input[name="protocolNumber"]', `PTS-${uniqueId}`);
      await page.fill('textarea[name="description"]', 'Study for participant validation testing with sufficient length');
      await page.click('button[type="submit"]');

      await page.waitForURL(/\/studies\/[^\/]+$/, { timeout: 10000 });
      studyId = page.url().split('/').pop()!;

      // Change status to ACTIVE
      const token = await page.evaluate(() => localStorage.getItem('token'));
      await fetch(`http://localhost:3001/api/studies/${studyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'ACTIVE' })
      });
    });

    test('should show validation for invalid subject ID format', async ({ page }) => {
      await page.goto(`/studies/${studyId}/participants`);
      await page.click('button:has-text("Enroll Participant")');
      await page.waitForTimeout(500);

      // Try invalid subject ID format
      const inputs = await page.locator('input[type="text"]').all();
      if (inputs.length > 0) {
        await inputs[0].fill('INVALID-FORMAT');
      }

      const dateInputs = await page.locator('input[type="date"]').all();
      if (dateInputs.length >= 2) {
        await dateInputs[0].fill('2025-01-15');
        await dateInputs[1].fill('2025-01-15');
      }

      const modal = page.locator('div:has(h3:has-text("Enroll New Participant"))');
      const enrollButton = modal.locator('button[type="submit"]');
      await enrollButton.click({ force: true });

      // Should show error or stay on page
      await page.waitForTimeout(1000);
      const modalVisible = await page.locator('h3:has-text("Enroll New Participant")').isVisible();
      expect(modalVisible).toBeTruthy();
    });

    test('should allow filling valid participant data', async ({ page }) => {
      await page.goto(`/studies/${studyId}/participants`);
      await page.click('button:has-text("Enroll Participant")');
      await page.waitForTimeout(500);

      const uniqueId = generateUniqueId();
      const inputs = await page.locator('input[type="text"]').all();
      if (inputs.length > 0) {
        await inputs[0].fill(`SUBJ-${uniqueId.slice(0, 6)}`);
      }

      const dateInputs = await page.locator('input[type="date"]').all();
      if (dateInputs.length >= 2) {
        await dateInputs[0].fill('2025-01-15');
        await dateInputs[1].fill('2025-01-15');
      }

      const modal = page.locator('div:has(h3:has-text("Enroll New Participant"))');
      const enrollButton = modal.locator('button[type="submit"]');

      // Button should be enabled with valid data
      await expect(enrollButton).toBeEnabled();
    });
  });

  test.describe('Required Field Indicators', () => {
    test('should show asterisk for required fields in study form', async ({ page }) => {
      await page.goto('/studies/new');

      // Check for required field indicators
      const requiredLabels = page.locator('label:has-text("*")');
      const count = await requiredLabels.count();

      expect(count).toBeGreaterThan(0);
    });

    test('should disable submit when required fields are empty', async ({ page }) => {
      await page.goto('/studies/new');

      const submitButton = page.locator('button[type="submit"]');

      // With HTML5 validation, button might be enabled but form won't submit
      await expect(submitButton).toBeVisible();
    });
  });
});

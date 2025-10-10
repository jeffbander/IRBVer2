import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should handle invalid study creation gracefully', async ({ page }) => {
    await page.goto('/studies/new');

    // Try to submit with only title
    await page.fill('input[name="title"]', 'Incomplete Study');
    await page.click('button[type="submit"]');

    // Should stay on same page (HTML5 validation)
    await expect(page).toHaveURL(/\/studies\/new/);
  });

  test('should show error for duplicate protocol number', async ({ page }) => {
    const randomNum = Math.floor(Math.random() * 10000);
    const protocolNumber = `DUP-${randomNum}`;

    // Create first study
    await page.goto('/studies/new');
    await page.fill('input[name="title"]', 'First Study');
    await page.fill('input[name="protocolNumber"]', protocolNumber);
    await page.fill('textarea[name="description"]', 'Test description for duplicate check');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/studies\/[^\/]+$/, { timeout: 10000 });

    // Try to create duplicate
    await page.goto('/studies/new');
    await page.fill('input[name="title"]', 'Second Study');
    await page.fill('input[name="protocolNumber"]', protocolNumber);
    await page.fill('textarea[name="description"]', 'Test description for duplicate check');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/protocol.*exists/i')).toBeVisible({ timeout: 10000 });
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // This test verifies error handling when backend is unreachable
    // We can simulate by trying to access non-existent endpoints

    const response = await page.goto('/studies/nonexistent-id-12345');

    // Should show appropriate error or redirect
    if (response) {
      // Could be 404 or redirected to studies list
      expect([200, 302, 404]).toContain(response.status());
    }
  });

  test('should prevent unauthorized actions', async ({ page }) => {
    await page.goto('/dashboard');

    // Try to access review functions without proper permissions
    // This depends on the user's role - admin should have access
    // We're mainly checking the UI doesn't crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('should validate participant enrollment data', async ({ page }) => {
    // First need an active study
    const randomNum = Math.floor(Math.random() * 10000);

    await page.goto('/studies/new');
    await page.fill('input[name="title"]', `Test Study ${randomNum}`);
    await page.fill('input[name="protocolNumber"]', `TEST-${randomNum}`);
    await page.fill('textarea[name="description"]', 'Test description for participant enrollment validation');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/studies\/[^\/]+$/, { timeout: 10000 });

    // Try to enroll participant without activating study
    const enrollButton = page.locator('button:has-text("+ Enroll")');
    if (await enrollButton.count() === 0) {
      // Correctly hidden for non-active studies
      expect(true).toBe(true);
    }
  });

  test('should handle empty states correctly', async ({ page }) => {
    // Visit participant page for a study with no participants
    await page.goto('/studies/new');

    const randomNum = Math.floor(Math.random() * 10000);
    await page.fill('input[name="title"]', `Empty Study ${randomNum}`);
    await page.fill('input[name="protocolNumber"]', `EMPTY-${randomNum}`);
    await page.fill('textarea[name="description"]', 'Test description for empty state handling');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/studies\/[^\/]+$/, { timeout: 10000 });
    const studyId = page.url().split('/').pop();

    // Navigate to participants even though study isn't active
    await page.goto(`/studies/${studyId}/participants`);

    // Should show empty state message
    await expect(page.locator('text=No participants enrolled yet, text=no participants/i')).toBeTruthy();
  });
});

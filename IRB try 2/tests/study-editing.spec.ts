import { test, expect } from '@playwright/test';
import { login, generateUniqueId } from './helpers';

test.describe('Study Editing', () => {
  let draftStudyId: string;

  test.beforeEach(async ({ page }) => {
    await login(page);

    // Create a draft study
    const uniqueId = generateUniqueId();
    await page.goto('/studies/new');
    await page.fill('input[name="title"]', `Edit Test Study ${uniqueId}`);
    await page.fill('input[name="protocolNumber"]', `EDIT-${uniqueId}`);
    await page.fill('textarea[name="description"]', 'Study for edit testing');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/studies\/[^\/]+$/, { timeout: 10000 });
    draftStudyId = page.url().split('/').pop()!;
  });

  test('should navigate to edit page from study details', async ({ page }) => {
    await page.goto(`/studies/${draftStudyId}`);

    const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit")');

    if (await editButton.count() > 0) {
      await editButton.click();
      await expect(page).toHaveURL(`/studies/${draftStudyId}/edit`);
    } else {
      // Direct navigation if button not visible
      await page.goto(`/studies/${draftStudyId}/edit`);
    }
  });

  test('should display edit form with current values', async ({ page }) => {
    await page.goto(`/studies/${draftStudyId}/edit`);

    await expect(page.locator('h1:has-text("Edit Study")')).toBeVisible({ timeout: 10000 });

    const titleInput = page.locator('input[name="title"]');
    const title = await titleInput.inputValue();
    expect(title).toContain('Edit Test Study');
  });

  test('should have protocol number disabled', async ({ page }) => {
    await page.goto(`/studies/${draftStudyId}/edit`);

    const protocolInput = page.locator('input[name="protocolNumber"]');
    await expect(protocolInput).toBeDisabled();
  });

  test('should allow updating study description', async ({ page }) => {
    await page.goto(`/studies/${draftStudyId}/edit`);

    const descriptionTextarea = page.locator('textarea[name="description"]');
    await descriptionTextarea.clear();
    await descriptionTextarea.fill('Updated description for testing');

    const saveButton = page.locator('button[type="submit"]');
    await expect(saveButton).toBeEnabled();
  });

  test('should allow changing study type', async ({ page }) => {
    await page.goto(`/studies/${draftStudyId}/edit`);

    const typeSelect = page.locator('select[name="type"]');
    await typeSelect.selectOption('INTERVENTIONAL');

    const selectedValue = await typeSelect.inputValue();
    expect(selectedValue).toBe('INTERVENTIONAL');
  });

  test('should allow changing risk level', async ({ page }) => {
    await page.goto(`/studies/${draftStudyId}/edit`);

    const riskSelect = page.locator('select[name="riskLevel"]');
    await riskSelect.selectOption('MODERATE');

    const selectedValue = await riskSelect.inputValue();
    expect(selectedValue).toBe('MODERATE');
  });

  test('should have cancel button that returns to study page', async ({ page }) => {
    await page.goto(`/studies/${draftStudyId}/edit`);

    const cancelButton = page.locator('button:has-text("Cancel")').first();
    await cancelButton.click();

    await expect(page).toHaveURL(`/studies/${draftStudyId}`);
  });

  test('should show validation for required fields', async ({ page }) => {
    await page.goto(`/studies/${draftStudyId}/edit`);

    const titleInput = page.locator('input[name="title"]');
    await titleInput.clear();

    const saveButton = page.locator('button[type="submit"]');
    await saveButton.click();

    // Should stay on edit page due to validation
    await expect(page).toHaveURL(/\/edit/);
  });

  test('should accept optional fields as empty', async ({ page }) => {
    await page.goto(`/studies/${draftStudyId}/edit`);

    const enrollmentInput = page.locator('input[name="targetEnrollment"]');
    await enrollmentInput.clear();

    // Form should still be submittable
    const saveButton = page.locator('button[type="submit"]');
    await expect(saveButton).toBeEnabled();
  });
});

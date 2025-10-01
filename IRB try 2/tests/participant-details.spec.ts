import { test, expect } from '@playwright/test';
import { login, generateUniqueId } from './helpers';

test.describe('Participant Details', () => {
  let studyId: string;

  test.beforeEach(async ({ page }) => {
    await login(page);

    // Create and activate a study for participant enrollment
    const uniqueId = generateUniqueId();

    await page.goto('/studies/new');
    await page.fill('input[name="title"]', `Participant Test Study ${uniqueId}`);
    await page.fill('input[name="protocolNumber"]', `PART-${uniqueId}`);
    await page.fill('textarea[name="description"]', 'Study for participant tests');
    await page.selectOption('select[name="type"]', 'INTERVENTIONAL');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/studies\/[^\/]+$/, { timeout: 10000 });

    studyId = page.url().split('/').pop()!;

    // Fast-track to ACTIVE
    const submitButton = page.locator('button:has-text("Submit for Review")');
    if (await submitButton.count() > 0) {
      await submitButton.click();
      await page.waitForTimeout(500);
      await page.locator('textarea').first().fill('Fast track');
      await page.click('button:has-text("Confirm")');
      await page.waitForTimeout(1500);
      await page.reload();
    }

    const approveButton = page.locator('button:has-text("Approve Study")');
    if (await approveButton.count() > 0) {
      await approveButton.click();
      await page.waitForTimeout(500);
      await page.locator('textarea').first().fill('Approved');
      await page.click('button:has-text("Confirm")');
      await page.waitForTimeout(1500);
      await page.reload();
    }

    const activateButton = page.locator('button:has-text("Activate Study")');
    if (await activateButton.count() > 0) {
      await activateButton.click();
      await page.waitForTimeout(500);
      await page.locator('textarea').first().fill('Activated');
      await page.click('button:has-text("Confirm")');
      await page.waitForTimeout(1500);
      await page.reload();
    }
  });

  test('should navigate to participant management page', async ({ page }) => {
    await page.goto(`/studies/${studyId}`);

    const viewParticipantsButton = page.locator('button:has-text("View All Participants")');
    await expect(viewParticipantsButton).toBeVisible({ timeout: 10000 });

    await viewParticipantsButton.click();
    await page.waitForURL(/\/studies\/[^\/]+\/participants/);

    await expect(page.locator('h1:has-text("Participant Management")')).toBeVisible();
  });

  test('should enroll a participant', async ({ page }) => {
    await page.goto(`/studies/${studyId}/participants`);

    // Click enroll button
    await page.click('button:has-text("Enroll Participant")');
    await page.waitForTimeout(500);

    // Fill enrollment form
    const uniqueSubject = `SUBJ-${generateUniqueId().substr(0, 8)}`;
    await page.fill('input[placeholder*="SUBJ"]', uniqueSubject);
    await page.fill('input[type="date"]', '2025-09-25');

    // Submit
    await page.click('button:has-text("Enroll Participant")');
    await page.waitForTimeout(2000);

    // Verify participant appears in list
    await expect(page.locator(`text=${uniqueSubject}`)).toBeVisible({ timeout: 10000 });
  });

  test('should display participant statistics', async ({ page }) => {
    await page.goto(`/studies/${studyId}/participants`);

    // Verify stat cards exist
    await expect(page.locator('text=Total Enrolled')).toBeVisible();
    await expect(page.locator('text=Screening')).toBeVisible();
    await expect(page.locator('text=Completed')).toBeVisible();
    await expect(page.locator('text=Withdrawn')).toBeVisible();
  });

  test('should view participant details', async ({ page }) => {
    await page.goto(`/studies/${studyId}/participants`);

    // Enroll a participant first
    await page.click('button:has-text("Enroll Participant")');
    await page.waitForTimeout(500);

    const uniqueSubject = `SUBJ-${generateUniqueId().substr(0, 8)}`;
    await page.fill('input[placeholder*="SUBJ"]', uniqueSubject);
    await page.fill('input[type="date"]', '2025-09-25');
    await page.click('button:has-text("Enroll Participant")');
    await page.waitForTimeout(2000);

    // Click view details
    const viewButton = page.locator('tr').filter({ hasText: uniqueSubject }).locator('a:has-text("View Details")');
    if (await viewButton.count() > 0) {
      await viewButton.click();
      await page.waitForURL(/\/studies\/[^\/]+\/participants\/[^\/]+/);

      // Verify participant detail page
      await expect(page.locator(`text=${uniqueSubject}`)).toBeVisible();
    }
  });
});

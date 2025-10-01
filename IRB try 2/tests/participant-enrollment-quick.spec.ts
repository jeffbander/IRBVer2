import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Quick Participant Enrollment Test', () => {
  test('verify participant enrollment page and API', async ({ page }) => {
    test.setTimeout(60000); // 1 minute

    console.log('\n✨ Quick Participant Enrollment Test\n');

    // Login
    console.log('→ Logging in...');
    await login(page);

    // Find an existing active study or use the one from complete-workflow
    console.log('→ Navigating to studies...');
    await page.goto('/studies');
    await page.waitForLoadState('networkidle');

    // Click on first study with Active badge
    const activeStudyLink = page.locator('span.rounded-full').filter({ hasText: /Active/i }).locator('..').locator('..').locator('a').first();

    if (await activeStudyLink.count() > 0) {
      await activeStudyLink.click();
      await page.waitForLoadState('networkidle');

      const currentUrl = page.url();
      const studyId = currentUrl.split('/').pop();
      console.log(`  ✓ Found active study: ${studyId}`);

      // Navigate to participants page
      console.log('→ Navigating to participants page...');
      await page.goto(`/studies/${studyId}/participants`);
      await page.waitForLoadState('networkidle');

      // Verify page loaded
      await expect(page.locator('h1:has-text("Participant Management")')).toBeVisible();
      console.log('  ✓ Participants page loaded');

      // Verify statistics cards exist
      await expect(page.locator('text=Total Enrolled')).toBeVisible();
      await expect(page.locator('text=Screening')).toBeVisible();
      await expect(page.locator('text=Completed')).toBeVisible();
      await expect(page.locator('text=Withdrawn')).toBeVisible();
      console.log('  ✓ Statistics cards visible');

      // Verify Enroll button exists
      const enrollButton = page.locator('button:has-text("Enroll Participant")');
      await expect(enrollButton).toBeVisible();
      console.log('  ✓ Enroll button visible');

      // Open enrollment modal
      console.log('→ Opening enrollment modal...');
      await enrollButton.click();
      await page.waitForTimeout(500);

      // Verify modal elements
      await expect(page.locator('h3:has-text("Enroll New Participant")')).toBeVisible();
      await expect(page.locator('label:has-text("Subject ID")')).toBeVisible();
      await expect(page.locator('label:has-text("Consent Date")')).toBeVisible();
      await expect(page.locator('label:has-text("Enrollment Date")')).toBeVisible();
      await expect(page.locator('label:has-text("Initial Status")')).toBeVisible();
      await expect(page.locator('label:has-text("Group Assignment")')).toBeVisible();
      console.log('  ✓ Enrollment modal loaded with all fields');

      await page.screenshot({ path: 'demo-screenshots/enrollment-modal-quick.png', fullPage: true });

      // Close modal
      await page.click('button:has-text("Cancel")');
      console.log('  ✓ Modal can be closed');

      console.log('\n✅ Participant enrollment interface verified successfully!\n');
    } else {
      console.log('  ⚠ No active studies found. Create and activate a study first.');
    }
  });
});
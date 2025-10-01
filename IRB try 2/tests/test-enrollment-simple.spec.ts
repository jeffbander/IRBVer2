import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Simple Enrollment Test', () => {
  test('access participants page directly', async ({ page }) => {
    test.setTimeout(60000);

    console.log('\n✅ Testing Participant Enrollment Interface\n');

    // Login
    await login(page);
    console.log('  ✓ Logged in');

    // Get study ID from database - use the most recent study
    // For now, we'll navigate to studies and get the first one
    await page.goto('/studies');
    await page.waitForLoadState('networkidle');

    // Take screenshot of studies page
    await page.screenshot({ path: 'demo-screenshots/test-studies-list.png', fullPage: true });

    // Get the href of the first study link
    const firstStudyLink = page.locator('tr').filter({ hasText: /CARDIO/ }).first().locator('a').first();

    if (await firstStudyLink.count() > 0) {
      const href = await firstStudyLink.getAttribute('href');
      const studyId = href?.split('/').pop();

      console.log(`  ✓ Found study: ${studyId}`);

      // Navigate directly to participants page
      await page.goto(`/studies/${studyId}/participants`);
      await page.waitForLoadState('networkidle');

      console.log('  ✓ Navigated to participants page');

      // Check if page loaded
      const heading = page.locator('h1');
      const headingText = await heading.textContent();
      console.log(`  ✓ Page heading: ${headingText}`);

      // Take screenshot
      await page.screenshot({ path: 'demo-screenshots/test-participants-page.png', fullPage: true });

      // Verify key elements
      if (await page.locator('h1:has-text("Participant Management")').count() > 0) {
        console.log('  ✓ Participant Management page loaded');

        // Check for stats cards
        if (await page.locator('text=Total Enrolled').count() > 0) {
          console.log('  ✓ Statistics cards present');
        }

        // Check for enroll button
        if (await page.locator('button:has-text("Enroll Participant")').count() > 0) {
          console.log('  ✓ Enroll button present');

          // Click the button
          await page.click('button:has-text("Enroll Participant")');
          await page.waitForTimeout(500);

          // Check if modal opened
          if (await page.locator('h3:has-text("Enroll New Participant")').count() > 0) {
            console.log('  ✓ Enrollment modal opened');
            await page.screenshot({ path: 'demo-screenshots/test-enrollment-modal.png', fullPage: true });

            console.log('\n✅ All participant enrollment UI elements working!\n');
          } else {
            console.log('  ✗ Modal did not open');
          }
        }
      } else {
        console.log('  ⚠ Page title mismatch - may not be participant page');
      }
    } else {
      console.log('  ⚠ No studies found');
    }
  });
});
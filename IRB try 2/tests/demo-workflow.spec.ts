import { test, expect } from '@playwright/test';
import { login, generateUniqueId } from './helpers';

test.describe('Complete Admin Workflow Demo', () => {
  test('admin creates user, study, and manages data', async ({ page }) => {
    // Step 1: Login as admin
    console.log('Step 1: Logging in as admin...');
    await login(page);
    await expect(page).toHaveURL('/dashboard');
    await page.screenshot({ path: 'demo-screenshots/01-dashboard.png' });

    // Step 2: Create a new user (researcher)
    console.log('Step 2: Creating a new user...');

    // First check if Users button is available
    const usersButton = page.locator('button:has-text("Users")');
    if (await usersButton.count() > 0) {
      await usersButton.click();
      await page.waitForURL(/\/users/);
      await page.screenshot({ path: 'demo-screenshots/02-users-page.png' });

      // If there's a create user form, fill it
      const createUserButton = page.locator('button:has-text("New User"), button:has-text("Add User")');
      if (await createUserButton.count() > 0) {
        await createUserButton.click();
        await page.fill('input[name="email"]', 'researcher@test.com');
        await page.fill('input[name="firstName"]', 'Jane');
        await page.fill('input[name="lastName"]', 'Researcher');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.screenshot({ path: 'demo-screenshots/03-user-created.png' });
        console.log('✓ User created');
      } else {
        console.log('⚠ No create user form found, moving to studies');
        await page.goto('/dashboard');
      }
    } else {
      console.log('⚠ Users page not accessible, continuing with studies');
    }

    // Step 3: Navigate to Studies
    console.log('Step 3: Navigating to studies...');
    await page.goto('/dashboard');
    await page.click('button:has-text("Studies")');
    await page.waitForURL(/\/studies/);
    await page.screenshot({ path: 'demo-screenshots/04-studies-list.png' });

    // Step 4: Create a new study
    console.log('Step 4: Creating a new study...');
    await page.click('button:has-text("New Study")');
    await page.waitForURL(/\/studies\/new/);

    const uniqueId = generateUniqueId();
    // Fill in the study form
    await page.fill('input[name="title"]', 'Clinical Trial for Diabetes Treatment');
    await page.fill('input[name="protocolNumber"]', `CT-DIAB-${uniqueId}`);
    await page.fill('textarea[name="description"]',
      'A randomized, double-blind, placebo-controlled study to evaluate the efficacy and safety of a new diabetes medication in adults with Type 2 Diabetes Mellitus.'
    );

    // Select study type
    await page.selectOption('select[name="type"]', 'INTERVENTIONAL');

    // Select risk level
    await page.selectOption('select[name="riskLevel"]', 'MODERATE');

    // Fill in enrollment target
    const enrollmentInput = page.locator('input[name="targetEnrollment"]');
    if (await enrollmentInput.count() > 0) {
      await enrollmentInput.fill('150');
    }

    // Fill in dates
    const startDateInput = page.locator('input[name="startDate"]');
    if (await startDateInput.count() > 0) {
      await startDateInput.fill('2025-01-15');
    }

    const endDateInput = page.locator('input[name="endDate"]');
    if (await endDateInput.count() > 0) {
      await endDateInput.fill('2026-12-31');
    }

    await page.screenshot({ path: 'demo-screenshots/05-study-form-filled.png' });

    // Submit the study
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/studies\/[^\/]+$/, { timeout: 10000 });
    await page.screenshot({ path: 'demo-screenshots/06-study-created.png' });
    console.log('✓ Study created');

    // Step 5: Explore the study details page
    console.log('Step 5: Exploring study details...');

    // Check if there are tabs or sections
    const studyTitle = page.locator('text=Clinical Trial for Diabetes Treatment');
    await expect(studyTitle).toBeVisible();

    const protocolNumber = page.locator('text=CT-DIAB-2025-001');
    await expect(protocolNumber).toBeVisible();

    // Step 6: Try to add participants if the UI allows
    console.log('Step 6: Checking for participant enrollment...');

    const enrollButton = page.locator('button:has-text("Enroll"), button:has-text("Add Participant")');
    if (await enrollButton.count() > 0) {
      await enrollButton.click();

      // Fill participant form if available
      const participantIdInput = page.locator('input[name="participantId"], input[name="subjectId"]');
      if (await participantIdInput.count() > 0) {
        await participantIdInput.fill('SUBJ-001');

        const consentDateInput = page.locator('input[name="consentDate"]');
        if (await consentDateInput.count() > 0) {
          await consentDateInput.fill('2025-01-20');
        }

        await page.click('button[type="submit"]');
        await page.screenshot({ path: 'demo-screenshots/07-participant-enrolled.png' });
        console.log('✓ Participant enrolled');
      }
    } else {
      console.log('⚠ No participant enrollment form found');
    }

    // Step 7: Try to upload documents if available
    console.log('Step 7: Checking for document upload...');

    const documentsTab = page.locator('button:has-text("Documents"), a:has-text("Documents")');
    if (await documentsTab.count() > 0) {
      await documentsTab.click();
      await page.screenshot({ path: 'demo-screenshots/08-documents-section.png' });
      console.log('✓ Documents section accessed');
    }

    // Step 8: Check for review/approval workflow
    console.log('Step 8: Checking review workflow...');

    const reviewTab = page.locator('button:has-text("Review"), a:has-text("Review")');
    if (await reviewTab.count() > 0) {
      await reviewTab.click();
      await page.screenshot({ path: 'demo-screenshots/09-review-section.png' });
      console.log('✓ Review section accessed');
    }

    // Step 9: Go back to studies list to see the created study
    console.log('Step 9: Returning to studies list...');
    await page.goto('/studies');
    await page.waitForURL(/\/studies$/);

    // Verify our study appears in the list
    await expect(page.locator('text=Clinical Trial for Diabetes Treatment')).toBeVisible();
    await page.screenshot({ path: 'demo-screenshots/10-study-in-list.png' });
    console.log('✓ Study visible in list');

    // Step 10: Check dashboard stats
    console.log('Step 10: Checking dashboard stats...');
    await page.goto('/dashboard');
    await page.screenshot({ path: 'demo-screenshots/11-final-dashboard.png' });

    console.log('\n✅ Complete workflow demo finished!');
    console.log('Screenshots saved to demo-screenshots/ directory');
  });
});
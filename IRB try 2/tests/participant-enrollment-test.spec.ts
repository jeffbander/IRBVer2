import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Participant Enrollment Tests', () => {
  let authToken: string;
  let studyId: string;

  test.beforeAll(async ({ request }) => {
    // Login and get auth token
    const loginResponse = await request.post(`${BASE_URL}/api/auth?action=login`, {
      data: {
        email: 'admin@example.com',
        password: 'admin123'
      }
    });

    const loginData = await loginResponse.json();
    authToken = loginData.token;

    // Create a new study for testing
    const randomNum = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
    const studyResponse = await request.post(`${BASE_URL}/api/studies`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        title: 'Participant Enrollment Test Study',
        protocolNumber: `ENROLL-${randomNum}`, // Valid format: ABC-1234
        type: 'INTERVENTIONAL',
        description: 'Test study for participant enrollment functionality',
        riskLevel: 'MINIMAL'
      }
    });

    const study = await studyResponse.json();
    studyId = study.id;
    console.log('Created test study:', studyId);
  });

  test('Step 1: Should show error when trying to enroll in non-active study', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Login
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');

    // Wait for form to be ready and submit
    await page.waitForTimeout(1000);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 30000 });

    // Go to study details
    await page.goto(`${BASE_URL}/studies/${studyId}/participants`);
    await page.waitForLoadState('networkidle');

    // Try to click Enroll button (should not be visible for non-active studies)
    const enrollButton = page.locator('button:has-text("Enroll")').first();
    const isVisible = await enrollButton.isVisible();

    console.log('Enroll button visible on non-active study:', isVisible);
    expect(isVisible).toBe(false); // Should not be visible for DRAFT status
  });

  test('Step 2: Activate the study through workflow', async ({ page, request }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Login
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.waitForTimeout(1000);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 30000 });

    // Go to study details
    await page.goto(`${BASE_URL}/studies/${studyId}`);
    await page.waitForLoadState('networkidle');

    // Submit for review
    const submitButton = page.locator('button:has-text("Submit for Review")');
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(500);

      // Confirm submission (may have modal)
      const confirmButton = page.locator('button:has-text("Confirm")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      await page.waitForTimeout(1000);
      console.log('Study submitted for review');
    }

    // Approve the study (admin has permission)
    await page.reload();
    await page.waitForLoadState('networkidle');

    const approveButton = page.locator('button:has-text("Approve Study")');
    if (await approveButton.isVisible()) {
      await approveButton.click();
      await page.waitForTimeout(500);

      const confirmButton = page.locator('button:has-text("Confirm")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      await page.waitForTimeout(1000);
      console.log('Study approved');
    }

    // Activate the study
    await page.reload();
    await page.waitForLoadState('networkidle');

    const activateButton = page.locator('button:has-text("Activate Study")');
    if (await activateButton.isVisible()) {
      await activateButton.click();
      await page.waitForTimeout(500);

      const confirmButton = page.locator('button:has-text("Confirm")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      await page.waitForTimeout(1000);
      console.log('Study activated');
    }

    // Verify study is now ACTIVE
    const statusBadge = page.locator('span:has-text("Active")');
    await expect(statusBadge).toBeVisible();
    console.log('Study is now ACTIVE');
  });

  test('Step 3: Enroll participant in active study', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Login
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.waitForTimeout(1000);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 30000 });

    // Go to participants page
    await page.goto(`${BASE_URL}/studies/${studyId}/participants`);
    await page.waitForLoadState('networkidle');

    // Click Enroll button
    const enrollButton = page.locator('button:has-text("Enroll")').first();
    await expect(enrollButton).toBeVisible();
    await enrollButton.click();
    await page.waitForTimeout(500);

    // Fill enrollment form
    const modal = page.locator('text=Enroll New Participant').locator('..');
    await expect(modal).toBeVisible();

    console.log('Enrollment modal opened');

    // Fill Subject ID
    await page.fill('input[placeholder*="SUBJ"]', 'SUBJ-TEST-001');
    console.log('Filled Subject ID');

    // Fill Consent Date
    const consentDateInput = page.locator('label:has-text("Consent Date")').locator('..').locator('input[type="date"]');
    await consentDateInput.fill('2024-01-15');
    console.log('Filled Consent Date');

    // Fill Enrollment Date
    const enrollmentDateInput = page.locator('label:has-text("Enrollment Date")').locator('..').locator('input[type="date"]');
    await enrollmentDateInput.fill('2024-01-20');
    console.log('Filled Enrollment Date');

    // Fill Site (optional)
    const siteInput = page.locator('input[placeholder*="Hospital"]');
    if (await siteInput.isVisible()) {
      await siteInput.fill('Test Site - Main Hospital');
      console.log('Filled Site');
    }

    // Fill Notes (optional)
    const notesTextarea = page.locator('textarea[placeholder*="note"]');
    if (await notesTextarea.isVisible()) {
      await notesTextarea.fill('Test enrollment notes');
      console.log('Filled Notes');
    }

    // Submit enrollment
    const enrollParticipantButton = page.locator('button:has-text("Enroll Participant")');
    await enrollParticipantButton.click();

    // Wait for response
    await page.waitForTimeout(2000);

    // Check if enrollment succeeded
    const errorMessage = page.locator('text=error').or(page.locator('text=Error'));
    const hasError = await errorMessage.isVisible();

    if (hasError) {
      const errorText = await errorMessage.textContent();
      console.log('ERROR:', errorText);
      throw new Error(`Enrollment failed: ${errorText}`);
    }

    // Verify participant appears in list
    await page.waitForTimeout(1000);
    const participantRow = page.locator('text=SUBJ-TEST-001');
    await expect(participantRow).toBeVisible();

    console.log('✅ Participant enrolled successfully!');
  });

  test('Step 4: Verify participant cannot be enrolled twice', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Login
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.waitForTimeout(1000);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 30000 });

    // Go to participants page
    await page.goto(`${BASE_URL}/studies/${studyId}/participants`);
    await page.waitForLoadState('networkidle');

    // Try to enroll same participant again
    await page.click('button:has-text("Enroll")');
    await page.waitForTimeout(500);

    await page.fill('input[placeholder*="SUBJ"]', 'SUBJ-TEST-001'); // Same ID
    await page.fill('label:has-text("Consent Date")>>.. input[type="date"]', '2024-01-15');
    await page.fill('label:has-text("Enrollment Date")>>.. input[type="date"]', '2024-01-20');

    await page.click('button:has-text("Enroll Participant")');
    await page.waitForTimeout(2000);

    // Should show error about duplicate
    const errorMessage = page.locator('text=already exists');
    await expect(errorMessage).toBeVisible();

    console.log('✅ Duplicate enrollment correctly prevented');
  });
});

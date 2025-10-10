import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe.configure({ mode: 'serial' }); // Run tests sequentially to share beforeAll setup

test.describe('Participant Enrollment - Simplified Tests', () => {
  let authToken: string;
  let studyId: string;

  test.beforeAll(async ({ request }) => {
    // Login via API to get token (server is already warmed up by global setup)
    const loginResponse = await request.post(`${BASE_URL}/api/auth?action=login`, {
      data: {
        email: 'admin@example.com',
        password: 'admin123'
      }
    });

    const loginData = await loginResponse.json();
    authToken = loginData.token;

    // Create and activate a test study
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    const studyResponse = await request.post(`${BASE_URL}/api/studies`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        title: 'Participant Test Study',
        protocolNumber: `PTEST-${randomNum}`,
        type: 'INTERVENTIONAL',
        description: 'Test study for participant enrollment UI testing',
        riskLevel: 'MINIMAL'
      }
    });

    const study = await studyResponse.json();
    studyId = study.id;

    // Activate the study through workflow
    await request.post(`${BASE_URL}/api/studies/${studyId}/review`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: { action: 'submit', comments: 'Submitting for review' }
    });

    await request.post(`${BASE_URL}/api/studies/${studyId}/review`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: { action: 'approve', comments: 'Approved' }
    });

    await request.post(`${BASE_URL}/api/studies/${studyId}/review`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: { action: 'activate', comments: 'Activated' }
    });

    console.log('Created and activated test study:', studyId);
  });

  test('Should enroll participant through UI', async ({ page }) => {
    // Login through UI to properly initialize Zustand state
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('✅ Logged in and redirected to dashboard');

    // Now navigate to participants page
    await page.goto(`${BASE_URL}/studies/${studyId}/participants`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Wait for page content to load
    await page.waitForSelector('text=Participant', { timeout: 10000 });

    // Click Enroll Participant button
    const enrollButton = page.locator('button', { hasText: 'Enroll Participant' }).first();
    await expect(enrollButton).toBeVisible({ timeout: 10000 });
    await enrollButton.click();
    await page.waitForTimeout(500);

    // Fill enrollment form
    await page.locator('input[placeholder*="SUBJ"]').fill('SUBJ-UI-001');

    // Fill dates by finding input after label
    await page.locator('label', { hasText: 'Consent Date' }).locator('xpath=following-sibling::input').fill('2024-01-15');
    await page.locator('label', { hasText: 'Enrollment Date' }).locator('xpath=following-sibling::input').fill('2024-01-20');

    // Submit enrollment - use .last() to get the submit button in the modal
    await page.locator('button:has-text("Enroll Participant")').last().click({ force: true });
    await page.waitForTimeout(2000);

    // Verify participant appears in list
    const participantRow = page.locator('text=SUBJ-UI-001');
    await expect(participantRow).toBeVisible({ timeout: 5000 });

    console.log('✅ Participant enrolled successfully through UI!');
  });

  test('Should prevent duplicate enrollment through UI', async ({ page }) => {
    // Login through UI
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // Navigate to participants page
    await page.goto(`${BASE_URL}/studies/${studyId}/participants`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.waitForSelector('text=Participant', { timeout: 10000 });

    // Try to enroll same participant again
    await page.locator('button:has-text("Enroll Participant")').first().click();
    await page.waitForTimeout(500);

    await page.locator('input[placeholder*="SUBJ"]').fill('SUBJ-UI-001'); // Same ID
    await page.locator('label', { hasText: 'Consent Date' }).locator('xpath=following-sibling::input').fill('2024-01-15');
    await page.locator('label', { hasText: 'Enrollment Date' }).locator('xpath=following-sibling::input').fill('2024-01-20');

    // Set up dialog handler to capture alert
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('already exists');
      await dialog.accept();
      console.log('✅ Duplicate enrollment correctly prevented through UI!');
    });

    await page.locator('button:has-text("Enroll Participant")').last().click({ force: true });
    await page.waitForTimeout(2000);
  });
});

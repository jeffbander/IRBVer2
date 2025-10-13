import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Participant Enrollment - Working Test', () => {
  let authToken: string;
  let studyId: string;

  test.beforeAll(async ({ request }) => {
    // Login via API (server is already warmed up by global setup)
    const loginResponse = await request.post(`${BASE_URL}/api/auth?action=login`, {
      data: {
        email: 'admin@example.com',
        password: 'admin123'
      }
    });

    const loginData = await loginResponse.json();
    authToken = loginData.token;
    console.log('✅ Logged in, got token');

    // Create study
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    const studyResponse = await request.post(`${BASE_URL}/api/studies`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        title: 'UI Test Study',
        protocolNumber: `UI-${randomNum}`,
        type: 'INTERVENTIONAL',
        description: 'Study for UI participant enrollment testing',
        riskLevel: 'MINIMAL'
      }
    });

    const study = await studyResponse.json();
    studyId = study.id;
    console.log('✅ Created study:', studyId);

    // Activate through workflow
    await request.post(`${BASE_URL}/api/studies/${studyId}/review`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: { action: 'submit', comments: 'Submitting' }
    });

    await request.post(`${BASE_URL}/api/studies/${studyId}/review`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: { action: 'approve', comments: 'Approved' }
    });

    await request.post(`${BASE_URL}/api/studies/${studyId}/review`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: { action: 'activate', comments: 'Activated' }
    });

    console.log('✅ Study activated');
  });

  test('Should enroll participant through UI with visible browser', async ({ page, context }) => {
    // Set storage state
    await context.addCookies([]);
    await page.goto(`${BASE_URL}/login`);

    await page.evaluate(({ token }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({
        id: 'test-user',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: {
          name: 'Administrator',
          permissions: ['manage_studies', 'manage_participants', 'view_reports']
        }
      }));
    }, { token: authToken });

    console.log('✅ Set localStorage with token');

    // Navigate to participants page
    await page.goto(`${BASE_URL}/studies/${studyId}/participants`);
    console.log('✅ Navigated to participants page');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for React to hydrate

    // Take screenshot to see what's on the page
    await page.screenshot({ path: 'test-results/participants-page.png', fullPage: true });
    console.log('✅ Took screenshot');

    // Look for any button with "Enroll" text (case insensitive)
    const enrollButtons = await page.locator('button').all();
    console.log(`Found ${enrollButtons.length} buttons on page`);

    for (const button of enrollButtons) {
      const text = await button.textContent();
      console.log(`Button text: "${text}"`);
    }

    // Try different selectors
    const enrollButton = page.locator('button').filter({ hasText: /enroll/i }).first();
    const isVisible = await enrollButton.isVisible().catch(() => false);

    console.log('Enroll button visible:', isVisible);

    if (!isVisible) {
      // Maybe we need to check study status first
      const pageContent = await page.content();
      console.log('Page contains "Active":', pageContent.includes('Active'));
      console.log('Page contains "ACTIVE":', pageContent.includes('ACTIVE'));
      console.log('Page contains "enroll":', pageContent.toLowerCase().includes('enroll'));
    }

    await expect(enrollButton).toBeVisible({ timeout: 10000 });
    await enrollButton.click();
    console.log('✅ Clicked Enroll button');

    await page.waitForTimeout(1000);

    // Fill form - target specific inputs by label
    await page.locator('input[placeholder*="SUBJ"]').fill('SUBJ-UI-TEST-001');

    // Fill consent date
    const consentDateInput = page.locator('label:has-text("Consent Date")').locator('..').locator('input[type="date"]');
    await consentDateInput.fill('2024-01-15');

    // Fill enrollment date
    const enrollmentDateInput = page.locator('label:has-text("Enrollment Date")').locator('..').locator('input[type="date"]');
    await enrollmentDateInput.fill('2024-01-20');

    // Click the submit button using force to bypass overlay check
    await page.locator('button:has-text("Enroll Participant")').last().click({ force: true });
    await page.waitForTimeout(3000);

    // Check for success
    const success = await page.locator('text=SUBJ-UI-TEST-001').isVisible().catch(() => false);
    expect(success).toBe(true);

    console.log('✅ Participant enrolled successfully through UI!');
  });
});

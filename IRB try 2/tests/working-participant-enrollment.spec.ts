import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Working Participant Enrollment Test', () => {
  let studyId: string;

  test.beforeAll(async ({ request }) => {
    // Create and activate study via API
    const loginResponse = await request.post(`${BASE_URL}/api/auth?action=login`, {
      data: { email: 'admin@test.com', password: 'admin123' }
    });
    const { token } = await loginResponse.json();

    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    const studyResponse = await request.post(`${BASE_URL}/api/studies`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: {
        title: 'Working Test Study',
        protocolNumber: `WORK-${randomNum}`,
        type: 'INTERVENTIONAL',
        description: 'Study for testing working participant enrollment flow',
        riskLevel: 'MINIMAL'
      }
    });

    const study = await studyResponse.json();
    studyId = study.id;

    // Activate study through workflow
    await request.post(`${BASE_URL}/api/studies/${studyId}/review`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: { action: 'submit', comments: 'Submit' }
    });
    await request.post(`${BASE_URL}/api/studies/${studyId}/review`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: { action: 'approve', comments: 'Approve' }
    });
    await request.post(`${BASE_URL}/api/studies/${studyId}/review`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: { action: 'activate', comments: 'Activate' }
    });

    console.log('✅ Created and activated study:', studyId);
  });

  test('Should successfully enroll a participant', async ({ page }) => {
    // Step 1: Login via UI
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for successful login
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('✅ Logged in successfully');

    // Step 2: Navigate directly to participants page
    await page.goto(`${BASE_URL}/studies/${studyId}/participants`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('✅ Navigated to participants page');

    // Step 3: Look for Enroll button and click it
    const enrollButton = page.locator('button').filter({ hasText: /enroll.*participant/i }).first();
    await enrollButton.waitFor({ state: 'visible', timeout: 10000 });
    await enrollButton.click();
    console.log('✅ Clicked Enroll button');

    await page.waitForTimeout(500);

    // Step 4: Fill the enrollment form
    await page.fill('input[placeholder*="SUBJ"]', 'SUBJ-WORK-001');
    console.log('✅ Filled subject ID');

    // Fill dates
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill('2024-01-15');
    await dateInputs.last().fill('2024-01-20');
    console.log('✅ Filled dates');

    // Step 5: Submit the form
    const submitButton = page.locator('button').filter({ hasText: /enroll.*participant/i }).last();
    await submitButton.click();
    console.log('✅ Clicked submit button');

    // Wait for enrollment to complete
    await page.waitForTimeout(3000);

    // Step 6: Verify participant appears in the list
    const participantEntry = page.locator('text=SUBJ-WORK-001');
    await expect(participantEntry).toBeVisible({ timeout: 10000 });

    console.log('✅ PARTICIPANT ENROLLED SUCCESSFULLY!');
  });
});

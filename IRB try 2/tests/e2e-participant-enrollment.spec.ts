import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('E2E Participant Enrollment', () => {
  let studyId: string;

  test.beforeAll(async ({ request }) => {
    // Create and activate study via API for speed
    const loginResponse = await request.post(`${BASE_URL}/api/auth?action=login`, {
      data: { email: 'admin@test.com', password: 'admin123' }
    });
    const { token } = await loginResponse.json();

    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    const studyResponse = await request.post(`${BASE_URL}/api/studies`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: {
        title: 'E2E Test Study',
        protocolNumber: `E2E-${randomNum}`,
        type: 'INTERVENTIONAL',
        description: 'End-to-end test for participant enrollment',
        riskLevel: 'MINIMAL'
      }
    });

    const study = await studyResponse.json();
    studyId = study.id;

    // Activate study
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

  test('Complete enrollment flow through UI', async ({ page }) => {
    // Step 1: Login through UI
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    console.log('✅ Logged in successfully');

    // Step 2: Navigate using UI (click links instead of direct navigation)
    await page.click('a[href="/studies"]');
    await page.waitForLoadState('networkidle');
    console.log('✅ Navigated to studies list');

    // Step 3: Find and click our study
    await page.click(`a[href="/studies/${studyId}"]`);
    await page.waitForLoadState('networkidle');
    console.log('✅ Opened study details');

    // Step 4: Go to participants tab
    await page.click('a[href*="participants"]');
    await page.waitForLoadState('networkidle');
    console.log('✅ Navigated to participants page');

    // Step 5: Click Enroll button
    const enrollBtn = page.locator('button').filter({ hasText: /enroll/i }).first();
    await enrollBtn.waitFor({ state: 'visible', timeout: 10000 });
    await enrollBtn.click();
    console.log('✅ Opened enrollment form');

    // Step 6: Fill and submit form
    await page.fill('input[placeholder*="SUBJ"]', 'SUBJ-E2E-001');

    // Find date inputs by their labels
    const consentDate = page.locator('input[type="date"]').first();
    const enrollDate = page.locator('input[type="date"]').last();

    await consentDate.fill('2024-01-15');
    await enrollDate.fill('2024-01-20');

    // Submit the form
    const submitBtn = page.locator('button').filter({ hasText: /enroll participant/i }).last();
    await submitBtn.click();

    // Wait for success
    await page.waitForTimeout(2000);

    // Verify participant appears in list
    await expect(page.locator('text=SUBJ-E2E-001')).toBeVisible({ timeout: 10000 });
    console.log('✅ Participant enrolled successfully!');
  });
});

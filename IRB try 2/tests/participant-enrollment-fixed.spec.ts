import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Participant Enrollment - Fixed', () => {
  let authToken: string;
  let studyId: string;

  test.beforeAll(async ({ request }) => {
    // Login via API
    const loginResponse = await request.post(`${BASE_URL}/api/auth?action=login`, {
      data: {
        email: 'admin@example.com',
        password: 'admin123'
      }
    });

    const loginData = await loginResponse.json();
    authToken = loginData.token;
    console.log('✅ Got auth token');

    // Create and activate study
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    const studyResponse = await request.post(`${BASE_URL}/api/studies`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        title: 'Fixed Test Study',
        protocolNumber: `FIX-${randomNum}`,
        type: 'INTERVENTIONAL',
        description: 'Study for testing participant enrollment with fixed auth',
        riskLevel: 'MINIMAL'
      }
    });

    const study = await studyResponse.json();
    studyId = study.id;

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

    console.log('✅ Created and activated study:', studyId);
  });

  test('Should enroll participant with proper auth setup', async ({ context, page }) => {
    // Add init script to set localStorage BEFORE any page loads
    await context.addInitScript(({ token }) => {
      // This runs before every page load in this context
      const user = {
        id: 'admin-id',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: {
          id: 'admin-role-id',
          name: 'Administrator',
          permissions: ['manage_studies', 'manage_participants', 'view_reports']
        }
      };

      // Set the Zustand persisted state
      localStorage.setItem('auth-storage', JSON.stringify({
        state: { token, user },
        version: 0
      }));
    }, { token: authToken });

    console.log('✅ Set init script for auth');

    // Now navigate - Zustand will load from localStorage on init
    await page.goto(`${BASE_URL}/studies/${studyId}/participants`);
    await page.waitForLoadState('networkidle');

    // Wait for page to load (should NOT redirect to login)
    await page.waitForTimeout(2000);

    // Take screenshot to see what we got
    await page.screenshot({ path: 'test-results/fixed-test-page.png', fullPage: true });

    // Check if we're on the right page (not redirected to login)
    const url = page.url();
    console.log('Current URL:', url);
    expect(url).toContain(`/studies/${studyId}/participants`);

    // Wait for any content to appear
    await page.waitForSelector('body', { timeout: 5000 });

    // Look for enroll button
    const enrollButton = page.locator('button').filter({ hasText: /enroll/i }).first();
    await expect(enrollButton).toBeVisible({ timeout: 10000 });

    console.log('✅ Found Enroll button!');
    await enrollButton.click();
    await page.waitForTimeout(500);

    // Fill enrollment form
    await page.locator('input[placeholder*="SUBJ"]').fill('SUBJ-FIXED-001');
    await page.locator('label:has-text("Consent Date")').locator('xpath=following-sibling::input').fill('2024-01-15');
    await page.locator('label:has-text("Enrollment Date")').locator('xpath=following-sibling::input').fill('2024-01-20');

    // Submit
    await page.locator('button:has-text("Enroll Participant")').last().click({ force: true });
    await page.waitForTimeout(2000);

    // Verify success
    await expect(page.locator('text=SUBJ-FIXED-001')).toBeVisible();
    console.log('✅ Participant enrolled successfully!');
  });
});

import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://irb-management-system.vercel.app';

test.describe('Production Study Creation Flow', () => {
  test('should create a study (authenticated)', async ({ page }) => {
    // Navigate to dashboard (auth already handled by setup)
    await page.goto(`${PRODUCTION_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    console.log('📍 Navigated to dashboard');
    await page.screenshot({ path: 'demo-screenshots/prod-03-dashboard.png', fullPage: true });

    // Verify we're on the dashboard
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    if (!currentUrl.includes('/dashboard')) {
      console.error('❌ Not on dashboard! Redirected to:', currentUrl);
      throw new Error('Dashboard failed to load - authentication may have failed');
    }

    console.log('✅ Dashboard loaded successfully');

    // Navigate directly to Studies page
    console.log('📋 Navigating to Studies...');
    await page.goto(`${PRODUCTION_URL}/studies`);
    await page.waitForLoadState('networkidle');

    console.log('✅ On Studies page');
    await page.screenshot({ path: 'demo-screenshots/prod-04-studies-list.png', fullPage: true });

    // Click Create Study button
    console.log('➕ Creating new study...');
    const createButton = page.locator('text=Create Study').or(page.locator('button:has-text("New Study")')).first();
    await createButton.click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'demo-screenshots/prod-05-create-study-modal.png', fullPage: true });

    // Fill study form
    console.log('📝 Filling study form...');

    // Generate unique protocol number
    const timestamp = Date.now();
    const protocolNumber = `PROD-${timestamp}`;

    await page.fill('input[name="protocolNumber"]', protocolNumber);
    await page.fill('input[name="title"]', 'Production Test Study - End-to-End Verification');
    await page.fill('textarea[name="description"]', 'This is a test study created via automated Playwright test to verify the production deployment is working correctly.');

    await page.screenshot({ path: 'demo-screenshots/prod-06-form-filled.png', fullPage: true });

    // Submit form
    console.log('💾 Submitting study...');
    const submitButton = page.locator('button[type="submit"]:has-text("Save as Draft")');
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click();

    // Wait for redirect to study detail page
    console.log('⏳ Waiting for redirect to study detail page...');
    await page.waitForURL(`**/studies/**`, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'demo-screenshots/prod-07-study-details.png', fullPage: true });

    // Verify we're on the study details page
    console.log('👁️ Verifying study details page...');
    console.log(`Current URL: ${page.url()}`);

    // Verify study details are visible
    await expect(page.locator(`text=${protocolNumber}`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Production Test Study')).toBeVisible();

    console.log('✅ Study created successfully!');
    console.log(`📋 Protocol Number: ${protocolNumber}`);

    // Navigate back to studies list to verify it appears there
    console.log('📋 Navigating back to studies list...');
    await page.goto(`${PRODUCTION_URL}/studies`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'demo-screenshots/prod-08-studies-list.png', fullPage: true });

    // Verify study appears in the list
    console.log('🔍 Verifying study appears in list...');
    const studyInList = page.locator(`text=${protocolNumber}`);
    await expect(studyInList).toBeVisible({ timeout: 10000 });

    console.log('✅ All tests passed! Production is working correctly.');
  });
});

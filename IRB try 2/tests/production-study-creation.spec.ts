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

    // Wait for New Study button to be visible (gives hydration time to complete)
    console.log('⏳ Waiting for Studies page to fully load...');
    const createButton = page.locator('button:has-text("New Study")');
    await createButton.waitFor({ state: 'visible', timeout: 10000 });

    console.log('✅ On Studies page');
    await page.screenshot({ path: 'demo-screenshots/prod-04-studies-list.png', fullPage: true });

    // Click Create Study button
    console.log('➕ Creating new study...');
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

    // Wait for redirect (may go to detail page or back to studies list)
    console.log('⏳ Waiting for form submission to complete...');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give time for any redirects

    await page.screenshot({ path: 'demo-screenshots/prod-07-after-submit.png', fullPage: true });

    // Navigate to studies list to verify creation
    console.log('📋 Navigating to studies list to verify creation...');
    await page.goto(`${PRODUCTION_URL}/studies`);
    await page.waitForLoadState('networkidle');

    // Wait for page to be fully loaded
    const studiesPageButton = page.locator('button:has-text("New Study")');
    await studiesPageButton.waitFor({ state: 'visible', timeout: 10000 });

    await page.screenshot({ path: 'demo-screenshots/prod-08-studies-list-verification.png', fullPage: true });

    // Verify study appears in the list
    console.log('🔍 Verifying study appears in list...');
    console.log(`   Looking for protocol number: ${protocolNumber}`);

    const studyInList = page.locator(`text=${protocolNumber}`);
    await expect(studyInList).toBeVisible({ timeout: 10000 });

    // Also verify the title appears
    const titleInList = page.locator('text=Production Test Study');
    await expect(titleInList).toBeVisible({ timeout: 5000 });

    console.log('✅ Study created successfully!');
    console.log(`📋 Protocol Number: ${protocolNumber}`);
    console.log('✅ Study verified in studies list');
    console.log('✅ All tests passed! Production study creation is working correctly.');
  });
});

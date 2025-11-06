import { test, expect } from '@playwright/test';

// Override storage state for this test to start fresh
test.use({ storageState: undefined });

test.describe('Study Detail Page Redirect Fix - Localhost', () => {
  test('should load study detail page without redirecting', async ({ page }) => {
    const LOCALHOST_URL = 'http://localhost:3001';

    // Step 1: Login
    console.log('🔐 Logging in to localhost...');
    await page.goto(LOCALHOST_URL);
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Step 2: Wait for dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page).toHaveURL(/.*dashboard/);
    console.log('✅ Successfully logged in and reached dashboard');

    // Step 3: Navigate to Studies page
    console.log('🔍 Navigating to Studies page...');
    const studiesButton = page.locator('button:has-text("Studies")').first();
    await studiesButton.click();

    // Step 4: Wait for Studies page to load
    await page.waitForURL('**/studies', { timeout: 15000 });
    console.log('✅ Reached Studies page');

    // Step 5: Get the first study ID from the page
    console.log('🔍 Finding first study in the list...');
    const firstStudyLink = page.locator('button:has-text("View Details")').first();
    await expect(firstStudyLink).toBeVisible({ timeout: 10000 });

    // Click the View Details button
    await firstStudyLink.click();

    // Step 6: Wait for study detail page to load
    console.log('⏳ Waiting for study detail page to load...');
    await page.waitForURL(/.*\/studies\/[a-z0-9]+$/i, { timeout: 15000 });

    // Get the current URL to verify we're on a study detail page
    const currentURL = page.url();
    console.log('📍 Current URL:', currentURL);

    // Step 7: Verify we're on a study detail page, NOT redirected
    await expect(page).toHaveURL(/.*\/studies\/[a-z0-9]+$/i);
    await expect(page).not.toHaveURL(/.*dashboard/);
    await expect(page).not.toHaveURL(/.*\/login/);
    console.log('✅ URL is correct: study detail page (not /dashboard or /login)');

    // Step 8: Verify study detail page content is visible
    const studyTitle = page.locator('h1').first();
    await expect(studyTitle).toBeVisible({ timeout: 10000 });
    console.log('✅ Study title is visible');

    // Verify the Back to Studies button exists (unique to study detail page)
    const backButton = page.locator('button:has-text("Back to Studies")');
    await expect(backButton).toBeVisible({ timeout: 5000 });
    console.log('✅ Back to Studies button is visible');

    // Step 9: Wait 3 seconds to ensure no redirect occurs
    console.log('⏳ Waiting 3 seconds to detect any glitch/redirect...');
    await page.waitForTimeout(3000);

    // Step 10: Final verification - should STILL be on study detail page
    await expect(page).toHaveURL(/.*\/studies\/[a-z0-9]+$/i);
    await expect(page).not.toHaveURL(/.*dashboard/);
    await expect(page).not.toHaveURL(/.*\/login/);
    console.log('✅ Still on study detail page after 3 seconds - NO REDIRECT!');

    // Step 11: Take screenshot
    await page.screenshot({
      path: 'demo-screenshots/localhost-study-detail-verified.png',
      fullPage: true
    });
    console.log('✅ Screenshot saved');

    console.log('');
    console.log('========================================');
    console.log('✅ TEST PASSED: Study detail page fix verified on localhost!');
    console.log('   - Study detail page loaded successfully');
    console.log('   - No redirect occurred');
    console.log('   - Page remained stable for 3 seconds');
    console.log('========================================');
  });
});

import { test, expect } from '@playwright/test';

test.describe('Full System Test', () => {
  test('Complete login and dashboard workflow', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('networkidle');

    console.log('✅ Login page loaded');

    // Login with admin credentials
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'admin123');

    await page.click('button[type="submit"]');

    // Wait for navigation away from login
    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 10000 });

    console.log('✅ Successfully logged in');

    // Wait a bit for dashboard to fully load
    await page.waitForLoadState('networkidle');

    // Check if we're on dashboard
    await expect(page).toHaveURL(/dashboard/);

    console.log('✅ Redirected to dashboard');

    // Check for Mount Sinai header
    const header = page.locator('h1:has-text("Mount Sinai")');
    await expect(header).toBeVisible();

    console.log('✅ Dashboard header visible');

    // Check stats cards are visible
    const totalStudiesCard = await page.locator('text=Total Studies').isVisible();
    expect(totalStudiesCard).toBe(true);

    console.log('✅ Stats cards visible');

    // Check navigation items
    const studiesNav = await page.locator('text=Studies').first();
    const isStudiesVisible = await studiesNav.isVisible();
    expect(isStudiesVisible).toBe(true);

    console.log('✅ Navigation items visible');

    // Take a screenshot
    await page.screenshot({ path: 'test-results/dashboard-success.png', fullPage: true });

    console.log('✅ Screenshot saved');

    // Try clicking on Studies
    await studiesNav.click();
    await page.waitForLoadState('networkidle');

    console.log('✅ Studies page loaded');

    // Take final screenshot
    await page.screenshot({ path: 'test-results/studies-page.png', fullPage: true });

    console.log('\n🎉 ALL TESTS PASSED!');
  });
});

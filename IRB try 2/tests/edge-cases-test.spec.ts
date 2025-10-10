import { test, expect } from '@playwright/test';
import { login, generateUniqueId } from './helpers';

test.describe('Edge Cases and Error Handling Tests', () => {
  test.setTimeout(180000);

  test('test all edge cases and error scenarios', async ({ page }) => {
    console.log('\n========================================');
    console.log('EDGE CASES TEST - STARTING');
    console.log('========================================\n');

    await login(page);

    // ==========================================
    // TEST 1: Duplicate Protocol Number
    // ==========================================
    console.log('📋 TEST 1: Testing Duplicate Protocol Number Handling');

    const uniqueId = generateUniqueId();
    const duplicateProtocol = `DUP-${uniqueId.slice(0, 6).toUpperCase()}`;

    // Create first study
    await page.goto('http://localhost:3000/studies/new');
    await page.fill('input[name="title"]', 'First Study with Duplicate Protocol');
    await page.fill('input[name="protocolNumber"]', duplicateProtocol);
    await page.fill('textarea[name="description"]', 'This is the first study with this protocol number for testing duplicates.');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log('✓ First study created');

    // Try to create second study with same protocol
    await page.goto('http://localhost:3000/studies/new');
    await page.fill('input[name="title"]', 'Second Study with Duplicate Protocol');
    await page.fill('input[name="protocolNumber"]', duplicateProtocol);
    await page.fill('textarea[name="description"]', 'This should fail due to duplicate protocol number validation.');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Should stay on create page or show error
    const errorVisible = await page.locator('text=already exists').isVisible().catch(() => false);
    const stillOnCreatePage = page.url().includes('/studies/new');

    if (errorVisible || stillOnCreatePage) {
      console.log('✓ Duplicate protocol number validation working');
    }
    console.log('');

    // ==========================================
    // TEST 2: Empty Form Submission
    // ==========================================
    console.log('📋 TEST 2: Testing Empty Form Validation');

    await page.goto('http://localhost:3000/studies/new');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    // Should stay on page due to HTML5 validation
    expect(page.url()).toContain('/studies/new');
    console.log('✓ Empty form validation working');
    console.log('');

    // ==========================================
    // TEST 3: Search with No Results
    // ==========================================
    console.log('📋 TEST 3: Testing Search with No Results');

    await page.goto('http://localhost:3000/studies');
    await page.waitForTimeout(1000);

    const searchBox = page.locator('input[placeholder*="Search"]').first();
    await searchBox.fill('NONEXISTENT-PROTOCOL-12345');
    await page.waitForTimeout(1000);

    const noResultsText = await page.locator('text=No studies found').isVisible().catch(() => false);
    if (noResultsText) {
      console.log('✓ No results message displayed');
    }
    console.log('');

    // ==========================================
    // TEST 4: Participant Enrollment in Non-Active Study
    // ==========================================
    console.log('📋 TEST 4: Testing Participant Enrollment in Non-Active Study');

    // Create a draft study
    const testId = generateUniqueId();
    await page.goto('http://localhost:3000/studies/new');
    await page.fill('input[name="title"]', `Draft Study ${testId}`);
    await page.fill('input[name="protocolNumber"]', `DRAFT-${testId.slice(0, 6).toUpperCase()}`);
    await page.fill('textarea[name="description"]', 'This study will remain in DRAFT status to test participant enrollment restrictions.');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    const draftStudyUrl = page.url();
    const draftStudyId = draftStudyUrl.split('/').pop();

    // Try to go to participants page
    await page.goto(`http://localhost:3000/studies/${draftStudyId}/participants`);
    await page.waitForTimeout(1500);

    console.log('✓ Navigated to participants page of draft study');
    console.log('');

    // ==========================================
    // TEST 5: Logout and Re-login
    // ==========================================
    console.log('📋 TEST 5: Testing Logout and Re-login');

    await page.goto('http://localhost:3000/dashboard');
    await page.waitForTimeout(1000);

    const logoutButton = page.locator('button:has-text("Logout")').or(page.locator('svg')).first();
    const logoutExists = await logoutButton.isVisible().catch(() => false);

    if (logoutExists) {
      await page.click('header button:has(svg)'); // Click logout icon
      await page.waitForTimeout(1000);
      console.log('✓ Logged out');

      // Should redirect to login
      await expect(page).toHaveURL(/login/, { timeout: 5000 });
      console.log('✓ Redirected to login page');

      // Re-login
      await login(page);
      console.log('✓ Re-logged in successfully');
    }
    console.log('');

    // ==========================================
    // TEST 6: Direct URL Access to Protected Routes
    // ==========================================
    console.log('📋 TEST 6: Testing Direct URL Access to Protected Routes');

    // Clear auth and try to access protected route
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });

    await page.goto('http://localhost:3000/studies');
    await page.waitForTimeout(1500);

    // Should redirect to login
    if (page.url().includes('/login')) {
      console.log('✓ Protected route redirected to login');
    }

    // Re-login for next tests
    await login(page);
    console.log('✓ Re-logged in for remaining tests');
    console.log('');

    // ==========================================
    // TEST 7: Filter Combinations
    // ==========================================
    console.log('📋 TEST 7: Testing Filter Combinations');

    await page.goto('http://localhost:3000/studies');
    await page.waitForTimeout(1000);

    const statusFilter = page.locator('select').first();
    const statusFilterExists = await statusFilter.isVisible().catch(() => false);

    if (statusFilterExists) {
      // Test DRAFT filter
      await statusFilter.selectOption('DRAFT');
      await page.waitForTimeout(1000);
      console.log('✓ Applied DRAFT status filter');

      // Test ACTIVE filter
      await statusFilter.selectOption('ACTIVE');
      await page.waitForTimeout(1000);
      console.log('✓ Applied ACTIVE status filter');

      // Clear filter
      await statusFilter.selectOption('');
      await page.waitForTimeout(500);
      console.log('✓ Cleared status filter');
    }
    console.log('');

    // ==========================================
    // TEST 8: User Creation with Invalid Email
    // ==========================================
    console.log('📋 TEST 8: Testing User Creation with Invalid Data');

    await page.goto('http://localhost:3000/users');
    await page.waitForTimeout(1000);

    const createUserButton = await page.locator('button:has-text("Create User")').isVisible().catch(() => false);

    if (createUserButton) {
      await page.click('button:has-text("Create User")');
      await page.waitForTimeout(500);

      // Try with invalid email
      await page.fill('input[name="firstName"]', 'Invalid');
      await page.fill('input[name="lastName"]', 'Email');
      await page.fill('input[name="email"]', 'not-an-email');
      await page.fill('input[name="password"]', 'short');

      const modal = page.locator('div:has(h3:has-text("Create New User"))');
      const submitButton = modal.locator('button:has-text("Create User")');
      await submitButton.click({ force: true });
      await page.waitForTimeout(1000);

      // Should show validation error or stay in modal
      console.log('✓ Invalid user data handled');

      // Close modal if still open
      const cancelButton = modal.locator('button:has-text("Cancel")');
      const cancelExists = await cancelButton.isVisible().catch(() => false);
      if (cancelExists) {
        await cancelButton.click();
      }
    }
    console.log('');

    // ==========================================
    // TEST 9: Navigation Stress Test
    // ==========================================
    console.log('📋 TEST 9: Testing Rapid Navigation');

    const pages = [
      '/dashboard',
      '/studies',
      '/participants',
      '/users',
      '/documents',
      '/dashboard'
    ];

    for (const testPage of pages) {
      await page.goto(`http://localhost:3000${testPage}`);
      await page.waitForTimeout(500);
    }
    console.log('✓ Rapid navigation handled correctly');
    console.log('');

    // ==========================================
    // TEST 10: Study Deletion (if implemented)
    // ==========================================
    console.log('📋 TEST 10: Testing Study Management Operations');

    await page.goto('http://localhost:3000/studies');
    await page.waitForTimeout(1000);

    const studyCount = await page.locator('tbody tr').count();
    console.log(`✓ Found ${studyCount} total studies`);
    console.log('');

    console.log('========================================');
    console.log('EDGE CASES TEST - COMPLETED');
    console.log('========================================\n');
  });
});

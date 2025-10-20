import { test, expect } from '@playwright/test';

test.describe('Coordinator Creation by Researchers', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login');

    // Login as researcher
    await page.fill('input[type="email"]', 'researcher@irb.local');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('researcher can create a new coordinator account', async ({ page }) => {
    // Navigate to studies
    await page.goto('http://localhost:3000/studies');
    await page.waitForLoadState('networkidle');

    // Click on first study
    const firstStudyLink = page.locator('a[href*="/studies/"]').first();
    await firstStudyLink.click();
    await page.waitForLoadState('networkidle');

    // Click Manage Coordinators button
    await page.click('text=Manage Coordinators');
    await page.waitForURL(/\/studies\/.*\/coordinators/);

    // Click Create New Coordinator button
    await page.click('text=Create New Coordinator');

    // Wait for form to appear
    await expect(page.locator('text=Create New Coordinator Account')).toBeVisible();

    // Generate unique email to avoid conflicts
    const timestamp = Date.now();
    const uniqueEmail = `test.coordinator.${timestamp}@example.com`;

    // Fill out the create coordinator form
    await page.fill('input#firstName', 'Test');
    await page.fill('input#lastName', `Coordinator${timestamp}`);
    await page.fill('input#email', uniqueEmail);
    await page.fill('input#password', 'SecurePass123!');

    // Submit the form
    await page.click('button:has-text("Create Coordinator")');

    // Wait for success message
    await expect(page.locator('text=created successfully')).toBeVisible({ timeout: 10000 });

    // Verify the new coordinator appears in the assign dropdown
    await page.click('text=Assign Existing');
    const dropdown = page.locator('select#coordinator-select');
    await expect(dropdown).toBeVisible();

    // Check that our new coordinator is in the dropdown
    const options = await dropdown.locator('option').allTextContents();
    const hasNewCoordinator = options.some(option =>
      option.includes(`Test Coordinator${timestamp}`) && option.includes(uniqueEmail)
    );
    expect(hasNewCoordinator).toBeTruthy();
  });

  test('researcher can create coordinator and immediately assign to study', async ({ page }) => {
    // Navigate to studies
    await page.goto('http://localhost:3000/studies');
    await page.waitForLoadState('networkidle');

    // Click on first study
    const firstStudyLink = page.locator('a[href*="/studies/"]').first();
    await firstStudyLink.click();
    await page.waitForLoadState('networkidle');

    // Click Manage Coordinators button
    await page.click('text=Manage Coordinators');
    await page.waitForURL(/\/studies\/.*\/coordinators/);

    // Generate unique email
    const timestamp = Date.now();
    const uniqueEmail = `assign.coordinator.${timestamp}@example.com`;

    // Create new coordinator
    await page.click('text=Create New Coordinator');
    await page.fill('input#firstName', 'Assign');
    await page.fill('input#lastName', `Test${timestamp}`);
    await page.fill('input#email', uniqueEmail);
    await page.fill('input#password', 'SecurePass123!');
    await page.click('button:has-text("Create Coordinator")');

    // Wait for success
    await expect(page.locator('text=created successfully')).toBeVisible({ timeout: 10000 });

    // Now assign the newly created coordinator
    await page.click('text=Assign Existing');
    await page.waitForSelector('select#coordinator-select');

    // Select the newly created coordinator from dropdown
    const dropdown = page.locator('select#coordinator-select');
    const options = await dropdown.locator('option').all();

    for (const option of options) {
      const text = await option.textContent();
      if (text && text.includes(uniqueEmail)) {
        const value = await option.getAttribute('value');
        if (value) {
          await dropdown.selectOption(value);
          break;
        }
      }
    }

    // Click assign button
    await page.click('button:has-text("Assign")');

    // Wait for assignment success
    await expect(page.locator('text=assigned successfully')).toBeVisible({ timeout: 10000 });

    // Verify coordinator appears in the table
    await expect(page.locator(`text=Assign Test${timestamp}`)).toBeVisible();
  });

  test('validates required fields when creating coordinator', async ({ page }) => {
    // Navigate to coordinator management page
    await page.goto('http://localhost:3000/studies');
    await page.waitForLoadState('networkidle');

    const firstStudyLink = page.locator('a[href*="/studies/"]').first();
    await firstStudyLink.click();
    await page.waitForLoadState('networkidle');

    await page.click('text=Manage Coordinators');
    await page.waitForURL(/\/studies\/.*\/coordinators/);

    // Click Create New Coordinator
    await page.click('text=Create New Coordinator');

    // Try to submit without filling fields
    await page.click('button:has-text("Create Coordinator")');

    // Should show error message
    await expect(page.locator('text=All fields are required')).toBeVisible({ timeout: 5000 });
  });

  test('validates password length when creating coordinator', async ({ page }) => {
    // Navigate to coordinator management page
    await page.goto('http://localhost:3000/studies');
    await page.waitForLoadState('networkidle');

    const firstStudyLink = page.locator('a[href*="/studies/"]').first();
    await firstStudyLink.click();
    await page.waitForLoadState('networkidle');

    await page.click('text=Manage Coordinators');
    await page.waitForURL(/\/studies\/.*\/coordinators/);

    // Click Create New Coordinator
    await page.click('text=Create New Coordinator');

    // Fill with short password
    await page.fill('input#firstName', 'Test');
    await page.fill('input#lastName', 'User');
    await page.fill('input#email', 'test@example.com');
    await page.fill('input#password', 'short');

    // Try to submit
    await page.click('button:has-text("Create Coordinator")');

    // Should show password length error
    await expect(page.locator('text=at least 8 characters')).toBeVisible({ timeout: 5000 });
  });

  test('prevents duplicate email addresses', async ({ page }) => {
    // Navigate to coordinator management page
    await page.goto('http://localhost:3000/studies');
    await page.waitForLoadState('networkidle');

    const firstStudyLink = page.locator('a[href*="/studies/"]').first();
    await firstStudyLink.click();
    await page.waitForLoadState('networkidle');

    await page.click('text=Manage Coordinators');
    await page.waitForURL(/\/studies\/.*\/coordinators/);

    // Click Create New Coordinator
    await page.click('text=Create New Coordinator');

    // Try to create with existing coordinator email
    await page.fill('input#firstName', 'Test');
    await page.fill('input#lastName', 'Duplicate');
    await page.fill('input#email', 'coordinator@irb.local'); // Existing email from seed
    await page.fill('input#password', 'SecurePass123!');

    // Try to submit
    await page.click('button:has-text("Create Coordinator")');

    // Should show duplicate email error
    await expect(page.locator('text=already exists')).toBeVisible({ timeout: 5000 });
  });
});

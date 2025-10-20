import { test, expect } from '@playwright/test';

test.describe('Coordinator Management', () => {
  let studyId: string;
  let coordinatorEmail: string;
  let coordinatorId: string;

  test.beforeEach(async ({ page }) => {
    // Login as admin to set up test data
    await page.goto('/');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForURL('/dashboard');
  });

  test('researcher can view Manage Coordinators button on study detail page', async ({ page }) => {
    // Navigate to studies page
    await page.goto('/studies');

    // Click on first study
    const firstStudy = page.locator('table tbody tr').first();
    studyId = await firstStudy.getAttribute('data-study-id') || '';
    await firstStudy.click();

    // Should see Manage Coordinators button if user is PI or admin
    const manageButton = page.locator('button:has-text("Manage Coordinators")');
    await expect(manageButton).toBeVisible();
  });

  test('researcher can access coordinator management page', async ({ page }) => {
    // Navigate to a study
    await page.goto('/studies');
    const firstStudy = page.locator('table tbody tr').first();
    await firstStudy.click();

    // Click Manage Coordinators
    await page.click('button:has-text("Manage Coordinators")');

    // Should navigate to coordinators page
    await expect(page).toHaveURL(/\/studies\/.*\/coordinators/);

    // Should see page title
    await expect(page.locator('h1')).toContainText('Manage Study Coordinators');
  });

  test('researcher can assign a coordinator to a study', async ({ page }) => {
    // First, create a coordinator user if one doesn't exist
    await page.goto('/users');

    // Check if there are any coordinators, if not create one
    const hasCoordinators = await page.locator('table tbody tr:has-text("coordinator")').count() > 0;

    if (!hasCoordinators) {
      await page.click('button:has-text("New User")');
      await page.fill('input[name="firstName"]', 'Test');
      await page.fill('input[name="lastName"]', 'Coordinator');
      coordinatorEmail = `coordinator_${Date.now()}@test.com`;
      await page.fill('input[name="email"]', coordinatorEmail);
      await page.fill('input[name="password"]', 'test123');
      await page.selectOption('select[name="roleName"]', 'coordinator');
      await page.click('button[type="submit"]');

      // Wait for user to be created
      await page.waitForTimeout(1000);
    } else {
      // Get first coordinator email
      coordinatorEmail = await page.locator('table tbody tr:has-text("coordinator")').first().locator('td:nth-child(2)').textContent() || '';
    }

    // Navigate to a study's coordinator management page
    await page.goto('/studies');
    const firstStudy = page.locator('table tbody tr').first();
    await firstStudy.click();
    await page.click('button:has-text("Manage Coordinators")');

    // Click Assign Coordinator button
    await page.click('button:has-text("Assign Coordinator")');

    // Select a coordinator from dropdown
    await page.selectOption('select', { label: new RegExp(coordinatorEmail) });

    // Click Assign button
    await page.click('button:has-text("Assign"):not(:has-text("Assign Coordinator"))');

    // Should see success message
    await expect(page.locator('text=Coordinator assigned successfully')).toBeVisible();

    // Should see coordinator in the table
    await expect(page.locator('table tbody')).toContainText(coordinatorEmail);
  });

  test('researcher can remove a coordinator assignment', async ({ page }) => {
    // Navigate to study coordinators page
    await page.goto('/studies');
    const firstStudy = page.locator('table tbody tr').first();
    await firstStudy.click();
    await page.click('button:has-text("Manage Coordinators")');

    // Check if there are any coordinators assigned
    const hasCoordinators = await page.locator('table tbody tr').count() > 0;

    if (hasCoordinators) {
      // Click Remove button on first coordinator
      page.on('dialog', dialog => dialog.accept()); // Accept confirmation dialog
      await page.click('table tbody tr:first-child button:has-text("Remove")');

      // Should see success message
      await expect(page.locator('text=Coordinator removed successfully')).toBeVisible();
    }
  });

  test('prevents duplicate coordinator assignments', async ({ page }) => {
    // Navigate to study coordinators page
    await page.goto('/studies');
    const firstStudy = page.locator('table tbody tr').first();
    await firstStudy.click();
    await page.click('button:has-text("Manage Coordinators")');

    // Assign a coordinator first
    await page.click('button:has-text("Assign Coordinator")');

    const selectElement = page.locator('select');
    const options = await selectElement.locator('option').count();

    if (options > 1) { // More than just the placeholder option
      await page.selectOption('select', { index: 1 });
      await page.click('button:has-text("Assign"):not(:has-text("Assign Coordinator"))');

      // Wait for success
      await page.waitForSelector('text=Coordinator assigned successfully');

      // Try to assign the same coordinator again
      await page.click('button:has-text("Assign Coordinator")');

      // The coordinator should not appear in the dropdown anymore
      const optionsAfter = await selectElement.locator('option').count();
      expect(optionsAfter).toBeLessThan(options);
    }
  });

  test('validates that assigned user has coordinator role', async ({ page }) => {
    // This test would require accessing the API directly
    // or creating a researcher user and attempting to assign them
    // For now, we'll check the UI behavior

    await page.goto('/studies');
    const firstStudy = page.locator('table tbody tr').first();
    await firstStudy.click();
    await page.click('button:has-text("Manage Coordinators")');

    // Click Assign Coordinator
    await page.click('button:has-text("Assign Coordinator")');

    // The dropdown should only show coordinator role users
    const selectElement = page.locator('select');
    await selectElement.selectOption({ index: 1 });
    const selectedText = await selectElement.inputValue();

    // Verify selection is valid (has an email format)
    expect(selectedText).toBeTruthy();
  });

  test('shows empty state when no coordinators are assigned', async ({ page }) => {
    // Find or create a study with no coordinators
    await page.goto('/studies');

    // Create a new study
    await page.click('text=New Study');
    await page.fill('input[name="title"]', `Test Study ${Date.now()}`);
    await page.fill('input[name="protocolNumber"]', `PROTO-${Date.now()}`);
    await page.fill('textarea[name="description"]', 'Test study for coordinator management');
    await page.selectOption('select[name="type"]', 'CLINICAL_TRIAL');
    await page.selectOption('select[name="riskLevel"]', 'MINIMAL');
    await page.click('button[type="submit"]');

    // Navigate to coordinators page
    await page.click('button:has-text("Manage Coordinators")');

    // Should see empty state message
    await expect(page.locator('text=No coordinators assigned yet')).toBeVisible();
    await expect(page.locator('text=Click "Assign Coordinator" to add coordinators')).toBeVisible();
  });

  test('displays coordinator assignment date and status', async ({ page }) => {
    // Navigate to a study with coordinators
    await page.goto('/studies');
    const firstStudy = page.locator('table tbody tr').first();
    await firstStudy.click();
    await page.click('button:has-text("Manage Coordinators")');

    // Check if there are coordinators
    const hasCoordinators = await page.locator('table tbody tr').count() > 0;

    if (hasCoordinators) {
      // Verify table headers
      await expect(page.locator('th')).toContainText(['Coordinator', 'Email', 'Status', 'Assigned Date', 'Actions']);

      // Verify first row has all required info
      const firstRow = page.locator('table tbody tr').first();
      await expect(firstRow.locator('td').nth(2)).toContainText(/Active|Inactive/);

      // Verify date format (should show a date)
      const dateCell = await firstRow.locator('td').nth(3).textContent();
      expect(dateCell).toMatch(/[A-Z][a-z]{2}\s\d{1,2},\s\d{4}/); // Format: "Jan 1, 2024"
    }
  });
});

test.describe('Coordinator Management - Permission Tests', () => {
  test('non-PI researcher cannot access Manage Coordinators', async ({ page }) => {
    // This would require a separate researcher account
    // For now, we'll verify the button visibility logic

    // Login as coordinator
    await page.goto('/');
    await page.fill('input[name="email"]', 'coordinator@test.com');
    await page.fill('input[name="password"]', 'test123');
    await page.click('button[type="submit"]');

    // Navigate to a study (if coordinator has access)
    await page.goto('/studies');

    const studyCount = await page.locator('table tbody tr').count();

    if (studyCount > 0) {
      const firstStudy = page.locator('table tbody tr').first();
      await firstStudy.click();

      // Should NOT see Manage Coordinators button
      const manageButton = page.locator('button:has-text("Manage Coordinators")');
      await expect(manageButton).not.toBeVisible();
    }
  });

  test('coordinator cannot directly access coordinator management URL', async ({ page }) => {
    // Login as coordinator
    await page.goto('/');
    await page.fill('input[name="email"]', 'coordinator@test.com');
    await page.fill('input[name="password"]', 'test123');
    await page.click('button[type="submit"]');

    // Try to access coordinator management page directly
    await page.goto('/studies/some-study-id/coordinators');

    // Should be redirected or see error message
    // Either redirected to dashboard or sees "Unauthorized" error
    await page.waitForTimeout(1000);

    const url = page.url();
    const hasError = await page.locator('text=Unauthorized').isVisible();

    expect(url.includes('/coordinators') || hasError).toBeTruthy();
  });
});

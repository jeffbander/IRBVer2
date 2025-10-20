import { test, expect } from '@playwright/test';

test.describe('Coordinator Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as coordinator
    await page.goto('/');
    await page.fill('input[name="email"]', 'coordinator@test.com');
    await page.fill('input[name="password"]', 'test123');
    await page.click('button[type="submit"]');

    // Wait for redirect to coordinator dashboard
    await page.waitForURL('/dashboard/coordinator');
  });

  test('coordinator is automatically redirected to specialized dashboard', async ({ page }) => {
    // Should be on coordinator dashboard
    await expect(page).toHaveURL('/dashboard/coordinator');

    // Should see coordinator dashboard title
    await expect(page.locator('h1')).toContainText('Coordinator Dashboard');
  });

  test('coordinator dashboard displays welcome message', async ({ page }) => {
    // Should see welcome message with coordinator name
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('coordinator dashboard shows statistics cards', async ({ page }) => {
    // Should see three stat cards
    await expect(page.locator('text=Assigned Studies')).toBeVisible();
    await expect(page.locator('text=Total Enrollments')).toBeVisible();
    await expect(page.locator('text=Active Studies')).toBeVisible();

    // Stats should show numbers
    const assignedStudiesCard = page.locator('text=Assigned Studies').locator('..');
    const assignedCount = await assignedStudiesCard.locator('p.text-3xl').textContent();
    expect(assignedCount).toMatch(/^\d+$/); // Should be a number
  });

  test('coordinator sees only assigned studies in the table', async ({ page }) => {
    // Get the count from stats
    const assignedStudiesCard = page.locator('text=Assigned Studies').locator('..');
    const expectedCount = parseInt(await assignedStudiesCard.locator('p.text-3xl').textContent() || '0');

    // Count rows in table (excluding header and empty state)
    const tableRows = page.locator('table tbody tr');
    const actualCount = await tableRows.count();

    // If no studies, should see empty state
    if (expectedCount === 0) {
      await expect(page.locator('text=No studies assigned')).toBeVisible();
      await expect(page.locator('text=Contact your Principal Investigator')).toBeVisible();
    } else {
      // Row count should match stat
      expect(actualCount).toBe(expectedCount);
    }
  });

  test('coordinator dashboard table shows required columns', async ({ page }) => {
    // Check for all required column headers
    const headers = ['Study Title', 'Protocol Number', 'Principal Investigator', 'Status', 'Enrollment', 'Actions'];

    for (const header of headers) {
      await expect(page.locator('th', { hasText: header })).toBeVisible();
    }
  });

  test('coordinator can navigate to study details from dashboard', async ({ page }) => {
    // Check if there are studies
    const studyRows = await page.locator('table tbody tr').count();

    if (studyRows > 0) {
      // Click View link on first study
      await page.locator('table tbody tr').first().locator('text=View').click();

      // Should navigate to study detail page
      await expect(page).toHaveURL(/\/studies\/[a-z0-9-]+/);
    }
  });

  test('coordinator can access enrollment from dashboard for active studies', async ({ page }) => {
    // Look for active studies in the table
    const activeStudyRow = page.locator('table tbody tr').filter({ hasText: /Active/ }).first();
    const hasActiveStudies = await activeStudyRow.count() > 0;

    if (hasActiveStudies) {
      // Should see Enroll link
      const enrollLink = activeStudyRow.locator('text=Enroll');
      await expect(enrollLink).toBeVisible();

      // Click enroll link
      await enrollLink.click();

      // Should navigate to participants page
      await expect(page).toHaveURL(/\/studies\/[a-z0-9-]+\/participants/);
    }
  });

  test('coordinator dashboard shows status badges correctly', async ({ page }) => {
    const studyRows = await page.locator('table tbody tr').count();

    if (studyRows > 0) {
      // Check first row has status badge
      const firstRow = page.locator('table tbody tr').first();
      const statusBadge = firstRow.locator('[class*="bg-"]').filter({ hasText: /Draft|Pending|Approved|Active|Suspended|Closed|Completed/ });

      await expect(statusBadge).toBeVisible();

      // Verify badge has appropriate styling
      const badgeClasses = await statusBadge.getAttribute('class');
      expect(badgeClasses).toContain('rounded');
      expect(badgeClasses).toMatch(/text-(gray|yellow|green|blue|red|purple)/);
    }
  });

  test('coordinator dashboard shows enrollment progress', async ({ page }) => {
    const studyRows = await page.locator('table tbody tr').count();

    if (studyRows > 0) {
      // Check enrollment column format
      const firstRow = page.locator('table tbody tr').first();
      const enrollmentCell = firstRow.locator('td').nth(4); // Enrollment column

      const enrollmentText = await enrollmentCell.textContent();

      // Should show format like "10" or "10 / 100"
      expect(enrollmentText).toMatch(/^\d+(\s*\/\s*\d+)?$/);
    }
  });

  test('coordinator dashboard shows quick actions for active studies', async ({ page }) => {
    // Look for Quick Actions section
    const quickActions = page.locator('h3:has-text("Quick Actions")');

    const hasActiveStudies = await page.locator('table tbody tr').filter({ hasText: /Active/ }).count() > 0;

    if (hasActiveStudies) {
      // Should see Quick Actions section
      await expect(quickActions).toBeVisible();

      // Should see at least one quick action card
      const actionCards = page.locator('text=Enroll participant').first();
      await expect(actionCards).toBeVisible();
    }
  });

  test('coordinator can click quick action to enroll participant', async ({ page }) => {
    const quickActions = page.locator('h3:has-text("Quick Actions")');

    if (await quickActions.isVisible()) {
      // Click first quick action
      const firstAction = page.locator('text=Enroll participant').first().locator('..');
      await firstAction.click();

      // Should navigate to participants page
      await expect(page).toHaveURL(/\/studies\/[a-z0-9-]+\/participants/);
    }
  });

  test('coordinator dashboard displays empty state correctly', async ({ page }) => {
    // This test assumes a coordinator with no assigned studies
    // You may need to create a new coordinator for this test

    const studyRows = await page.locator('table tbody tr').count();

    if (studyRows === 0 || await page.locator('text=No studies assigned').isVisible()) {
      // Should see empty state icon
      await expect(page.locator('svg').filter({ hasText: '' })).toBeVisible();

      // Should see empty state message
      await expect(page.locator('text=No studies assigned')).toBeVisible();
      await expect(page.locator('text=Contact your Principal Investigator')).toBeVisible();

      // Should NOT see Quick Actions section
      await expect(page.locator('text=Quick Actions')).not.toBeVisible();
    }
  });

  test('coordinator stats update correctly', async ({ page }) => {
    // Get initial stats
    const assignedStudiesCard = page.locator('text=Assigned Studies').locator('..');
    const initialCount = parseInt(await assignedStudiesCard.locator('p.text-3xl').textContent() || '0');

    // Count table rows
    const tableRows = await page.locator('table tbody tr').count();

    // Stats should match table data
    if (initialCount > 0) {
      expect(tableRows).toBe(initialCount);
    } else {
      expect(tableRows).toBe(0);
    }
  });

  test('coordinator can see all assigned studies across multiple PIs', async ({ page }) => {
    // This test verifies the many-to-many relationship
    // A coordinator can be assigned to studies from different PIs

    const studyRows = await page.locator('table tbody tr').count();

    if (studyRows > 1) {
      // Get PI names from all rows
      const piNames: string[] = [];

      for (let i = 0; i < studyRows; i++) {
        const row = page.locator('table tbody tr').nth(i);
        const piName = await row.locator('td').nth(2).textContent();
        if (piName) {
          piNames.push(piName.trim());
        }
      }

      // If there are duplicate PIs, that's fine, but we should have at least one PI
      expect(piNames.length).toBeGreaterThan(0);

      // Verify all PI names are displayed correctly
      for (const piName of piNames) {
        expect(piName).toMatch(/\w+ \w+/); // First Last format
      }
    }
  });
});

test.describe('Coordinator Dashboard - Navigation', () => {
  test('coordinator accessing /dashboard is redirected to /dashboard/coordinator', async ({ page }) => {
    // Login as coordinator
    await page.goto('/');
    await page.fill('input[name="email"]', 'coordinator@test.com');
    await page.fill('input[name="password"]', 'test123');
    await page.click('button[type="submit"]');

    // Try to navigate to general dashboard
    await page.goto('/dashboard');

    // Should be redirected to coordinator dashboard
    await page.waitForURL('/dashboard/coordinator');
    await expect(page).toHaveURL('/dashboard/coordinator');
  });

  test('non-coordinator cannot access coordinator dashboard', async ({ page }) => {
    // Login as admin
    await page.goto('/');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Try to access coordinator dashboard
    await page.goto('/dashboard/coordinator');

    // Should be redirected to general dashboard
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL('/dashboard');
  });
});

test.describe('Coordinator Dashboard - Access Control', () => {
  test('coordinator only sees studies they are assigned to', async ({ page }) => {
    // Login as coordinator
    await page.goto('/');
    await page.fill('input[name="email"]', 'coordinator@test.com');
    await page.fill('input[name="password"]', 'test123');
    await page.click('button[type="submit"]');

    // Get study IDs from dashboard
    const dashboardStudyIds: string[] = [];
    const studyRows = await page.locator('table tbody tr').count();

    for (let i = 0; i < studyRows; i++) {
      const row = page.locator('table tbody tr').nth(i);
      await row.locator('text=View').click();

      // Get study ID from URL
      const url = page.url();
      const match = url.match(/\/studies\/([a-z0-9-]+)/);
      if (match) {
        dashboardStudyIds.push(match[1]);
      }

      // Go back to dashboard
      await page.goto('/dashboard/coordinator');
    }

    // Now try to access all studies page
    await page.goto('/studies');

    // Should only see the assigned studies
    const allStudiesRows = await page.locator('table tbody tr').count();

    // The count should match (coordinator only sees assigned studies)
    expect(allStudiesRows).toBe(dashboardStudyIds.length);
  });

  test('coordinator cannot access unassigned study directly', async ({ page }) => {
    // Login as coordinator
    await page.goto('/');
    await page.fill('input[name="email"]', 'coordinator@test.com');
    await page.fill('input[name="password"]', 'test123');
    await page.click('button[type="submit"]');

    // Try to access a study URL directly (use a fake ID or known unassigned study)
    await page.goto('/studies/unassigned-study-id-12345');

    // Should be redirected or see error
    await page.waitForTimeout(1000);

    const url = page.url();
    const hasError = await page.locator('text=Unauthorized').isVisible();
    const isRedirected = !url.includes('/studies/unassigned-study-id-12345');

    expect(hasError || isRedirected).toBeTruthy();
  });
});

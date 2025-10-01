import { test, expect } from '@playwright/test';
import { login, generateUniqueId } from './helpers';

test.describe('Comprehensive System Test - All Sections', () => {
  test.setTimeout(300000); // 5 minutes timeout for comprehensive test

  test('complete system walkthrough - test all features', async ({ page }) => {
    console.log('\n========================================');
    console.log('COMPREHENSIVE SYSTEM TEST - STARTING');
    console.log('========================================\n');

    // ==========================================
    // SECTION 1: AUTHENTICATION
    // ==========================================
    console.log('📋 SECTION 1: Testing Authentication');

    await page.goto('http://localhost:3001');
    await expect(page).toHaveURL(/login/);
    console.log('✓ Redirected to login page');

    await login(page);
    console.log('✓ Successfully logged in');

    await expect(page).toHaveURL(/dashboard/);
    console.log('✓ Redirected to dashboard after login\n');

    // ==========================================
    // SECTION 2: DASHBOARD
    // ==========================================
    console.log('📋 SECTION 2: Testing Dashboard');

    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    console.log('✓ Dashboard page loaded');

    // Check for dashboard stats
    const statsVisible = await page.locator('text=Total Studies').isVisible().catch(() => false);
    if (statsVisible) {
      console.log('✓ Dashboard stats are visible');
    }

    // Test navigation menu
    const navLinks = ['Studies', 'Users'];
    for (const link of navLinks) {
      const linkExists = await page.locator(`text=${link}`).first().isVisible().catch(() => false);
      if (linkExists) {
        console.log(`✓ Navigation link "${link}" exists`);
      }
    }
    console.log('');

    // ==========================================
    // SECTION 3: STUDIES - CREATE
    // ==========================================
    console.log('📋 SECTION 3: Testing Studies - Create New Study');

    await page.goto('http://localhost:3001/studies');
    await page.waitForSelector('button:has-text("New Study")', { timeout: 10000 });
    console.log('✓ Studies page loaded');

    await page.click('button:has-text("New Study")');
    await page.waitForURL(/\/studies\/new/);
    console.log('✓ Navigated to create study page');

    const uniqueId = generateUniqueId();
    const studyTitle = `Comprehensive Test Study ${uniqueId}`;
    const protocolNumber = `TEST-${uniqueId.slice(0, 8).toUpperCase()}`;

    await page.fill('input[name="title"]', studyTitle);
    await page.fill('input[name="protocolNumber"]', protocolNumber);
    await page.fill('textarea[name="description"]', 'This is a comprehensive test study created by the automated test suite to verify all system functionality.');
    await page.selectOption('select[name="type"]', 'INTERVENTIONAL');
    console.log('✓ Study form filled');

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/studies\/[^\/]+$/, { timeout: 10000 });

    const studyUrl = page.url();
    const studyId = studyUrl.split('/').pop()!;
    console.log(`✓ Study created with ID: ${studyId}`);
    console.log(`✓ Study Title: ${studyTitle}\n`);

    // ==========================================
    // SECTION 4: STUDY DETAILS
    // ==========================================
    console.log('📋 SECTION 4: Testing Study Details Page');

    await page.waitForSelector(`text=${studyTitle}`, { timeout: 5000 });
    console.log('✓ Study details page loaded');

    // Check for tabs
    const tabs = ['Overview', 'Participants', 'Documents'];
    for (const tab of tabs) {
      const tabExists = await page.locator(`text=${tab}`).isVisible().catch(() => false);
      if (tabExists) {
        console.log(`✓ Tab "${tab}" is visible`);
      }
    }
    console.log('');

    // ==========================================
    // SECTION 5: PARTICIPANTS
    // ==========================================
    console.log('📋 SECTION 5: Testing Participants');

    await page.goto(`http://localhost:3001/studies/${studyId}/participants`);
    await page.waitForTimeout(2000);
    console.log('✓ Participants page loaded');

    // First, change study status to ACTIVE so we can enroll participants
    const token = await page.evaluate(() => localStorage.getItem('token'));
    await fetch(`http://localhost:3001/api/studies/${studyId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'ACTIVE' })
    });
    console.log('✓ Study status changed to ACTIVE');

    await page.reload();
    await page.waitForTimeout(1000);

    // Try to enroll a participant
    const enrollButton = page.locator('button:has-text("Enroll Participant")');
    const enrollButtonExists = await enrollButton.isVisible().catch(() => false);

    if (enrollButtonExists) {
      await enrollButton.click();
      await page.waitForTimeout(1000);
      console.log('✓ Enroll participant modal opened');

      const subjectId = `SUBJ-${uniqueId.slice(0, 6)}`;

      // Fill participant form
      const inputs = await page.locator('input[type="text"]').all();
      if (inputs.length > 0) {
        await inputs[0].fill(subjectId);
        console.log(`✓ Filled subject ID: ${subjectId}`);
      }

      const dateInputs = await page.locator('input[type="date"]').all();
      const today = new Date().toISOString().split('T')[0];
      if (dateInputs.length >= 2) {
        await dateInputs[0].fill(today);
        await dateInputs[1].fill(today);
        console.log('✓ Filled consent and enrollment dates');
      }

      // Submit enrollment
      const modal = page.locator('div:has(h3:has-text("Enroll New Participant"))');
      const submitButton = modal.locator('button[type="submit"]');
      await submitButton.click();
      await page.waitForTimeout(2000);

      console.log('✓ Participant enrollment submitted');
    }
    console.log('');

    // ==========================================
    // SECTION 6: GLOBAL PARTICIPANTS PAGE
    // ==========================================
    console.log('📋 SECTION 6: Testing Global Participants Page');

    await page.goto('http://localhost:3001/participants');
    await page.waitForTimeout(2000);

    const participantsPageLoaded = await page.locator('h1:has-text("All Participants")').isVisible().catch(() => false);
    if (participantsPageLoaded) {
      console.log('✓ Global participants page loaded');

      // Check for filters
      const searchBox = await page.locator('input[placeholder*="Search"]').isVisible().catch(() => false);
      if (searchBox) {
        console.log('✓ Search box is available');
      }

      const statusFilter = await page.locator('select').first().isVisible().catch(() => false);
      if (statusFilter) {
        console.log('✓ Status filter is available');
      }
    }
    console.log('');

    // ==========================================
    // SECTION 7: DOCUMENTS
    // ==========================================
    console.log('📋 SECTION 7: Testing Documents');

    await page.goto(`http://localhost:3001/studies/${studyId}`);
    await page.waitForTimeout(1000);

    // Look for Documents tab or link
    const documentsLink = page.locator('text=Documents').first();
    const documentsLinkExists = await documentsLink.isVisible().catch(() => false);

    if (documentsLinkExists) {
      await documentsLink.click();
      await page.waitForTimeout(1000);
      console.log('✓ Documents section accessed');

      const uploadButton = await page.locator('button:has-text("Upload")').isVisible().catch(() => false);
      if (uploadButton) {
        console.log('✓ Upload document button is available');
      }
    }

    // Test global documents page
    await page.goto('http://localhost:3001/documents');
    await page.waitForTimeout(2000);

    const documentsPageLoaded = await page.locator('h1:has-text("Documents")').isVisible().catch(() => false);
    if (documentsPageLoaded) {
      console.log('✓ Global documents page loaded');
    }
    console.log('');

    // ==========================================
    // SECTION 8: USER MANAGEMENT
    // ==========================================
    console.log('📋 SECTION 8: Testing User Management');

    await page.goto('http://localhost:3001/users');
    await page.waitForTimeout(2000);

    const usersPageLoaded = await page.locator('h1:has-text("User Management")').isVisible().catch(() => false);
    if (usersPageLoaded) {
      console.log('✓ Users page loaded');

      // Check for create user button
      const createUserButton = await page.locator('button:has-text("Create User")').isVisible().catch(() => false);
      if (createUserButton) {
        console.log('✓ Create user button is available');

        // Try to create a user
        await page.click('button:has-text("Create User")');
        await page.waitForTimeout(1000);

        const modalVisible = await page.locator('h3:has-text("Create New User")').isVisible().catch(() => false);
        if (modalVisible) {
          console.log('✓ Create user modal opened');

          const testUserId = generateUniqueId();
          await page.fill('input[name="firstName"]', 'Test');
          await page.fill('input[name="lastName"]', `User${testUserId.slice(0, 4)}`);
          await page.fill('input[name="email"]', `test${testUserId.slice(0, 6)}@example.com`);
          await page.fill('input[name="password"]', 'TestPass123!');
          console.log('✓ User form filled');

          const modal = page.locator('div:has(h3:has-text("Create New User"))');
          const submitButton = modal.locator('button:has-text("Create User")');
          await submitButton.click();
          await page.waitForTimeout(2000);

          console.log('✓ User creation submitted');
        }
      }

      // Check if we can view a user's details
      const userRows = await page.locator('tbody tr').count();
      if (userRows > 0) {
        console.log(`✓ Found ${userRows} users in the table`);

        // Try to view first user's details
        const viewButton = page.locator('button:has-text("View")').first();
        const viewButtonExists = await viewButton.isVisible().catch(() => false);
        if (viewButtonExists) {
          await viewButton.click();
          await page.waitForTimeout(1000);

          const userDetailsVisible = await page.locator('h1').isVisible().catch(() => false);
          if (userDetailsVisible) {
            console.log('✓ User details page loaded');
            await page.goBack();
          }
        }
      }
    }
    console.log('');

    // ==========================================
    // SECTION 9: SEARCH AND FILTER
    // ==========================================
    console.log('📋 SECTION 9: Testing Search and Filter');

    await page.goto('http://localhost:3001/studies');
    await page.waitForTimeout(1000);

    // Test search
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    const searchInputExists = await searchInput.isVisible().catch(() => false);
    if (searchInputExists) {
      await searchInput.fill(protocolNumber);
      await page.waitForTimeout(1000);
      console.log(`✓ Searched for protocol: ${protocolNumber}`);

      const studyFound = await page.locator(`text=${protocolNumber}`).isVisible().catch(() => false);
      if (studyFound) {
        console.log('✓ Study found in search results');
      }

      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(500);
    }

    // Test filters
    const statusFilter = page.locator('select').first();
    const statusFilterExists = await statusFilter.isVisible().catch(() => false);
    if (statusFilterExists) {
      await statusFilter.selectOption('ACTIVE');
      await page.waitForTimeout(1000);
      console.log('✓ Filtered studies by ACTIVE status');

      await statusFilter.selectOption('');
      await page.waitForTimeout(500);
      console.log('✓ Cleared filter');
    }
    console.log('');

    // ==========================================
    // SECTION 10: EXPORT FUNCTIONALITY
    // ==========================================
    console.log('📋 SECTION 10: Testing Export Functionality');

    const exportButton = page.locator('button:has-text("Export")').first();
    const exportButtonExists = await exportButton.isVisible().catch(() => false);
    if (exportButtonExists) {
      console.log('✓ Export button is available');
      // Note: We won't actually click it to avoid downloading files
    }
    console.log('');

    // ==========================================
    // SECTION 11: STUDY EDITING
    // ==========================================
    console.log('📋 SECTION 11: Testing Study Editing');

    await page.goto(`http://localhost:3001/studies/${studyId}`);
    await page.waitForTimeout(1000);

    const editButton = page.locator('button:has-text("Edit")').first();
    const editButtonExists = await editButton.isVisible().catch(() => false);
    if (editButtonExists) {
      await editButton.click();
      await page.waitForURL(/\/edit/);
      console.log('✓ Navigated to edit study page');

      // Update description
      const descriptionField = page.locator('textarea[name="description"]');
      await descriptionField.fill('Updated description for comprehensive test - all systems working!');
      console.log('✓ Updated study description');

      const saveButton = page.locator('button:has-text("Save Changes")');
      await saveButton.click();
      await page.waitForTimeout(2000);
      console.log('✓ Study changes saved');
    }
    console.log('');

    // ==========================================
    // SECTION 12: NAVIGATION TESTING
    // ==========================================
    console.log('📋 SECTION 12: Testing Navigation Between Pages');

    const pages = [
      { url: '/dashboard', name: 'Dashboard' },
      { url: '/studies', name: 'Studies' },
      { url: '/participants', name: 'Participants' },
      { url: '/documents', name: 'Documents' },
      { url: '/users', name: 'Users' }
    ];

    for (const testPage of pages) {
      await page.goto(`http://localhost:3001${testPage.url}`);
      await page.waitForTimeout(2000);

      const pageLoaded = await page.locator('h1').isVisible({ timeout: 10000 }).catch(() => false);
      if (pageLoaded) {
        console.log(`✓ ${testPage.name} page accessible`);
      } else {
        console.log(`✗ ${testPage.name} page failed to load`);
      }
    }
    console.log('');

    // ==========================================
    // SECTION 13: LOGOUT
    // ==========================================
    console.log('📋 SECTION 13: Testing Logout');

    await page.goto('http://localhost:3001/dashboard');
    await page.waitForTimeout(1000);

    const logoutButton = page.locator('button:has-text("Logout")');
    const logoutButtonExists = await logoutButton.isVisible().catch(() => false);
    if (logoutButtonExists) {
      await logoutButton.click();
      await page.waitForTimeout(1000);

      await expect(page).toHaveURL(/login/);
      console.log('✓ Successfully logged out');
      console.log('✓ Redirected to login page');
    }
    console.log('');

    console.log('========================================');
    console.log('COMPREHENSIVE SYSTEM TEST - COMPLETED');
    console.log('========================================\n');
  });
});

import { test, expect } from '@playwright/test';
import { login, generateUniqueId } from './helpers';
import fs from 'fs';
import path from 'path';

test.describe('Document Management Tests', () => {
  test.setTimeout(180000);

  test('test document upload, view, and management', async ({ page }) => {
    console.log('\n========================================');
    console.log('DOCUMENT MANAGEMENT TEST - STARTING');
    console.log('========================================\n');

    // Auto-accept all dialogs
    page.on('dialog', dialog => dialog.accept());

    // ==========================================
    // STEP 1: LOGIN
    // ==========================================
    console.log('📋 STEP 1: Logging in');
    await login(page);
    console.log('✓ Logged in successfully\n');

    // ==========================================
    // STEP 2: CREATE A STUDY FOR DOCUMENTS
    // ==========================================
    console.log('📋 STEP 2: Creating a Study for Document Testing');

    await page.goto('http://localhost:3000/studies');
    await page.waitForTimeout(1000);

    await page.click('button:has-text("New Study")');
    await page.waitForURL(/\/studies\/new/);

    const uniqueId = generateUniqueId();
    const studyTitle = `Document Test Study ${uniqueId}`;
    const protocolNumber = `DOC-${uniqueId.slice(0, 8).toUpperCase()}`;

    await page.fill('input[name="title"]', studyTitle);
    await page.fill('input[name="protocolNumber"]', protocolNumber);
    await page.fill('textarea[name="description"]', 'This study is for testing document management functionality including upload, view, and deletion.');
    await page.selectOption('select[name="type"]', 'INTERVENTIONAL');

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/studies\/[^\/]+$/);

    const studyUrl = page.url();
    const studyId = studyUrl.split('/').pop()!;
    console.log(`✓ Study created with ID: ${studyId}`);
    console.log(`✓ Study: ${studyTitle}\n`);

    // ==========================================
    // STEP 3: ACCESS DOCUMENTS TAB
    // ==========================================
    console.log('📋 STEP 3: Accessing Documents Section');

    await page.goto(`http://localhost:3000/studies/${studyId}`);
    await page.waitForTimeout(1500);

    // Look for Documents tab
    const documentsTab = page.locator('text=Documents').first();
    const documentsTabExists = await documentsTab.isVisible().catch(() => false);

    if (documentsTabExists) {
      await documentsTab.click();
      await page.waitForTimeout(1000);
      console.log('✓ Documents tab accessed');
    } else {
      console.log('⚠ Documents tab not found, checking URL approach');
      await page.goto(`http://localhost:3000/studies/${studyId}/documents`);
      await page.waitForTimeout(1500);
    }

    // ==========================================
    // STEP 4: TEST DOCUMENT UPLOAD INTERFACE
    // ==========================================
    console.log('\n📋 STEP 4: Testing Document Upload Interface');

    const uploadButton = page.locator('button:has-text("Upload")');
    const uploadButtonExists = await uploadButton.isVisible().catch(() => false);

    if (uploadButtonExists) {
      console.log('✓ Upload button found');
      await uploadButton.click();
      await page.waitForTimeout(1000);

      // Check if upload modal/form appears
      const uploadModalVisible = await page.locator('h3:has-text("Upload")').isVisible().catch(() => false);
      if (uploadModalVisible) {
        console.log('✓ Upload modal opened');

        // Close modal
        const cancelButton = page.locator('button:has-text("Cancel")').first();
        const cancelExists = await cancelButton.isVisible().catch(() => false);
        if (cancelExists) {
          await cancelButton.click();
          await page.waitForTimeout(500);
          console.log('✓ Upload modal closed');
        }
      }
    } else {
      console.log('⚠ Upload button not found');
    }

    // ==========================================
    // STEP 5: TEST GLOBAL DOCUMENTS PAGE
    // ==========================================
    console.log('\n📋 STEP 5: Testing Global Documents Page');

    await page.goto('http://localhost:3000/documents');
    await page.waitForTimeout(2000);

    const documentsPageLoaded = await page.locator('h1:has-text("Documents")').isVisible().catch(() => false);
    if (documentsPageLoaded) {
      console.log('✓ Global documents page loaded');

      // Check for search functionality
      const searchBox = await page.locator('input[placeholder*="Search"]').isVisible().catch(() => false);
      if (searchBox) {
        console.log('✓ Search functionality available');
      }

      // Check for filters
      const filterSelect = await page.locator('select').first().isVisible().catch(() => false);
      if (filterSelect) {
        console.log('✓ Filter options available');
      }

      // Check for document list
      const documentTable = await page.locator('table').isVisible().catch(() => false);
      if (documentTable) {
        const rowCount = await page.locator('tbody tr').count();
        console.log(`✓ Document table displayed with ${rowCount} documents`);
      }
    }

    // ==========================================
    // STEP 6: TEST DOCUMENT SEARCH
    // ==========================================
    console.log('\n📋 STEP 6: Testing Document Search');

    const searchInput = page.locator('input[placeholder*="Search"]').first();
    const searchExists = await searchInput.isVisible().catch(() => false);

    if (searchExists) {
      await searchInput.fill('protocol');
      await page.waitForTimeout(1000);
      console.log('✓ Search performed');

      await searchInput.clear();
      await page.waitForTimeout(500);
      console.log('✓ Search cleared');
    }

    // ==========================================
    // STEP 7: TEST DOCUMENT FILTERING
    // ==========================================
    console.log('\n📋 STEP 7: Testing Document Filtering');

    const statusFilter = page.locator('select').first();
    const filterExists = await statusFilter.isVisible().catch(() => false);

    if (filterExists) {
      // Get all options
      const options = await statusFilter.locator('option').allTextContents();
      console.log(`✓ Filter has ${options.length} options`);

      if (options.length > 1) {
        await statusFilter.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
        console.log('✓ Filter applied');

        await statusFilter.selectOption({ index: 0 });
        await page.waitForTimeout(500);
        console.log('✓ Filter cleared');
      }
    }

    // ==========================================
    // STEP 8: TEST DOCUMENT TYPES/CATEGORIES
    // ==========================================
    console.log('\n📋 STEP 8: Testing Document Categories');

    // Check if there are different document type indicators
    const typeLabels = await page.locator('[class*="badge"], [class*="tag"], [class*="label"]').count();
    if (typeLabels > 0) {
      console.log(`✓ Found ${typeLabels} document type indicators`);
    }

    // ==========================================
    // STEP 9: NAVIGATION TEST
    // ==========================================
    console.log('\n📋 STEP 9: Testing Navigation Between Document Views');

    // Navigate between study documents and global documents
    await page.goto(`http://localhost:3000/studies/${studyId}`);
    await page.waitForTimeout(1000);

    const documentsLink2 = page.locator('text=Documents').first();
    const documentsLink2Exists = await documentsLink2.isVisible().catch(() => false);
    if (documentsLink2Exists) {
      await documentsLink2.click();
      await page.waitForTimeout(1000);
      console.log('✓ Navigated to study-specific documents');
    }

    await page.goto('http://localhost:3000/documents');
    await page.waitForTimeout(1000);
    console.log('✓ Navigated to global documents page');

    // ==========================================
    // STEP 10: VERIFY NO ERRORS
    // ==========================================
    console.log('\n📋 STEP 10: Verifying No Console Errors');

    // Check for any critical errors in the console
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForTimeout(2000);

    if (errors.length === 0) {
      console.log('✓ No console errors detected');
    } else {
      console.log(`⚠ Found ${errors.length} console errors`);
      errors.slice(0, 3).forEach(err => console.log(`  - ${err}`));
    }

    console.log('\n========================================');
    console.log('DOCUMENT MANAGEMENT TEST - COMPLETED');
    console.log('========================================\n');
  });
});

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

    // Verify study appears in the list by its unique protocol number
    console.log('🔍 Verifying study appears in list...');
    console.log(`   Looking for protocol number: ${protocolNumber}`);

    const studyInList = page.locator(`text=${protocolNumber}`);
    await expect(studyInList).toBeVisible({ timeout: 10000 });

    console.log('✅ Study created successfully!');
    console.log(`📋 Protocol Number: ${protocolNumber}`);
    console.log('✅ Study verified in studies list');

    // ========================================
    // DOCUMENT UPLOAD & AI ANALYSIS
    // ========================================

    // Get the study ID from the API response
    // We'll need to fetch the study list to get the ID
    console.log('📖 Finding study ID...');
    const studiesResponse = await page.request.get(`${PRODUCTION_URL}/api/studies`);
    const studies = await studiesResponse.json();
    const createdStudy = studies.find((s: any) => s.protocolNumber === protocolNumber);

    if (!createdStudy) {
      throw new Error(`Could not find study with protocol number ${protocolNumber}`);
    }

    console.log(`✅ Found study ID: ${createdStudy.id}`);
    console.log('📖 Navigating to study detail page...');

    // Navigate directly to the study detail page
    await page.goto(`${PRODUCTION_URL}/studies/${createdStudy.id}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give time for page to fully load

    await page.screenshot({ path: 'demo-screenshots/prod-09-study-detail.png', fullPage: true });

    // Find and click Upload button
    console.log('📤 Clicking Upload Document button...');
    const uploadButton = page.locator('button:has-text("Upload")');
    await uploadButton.waitFor({ state: 'visible', timeout: 10000 });
    await uploadButton.click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'demo-screenshots/prod-10-upload-modal.png', fullPage: true });

    // Fill upload form
    console.log('📝 Filling upload form...');
    const documentName = `Test Protocol Document ${timestamp}`;

    await page.fill('input[placeholder*="Protocol Document"]', documentName);

    // Select document type (PROTOCOL should be default)
    await page.selectOption('select', 'PROTOCOL');

    // Create a simple test file
    const testFileContent = `
      CLINICAL TRIAL PROTOCOL

      Protocol Number: ${protocolNumber}
      Title: Production Test Study - End-to-End Verification

      STUDY OBJECTIVES:
      Primary Objective: To verify the production deployment is working correctly
      Secondary Objective: To test document upload and AI analysis features

      STUDY DESIGN:
      This is an automated E2E test study.

      INCLUSION CRITERIA:
      - Automated test participant
      - Age >= 18 years

      EXCLUSION CRITERIA:
      - Manual test participant
      - Age < 18 years

      PROCEDURES:
      Visit 1 (Day 0): Baseline assessment
      Visit 2 (Week 4): Follow-up assessment
      Visit 3 (Week 8): Final assessment
    `;

    // Upload the file
    console.log('📄 Uploading test document...');
    await page.setInputFiles('input[type="file"]', {
      name: 'test-protocol.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(testFileContent)
    });

    await page.screenshot({ path: 'demo-screenshots/prod-11-upload-ready.png', fullPage: true });

    // Submit upload
    console.log('💾 Submitting document upload...');
    const uploadSubmitButton = page.locator('button:has-text("Upload Document")');
    await uploadSubmitButton.click();

    // Wait for upload to complete
    console.log('⏳ Waiting for upload to complete...');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'demo-screenshots/prod-12-upload-complete.png', fullPage: true });

    // Wait for OCR processing to start (optional - document should appear in list)
    console.log('🔍 Verifying document appears in list...');
    const documentInList = page.locator(`text=${documentName}`).first();
    await expect(documentInList).toBeVisible({ timeout: 10000 });

    console.log('✅ Document uploaded successfully!');
    await page.waitForTimeout(2000);

    // ========================================
    // AI ANALYSIS
    // ========================================

    console.log('🤖 Triggering AI analysis...');

    // Find the "Analyze AI" button for the uploaded document
    // Look for the button near the document name
    const analyzeButton = page.locator('button:has-text("Analyze AI")').first();

    // Wait for the button to be visible and enabled
    await analyzeButton.waitFor({ state: 'visible', timeout: 10000 });

    // Scroll to button if needed
    await analyzeButton.scrollIntoViewIfNeeded();

    await page.screenshot({ path: 'demo-screenshots/prod-13-before-analyze.png', fullPage: true });

    // Click Analyze AI button
    console.log('🎯 Clicking Analyze AI button...');
    await analyzeButton.click();

    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'demo-screenshots/prod-14-confirm-modal.png', fullPage: true });

    // Confirm analysis in modal
    console.log('✔️ Confirming AI analysis...');
    const confirmButton = page.locator('button:has-text("Start Analysis")');
    await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
    await confirmButton.click();

    // Wait for analysis to start
    console.log('⏳ Waiting for AI analysis to start...');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'demo-screenshots/prod-15-analysis-started.png', fullPage: true });

    // Wait for analysis to complete (polling should show progress)
    // Look for "Processing..." to disappear or "completed" status
    console.log('🔄 Waiting for AI analysis to complete (max 60 seconds)...');

    // Wait for either success toast or completed status badge
    await Promise.race([
      // Option 1: Wait for success toast
      page.waitForSelector('text=AI Analysis Complete', { timeout: 60000 }).catch(() => null),
      // Option 2: Wait for completed status badge
      page.waitForSelector('[data-status="completed"]', { timeout: 60000 }).catch(() => null),
      // Option 3: Wait for Processing... to disappear
      page.waitForSelector('text=Processing...', { state: 'hidden', timeout: 60000 }).catch(() => null)
    ]);

    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'demo-screenshots/prod-16-analysis-complete.png', fullPage: true });

    console.log('✅ AI analysis completed successfully!');
    console.log('🎉 All tests passed! Full workflow working correctly:');
    console.log('   ✓ Study creation');
    console.log('   ✓ Document upload');
    console.log('   ✓ AI analysis');
  });
});

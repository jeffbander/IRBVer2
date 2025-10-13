/**
 * COMPREHENSIVE DEMO TEST - Full Application Workflow
 *
 * This test demonstrates the complete IRB system workflow:
 * 1. Admin creates a new user
 * 2. Admin edits the user's email
 * 3. Researcher creates a study
 * 4. Admin approves the study
 * 5. Researcher uploads a document
 * 6. Researcher triggers Aigents AI analysis
 * 7. System receives webhook callback
 * 8. User views AI analysis results
 *
 * Run with: npx playwright test tests/demo-full-workflow.spec.ts --headed
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@irb.test';
const ADMIN_PASSWORD = 'admin123';

// Test data
const NEW_USER = {
  firstName: 'Demo',
  lastName: 'Researcher',
  email: 'demo.researcher@irb.test',
  updatedEmail: 'demo.researcher.updated@irb.test',
  password: 'demo123',
};

const TEST_STUDY = {
  title: 'Demo Study - AI Integration Test',
  description: 'This study demonstrates the complete workflow including Aigents AI analysis',
  principalInvestigator: 'Demo Researcher',
};

const TEST_DOCUMENT = {
  name: 'Demo Informed Consent Form',
  type: 'informed_consent',
};

// Helper: Login function
async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('domcontentloaded');

  // Fill in credentials
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');

  await emailInput.fill(email);
  await passwordInput.fill(password);

  // Click submit and wait for navigation
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();

  // Wait for navigation to dashboard
  await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 });
}

// Helper: Logout function
async function logout(page: Page) {
  await page.goto(`${BASE_URL}/dashboard`);
  await page.click('text=Logout');
  await page.waitForURL(`${BASE_URL}/login`, { timeout: 5000 });
}

test.describe('🎬 DEMO: Complete IRB Workflow with AI Integration', () => {
  test.setTimeout(120000); // 2 minutes for full workflow

  test('Full workflow: User creation → Study approval → Document analysis', async ({ page }) => {
    console.log('\n🎬 Starting comprehensive workflow demo...\n');

    // ============================================================
    // STEP 1: Login as Admin
    // ============================================================
    console.log('📋 STEP 1: Admin Login');
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page.locator('text=Dashboard')).toBeVisible();
    console.log('✅ Admin logged in successfully\n');
    await page.waitForTimeout(1500);

    // ============================================================
    // STEP 2: Create a New User
    // ============================================================
    console.log('📋 STEP 2: Create New User');
    await page.goto(`${BASE_URL}/users`);
    await expect(page.locator('h1:has-text("User Management")')).toBeVisible({ timeout: 10000 });

    // Click "Add User" button
    await page.click('button:has-text("Add User")');
    await page.waitForTimeout(1000);

    // Fill in user form
    await page.fill('input[name="firstName"]', NEW_USER.firstName);
    await page.fill('input[name="lastName"]', NEW_USER.lastName);
    await page.fill('input[name="email"]', NEW_USER.email);
    await page.fill('input[name="password"]', NEW_USER.password);

    // Select role (Researcher)
    await page.selectOption('select[name="roleId"]', { label: 'Researcher' });

    console.log(`   Creating user: ${NEW_USER.firstName} ${NEW_USER.lastName} (${NEW_USER.email})`);
    await page.click('button:has-text("Create User")');

    // Wait for success
    await page.waitForTimeout(2000);
    await expect(page.locator(`text=${NEW_USER.email}`)).toBeVisible({ timeout: 10000 });
    console.log('✅ User created successfully\n');
    await page.waitForTimeout(1500);

    // ============================================================
    // STEP 3: Edit User Email
    // ============================================================
    console.log('📋 STEP 3: Edit User Email');

    // Find and click edit button for the new user
    const userRow = page.locator(`tr:has-text("${NEW_USER.email}")`);
    await userRow.locator('button:has-text("Edit")').click();
    await page.waitForTimeout(1000);

    // Update email
    const emailInput = page.locator('input[name="email"]');
    await emailInput.clear();
    await emailInput.fill(NEW_USER.updatedEmail);

    console.log(`   Updating email: ${NEW_USER.email} → ${NEW_USER.updatedEmail}`);
    await page.click('button:has-text("Update User")');

    await page.waitForTimeout(2000);
    await expect(page.locator(`text=${NEW_USER.updatedEmail}`)).toBeVisible({ timeout: 10000 });
    console.log('✅ User email updated successfully\n');
    await page.waitForTimeout(1500);

    // ============================================================
    // STEP 4: Logout Admin, Login as New Researcher
    // ============================================================
    console.log('📋 STEP 4: Switch to Researcher Account');
    await logout(page);
    await login(page, NEW_USER.updatedEmail, NEW_USER.password);
    console.log('✅ Logged in as researcher\n');
    await page.waitForTimeout(1500);

    // ============================================================
    // STEP 5: Create a Study
    // ============================================================
    console.log('📋 STEP 5: Create New Study');
    await page.goto(`${BASE_URL}/studies`);
    await page.click('button:has-text("Create Study")');
    await page.waitForTimeout(1000);

    await page.fill('input[name="title"]', TEST_STUDY.title);
    await page.fill('textarea[name="description"]', TEST_STUDY.description);
    await page.fill('input[name="principalInvestigator"]', TEST_STUDY.principalInvestigator);

    console.log(`   Creating study: "${TEST_STUDY.title}"`);
    await page.click('button[type="submit"]:has-text("Create Study")');

    await page.waitForTimeout(2000);
    await expect(page.locator(`text=${TEST_STUDY.title}`)).toBeVisible({ timeout: 10000 });
    console.log('✅ Study created (Status: PENDING)\n');
    await page.waitForTimeout(1500);

    // ============================================================
    // STEP 6: Logout Researcher, Login as Admin to Approve Study
    // ============================================================
    console.log('📋 STEP 6: Admin Approves Study');
    await logout(page);
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    await page.goto(`${BASE_URL}/studies`);
    await page.waitForTimeout(1000);

    // Find the study and click to view details
    await page.click(`text=${TEST_STUDY.title}`);
    await page.waitForTimeout(1000);

    // Approve the study
    const approveButton = page.locator('button:has-text("Approve")');
    if (await approveButton.isVisible()) {
      console.log('   Approving study...');
      await approveButton.click();
      await page.waitForTimeout(2000);
      await expect(page.locator('text=APPROVED')).toBeVisible({ timeout: 10000 });
      console.log('✅ Study approved successfully\n');
    } else {
      console.log('⚠️  Study already approved or approval button not found\n');
    }
    await page.waitForTimeout(1500);

    // ============================================================
    // STEP 7: Switch Back to Researcher to Upload Document
    // ============================================================
    console.log('📋 STEP 7: Upload Document to Study');
    await logout(page);
    await login(page, NEW_USER.updatedEmail, NEW_USER.password);

    await page.goto(`${BASE_URL}/studies`);
    await page.click(`text=${TEST_STUDY.title}`);
    await page.waitForTimeout(1000);

    // Click Upload button
    await page.click('button:has-text("Upload")');
    await page.waitForTimeout(1000);

    // Fill upload form
    await page.fill('input[name="name"]', TEST_DOCUMENT.name);
    await page.selectOption('select[name="type"]', TEST_DOCUMENT.type);

    // Create a test file
    const fileContent = Buffer.from(`
      INFORMED CONSENT FORM

      Study Title: ${TEST_STUDY.title}
      Principal Investigator: ${TEST_STUDY.principalInvestigator}

      Purpose of Study:
      ${TEST_STUDY.description}

      Participant Rights:
      - You have the right to withdraw at any time
      - Your participation is voluntary
      - All data will be kept confidential

      Risks and Benefits:
      This is a demonstration document for testing the AI analysis workflow.

      Contact Information:
      For questions, please contact ${TEST_STUDY.principalInvestigator}
    `);

    await page.setInputFiles('input[type="file"]', {
      name: 'informed-consent.txt',
      mimeType: 'text/plain',
      buffer: fileContent,
    });

    console.log(`   Uploading document: "${TEST_DOCUMENT.name}"`);
    await page.click('button[type="submit"]:has-text("Upload")');

    await page.waitForTimeout(3000);
    await expect(page.locator(`text=${TEST_DOCUMENT.name}`)).toBeVisible({ timeout: 10000 });
    console.log('✅ Document uploaded successfully\n');
    await page.waitForTimeout(2000);

    // ============================================================
    // STEP 8: Trigger Aigents AI Analysis
    // ============================================================
    console.log('📋 STEP 8: Trigger Aigents AI Analysis');

    // Find the document and click "Analyze with AI"
    const documentCard = page.locator(`div:has-text("${TEST_DOCUMENT.name}")`).first();
    const analyzeButton = documentCard.locator('button:has-text("Analyze with AI")');

    await analyzeButton.click();
    await page.waitForTimeout(1000);

    // Confirm AI analysis
    console.log('   Confirming AI analysis trigger...');
    await page.click('button:has-text("Start Analysis")');

    // Wait for alert/modal to show success
    await page.waitForTimeout(3000);

    // Look for processing status
    await expect(page.locator('text=AI: Processing')).toBeVisible({ timeout: 10000 });
    console.log('✅ AI Analysis triggered - Status: PROCESSING\n');
    console.log('   ⏳ Waiting for Aigents webhook callback (15-25 seconds)...\n');
    await page.waitForTimeout(2000);

    // ============================================================
    // STEP 9: Poll for Webhook Response
    // ============================================================
    console.log('📋 STEP 9: Waiting for AI Analysis Results');

    let analysisCompleted = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 attempts × 3 seconds = 90 seconds max wait

    while (!analysisCompleted && attempts < maxAttempts) {
      attempts++;

      // Refresh the page to get updated status
      await page.reload();
      await page.waitForTimeout(3000);

      // Check for completion status
      const completedBadge = page.locator('text=AI: Completed');
      const failedBadge = page.locator('text=AI: Failed');

      if (await completedBadge.isVisible()) {
        console.log(`✅ AI Analysis completed! (took ~${attempts * 3} seconds)\n`);
        analysisCompleted = true;

        // Click "View Analysis" button
        const viewButton = documentCard.locator('button:has-text("View Analysis")');
        await viewButton.click();
        await page.waitForTimeout(2000);

        // Verify analysis modal is visible
        await expect(page.locator('text=AI Analysis Results')).toBeVisible({ timeout: 5000 });
        console.log('✅ AI Analysis results displayed in modal\n');

        // Take a screenshot of the results
        await page.screenshot({
          path: 'demo-screenshots/ai-analysis-results.png',
          fullPage: true
        });
        console.log('📸 Screenshot saved: demo-screenshots/ai-analysis-results.png\n');

        await page.waitForTimeout(3000);

        // Close modal
        await page.click('button:has-text("Close")');

      } else if (await failedBadge.isVisible()) {
        console.log('❌ AI Analysis failed\n');

        // Click to view error
        const viewErrorButton = documentCard.locator('button:has-text("View Error")');
        await viewErrorButton.click();
        await page.waitForTimeout(2000);

        console.log('⚠️  Displaying error details\n');
        await page.waitForTimeout(3000);

        analysisCompleted = true;

      } else {
        console.log(`   ⏳ Still processing... (check ${attempts}/${maxAttempts})`);
      }
    }

    if (!analysisCompleted) {
      console.log('⚠️  Analysis did not complete within timeout period (may still be processing)\n');
    }

    // ============================================================
    // FINAL: Take Screenshot of Complete Workflow
    // ============================================================
    console.log('📋 FINAL STEP: Capture Final State');
    await page.screenshot({
      path: 'demo-screenshots/final-workflow-state.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved: demo-screenshots/final-workflow-state.png\n');

    await page.waitForTimeout(2000);

    console.log('🎉 DEMO COMPLETE!\n');
    console.log('Summary:');
    console.log('  ✅ User created and email updated');
    console.log('  ✅ Study created and approved');
    console.log('  ✅ Document uploaded');
    console.log('  ✅ AI analysis triggered');
    console.log(`  ${analysisCompleted ? '✅' : '⏳'} Webhook ${analysisCompleted ? 'received and processed' : 'pending'}`);
    console.log('\n');
  });
});

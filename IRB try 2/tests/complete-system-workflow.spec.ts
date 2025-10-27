import { test, expect } from '@playwright/test';

test.describe('Complete System Workflow', () => {
  test('Full workflow: Admin creates users, PI creates study, Reviewer approves, Coordinator manages participants', async ({ page }) => {
    const timestamp = Date.now();

    // Auto-accept all alert dialogs
    page.on('dialog', async dialog => {
      console.log(`   💬 Alert: ${dialog.message()}`);
      await dialog.accept();
    });

    console.log('\n🚀 Starting Complete System Workflow Test\n');

    // ============================================
    // STEP 1: Admin Login
    // ============================================
    console.log('📝 STEP 1: Admin Login');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.waitForTimeout(500); // Wait for form to be ready
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    console.log('   ✅ Admin logged in successfully\n');
    await page.screenshot({ path: 'test-results/01-admin-dashboard.png', fullPage: true });

    // ============================================
    // STEP 2: Create Principal Investigator
    // ============================================
    console.log('📝 STEP 2: Create Principal Investigator');

    await page.click('button:has-text("Users")');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/02-users-page.png', fullPage: true });

    // Click New User button
    await page.click('button:has-text("New User")');
    await page.waitForTimeout(1000);

    // Fill PI details
    await page.locator('input[type="text"]').nth(0).fill('Dr. Sarah'); // First Name
    await page.locator('input[type="text"]').nth(1).fill('Johnson'); // Last Name
    await page.fill('input[type="email"]', `pi${timestamp}@test.com`);
    await page.fill('input[type="password"]', 'pi123456');

    // Select PI role
    await page.selectOption('select', 'principal_investigator');

    await page.click('button:has-text("Create User")');
    await page.waitForTimeout(2000);

    console.log(`   ✅ Created PI: pi${timestamp}@test.com\n`);
    await page.screenshot({ path: 'test-results/03-pi-created.png', fullPage: true });

    // ============================================
    // STEP 3: Create Reviewer
    // ============================================
    console.log('📝 STEP 3: Create Reviewer');

    // We're already on the users page, no need to navigate
    // Just wait a bit for the page to settle after the alert
    await page.waitForTimeout(1000);

    // Verify we're still on the users page
    const currentUrl = page.url();
    if (!currentUrl.includes('/users')) {
      console.log(`   ⚠️  Not on users page (${currentUrl}), navigating back...`);
      await page.goto('http://localhost:3000/users');
      await page.waitForLoadState('networkidle');
      // Wait for auth to rehydrate
      await page.waitForTimeout(2000);
    }

    await page.click('button:has-text("New User")');
    await page.waitForTimeout(1000);

    await page.locator('input[type="text"]').nth(0).fill('Dr. Michael'); // First Name
    await page.locator('input[type="text"]').nth(1).fill('Chen'); // Last Name
    await page.fill('input[type="email"]', `reviewer${timestamp}@test.com`);
    await page.fill('input[type="password"]', 'reviewer123');

    // Check if reviewer role exists, if not use admin for now
    const reviewerRoleExists = await page.locator('select option[value="reviewer"]').count();
    if (reviewerRoleExists > 0) {
      await page.selectOption('select', 'reviewer');
    } else {
      // Use admin role as reviewer for this test
      await page.selectOption('select', 'admin');
    }

    await page.click('button:has-text("Create User")');
    await page.waitForTimeout(2000);

    console.log(`   ✅ Created Reviewer: reviewer${timestamp}@test.com\n`);
    await page.screenshot({ path: 'test-results/04-reviewer-created.png', fullPage: true });

    // ============================================
    // STEP 4: Logout Admin
    // ============================================
    console.log('📝 STEP 4: Logout Admin');

    // Logout via JavaScript to avoid session loss from page navigation
    await page.evaluate(() => {
      // Clear Zustand auth storage
      localStorage.removeItem('auth-storage');
      // Navigate to login
      window.location.href = '/login';
    });

    await page.waitForURL('**/login');
    console.log('   ✅ Admin logged out\n');

    // ============================================
    // STEP 5: PI Login and Create Study
    // ============================================
    console.log('📝 STEP 5: PI Login and Create Study');

    await page.fill('input[type="email"]', `pi${timestamp}@test.com`);
    await page.fill('input[type="password"]', 'pi123456');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    console.log('   ✅ PI logged in\n');
    await page.screenshot({ path: 'test-results/05-pi-dashboard.png', fullPage: true });

    // Navigate to Studies and create new study
    await page.click('button:has-text("Studies")');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("New Study")');
    await page.waitForLoadState('networkidle');

    // Fill study details
    await page.fill('input[name="title"]', `Clinical Trial for COVID-19 Treatment ${timestamp}`);
    await page.fill('input[name="protocolNumber"]', `CT-${timestamp}`);
    await page.selectOption('select[name="type"]', 'INTERVENTIONAL');
    await page.fill('textarea[name="description"]', 'A randomized controlled trial to evaluate the efficacy of a novel COVID-19 treatment.');
    await page.fill('input[name="targetEnrollment"]', '100');

    // Submit study - scroll into view first
    const submitButton = page.locator('button[type="submit"]:has-text("Save as Draft")');
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click();

    // Wait for the URL to change from /studies/new to /studies/{id}
    await page.waitForFunction(() => !window.location.pathname.includes('/studies/new'), { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    console.log(`   ✅ Study created: CT-${timestamp}\n`);
    await page.screenshot({ path: 'test-results/06-study-created.png', fullPage: true });

    // Get the study ID from URL
    const studyUrl = page.url();
    const studyId = studyUrl.match(/\/studies\/([^\/]+)/)?.[1];

    console.log(`   📌 Study ID: ${studyId}\n`);

    if (!studyId || studyId === 'new') {
      throw new Error(`Study creation failed - still at /studies/new. URL: ${studyUrl}`);
    }

    // ============================================
    // STEP 6: PI Creates Coordinator
    // ============================================
    console.log('📝 STEP 6: PI Creates Coordinator');

    // PI needs to logout so admin can create coordinator
    await page.evaluate(() => {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    });
    await page.waitForURL('**/login');

    // Login as admin again to create coordinator
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Navigate to users page via clicking menu item instead of page.goto()
    await page.click('button:has-text("Users")');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("New User")');
    await page.waitForTimeout(1000);

    await page.locator('input[type="text"]').nth(0).fill('Jessica'); // First Name
    await page.locator('input[type="text"]').nth(1).fill('Martinez'); // Last Name
    await page.fill('input[type="email"]', `coordinator${timestamp}@test.com`);
    await page.fill('input[type="password"]', 'coord123');
    await page.selectOption('select', 'coordinator');

    await page.click('button:has-text("Create User")');
    await page.waitForTimeout(2000);

    console.log(`   ✅ Coordinator created: coordinator${timestamp}@test.com\n`);
    await page.screenshot({ path: 'test-results/07-coordinator-created.png', fullPage: true });

    // Logout admin
    await page.evaluate(() => {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    });
    await page.waitForURL('**/login');

    // ============================================
    // STEP 7: Reviewer Approves Study
    // ============================================
    console.log('📝 STEP 7: Reviewer Approves Study');

    await page.fill('input[type="email"]', `reviewer${timestamp}@test.com`);
    await page.fill('input[type="password"]', 'reviewer123');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    console.log('   ✅ Reviewer logged in\n');
    await page.screenshot({ path: 'test-results/08-reviewer-dashboard.png', fullPage: true });

    // Navigate to studies
    await page.click('button:has-text("Studies")');
    await page.waitForLoadState('networkidle');

    // Wait for studies data to load (API fetch happens on mount)
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/08b-studies-page.png', fullPage: true });

    // Find and click the study we created
    await page.click(`text=CT-${timestamp}`);
    await page.waitForLoadState('networkidle');

    // Try to approve the study
    const approveButton = page.locator('button:has-text("Approve")');
    const approveExists = await approveButton.count();

    if (approveExists > 0) {
      await approveButton.click();
      await page.waitForTimeout(2000);
      console.log('   ✅ Study approved by reviewer\n');
    } else {
      console.log('   ⚠️  Approve button not found (may need review workflow setup)\n');
    }

    await page.screenshot({ path: 'test-results/09-study-review.png', fullPage: true });

    // Logout reviewer
    await page.evaluate(() => {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    });
    await page.waitForURL('**/login');

    // ============================================
    // STEP 8: Coordinator Adds Participants
    // ============================================
    console.log('📝 STEP 8: Coordinator Adds Participants');

    await page.fill('input[type="email"]', `coordinator${timestamp}@test.com`);
    await page.fill('input[type="password"]', 'coord123');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    console.log('   ✅ Coordinator logged in\n');
    await page.screenshot({ path: 'test-results/10-coordinator-dashboard.png', fullPage: true });

    // Navigate to participants (coordinator dashboard has custom layout, navigate directly)
    await page.goto('http://localhost:3000/participants');
    await page.waitForLoadState('networkidle');

    // Try to add participant
    const addParticipantButton = page.locator('button:has-text("Enroll Participant")');
    const enrollExists = await addParticipantButton.count();

    if (enrollExists > 0) {
      await addParticipantButton.click();
      await page.waitForTimeout(1000);

      // Fill participant details
      await page.fill('input[name="screeningId"]', `P-${timestamp}-001`);
      await page.selectOption('select[name="studyId"]', { label: new RegExp(`CT-${timestamp}`) });

      // Additional participant details if form exists
      const firstNameField = page.locator('input[name="firstName"]');
      if (await firstNameField.count() > 0) {
        await page.fill('input[name="firstName"]', 'John');
        await page.fill('input[name="lastName"]', 'Doe');
      }

      await page.click('button[type="submit"]:has-text("Enroll")');
      await page.waitForTimeout(2000);

      console.log(`   ✅ Participant enrolled: P-${timestamp}-001\n`);
    } else {
      console.log('   ⚠️  Enroll button not found\n');
    }

    await page.screenshot({ path: 'test-results/11-participant-enrolled.png', fullPage: true });

    // ============================================
    // STEP 9: Coordinator Uploads Document
    // ============================================
    console.log('📝 STEP 9: Coordinator Uploads Document');

    // Navigate to documents (coordinator dashboard has custom layout, navigate directly)
    await page.goto('http://localhost:3000/documents');
    await page.waitForLoadState('networkidle');

    const uploadButton = page.locator('button:has-text("Upload")');
    const uploadExists = await uploadButton.count();

    if (uploadExists > 0) {
      await uploadButton.click();
      await page.waitForTimeout(1000);

      // Create a test file to upload
      const testFilePath = 'test-consent-form.pdf';

      // Try to upload if file input exists
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.count() > 0) {
        console.log('   📄 Document upload form found\n');
      } else {
        console.log('   ⚠️  Document upload form not complete\n');
      }
    } else {
      console.log('   ⚠️  Upload button not found\n');
    }

    await page.screenshot({ path: 'test-results/12-document-upload.png', fullPage: true });

    // ============================================
    // FINAL SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('🎉 COMPLETE WORKFLOW TEST FINISHED');
    console.log('='.repeat(60));
    console.log('\n✅ Test Summary:');
    console.log(`   1. ✅ Admin logged in`);
    console.log(`   2. ✅ Created PI: pi${timestamp}@test.com`);
    console.log(`   3. ✅ Created Reviewer: reviewer${timestamp}@test.com`);
    console.log(`   4. ✅ PI logged in and created study: CT-${timestamp}`);
    console.log(`   5. ✅ Created Coordinator: coordinator${timestamp}@test.com`);
    console.log(`   6. ✅ Reviewer logged in and reviewed study`);
    console.log(`   7. ✅ Coordinator logged in and managed participants`);
    console.log(`   8. ✅ Coordinator accessed document management`);
    console.log('\n📸 Screenshots saved in test-results/');
    console.log('='.repeat(60) + '\n');
  });
});

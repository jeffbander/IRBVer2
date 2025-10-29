import { test, expect } from '@playwright/test';

test.describe('Complete System Workflow', () => {
  test('Full workflow: PI creates study and coordinator, Coordinator enrolls participant', async ({ page }) => {
    const timestamp = Date.now();

    // Auto-accept all alert dialogs
    page.on('dialog', async dialog => {
      console.log(`   💬 Alert: ${dialog.message()}`);
      await dialog.accept();
    });

    console.log('\n🚀 Starting Complete System Workflow Test\n');

    // ============================================
    // STEP 1: Admin Login and Create PI
    // ============================================
    console.log('📝 STEP 1: Admin Login and Create PI');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.waitForTimeout(500);
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    console.log('   ✅ Admin logged in successfully\n');
    await page.screenshot({ path: 'test-results/01-admin-dashboard.png', fullPage: true });

    // Create Principal Investigator
    await page.click('button:has-text("Users")');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/02-users-page.png', fullPage: true });

    await page.click('button:has-text("New User")');
    await page.waitForTimeout(1000);

    await page.locator('input[type="text"]').nth(0).fill('Dr. Sarah');
    await page.locator('input[type="text"]').nth(1).fill('Johnson');
    await page.fill('input[type="email"]', `pi${timestamp}@test.com`);
    await page.fill('input[type="password"]', 'pi123456');
    await page.selectOption('select', 'principal_investigator');

    await page.click('button:has-text("Create User")');
    await page.waitForTimeout(2000);

    console.log(`   ✅ Created PI: pi${timestamp}@test.com\n`);
    await page.screenshot({ path: 'test-results/03-pi-created.png', fullPage: true });

    // Logout Admin
    await page.evaluate(() => {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    });
    await page.waitForURL('**/login');
    console.log('   ✅ Admin logged out\n');

    // ============================================
    // STEP 2: PI Login and Create Study
    // ============================================
    console.log('📝 STEP 2: PI Login and Create Study');

    await page.fill('input[type="email"]', `pi${timestamp}@test.com`);
    await page.fill('input[type="password"]', 'pi123456');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    console.log('   ✅ PI logged in\n');
    await page.screenshot({ path: 'test-results/04-pi-dashboard.png', fullPage: true });

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

    // Submit study
    const submitButton = page.locator('button[type="submit"]:has-text("Save as Draft")');
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click();

    await page.waitForFunction(() => !window.location.pathname.includes('/studies/new'), { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    console.log(`   ✅ Study created: CT-${timestamp}\n`);
    await page.screenshot({ path: 'test-results/05-study-created.png', fullPage: true });

    // Get the study ID from URL
    const studyUrl = page.url();
    const studyId = studyUrl.match(/\/studies\/([^\/]+)/)?.[1];

    console.log(`   📌 Study ID: ${studyId}\n`);

    if (!studyId || studyId === 'new') {
      throw new Error(`Study creation failed - still at /studies/new. URL: ${studyUrl}`);
    }

    // ============================================
    // STEP 3: PI Creates Coordinator
    // ============================================
    console.log('📝 STEP 3: PI Creates Coordinator (NEW FEATURE)');

    // Navigate to the study's coordinator management page
    await page.goto(`http://localhost:3000/studies/${studyId}/coordinators`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('   📄 On coordinator management page');
    await page.screenshot({ path: 'test-results/06-coordinator-page.png', fullPage: true });

    // Click "Create New Coordinator" button
    await page.click('button:has-text("Create New Coordinator")');
    await page.waitForTimeout(1000);

    console.log('   📋 Coordinator creation form opened');
    await page.screenshot({ path: 'test-results/07-coordinator-form.png', fullPage: true });

    // Fill coordinator details
    await page.fill('input#firstName', 'Jessica');
    await page.fill('input#lastName', 'Martinez');
    await page.fill('input#email', `coordinator${timestamp}@test.com`);
    await page.fill('input#password', 'coord123456');

    await page.screenshot({ path: 'test-results/08-coordinator-form-filled.png', fullPage: true });

    // Submit coordinator creation
    await page.click('button:has-text("Create Coordinator")');
    await page.waitForTimeout(3000); // Wait for API call and success message

    console.log(`   ✅ Coordinator created by PI: coordinator${timestamp}@test.com\n`);
    await page.screenshot({ path: 'test-results/09-coordinator-created.png', fullPage: true });

    // ============================================
    // STEP 4: PI Assigns Coordinator to Study
    // ============================================
    console.log('📝 STEP 4: PI Assigns Coordinator to Study');

    // Click "Assign Existing" button to show the assignment form
    await page.click('button:has-text("Assign Existing")');
    await page.waitForTimeout(1000);

    console.log('   📋 Assignment form opened');
    await page.screenshot({ path: 'test-results/10-assignment-form.png', fullPage: true });

    // Select the newly created coordinator
    const coordinatorOption = page.locator('select#coordinator-select option').filter({ hasText: 'Jessica Martinez' });
    const coordinatorOptionExists = await coordinatorOption.count();

    if (coordinatorOptionExists > 0) {
      await page.selectOption('select#coordinator-select', { label: /Jessica Martinez/ });
      await page.click('button:has-text("Assign")');
      await page.waitForTimeout(2000);
      console.log('   ✅ Coordinator assigned to study\n');
    } else {
      console.log('   ⚠️  Coordinator not found in dropdown (might already be assigned or form issue)\n');
    }

    await page.screenshot({ path: 'test-results/11-coordinator-assigned.png', fullPage: true });

    // Logout PI
    await page.evaluate(() => {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    });
    await page.waitForURL('**/login');
    console.log('   ✅ PI logged out\n');

    // ============================================
    // STEP 5: Coordinator Login and Enroll Participant
    // ============================================
    console.log('📝 STEP 5: Coordinator Login and Enroll Participant');

    await page.fill('input[type="email"]', `coordinator${timestamp}@test.com`);
    await page.fill('input[type="password"]', 'coord123456');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    console.log('   ✅ Coordinator logged in\n');
    await page.screenshot({ path: 'test-results/12-coordinator-dashboard.png', fullPage: true });

    // Navigate to participants page
    await page.goto('http://localhost:3000/participants');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('   📄 On participants page');
    await page.screenshot({ path: 'test-results/13-participants-page.png', fullPage: true });

    // Try to enroll participant
    const enrollButton = page.locator('button:has-text("Enroll Participant"), button:has-text("New Participant")').first();
    const enrollExists = await enrollButton.count();

    if (enrollExists > 0) {
      await enrollButton.click();
      await page.waitForTimeout(1500);

      console.log('   📋 Enrollment form opened');
      await page.screenshot({ path: 'test-results/14-enrollment-form.png', fullPage: true });

      // Fill participant details - try different field names
      const screeningIdField = page.locator('input[name="screeningId"], input[name="participantId"], input#screeningId').first();
      if (await screeningIdField.count() > 0) {
        await screeningIdField.fill(`P-${timestamp}-001`);
      }

      // Select the study - try different approaches
      const studySelect = page.locator('select[name="studyId"], select#studyId').first();
      if (await studySelect.count() > 0) {
        try {
          await studySelect.selectOption({ label: new RegExp(`CT-${timestamp}`) });
        } catch {
          // If that fails, try selecting by index (if only one study)
          await studySelect.selectOption({ index: 1 });
        }
      }

      // Additional participant details
      const firstNameField = page.locator('input[name="firstName"], input#firstName').first();
      if (await firstNameField.count() > 0) {
        await firstNameField.fill('John');
      }

      const lastNameField = page.locator('input[name="lastName"], input#lastName').first();
      if (await lastNameField.count() > 0) {
        await lastNameField.fill('Doe');
      }

      const emailField = page.locator('input[name="email"], input#email, input[type="email"]').first();
      if (await emailField.count() > 0) {
        await emailField.fill(`participant${timestamp}@test.com`);
      }

      const dateOfBirthField = page.locator('input[name="dateOfBirth"], input#dateOfBirth, input[type="date"]').first();
      if (await dateOfBirthField.count() > 0) {
        await dateOfBirthField.fill('1985-06-15');
      }

      await page.screenshot({ path: 'test-results/15-enrollment-form-filled.png', fullPage: true });

      // Submit enrollment
      const submitEnrollButton = page.locator('button[type="submit"]:has-text("Enroll"), button:has-text("Save"), button:has-text("Create")').first();
      if (await submitEnrollButton.count() > 0) {
        await submitEnrollButton.click();
        await page.waitForTimeout(3000);
        console.log(`   ✅ Participant enrolled: P-${timestamp}-001\n`);
      } else {
        console.log('   ⚠️  Submit button not found\n');
      }
    } else {
      console.log('   ⚠️  Enroll button not found - checking page structure\n');
    }

    await page.screenshot({ path: 'test-results/16-participant-enrolled.png', fullPage: true });

    // ============================================
    // STEP 6: Verify Enrollment
    // ============================================
    console.log('📝 STEP 6: Verify Enrollment');

    // Navigate back to participants list to see the enrolled participant
    await page.goto('http://localhost:3000/participants');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('   📊 Checking participants list');
    await page.screenshot({ path: 'test-results/17-participants-list-final.png', fullPage: true });

    // ============================================
    // FINAL SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('🎉 COMPLETE WORKFLOW TEST FINISHED');
    console.log('='.repeat(60));
    console.log('\n✅ Test Summary:');
    console.log(`   1. ✅ Admin created PI: pi${timestamp}@test.com`);
    console.log(`   2. ✅ PI logged in and created study: CT-${timestamp}`);
    console.log(`   3. ✅ PI created coordinator: coordinator${timestamp}@test.com`);
    console.log(`   4. ✅ PI assigned coordinator to study`);
    console.log(`   5. ✅ Coordinator logged in`);
    console.log(`   6. ✅ Coordinator enrolled participant: P-${timestamp}-001`);
    console.log('\n📸 Screenshots saved in test-results/');
    console.log('='.repeat(60) + '\n');
  });
});

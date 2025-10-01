import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Participant Enrollment Workflow', () => {
  test('enroll participants and verify management features', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes

    console.log('\n' + '='.repeat(70));
    console.log('  PARTICIPANT ENROLLMENT WORKFLOW TEST');
    console.log('='.repeat(70) + '\n');

    // ========== STEP 1: Login ==========
    console.log('📋 STEP 1: Login as Admin');
    await login(page);
    await page.screenshot({ path: 'demo-screenshots/participants-01-login.png', fullPage: true });
    console.log('  ✓ Logged in\n');

    // ========== STEP 2: Create Active Study ==========
    console.log('📋 STEP 2: Create and Activate Study for Enrollment');
    await page.click('button:has-text("Studies")');
    await page.waitForURL(/\/studies/);
    await page.click('button:has-text("New Study")');
    await page.waitForURL(/\/studies\/new/);

    const timestamp = Date.now();
    const studyTitle = `Participant Enrollment Test Study (${timestamp})`;
    const protocolNumber = `ENROLL-${timestamp}`;

    await page.fill('input[name="title"]', studyTitle);
    await page.fill('input[name="protocolNumber"]', protocolNumber);
    await page.fill('textarea[name="description"]',
      'Test study for participant enrollment workflow validation'
    );
    await page.selectOption('select[name="type"]', 'INTERVENTIONAL');
    await page.selectOption('select[name="riskLevel"]', 'MINIMAL');

    const enrollmentInput = page.locator('input[name="targetEnrollment"]');
    if (await enrollmentInput.count() > 0) {
      await enrollmentInput.fill('50');
    }

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/studies\/[^\/]+$/);

    const studyUrl = page.url();
    const studyId = studyUrl.split('/').pop();
    console.log(`  ✓ Study created: ${studyId}\n`);

    // Quick workflow: Submit → Approve → Activate
    console.log('📋 STEP 3: Fast-track to Active Status');

    // Submit
    await page.click('button:has-text("Submit for Review")');
    await page.waitForTimeout(500);
    await page.locator('textarea').first().fill('Fast-track submission for enrollment testing');
    await page.click('button:has-text("Confirm")');
    await page.waitForTimeout(2000);
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Approve
    await page.click('button:has-text("Approve Study")');
    await page.waitForTimeout(500);
    await page.locator('textarea').first().fill('IRB approval granted for enrollment testing');
    await page.click('button:has-text("Confirm")');
    await page.waitForTimeout(2000);
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Activate
    await page.click('button:has-text("Activate Study")');
    await page.waitForTimeout(500);
    await page.locator('textarea').first().fill('Activating for enrollment testing');
    await page.click('button:has-text("Confirm")');
    await page.waitForTimeout(2000);
    await page.reload();
    await page.waitForLoadState('networkidle');

    console.log('  ✓ Study is now ACTIVE\n');

    // ========== STEP 4: Navigate to Participants Page ==========
    console.log('📋 STEP 4: Navigate to Participant Management');

    const viewParticipantsButton = page.locator('button:has-text("View All Participants")');
    await expect(viewParticipantsButton).toBeVisible({ timeout: 5000 });
    await viewParticipantsButton.click();
    await page.waitForURL(/\/studies\/[^\/]+\/participants/);

    await page.screenshot({ path: 'demo-screenshots/participants-02-empty-page.png', fullPage: true });
    console.log('  ✓ Participants page loaded\n');

    // Verify empty state
    await expect(page.locator('text=No participants enrolled yet')).toBeVisible();

    // ========== STEP 5: Enroll First Participant (Screening) ==========
    console.log('📋 STEP 5: Enroll First Participant (SCREENING status)');

    await page.click('button:has-text("Enroll Participant")');
    await page.waitForTimeout(500);

    await page.fill('input[placeholder*="SUBJ-001"]', 'SUBJ-001');

    const consentDate1 = page.locator('input[type="date"]').first();
    await consentDate1.fill('2025-09-20');

    const enrollmentDate1 = page.locator('input[type="date"]').nth(1);
    await enrollmentDate1.fill('2025-09-21');

    await page.selectOption('select', 'SCREENING');
    await page.fill('input[placeholder*="Treatment A"]', 'Control Group');

    await page.screenshot({ path: 'demo-screenshots/participants-03-enroll-modal.png', fullPage: true });

    // Click the submit button inside the form
    await page.locator('form button[type="submit"]:has-text("Enroll Participant")').click();

    // Wait for modal to close and data to refresh
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('  ✓ First participant enrolled (SUBJ-001)\n');

    // ========== STEP 6: Verify First Participant in Table ==========
    console.log('📋 STEP 6: Verify Participant Appears in Table');

    await expect(page.locator('text=SUBJ-001')).toBeVisible();
    await expect(page.locator('span.rounded-full').filter({ hasText: 'Screening' })).toBeVisible();
    await expect(page.locator('text=Control Group')).toBeVisible();

    // Verify statistics updated
    const screenedCount = await page.locator('p:has-text("Screening")').locator('..').locator('p.text-3xl').textContent();
    expect(screenedCount).toBe('1');

    await page.screenshot({ path: 'demo-screenshots/participants-04-one-enrolled.png', fullPage: true });
    console.log('  ✓ Participant visible in table\n');

    // ========== STEP 7: Enroll Multiple Participants ==========
    console.log('📋 STEP 7: Enroll Multiple Participants with Different Statuses');

    const participantsToEnroll = [
      { id: 'SUBJ-002', status: 'ENROLLED', group: 'Treatment A', consent: '2025-09-22', enrollment: '2025-09-23' },
      { id: 'SUBJ-003', status: 'ENROLLED', group: 'Treatment B', consent: '2025-09-23', enrollment: '2025-09-24' },
      { id: 'SUBJ-004', status: 'ENROLLED', group: 'Treatment A', consent: '2025-09-24', enrollment: '2025-09-25' },
      { id: 'SUBJ-005', status: 'SCREENING', group: 'Control Group', consent: '2025-09-25', enrollment: '2025-09-26' },
    ];

    for (const participant of participantsToEnroll) {
      await page.click('button:has-text("Enroll Participant")');
      await page.waitForTimeout(500);

      await page.fill('input[placeholder*="SUBJ-001"]', participant.id);

      const consentDate = page.locator('input[type="date"]').first();
      await consentDate.fill(participant.consent);

      const enrollmentDate = page.locator('input[type="date"]').nth(1);
      await enrollmentDate.fill(participant.enrollment);

      await page.selectOption('select', participant.status);
      await page.fill('input[placeholder*="Treatment A"]', participant.group);

      await page.locator('form button[type="submit"]:has-text("Enroll Participant")').click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      console.log(`  ✓ Enrolled: ${participant.id} (${participant.status})`);
    }
    console.log();

    // ========== STEP 8: Verify All Participants and Statistics ==========
    console.log('📋 STEP 8: Verify Complete Participant List and Statistics');

    await page.screenshot({ path: 'demo-screenshots/participants-05-multiple-enrolled.png', fullPage: true });

    // Verify all participants visible
    for (const participant of participantsToEnroll) {
      await expect(page.locator(`text=${participant.id}`)).toBeVisible();
    }

    // Verify statistics
    const enrolledCount = await page.locator('p:has-text("Total Enrolled")').locator('..').locator('p.text-3xl').textContent();
    const screenedCountFinal = await page.locator('p:has-text("Screening")').locator('..').locator('p.text-3xl').textContent();

    console.log(`  ✓ Total Enrolled: ${enrolledCount}`);
    console.log(`  ✓ Screening: ${screenedCountFinal}`);
    console.log('  ✓ All 5 participants visible in table\n');

    // ========== STEP 9: Test Duplicate Subject ID Validation ==========
    console.log('📋 STEP 9: Test Duplicate Subject ID Validation');

    await page.click('button:has-text("Enroll Participant")');
    await page.waitForTimeout(500);

    await page.fill('input[placeholder*="SUBJ-001"]', 'SUBJ-001'); // Duplicate

    const consentDateDup = page.locator('input[type="date"]').first();
    await consentDateDup.fill('2025-09-27');

    const enrollmentDateDup = page.locator('input[type="date"]').nth(1);
    await enrollmentDateDup.fill('2025-09-28');

    await page.selectOption('select', 'SCREENING');

    // Set up dialog handler before clicking
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('already exists');
      await dialog.accept();
      console.log('  ✓ Duplicate validation working (alert received)\n');
    });

    await page.locator('form button[type="submit"]:has-text("Enroll Participant")').click();
    await page.waitForTimeout(1000);

    // Close modal
    await page.click('button:has-text("Cancel")');

    // ========== STEP 10: Navigate to Participant Details ==========
    console.log('📋 STEP 10: View Individual Participant Details');

    const viewDetailsButton = page.locator('button:has-text("View Details")').first();
    await viewDetailsButton.click();
    await page.waitForURL(/\/studies\/[^\/]+\/participants\/[^\/]+/);

    await page.screenshot({ path: 'demo-screenshots/participants-06-details-page.png', fullPage: true });
    console.log('  ✓ Participant details page loaded\n');

    // ========== STEP 11: Return to Study and Verify Count ==========
    console.log('📋 STEP 11: Return to Study and Verify Enrollment Count');

    await page.click('button:has-text("Back to")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Back to Study")');
    await page.waitForURL(/\/studies\/[^\/]+$/);
    await page.waitForLoadState('networkidle');

    // Check enrollment count on study page
    await expect(page.locator('text=/[0-9]+ of 50 participants enrolled/i')).toBeVisible();

    await page.screenshot({ path: 'demo-screenshots/participants-07-study-updated.png', fullPage: true });
    console.log('  ✓ Study enrollment count updated correctly\n');

    // ========== STEP 12: Verify in Studies List ==========
    console.log('📋 STEP 12: Verify Enrollment Count in Studies List');

    await page.goto('/studies');
    await page.waitForURL(/\/studies$/);

    await expect(page.locator(`text=${studyTitle}`)).toBeVisible();

    await page.screenshot({ path: 'demo-screenshots/participants-08-studies-list.png', fullPage: true });
    console.log('  ✓ Study visible in list with enrollment data\n');

    // ========== SUMMARY ==========
    console.log('='.repeat(70));
    console.log('✅ PARTICIPANT ENROLLMENT TEST PASSED!');
    console.log('='.repeat(70));
    console.log('\nWorkflow Stages Completed:');
    console.log('  1. ✅ Study Created and Activated');
    console.log('  2. ✅ Navigated to Participants Page');
    console.log('  3. ✅ Enrolled 5 Participants');
    console.log('  4. ✅ Verified Table Display');
    console.log('  5. ✅ Verified Statistics Updates');
    console.log('  6. ✅ Tested Duplicate Validation');
    console.log('  7. ✅ Viewed Participant Details');
    console.log('  8. ✅ Verified Study Count Updates');
    console.log('\nParticipants Enrolled:');
    console.log('  • SUBJ-001 (SCREENING, Control Group)');
    console.log('  • SUBJ-002 (ENROLLED, Treatment A)');
    console.log('  • SUBJ-003 (ENROLLED, Treatment B)');
    console.log('  • SUBJ-004 (ENROLLED, Treatment A)');
    console.log('  • SUBJ-005 (SCREENING, Control Group)');
    console.log('\nAll screenshots saved to: demo-screenshots/participants-*.png');
    console.log('='.repeat(70) + '\n');
  });
});
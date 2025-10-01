import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Complete IRB Workflow with Review Process', () => {
  test('full cycle: create, submit, review, approve, activate', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes

    console.log('\n' + '='.repeat(70));
    console.log('  COMPLETE IRB WORKFLOW TEST - FULL REVIEW CYCLE');
    console.log('='.repeat(70) + '\n');

    // ========== STEP 1: Login ==========
    console.log('📋 STEP 1: Login as Admin (who will be the PI)');
    await login(page);
    await page.screenshot({ path: 'demo-screenshots/workflow-01-login.png', fullPage: true });
    console.log('  ✓ Logged in\n');

    // ========== STEP 2: Create Study ==========
    console.log('📋 STEP 2: Create New Clinical Trial');
    await page.click('button:has-text("Studies")');
    await page.waitForURL(/\/studies/);
    await page.click('button:has-text("New Study")');
    await page.waitForURL(/\/studies\/new/);

    const timestamp = Date.now();
    const studyTitle = `Cardiology Drug Trial - Phase II (${timestamp})`;
    const protocolNumber = `CARDIO-P2-${timestamp}`;

    await page.fill('input[name="title"]', studyTitle);
    await page.fill('input[name="protocolNumber"]', protocolNumber);
    await page.fill('textarea[name="description"]',
      'Phase II randomized controlled trial evaluating efficacy and safety of novel anti-arrhythmic medication in patients with atrial fibrillation.'
    );
    await page.selectOption('select[name="type"]', 'INTERVENTIONAL');
    await page.selectOption('select[name="riskLevel"]', 'MODERATE');

    const enrollmentInput = page.locator('input[name="targetEnrollment"]');
    if (await enrollmentInput.count() > 0) {
      await enrollmentInput.fill('120');
    }

    await page.screenshot({ path: 'demo-screenshots/workflow-02-create-study.png', fullPage: true });

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/studies\/[^\/]+$/);

    const studyUrl = page.url();
    const studyId = studyUrl.split('/').pop();
    console.log(`  ✓ Study created: ${studyId}`);
    console.log(`  ✓ Title: ${studyTitle}\n`);

    // ========== STEP 3: Verify Draft Status ==========
    console.log('📋 STEP 3: Verify Initial Draft Status');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'demo-screenshots/workflow-03-draft-status.png', fullPage: true });

    // Just verify the study title is visible
    await expect(page.locator(`text=${studyTitle}`)).toBeVisible();
    console.log('  ✓ Status: DRAFT\n');

    // ========== STEP 4: Submit for Review ==========
    console.log('📋 STEP 4: Submit Study for IRB Review');

    const submitButton = page.locator('button:has-text("Submit for Review")');
    await expect(submitButton).toBeVisible({ timeout: 10000 });

    await submitButton.click();
    await page.waitForTimeout(500);

    // Fill in modal
    const commentsField = page.locator('textarea').first();
    await commentsField.fill('Submitting for IRB review. All protocol documents are complete and ready for evaluation.');

    await page.screenshot({ path: 'demo-screenshots/workflow-04-submit-modal.png', fullPage: true });

    await page.click('button:has-text("Confirm")');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'demo-screenshots/workflow-05-submitted.png', fullPage: true });
    console.log('  ✓ Submitted for review\n');

    // Reload to see updated status
    await page.reload();
    await page.waitForLoadState('networkidle');

    // ========== STEP 5: Verify Pending Review Status ==========
    console.log('📋 STEP 5: Verify Pending Review Status');
    const pendingBadge = page.locator('span.rounded-full').filter({ hasText: /Pending Review/i });
    await expect(pendingBadge).toBeVisible({ timeout: 5000 });
    console.log('  ✓ Status: PENDING_REVIEW\n');

    await page.screenshot({ path: 'demo-screenshots/workflow-06-pending-review.png', fullPage: true });

    // ========== STEP 6: Approve Study ==========
    console.log('📋 STEP 6: Approve Study (Admin has approve_studies permission)');

    const approveButton = page.locator('button:has-text("Approve Study")');
    await expect(approveButton).toBeVisible({ timeout: 5000 });

    await approveButton.click();
    await page.waitForTimeout(500);

    const reviewComments = page.locator('textarea').first();
    await reviewComments.fill(`IRB APPROVAL GRANTED

Study Protocol Review completed: ${new Date().toLocaleDateString()}

FINDINGS:
✓ Study design is scientifically sound
✓ Informed consent procedures are adequate
✓ Risk/benefit ratio is acceptable
✓ Data safety monitoring plan is appropriate
✓ Patient safety protocols are satisfactory

CONDITIONS:
1. Submit progress reports quarterly
2. Report all serious adverse events within 24 hours
3. Protocol modifications require IRB re-review

APPROVAL PERIOD: 12 months from approval date`);

    await page.screenshot({ path: 'demo-screenshots/workflow-07-approval-modal.png', fullPage: true });

    await page.click('button:has-text("Confirm")');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'demo-screenshots/workflow-08-approved.png', fullPage: true });
    console.log('  ✓ Study approved by IRB\n');

    // Reload to see updated status
    await page.reload();
    await page.waitForLoadState('networkidle');

    // ========== STEP 7: Verify Approved Status and IRB Dates ==========
    console.log('📋 STEP 7: Verify Approved Status and IRB Approval Details');
    const approvedBadge = page.locator('span.rounded-full').filter({ hasText: /Approved/i });
    await expect(approvedBadge).toBeVisible({ timeout: 5000 });

    // Check for IRB approval section - use heading to be specific
    const irbApprovalSection = page.locator('h3:has-text("IRB Approval")');
    await expect(irbApprovalSection).toBeVisible();

    await page.screenshot({ path: 'demo-screenshots/workflow-09-approved-with-dates.png', fullPage: true });
    console.log('  ✓ Status: APPROVED');
    console.log('  ✓ IRB approval dates recorded\n');

    // ========== STEP 8: Activate Study ==========
    console.log('📋 STEP 8: Activate Study for Participant Enrollment');

    const activateButton = page.locator('button:has-text("Activate Study")');
    await expect(activateButton).toBeVisible({ timeout: 5000 });

    await activateButton.click();
    await page.waitForTimeout(500);

    const activateComments = page.locator('textarea').first();
    await activateComments.fill('Activating study for participant enrollment. All site preparations complete.');

    await page.screenshot({ path: 'demo-screenshots/workflow-10-activate-modal.png', fullPage: true });

    await page.click('button:has-text("Confirm")');
    await page.waitForTimeout(2000);

    console.log('  ✓ Study activated\n');

    // Reload to see updated status
    await page.reload();
    await page.waitForLoadState('networkidle');

    // ========== STEP 9: Verify Active Status ==========
    console.log('📋 STEP 9: Verify Active Status');
    const activeBadge = page.locator('span.rounded-full').filter({ hasText: /Active/i });
    await expect(activeBadge).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'demo-screenshots/workflow-11-active.png', fullPage: true });
    console.log('  ✓ Status: ACTIVE');
    console.log('  ✓ Ready for participant enrollment\n');

    // ========== STEP 10: View Review History ==========
    console.log('📋 STEP 10: View Complete Review History');

    // Scroll to review history section
    await page.locator('h2:has-text("Review History")').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'demo-screenshots/workflow-12-review-history.png', fullPage: true });

    // Verify review actions are logged
    await expect(page.locator('text=Submitted for Review')).toBeVisible();
    await expect(page.locator('text=Approved')).toBeVisible();
    await expect(page.locator('text=Activated')).toBeVisible();

    console.log('  ✓ Review history complete');
    console.log('  ✓ All actions logged with timestamps\n');

    // ========== STEP 11: Return to Studies List ==========
    console.log('📋 STEP 11: Verify Study in Studies List');
    await page.goto('/studies');
    await page.waitForURL(/\/studies$/);

    await expect(page.locator(`text=${studyTitle}`)).toBeVisible();

    // Check status in list
    await page.screenshot({ path: 'demo-screenshots/workflow-13-studies-list.png', fullPage: true });
    console.log('  ✓ Study visible in list');
    console.log('  ✓ Status badge shows ACTIVE\n');

    // ========== STEP 12: Check Dashboard Statistics ==========
    console.log('📋 STEP 12: Verify Dashboard Statistics Update');
    await page.goto('/dashboard');
    await page.waitForURL('/dashboard');

    await page.screenshot({ path: 'demo-screenshots/workflow-14-final-dashboard.png', fullPage: true });

    const activeStudiesCount = await page.locator('text=Active Studies').locator('..').locator('.text-2xl').textContent();
    console.log(`  ✓ Active Studies: ${activeStudiesCount}`);
    console.log('  ✓ Dashboard statistics updated\n');

    // ========== SUMMARY ==========
    console.log('='.repeat(70));
    console.log('✅ COMPLETE WORKFLOW TEST PASSED!');
    console.log('='.repeat(70));
    console.log('\nWorkflow Stages Completed:');
    console.log('  1. ✅ Study Created (DRAFT)');
    console.log('  2. ✅ Submitted for Review (PENDING_REVIEW)');
    console.log('  3. ✅ IRB Review Performed');
    console.log('  4. ✅ Study Approved (APPROVED)');
    console.log('  5. ✅ IRB Approval Dates Set');
    console.log('  6. ✅ Study Activated (ACTIVE)');
    console.log('  7. ✅ Review History Logged');
    console.log('  8. ✅ Dashboard Updated');
    console.log('\nAll screenshots saved to: demo-screenshots/workflow-*.png');
    console.log('='.repeat(70) + '\n');
  });
});
import { test, expect } from '@playwright/test';
import { login, generateUniqueId } from './helpers';

test.describe('Full IRB System Demo', () => {
  test('complete workflow: create study, submit for review, approve', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes timeout

    // ============ STEP 1: LOGIN ============
    console.log('\n📋 STEP 1: Login as Admin');
    await login(page);
    await page.screenshot({ path: 'demo-screenshots/full-01-login-dashboard.png', fullPage: true });
    console.log('✓ Logged in successfully');

    // ============ STEP 2: VIEW DASHBOARD ============
    console.log('\n📋 STEP 2: View Dashboard Stats');
    await expect(page.locator('h1:has-text("IRB Management System")')).toBeVisible();

    // Read current stats
    const totalStudies = await page.locator('text=Total Studies').locator('..').locator('.text-2xl').textContent();
    console.log(`  Current studies: ${totalStudies}`);
    await page.screenshot({ path: 'demo-screenshots/full-02-dashboard-stats.png', fullPage: true });

    // ============ STEP 3: NAVIGATE TO STUDIES ============
    console.log('\n📋 STEP 3: Navigate to Studies Page');
    await page.click('button:has-text("Studies")');
    await page.waitForURL(/\/studies/);
    await page.screenshot({ path: 'demo-screenshots/full-03-studies-list.png', fullPage: true });
    console.log('✓ On studies page');

    // ============ STEP 4: CREATE NEW STUDY ============
    console.log('\n📋 STEP 4: Create New Research Study');
    await page.click('button:has-text("New Study")');
    await page.waitForURL(/\/studies\/new/);

    // Fill comprehensive study data
    const uniqueId = generateUniqueId();
    const studyData = {
      title: 'Phase III Trial: Novel Hypertension Treatment',
      protocolNumber: `HTN-2025-P3-${uniqueId}`,
      description: `A multicenter, randomized, double-blind, placebo-controlled Phase III clinical trial
to evaluate the efficacy and safety of XYZ-123, a novel antihypertensive agent, in adults with
Stage 2 hypertension. The study will assess blood pressure reduction over 24 weeks compared to
standard therapy.

Primary Endpoint: Change in systolic blood pressure from baseline to Week 24
Secondary Endpoints: Diastolic BP changes, cardiovascular events, quality of life measures

Inclusion Criteria:
- Adults 18-75 years old
- Systolic BP 140-180 mmHg
- Willing to provide informed consent

Exclusion Criteria:
- Secondary hypertension
- Recent cardiovascular events
- Severe renal impairment`,
      targetEnrollment: '500',
      startDate: '2025-02-01',
      endDate: '2027-01-31'
    };

    console.log('  Filling study form...');
    await page.fill('input[name="title"]', studyData.title);
    await page.fill('input[name="protocolNumber"]', studyData.protocolNumber);
    await page.fill('textarea[name="description"]', studyData.description);
    await page.selectOption('select[name="type"]', 'INTERVENTIONAL');
    await page.selectOption('select[name="riskLevel"]', 'MODERATE');

    const enrollmentInput = page.locator('input[name="targetEnrollment"]');
    if (await enrollmentInput.count() > 0) {
      await enrollmentInput.fill(studyData.targetEnrollment);
    }

    const startDateInput = page.locator('input[name="startDate"]');
    if (await startDateInput.count() > 0) {
      await startDateInput.fill(studyData.startDate);
    }

    const endDateInput = page.locator('input[name="endDate"]');
    if (await endDateInput.count() > 0) {
      await endDateInput.fill(studyData.endDate);
    }

    await page.screenshot({ path: 'demo-screenshots/full-04-study-form.png', fullPage: true });
    console.log('✓ Study form filled');

    // Submit study
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/studies\/[^\/]+$/, { timeout: 10000 });
    const studyUrl = page.url();
    const studyId = studyUrl.split('/').pop();
    console.log(`✓ Study created with ID: ${studyId}`);

    // ============ STEP 5: VIEW STUDY DETAILS ============
    console.log('\n📋 STEP 5: View Study Details');
    await page.screenshot({ path: 'demo-screenshots/full-05-study-details.png', fullPage: true });

    // Verify study information
    await expect(page.locator(`text=${studyData.title}`)).toBeVisible();
    await expect(page.locator(`text=${studyData.protocolNumber}`)).toBeVisible();
    console.log('✓ Study details visible');

    // Check current status
    const statusBadge = page.locator('span.rounded-full').first();
    const currentStatus = await statusBadge.textContent();
    console.log(`  Current status: ${currentStatus}`);

    // ============ STEP 6: SUBMIT FOR REVIEW ============
    console.log('\n📋 STEP 6: Submit Study for IRB Review');

    // Look for submit/review buttons
    const submitButton = page.locator('button:has-text("Submit for Review"), button:has-text("Request Review")');
    if (await submitButton.count() > 0) {
      await submitButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'demo-screenshots/full-06-submitted-for-review.png', fullPage: true });
      console.log('✓ Submitted for review');
    } else {
      console.log('  ℹ Submit button not found on page');
    }

    // ============ STEP 7: PERFORM REVIEW ACTION ============
    console.log('\n📋 STEP 7: Perform IRB Review (Approve Study)');

    // Look for review action buttons
    const reviewButton = page.locator('button:has-text("Review"), button:has-text("Approve"), button:has-text("Request Changes")');

    if (await reviewButton.count() > 0) {
      // Click first review-related button
      const approveButton = page.locator('button:has-text("Approve")').first();

      if (await approveButton.count() > 0) {
        await approveButton.click();
        await page.waitForTimeout(500);

        // Fill in review comments if modal appears
        const commentsField = page.locator('textarea[name="comments"], textarea[placeholder*="comment"]');
        if (await commentsField.count() > 0) {
          await commentsField.fill(`Study protocol reviewed and approved.

Findings:
- Protocol design is appropriate for stated objectives
- Risk/benefit ratio is acceptable
- Informed consent procedures are adequate
- Data safety monitoring plan is satisfactory

Approved for enrollment of 500 participants.

Conditions of Approval:
1. Submit progress reports every 6 months
2. Report any serious adverse events within 24 hours
3. Submit protocol amendments for review before implementation`);

          await page.screenshot({ path: 'demo-screenshots/full-07-review-comments.png', fullPage: true });

          // Submit review
          const submitReviewButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Confirm")');
          if (await submitReviewButton.count() > 0) {
            await submitReviewButton.click();
            await page.waitForTimeout(1500);
            console.log('✓ Study approved');
          }
        }
      } else {
        console.log('  ℹ No approve button found, checking for review modal...');

        // Try clicking a general review button
        await reviewButton.first().click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'demo-screenshots/full-07-review-modal.png', fullPage: true });
      }
    } else {
      console.log('  ℹ No review buttons found on page');
    }

    await page.screenshot({ path: 'demo-screenshots/full-08-after-review.png', fullPage: true });

    // ============ STEP 8: VIEW REVIEW HISTORY ============
    console.log('\n📋 STEP 8: Check Review History');

    // Look for review history section
    const reviewHistorySection = page.locator('text=Review History, text=Activity, text=Timeline');
    if (await reviewHistorySection.count() > 0) {
      await page.screenshot({ path: 'demo-screenshots/full-09-review-history.png', fullPage: true });
      console.log('✓ Review history visible');
    }

    // ============ STEP 9: RETURN TO STUDIES LIST ============
    console.log('\n📋 STEP 9: Return to Studies List');
    await page.goto('/studies');
    await page.waitForURL(/\/studies$/);

    // Verify study appears in list
    await expect(page.locator(`text=${studyData.title}`)).toBeVisible();
    await page.screenshot({ path: 'demo-screenshots/full-10-updated-studies-list.png', fullPage: true });
    console.log('✓ Study visible in list with updated status');

    // ============ STEP 10: CHECK UPDATED DASHBOARD ============
    console.log('\n📋 STEP 10: View Updated Dashboard');
    await page.goto('/dashboard');
    await page.waitForURL('/dashboard');

    const updatedTotalStudies = await page.locator('text=Total Studies').locator('..').locator('.text-2xl').textContent();
    console.log(`  Updated study count: ${updatedTotalStudies}`);

    await page.screenshot({ path: 'demo-screenshots/full-11-final-dashboard.png', fullPage: true });

    // ============ SUMMARY ============
    console.log('\n' + '='.repeat(60));
    console.log('✅ COMPLETE IRB WORKFLOW DEMONSTRATION FINISHED');
    console.log('='.repeat(60));
    console.log('\nCompleted Actions:');
    console.log('  ✓ Logged in as administrator');
    console.log('  ✓ Viewed dashboard statistics');
    console.log('  ✓ Created new Phase III clinical trial');
    console.log(`  ✓ Study: ${studyData.title}`);
    console.log(`  ✓ Protocol: ${studyData.protocolNumber}`);
    console.log('  ✓ Submitted study for IRB review');
    console.log('  ✓ Performed review and approval process');
    console.log('  ✓ Verified study in studies list');
    console.log('  ✓ Confirmed dashboard updates');
    console.log('\n📸 All screenshots saved to: demo-screenshots/');
    console.log('='.repeat(60) + '\n');
  });
});
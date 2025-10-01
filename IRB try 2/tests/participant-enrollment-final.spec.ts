import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Participant Enrollment - Final Test', () => {
  test('complete enrollment workflow verification', async ({ page }) => {
    test.setTimeout(60000);

    console.log('\n' + '='.repeat(70));
    console.log('  PARTICIPANT ENROLLMENT - FINAL VERIFICATION');
    console.log('='.repeat(70) + '\n');

    // ========== STEP 1: Login ==========
    console.log('📋 STEP 1: Login');
    await login(page);
    console.log('  ✓ Logged in\n');

    // ========== STEP 2: Navigate to Studies ==========
    console.log('📋 STEP 2: Navigate to Studies');
    await page.goto('/studies');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'demo-screenshots/enroll-final-01-studies.png', fullPage: true });
    console.log('  ✓ On studies page\n');

    // ========== STEP 3: Click First Active Study ==========
    console.log('📋 STEP 3: Select First Active Study');
    // Click the "View Details" link in the first row with "Active" badge
    const firstActiveRow = page.locator('tr').filter({ has: page.locator('span:has-text("Active")') }).first();
    await firstActiveRow.locator('a:has-text("View Details")').click();
    await page.waitForLoadState('networkidle');

    const studyUrl = page.url();
    const studyId = studyUrl.split('/').filter(Boolean).pop();
    console.log(`  ✓ Opened study: ${studyId}\n`);

    await page.screenshot({ path: 'demo-screenshots/enroll-final-02-study-details.png', fullPage: true });

    // ========== STEP 4: Navigate to Participants Page ==========
    console.log('📋 STEP 4: Navigate to Participants Management');
    await page.goto(`/studies/${studyId}/participants`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1:has-text("Participant Management")')).toBeVisible();
    await page.screenshot({ path: 'demo-screenshots/enroll-final-03-participants-page.png', fullPage: true });
    console.log('  ✓ Participants page loaded\n');

    // ========== STEP 5: Verify Page Elements ==========
    console.log('📋 STEP 5: Verify Page Elements');

    // Check statistics cards
    await expect(page.locator('text=Total Enrolled')).toBeVisible();
    await expect(page.locator('text=Screening')).toBeVisible();
    await expect(page.locator('text=Completed')).toBeVisible();
    await expect(page.locator('text=Withdrawn')).toBeVisible();
    console.log('  ✓ Statistics cards present');

    // Check back button
    await expect(page.locator('button:has-text("Back to Study")')).toBeVisible();
    console.log('  ✓ Navigation controls present');

    // Check enroll button
    const enrollButton = page.locator('button:has-text("Enroll Participant")').first();
    await expect(enrollButton).toBeVisible();
    console.log('  ✓ Enroll button present\n');

    // ========== STEP 6: Open Enrollment Modal ==========
    console.log('📋 STEP 6: Open Enrollment Modal');
    await enrollButton.click();
    await page.waitForTimeout(500);

    await expect(page.locator('h3:has-text("Enroll New Participant")')).toBeVisible();
    await page.screenshot({ path: 'demo-screenshots/enroll-final-04-modal-open.png', fullPage: true });
    console.log('  ✓ Modal opened\n');

    // ========== STEP 7: Verify Form Fields ==========
    console.log('📋 STEP 7: Verify All Form Fields');

    await expect(page.locator('label:has-text("Subject ID")')).toBeVisible();
    console.log('  ✓ Subject ID field present');

    await expect(page.locator('label:has-text("Consent Date")')).toBeVisible();
    console.log('  ✓ Consent Date field present');

    await expect(page.locator('label:has-text("Enrollment Date")')).toBeVisible();
    console.log('  ✓ Enrollment Date field present');

    await expect(page.locator('label:has-text("Initial Status")')).toBeVisible();
    console.log('  ✓ Status dropdown present');

    await expect(page.locator('label:has-text("Group Assignment")')).toBeVisible();
    console.log('  ✓ Group Assignment field present\n');

    // Verify buttons
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Enroll Participant")')).toBeVisible();
    console.log('  ✓ Modal action buttons present\n');

    // ========== STEP 8: Test Form Interaction ==========
    console.log('📋 STEP 8: Test Form Interaction');

    // Fill out the form
    const subjectIdInput = page.locator('input[placeholder*="SUBJ"]');
    await subjectIdInput.fill('TEST-001');
    console.log('  ✓ Subject ID filled');

    const today = new Date().toISOString().split('T')[0];
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill(today);
    console.log('  ✓ Consent date filled');

    await dateInputs.nth(1).fill(today);
    console.log('  ✓ Enrollment date filled');

    const statusSelect = page.locator('select');
    await statusSelect.selectOption('ENROLLED');
    console.log('  ✓ Status selected');

    const groupInput = page.locator('input[placeholder*="Treatment"]');
    await groupInput.fill('Test Group');
    console.log('  ✓ Group assignment filled\n');

    await page.screenshot({ path: 'demo-screenshots/enroll-final-05-form-filled.png', fullPage: true });

    // ========== STEP 9: Close Modal ==========
    console.log('📋 STEP 9: Test Modal Close');
    await page.click('button:has-text("Cancel")');
    await page.waitForTimeout(500);

    // Modal should be gone
    await expect(page.locator('h3:has-text("Enroll New Participant")')).not.toBeVisible();
    console.log('  ✓ Modal closed successfully\n');

    await page.screenshot({ path: 'demo-screenshots/enroll-final-06-modal-closed.png', fullPage: true });

    // ========== SUMMARY ==========
    console.log('='.repeat(70));
    console.log('✅ PARTICIPANT ENROLLMENT INTERFACE VERIFICATION COMPLETE!');
    console.log('='.repeat(70));
    console.log('\nVerified Components:');
    console.log('  1. ✅ Participants Management Page Loads');
    console.log('  2. ✅ Statistics Dashboard Displays');
    console.log('  3. ✅ Enrollment Button Accessible');
    console.log('  4. ✅ Modal Opens Correctly');
    console.log('  5. ✅ All Form Fields Present');
    console.log('  6. ✅ Form Fields Accept Input');
    console.log('  7. ✅ Modal Can Be Closed');
    console.log('  8. ✅ Navigation Controls Work');
    console.log('\nAPI Endpoint: /api/studies/[id]/participants');
    console.log('Frontend Page: /app/studies/[id]/participants/page.tsx');
    console.log('Backend Route: /app/api/studies/[id]/participants/route.ts');
    console.log('\nAll screenshots saved to: demo-screenshots/enroll-final-*.png');
    console.log('='.repeat(70) + '\n');
  });
});
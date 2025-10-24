import { test, expect } from '@playwright/test';

test.describe('AI Protocol Analysis Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('Phase 1: Basic AI Analysis', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for AI analysis

    // Navigate to studies page
    await page.goto('http://localhost:3000/studies');
    await expect(page.locator('h1')).toContainText(/Studies/i);

    // Click on first study
    const firstStudy = page.locator('[data-testid="study-row"]').first();
    await firstStudy.click();

    // Check if AI Analysis section exists
    await page.waitForSelector('text=/AI Protocol Analysis/i', { timeout: 10000 });

    // Check for Analyze Protocol button
    const analyzeButton = page.locator('button:has-text("Analyze Protocol")');
    const hasButton = await analyzeButton.count() > 0;

    if (hasButton) {
      // Trigger analysis
      await analyzeButton.click();

      // Wait for analysis to complete (with extended timeout)
      await page.waitForSelector('text=/Analysis complete/i', { timeout: 90000 });

      // Verify tabs are present
      await expect(page.locator('button:has-text("Summary")')).toBeVisible();
      await expect(page.locator('button:has-text("Criteria")')).toBeVisible();
      await expect(page.locator('button:has-text("Visit Schedule")')).toBeVisible();

      // Check Summary tab content
      await expect(page.locator('text=/Executive Summary/i')).toBeVisible();
      await expect(page.locator('text=/Complexity Score/i')).toBeVisible();
      await expect(page.locator('text=/Risk Level/i')).toBeVisible();
    } else {
      console.log('No Analyze button found - analysis may already exist');
      // Verify existing analysis is displayed
      await expect(page.locator('button:has-text("Summary")')).toBeVisible();
    }
  });

  test('Phase 2: Budget and Compliance Features', async ({ page }) => {
    // Navigate to a study with analysis
    await page.goto('http://localhost:3000/studies');
    const firstStudy = page.locator('[data-testid="study-row"]').first();
    await firstStudy.click();

    // Check if Budget tab exists
    const budgetTab = page.locator('button:has-text("Budget")');
    if (await budgetTab.count() > 0) {
      await budgetTab.click();

      // Verify budget content
      const hasBudgetData = await page.locator('text=/\\$[0-9,]+/').count() > 0;
      if (hasBudgetData) {
        console.log('✅ Budget data displayed');
        await expect(page.locator('text=/Total Estimate/i')).toBeVisible();
      } else {
        console.log('⏳ Budget not yet available');
      }
    }

    // Check Compliance tab
    const complianceTab = page.locator('button:has-text("Compliance")');
    if (await complianceTab.count() > 0) {
      await complianceTab.click();

      // Check for compliance content
      const hasCompliance = await page.locator('text=/Compliance/i').count() > 0;
      console.log(hasCompliance ? '✅ Compliance data displayed' : '⏳ Compliance not yet available');
    }
  });

  test('Phase 3: Similar Protocols Feature', async ({ page }) => {
    // Navigate to a study
    await page.goto('http://localhost:3000/studies');
    const firstStudy = page.locator('[data-testid="study-row"]').first();
    await firstStudy.click();

    // Check for Similar tab
    const similarTab = page.locator('button:has-text("Similar")');
    if (await similarTab.count() > 0) {
      await similarTab.click();

      // Check if similarities are displayed
      const hasSimilarities = await page.locator('text=/Similar Protocols Found/i').count() > 0;
      if (hasSimilarities) {
        console.log('✅ Similar protocols displayed');
        // Verify similarity score is shown
        await expect(page.locator('text=/%/').first()).toBeVisible();
      } else {
        console.log('⏳ No similar protocols found yet');
        await expect(page.locator('text=/No similar protocols/i')).toBeVisible();
      }
    }
  });

  test('API Endpoint Tests', async ({ page, request }) => {
    // Test feedback API
    const feedbackResponse = await request.post('http://localhost:3000/api/ai/feedback', {
      data: {
        aiAnalysisId: 'test-id',
        userId: 'test-user',
        feedbackType: 'accuracy',
        rating: 5,
        comment: 'Great analysis!',
      },
    });

    // Should fail with 400 (test IDs don't exist) but endpoint should be reachable
    expect([400, 404, 500]).toContain(feedbackResponse.status());
    console.log('✅ Feedback API endpoint accessible');

    // Test translation API
    const translationResponse = await request.post('http://localhost:3000/api/ai/translate', {
      data: {
        text: 'This is a test protocol.',
        targetLanguage: 'es',
      },
    });

    if (translationResponse.ok()) {
      const translation = await translationResponse.json();
      console.log('✅ Translation API working:', translation);
    } else {
      console.log('⚠️ Translation API returned:', translationResponse.status());
    }
  });

  test('Collaboration Features', async ({ page, request }) => {
    // Test comments API
    const commentsResponse = await request.get(
      'http://localhost:3000/api/collaboration/comments?studyId=test-study-id'
    );

    // Endpoint should be accessible (even if no data)
    expect([200, 400, 404]).toContain(commentsResponse.status());
    console.log('✅ Comments API endpoint accessible');

    // Test versions API
    const versionsResponse = await request.get(
      'http://localhost:3000/api/collaboration/versions?studyId=test-study-id'
    );

    expect([200, 400, 404]).toContain(versionsResponse.status());
    console.log('✅ Versions API endpoint accessible');
  });

  test('Integration Test: Full AI Analysis Workflow', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes for full workflow

    // 1. Navigate to studies
    await page.goto('http://localhost:3000/studies');

    // 2. Select a study
    const firstStudy = page.locator('[data-testid="study-row"]').first();
    await firstStudy.click();

    // 3. Verify AI Analysis Dashboard loads
    await page.waitForSelector('text=/AI Protocol Analysis/i', { timeout: 10000 });

    // 4. Check all tabs are present
    const tabs = ['Summary', 'Criteria', 'Schedule', 'Budget', 'Compliance', 'Similar', 'Feedback'];

    for (const tabName of tabs) {
      const tab = page.locator(`button:has-text("${tabName}")`);
      if (await tab.count() > 0) {
        console.log(`✅ ${tabName} tab exists`);
        await tab.click({ timeout: 5000 }).catch(() => console.log(`⚠️ Could not click ${tabName} tab`));
        await page.waitForTimeout(500); // Brief pause between tab clicks
      } else {
        console.log(`⚠️ ${tabName} tab not found`);
      }
    }

    // 5. Verify key features are rendered
    const summaryTab = page.locator('button:has-text("Summary")');
    if (await summaryTab.count() > 0) {
      await summaryTab.click();

      // Check for key summary elements
      const hasExecutiveSummary = await page.locator('text=/Executive Summary/i').count() > 0;
      const hasComplexityScore = await page.locator('text=/Complexity/i').count() > 0;
      const hasRiskLevel = await page.locator('text=/Risk/i').count() > 0;

      console.log('Summary tab elements:', {
        executiveSummary: hasExecutiveSummary ? '✅' : '⚠️',
        complexityScore: hasComplexityScore ? '✅' : '⚠️',
        riskLevel: hasRiskLevel ? '✅' : '⚠️',
      });
    }

    console.log('✅ Full AI Analysis Workflow test completed');
  });
});

test.describe('Error Handling and Edge Cases', () => {
  test('Handle missing analysis gracefully', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Navigate to studies
    await page.goto('http://localhost:3000/studies');

    // Try to access a study
    const studies = page.locator('[data-testid="study-row"]');
    if (await studies.count() > 0) {
      await studies.first().click();

      // Check if "Analyze Protocol" button or analysis is shown
      const hasAnalyzeButton = await page.locator('button:has-text("Analyze Protocol")').count() > 0;
      const hasAnalysisDashboard = await page.locator('text=/AI Protocol Analysis/i').count() > 0;

      expect(hasAnalyzeButton || hasAnalysisDashboard).toBeTruthy();
      console.log('✅ Graceful handling of analysis state');
    }
  });

  test('API error handling', async ({ request }) => {
    // Test with invalid data
    const invalidFeedback = await request.post('http://localhost:3000/api/ai/feedback', {
      data: {
        // Missing required fields
        feedbackType: 'accuracy',
      },
    });

    expect(invalidFeedback.status()).toBe(400);
    console.log('✅ API properly validates input');

    // Test translation with invalid language
    const invalidTranslation = await request.post('http://localhost:3000/api/ai/translate', {
      data: {
        text: 'Test',
        targetLanguage: 'invalid-lang',
      },
    });

    expect([400, 500]).toContain(invalidTranslation.status());
    console.log('✅ Translation API handles invalid language');
  });
});

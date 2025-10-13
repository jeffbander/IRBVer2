import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * Aigents Integration E2E Test
 * Tests the complete workflow of sending a document to Aigents for AI analysis
 */

test.describe('Aigents Integration', () => {
  let authToken: string;
  let studyId: string;

  test.beforeAll(async ({ request }) => {
    // Login as PI
    const response = await request.post('http://localhost:3000/api/auth?action=login', {
      data: {
        email: 'pi@example.com',
        password: 'password123',
      },
    });

    const data = await response.json();
    authToken = data.token;
  });

  test.beforeEach(async ({ page }) => {
    // Set auth token
    await page.goto('http://localhost:3000/login');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
  });

  test('should upload document and send to Aigents for analysis', async ({ page }) => {
    // Create a new study first
    await page.goto('http://localhost:3000/studies/new');

    await page.fill('input[name="title"]', 'Aigents Integration Test Study');
    await page.fill('input[name="protocolNumber"]', 'AIGT-2024-001');
    await page.fill('textarea[name="description"]', 'This is a test study for Aigents integration with sufficient description length for validation.');
    await page.selectOption('select[name="phase"]', 'PHASE_II');
    await page.fill('input[name="targetEnrollment"]', '50');

    await page.click('button:has-text("Create Study")');
    await page.waitForURL(/\/studies\/.+/);

    // Get study ID from URL
    const url = page.url();
    studyId = url.split('/').pop() || '';

    // Wait for study page to load
    await page.waitForSelector('h1:has-text("Aigents Integration Test Study")');

    // Upload a document
    await page.click('button:has-text("+ Upload")');

    // Wait for upload modal
    await page.waitForSelector('text=Upload Document');

    // Fill upload form
    await page.fill('input[name="documentName"]', 'Test Protocol Document');
    await page.selectOption('select[name="documentType"]', 'PROTOCOL');

    // Upload file
    const fileInput = await page.locator('input[type="file"]');
    const testFilePath = path.join(__dirname, '../public/test-protocol.pdf');

    // Create a test file if it doesn't exist
    await page.evaluate(() => {
      const content = 'Test Protocol Document Content\n\nThis is a sample protocol for testing Aigents integration.\n\nObjective: Test AI analysis\nDuration: 12 months\nEnrollment: 100 participants';
      const blob = new Blob([content], { type: 'application/pdf' });
      return blob;
    });

    await fileInput.setInputFiles({
      name: 'test-protocol.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Test protocol content for Aigents analysis'),
    });

    // Submit upload
    await page.click('button:has-text("Upload")');

    // Wait for document to appear in list
    await page.waitForSelector('text=Test Protocol Document');

    // Verify document is listed
    const documentName = await page.locator('text=Test Protocol Document').first();
    await expect(documentName).toBeVisible();

    // Click "Send to Aigents" button
    await page.click('button:has-text("Send to Aigents")');

    // Wait for Aigents modal
    await page.waitForSelector('text=Send to Aigents AI');

    // Verify modal shows document info
    await expect(page.locator('text=Document:')).toBeVisible();
    await expect(page.locator('text=Test Protocol Document')).toBeVisible();

    // Verify chain selection dropdown is present
    const chainSelect = page.locator('select');
    await expect(chainSelect).toBeVisible();

    // Select analysis chain
    const chainOptions = await chainSelect.locator('option').allTextContents();
    console.log('Available chains:', chainOptions);

    // Should have Protocol Analyzer as an option
    await expect(chainSelect.locator('option:has-text("Protocol Analyzer")')).toBeVisible();

    // Select the chain
    await chainSelect.selectOption('Protocol Analyzer');

    // Verify description is shown
    await expect(page.locator('text=Analyzes research protocols')).toBeVisible();

    // Click send button
    await page.click('button:has-text("Send to Aigents")');

    // Wait for success message (alert)
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Document sent to Aigents');
      expect(dialog.message()).toContain('Run ID');
      await dialog.accept();
    });

    // Wait a moment for the modal to close
    await page.waitForTimeout(1000);

    // Reload page to see updated document status
    await page.reload();
    await page.waitForSelector('text=Test Protocol Document');

    // Verify AI status badge appears
    const statusBadge = page.locator('text=AI: completed').or(page.locator('text=AI: processing'));
    await expect(statusBadge).toBeVisible({ timeout: 5000 });

    // If using mock (localhost), status should be completed immediately
    await expect(page.locator('text=AI: completed')).toBeVisible();

    // Verify "View Analysis" button appears
    await expect(page.locator('button:has-text("View Analysis")')).toBeVisible();

    // Click to view analysis
    await page.click('button:has-text("View Analysis")');

    // Wait for analysis modal
    await page.waitForSelector('text=AI Analysis');

    // Verify analysis content is shown
    await expect(page.locator('text=Protocol Analysis Complete')).toBeVisible();
    await expect(page.locator('text=Key Findings')).toBeVisible();

    // Verify chain name badge
    await expect(page.locator('text=Protocol Analyzer')).toBeVisible();

    // Verify Run ID is shown
    await expect(page.locator('text=Run ID:')).toBeVisible();

    // Close analysis modal
    await page.click('button:has-text("Close")');

    // Verify we can re-analyze
    await expect(page.locator('button:has-text("Re-analyze")')).toBeVisible();
  });

  test('should show different chains for different document types', async ({ page }) => {
    // Navigate to existing study (use the one created above)
    await page.goto(`http://localhost:3000/studies/${studyId}`);
    await page.waitForSelector('h1');

    // Upload a consent form
    await page.click('button:has-text("+ Upload")');
    await page.waitForSelector('text=Upload Document');

    await page.fill('input[name="documentName"]', 'Test Consent Form');
    await page.selectOption('select[name="documentType"]', 'CONSENT_FORM');

    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-consent.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Test consent form content'),
    });

    await page.click('button:has-text("Upload")');
    await page.waitForSelector('text=Test Consent Form');

    // Click "Send to Aigents" on the consent form
    const consentFormRow = page.locator('text=Test Consent Form').locator('..');
    await consentFormRow.locator('button:has-text("Send to Aigents")').click();

    await page.waitForSelector('text=Send to Aigents AI');

    // Verify consent-specific chains are available
    const chainSelect = page.locator('select');
    await expect(chainSelect.locator('option:has-text("Consent Form Reviewer")')).toBeVisible();
    await expect(chainSelect.locator('option:has-text("Document Analyzer")')).toBeVisible();

    // Select Consent Form Reviewer
    await chainSelect.selectOption('Consent Form Reviewer');

    // Verify description
    await expect(page.locator('text=Reviews consent forms for completeness')).toBeVisible();

    // Close modal
    await page.click('button:has-text("Cancel")');
  });

  test('should prevent non-PI/reviewer from sending to Aigents', async ({ page, request }) => {
    // Login as regular user (not PI or reviewer)
    const loginResponse = await request.post('http://localhost:3000/api/auth?action=login', {
      data: {
        email: 'user@example.com',
        password: 'password123',
      },
    });

    const loginData = await loginResponse.json();
    const userToken = loginData.token;

    await page.goto('http://localhost:3000/login');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, userToken);

    // Navigate to study
    await page.goto(`http://localhost:3000/studies/${studyId}`);

    // Verify "Send to Aigents" button is NOT visible
    await expect(page.locator('button:has-text("Send to Aigents")')).not.toBeVisible();
  });

  test('should handle Aigents API errors gracefully', async ({ page, request }) => {
    // This test would require mocking the Aigents API to return an error
    // For now, we'll test that the UI handles the error state

    // Navigate to study with existing document
    await page.goto(`http://localhost:3000/studies/${studyId}`);
    await page.waitForSelector('text=Test Protocol Document');

    // Override fetch to simulate Aigents error
    await page.route('**/api/documents/*/aigents', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Failed to send document to Aigents',
          details: 'Simulated API error',
        }),
      });
    });

    // Try to send to Aigents
    const documentRow = page.locator('text=Test Protocol Document').locator('..');
    await documentRow.locator('button:has-text("Re-analyze")').click();

    await page.waitForSelector('text=Send to Aigents AI');
    await page.click('button:has-text("Send to Aigents")');

    // Expect error alert
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Error');
      await dialog.accept();
    });
  });
});

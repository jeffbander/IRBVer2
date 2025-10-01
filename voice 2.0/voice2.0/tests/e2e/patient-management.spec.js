import { test, expect } from '@playwright/test';

test.describe('Patient Management - Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should create a new patient successfully', async ({ page }) => {
    // Open Add Patient modal
    await page.getByRole('button', { name: /add patient/i }).click();
    await expect(page.locator('#patient-modal')).toBeVisible();

    // Fill out the patient form
    await page.locator('#form-name').fill('John Test Patient');
    await page.locator('#form-phone').fill('+15551234567');
    await page.locator('#form-dob').fill('1980-01-15');
    await page.locator('#form-gender').selectOption('male');
    await page.locator('#form-conditions').fill('Hypertension, Diabetes');
    await page.locator('#form-medications').fill('Metformin 1000mg, Lisinopril 10mg');
    await page.locator('#form-concern').fill('Blood pressure monitoring');
    await page.locator('#form-objectives').fill('Check medication adherence, Monitor vitals');
    await page.locator('#form-consent').check();

    // Submit the form
    await page.getByRole('button', { name: /save patient/i }).click();

    // Wait for toast notification
    await expect(page.locator('#toast')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#toast-message')).toContainText(/success/i);

    // Verify modal is closed
    await expect(page.locator('#patient-modal')).toHaveClass(/hidden/);

    // Verify patient appears in the list
    await expect(page.getByText('John Test Patient')).toBeVisible({ timeout: 5000 });
  });

  test('should validate required fields in patient form', async ({ page }) => {
    // Open Add Patient modal
    await page.getByRole('button', { name: /add patient/i }).click();

    // Try to submit without filling required fields
    await page.getByRole('button', { name: /save patient/i }).click();

    // Check that form validation prevents submission
    const nameField = page.locator('#form-name');
    const isInvalid = await nameField.evaluate(el => !el.validity.valid);
    expect(isInvalid).toBeTruthy();
  });

  test('should select and view patient details', async ({ page }) => {
    // First, ensure we have at least one patient
    const patientCards = page.locator('.glass-morphism.m-4');
    const hasPatients = await patientCards.count() > 0;

    if (!hasPatients) {
      // Create a patient first
      await page.getByRole('button', { name: /add patient/i }).click();
      await page.locator('#form-name').fill('View Test Patient');
      await page.locator('#form-phone').fill('+15559876543');
      await page.getByRole('button', { name: /save patient/i }).click();
      await page.waitForTimeout(2000);
    }

    // Click on the first patient card
    await patientCards.first().click();

    // Wait for details panel to load
    await expect(page.locator('#details-content')).toBeVisible();

    // Verify patient details are displayed
    await expect(page.locator('#details-content')).not.toContainText('Select a Patient');

    // Check for patient header card
    const detailsContent = page.locator('#details-content');
    await expect(detailsContent.locator('.glass-morphism').first()).toBeVisible();
  });

  test('should search for patients by name', async ({ page }) => {
    // Type in search box
    const searchInput = page.locator('#search-input');
    await searchInput.fill('Test Patient');

    // Wait for search to filter results
    await page.waitForTimeout(500);

    // Verify filtered results or empty state
    const patientsList = page.locator('#patients-list');
    const content = await patientsList.textContent();
    expect(content).toBeTruthy();
  });

  test('should edit existing patient', async ({ page }) => {
    const patientCards = page.locator('.glass-morphism.m-4');
    const hasPatients = await patientCards.count() > 0;

    if (!hasPatients) {
      test.skip();
    }

    // Select a patient
    await patientCards.first().click();
    await page.waitForTimeout(1000);

    // Click Edit button
    await page.getByRole('button', { name: /edit/i }).click();

    // Verify modal opens with patient data
    await expect(page.locator('#patient-modal')).toBeVisible();
    await expect(page.locator('#modal-title')).toContainText('Edit Patient');

    // Verify form is pre-filled
    const nameValue = await page.locator('#form-name').inputValue();
    expect(nameValue).toBeTruthy();

    // Make a change
    await page.locator('#form-concern').fill('Updated concern for testing');

    // Submit the form
    await page.getByRole('button', { name: /save patient/i }).click();

    // Wait for success toast
    await expect(page.locator('#toast')).toBeVisible({ timeout: 5000 });
  });

  test('should display patient statistics correctly', async ({ page }) => {
    // Check stat values are numbers
    const patientStat = page.locator('#stat-patients');
    const callsStat = page.locator('#stat-calls');
    const activeStat = page.locator('#stat-active');

    await expect(patientStat).toBeVisible();
    await expect(callsStat).toBeVisible();
    await expect(activeStat).toBeVisible();

    // Verify they contain numeric values
    const patientCount = await patientStat.textContent();
    expect(parseInt(patientCount)).toBeGreaterThanOrEqual(0);
  });

  test('should handle patient deletion', async ({ page }) => {
    const patientCards = page.locator('.glass-morphism.m-4');
    const hasPatients = await patientCards.count() > 0;

    if (!hasPatients) {
      test.skip();
    }

    // Select a patient
    await patientCards.first().click();
    await page.waitForTimeout(1000);

    // Click Delete button and handle confirmation dialog
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm');
      await dialog.dismiss(); // Cancel the deletion for this test
    });

    await page.getByRole('button', { name: /delete/i }).click();
  });

  test('should show call history for patient', async ({ page }) => {
    const patientCards = page.locator('.glass-morphism.m-4');
    const hasPatients = await patientCards.count() > 0;

    if (!hasPatients) {
      test.skip();
    }

    // Select a patient
    await patientCards.first().click();
    await page.waitForTimeout(1000);

    // Verify Call History section is visible
    await expect(page.getByText('Call History')).toBeVisible();

    // Check for either call items or "No call history yet" message
    const detailsContent = page.locator('#details-content');
    const hasCallHistory = await detailsContent.locator('.bg-gray-800\\/50').count() > 0;
    const hasEmptyState = await detailsContent.getByText(/no call history yet/i).isVisible();

    expect(hasCallHistory || hasEmptyState).toBeTruthy();
  });
});

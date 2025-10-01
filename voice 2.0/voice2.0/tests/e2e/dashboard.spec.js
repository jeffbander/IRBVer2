import { test, expect } from '@playwright/test';

test.describe('Medical AI Dashboard - UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard before each test
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load dashboard with all main elements', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Medical AI/);

    // Check header is visible
    await expect(page.locator('h1')).toContainText('Medical AI');

    // Check stats cards are visible
    await expect(page.locator('#stat-patients')).toBeVisible();
    await expect(page.locator('#stat-calls')).toBeVisible();
    await expect(page.locator('#stat-active')).toBeVisible();

    // Check main panels are visible
    await expect(page.getByText('Patient Registry')).toBeVisible();
    await expect(page.getByText('Patient Intelligence')).toBeVisible();
  });

  test('should display glassmorphism effects', async ({ page }) => {
    // Check for glass-morphism class on main elements
    const glassElements = page.locator('.glass-morphism');
    await expect(glassElements.first()).toBeVisible();

    // Verify backdrop filter is applied
    const backdropFilter = await glassElements.first().evaluate(
      el => window.getComputedStyle(el).backdropFilter
    );
    expect(backdropFilter).toContain('blur');
  });

  test('should show animations on load', async ({ page }) => {
    // Check for animation classes
    const animatedElements = page.locator('[class*="animate-"]');
    const count = await animatedElements.count();
    expect(count).toBeGreaterThan(0);

    // Verify fade-in animation on header
    await expect(page.locator('.animate-fade-in').first()).toBeVisible();
  });

  test('should have working search functionality', async ({ page }) => {
    const searchInput = page.locator('#search-input');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeEditable();

    // Type in search box
    await searchInput.fill('test patient');
    await expect(searchInput).toHaveValue('test patient');
  });

  test('should open Add Patient modal when button is clicked', async ({ page }) => {
    // Click Add Patient button
    await page.getByRole('button', { name: /add patient/i }).click();

    // Check modal is visible
    const modal = page.locator('#patient-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveClass(/flex/);

    // Check modal title
    await expect(page.locator('#modal-title')).toContainText('Add New Patient');

    // Check form fields are visible
    await expect(page.locator('#form-name')).toBeVisible();
    await expect(page.locator('#form-phone')).toBeVisible();
  });

  test('should close modal when Cancel button is clicked', async ({ page }) => {
    // Open modal
    await page.getByRole('button', { name: /add patient/i }).click();
    await expect(page.locator('#patient-modal')).toBeVisible();

    // Click Cancel button
    await page.getByRole('button', { name: /cancel/i }).click();

    // Check modal is hidden
    await expect(page.locator('#patient-modal')).toHaveClass(/hidden/);
  });

  test('should show gradient backgrounds', async ({ page }) => {
    // Check for gradient classes
    const gradientElements = page.locator('[class*="gradient-"]');
    const count = await gradientElements.count();
    expect(count).toBeGreaterThan(0);

    // Verify gradient is applied
    const background = await gradientElements.first().evaluate(
      el => window.getComputedStyle(el).background
    );
    expect(background).toContain('linear-gradient');
  });

  test('should display metrics with hover effects', async ({ page }) => {
    const metricCard = page.locator('.metric-card').first();
    await expect(metricCard).toBeVisible();

    // Hover over metric card
    await metricCard.hover();

    // Verify hover-lift class is present
    await expect(metricCard).toHaveClass(/hover-lift/);
  });

  test('should show empty state when no patients', async ({ page }) => {
    // Check for empty state message
    const patientsList = page.locator('#patients-list');
    const emptyStateText = patientsList.getByText(/no patients yet/i);

    // If there are no patients, verify empty state is shown
    const hasPatients = await page.locator('.glass-morphism.m-4').count() > 0;
    if (!hasPatients) {
      await expect(emptyStateText).toBeVisible();
    }
  });

  test('should have responsive design elements', async ({ page }) => {
    // Check for responsive grid classes
    const gridElements = page.locator('[class*="grid-cols"]');
    const count = await gridElements.count();
    expect(count).toBeGreaterThan(0);

    // Verify responsive text sizing
    const header = page.locator('h1');
    const fontSize = await header.evaluate(
      el => window.getComputedStyle(el).fontSize
    );
    expect(fontSize).toBeTruthy();
  });
});

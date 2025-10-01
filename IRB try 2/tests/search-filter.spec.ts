import { test, expect } from '@playwright/test';
import { login, generateUniqueId } from './helpers';

test.describe('Search and Filter', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display search box on studies page', async ({ page }) => {
    await page.goto('/studies');

    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
  });

  test('should have search icon in search box', async ({ page }) => {
    await page.goto('/studies');

    const searchIcon = page.locator('svg').filter({ has: page.locator('path[d*="21 21"]') });
    expect(await searchIcon.count()).toBeGreaterThan(0);
  });

  test('should have status filter dropdown', async ({ page }) => {
    await page.goto('/studies');

    const statusSelect = page.locator('select').filter({ hasText: 'All Statuses' });
    await expect(statusSelect).toBeVisible();
  });

  test('should have type filter dropdown', async ({ page }) => {
    await page.goto('/studies');

    const typeSelect = page.locator('select').filter({ hasText: 'All Types' });
    await expect(typeSelect).toBeVisible();
  });

  test('should allow typing in search box', async ({ page }) => {
    await page.goto('/studies');

    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    await searchInput.fill('test study');

    const value = await searchInput.inputValue();
    expect(value).toBe('test study');
  });

  test('should allow selecting status filter', async ({ page }) => {
    await page.goto('/studies');

    const statusSelect = page.locator('select').filter({ hasText: 'All Statuses' });
    await statusSelect.selectOption('DRAFT');

    const selectedValue = await statusSelect.inputValue();
    expect(selectedValue).toBe('DRAFT');
  });

  test('should allow selecting type filter', async ({ page }) => {
    await page.goto('/studies');

    const typeSelect = page.locator('select').filter({ hasText: 'All Types' });
    await typeSelect.selectOption('INTERVENTIONAL');

    const selectedValue = await typeSelect.inputValue();
    expect(selectedValue).toBe('INTERVENTIONAL');
  });

  test('should show all filter options for status', async ({ page }) => {
    await page.goto('/studies');

    const statusSelect = page.locator('select').filter({ hasText: 'All Statuses' });
    const options = await statusSelect.locator('option').allTextContents();

    expect(options).toContain('Draft');
    expect(options).toContain('Pending Review');
    expect(options).toContain('Approved');
    expect(options).toContain('Active');
  });

  test('should show all filter options for type', async ({ page }) => {
    await page.goto('/studies');

    const typeSelect = page.locator('select').filter({ hasText: 'All Types' });
    const options = await typeSelect.locator('option').allTextContents();

    expect(options).toContain('Interventional');
    expect(options).toContain('Observational');
  });

  test('should clear search when input is cleared', async ({ page }) => {
    await page.goto('/studies');

    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    await searchInput.fill('test');
    await searchInput.clear();

    const value = await searchInput.inputValue();
    expect(value).toBe('');
  });

  test('should reset filters to all when selecting default option', async ({ page }) => {
    await page.goto('/studies');

    const statusSelect = page.locator('select').filter({ hasText: 'All Statuses' });
    await statusSelect.selectOption('DRAFT');
    await statusSelect.selectOption('');

    const selectedValue = await statusSelect.inputValue();
    expect(selectedValue).toBe('');
  });
});

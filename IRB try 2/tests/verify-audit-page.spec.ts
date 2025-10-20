import { test, expect } from '@playwright/test';

test('verify audit logs page exists', async ({ page }) => {
  // Navigate to home
  await page.goto('http://localhost:3000');

  // Take screenshot of home page
  await page.screenshot({ path: 'test-results/home-page.png', fullPage: true });

  // Try navigating to /audit
  console.log('Attempting to navigate to /audit');
  const auditResponse = await page.goto('http://localhost:3000/audit');
  console.log(`/audit response status: ${auditResponse?.status()}`);
  await page.screenshot({ path: 'test-results/audit-page.png', fullPage: true });

  // Try navigating to /audit-logs
  console.log('Attempting to navigate to /audit-logs');
  const auditLogsResponse = await page.goto('http://localhost:3000/audit-logs');
  console.log(`/audit-logs response status: ${auditLogsResponse?.status()}`);
  await page.screenshot({ path: 'test-results/audit-logs-page.png', fullPage: true });

  // Get page content to see what's displayed
  const content = await page.textContent('body');
  console.log('Page content:', content?.substring(0, 200));
});

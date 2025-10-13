import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const BASE_URL = config.projects[0].use.baseURL || 'http://localhost:3000';

  console.log('🔄 Warming up Next.js server...');

  // Launch browser and visit homepage to trigger Next.js compilation
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Visit homepage
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('✅ Homepage loaded');

    // Visit login page to compile it
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('✅ Login page compiled');

    // Wait a bit for API routes to be ready
    await page.waitForTimeout(2000);
    console.log('✅ Next.js server is warm and ready');
  } catch (error) {
    console.error('❌ Failed to warm up Next.js:', error);
    throw error;
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

export default globalSetup;

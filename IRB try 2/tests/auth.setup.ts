import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const PRODUCTION_URL = process.env.BASE_URL || 'https://irb-management-system.vercel.app';
const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Check if auth file already exists and is recent (< 1 hour old)
  const authFilePath = path.resolve(authFile);
  if (fs.existsSync(authFilePath)) {
    const stats = fs.statSync(authFilePath);
    const ageInMinutes = (Date.now() - stats.mtimeMs) / 1000 / 60;

    if (ageInMinutes < 60) {
      console.log(`✅ Using existing auth state (${Math.round(ageInMinutes)} minutes old)`);
      return; // Skip authentication
    } else {
      console.log(`⚠️  Auth state is ${Math.round(ageInMinutes)} minutes old, re-authenticating...`);
    }
  }

  // Go to login page
  await page.goto(PRODUCTION_URL);
  await page.waitForLoadState('networkidle');

  // Fill login form
  console.log('🔐 Logging in for setup...');
  await page.fill('input[name="email"]', 'admin@test.com');
  await page.fill('input[name="password"]', 'admin123');

  // Submit and wait for redirect
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });

  console.log('✅ Authentication successful');

  // Save signed-in state (cookies + localStorage)
  await page.context().storageState({ path: authFile });

  console.log(`💾 Auth state saved to ${authFile}`);
});

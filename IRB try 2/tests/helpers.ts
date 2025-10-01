import { Page } from '@playwright/test';

export async function login(page: Page, email: string = 'admin@irb.local', password: string = 'admin123') {
  // Clear any existing localStorage
  await page.context().clearCookies();

  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

export async function logout(page: Page) {
  await page.click('button:has(svg path[d*="M17 16l4-4"])');
  await page.waitForURL('/login');
}

export async function seedDatabase() {
  const response = await fetch('http://localhost:3000/api/auth/seed', {
    method: 'POST',
  });
  return response.json();
}

export async function cleanDatabase() {
  const response = await fetch('http://localhost:3000/api/test/cleanup', {
    method: 'POST',
  });
  if (!response.ok) {
    console.warn('Database cleanup failed:', await response.text());
  }
  return response.ok;
}

export function generateUniqueId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
import { test, expect } from '@playwright/test';

test.describe('API Validation', () => {
  let authToken: string;

  test.beforeAll(async () => {
    // Get auth token
    const response = await fetch('http://localhost:3000/api/auth?action=login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123',
      }),
    });

    const data = await response.json();
    authToken = data.token;
  });

  test('should require authentication for studies endpoint', async () => {
    const response = await fetch('http://localhost:3000/api/studies');
    expect(response.status).toBe(401);
  });

  test('should return studies with valid token', async () => {
    const response = await fetch('http://localhost:3000/api/studies', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('should validate required fields when creating study', async () => {
    const response = await fetch('http://localhost:3000/api/studies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        // Missing required fields
        title: 'Test Study',
      }),
    });

    expect(response.status).toBe(400);
  });

  test('should create study with valid data', async () => {
    const randomNum = Math.floor(Math.random() * 10000);

    const response = await fetch('http://localhost:3000/api/studies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: `API Test Study ${randomNum}`,
        protocolNumber: `API-${randomNum}`,
        description: 'API test description for protocol validation',
        type: 'OBSERVATIONAL',
        riskLevel: 'MINIMAL',
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.id).toBeDefined();
    expect(data.title).toContain('API Test Study');
  });

  test('should prevent duplicate protocol numbers', async () => {
    const randomNum = Math.floor(Math.random() * 10000);
    const protocolNumber = `DUP-${randomNum}`;

    // Create first study
    const response1 = await fetch('http://localhost:3000/api/studies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: 'First Study',
        protocolNumber,
        description: 'Test description for duplicate check',
        type: 'OBSERVATIONAL',
        riskLevel: 'MINIMAL',
      }),
    });

    expect(response1.status).toBe(201);

    // Try to create duplicate
    const response2 = await fetch('http://localhost:3000/api/studies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: 'Second Study',
        protocolNumber, // Same protocol number
        description: 'Test description for duplicate check',
        type: 'OBSERVATIONAL',
        riskLevel: 'MINIMAL',
      }),
    });

    expect(response2.status).toBe(409);
  });

  test('should return 404 for non-existent study', async () => {
    const response = await fetch('http://localhost:3000/api/studies/nonexistent-id', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(404);
  });

  test('should get dashboard stats', async () => {
    const response = await fetch('http://localhost:3000/api/dashboard/stats', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.totalStudies).toBeGreaterThanOrEqual(0);
    expect(data.activeStudies).toBeGreaterThanOrEqual(0);
  });
});

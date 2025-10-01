import { test, expect } from '@playwright/test';

test.describe('API Integration Tests', () => {
  const baseURL = process.env.BASE_URL || 'http://localhost:5052';

  test('should fetch patients from API', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/patients`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('patients');
    expect(Array.isArray(data.patients)).toBeTruthy();
  });

  test('should create patient via API', async ({ request }) => {
    const newPatient = {
      name: 'API Test Patient',
      phoneNumber: '+15551112222',
      dateOfBirth: '1985-05-20',
      gender: 'female',
      conditions: ['Asthma'],
      medications: ['Albuterol'],
      primaryConcern: 'Breathing difficulty',
      callObjectives: ['Check inhaler usage'],
      consentToRecord: true
    };

    const response = await request.post(`${baseURL}/api/patients`, {
      data: newPatient
    });

    expect(response.ok()).toBeTruthy();
    const created = await response.json();
    expect(created).toHaveProperty('id');
    expect(created.name).toBe(newPatient.name);
    expect(created.phoneNumber).toBe(newPatient.phoneNumber);
  });

  test('should retrieve specific patient by ID', async ({ request }) => {
    // First, get all patients
    const listResponse = await request.get(`${baseURL}/api/patients`);
    const { patients } = await listResponse.json();

    if (patients.length > 0) {
      const patientId = patients[0].id;

      // Get specific patient
      const response = await request.get(`${baseURL}/api/patients/${patientId}`);
      expect(response.ok()).toBeTruthy();

      const patient = await response.json();
      expect(patient.id).toBe(patientId);
    }
  });

  test('should update patient via API', async ({ request }) => {
    // First, get all patients
    const listResponse = await request.get(`${baseURL}/api/patients`);
    const { patients } = await listResponse.json();

    if (patients.length > 0) {
      const patientId = patients[0].id;
      const updates = {
        primaryConcern: 'Updated concern via API test'
      };

      const response = await request.put(`${baseURL}/api/patients/${patientId}`, {
        data: updates
      });

      expect(response.ok()).toBeTruthy();
      const updated = await response.json();
      expect(updated.primaryConcern).toBe(updates.primaryConcern);
    }
  });

  test('should check health endpoint', async ({ request }) => {
    const response = await request.get(`${baseURL}/health`);
    expect(response.ok()).toBeTruthy();

    const health = await response.json();
    expect(health).toHaveProperty('status');
    expect(health.status).toBe('healthy');
    expect(health).toHaveProperty('timestamp');
    expect(health).toHaveProperty('uptime');
  });

  test('should get audit logs', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/audit`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('logs');
    expect(Array.isArray(data.logs)).toBeTruthy();
  });

  test('should handle 404 for non-existent patient', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/patients/non-existent-id`);
    expect(response.status()).toBe(404);
  });

  test('should validate required fields when creating patient', async ({ request }) => {
    const invalidPatient = {
      // Missing required 'name' field
      phoneNumber: '+15559998888'
    };

    const response = await request.post(`${baseURL}/api/patients`, {
      data: invalidPatient
    });

    expect(response.ok()).toBeFalsy();
  });

  test('should get root API information', async ({ request }) => {
    const response = await request.get(`${baseURL}/`);
    expect(response.ok()).toBeTruthy();

    const info = await response.json();
    expect(info).toHaveProperty('message');
    expect(info).toHaveProperty('version');
    expect(info).toHaveProperty('features');
    expect(info).toHaveProperty('endpoints');
  });
});

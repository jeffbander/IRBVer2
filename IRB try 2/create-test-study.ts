/**
 * Quick script to create a test study via API
 * Run with: npx ts-node create-test-study.ts
 */

async function createTestStudy() {
  const baseUrl = 'http://localhost:3000';

  // Login first
  const loginResponse = await fetch(`${baseUrl}/api/auth?action=login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@test.com',
      password: 'admin123'
    })
  });

  if (!loginResponse.ok) {
    throw new Error(`Login failed: ${await loginResponse.text()}`);
  }

  const { token } = await loginResponse.json();
  console.log('✅ Logged in successfully');

  // Create a test study
  const studyResponse = await fetch(`${baseUrl}/api/studies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: 'Test Clinical Trial - Cardiac Drug Study',
      protocolNumber: 'TEST-2024-001',
      type: 'INTERVENTIONAL',
      description: 'Test study for Playwright automated testing',
      targetEnrollment: 100,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      riskLevel: 'MODERATE'
    })
  });

  if (!studyResponse.ok) {
    throw new Error(`Study creation failed: ${await studyResponse.text()}`);
  }

  const study = await studyResponse.json();
  console.log(`✅ Created study: ${study.title} (ID: ${study.id})`);

  return study;
}

createTestStudy()
  .then((study) => {
    console.log('\n🎉 Test study created successfully!');
    console.log(`Study ID: ${study.id}`);
    console.log('\nYou can now run Playwright tests.');
  })
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });

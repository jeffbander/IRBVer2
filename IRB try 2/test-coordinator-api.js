// Manual API testing script for coordinator management
// Run with: node test-coordinator-api.js

const BASE_URL = 'http://localhost:3000';

async function testHealthCheck() {
  console.log('\n=== Testing Health Check ===');
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    const data = await response.json();
    console.log('✓ Health check passed:', data);
    return true;
  } catch (error) {
    console.error('✗ Health check failed:', error.message);
    return false;
  }
}

async function testLoginAndGetToken() {
  console.log('\n=== Testing Login ===');
  try {
    // Try to login as a test researcher
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'researcher@test.com',
        password: 'password123'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✓ Login successful');
      console.log('  User:', data.user.email, '- Role:', data.user.role.name);
      return data.token;
    } else {
      console.log('✗ Login failed:', response.status);
      const error = await response.text();
      console.log('  Error:', error);
      return null;
    }
  } catch (error) {
    console.error('✗ Login request failed:', error.message);
    return null;
  }
}

async function testGetStudies(token) {
  console.log('\n=== Testing Get Studies ===');
  try {
    const response = await fetch(`${BASE_URL}/api/studies`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const studies = await response.json();
      console.log(`✓ Retrieved ${studies.length} studies`);
      if (studies.length > 0) {
        console.log('  First study:', studies[0].title);
        return studies[0].id; // Return first study ID for further testing
      }
      return null;
    } else {
      console.log('✗ Get studies failed:', response.status);
      return null;
    }
  } catch (error) {
    console.error('✗ Get studies request failed:', error.message);
    return null;
  }
}

async function testGetCoordinators(studyId, token) {
  console.log('\n=== Testing Get Coordinators ===');
  try {
    const response = await fetch(`${BASE_URL}/api/studies/${studyId}/coordinators`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const coordinators = await response.json();
      console.log(`✓ Retrieved ${coordinators.length} coordinators for study ${studyId}`);
      if (coordinators.length > 0) {
        coordinators.forEach((c, i) => {
          console.log(`  Coordinator ${i + 1}: ${c.coordinator.firstName} ${c.coordinator.lastName} (${c.coordinator.email})`);
        });
      }
      return true;
    } else {
      console.log('✗ Get coordinators failed:', response.status);
      const error = await response.text();
      console.log('  Error:', error);
      return false;
    }
  } catch (error) {
    console.error('✗ Get coordinators request failed:', error.message);
    return false;
  }
}

async function testCoordinatorRoutes() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  Coordinator Management API Test Suite            ║');
  console.log('╚════════════════════════════════════════════════════╝');

  // Test 1: Health check
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('\n❌ Server is not responding. Make sure dev server is running.');
    return;
  }

  // Test 2: Login
  const token = await testLoginAndGetToken();
  if (!token) {
    console.log('\n⚠️  Login failed. Database may not have test data.');
    console.log('You can still test the routes manually in the browser at:');
    console.log('  - http://localhost:3000/login');
    console.log('  - http://localhost:3000/dashboard');
    return;
  }

  // Test 3: Get studies
  const studyId = await testGetStudies(token);
  if (!studyId) {
    console.log('\n⚠️  No studies found. The coordinator management feature needs studies to test.');
    return;
  }

  // Test 4: Get coordinators for a study
  await testGetCoordinators(studyId, token);

  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║  Test Suite Complete                               ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('\n📝 Manual Testing URLs:');
  console.log(`  - Login: ${BASE_URL}/login`);
  console.log(`  - Dashboard: ${BASE_URL}/dashboard`);
  console.log(`  - Studies: ${BASE_URL}/studies`);
  console.log(`  - Coordinator Management: ${BASE_URL}/studies/${studyId}/coordinators`);
  console.log(`  - Coordinator Dashboard: ${BASE_URL}/dashboard/coordinator`);
}

// Run the tests
testCoordinatorRoutes().catch(console.error);

import { Pool } from 'pg';

// Test database connection
export const testDb = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_data_collection',
  ssl: false
});

// Setup before all tests
beforeAll(async () => {
  // Run migrations if needed
  console.log('Setting up test database...');
});

// Cleanup after all tests
afterAll(async () => {
  await testDb.end();
});

// Clean up after each test
afterEach(async () => {
  // Clean up test data
  const tables = [
    'data_audit_trail',
    'query_responses',
    'queries',
    'electronic_signatures',
    'form_responses',
    'visits',
    'visit_definitions',
    'forms',
    'export_requests',
    'protocol_deviations'
  ];

  for (const table of tables) {
    await testDb.query(`TRUNCATE TABLE ${table} CASCADE`);
  }
});

export default testDb;
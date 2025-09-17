import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set up test database configuration
process.env.NODE_ENV = 'test';
process.env.DB_HOST = process.env.TEST_DB_HOST || 'localhost';
process.env.DB_PORT = process.env.TEST_DB_PORT || '5432';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'research_study_test';
process.env.DB_USER = process.env.TEST_DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'password';

// Test timeout
jest.setTimeout(30000);
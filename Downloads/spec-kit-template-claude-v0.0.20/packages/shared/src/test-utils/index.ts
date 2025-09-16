import { Client } from 'pg';
import { createRedisClient } from '../redis';
import { logger } from '../logger';
import Redis from 'ioredis';

// Test database configuration
export const TEST_DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'research_admin',
  password: process.env.DB_PASSWORD || 'research_secure_pwd_2025',
  database: process.env.DB_NAME_TEST || 'research_study_db_test',
};

// Database test utilities
export class TestDatabase {
  private client: Client;

  constructor() {
    this.client = new Client(TEST_DB_CONFIG);
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info('Test database connected');
    } catch (error) {
      logger.error('Failed to connect to test database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.end();
  }

  async clean(): Promise<void> {
    // Clean all tables except migrations
    const tables = await this.getTables();

    if (tables.length > 0) {
      await this.client.query('SET CONSTRAINTS ALL DEFERRED');

      for (const table of tables) {
        if (!table.includes('migration')) {
          await this.client.query(`TRUNCATE TABLE ${table} CASCADE`);
        }
      }

      await this.client.query('SET CONSTRAINTS ALL IMMEDIATE');
    }
  }

  async getTables(): Promise<string[]> {
    const result = await this.client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE 'pgmigrations%'
    `);

    return result.rows.map(row => row.tablename);
  }

  async seed(_data: any): Promise<void> {
    // Implement seeding logic based on provided data
    logger.info('Seeding test database');
  }

  async transaction<T>(fn: (client: Client) => Promise<T>): Promise<T> {
    await this.client.query('BEGIN');
    try {
      const result = await fn(this.client);
      await this.client.query('COMMIT');
      return result;
    } catch (error) {
      await this.client.query('ROLLBACK');
      throw error;
    }
  }
}

// Redis test utilities
export class TestRedis {
  private client: Redis;

  constructor() {
    this.client = createRedisClient({
      db: parseInt(process.env.REDIS_TEST_DB || '1', 10),
      keyPrefix: 'test:',
    });
  }

  async connect(): Promise<void> {
    await this.client.ping();
    logger.info('Test Redis connected');
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }

  async clean(): Promise<void> {
    await this.client.flushdb();
  }

  getClient(): Redis {
    return this.client;
  }
}

// Test setup and teardown helpers
export const setupTestEnvironment = async () => {
  const db = new TestDatabase();
  const redis = new TestRedis();

  await db.connect();
  await redis.connect();

  return { db, redis };
};

export const teardownTestEnvironment = async (
  db: TestDatabase,
  redis: TestRedis
) => {
  await db.clean();
  await redis.clean();
  await db.disconnect();
  await redis.disconnect();
};

// Test data factories
export const TestFactory = {
  user: (overrides = {}) => ({
    email: 'test@mountsinai.org',
    firstName: 'Test',
    lastName: 'User',
    password: 'Password123!',
    role: 'USER',
    active: true,
    ...overrides,
  }),

  study: (overrides = {}) => ({
    protocolNumber: `MSH-TEST-${Date.now()}`,
    title: 'Test Study',
    description: 'Test study description',
    type: 'OBSERVATIONAL',
    status: 'DRAFT',
    principalInvestigatorId: null,
    ...overrides,
  }),

  participant: (overrides = {}) => ({
    participantId: `P-${Date.now()}`,
    status: 'SCREENING',
    consentVersion: '1.0',
    consentDate: new Date(),
    ...overrides,
  }),

  assignment: (overrides = {}) => ({
    role: 'STUDY_COORDINATOR',
    effortType: 'PERCENTAGE',
    effortValue: 50,
    startDate: new Date(),
    canEdit: true,
    canSubmit: false,
    canViewBudget: false,
    ...overrides,
  }),
};

// API test helpers
export const createAuthHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

export const expectError = (response: any, statusCode: number, errorMessage?: string) => {
  expect(response.status).toBe(statusCode);
  if (errorMessage) {
    expect(response.body.error).toContain(errorMessage);
  }
};

// Mock data for Mount Sinai
export const MOUNT_SINAI_TEST_DATA = {
  organization: {
    name: 'Mount Sinai Health System',
    location: 'New York, NY',
    domain: 'mountsinai.org',
  },

  testUsers: [
    {
      email: 'pi@mountsinai.org',
      firstName: 'Sarah',
      lastName: 'Chen',
      role: 'PRINCIPAL_INVESTIGATOR',
      department: 'Cardiology',
    },
    {
      email: 'coordinator@mountsinai.org',
      firstName: 'Emily',
      lastName: 'Johnson',
      role: 'STUDY_COORDINATOR',
      department: 'Research Coordination',
    },
    {
      email: 'irb@mountsinai.org',
      firstName: 'David',
      lastName: 'Kim',
      role: 'IRB_LIAISON',
      department: 'IRB Office',
    },
  ],

  sampleStudies: [
    {
      protocolNumber: 'MSH-2024-COVID-001',
      title: 'COVID-19 Long-term Effects Study',
      type: 'OBSERVATIONAL',
      status: 'APPROVED',
    },
    {
      protocolNumber: 'MSH-2024-ONC-002',
      title: 'Novel Cancer Immunotherapy Trial',
      type: 'DRUG_IND',
      status: 'ENROLLING',
    },
  ],
};

export default {
  TestDatabase,
  TestRedis,
  setupTestEnvironment,
  teardownTestEnvironment,
  TestFactory,
  createAuthHeaders,
  expectError,
  MOUNT_SINAI_TEST_DATA,
};
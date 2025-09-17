import { Pool, PoolConfig } from 'pg';
import { logger } from './logger';

// Database configuration
const dbConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'research_admin',
  password: process.env.DB_PASSWORD || 'research_secure_pwd_2025',
  database: process.env.DB_NAME || 'research_study_db',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

// Create connection pool
export const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', { error: err });
  process.exit(-1);
});

// Test database connection
export const testConnection = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    logger.info('Database connection established', {
      timestamp: result.rows[0].now,
      database: dbConfig.database,
      host: dbConfig.host,
    });
    client.release();
  } catch (error) {
    logger.error('Failed to connect to database', {
      error: error instanceof Error ? error.message : 'Unknown error',
      config: {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
      },
    });
    throw error;
  }
};

// Graceful shutdown
export const closeConnection = async (): Promise<void> => {
  try {
    await pool.end();
    logger.info('Database pool closed');
  } catch (error) {
    logger.error('Error closing database pool', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Query helper with logging
export const query = async (text: string, params?: any[]): Promise<any> => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    logger.debug('Executed query', {
      query: text,
      duration: `${duration}ms`,
      rows: result.rowCount,
    });

    return result;
  } catch (error) {
    logger.error('Query error', {
      query: text,
      error: error instanceof Error ? error.message : 'Unknown error',
      params: params?.length ? 'Has parameters' : 'No parameters',
    });
    throw error;
  }
};

export default pool;
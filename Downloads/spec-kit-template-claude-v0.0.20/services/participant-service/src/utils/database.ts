import { Pool, PoolClient, QueryResult } from 'pg';
import { createLogger } from '@research-study/shared';

const logger = createLogger('participant-service:database');

// Database configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'research_study',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: parseInt(process.env.DB_POOL_SIZE || '20'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'),
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
};

// Create connection pool
export const pool = new Pool(config);

// Pool event handlers
pool.on('connect', (client) => {
  logger.debug('New client connected to database');
});

pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle client', err);
});

pool.on('acquire', (client) => {
  logger.debug('Client acquired from pool');
});

pool.on('release', (client) => {
  logger.debug('Client released back to pool');
});

// Database query interface
export interface DatabaseClient {
  query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
  release?(): void;
}

// Query helper with logging
export const query = async <T = any>(
  text: string,
  params?: any[],
  client?: DatabaseClient
): Promise<QueryResult<T>> => {
  const start = Date.now();
  const queryId = Math.random().toString(36).substring(7);

  logger.debug('Executing query', {
    queryId,
    text: text.replace(/\s+/g, ' ').trim(),
    params: params?.length ? `[${params.length} parameters]` : 'no parameters',
  });

  try {
    const dbClient = client || pool;
    const result = await dbClient.query<T>(text, params);
    const duration = Date.now() - start;

    logger.debug('Query completed', {
      queryId,
      duration: `${duration}ms`,
      rows: result.rowCount,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('Query failed', {
      queryId,
      duration: `${duration}ms`,
      error: error.message,
      text: text.replace(/\s+/g, ' ').trim(),
      params: params?.length ? `[${params.length} parameters]` : 'no parameters',
    });
    throw error;
  }
};

// Transaction helper
export const withTransaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    logger.debug('Transaction started');

    const result = await callback(client);

    await client.query('COMMIT');
    logger.debug('Transaction committed');

    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.warn('Transaction rolled back', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

// Health check
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const result = await query('SELECT 1 as health');
    return result.rows[0]?.health === 1;
  } catch (error) {
    logger.error('Database health check failed', error);
    return false;
  }
};

// Graceful shutdown
export const closeDatabaseConnections = async (): Promise<void> => {
  try {
    await pool.end();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections', error);
  }
};

// Helper for building dynamic WHERE clauses
export const buildWhereClause = (
  conditions: Record<string, any>,
  startingIndex = 1
): { whereClause: string; values: any[]; nextIndex: number } => {
  const whereParts: string[] = [];
  const values: any[] = [];
  let paramIndex = startingIndex;

  Object.entries(conditions).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        // Handle array values (IN clause)
        const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
        whereParts.push(`${key} IN (${placeholders})`);
        values.push(...value);
      } else if (typeof value === 'string' && value.includes('%')) {
        // Handle LIKE clause
        whereParts.push(`${key} LIKE $${paramIndex++}`);
        values.push(value);
      } else {
        // Handle regular equality
        whereParts.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    }
  });

  return {
    whereClause: whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '',
    values,
    nextIndex: paramIndex,
  };
};

// Helper for pagination
export interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export const buildPaginationClause = (
  options: PaginationOptions = {},
  paramIndex = 1
): { clause: string; values: any[]; nextIndex: number } => {
  const { page = 1, limit = 20, orderBy, orderDirection = 'ASC' } = options;
  const offset = (page - 1) * limit;

  let clause = '';
  const values: any[] = [];
  let currentIndex = paramIndex;

  if (orderBy) {
    clause += ` ORDER BY ${orderBy} ${orderDirection}`;
  }

  clause += ` LIMIT $${currentIndex++} OFFSET $${currentIndex++}`;
  values.push(limit, offset);

  return {
    clause,
    values,
    nextIndex: currentIndex,
  };
};

// Helper for audit fields
export const getAuditFields = (userId?: string) => ({
  created_by: userId,
  updated_by: userId,
  created_at: new Date(),
  updated_at: new Date(),
});

// Helper for PHI access logging
export const logPhiAccess = async (
  participantId: string,
  userId: string,
  accessType: string,
  resourceType: string,
  resourceId?: string,
  fieldsAccessed?: string[],
  ipAddress = '0.0.0.0',
  userAgent = 'Unknown'
): Promise<void> => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    user_id: userId,
    access_type: accessType,
    resource_type: resourceType,
    resource_id: resourceId,
    fields_accessed: fieldsAccessed,
    ip_address: ipAddress,
    user_agent: userAgent,
  };

  await query(
    `UPDATE participants
     SET phi_access_log = phi_access_log || $1::jsonb
     WHERE id = $2`,
    [JSON.stringify(logEntry), participantId]
  );

  logger.info('PHI access logged', {
    participantId,
    userId,
    accessType,
    resourceType,
  });
};

// Error types for database operations
export class DatabaseError extends Error {
  constructor(
    message: string,
    public originalError?: Error,
    public code?: string,
    public constraint?: string
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string, public constraint?: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

// Helper to handle database errors
export const handleDatabaseError = (error: any): never => {
  if (error.code === '23505') { // Unique violation
    throw new ConflictError(
      'Resource already exists',
      error.constraint
    );
  } else if (error.code === '23503') { // Foreign key violation
    throw new DatabaseError(
      'Referenced resource does not exist',
      error,
      error.code
    );
  } else if (error.code === '23514') { // Check constraint violation
    throw new DatabaseError(
      'Data validation failed',
      error,
      error.code,
      error.constraint
    );
  } else {
    throw new DatabaseError(
      'Database operation failed',
      error,
      error.code
    );
  }
};
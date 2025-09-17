import { Pool, PoolClient, QueryResult } from 'pg';
import { createLogger } from '@research-study/shared';

const logger = createLogger('database');

class Database {
  private pool: Pool;
  private static instance: Database;

  private constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'research_study_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    try {
      const result = await this.pool.query<T>(text, params);
      return result;
    } catch (error) {
      logger.error('Query error', { text, error });
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health');
      return result.rows[0]?.health === 1;
    } catch (error) {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export const db = Database.getInstance();

export const queryBuilder = {
  insert: (table: string, data: Record<string, any>) => {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`);
    return {
      query: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values,
    };
  },

  update: (table: string, data: Record<string, any>, where: string) => {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setPart = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');
    return {
      query: `UPDATE ${table} SET ${setPart} WHERE ${where} RETURNING *`,
      values,
    };
  },
};

export const transformers = {
  camelToSnake: (obj: Record<string, any>): Record<string, any> => {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      result[snakeKey] = value;
    }
    return result;
  },

  snakeToCamel: (obj: Record<string, any>): Record<string, any> => {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = value;
    }
    return result;
  },

  transformRow: <T>(row: any): T => {
    return transformers.snakeToCamel(row) as T;
  },
};

export const auditLog = async (
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  oldValues?: any,
  newValues?: any,
  ipAddress?: string,
  userAgent?: string,
  sessionId?: string
): Promise<void> => {
  try {
    await db.query(
      `INSERT INTO audit_events (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, session_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId, action, entityType, entityId, oldValues, newValues, ipAddress, userAgent, sessionId]
    );
  } catch (error) {
    logger.error('Failed to create audit log', error);
  }
};
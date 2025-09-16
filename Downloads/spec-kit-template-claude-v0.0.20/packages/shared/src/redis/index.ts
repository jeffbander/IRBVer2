import Redis from 'ioredis';
import { logger } from '../logger';

let redisClient: Redis | null = null;

export interface RedisConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  retryStrategy?: (times: number) => number | null;
}

export function createRedisClient(config?: RedisConfig): Redis {
  const defaultConfig: RedisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: 'rsm:', // Research Study Management prefix
    retryStrategy: (times: number) => {
      if (times > 3) {
        logger.error('Redis connection failed after 3 retries');
        return null;
      }
      return Math.min(times * 100, 2000);
    },
  };

  const finalConfig = { ...defaultConfig, ...config };

  const client = new Redis(finalConfig);

  client.on('connect', () => {
    logger.info('Redis client connected');
  });

  client.on('error', (err) => {
    logger.error('Redis client error:', err);
  });

  client.on('close', () => {
    logger.info('Redis connection closed');
  });

  return client;
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

// Session management utilities
export const SessionStore = {
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const client = getRedisClient();
    const serialized = JSON.stringify(value);

    if (ttlSeconds) {
      await client.set(key, serialized, 'EX', ttlSeconds);
    } else {
      await client.set(key, serialized);
    }
  },

  async get<T = any>(key: string): Promise<T | null> {
    const client = getRedisClient();
    const value = await client.get(key);

    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Failed to parse Redis value for key ${key}:`, error);
      return null;
    }
  },

  async delete(key: string): Promise<boolean> {
    const client = getRedisClient();
    const result = await client.del(key);
    return result > 0;
  },

  async exists(key: string): Promise<boolean> {
    const client = getRedisClient();
    const result = await client.exists(key);
    return result > 0;
  },

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const client = getRedisClient();
    const result = await client.expire(key, ttlSeconds);
    return result > 0;
  },
};

// Cache utilities
export const CacheStore = {
  async get<T = any>(key: string): Promise<T | null> {
    return SessionStore.get<T>(`cache:${key}`);
  },

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    await SessionStore.set(`cache:${key}`, value, ttlSeconds);
  },

  async invalidate(pattern: string): Promise<void> {
    const client = getRedisClient();
    const keys = await client.keys(`cache:${pattern}`);

    if (keys.length > 0) {
      await client.del(...keys);
      logger.info(`Invalidated ${keys.length} cache entries matching pattern: ${pattern}`);
    }
  },
};

// Token blacklist for logout
export const TokenBlacklist = {
  async add(token: string, expiresIn: number): Promise<void> {
    await SessionStore.set(`blacklist:${token}`, true, expiresIn);
  },

  async isBlacklisted(token: string): Promise<boolean> {
    return SessionStore.exists(`blacklist:${token}`);
  },
};

export default {
  createRedisClient,
  getRedisClient,
  closeRedisClient,
  SessionStore,
  CacheStore,
  TokenBlacklist,
};
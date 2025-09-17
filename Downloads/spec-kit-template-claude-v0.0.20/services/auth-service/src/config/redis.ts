import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: parseInt(process.env.REDIS_DB || '0'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
};

// Create Redis client
export const redisClient: RedisClientType = createClient({
  socket: {
    host: redisConfig.host,
    port: redisConfig.port,
  },
  password: redisConfig.password,
  database: redisConfig.db,
});

// Handle Redis events
redisClient.on('connect', () => {
  logger.info('Redis client connected', {
    host: redisConfig.host,
    port: redisConfig.port,
    database: redisConfig.db,
  });
});

redisClient.on('ready', () => {
  logger.info('Redis client ready');
});

redisClient.on('error', (error) => {
  logger.error('Redis client error', {
    error: error.message,
    host: redisConfig.host,
    port: redisConfig.port,
  });
});

redisClient.on('end', () => {
  logger.info('Redis client disconnected');
});

// Connect to Redis
export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    logger.info('Successfully connected to Redis');
  } catch (error) {
    logger.error('Failed to connect to Redis', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

// Test Redis connection
export const testRedisConnection = async (): Promise<void> => {
  try {
    await redisClient.ping();
    logger.info('Redis ping successful');
  } catch (error) {
    logger.error('Redis ping failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

// Graceful shutdown
export const closeRedisConnection = async (): Promise<void> => {
  try {
    await redisClient.quit();
    logger.info('Redis connection closed');
  } catch (error) {
    logger.error('Error closing Redis connection', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Redis helper functions
export const redisHelpers = {
  // Set with expiration
  setex: async (key: string, seconds: number, value: string): Promise<void> => {
    await redisClient.setEx(key, seconds, value);
  },

  // Get value
  get: async (key: string): Promise<string | null> => {
    return await redisClient.get(key);
  },

  // Delete key
  del: async (key: string): Promise<number> => {
    return await redisClient.del(key);
  },

  // Check if key exists
  exists: async (key: string): Promise<number> => {
    return await redisClient.exists(key);
  },

  // Get TTL
  ttl: async (key: string): Promise<number> => {
    return await redisClient.ttl(key);
  },

  // Set if not exists
  setnx: async (key: string, value: string): Promise<boolean> => {
    const result = await redisClient.setNX(key, value);
    return result;
  },

  // Increment
  incr: async (key: string): Promise<number> => {
    return await redisClient.incr(key);
  },

  // Set with expiration if not exists
  setnxex: async (key: string, seconds: number, value: string): Promise<boolean> => {
    const result = await redisClient.set(key, value, {
      EX: seconds,
      NX: true,
    });
    return result === 'OK';
  },
};

export default redisClient;
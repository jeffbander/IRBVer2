import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

const createClient = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: env.databaseUrl,
      },
    },
    log: env.nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });
};

export const prisma = createClient();

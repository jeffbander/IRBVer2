import { buildApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const start = async () => {
  try {
    const app = buildApp();
    app.listen(env.port, () => {
      logger.info(`API listening on port ${env.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

void start();

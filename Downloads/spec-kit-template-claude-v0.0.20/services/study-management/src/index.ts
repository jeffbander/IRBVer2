import dotenv from 'dotenv';
import { createLogger } from '@research-study/shared';
import { createApp } from './app';

// Load environment variables
dotenv.config();

const logger = createLogger('study-management');
const PORT = process.env.PORT || 3001;

// Create Express app
const app = createApp();

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🏥 Mount Sinai Research Study Management Service`);
  logger.info(`📍 Running on port ${PORT}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
  logger.info(`📚 API Base URL: http://localhost:${PORT}/api/v1`);
  logger.info(`\nSample endpoints:`);
  logger.info(`  POST http://localhost:${PORT}/api/v1/auth/login`);
  logger.info(`  GET  http://localhost:${PORT}/api/v1/studies`);
  logger.info(`  POST http://localhost:${PORT}/api/v1/studies`);
  logger.info(`\nTest credentials:`);
  logger.info(`  Email: sarah.chen@mountsinai.org`);
  logger.info(`  Password: Test123!`);
  logger.info(`\n✅ Server is ready and listening for requests...`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
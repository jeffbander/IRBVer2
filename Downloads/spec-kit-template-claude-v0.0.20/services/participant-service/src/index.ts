import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createLogger } from '@research-study/shared';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { authMiddleware } from './middleware/auth';
import { participantRoutes } from './routes/participants';
import { consentRoutes } from './routes/consent';
import { demographicsRoutes } from './routes/demographics';
import { screeningRoutes } from './routes/screening';
import { withdrawalRoutes } from './routes/withdrawal';
import { communicationRoutes } from './routes/communications';

dotenv.config();

const app = express();
const logger = createLogger('participant-service');
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(requestLogger);

// Health check endpoint (no auth required)
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'participant-service',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API version prefix
const API_PREFIX = '/api/v1';

// Authentication middleware for all API routes
app.use(API_PREFIX, authMiddleware);

// Route handlers
app.use(`${API_PREFIX}/participants`, participantRoutes);
app.use(`${API_PREFIX}/participants`, consentRoutes);
app.use(`${API_PREFIX}/participants`, demographicsRoutes);
app.use(`${API_PREFIX}/participants`, screeningRoutes);
app.use(`${API_PREFIX}/participants`, withdrawalRoutes);
app.use(`${API_PREFIX}/participants`, communicationRoutes);

// 404 handler for unmatched routes
app.use('*', (_req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    timestamp: new Date().toISOString(),
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown handling
const server = app.listen(PORT, () => {
  logger.info(`Participant Service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;
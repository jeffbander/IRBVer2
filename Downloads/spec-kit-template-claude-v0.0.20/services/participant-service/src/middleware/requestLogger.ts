import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@research-study/shared';

const logger = createLogger('participant-service:request');

export interface RequestWithId extends Request {
  requestId: string;
  startTime: number;
}

export const requestLogger = (req: RequestWithId, res: Response, next: NextFunction): void => {
  // Generate unique request ID
  req.requestId = uuidv4();
  req.startTime = Date.now();

  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.requestId);

  // Skip logging for health checks in production
  const isHealthCheck = req.path === '/health';
  const shouldLog = process.env.NODE_ENV !== 'production' || !isHealthCheck;

  if (shouldLog) {
    logger.info('Request started', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      query: req.query,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: (req as any).user?.id,
    });
  }

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body: any) {
    const duration = Date.now() - req.startTime;

    if (shouldLog) {
      const logData = {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userId: (req as any).user?.id,
      };

      if (res.statusCode >= 400) {
        logger.warn('Request completed with error', logData);
      } else {
        logger.info('Request completed successfully', logData);
      }
    }

    return originalJson.call(this, body);
  };

  // Override res.send to log response
  const originalSend = res.send;
  res.send = function(body: any) {
    const duration = Date.now() - req.startTime;

    if (shouldLog && !res.headersSent) {
      const logData = {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userId: (req as any).user?.id,
      };

      if (res.statusCode >= 400) {
        logger.warn('Request completed with error', logData);
      } else {
        logger.info('Request completed successfully', logData);
      }
    }

    return originalSend.call(this, body);
  };

  next();
};
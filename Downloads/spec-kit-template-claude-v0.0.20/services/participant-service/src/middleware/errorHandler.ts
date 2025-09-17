import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { createLogger } from '@research-study/shared';

const logger = createLogger('participant-service:error');

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
}

export class ValidationError extends Error {
  public statusCode = 400;
  public isOperational = true;
  public code = 'VALIDATION_ERROR';

  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  public statusCode = 404;
  public isOperational = true;
  public code = 'NOT_FOUND';

  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  public statusCode = 409;
  public isOperational = true;
  public code = 'CONFLICT';

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends Error {
  public statusCode = 401;
  public isOperational = true;
  public code = 'UNAUTHORIZED';

  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  public statusCode = 403;
  public isOperational = true;
  public code = 'FORBIDDEN';

  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class DatabaseError extends Error {
  public statusCode = 500;
  public isOperational = true;
  public code = 'DATABASE_ERROR';

  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class HIPAAComplianceError extends Error {
  public statusCode = 403;
  public isOperational = true;
  public code = 'HIPAA_COMPLIANCE_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'HIPAAComplianceError';
  }
}

const formatZodError = (error: ZodError): string => {
  const issues = error.issues.map(issue => {
    const path = issue.path.join('.');
    return `${path}: ${issue.message}`;
  });
  return `Validation failed: ${issues.join(', ')}`;
};

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Don't process if response already sent
  if (res.headersSent) {
    return next(error);
  }

  // Default error properties
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let code = error.code || 'INTERNAL_ERROR';
  let details: any = undefined;

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    statusCode = 400;
    message = formatZodError(error);
    code = 'VALIDATION_ERROR';
    details = error.issues;
  }

  // Handle database constraint errors
  if (error.message?.includes('duplicate key') || error.message?.includes('UNIQUE constraint')) {
    statusCode = 409;
    message = 'Resource already exists';
    code = 'DUPLICATE_RESOURCE';
  }

  // Handle foreign key constraint errors
  if (error.message?.includes('foreign key constraint') || error.message?.includes('FOREIGN KEY constraint')) {
    statusCode = 400;
    message = 'Referenced resource does not exist';
    code = 'INVALID_REFERENCE';
  }

  // Log error (only log operational errors in production)
  const shouldLog = process.env.NODE_ENV !== 'production' || error.isOperational !== false;

  if (shouldLog) {
    const logData = {
      statusCode,
      code,
      message,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: (req as any).user?.id,
      requestId: (req as any).requestId,
      ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
    };

    if (statusCode >= 500) {
      logger.error('Server error:', logData);
    } else {
      logger.warn('Client error:', logData);
    }
  }

  // Prepare response
  const response: any = {
    error: message,
    code,
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  // Include details in development or for validation errors
  if (details && (process.env.NODE_ENV !== 'production' || statusCode === 400)) {
    response.details = details;
  }

  // Include request ID if available
  if ((req as any).requestId) {
    response.requestId = (req as any).requestId;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
};
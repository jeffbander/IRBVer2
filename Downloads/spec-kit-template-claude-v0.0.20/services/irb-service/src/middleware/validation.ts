import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { logger } from '@research-study/shared';

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate request body
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          value: err.code === 'invalid_type' ? 'invalid' : err.input
        }));

        logger.warn('Request validation failed:', validationErrors);

        res.status(400).json({
          error: 'Validation failed',
          details: validationErrors
        });
        return;
      }

      logger.error('Unexpected validation error:', error);
      res.status(500).json({ error: 'Internal validation error' });
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate query parameters
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          value: err.input
        }));

        res.status(400).json({
          error: 'Query validation failed',
          details: validationErrors
        });
        return;
      }

      res.status(500).json({ error: 'Internal validation error' });
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate URL parameters
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          value: err.input
        }));

        res.status(400).json({
          error: 'Parameter validation failed',
          details: validationErrors
        });
        return;
      }

      res.status(500).json({ error: 'Internal validation error' });
    }
  };
};
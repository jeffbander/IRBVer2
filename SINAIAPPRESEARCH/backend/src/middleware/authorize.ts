import type { NextFunction, Request, Response } from 'express';
import { HttpError } from './errorHandler';
import type { RoleValue } from '../types/auth';

export const authorize = (...allowed: RoleValue[]) => {
  const permitted = new Set(allowed);

  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new HttpError(401, 'Authentication required'));
    }

    if (!permitted.size) {
      return next();
    }

    if (req.user.roles.some((role) => permitted.has(role as RoleValue))) {
      return next();
    }

    return next(new HttpError(403, 'Insufficient permissions'));
  };
};

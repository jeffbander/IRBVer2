import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from './errorHandler';
import { createLogger } from '@research-study/shared';

const logger = createLogger('participant-service:auth');

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  studyAccess?: string[]; // Studies the user has access to
  siteAccess?: string[]; // Sites the user has access to
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token required');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      throw new UnauthorizedError('Authentication token required');
    }

    // Verify JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Authentication token has expired');
      } else if (jwtError.name === 'JsonWebTokenError') {
        throw new UnauthorizedError('Invalid authentication token');
      } else {
        throw new UnauthorizedError('Authentication failed');
      }
    }

    // Extract user information from token
    const user: AuthenticatedUser = {
      id: decoded.userId || decoded.sub,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || [],
      studyAccess: decoded.studyAccess || [],
      siteAccess: decoded.siteAccess || [],
    };

    // Validate required user fields
    if (!user.id || !user.email || !user.role) {
      throw new UnauthorizedError('Invalid token payload');
    }

    // Attach user to request
    (req as AuthenticatedRequest).user = user;

    logger.debug('User authenticated', {
      userId: user.id,
      email: user.email,
      role: user.role,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    next(error);
  }
};

// Permission checking middleware
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!user.permissions.includes(permission) && user.role !== 'ADMIN') {
      logger.warn('Permission denied', {
        userId: user.id,
        role: user.role,
        requiredPermission: permission,
        userPermissions: user.permissions,
        path: req.path,
        method: req.method,
      });
      return next(new ForbiddenError(`Permission '${permission}' required`));
    }

    next();
  };
};

// Role checking middleware
export const requireRole = (roles: string | string[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(user.role) && user.role !== 'ADMIN') {
      logger.warn('Role access denied', {
        userId: user.id,
        userRole: user.role,
        requiredRoles: allowedRoles,
        path: req.path,
        method: req.method,
      });
      return next(new ForbiddenError(`Role '${allowedRoles.join(' or ')}' required`));
    }

    next();
  };
};

// Study access checking middleware
export const requireStudyAccess = (studyIdParam: string = 'studyId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    const studyId = req.params[studyIdParam] || req.body.studyId;

    if (!user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // Admin users have access to all studies
    if (user.role === 'ADMIN') {
      return next();
    }

    // Check if user has access to the specific study
    if (!studyId) {
      return next(new ForbiddenError('Study ID required'));
    }

    if (!user.studyAccess?.includes(studyId)) {
      logger.warn('Study access denied', {
        userId: user.id,
        role: user.role,
        requestedStudyId: studyId,
        userStudyAccess: user.studyAccess,
        path: req.path,
        method: req.method,
      });
      return next(new ForbiddenError('Access to this study not permitted'));
    }

    next();
  };
};

// Site access checking middleware
export const requireSiteAccess = (siteIdParam: string = 'siteId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    const siteId = req.params[siteIdParam] || req.body.siteId;

    if (!user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // Admin users have access to all sites
    if (user.role === 'ADMIN') {
      return next();
    }

    // Check if user has access to the specific site
    if (!siteId) {
      return next(new ForbiddenError('Site ID required'));
    }

    if (!user.siteAccess?.includes(siteId)) {
      logger.warn('Site access denied', {
        userId: user.id,
        role: user.role,
        requestedSiteId: siteId,
        userSiteAccess: user.siteAccess,
        path: req.path,
        method: req.method,
      });
      return next(new ForbiddenError('Access to this site not permitted'));
    }

    next();
  };
};

// HIPAA compliance middleware for PHI access
export const requirePHIAccess = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  // Check if user has permission to access PHI
  const hasPhiPermission = user.permissions.includes('PHI_ACCESS') ||
                          user.permissions.includes('VIEW_DEMOGRAPHICS') ||
                          ['ADMIN', 'PRINCIPAL_INVESTIGATOR', 'STUDY_COORDINATOR'].includes(user.role);

  if (!hasPhiPermission) {
    logger.warn('PHI access denied', {
      userId: user.id,
      role: user.role,
      permissions: user.permissions,
      path: req.path,
      method: req.method,
    });
    return next(new ForbiddenError('Access to protected health information not permitted'));
  }

  // Log PHI access for audit trail
  logger.info('PHI access granted', {
    userId: user.id,
    role: user.role,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  next();
};
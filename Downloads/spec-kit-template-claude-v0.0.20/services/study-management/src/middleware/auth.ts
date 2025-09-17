import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '@research-study/shared';
import { UserModel } from '../models/user';
import { createLogger } from '@research-study/shared';

const logger = createLogger('AuthMiddleware');

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionId?: string;
    }
  }
}

interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  sessionId: string;
  iat: number;
  exp: number;
}

interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  type: 'refresh';
  iat: number;
  exp: number;
}

export class AuthService {
  private static JWT_SECRET = process.env.JWT_SECRET || 'research-study-secret-key';
  private static JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
  private static REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

  /**
   * Generate access token
   */
  static generateAccessToken(user: User, sessionId: string): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(userId: string, sessionId: string): string {
    const payload: RefreshTokenPayload = {
      userId,
      sessionId,
      type: 'refresh',
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
    });
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET) as JWTPayload;
      return payload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET) as RefreshTokenPayload;
      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      return payload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Generate session ID
   */
  static generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Get token expiration info
   */
  static getTokenExpirationInfo(): { accessToken: number; refreshToken: number } {
    const parseExpiration = (exp: string): number => {
      const match = exp.match(/^(\d+)([smhd])$/);
      if (!match) return 3600; // Default 1 hour in seconds

      const value = parseInt(match[1], 10);
      const unit = match[2];

      switch (unit) {
        case 's': return value;
        case 'm': return value * 60;
        case 'h': return value * 3600;
        case 'd': return value * 86400;
        default: return 3600;
      }
    };

    return {
      accessToken: parseExpiration(this.JWT_EXPIRES_IN),
      refreshToken: parseExpiration(this.REFRESH_TOKEN_EXPIRES_IN),
    };
  }
}

/**
 * Authentication middleware
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the token
    const payload = AuthService.verifyAccessToken(token);

    // Get the user from database
    const user = await UserModel.findById(payload.userId);
    if (!user || !user.active) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    // Check if user's role matches token
    if (user.role !== payload.role) {
      res.status(401).json({ error: 'User role has changed, please re-authenticate' });
      return;
    }

    // Attach user and session to request
    req.user = user;
    req.sessionId = payload.sessionId;

    // Log the authenticated request
    logger.debug('User authenticated', {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: payload.sessionId,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed', {
      error: error instanceof Error ? error.message : error,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    res.status(401).json({
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Role-based authorization middleware
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Authorization failed - insufficient permissions', {
        userId: req.user.id,
        userRole: req.user.role,
        allowedRoles,
        path: req.path,
        method: req.method,
      });

      res.status(403).json({
        error: 'Insufficient permissions',
        message: `Required roles: ${allowedRoles.join(', ')}`,
      });
      return;
    }

    next();
  };
};

/**
 * Study access authorization middleware
 */
export const authorizeStudyAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const studyId = req.params.studyId || req.params.id;
    if (!studyId) {
      res.status(400).json({ error: 'Study ID required' });
      return;
    }

    // Admins have access to all studies
    if (req.user.role === UserRole.ADMIN) {
      next();
      return;
    }

    // Check if user has access to this specific study
    const hasAccess = await UserModel.hasStudyAccess(req.user.id, studyId);
    if (!hasAccess) {
      logger.warn('Study access denied', {
        userId: req.user.id,
        studyId,
        userRole: req.user.role,
      });

      res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this study',
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Study authorization error', {
      error: error instanceof Error ? error.message : error,
      userId: req.user?.id,
      studyId: req.params.studyId || req.params.id,
    });

    res.status(500).json({
      error: 'Authorization check failed',
      message: 'Internal server error',
    });
  }
};

/**
 * IRB review authorization middleware
 */
export const authorizeIRBReview = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const canReview = req.user.role === UserRole.IRB_MEMBER || req.user.role === UserRole.ADMIN;
  if (!canReview) {
    res.status(403).json({
      error: 'Insufficient permissions',
      message: 'IRB review permissions required',
    });
    return;
  }

  next();
};

/**
 * Optional authentication middleware (for public endpoints that benefit from user context)
 */
export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    const payload = AuthService.verifyAccessToken(token);
    const user = await UserModel.findById(payload.userId);

    if (user && user.active && user.role === payload.role) {
      req.user = user;
      req.sessionId = payload.sessionId;
    }

    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
};

/**
 * Rate limiting by user
 */
export const rateLimitByUser = (maxRequests: number, windowMs: number) => {
  const userRequests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();

    const userLimit = userRequests.get(userId);
    if (!userLimit || now > userLimit.resetTime) {
      userRequests.set(userId, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (userLimit.count >= maxRequests) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Maximum ${maxRequests} requests per ${windowMs / 1000} seconds`,
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000),
      });
      return;
    }

    userLimit.count++;
    next();
  };
};

/**
 * Audit middleware to log user actions
 */
export const auditMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const originalSend = res.send;

  res.send = function(data) {
    // Log the request after response is sent
    if (req.user && req.method !== 'GET') {
      logger.info('User action', {
        userId: req.user.id,
        email: req.user.email,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        sessionId: req.sessionId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
    }

    return originalSend.call(this, data);
  };

  next();
};
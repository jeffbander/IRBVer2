import { Request, Response } from 'express';
import {
  LoginRequestSchema,
  RefreshTokenRequestSchema,
  AuthToken
} from '@research-study/shared';
import { UserModel } from '../models/user';
import { AuthService } from '../middleware/auth';
import { createLogger } from '@research-study/shared';
import { ZodError } from 'zod';

const logger = createLogger('AuthController');

export class AuthController {

  /**
   * User login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = LoginRequestSchema.parse(req.body);

      // Validate user credentials
      const user = await UserModel.validatePassword(validatedData.email, validatedData.password);
      if (!user) {
        // Add delay to prevent timing attacks
        await new Promise(resolve => setTimeout(resolve, 1000));

        logger.warn('Failed login attempt', {
          email: validatedData.email,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        });

        res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid email or password',
        });
        return;
      }

      // Generate session ID and tokens
      const sessionId = AuthService.generateSessionId();
      const accessToken = AuthService.generateAccessToken(user, sessionId);
      const refreshToken = AuthService.generateRefreshToken(user.id, sessionId);

      // Get token expiration info
      const expirationInfo = AuthService.getTokenExpirationInfo();

      const authResponse: AuthToken = {
        accessToken,
        refreshToken,
        expiresIn: expirationInfo.accessToken,
        user,
      };

      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        role: user.role,
        sessionId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json(authResponse);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Invalid request data',
          details: error.errors,
        });
        return;
      }

      logger.error('Login error', {
        error: error instanceof Error ? error.message : error,
        email: req.body?.email,
        ip: req.ip,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Login failed',
      });
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = RefreshTokenRequestSchema.parse(req.body);

      // Verify refresh token
      const payload = AuthService.verifyRefreshToken(validatedData.refreshToken);

      // Get user from database
      const user = await UserModel.findById(payload.userId);
      if (!user || !user.active) {
        res.status(401).json({
          error: 'Invalid refresh token',
          message: 'User not found or inactive',
        });
        return;
      }

      // Generate new tokens with the same session ID
      const accessToken = AuthService.generateAccessToken(user, payload.sessionId);
      const refreshToken = AuthService.generateRefreshToken(user.id, payload.sessionId);

      // Get token expiration info
      const expirationInfo = AuthService.getTokenExpirationInfo();

      const authResponse: AuthToken = {
        accessToken,
        refreshToken,
        expiresIn: expirationInfo.accessToken,
        user,
      };

      logger.debug('Token refreshed successfully', {
        userId: user.id,
        sessionId: payload.sessionId,
        ip: req.ip,
      });

      res.json(authResponse);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Invalid request data',
          details: error.errors,
        });
        return;
      }

      if (error instanceof Error && error.message.includes('Invalid or expired refresh token')) {
        res.status(401).json({
          error: 'Invalid refresh token',
          message: error.message,
        });
        return;
      }

      logger.error('Token refresh error', {
        error: error instanceof Error ? error.message : error,
        ip: req.ip,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Token refresh failed',
      });
    }
  }

  /**
   * User logout
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      // In a more sophisticated implementation, we would:
      // 1. Add the token to a blacklist/revocation list
      // 2. Store revoked tokens in Redis with TTL
      // 3. Check blacklist in authentication middleware

      logger.info('User logged out', {
        userId: req.user?.id,
        sessionId: req.sessionId,
        ip: req.ip,
      });

      res.status(204).send();
    } catch (error) {
      logger.error('Logout error', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.id,
        sessionId: req.sessionId,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Logout failed',
      });
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated',
        });
        return;
      }

      // Get fresh user data from database
      const user = await UserModel.findById(req.user.id);
      if (!user || !user.active) {
        res.status(401).json({
          error: 'User not found',
          message: 'User account is inactive or deleted',
        });
        return;
      }

      res.json(user);
    } catch (error) {
      logger.error('Get profile error', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.id,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve user profile',
      });
    }
  }

  /**
   * Get user dashboard data
   */
  static async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated',
        });
        return;
      }

      const [stats, assignments] = await Promise.all([
        UserModel.getDashboardStats(req.user.id),
        UserModel.getActiveStudyAssignments(req.user.id),
      ]);

      const dashboard = {
        user: req.user,
        statistics: stats,
        activeAssignments: assignments,
      };

      res.json(dashboard);
    } catch (error) {
      logger.error('Get dashboard error', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.id,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve dashboard data',
      });
    }
  }

  /**
   * Validate token (health check for authentication)
   */
  static async validateToken(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Invalid token',
          message: 'Token is not valid',
        });
        return;
      }

      res.json({
        valid: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role,
        },
        sessionId: req.sessionId,
      });
    } catch (error) {
      logger.error('Token validation error', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.id,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Token validation failed',
      });
    }
  }
}
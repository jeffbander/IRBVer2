import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticate, rateLimitByUser } from '../middleware/auth';

const router = Router();

/**
 * POST /api/v1/auth/login
 * User login with email and password
 * Returns JWT access token and refresh token
 */
router.post(
  '/login',
  rateLimitByUser(5, 300000), // 5 attempts per 5 minutes per IP/user
  AuthController.login
);

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 * Returns new access token and refresh token
 */
router.post(
  '/refresh',
  rateLimitByUser(10, 60000), // 10 refresh attempts per minute
  AuthController.refreshToken
);

/**
 * POST /api/v1/auth/logout
 * User logout (invalidate current session)
 * Requires authentication
 */
router.post(
  '/logout',
  authenticate,
  AuthController.logout
);

/**
 * GET /api/v1/auth/profile
 * Get current user profile
 * Requires authentication
 */
router.get(
  '/profile',
  authenticate,
  rateLimitByUser(60, 60000), // 60 requests per minute
  AuthController.getProfile
);

/**
 * GET /api/v1/auth/dashboard
 * Get user dashboard data (stats, recent activities, etc.)
 * Requires authentication
 */
router.get(
  '/dashboard',
  authenticate,
  rateLimitByUser(30, 60000), // 30 requests per minute
  AuthController.getDashboard
);

/**
 * GET /api/v1/auth/validate
 * Validate current token (health check)
 * Requires authentication
 */
router.get(
  '/validate',
  authenticate,
  rateLimitByUser(120, 60000), // 120 requests per minute
  AuthController.validateToken
);

export default router;
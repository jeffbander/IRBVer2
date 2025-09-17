import jwt from 'jsonwebtoken';
import { JWTPayload, AuthUser } from '@research-platform/shared';
import { logger } from '../config/logger';

export interface JWTTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JWTServiceInterface {
  generateAccessToken(user: AuthUser): string;
  generateRefreshToken(): string;
  generateTokenPair(user: AuthUser): JWTTokens;
  verifyAccessToken(token: string): JWTPayload | null;
  verifyRefreshToken(token: string): any;
  decodeToken(token: string): any;
  getTokenExpirationTime(): number;
  getRefreshTokenExpirationTime(): number;
}

export class JWTService implements JWTServiceInterface {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiration: string;
  private readonly refreshTokenExpiration: string;

  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET || 'fallback-secret';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
    this.accessTokenExpiration = process.env.JWT_EXPIRATION || '24h';
    this.refreshTokenExpiration = process.env.JWT_REFRESH_EXPIRATION || '7d';

    // Validate required environment variables
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
        throw new Error('JWT secrets must be provided in production environment');
      }
    }
  }

  /**
   * Generate access token for authenticated user
   */
  generateAccessToken(user: AuthUser): string {
    try {
      const payload: JWTPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const token = jwt.sign(payload, this.accessTokenSecret, {
        expiresIn: this.accessTokenExpiration,
        issuer: 'auth-service',
        audience: 'research-platform',
        subject: user.id,
      });

      logger.debug('Access token generated', {
        userId: user.id,
        email: user.email,
        role: user.role,
        expiresIn: this.accessTokenExpiration,
      });

      return token;
    } catch (error) {
      logger.error('Error generating access token', {
        error,
        userId: user.id,
      });
      throw new Error('Failed to generate access token');
    }
  }

  /**
   * Generate refresh token (opaque token)
   */
  generateRefreshToken(): string {
    try {
      const payload = {
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        jti: this.generateJTI(), // Unique identifier for this token
      };

      const token = jwt.sign(payload, this.refreshTokenSecret, {
        expiresIn: this.refreshTokenExpiration,
        issuer: 'auth-service',
        audience: 'research-platform',
      });

      logger.debug('Refresh token generated');

      return token;
    } catch (error) {
      logger.error('Error generating refresh token', { error });
      throw new Error('Failed to generate refresh token');
    }
  }

  /**
   * Generate both access and refresh tokens
   */
  generateTokenPair(user: AuthUser): JWTTokens {
    try {
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken();
      const expiresIn = this.getTokenExpirationTime();

      return {
        accessToken,
        refreshToken,
        expiresIn,
      };
    } catch (error) {
      logger.error('Error generating token pair', {
        error,
        userId: user.id,
      });
      throw error;
    }
  }

  /**
   * Verify and decode access token
   */
  verifyAccessToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'auth-service',
        audience: 'research-platform',
      }) as JWTPayload;

      // Validate required fields
      if (!decoded.userId || !decoded.email || !decoded.role) {
        logger.warn('Invalid token payload - missing required fields', {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
        });
        return null;
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.debug('Access token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid access token', {
          error: error.message,
          token: token.substring(0, 20) + '...',
        });
      } else {
        logger.error('Error verifying access token', { error });
      }
      return null;
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): any {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'auth-service',
        audience: 'research-platform',
      });

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.debug('Refresh token expired');
        throw new Error('EXPIRED_REFRESH_TOKEN');
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid refresh token', {
          error: error.message,
          token: token.substring(0, 20) + '...',
        });
        throw new Error('INVALID_REFRESH_TOKEN');
      } else {
        logger.error('Error verifying refresh token', { error });
        throw new Error('TOKEN_VERIFICATION_FAILED');
      }
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): any {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      logger.error('Error decoding token', { error });
      return null;
    }
  }

  /**
   * Get access token expiration time in seconds
   */
  getTokenExpirationTime(): number {
    try {
      return this.parseExpirationToSeconds(this.accessTokenExpiration);
    } catch (error) {
      logger.error('Error parsing token expiration', { error });
      return 86400; // Default to 24 hours
    }
  }

  /**
   * Get refresh token expiration time in seconds
   */
  getRefreshTokenExpirationTime(): number {
    try {
      return this.parseExpirationToSeconds(this.refreshTokenExpiration);
    } catch (error) {
      logger.error('Error parsing refresh token expiration', { error });
      return 604800; // Default to 7 days
    }
  }

  /**
   * Get token expiration date
   */
  getTokenExpirationDate(token: string): Date | null {
    try {
      const decoded = this.decodeToken(token);
      if (decoded && decoded.payload && decoded.payload.exp) {
        return new Date(decoded.payload.exp * 1000);
      }
      return null;
    } catch (error) {
      logger.error('Error getting token expiration date', { error });
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    try {
      const expirationDate = this.getTokenExpirationDate(token);
      if (!expirationDate) {
        return true;
      }
      return expirationDate <= new Date();
    } catch (error) {
      logger.error('Error checking token expiration', { error });
      return true;
    }
  }

  /**
   * Generate unique JWT ID
   */
  private generateJTI(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Parse expiration string to seconds
   */
  private parseExpirationToSeconds(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhdw])$/);
    if (!match) {
      throw new Error(`Invalid expiration format: ${expiration}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers: { [key: string]: number } = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
      w: 604800,
    };

    return value * multipliers[unit];
  }

  /**
   * Create token blacklist key for Redis
   */
  createBlacklistKey(jti: string): string {
    return `blacklist:${jti}`;
  }

  /**
   * Extract JTI from token
   */
  extractJTI(token: string): string | null {
    try {
      const decoded = this.decodeToken(token);
      return decoded?.payload?.jti || null;
    } catch (error) {
      logger.error('Error extracting JTI from token', { error });
      return null;
    }
  }

  /**
   * Create a short-lived verification token
   */
  generateVerificationToken(userId: string, purpose: string): string {
    try {
      const payload = {
        userId,
        purpose,
        type: 'verification',
        iat: Math.floor(Date.now() / 1000),
      };

      return jwt.sign(payload, this.accessTokenSecret, {
        expiresIn: '15m', // Short-lived for security
        issuer: 'auth-service',
        audience: 'research-platform',
        subject: userId,
      });
    } catch (error) {
      logger.error('Error generating verification token', {
        error,
        userId,
        purpose,
      });
      throw new Error('Failed to generate verification token');
    }
  }

  /**
   * Verify verification token
   */
  verifyVerificationToken(token: string, expectedPurpose: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'auth-service',
        audience: 'research-platform',
      }) as any;

      if (decoded.type !== 'verification' || decoded.purpose !== expectedPurpose) {
        return null;
      }

      return { userId: decoded.userId };
    } catch (error) {
      logger.debug('Verification token invalid or expired', { error: error.message });
      return null;
    }
  }
}

export default JWTService;
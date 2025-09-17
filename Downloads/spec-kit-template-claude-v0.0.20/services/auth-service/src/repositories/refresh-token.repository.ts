import { v4 as uuidv4 } from 'uuid';
import { RefreshToken } from '@research-platform/shared';
import { pool, query } from '../config/database';
import { redisHelpers } from '../config/redis';
import { logger } from '../config/logger';

export interface CreateRefreshTokenData {
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  familyId?: string;
}

export interface RefreshTokenRepositoryInterface {
  create(tokenData: CreateRefreshTokenData): Promise<RefreshToken>;
  findByToken(token: string): Promise<RefreshToken | null>;
  findByUserId(userId: string): Promise<RefreshToken[]>;
  findByFamilyId(familyId: string): Promise<RefreshToken[]>;
  revoke(tokenId: string, revokedByUserId?: string, reason?: string): Promise<boolean>;
  revokeAllUserTokens(userId: string, revokedByUserId?: string): Promise<number>;
  revokeTokenFamily(familyId: string, revokedByUserId?: string): Promise<number>;
  isTokenValid(token: RefreshToken): boolean;
  cleanupExpiredTokens(): Promise<number>;
  getActiveTokenCount(userId: string): Promise<number>;
}

export class RefreshTokenRepository implements RefreshTokenRepositoryInterface {
  private readonly REDIS_PREFIX = 'refresh_token:';
  private readonly REDIS_USER_PREFIX = 'user_tokens:';
  private readonly REDIS_TTL_BUFFER = 300; // 5 minutes buffer for Redis TTL

  /**
   * Create a new refresh token
   */
  async create(tokenData: CreateRefreshTokenData): Promise<RefreshToken> {
    try {
      const tokenId = uuidv4();
      const familyId = tokenData.familyId || uuidv4();

      // Insert into database
      const insertQuery = `
        INSERT INTO refresh_tokens (
          id, user_id, token, expires_at, created_at,
          ip_address, user_agent, is_revoked, family_id
        ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, false, $7)
        RETURNING *
      `;

      const values = [
        tokenId,
        tokenData.userId,
        tokenData.token,
        tokenData.expiresAt,
        tokenData.ipAddress,
        tokenData.userAgent,
        familyId,
      ];

      const result = await query(insertQuery, values);
      const refreshToken = this.mapRowToRefreshToken(result.rows[0]);

      // Cache in Redis for fast lookup
      await this.cacheTokenInRedis(refreshToken);

      logger.info('Refresh token created', {
        tokenId,
        userId: tokenData.userId,
        familyId,
        expiresAt: tokenData.expiresAt,
      });

      return refreshToken;
    } catch (error) {
      logger.error('Error creating refresh token', {
        error,
        userId: tokenData.userId,
      });
      throw error;
    }
  }

  /**
   * Find refresh token by token string
   */
  async findByToken(token: string): Promise<RefreshToken | null> {
    try {
      // First try Redis cache
      const cachedToken = await this.getTokenFromRedis(token);
      if (cachedToken) {
        return cachedToken;
      }

      // Fallback to database
      const result = await query(
        'SELECT * FROM refresh_tokens WHERE token = $1',
        [token]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const refreshToken = this.mapRowToRefreshToken(result.rows[0]);

      // Cache for future requests if not expired
      if (this.isTokenValid(refreshToken)) {
        await this.cacheTokenInRedis(refreshToken);
      }

      return refreshToken;
    } catch (error) {
      logger.error('Error finding refresh token', { error });
      throw error;
    }
  }

  /**
   * Find all refresh tokens for a user
   */
  async findByUserId(userId: string): Promise<RefreshToken[]> {
    try {
      const result = await query(
        'SELECT * FROM refresh_tokens WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );

      return result.rows.map((row: any) => this.mapRowToRefreshToken(row));
    } catch (error) {
      logger.error('Error finding refresh tokens by user ID', {
        error,
        userId,
      });
      throw error;
    }
  }

  /**
   * Find all refresh tokens in a family
   */
  async findByFamilyId(familyId: string): Promise<RefreshToken[]> {
    try {
      const result = await query(
        'SELECT * FROM refresh_tokens WHERE family_id = $1 ORDER BY created_at DESC',
        [familyId]
      );

      return result.rows.map((row: any) => this.mapRowToRefreshToken(row));
    } catch (error) {
      logger.error('Error finding refresh tokens by family ID', {
        error,
        familyId,
      });
      throw error;
    }
  }

  /**
   * Revoke a refresh token
   */
  async revoke(
    tokenId: string,
    revokedByUserId?: string,
    reason?: string
  ): Promise<boolean> {
    try {
      const updateQuery = `
        UPDATE refresh_tokens
        SET is_revoked = true, revoked_at = NOW(),
            revoked_by_user_id = $2, revocation_reason = $3
        WHERE id = $1 AND is_revoked = false
        RETURNING *
      `;

      const result = await query(updateQuery, [tokenId, revokedByUserId, reason]);

      if (result.rows.length > 0) {
        const revokedToken = this.mapRowToRefreshToken(result.rows[0]);

        // Remove from Redis cache
        await this.removeTokenFromRedis(revokedToken.token);

        logger.info('Refresh token revoked', {
          tokenId,
          revokedByUserId,
          reason,
        });

        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error revoking refresh token', {
        error,
        tokenId,
      });
      throw error;
    }
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(
    userId: string,
    revokedByUserId?: string
  ): Promise<number> {
    try {
      const updateQuery = `
        UPDATE refresh_tokens
        SET is_revoked = true, revoked_at = NOW(),
            revoked_by_user_id = $2, revocation_reason = 'User logout all'
        WHERE user_id = $1 AND is_revoked = false
        RETURNING token
      `;

      const result = await query(updateQuery, [userId, revokedByUserId]);

      // Remove from Redis cache
      for (const row of result.rows) {
        await this.removeTokenFromRedis(row.token);
      }

      logger.info('All user refresh tokens revoked', {
        userId,
        count: result.rowCount,
        revokedByUserId,
      });

      return result.rowCount || 0;
    } catch (error) {
      logger.error('Error revoking all user tokens', {
        error,
        userId,
      });
      throw error;
    }
  }

  /**
   * Revoke all tokens in a family (for token rotation security)
   */
  async revokeTokenFamily(
    familyId: string,
    revokedByUserId?: string
  ): Promise<number> {
    try {
      const updateQuery = `
        UPDATE refresh_tokens
        SET is_revoked = true, revoked_at = NOW(),
            revoked_by_user_id = $2, revocation_reason = 'Token family compromise'
        WHERE family_id = $1 AND is_revoked = false
        RETURNING token
      `;

      const result = await query(updateQuery, [familyId, revokedByUserId]);

      // Remove from Redis cache
      for (const row of result.rows) {
        await this.removeTokenFromRedis(row.token);
      }

      logger.warn('Token family revoked', {
        familyId,
        count: result.rowCount,
        revokedByUserId,
      });

      return result.rowCount || 0;
    } catch (error) {
      logger.error('Error revoking token family', {
        error,
        familyId,
      });
      throw error;
    }
  }

  /**
   * Check if token is valid (not expired and not revoked)
   */
  isTokenValid(token: RefreshToken): boolean {
    const now = new Date();
    return !token.isRevoked && token.expiresAt > now;
  }

  /**
   * Cleanup expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      // Delete tokens expired more than 7 days ago
      const deleteQuery = `
        DELETE FROM refresh_tokens
        WHERE expires_at < NOW() - INTERVAL '7 days'
      `;

      const result = await query(deleteQuery);

      if (result.rowCount && result.rowCount > 0) {
        logger.info('Expired refresh tokens cleaned up', {
          count: result.rowCount,
        });
      }

      return result.rowCount || 0;
    } catch (error) {
      logger.error('Error cleaning up expired tokens', { error });
      throw error;
    }
  }

  /**
   * Get count of active tokens for a user
   */
  async getActiveTokenCount(userId: string): Promise<number> {
    try {
      const result = await query(
        `SELECT COUNT(*) as count
         FROM refresh_tokens
         WHERE user_id = $1 AND is_revoked = false AND expires_at > NOW()`,
        [userId]
      );

      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting active token count', {
        error,
        userId,
      });
      throw error;
    }
  }

  /**
   * Cache token in Redis
   */
  private async cacheTokenInRedis(token: RefreshToken): Promise<void> {
    try {
      const ttlSeconds = Math.floor(
        (token.expiresAt.getTime() - Date.now()) / 1000
      );

      if (ttlSeconds > this.REDIS_TTL_BUFFER) {
        const cacheKey = `${this.REDIS_PREFIX}${token.token}`;
        const tokenData = JSON.stringify({
          id: token.id,
          userId: token.userId,
          expiresAt: token.expiresAt.toISOString(),
          isRevoked: token.isRevoked,
          familyId: token.familyId,
        });

        await redisHelpers.setex(cacheKey, ttlSeconds, tokenData);
      }
    } catch (error) {
      // Don't throw error for caching failures
      logger.warn('Failed to cache token in Redis', {
        error,
        tokenId: token.id,
      });
    }
  }

  /**
   * Get token from Redis cache
   */
  private async getTokenFromRedis(token: string): Promise<RefreshToken | null> {
    try {
      const cacheKey = `${this.REDIS_PREFIX}${token}`;
      const cachedData = await redisHelpers.get(cacheKey);

      if (!cachedData) {
        return null;
      }

      const tokenData = JSON.parse(cachedData);

      // Additional validation
      const expiresAt = new Date(tokenData.expiresAt);
      if (tokenData.isRevoked || expiresAt <= new Date()) {
        // Remove invalid token from cache
        await this.removeTokenFromRedis(token);
        return null;
      }

      // Reconstruct full token object (may need to fetch from DB for complete data)
      return {
        id: tokenData.id,
        userId: tokenData.userId,
        token,
        expiresAt,
        createdAt: new Date(), // Will be filled from DB if needed
        ipAddress: '', // Will be filled from DB if needed
        userAgent: '', // Will be filled from DB if needed
        isRevoked: tokenData.isRevoked,
        revokedAt: undefined,
        familyId: tokenData.familyId,
      };
    } catch (error) {
      // Don't throw error for cache failures
      logger.warn('Failed to get token from Redis', {
        error,
        token: token.substring(0, 10) + '...',
      });
      return null;
    }
  }

  /**
   * Remove token from Redis cache
   */
  private async removeTokenFromRedis(token: string): Promise<void> {
    try {
      const cacheKey = `${this.REDIS_PREFIX}${token}`;
      await redisHelpers.del(cacheKey);
    } catch (error) {
      // Don't throw error for cache failures
      logger.warn('Failed to remove token from Redis', {
        error,
        token: token.substring(0, 10) + '...',
      });
    }
  }

  /**
   * Map database row to RefreshToken object
   */
  private mapRowToRefreshToken(row: any): RefreshToken {
    return {
      id: row.id,
      userId: row.user_id,
      token: row.token,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      isRevoked: row.is_revoked,
      revokedAt: row.revoked_at,
      familyId: row.family_id,
    };
  }
}

export default RefreshTokenRepository;
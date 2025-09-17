import bcrypt from 'bcrypt';
import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { AuthUser, UserRole, RegisterRequest, LoginAttempt } from '@research-platform/shared';
import { pool, query } from '../config/database';
import { logger } from '../config/logger';

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  isEmailVerified?: boolean;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  active?: boolean;
  isEmailVerified?: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  failedLoginAttempts?: number;
  lockoutUntil?: Date;
  lastLoginAt?: Date;
}

export interface UserRepositoryInterface {
  create(userData: CreateUserData): Promise<AuthUser>;
  findById(id: string): Promise<AuthUser | null>;
  findByEmail(email: string): Promise<AuthUser | null>;
  update(id: string, userData: UpdateUserData): Promise<AuthUser | null>;
  delete(id: string): Promise<boolean>;
  verifyPassword(user: AuthUser, password: string): Promise<boolean>;
  updatePassword(id: string, newPassword: string): Promise<boolean>;
  incrementFailedLoginAttempts(id: string): Promise<void>;
  resetFailedLoginAttempts(id: string): Promise<void>;
  lockAccount(id: string, lockDuration: number): Promise<void>;
  unlockAccount(id: string): Promise<void>;
  isAccountLocked(user: AuthUser): boolean;
  findAll(limit?: number, offset?: number): Promise<AuthUser[]>;
  findByRole(role: UserRole): Promise<AuthUser[]>;
  countUsers(): Promise<number>;
  recordLoginAttempt(attempt: LoginAttempt): Promise<void>;
}

export class UserRepository implements UserRepositoryInterface {
  private bcryptRounds: number;

  constructor() {
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
  }

  /**
   * Hash password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.bcryptRounds);
    } catch (error) {
      logger.error('Error hashing password', { error });
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Create a new user
   */
  async create(userData: CreateUserData): Promise<AuthUser> {
    const client: PoolClient = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if user already exists
      const existingUser = await this.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const passwordHash = await this.hashPassword(userData.password);

      // Generate user ID
      const userId = uuidv4();

      // Insert user
      const insertQuery = `
        INSERT INTO users (
          id, email, password_hash, first_name, last_name, role,
          active, is_email_verified, failed_login_attempts,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *
      `;

      const values = [
        userId,
        userData.email.toLowerCase(),
        passwordHash,
        userData.firstName,
        userData.lastName,
        userData.role || UserRole.PARTICIPANT,
        true,
        userData.isEmailVerified || false,
        0,
      ];

      const result = await client.query(insertQuery, values);
      await client.query('COMMIT');

      logger.info('User created successfully', {
        userId,
        email: userData.email,
        role: userData.role,
      });

      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating user', { error, email: userData.email });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<AuthUser | null> {
    try {
      const result = await query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
    } catch (error) {
      logger.error('Error finding user by ID', { error, id });
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<AuthUser | null> {
    try {
      const result = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
    } catch (error) {
      logger.error('Error finding user by email', { error, email });
      throw error;
    }
  }

  /**
   * Update user
   */
  async update(id: string, userData: UpdateUserData): Promise<AuthUser | null> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build dynamic update query
      Object.entries(userData).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${this.camelToSnake(key)} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      // Add updated_at
      updateFields.push(`updated_at = NOW()`);

      const updateQuery = `
        UPDATE users
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      values.push(id);

      const result = await query(updateQuery, values);

      if (result.rows.length === 0) {
        return null;
      }

      logger.info('User updated successfully', { userId: id });
      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Error updating user', { error, id });
      throw error;
    }
  }

  /**
   * Delete user (soft delete by setting active = false)
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await query(
        'UPDATE users SET active = false, updated_at = NOW() WHERE id = $1',
        [id]
      );

      const deleted = result.rowCount > 0;
      if (deleted) {
        logger.info('User soft deleted', { userId: id });
      }

      return deleted;
    } catch (error) {
      logger.error('Error deleting user', { error, id });
      throw error;
    }
  }

  /**
   * Verify password
   */
  async verifyPassword(user: AuthUser, password: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, user.passwordHash);
    } catch (error) {
      logger.error('Error verifying password', { error, userId: user.id });
      throw error;
    }
  }

  /**
   * Update password
   */
  async updatePassword(id: string, newPassword: string): Promise<boolean> {
    try {
      const passwordHash = await this.hashPassword(newPassword);

      const result = await query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [passwordHash, id]
      );

      const updated = result.rowCount > 0;
      if (updated) {
        logger.info('User password updated', { userId: id });
      }

      return updated;
    } catch (error) {
      logger.error('Error updating password', { error, id });
      throw error;
    }
  }

  /**
   * Increment failed login attempts
   */
  async incrementFailedLoginAttempts(id: string): Promise<void> {
    try {
      await query(
        'UPDATE users SET failed_login_attempts = failed_login_attempts + 1, updated_at = NOW() WHERE id = $1',
        [id]
      );

      logger.warn('Failed login attempt incremented', { userId: id });
    } catch (error) {
      logger.error('Error incrementing failed login attempts', { error, id });
      throw error;
    }
  }

  /**
   * Reset failed login attempts
   */
  async resetFailedLoginAttempts(id: string): Promise<void> {
    try {
      await query(
        'UPDATE users SET failed_login_attempts = 0, lockout_until = NULL, updated_at = NOW() WHERE id = $1',
        [id]
      );
    } catch (error) {
      logger.error('Error resetting failed login attempts', { error, id });
      throw error;
    }
  }

  /**
   * Lock account
   */
  async lockAccount(id: string, lockDurationMinutes: number): Promise<void> {
    try {
      const lockUntil = new Date(Date.now() + lockDurationMinutes * 60000);

      await query(
        'UPDATE users SET lockout_until = $1, updated_at = NOW() WHERE id = $2',
        [lockUntil, id]
      );

      logger.warn('Account locked', { userId: id, lockUntil });
    } catch (error) {
      logger.error('Error locking account', { error, id });
      throw error;
    }
  }

  /**
   * Unlock account
   */
  async unlockAccount(id: string): Promise<void> {
    try {
      await query(
        'UPDATE users SET lockout_until = NULL, failed_login_attempts = 0, updated_at = NOW() WHERE id = $1',
        [id]
      );

      logger.info('Account unlocked', { userId: id });
    } catch (error) {
      logger.error('Error unlocking account', { error, id });
      throw error;
    }
  }

  /**
   * Check if account is locked
   */
  isAccountLocked(user: AuthUser): boolean {
    if (!user.lockoutUntil) {
      return false;
    }

    const now = new Date();
    return user.lockoutUntil > now;
  }

  /**
   * Find all users with pagination
   */
  async findAll(limit: number = 50, offset: number = 0): Promise<AuthUser[]> {
    try {
      const result = await query(
        'SELECT * FROM users WHERE active = true ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );

      return result.rows.map((row: any) => this.mapRowToUser(row));
    } catch (error) {
      logger.error('Error finding all users', { error });
      throw error;
    }
  }

  /**
   * Find users by role
   */
  async findByRole(role: UserRole): Promise<AuthUser[]> {
    try {
      const result = await query(
        'SELECT * FROM users WHERE role = $1 AND active = true ORDER BY created_at DESC',
        [role]
      );

      return result.rows.map((row: any) => this.mapRowToUser(row));
    } catch (error) {
      logger.error('Error finding users by role', { error, role });
      throw error;
    }
  }

  /**
   * Count total users
   */
  async countUsers(): Promise<number> {
    try {
      const result = await query('SELECT COUNT(*) as count FROM users WHERE active = true');
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error counting users', { error });
      throw error;
    }
  }

  /**
   * Record login attempt
   */
  async recordLoginAttempt(attempt: LoginAttempt): Promise<void> {
    try {
      // Find user ID if user exists
      let userId: string | null = null;
      const user = await this.findByEmail(attempt.email);
      if (user) {
        userId = user.id;
      }

      await query(
        `INSERT INTO login_attempts (
          id, email, user_id, success, ip_address, user_agent,
          timestamp, failure_reason
        ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7)`,
        [
          attempt.email,
          userId,
          attempt.success,
          attempt.ipAddress,
          attempt.userAgent,
          attempt.timestamp,
          attempt.failureReason,
        ]
      );
    } catch (error) {
      logger.error('Error recording login attempt', { error, email: attempt.email });
      // Don't throw error here as it's a logging function
    }
  }

  /**
   * Map database row to AuthUser object
   */
  private mapRowToUser(row: any): AuthUser {
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role as UserRole,
      active: row.active,
      passwordHash: row.password_hash,
      lastLoginAt: row.last_login_at,
      isEmailVerified: row.is_email_verified,
      emailVerificationToken: row.email_verification_token,
      passwordResetToken: row.password_reset_token,
      passwordResetExpires: row.password_reset_expires,
      failedLoginAttempts: row.failed_login_attempts,
      lockoutUntil: row.lockout_until,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Convert camelCase to snake_case
   */
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}

export default UserRepository;
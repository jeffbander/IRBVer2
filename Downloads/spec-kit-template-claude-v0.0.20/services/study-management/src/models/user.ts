import bcrypt from 'bcrypt';
import { User, UserRole } from '@research-study/shared';
import { db, transformers } from '../utils/database';
import { createLogger } from '@research-study/shared';

const logger = createLogger('UserModel');

export class UserModel {

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1 AND active = true';
    const result = await db.query(query, [id]);

    return result.rows.length > 0 ? transformers.transformRow<User>(result.rows[0]) : null;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
    const query = 'SELECT * FROM users WHERE email = $1 AND active = true';
    const result = await db.query(query, [email]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const user = transformers.transformRow<User>(row);
    return {
      ...user,
      passwordHash: row.password_hash,
    };
  }

  /**
   * Validate user password
   */
  static async validatePassword(email: string, password: string): Promise<User | null> {
    const userWithPassword = await this.findByEmail(email);
    if (!userWithPassword) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(password, userWithPassword.passwordHash);
    if (!isValidPassword) {
      return null;
    }

    // Update last login timestamp
    await db.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userWithPassword.id]
    );

    // Return user without password hash
    const { passwordHash, ...user } = userWithPassword;
    return user;
  }

  /**
   * Find users by role
   */
  static async findByRole(role: UserRole): Promise<User[]> {
    const query = `
      SELECT * FROM users
      WHERE role = $1 AND active = true
      ORDER BY last_name, first_name
    `;
    const result = await db.query(query, [role]);

    return result.rows.map(row => transformers.transformRow<User>(row));
  }

  /**
   * Search users
   */
  static async search(searchTerm: string, limit: number = 10): Promise<User[]> {
    const query = `
      SELECT * FROM users
      WHERE active = true
        AND (
          first_name ILIKE $1
          OR last_name ILIKE $1
          OR email ILIKE $1
          OR CONCAT(first_name, ' ', last_name) ILIKE $1
        )
      ORDER BY last_name, first_name
      LIMIT $2
    `;

    const result = await db.query(query, [`%${searchTerm}%`, limit]);
    return result.rows.map(row => transformers.transformRow<User>(row));
  }

  /**
   * Get principal investigators
   */
  static async getPrincipalInvestigators(): Promise<User[]> {
    return this.findByRole(UserRole.PRINCIPAL_INVESTIGATOR);
  }

  /**
   * Get study coordinators
   */
  static async getStudyCoordinators(): Promise<User[]> {
    return this.findByRole(UserRole.STUDY_COORDINATOR);
  }

  /**
   * Get IRB members
   */
  static async getIRBMembers(): Promise<User[]> {
    return this.findByRole(UserRole.IRB_MEMBER);
  }

  /**
   * Check if user has permission to access study
   */
  static async hasStudyAccess(userId: string, studyId: string): Promise<boolean> {
    const query = `
      SELECT 1
      FROM studies s
      LEFT JOIN study_assignments sa ON s.id = sa.study_id
      WHERE s.id = $1
        AND (
          s.principal_investigator_id = $2
          OR (sa.user_id = $2 AND sa.is_active = true)
        )
      LIMIT 1
    `;

    const result = await db.query(query, [studyId, userId]);
    return result.rows.length > 0;
  }

  /**
   * Check if user has admin privileges
   */
  static async isAdmin(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    return user?.role === UserRole.ADMIN;
  }

  /**
   * Check if user has PI privileges
   */
  static async isPrincipalInvestigator(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    return user?.role === UserRole.PRINCIPAL_INVESTIGATOR;
  }

  /**
   * Check if user has IRB review privileges
   */
  static async canReviewIRB(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    return user?.role === UserRole.IRB_MEMBER || user?.role === UserRole.ADMIN;
  }

  /**
   * Get user's active study assignments
   */
  static async getActiveStudyAssignments(userId: string): Promise<any[]> {
    const query = `
      SELECT
        sa.*,
        s.title as study_title,
        s.protocol_number as study_protocol,
        s.status as study_status
      FROM study_assignments sa
      JOIN studies s ON sa.study_id = s.id
      WHERE sa.user_id = $1 AND sa.is_active = true
      ORDER BY sa.created_at DESC
    `;

    const result = await db.query(query, [userId]);
    return result.rows.map(row => transformers.transformRow(row));
  }

  /**
   * Get user dashboard statistics
   */
  static async getDashboardStats(userId: string): Promise<{
    activeStudies: number;
    totalParticipants: number;
    pendingIRBReviews: number;
    recentAssignments: number;
  }> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    let activeStudiesQuery: string;
    let totalParticipantsQuery: string;
    let queryParams: any[];

    if (user.role === UserRole.ADMIN || user.role === UserRole.IRB_MEMBER) {
      // Admin and IRB members see all studies
      activeStudiesQuery = `
        SELECT COUNT(*) as count
        FROM studies
        WHERE status IN ('ENROLLING', 'ACTIVE')
      `;
      totalParticipantsQuery = `
        SELECT COUNT(*) as count
        FROM participants
        WHERE status IN ('ENROLLED', 'ACTIVE')
      `;
      queryParams = [];
    } else {
      // Other users see only their assigned studies
      activeStudiesQuery = `
        SELECT COUNT(DISTINCT s.id) as count
        FROM studies s
        LEFT JOIN study_assignments sa ON s.id = sa.study_id
        WHERE s.status IN ('ENROLLING', 'ACTIVE')
          AND (s.principal_investigator_id = $1 OR (sa.user_id = $1 AND sa.is_active = true))
      `;
      totalParticipantsQuery = `
        SELECT COUNT(p.*) as count
        FROM participants p
        JOIN studies s ON p.study_id = s.id
        LEFT JOIN study_assignments sa ON s.id = sa.study_id
        WHERE p.status IN ('ENROLLED', 'ACTIVE')
          AND (s.principal_investigator_id = $1 OR (sa.user_id = $1 AND sa.is_active = true))
      `;
      queryParams = [userId];
    }

    const [activeStudiesResult, totalParticipantsResult] = await Promise.all([
      db.query(activeStudiesQuery, queryParams),
      db.query(totalParticipantsQuery, queryParams),
    ]);

    // Pending IRB reviews (only for IRB members and admins)
    let pendingIRBReviews = 0;
    if (user.role === UserRole.IRB_MEMBER || user.role === UserRole.ADMIN) {
      const irbResult = await db.query(`
        SELECT COUNT(*) as count
        FROM irb_submissions
        WHERE status IN ('SUBMITTED', 'UNDER_REVIEW')
      `);
      pendingIRBReviews = parseInt(irbResult.rows[0].count, 10);
    }

    // Recent assignments (last 30 days)
    const recentAssignmentsResult = await db.query(`
      SELECT COUNT(*) as count
      FROM study_assignments
      WHERE user_id = $1
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND is_active = true
    `, [userId]);

    return {
      activeStudies: parseInt(activeStudiesResult.rows[0].count, 10),
      totalParticipants: parseInt(totalParticipantsResult.rows[0].count, 10),
      pendingIRBReviews,
      recentAssignments: parseInt(recentAssignmentsResult.rows[0].count, 10),
    };
  }
}
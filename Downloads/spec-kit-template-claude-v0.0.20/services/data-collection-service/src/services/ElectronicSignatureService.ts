import { Pool } from 'pg';
import {
  ElectronicSignature,
  SignatureMeaning,
  AuthenticationMethod,
  BiometricData,
  BiometricType
} from '@research-study/shared';
import * as crypto from 'crypto';

export class ElectronicSignatureService {
  constructor(private db: Pool) {}

  async createSignature(
    formResponseId: string,
    userId: string,
    userName: string,
    userRole: string,
    meaning: SignatureMeaning,
    authMethod: AuthenticationMethod,
    ipAddress: string,
    password?: string,
    biometricData?: any
  ): Promise<ElectronicSignature> {
    // Validate authentication
    await this.validateAuthentication(userId, authMethod, password, biometricData);

    // Create signature record
    const signatureData: any = {
      userId,
      userName,
      userRole,
      meaning,
      authMethod,
      ipAddress,
      timestamp: new Date()
    };

    // Process biometric data if provided
    if (biometricData && authMethod === AuthenticationMethod.BIOMETRIC) {
      signatureData.biometricData = await this.processBiometricData(biometricData, userId);
    }

    // Store signature in database
    const signature = await this.storeSignature(formResponseId, signatureData);

    // Create audit trail entry
    await this.createSignatureAuditEntry(formResponseId, userId, meaning, ipAddress);

    return signature;
  }

  async validateSignature(
    signatureId: string,
    userId: string,
    authMethod: AuthenticationMethod,
    credentials: any
  ): Promise<boolean> {
    const signature = await this.getSignatureById(signatureId);
    if (!signature) {
      throw new Error('Signature not found');
    }

    if (signature.userId !== userId) {
      throw new Error('Signature does not belong to user');
    }

    // Validate based on authentication method
    switch (authMethod) {
      case AuthenticationMethod.PASSWORD:
        return this.validatePasswordAuth(userId, credentials.password);

      case AuthenticationMethod.BIOMETRIC:
        return this.validateBiometricAuth(signature.biometricData, credentials.biometricData);

      case AuthenticationMethod.TOKEN:
        return this.validateTokenAuth(credentials.token);

      case AuthenticationMethod.MULTI_FACTOR:
        return this.validateMultiFactorAuth(userId, credentials);

      default:
        throw new Error('Unsupported authentication method');
    }
  }

  async getSignaturesByFormResponse(formResponseId: string): Promise<ElectronicSignature[]> {
    const query = `
      SELECT * FROM electronic_signatures
      WHERE form_response_id = $1
      ORDER BY timestamp ASC
    `;

    const result = await this.db.query(query, [formResponseId]);
    return result.rows.map(row => this.mapRowToSignature(row));
  }

  async verifySignatureIntegrity(signatureId: string): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const signature = await this.getSignatureById(signatureId);
    if (!signature) {
      return {
        isValid: false,
        issues: ['Signature not found']
      };
    }

    const issues: string[] = [];

    // Check timestamp integrity
    if (!signature.timestamp || signature.timestamp > new Date()) {
      issues.push('Invalid timestamp');
    }

    // Check user integrity
    const userExists = await this.verifyUserExists(signature.userId);
    if (!userExists) {
      issues.push('Signature user no longer exists');
    }

    // Check form response integrity
    const formResponseExists = await this.verifyFormResponseExists(signature);
    if (!formResponseExists) {
      issues.push('Associated form response no longer exists');
    }

    // Check biometric data integrity if present
    if (signature.biometricData) {
      const biometricValid = await this.verifyBiometricIntegrity(signature.biometricData);
      if (!biometricValid) {
        issues.push('Biometric data integrity compromised');
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  async generateSignatureReport(formResponseId: string): Promise<{
    signatures: ElectronicSignature[];
    summary: {
      totalSignatures: number;
      signaturesByMeaning: Record<SignatureMeaning, number>;
      signaturesByMethod: Record<AuthenticationMethod, number>;
      isCompliant: boolean;
      complianceIssues: string[];
    };
  }> {
    const signatures = await this.getSignaturesByFormResponse(formResponseId);

    const signaturesByMeaning: Record<string, number> = {};
    const signaturesByMethod: Record<string, number> = {};

    for (const signature of signatures) {
      signaturesByMeaning[signature.meaning] = (signaturesByMeaning[signature.meaning] || 0) + 1;
      signaturesByMethod[signature.authMethod] = (signaturesByMethod[signature.authMethod] || 0) + 1;
    }

    // Check 21 CFR Part 11 compliance
    const complianceIssues = await this.checkCFRCompliance(signatures);

    return {
      signatures,
      summary: {
        totalSignatures: signatures.length,
        signaturesByMeaning: signaturesByMeaning as Record<SignatureMeaning, number>,
        signaturesByMethod: signaturesByMethod as Record<AuthenticationMethod, number>,
        isCompliant: complianceIssues.length === 0,
        complianceIssues
      }
    };
  }

  // Private methods

  private async validateAuthentication(
    userId: string,
    authMethod: AuthenticationMethod,
    password?: string,
    biometricData?: any
  ): Promise<void> {
    switch (authMethod) {
      case AuthenticationMethod.PASSWORD:
        if (!password) {
          throw new Error('Password required for password authentication');
        }
        const passwordValid = await this.validatePasswordAuth(userId, password);
        if (!passwordValid) {
          throw new Error('Invalid password');
        }
        break;

      case AuthenticationMethod.BIOMETRIC:
        if (!biometricData) {
          throw new Error('Biometric data required for biometric authentication');
        }
        const biometricValid = await this.validateUserBiometric(userId, biometricData);
        if (!biometricValid) {
          throw new Error('Biometric authentication failed');
        }
        break;

      case AuthenticationMethod.TOKEN:
        // Token validation would be handled by middleware
        break;

      case AuthenticationMethod.MULTI_FACTOR:
        // Multi-factor validation
        if (!password) {
          throw new Error('Password required for multi-factor authentication');
        }
        const mfaValid = await this.validateMultiFactorAuth(userId, { password, ...biometricData });
        if (!mfaValid) {
          throw new Error('Multi-factor authentication failed');
        }
        break;

      default:
        throw new Error('Unsupported authentication method');
    }
  }

  private async processBiometricData(
    biometricData: any,
    userId: string
  ): Promise<BiometricData> {
    // Process and hash biometric data for security
    const algorithm = 'sha256';
    const hash = crypto
      .createHash(algorithm)
      .update(JSON.stringify(biometricData))
      .digest('hex');

    return {
      type: biometricData.type as BiometricType,
      hash,
      algorithm,
      timestamp: new Date()
    };
  }

  private async storeSignature(
    formResponseId: string,
    signatureData: any
  ): Promise<ElectronicSignature> {
    const query = `
      INSERT INTO electronic_signatures (
        id, form_response_id, user_id, user_name, user_role, meaning,
        timestamp, ip_address, auth_method, biometric_data
      )
      VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      formResponseId,
      signatureData.userId,
      signatureData.userName,
      signatureData.userRole,
      signatureData.meaning,
      signatureData.timestamp,
      signatureData.ipAddress,
      signatureData.authMethod,
      signatureData.biometricData ? JSON.stringify(signatureData.biometricData) : null
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToSignature(result.rows[0]);
  }

  private async createSignatureAuditEntry(
    formResponseId: string,
    userId: string,
    meaning: SignatureMeaning,
    ipAddress: string
  ): Promise<void> {
    const query = `
      INSERT INTO data_audit_trail (
        form_response_id, field_id, user_id, action, reason, ip_address, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    `;

    await this.db.query(query, [
      formResponseId,
      '',
      userId,
      'ELECTRONIC_SIGNATURE',
      `Electronic signature: ${meaning}`,
      ipAddress
    ]);
  }

  private async getSignatureById(signatureId: string): Promise<ElectronicSignature | null> {
    const query = 'SELECT * FROM electronic_signatures WHERE id = $1';
    const result = await this.db.query(query, [signatureId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSignature(result.rows[0]);
  }

  private async validatePasswordAuth(userId: string, password: string): Promise<boolean> {
    // In production, verify against user's stored password hash
    const query = 'SELECT password_hash FROM users WHERE id = $1';
    const result = await this.db.query(query, [userId]);

    if (result.rows.length === 0) {
      return false;
    }

    // Use bcrypt or similar for password verification
    const bcrypt = require('bcrypt');
    return bcrypt.compare(password, result.rows[0].password_hash);
  }

  private async validateBiometricAuth(
    storedBiometric?: BiometricData,
    providedBiometric?: any
  ): Promise<boolean> {
    if (!storedBiometric || !providedBiometric) {
      return false;
    }

    // Compare biometric hashes
    const providedHash = crypto
      .createHash(storedBiometric.algorithm)
      .update(JSON.stringify(providedBiometric))
      .digest('hex');

    return storedBiometric.hash === providedHash;
  }

  private async validateTokenAuth(token: string): Promise<boolean> {
    // Validate JWT or other token
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return !!decoded;
    } catch {
      return false;
    }
  }

  private async validateMultiFactorAuth(userId: string, credentials: any): Promise<boolean> {
    // Combine multiple authentication methods
    const passwordValid = await this.validatePasswordAuth(userId, credentials.password);

    if (credentials.biometricData) {
      const biometricValid = await this.validateUserBiometric(userId, credentials.biometricData);
      return passwordValid && biometricValid;
    }

    if (credentials.token) {
      const tokenValid = await this.validateTokenAuth(credentials.token);
      return passwordValid && tokenValid;
    }

    return passwordValid;
  }

  private async validateUserBiometric(userId: string, biometricData: any): Promise<boolean> {
    // Retrieve user's stored biometric data and compare
    const query = `
      SELECT biometric_data FROM electronic_signatures
      WHERE user_id = $1 AND biometric_data IS NOT NULL
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    const result = await this.db.query(query, [userId]);

    if (result.rows.length === 0) {
      return false;
    }

    const storedBiometric = result.rows[0].biometric_data;
    return this.validateBiometricAuth(storedBiometric, biometricData);
  }

  private async verifyUserExists(userId: string): Promise<boolean> {
    const query = 'SELECT id FROM users WHERE id = $1';
    const result = await this.db.query(query, [userId]);
    return result.rows.length > 0;
  }

  private async verifyFormResponseExists(signature: ElectronicSignature): Promise<boolean> {
    // Get form response ID from signature
    const query = `
      SELECT es.form_response_id FROM electronic_signatures es
      WHERE es.id = $1
    `;
    const result = await this.db.query(query, [signature.id]);

    if (result.rows.length === 0) {
      return false;
    }

    const formResponseId = result.rows[0].form_response_id;

    // Check if form response still exists
    const responseQuery = 'SELECT id FROM form_responses WHERE id = $1';
    const responseResult = await this.db.query(responseQuery, [formResponseId]);
    return responseResult.rows.length > 0;
  }

  private async verifyBiometricIntegrity(biometricData: BiometricData): Promise<boolean> {
    // Verify biometric data hasn't been tampered with
    // This is a simplified check - in production, use more sophisticated integrity checks
    return !!(biometricData.hash && biometricData.algorithm && biometricData.timestamp);
  }

  private async checkCFRCompliance(signatures: ElectronicSignature[]): Promise<string[]> {
    const issues: string[] = [];

    // Check for required signatures
    const authoredSignature = signatures.find(s => s.meaning === SignatureMeaning.AUTHORED);
    if (!authoredSignature) {
      issues.push('Missing authored signature');
    }

    // Check signature timing
    for (const signature of signatures) {
      if (!signature.timestamp) {
        issues.push('Signature missing timestamp');
      }
    }

    // Check authentication methods
    for (const signature of signatures) {
      if (signature.authMethod === AuthenticationMethod.PASSWORD) {
        // For password authentication, ensure secure authentication was used
        // This would involve checking password strength, etc.
      }
    }

    return issues;
  }

  private mapRowToSignature(row: any): ElectronicSignature {
    return {
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userRole: row.user_role,
      meaning: row.meaning as SignatureMeaning,
      timestamp: new Date(row.timestamp),
      ipAddress: row.ip_address,
      authMethod: row.auth_method as AuthenticationMethod,
      biometricData: row.biometric_data ? JSON.parse(row.biometric_data) : undefined
    };
  }
}
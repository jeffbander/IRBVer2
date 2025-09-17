import { Request } from 'express';

export interface Study {
  id: string;
  protocolNumber: string;
  title: string;
  description: string;
  status: StudyStatus;
  phase: StudyPhase;
  startDate: Date;
  endDate?: Date;
  targetEnrollment: number;
  currentEnrollment: number;
  createdAt: Date;
  updatedAt: Date;
}

export enum StudyStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  ENROLLING = 'ENROLLING',
  ACTIVE = 'ACTIVE',
  CLOSED_TO_ENROLLMENT = 'CLOSED_TO_ENROLLMENT',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
  COMPLETED = 'COMPLETED',
}

export enum StudyPhase {
  PHASE_1 = 'PHASE_1',
  PHASE_2 = 'PHASE_2',
  PHASE_3 = 'PHASE_3',
  PHASE_4 = 'PHASE_4',
  OBSERVATIONAL = 'OBSERVATIONAL',
}

// Import all participant types from participant module
export * from './participant';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  PRINCIPAL_INVESTIGATOR = 'PRINCIPAL_INVESTIGATOR',
  STUDY_COORDINATOR = 'STUDY_COORDINATOR',
  DATA_ANALYST = 'DATA_ANALYST',
  SITE_COORDINATOR = 'SITE_COORDINATOR',
  MONITOR = 'MONITOR',
  PARTICIPANT = 'PARTICIPANT',
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
}

// Authentication Types
export interface AuthUser extends Omit<User, 'createdAt' | 'updatedAt'> {
  passwordHash: string;
  lastLoginAt?: Date;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  failedLoginAttempts: number;
  lockoutUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  ipAddress: string;
  userAgent: string;
  isRevoked: boolean;
  revokedAt?: Date;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

export interface LoginAttempt {
  email: string;
  success: boolean;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  failureReason?: string;
}

// Permission and Role Types
export enum Permission {
  // Study Management
  CREATE_STUDY = 'CREATE_STUDY',
  READ_STUDY = 'READ_STUDY',
  UPDATE_STUDY = 'UPDATE_STUDY',
  DELETE_STUDY = 'DELETE_STUDY',
  SUBMIT_IRB = 'SUBMIT_IRB',

  // Participant Management
  CREATE_PARTICIPANT = 'CREATE_PARTICIPANT',
  READ_PARTICIPANT = 'READ_PARTICIPANT',
  UPDATE_PARTICIPANT = 'UPDATE_PARTICIPANT',
  DELETE_PARTICIPANT = 'DELETE_PARTICIPANT',
  VIEW_PHI = 'VIEW_PHI',

  // User Management
  CREATE_USER = 'CREATE_USER',
  READ_USER = 'READ_USER',
  UPDATE_USER = 'UPDATE_USER',
  DELETE_USER = 'DELETE_USER',

  // Data Management
  EXPORT_DATA = 'EXPORT_DATA',
  IMPORT_DATA = 'IMPORT_DATA',
  VIEW_REPORTS = 'VIEW_REPORTS',

  // System Administration
  ADMIN_PANEL = 'ADMIN_PANEL',
  VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS',
  MANAGE_PERMISSIONS = 'MANAGE_PERMISSIONS',
}

export interface RolePermissions {
  [UserRole.ADMIN]: Permission[];
  [UserRole.PRINCIPAL_INVESTIGATOR]: Permission[];
  [UserRole.STUDY_COORDINATOR]: Permission[];
  [UserRole.DATA_ANALYST]: Permission[];
  [UserRole.SITE_COORDINATOR]: Permission[];
  [UserRole.MONITOR]: Permission[];
  [UserRole.PARTICIPANT]: Permission[];
}
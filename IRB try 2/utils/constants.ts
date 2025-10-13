// Application constants and configuration

// Study statuses
export const STUDY_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  CLOSED: 'CLOSED',
  COMPLETED: 'COMPLETED',
} as const;

export type StudyStatus = typeof STUDY_STATUS[keyof typeof STUDY_STATUS];

// Study types
export const STUDY_TYPE = {
  INTERVENTIONAL: 'INTERVENTIONAL',
  OBSERVATIONAL: 'OBSERVATIONAL',
  REGISTRY: 'REGISTRY',
  SURVEY: 'SURVEY',
  OTHER: 'OTHER',
} as const;

export type StudyType = typeof STUDY_TYPE[keyof typeof STUDY_TYPE];

// Risk levels
export const RISK_LEVEL = {
  MINIMAL: 'MINIMAL',
  MODERATE: 'MODERATE',
  HIGH: 'HIGH',
} as const;

export type RiskLevel = typeof RISK_LEVEL[keyof typeof RISK_LEVEL];

// Document types
export const DOCUMENT_TYPE = {
  PROTOCOL: 'PROTOCOL',
  CONSENT_FORM: 'CONSENT_FORM',
  IRB_APPROVAL: 'IRB_APPROVAL',
  AMENDMENT: 'AMENDMENT',
  SAE_REPORT: 'SAE_REPORT',
  PROGRESS_REPORT: 'PROGRESS_REPORT',
  OTHER: 'OTHER',
} as const;

export type DocumentType = typeof DOCUMENT_TYPE[keyof typeof DOCUMENT_TYPE];

// Participant statuses
export const PARTICIPANT_STATUS = {
  ENROLLED: 'ENROLLED',
  COMPLETED: 'COMPLETED',
  WITHDRAWN: 'WITHDRAWN',
  SCREEN_FAILED: 'SCREEN_FAILED',
} as const;

export type ParticipantStatus = typeof PARTICIPANT_STATUS[keyof typeof PARTICIPANT_STATUS];

// Role names
export const ROLE_NAME = {
  ADMIN: 'admin',
  RESEARCHER: 'researcher',
  REVIEWER: 'reviewer',
  COORDINATOR: 'coordinator',
} as const;

export type RoleName = typeof ROLE_NAME[keyof typeof ROLE_NAME];

// Permissions
export const PERMISSION = {
  // Study permissions
  CREATE_STUDIES: 'create_studies',
  VIEW_STUDIES: 'view_studies',
  EDIT_STUDIES: 'edit_studies',
  DELETE_STUDIES: 'delete_studies',
  SUBMIT_STUDIES: 'submit_studies',

  // Review permissions
  REVIEW_STUDIES: 'review_studies',
  APPROVE_STUDIES: 'approve_studies',

  // Participant permissions
  MANAGE_PARTICIPANTS: 'manage_participants',
  VIEW_PARTICIPANTS: 'view_participants',

  // Document permissions
  UPLOAD_DOCUMENTS: 'upload_documents',
  VIEW_DOCUMENTS: 'view_documents',
  DELETE_DOCUMENTS: 'delete_documents',

  // User permissions
  MANAGE_USERS: 'manage_users',
  VIEW_USERS: 'view_users',

  // Audit permissions
  VIEW_AUDIT_LOGS: 'view_audit_logs',
} as const;

export type Permission = typeof PERMISSION[keyof typeof PERMISSION];

// Status badge configurations
export const STATUS_CONFIG = {
  [STUDY_STATUS.DRAFT]: {
    color: 'bg-gray-100 text-gray-800',
    label: 'Draft',
  },
  [STUDY_STATUS.PENDING_REVIEW]: {
    color: 'bg-yellow-100 text-yellow-800',
    label: 'Pending Review',
  },
  [STUDY_STATUS.APPROVED]: {
    color: 'bg-green-100 text-green-800',
    label: 'Approved',
  },
  [STUDY_STATUS.ACTIVE]: {
    color: 'bg-blue-100 text-blue-800',
    label: 'Active',
  },
  [STUDY_STATUS.SUSPENDED]: {
    color: 'bg-red-100 text-red-800',
    label: 'Suspended',
  },
  [STUDY_STATUS.CLOSED]: {
    color: 'bg-gray-100 text-gray-600',
    label: 'Closed',
  },
  [STUDY_STATUS.COMPLETED]: {
    color: 'bg-purple-100 text-purple-800',
    label: 'Completed',
  },
} as const;

// Risk badge configurations
export const RISK_CONFIG = {
  [RISK_LEVEL.MINIMAL]: 'bg-green-50 text-green-700',
  [RISK_LEVEL.MODERATE]: 'bg-yellow-50 text-yellow-700',
  [RISK_LEVEL.HIGH]: 'bg-red-50 text-red-700',
} as const;

// Role badge configurations
export const ROLE_CONFIG = {
  [ROLE_NAME.ADMIN]: 'bg-purple-100 text-purple-800',
  [ROLE_NAME.REVIEWER]: 'bg-blue-100 text-blue-800',
  [ROLE_NAME.RESEARCHER]: 'bg-green-100 text-green-800',
  [ROLE_NAME.COORDINATOR]: 'bg-yellow-100 text-yellow-800',
} as const;

// Review action labels
export const REVIEW_ACTION_LABELS = {
  SUBMIT_FOR_REVIEW: 'Submitted for Review',
  APPROVE_STUDY: 'Approved',
  REJECT_STUDY: 'Rejected',
  REQUEST_CHANGES: 'Changes Requested',
  ACTIVATE_STUDY: 'Activated',
  SUSPEND_STUDY: 'Suspended',
  CLOSE_STUDY: 'Closed',
} as const;

// File upload constraints
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.txt',
    '.jpg',
    '.jpeg',
    '.png',
  ],
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png',
  ],
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
} as const;

// API endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/api/auth?action=login',
  AUTH_REGISTER: '/api/auth?action=register',
  AUTH_SEED: '/api/auth/seed',

  // Studies
  STUDIES: '/api/studies',
  STUDY_DETAIL: (id: string) => `/api/studies/${id}`,
  STUDY_REVIEW: (id: string) => `/api/studies/${id}/review`,
  STUDY_PARTICIPANTS: (id: string) => `/api/studies/${id}/participants`,
  STUDY_DOCUMENTS: (id: string) => `/api/studies/${id}/documents`,
  STUDY_EXPORT: '/api/studies/export',

  // Users
  USERS: '/api/users',
  USER_DETAIL: (id: string) => `/api/users/${id}`,

  // Dashboard
  DASHBOARD_STATS: '/api/dashboard/stats',

  // Documents
  DOCUMENTS: '/api/documents',

  // Participants
  PARTICIPANTS: '/api/participants',
} as const;

// Date formats
export const DATE_FORMAT = {
  DISPLAY: 'MM/DD/YYYY',
  API: 'YYYY-MM-DD',
  TIMESTAMP: 'YYYY-MM-DD HH:mm:ss',
} as const;

// Theme colors
export const COLORS = {
  PRIMARY: '#003F6C',
  SECONDARY: '#2E8B57',
  SUCCESS: '#10B981',
  WARNING: '#F59E0B',
  ERROR: '#EF4444',
  INFO: '#3B82F6',
} as const;

export const API_VERSION = 'v1';

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const ERROR_MESSAGES = {
  STUDY_NOT_FOUND: 'Study not found',
  PARTICIPANT_NOT_FOUND: 'Participant not found',
  USER_NOT_FOUND: 'User not found',
  INVALID_CREDENTIALS: 'Invalid credentials',
  UNAUTHORIZED_ACCESS: 'Unauthorized access',
  VALIDATION_ERROR: 'Validation error',
  INTERNAL_ERROR: 'Internal server error',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  VIEW: 'VIEW',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  CONSENT_GIVEN: 'CONSENT_GIVEN',
  CONSENT_WITHDRAWN: 'CONSENT_WITHDRAWN',
  DATA_EXPORT: 'DATA_EXPORT',
} as const;
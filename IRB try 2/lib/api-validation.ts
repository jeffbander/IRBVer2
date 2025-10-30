/**
 * API Input Validation Middleware
 * Provides server-side validation utilities for API request data
 * Complements client-side validation with security-focused checks
 */

export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Email validation using RFC 5322 compliant regex
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Password strength validation
 * At least 8 characters, with at least one uppercase, lowercase, and number
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check for common passwords (basic list)
  const commonPasswords = ['password', '12345678', 'qwerty', 'admin123', 'letmein'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * String length validation
 */
export function validateLength(
  value: string,
  min: number,
  max: number,
  fieldName: string
): void {
  if (!value || typeof value !== 'string') {
    throw new ValidationError(fieldName, `${fieldName} is required`);
  }

  const trimmed = value.trim();

  if (trimmed.length < min) {
    throw new ValidationError(
      fieldName,
      `${fieldName} must be at least ${min} characters`
    );
  }

  if (trimmed.length > max) {
    throw new ValidationError(
      fieldName,
      `${fieldName} must not exceed ${max} characters`
    );
  }
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHtml(value: string): string {
  if (!value || typeof value !== 'string') return '';

  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize and validate study input
 */
export function validateStudyInput(input: any): {
  valid: boolean;
  errors: string[];
  sanitized?: any;
} {
  const errors: string[] = [];

  if (!input.title || typeof input.title !== 'string') {
    errors.push('Title is required');
  } else if (input.title.trim().length < 5) {
    errors.push('Title must be at least 5 characters');
  } else if (input.title.length > 500) {
    errors.push('Title must not exceed 500 characters');
  }

  if (!input.protocolNumber || typeof input.protocolNumber !== 'string') {
    errors.push('Protocol number is required');
  }

  if (input.description && input.description.length > 10000) {
    errors.push('Description must not exceed 10000 characters');
  }

  const allowedTypes = ['INTERVENTIONAL', 'OBSERVATIONAL', 'SURVEY', 'REGISTRY'];
  if (input.type && !allowedTypes.includes(input.type)) {
    errors.push(`Type must be one of: ${allowedTypes.join(', ')}`);
  }

  const allowedRiskLevels = ['MINIMAL', 'MODERATE', 'HIGH'];
  if (input.riskLevel && !allowedRiskLevels.includes(input.riskLevel)) {
    errors.push(`Risk level must be one of: ${allowedRiskLevels.join(', ')}`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    sanitized: {
      ...input,
      title: sanitizeHtml(input.title.trim()),
      description: input.description ? sanitizeHtml(input.description.trim()) : undefined,
    },
  };
}

/**
 * Validate participant input
 */
export function validateParticipantInput(input: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.firstName || typeof input.firstName !== 'string') {
    errors.push('First name is required');
  }

  if (!input.lastName || typeof input.lastName !== 'string') {
    errors.push('Last name is required');
  }

  if (input.email && !validateEmail(input.email)) {
    errors.push('Invalid email address');
  }

  const allowedStatuses = ['SCREENING', 'ENROLLED', 'ACTIVE', 'COMPLETED', 'WITHDRAWN', 'DISCONTINUED'];
  if (input.status && !allowedStatuses.includes(input.status)) {
    errors.push(`Status must be one of: ${allowedStatuses.join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate user registration input
 */
export function validateUserInput(input: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.email || !validateEmail(input.email)) {
    errors.push('Valid email is required');
  }

  if (!input.password) {
    errors.push('Password is required');
  } else {
    const passwordValidation = validatePassword(input.password);
    if (!passwordValidation.valid) {
      errors.push(...passwordValidation.errors);
    }
  }

  if (!input.firstName || typeof input.firstName !== 'string' || input.firstName.trim().length < 2) {
    errors.push('First name must be at least 2 characters');
  }

  if (!input.lastName || typeof input.lastName !== 'string' || input.lastName.trim().length < 2) {
    errors.push('Last name must be at least 2 characters');
  }

  return { valid: errors.length === 0, errors };
}

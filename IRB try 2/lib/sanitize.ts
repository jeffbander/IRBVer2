// Input sanitization utilities to prevent XSS and injection attacks

/**
 * Sanitize string input by removing potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  if (!input) return '';

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers like onclick=
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';

  return email.toLowerCase().trim();
}

/**
 * Sanitize phone number (remove non-digits except + and -)
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return '';

  return phone.replace(/[^\d+\-\s()]/g, '').trim();
}

/**
 * Sanitize URL input
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';

  const trimmed = url.trim();

  // Only allow http and https protocols
  if (!trimmed.match(/^https?:\/\//i)) {
    return '';
  }

  try {
    const parsed = new URL(trimmed);
    // Ensure protocol is http or https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Sanitize HTML content (basic - for production use a library like DOMPurify)
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T, options: {
  sanitizeStrings?: boolean;
  trimStrings?: boolean;
  removeEmpty?: boolean;
} = {}): T {
  const {
    sanitizeStrings = true,
    trimStrings = true,
    removeEmpty = false
  } = options;

  const result: any = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip if removing empty values
    if (removeEmpty && (value === '' || value === null || value === undefined)) {
      continue;
    }

    if (typeof value === 'string') {
      let sanitized = value;
      if (trimStrings) {
        sanitized = sanitized.trim();
      }
      if (sanitizeStrings) {
        sanitized = sanitizeString(sanitized);
      }
      result[key] = sanitized;
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value, options);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Validate and sanitize protocol number format
 */
export function sanitizeProtocolNumber(protocol: string): string {
  if (!protocol) return '';

  return protocol
    .toUpperCase()
    .replace(/[^A-Z0-9\-]/g, '')
    .trim();
}

/**
 * Validate and sanitize subject ID format
 */
export function sanitizeSubjectId(subjectId: string): string {
  if (!subjectId) return '';

  return subjectId
    .toUpperCase()
    .replace(/[^A-Z0-9\-]/g, '')
    .trim();
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';

  return query
    .trim()
    .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .slice(0, 200); // Limit length
}

/**
 * Sanitize file name
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return '';

  return fileName
    .replace(/[^a-zA-Z0-9._\-]/g, '_') // Replace unsafe characters with underscore
    .replace(/\.+/g, '.') // Remove multiple dots
    .replace(/^\./, '') // Remove leading dot
    .slice(0, 255); // Limit length
}

/**
 * Sanitize JSON input (parse and re-stringify to remove functions/dangerous content)
 */
export function sanitizeJson(jsonString: string): any {
  try {
    const parsed = JSON.parse(jsonString);
    // Re-stringify to remove any functions or dangerous content
    return JSON.parse(JSON.stringify(parsed));
  } catch {
    return null;
  }
}

/**
 * Escape special characters for SQL LIKE queries
 */
export function escapeLikeQuery(query: string): string {
  if (!query) return '';

  return query
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

/**
 * Sanitize number input
 */
export function sanitizeNumber(value: any, options: {
  min?: number;
  max?: number;
  integer?: boolean;
} = {}): number | null {
  const num = Number(value);

  if (isNaN(num)) {
    return null;
  }

  let result = num;

  if (options.integer) {
    result = Math.floor(result);
  }

  if (options.min !== undefined && result < options.min) {
    return options.min;
  }

  if (options.max !== undefined && result > options.max) {
    return options.max;
  }

  return result;
}

/**
 * Sanitize boolean input
 */
export function sanitizeBoolean(value: any): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }

  return Boolean(value);
}

/**
 * Sanitize date input
 */
export function sanitizeDate(value: any): Date | null {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

/**
 * Sanitize array input
 */
export function sanitizeArray<T>(
  value: any,
  itemSanitizer: (item: any) => T,
  options: { maxLength?: number } = {}
): T[] {
  if (!Array.isArray(value)) {
    return [];
  }

  let result = value.map(itemSanitizer).filter(item => item !== null && item !== undefined);

  if (options.maxLength && result.length > options.maxLength) {
    result = result.slice(0, options.maxLength);
  }

  return result;
}

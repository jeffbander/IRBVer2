// Simple in-memory rate limiter for API routes
// For production, use Redis or similar distributed cache

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed within the window
   */
  maxRequests: number;

  /**
   * Time window in milliseconds
   * Default: 15 minutes (900000ms)
   */
  windowMs: number;

  /**
   * Skip rate limiting for certain paths or conditions
   */
  skip?: (identifier: string) => boolean;
}

/**
 * Rate limiter for API routes
 *
 * @example
 * ```typescript
 * const limiter = rateLimit({
 *   maxRequests: 100,
 *   windowMs: 15 * 60 * 1000 // 15 minutes
 * });
 *
 * export async function GET(request: NextRequest) {
 *   const limited = await limiter(request);
 *   if (limited) return limited;
 *
 *   // ... rest of handler
 * }
 * ```
 */
export function rateLimit(config: RateLimitConfig) {
  const { maxRequests, windowMs, skip } = config;

  return async (request: Request): Promise<Response | null> => {
    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === 'test' || process.env.SKIP_RATE_LIMIT === 'true') {
      return null;
    }

    // Extract identifier (IP address or token)
    const identifier = getIdentifier(request);

    // Skip if configured
    if (skip && skip(identifier)) {
      return null;
    }

    const now = Date.now();
    const entry = rateLimitMap.get(identifier);

    // Clean up expired entries periodically
    if (Math.random() < 0.01) {
      cleanupExpiredEntries();
    }

    if (!entry || now > entry.resetTime) {
      // Create new entry
      rateLimitMap.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      return null; // Allow request
    }

    if (entry.count >= maxRequests) {
      // Rate limit exceeded
      const resetIn = Math.ceil((entry.resetTime - now) / 1000);
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${resetIn} seconds.`,
          retryAfter: resetIn,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(resetIn),
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(entry.resetTime),
          },
        }
      );
    }

    // Increment counter
    entry.count++;
    const remaining = maxRequests - entry.count;

    // Add rate limit headers to response (will be added by middleware)
    // For now, just allow the request
    return null;
  };
}

/**
 * Extract identifier from request (IP, cookie, or authorization header)
 */
function getIdentifier(request: Request): string {
  // Try to get IP from headers (for proxied requests)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // SECURITY: Check for auth token in httpOnly cookie
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/irb_auth_token=([^;]+)/);
    if (match) {
      return `auth:${match[1].substring(0, 20)}`; // Use prefix of token
    }
  }

  // Fallback to authorization header for authenticated requests (backward compatibility)
  const auth = request.headers.get('authorization');
  if (auth) {
    return `auth:${auth.substring(0, 20)}`; // Use prefix of token
  }

  // Fallback identifier
  return 'unknown';
}

/**
 * Clean up expired entries to prevent memory leaks
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];

  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      keysToDelete.push(key);
    }
  }

  for (const key of keysToDelete) {
    rateLimitMap.delete(key);
  }
}

/**
 * Get current rate limit status for an identifier
 * Useful for monitoring and debugging
 */
export function getRateLimitStatus(identifier: string): {
  count: number;
  remaining: number;
  resetTime: number;
} | null {
  const entry = rateLimitMap.get(identifier);
  if (!entry) {
    return null;
  }

  return {
    count: entry.count,
    remaining: Math.max(0, 100 - entry.count), // Assuming default max of 100
    resetTime: entry.resetTime,
  };
}

/**
 * Clear rate limit for a specific identifier
 * Useful for testing or manual overrides
 */
export function clearRateLimit(identifier: string): void {
  rateLimitMap.delete(identifier);
}

/**
 * Clear all rate limits
 * Useful for testing
 */
export function clearAllRateLimits(): void {
  rateLimitMap.clear();
}

/**
 * Predefined rate limiters for common use cases
 */
export const rateLimiters = {
  /**
   * Strict rate limit for authentication endpoints
   * 5 requests per 15 minutes per IP
   */
  auth: rateLimit({
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  }),

  /**
   * Standard rate limit for API endpoints
   * 100 requests per 15 minutes per IP/token
   */
  api: rateLimit({
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
  }),

  /**
   * Lenient rate limit for read-only endpoints
   * 300 requests per 15 minutes per IP/token
   */
  readOnly: rateLimit({
    maxRequests: 300,
    windowMs: 15 * 60 * 1000, // 15 minutes
  }),

  /**
   * Strict rate limit for write operations
   * 30 requests per 15 minutes per IP/token
   */
  write: rateLimit({
    maxRequests: 30,
    windowMs: 15 * 60 * 1000, // 15 minutes
  }),
};

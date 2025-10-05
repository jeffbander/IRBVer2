// CORS configuration for API routes

export interface CORSConfig {
  /**
   * Allowed origins. Can be:
   * - '*' for all origins (not recommended for production)
   * - string for single origin
   * - string[] for multiple origins
   * - function to dynamically determine allowed origin
   */
  origin?: string | string[] | ((origin: string) => boolean);

  /**
   * Allowed HTTP methods
   * Default: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
   */
  methods?: string[];

  /**
   * Allowed headers
   * Default: ['Content-Type', 'Authorization']
   */
  allowedHeaders?: string[];

  /**
   * Exposed headers
   */
  exposedHeaders?: string[];

  /**
   * Allow credentials (cookies, authorization headers)
   * Default: true
   */
  credentials?: boolean;

  /**
   * Max age for preflight cache (in seconds)
   * Default: 86400 (24 hours)
   */
  maxAge?: number;
}

const defaultConfig: Required<CORSConfig> = {
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.CORS_ORIGIN?.split(',') || [])
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

/**
 * Add CORS headers to response
 *
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const response = NextResponse.json({ data: 'example' });
 *   return cors(request, response);
 * }
 * ```
 */
export function cors(
  request: Request,
  response: Response,
  config: CORSConfig = {}
): Response {
  const {
    origin,
    methods,
    allowedHeaders,
    exposedHeaders,
    credentials,
    maxAge,
  } = { ...defaultConfig, ...config };

  const headers = new Headers(response.headers);

  // Get origin from request
  const requestOrigin = request.headers.get('origin') || '';

  // Determine allowed origin
  let allowedOrigin = '';
  if (origin === '*') {
    allowedOrigin = '*';
  } else if (typeof origin === 'string') {
    allowedOrigin = origin;
  } else if (Array.isArray(origin)) {
    if (origin.includes(requestOrigin)) {
      allowedOrigin = requestOrigin;
    }
  } else if (typeof origin === 'function') {
    if (origin(requestOrigin)) {
      allowedOrigin = requestOrigin;
    }
  }

  // Set CORS headers
  if (allowedOrigin) {
    headers.set('Access-Control-Allow-Origin', allowedOrigin);
  }

  if (credentials) {
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  if (methods.length > 0) {
    headers.set('Access-Control-Allow-Methods', methods.join(', '));
  }

  if (allowedHeaders.length > 0) {
    headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '));
  }

  if (exposedHeaders.length > 0) {
    headers.set('Access-Control-Expose-Headers', exposedHeaders.join(', '));
  }

  if (maxAge > 0) {
    headers.set('Access-Control-Max-Age', String(maxAge));
  }

  // Create new response with updated headers
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Handle OPTIONS preflight request
 *
 * @example
 * ```typescript
 * export async function OPTIONS(request: NextRequest) {
 *   return handlePreflight(request);
 * }
 * ```
 */
export function handlePreflight(
  request: Request,
  config: CORSConfig = {}
): Response {
  const emptyResponse = new Response(null, { status: 204 });
  return cors(request, emptyResponse, config);
}

/**
 * Production-safe CORS configuration
 * Only allows configured origins
 */
export const productionCORS: CORSConfig = {
  origin: (origin: string) => {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || [];
    return allowedOrigins.includes(origin);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

/**
 * Development CORS configuration
 * Allows all origins
 */
export const developmentCORS: CORSConfig = {
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
